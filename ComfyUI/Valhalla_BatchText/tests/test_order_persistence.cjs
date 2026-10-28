/* Regression: a NEW node instance must restore an independently saved order.
 * No ComfyUI runtime required. Run: node test_order_persistence.cjs [batch_text.js]
 * Browser/ComfyUI integration is still a separate manual test.
 */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const target = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '../web/js/batch_text.js');
const extensions = [], scheduled = [];
const app = {registerExtension(ext){extensions.push(ext)}};
const document = {createElement(){return {}}, getElementById(){return null}};
const source = fs.readFileSync(target,'utf8').replace(
  /import \{ app \} from "\.\.\/\.\.\/scripts\/app\.js";/,
  'const app = globalThis.__app;'
);
vm.runInNewContext(source,{__app:app,document,setTimeout:fn=>scheduled.push(fn),console});
const extension = extensions.find(x=>x.name==='Valhalla.BatchText.DynamicInputsDelimiterAndInfo');
assert.ok(extension, 'existing extension not found');
function flush(){let cycles=1000; while(scheduled.length){assert.ok(--cycles>0);scheduled.shift()()}}
function mockNode() {
  const links = new Map(), node = {
    comfyClass:'ValhallaBatchText',type:'ValhallaBatchText',id:55,
    inputs:[], outputs:[{name:'TEXT',type:'STRING'}], widgets_start_y:30,
    pos:[0,0],size:[280,100],properties:{},widgets:[
      {name:'delimiter',type:'combo',value:'None (direct)',options:{values:['None (direct)','Custom']}},
      {name:'custom_delimiter',type:'text',value:'',options:{multiline:true}},
    ],
    graph:{links,getLink(id){return links.get(id)},setDirtyCanvas(){},incrementVersion(){}},
    getInputLink(slot){return [...links.values()].find(l=>l.target_slot===slot)},
    addWidget(type,name,value,callback,options){const w={type,name,value,callback,options};this.widgets.push(w);return w},
    addInput(name,type){const input={name,type};Object.defineProperty(input,'link',{get(){return [...links.values()].find(l=>l.target_slot===node.inputs.indexOf(input))?.id??null}});this.inputs.push(input)},
    removeInput(index){if(node.getInputLink(index))throw Error('removing connected socket');this.inputs.splice(index,1);for(const l of links.values())if(l.target_slot>index)l.target_slot--},
    computeSize(){return [280,100+this.inputs.length*24+this.widgets.filter(w=>!w.hidden).length*32]},
    setSize(v){this.size=v},setDirtyCanvas(){},arrange(){},
  };
  node.attach = (name,id) => {
    const index=node.inputs.findIndex(i=>i.name===name);
    assert.ok(index>=0,`missing ${name}`);
    const link={id,origin_id:id+1000};let slot=index;
    Object.defineProperty(link,'target_slot',{get(){return slot},set(next){
      if([...links.values()].some(l=>l!==link && l.target_slot===next))return;
      slot=next;
    }});
    links.set(id,link);node.onConnectionsChange(1,index,true);flush();
  };
  return node;
}
function setupConnected() {
  const n=mockNode();extension.nodeCreated(n);flush();
  n.attach('TEXT_LIST',601);n.attach('TEXT:0',602);n.attach('TEXT:1',603);
  return n;
}
const original=setupConnected();
// TEXT:1 -> TEXT_LIST -> TEXT:0, including 2 cable-preserving swaps.
assert.equal(original.onMouseDown({button:0},[original.size[0]-119,92]),true);
assert.equal(original.onMouseDown({button:0},[original.size[0]-119,72]),true);
assert.deepEqual(original.inputs.map(x=>x.name),['TEXT:1','TEXT_LIST','TEXT:0','TEXT:2']);
const saved={properties:{},inputs:original.inputs.map(i=>({name:i.name,link:i.link,type:i.type})),
 widgets_values:original.widgets.filter(w=>w.serialize!==false).map(w=>w.value)};
// Emulate stale hidden widget at the start of LiteGraph serialization:
original.widgets.find(w=>w.name==='input_order').value='["TEXT_LIST","TEXT:0","TEXT:1"]';
original.onSerialize(saved);
const wanted='["TEXT:1","TEXT_LIST","TEXT:0"]';
assert.equal(saved.properties.valhalla_batch_text_socket_order,wanted);
assert.equal(saved.widgets_values[2],wanted,'onSerialize must repair the already serialized widgets_values');

function checkReload(savedData){
  const restored=setupConnected(); // independent node with default schema order
  assert.deepEqual(restored.inputs.map(i=>i.name),['TEXT_LIST','TEXT:0','TEXT:1','TEXT:2']);
  restored.onConfigure(savedData);
  restored.onAfterGraphConfigured?.();flush();
  assert.deepEqual(restored.inputs.map(i=>i.name),['TEXT:1','TEXT_LIST','TEXT:0','TEXT:2']);
  assert.equal(restored.widgets.find(w=>w.name==='input_order').value,wanted);
  for(const [name,id] of [['TEXT:1',603],['TEXT_LIST',601],['TEXT:0',602]]){
    const slot=restored.inputs.findIndex(i=>i.name===name);
    assert.equal(restored.getInputLink(slot)?.id,id,`cable must follow ${name}`);
    assert.equal(restored.graph.getLink(id).target_slot,slot);
  }
}
checkReload(saved);
// Reproduction of the startup regression on newer ComfyUI frontends:
// default names are re-created but links are restored by SAVED target_slot.
// They must be matched to their original port names by serialized link ID.
const positional=mockNode();extension.nodeCreated(positional);flush();
positional.attach('TEXT_LIST',603); // saved row 0 was TEXT:1
positional.attach('TEXT:0',601);   // saved row 1 was TEXT_LIST
positional.attach('TEXT:1',602);   // saved row 2 was TEXT:0
positional.onConfigure(saved);positional.onAfterGraphConfigured?.();flush();
assert.deepEqual(positional.inputs.map(i=>i.name),['TEXT:1','TEXT_LIST','TEXT:0','TEXT:2']);
for (const [name,id] of [['TEXT:1',603],['TEXT_LIST',601],['TEXT:0',602]]) {
  const slot=positional.inputs.findIndex(i=>i.name===name);
  assert.equal(positional.getInputLink(slot)?.id,id,`saved link ${id} must belong to ${name}`);
}
// Backwards compatibility: previous releases saved only the hidden widget.
checkReload({...saved,properties:{}});
// New format works even if a future frontend omits the hidden widget.
checkReload({...saved,widgets_values:['None (direct)','']});
console.log('OK: real save/load across NEW node instances, native list, TEXT ports, linkStore, and legacy metadata');

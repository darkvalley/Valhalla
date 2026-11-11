/* Mocked ComfyUI regression: inspector toggles, preview updates, resize, info icon. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const filename = path.resolve(__dirname, '../web/js/batch_text_inspector.js');
const registered = [];
const listeners = new Map();
const app = {workflowManager:{activeWorkflow:{path:'Project/workflow.json'}},
  graph:{}, registerExtension(value){ registered.push(value); }};
const api = {
  addEventListener(name, cb) { const set=listeners.get(name)||new Set(); set.add(cb); listeners.set(name,set); },
  removeEventListener(name, cb) { listeners.get(name)?.delete(cb); },
  async fetchApi(path) {
    if (path.includes('log_folder_status')) return {ok:true, async json() {
      return {path:'C:\\ComfyUI\\user\\default\\workflows',exists:true,automatic:true};
    }};
    if (path.includes('choose_log_folder')) return {ok:true, async json() {
      return {path:'C:\\Logs',cancelled:false};
    }};
    throw Error('Unexpected request ' + path);
  },
};
function element(){ return {style:{},isConnected:true,appendChild(){},querySelectorAll(){return []}}; }
const document = {body:element(), createElement(){
  return {style:{},isConnected:true,setAttribute(){},remove(){},textContent:''};
}};
const ComfyWidgets = {STRING(node,name) {
  const w=node.addWidget('customtext',name,'Run workflow to preview...',null,{serialize:false});
  w.element={style:{},readOnly:false,parentElement:element(),value:''};
  w.computeSize=()=>[400,150];
  return {widget:w};
}};
const source=fs.readFileSync(filename,'utf8').replace(/^import .*;$/gm,'');
vm.runInNewContext(source,{app,api,ComfyWidgets,document,console,URLSearchParams,
                            Intl,setTimeout,Number,String,Math});
assert.equal(registered.length,1);
const node={
  type:'ValhallaBatchText', id:17, size:[480,600], inputs:[{name:'TEXT:0'}],
  outputs:[{name:'TEXT'}], graph:{setDirtyCanvas(){}}, widgets:[],
  setSize(value){this.size=value;},setDirtyCanvas(){},
  addWidget(type,name,value,callback,options={}) {
    const w={name,type,value,callback,options,computeSize:()=>[300,25]};
    this.widgets.push(w); return w;
  },
};
for(const [name,type,value] of [
 ['delimiter','combo','None (direct)'],['custom_delimiter','text',''],
 ['input_order','text','[]'],['show_preview','toggle',false],['write_log','toggle',false],
 ['log_folder','text',''],['max_chars','number',200000],['workflow_hint','text','']
])node.addWidget(type,name,value,null,{});
let infoClicks=0;node.addWidget('button','ⓘ  Info',null,()=>{infoClicks++},{});
registered[0].nodeCreated(node);
const get=name=>node.widgets.find(w=>w.name===name);
assert.equal(get('preview').hidden,true);
assert.equal(get('write_log').hidden,true);
assert.equal(get('📁 Choose log folder...').hidden,true);
get('show_preview').value=true;get('show_preview').callback(true);
assert.equal(get('preview').hidden,false);
assert.equal(get('max_chars').hidden,false);
node.onDrawForeground(null);
const before=node.size[1];
node.size=[480,800];node.onResize();
const h1=parseInt(node.valhallaBatchPreviewWidget.element.style.height);
node.size=[480,650];node.onResize();
const h2=parseInt(node.valhallaBatchPreviewWidget.element.style.height);
assert.ok(h1>h2,'preview should shrink and grow');
assert.ok(node.size[1]<800,'node height is not locked');
get('write_log').value=true; get('write_log').callback(true);
assert.equal(get('Logmap').hidden,false);
assert.equal(get('📁 Choose log folder...').hidden,false);
const size=node.size.slice();
get('write_log').value=false;get('write_log').callback(false);
assert.deepEqual(node.size,size,'write log must not resize the node');
node.onExecuted({text:['Hello world'],character_count:[11],displayed_character_count:[11]});
assert.equal(get('preview').value,'Hello world');
assert.equal(node.valhallaBatchCounterText,'11 tekens');
assert.equal(node.onMouseDown({button:0},[node.size[0]-38,-4]),true);
assert.equal(infoClicks,1);
node.onRemoved();
assert.equal(listeners.get('executed')?.size,0);
console.log('OK: Batch Text v1.6.0 preview, resize, toggles and Info icon');

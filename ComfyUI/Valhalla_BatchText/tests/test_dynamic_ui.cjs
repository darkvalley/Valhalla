// Simulated ComfyUI LiteGraph and DOM. This is not a real browser integration test.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const file = path.resolve(__dirname, '../web/js/batch_text.js');
const extensionList = [];
const scheduled = [];
const app = { registerExtension: extension => extensionList.push(extension) };
const bodyChildren = [];
const headChildren = [];
let dialogInstance;
class FakeElement {
  constructor(tagName) { this.tagName = tagName; this.listeners = new Map(); this.isConnected = false; }
  setAttribute(key,value) { this[key] = value; }
  addEventListener(key,callback) { this.listeners.set(key, callback); }
  appendChild(child) { this.children ??= []; this.children.push(child); child.isConnected=true; }
  querySelector(selector) { return selector === 'button.vb-close' ? (this.closeButton ??= new FakeElement('button')) : null; }
  showModal() { this.isOpen = true; }
  close() { this.isOpen = false; this.listeners.get('close')?.(); }
  remove() { this.isConnected = false; }
  focus() { this.wasFocused = true; }
}
const document = {
  head:{appendChild(el) { headChildren.push(el); el.isConnected=true; }},
  body:{appendChild(el) { bodyChildren.push(el); dialogInstance=el; el.isConnected=true; }},
  activeElement:new FakeElement('input'),
  createElement:name=>new FakeElement(name),
  getElementById:id=>headChildren.find(el=>el.id===id)??null,
};
document.activeElement.isConnected = true;
const source = fs.readFileSync(file,'utf8').replace(
  /import \{ app \} from "\.\.\/\.\.\/scripts\/app\.js";/,
  'const app = globalThis.__app;'
);
vm.runInNewContext(source, {__app:app, document, setTimeout:fn=>scheduled.push(fn)});
const extension=extensionList[0];
assert.ok(extension);
function flush() { let safety=1000; while(scheduled.length) { if (--safety<=0) throw Error('timers never settle'); scheduled.shift()(); } }
function mockNode() {
  return {
    comfyClass:'ValhallaBatchText',type:'ValhallaBatchText',id:1,
    inputs:[], pos:[0,0], graph:{setDirtyCanvas(){}}, widgets_start_y:30, widgets:[
      {name:'delimiter',type:'combo',value:'None (direct)',options:{values:['None (direct)','Custom']}},
      {name:'custom_delimiter',type:'text',value:'',options:{multiline:true}},
    ], size:[240,100],
    addWidget(type,name,value,callback,options) {
      const widget={type,name,value,callback,options}; this.widgets.push(widget);return widget;
    },
    addInput(name,type) {this.inputs.push({name,type,link:null});},
    removeInput(index) {this.inputs.splice(index,1);},
    computeSize() {return [240,100+this.inputs.length*24+this.widgets.filter(w=>!w.hidden).length*40];},
    setSize(size) {this.size=size;},setDirtyCanvas(){},
    arrange() {
      let y=this.widgets_start_y ?? 30;
      for(const widget of this.widgets.filter(w=>!w.hidden)) {
        widget.y=y;
        y+=28;
      }
      this.lastArrangedBottom=y;
    },
  };
}
function assertNoWidgetOverlap(node) {
  const totalRows = node.inputs.length;
  const lastInputBottom = ((totalRows - 1) + 0.7) * 20 + 10;
  const delimiterWidget = node.widgets.find(w=>w.name==='delimiter');
  const infoWidget = node.widgets.find(w=>w.name==='ⓘ  Info');
  assert.ok(delimiterWidget.y >= lastInputBottom + 8,
    `delimiter overlap: y=${delimiterWidget.y}, bottom last input=${lastInputBottom}`);
  assert.ok(infoWidget.y >= delimiterWidget.y + 28,
    `Info button overlap: y=${infoWidget.y}, delimiter=${delimiterWidget.y}`);
}
const node=mockNode();
extension.nodeCreated(node); flush();
assertNoWidgetOverlap(node);
assert.deepEqual(node.inputs.map(i=>i.name),['TEXT_LIST','TEXT:0']);
assert.equal(node.inputs[0].type, 'STRING');
assert.equal(node.inputs[0].shape, 1, 'list socket uses square connector');
assert.ok(node.inputs[0].label.includes('☷'), 'list marker must be visible');
assert.equal(node.widgets[1].hidden,true,'Custom field hidden for preset');
assert.equal(node.widgets.length,4);
assert.ok(node.widgets.some(w => w.name === 'input_order' && w.hidden));
node.widgets[0].value='Custom'; node.widgets[0].callback(node.widgets[0].value);
assert.equal(node.widgets[1].hidden,false,'Custom field visible when selected');
node.widgets[1].value='🎄';
node.widgets[0].value='LF (\\n)';node.widgets[0].callback(node.widgets[0].value);
assert.equal(node.widgets[1].hidden,true,'Custom field hidden again');
assert.equal(node.widgets[1].value,'🎄','Custom content preserved while hidden');
const info=node.widgets.find(w => w.name === "ⓘ  Info");
assert.equal(info.type,'button');
assert.equal(info.serialize,false);assert.equal(info.options.serialize,false);
info.callback();
assert.equal(dialogInstance.isOpen,true);
for (const term of ['Werner de Jong','MIT License','CRLF','Custom','\\n','How to use','Conceived and created','Close']) {
  assert.ok(dialogInstance.innerHTML.includes(term),`popup missing ${term}`);
}
dialogInstance.closeButton.listeners.get('click')();
assert.equal(dialogInstance.isOpen,false);assert.equal(dialogInstance.isConnected,false);
info.callback();assert.equal(headChildren.length,1,'no duplicate popup styles');dialogInstance.close();
node.inputs[1].link=10;node.onConnectionsChange(1,1,true);flush();
node.inputs[2].link=11;node.onConnectionsChange(1,2,true);flush();
node.inputs[3].link=12;node.onConnectionsChange(1,3,true);flush();
assert.deepEqual(node.inputs.map(i=>i.name),['TEXT_LIST','TEXT:0','TEXT:1','TEXT:2','TEXT:3']);
assertNoWidgetOverlap(node);
assert.equal(node.widgets_start_y, 5*20+12, 'widget anchor includes list input');
node.inputs[2].link=null;node.onConnectionsChange(1,2,false);flush();
assert.deepEqual(node.inputs.map(i=>i.name),['TEXT_LIST','TEXT:0','TEXT:1','TEXT:2']);
assert.equal(node.inputs[2].link,12);
assertNoWidgetOverlap(node);
assert.equal(node.widgets_start_y, 4*20+12, 'widget anchor moves back up when slots removed');
const legacy=mockNode();extension.nodeCreated(legacy);
// ComfyUI restores the old v1.1 raw delimiter into the first widget.
legacy.widgets[0].value=' ++ ';
legacy.onConfigure({widgets_values:[' ++ ']});flush();
assert.equal(legacy.widgets[0].value,'Custom');
assert.equal(legacy.widgets[1].value,' ++ ');
assert.equal(legacy.widgets[1].hidden,false);
const legacyBackslash=mockNode();extension.nodeCreated(legacyBackslash);
legacyBackslash.onConfigure({widgets_values:[String.raw`\n`]});flush();
assert.equal(legacyBackslash.widgets[1].value,String.raw`\\n`,'literal old backslash preserved');
const legacyKnown=mockNode();extension.nodeCreated(legacyKnown);
legacyKnown.onConfigure({widgets_values:['\r\n']});flush();
assert.equal(legacyKnown.widgets[0].value,'CRLF (\\r\\n)');
assert.equal(legacyKnown.widgets[1].hidden,true);
// A saved Dutch v1.3 workflow had TWO widgets, including a Dutch combo label.
const dutchV13 = mockNode(); extension.nodeCreated(dutchV13);
dutchV13.widgets[0].value = 'Lege regel (\\n\\n)';
dutchV13.widgets[1].value = ' 🌟 ';
dutchV13.onConfigure({widgets_values:['Lege regel (\\n\\n)', ' 🌟 ']}); flush();
assert.equal(dutchV13.widgets[0].value, 'Blank line (\\n\\n)');
assert.equal(dutchV13.widgets[1].value, ' 🌟 ');
assert.equal(dutchV13.widgets[1].hidden, true);
const dutchCustom=mockNode(); extension.nodeCreated(dutchCustom);
dutchCustom.widgets[0].value='Custom (eigen tekst)';
dutchCustom.widgets[1].value = ' ++ ';
dutchCustom.onConfigure({widgets_values:['Custom (eigen tekst)', ' ++ ']});flush();
assert.equal(dutchCustom.widgets[0].value,'Custom');
assert.equal(dutchCustom.widgets[1].value,' ++ ');
assert.equal(dutchCustom.widgets[1].hidden,false);
const restored=mockNode();extension.nodeCreated(restored);
restored.widgets[0].value='Custom';restored.widgets[1].value='hello';
restored.inputs=[{name:'TEXT:0',link:1},{name:'TEXT:1',link:2},{name:'TEXT:2',link:null}];
restored.onConfigure({widgets_values:['Custom','hello']});flush();
assert.equal(restored.widgets[0].value,'Custom');
assert.equal(restored.widgets[1].value,'hello');
assert.equal(restored.widgets[1].hidden,false);
assert.deepEqual(restored.inputs.map(i=>i.name),['TEXT:0','TEXT:1','TEXT_LIST','TEXT:2']);
restored.inputs=Array.from({length:101},(_,i)=>({name:`TEXT:${i}`,link:i+1}));
restored.onConfigure({widgets_values:['Custom','hello']});flush();
assert.equal(restored.inputs.length,103);
assert.equal(restored.inputs.filter(i=>i.name==='TEXT_LIST').length,1, 'only one list port');
assertNoWidgetOverlap(restored);
assert.equal(restored.widgets_start_y,103*20+12);
// The list connector never grows a new dynamic input, and never disappears.
const listOnly = mockNode(); extension.nodeCreated(listOnly); flush();
listOnly.inputs.find(i=>i.name==='TEXT_LIST').link=999;
listOnly.onConnectionsChange(1,0,true); flush();
assert.deepEqual(listOnly.inputs.map(i=>i.name), ['TEXT_LIST','TEXT:0']);
assertNoWidgetOverlap(listOnly);
listOnly.inputs[0].link=null; listOnly.onConnectionsChange(1,0,false); flush();
assert.deepEqual(listOnly.inputs.map(i=>i.name), ['TEXT_LIST','TEXT:0']);

// v1.5.1: clicking the down arrow must change the serialized Python order,
// while retaining the original connected source cables/target slots.
const reorder=mockNode();
reorder.graph.links = {
  201: {target_slot:0}, 202:{target_slot:1}, 203:{target_slot:2},
};
extension.nodeCreated(reorder);flush();
reorder.inputs.find(i=>i.name==='TEXT_LIST').link=201;
reorder.inputs.find(i=>i.name==='TEXT:0').link=202;
reorder.onConnectionsChange(1,1,true);flush();
reorder.inputs.find(i=>i.name==='TEXT:1').link=203;
reorder.onConnectionsChange(1,2,true);flush();
const orderField = reorder.widgets.find(w=>w.name==='input_order');
assert.ok(orderField && orderField.hidden && orderField.serialize);
assert.equal(orderField.serializeValue(),'["TEXT_LIST","TEXT:0","TEXT:1"]');
// First row is slot index 0, fallback Y=32+(0+1)*20; down arrow x=round(240*.53).
assert.equal(reorder.onMouseDown({button:0},[127,52]), true);
assert.deepEqual(reorder.inputs.map(i=>i.name),['TEXT:0','TEXT_LIST','TEXT:1','TEXT:2']);
assert.equal(orderField.serializeValue(),'["TEXT:0","TEXT_LIST","TEXT:1"]');
assert.deepEqual([reorder.graph.links[201].target_slot,reorder.graph.links[202].target_slot,reorder.graph.links[203].target_slot],[1,0,2]);
assert.equal(reorder.inputs[0].link,202);
assert.equal(reorder.inputs[1].link,201);
assertNoWidgetOverlap(reorder);

console.log('OK: v1.5.1 English UI, arrow reordering, stable link slots, saveable order, and legacy compatibility');

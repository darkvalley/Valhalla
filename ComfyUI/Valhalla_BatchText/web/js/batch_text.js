/**
 * Valhalla Batch Text v1.5.4 — order persistence / restart fix.
 * Existing node class, sockets, delimiter settings and original connections stay compatible.
 * © 2026 Werner de Jong — MIT License.
 */
import { app } from "../../scripts/app.js";

const NODE_CLASS = "ValhallaBatchText";
const PREFIX = "TEXT:";
const INPUT_RE = /^TEXT:(\d+)$/;
const INPUT_TYPE = "STRING";
const LIST_INPUT_NAME = "TEXT_LIST";
const LIST_ICON = "☷";
const ORDER_WIDGET_NAME = "input_order";
const HELP_WIDGET_NAME = "ⓘ  Info";
const ORDER_PROPERTY = "valhalla_batch_text_socket_order";
const HELP_STYLE_ID = "valhalla-batch-text-info-styles";
const CUSTOM_OPTION = "Custom";
const SLOT_HEIGHT = 20;
const WIDGET_GAP = 12;

const PRESET_TO_VALUE = Object.freeze({
  "None (direct)": "", "Space ( )": " ", "Comma (, )": ", ",
  "Comma (,)": ",", "Semicolon (; )": "; ", "Semicolon (;)": ";",
  "Colon (: )": ": ", "Colon (:)": ":", "Pipe ( | )": " | ",
  "Pipe (|)": "|", "Tab (\\t)": "\t", "LF (\\n)": "\n", "CR (\\r)": "\r",
  "CRLF (\\r\\n)": "\r\n", "Blank line (\\n\\n)": "\n\n"
});
const LEGACY_TO_ENGLISH = Object.freeze({
  "Geen (direct)": "None (direct)", "Spatie ( )": "Space ( )",
  "Komma (, )": "Comma (, )", "Komma (,)": "Comma (,)" ,
  "Puntkomma (; )": "Semicolon (; )", "Puntkomma (;)": "Semicolon (;)",
  "Dubbele punt (: )": "Colon (: )", "Dubbele punt (:)": "Colon (:)",
  "Lege regel (\\n\\n)": "Blank line (\\n\\n)", "Custom (eigen tekst)": "Custom"
});
const ALL_PRESETS = new Set([...Object.keys(PRESET_TO_VALUE), CUSTOM_OPTION]);

function numberedInput(name) { return typeof name === "string" && INPUT_RE.test(name); }
function connected(input) { return input?.link != null; }
function graphLink(graph, id) {
  if (id == null || !graph) return undefined;
  if (typeof graph.getLink === "function") return graph.getLink(id);
  if (typeof graph.links?.get === "function") return graph.links.get(id);
  return graph.links?.[id];
}
function inputLinkAt(node, slot) {
  if (typeof node.getInputLink === "function") {
    const link = node.getInputLink(slot);
    if (link != null) return link;
  }
  return graphLink(node.graph, node.inputs?.[slot]?.link);
}
function inputLinkId(node, slot) {
  return inputLinkAt(node, slot)?.id ?? node.inputs?.[slot]?.link ?? null;
}
function placeWidgetsAfterSockets(node) {
  const rows = Math.max(node.inputs?.length ?? 0, node.outputs?.length ?? 0, 1);
  node.widgets_start_y = (Number(node.constructor?.slot_start_y) || 0) + rows * SLOT_HEIGHT + WIDGET_GAP;
}
function resizeNode(node) {
  placeWidgetsAfterSockets(node);
  const computed = node.computeSize?.();
  if (computed && Number.isFinite(computed[1]) && node.setSize) {
    const w = Math.max(280, node.size?.[0] ?? 280, computed[0] || 280);
    const visibleWidgets = (node.widgets ?? []).filter(x => !x.hidden && !x.options?.hidden);
    const height = node.widgets_start_y + visibleWidgets.reduce((sum, x) => {
      const dims = typeof x.computeSize === "function" ? x.computeSize(x) : null;
      return sum + (dims?.[1] || 28) + 4;
    }, 0) + 15;
    node.setSize([w, Math.max(105, computed[1], height)]);
  }
  if (node.graph && typeof node.arrange === "function") node.arrange();
  node.setDirtyCanvas?.(true, true);
}
function ensureListSocket(node) {
  let slot = (node.inputs ?? []).find(x => x.name === LIST_INPUT_NAME);
  if (!slot) {
    node.addInput(LIST_INPUT_NAME, INPUT_TYPE);
    slot = (node.inputs ?? []).find(x => x.name === LIST_INPUT_NAME);
  }
  if (slot) {
    slot.type = INPUT_TYPE;
    slot.label = `${LIST_ICON} TEXT_LIST`;
    slot.shape = 1;
    slot.tooltip = "Native ComfyUI STRING list (OUTPUT_IS_LIST); ordinary STRING accepted";
  }
}
function orderWidget(node) {
  return (node.widgets ?? []).find(x => x.name === ORDER_WIDGET_NAME);
}
function movableInputs(node) {
  return (node.inputs ?? []).map((input, slot) => ({input, slot}))
    .filter(({input}) => input.name === LIST_INPUT_NAME || (numberedInput(input.name) && connected(input)));
}
function ensureOrderWidget(node) {
  let widget = orderWidget(node);
  if (!widget) widget = node.addWidget?.("text", ORDER_WIDGET_NAME, "", null, {serialize:true});
  if (!widget) return null;
  widget.options ??= {};
  widget.options.serialize = true;
  widget.serialize = true;
  widget.hidden = true;
  widget.options.hidden = true;
  widget.tooltip = "Saved processing order: maintained automatically";
  widget.serializeValue = () => {
    const value = JSON.stringify(movableInputs(node).map(({input}) => input.name));
    widget.value = value;
    return value;
  };
  return widget;
}
function syncOrderWidget(node) { ensureOrderWidget(node)?.serializeValue(); }
function serializableWidgetIndex(node, name) {
  return (node.widgets ?? []).filter(w => w.serialize !== false).findIndex(w => w.name === name);
}
function parseOrder(raw) {
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch { return null; }
  }
  if (!Array.isArray(raw)) return null;
  const result = [];
  for (const name of raw) {
    if (typeof name === "string" && (name === LIST_INPUT_NAME || numberedInput(name)) && !result.includes(name)) result.push(name);
  }
  return result.length ? result : null;
}
function readSavedOrder(node, data) {
  if (!data || typeof data !== "object") return null;
  const fromProperty = parseOrder(data.properties?.[ORDER_PROPERTY]);
  if (fromProperty) return fromProperty;
  const named = parseOrder(data.widgets_values_named?.[ORDER_WIDGET_NAME]);
  if (named) return named;
  const widgetIdx = serializableWidgetIndex(node, ORDER_WIDGET_NAME);
  if (widgetIdx >= 0 && Array.isArray(data.widgets_values)) {
    const wOrder = parseOrder(data.widgets_values[widgetIdx]);
    if (wOrder) return wOrder;
  }
  return parseOrder((data.inputs ?? []).filter(x => x?.link != null || x?.name === LIST_INPUT_NAME).map(x => x?.name));
}
function rememberSerializedInputs(node, data) {
  const linked = new Map();
  for (const item of data?.inputs ?? []) {
    if (!item || !(item.name === LIST_INPUT_NAME || numberedInput(item.name)) || item.link == null) continue;
    linked.set(item.link, item.name);
  }
  node.__valhallaSavedInputLinks = linked;
}
function saveSocketOrder(node, data) {
  const order = JSON.stringify(movableInputs(node).map(({input}) => input.name));
  ensureOrderWidget(node).value = order;
  node.properties ??= {};
  node.properties[ORDER_PROPERTY] = order;
  if (!data || typeof data !== "object") return;
  data.properties ??= {};
  data.properties[ORDER_PROPERTY] = order;
  const idx = serializableWidgetIndex(node, ORDER_WIDGET_NAME);
  if (idx >= 0 && Array.isArray(data.widgets_values)) data.widgets_values[idx] = order;
  if (data.widgets_values_named && typeof data.widgets_values_named === "object") {
    data.widgets_values_named[ORDER_WIDGET_NAME] = order;
  }
  // Also repair the already-captured socket names/links when serializing.
  if (Array.isArray(data.inputs)) {
    for (let i = 0; i < data.inputs.length && i < (node.inputs?.length ?? 0); i++) {
      if (!data.inputs[i]) continue;
      data.inputs[i].name = node.inputs[i].name;
      data.inputs[i].link = inputLinkId(node, i);
    }
  }
}
function trySetTargetSlot(link, slot) {
  if (!link) return true;
  try {
    link.target_slot = slot;
    return link.target_slot === slot;
  } catch (error) {
    console.warn("Batch Text: could not move cable", link.id, error);
    return false;
  }
}
function syncLinkedSlots(node) {
  for (let i = 0; i < (node.inputs?.length ?? 0); i++) {
    const link = inputLinkAt(node, i);
    if (link && link.target_slot !== i && !trySetTargetSlot(link, i)) {
      console.warn("Batch Text: cable slot mismatch", link.id);
    }
  }
}
function moveSocket(node, slot, direction) {
  const movable = movableInputs(node);
  const idx = movable.findIndex(x => x.slot === slot);
  const next = idx + direction;
  if (idx < 0 || next < 0 || next >= movable.length) return false;
  const secondSlot = movable[next].slot;
  const firstInput = node.inputs[slot], secondInput = node.inputs[secondSlot];
  const firstLink = inputLinkAt(node, slot), secondLink = inputLinkAt(node, secondSlot);
  if (firstLink && secondLink && firstLink === secondLink) return false;
  const spare = (node.inputs ?? []).findIndex((input, i) => i !== slot && i !== secondSlot &&
    numberedInput(input.name) && !connected(input));
  if (firstLink && secondLink && spare < 0) return false;
  // Three-phase move through a free slot avoids newer ComfyUI linkStore's
  // occupied destination check; no wires are disconnected/recreated.
  if (firstLink && secondLink) {
    if (!trySetTargetSlot(firstLink, spare)) return false;
    if (!trySetTargetSlot(secondLink, slot)) {
      trySetTargetSlot(firstLink, slot);
      return false;
    }
    if (!trySetTargetSlot(firstLink, secondSlot)) {
      if (trySetTargetSlot(secondLink, secondSlot)) trySetTargetSlot(firstLink, slot);
      return false;
    }
  } else if (firstLink) {
    if (!trySetTargetSlot(firstLink, secondSlot)) return false;
  } else if (secondLink) {
    if (!trySetTargetSlot(secondLink, slot)) return false;
  }
  const updated = [...node.inputs];
  [updated[slot], updated[secondSlot]] = [secondInput, firstInput];
  node.inputs.splice(0, node.inputs.length, ...updated);
  syncOrderWidget(node);
  resizeNode(node);
  if (node.graph) {
    if (typeof node.graph.incrementVersion === "function") node.graph.incrementVersion();
    else node.graph._version = (node.graph._version ?? 0) + 1;
    node.graph.setDirtyCanvas?.(true, true);
  }
  node.setDirtyCanvas?.(true, true);
  return true;
}
// When ComfyUI rebuilds schema-defined inputs, saved cable positions may be
// restored but the default socket NAMES are reconstructed. The saved workflow
// link IDs identify the socket (and originating node) unambiguously.
function restoreSocketIdentities(node) {
  const linked = node.__valhallaSavedInputLinks;
  if (!(linked instanceof Map) || linked.size === 0) return true;
  const current = (node.inputs ?? []).map((input, slot) => ({input, link:inputLinkId(node, slot)}));
  const availableIds = new Set(current.map(x => x.link).filter(x => x != null));
  // On a copied workflow links may be remapped. Never guess an identity.
  if ([...linked.keys()].some(id => !availableIds.has(id))) return false;
  const assigned = new Set();
  const targets = current.map(x => {
    const name = linked.get(x.link);
    if (name) assigned.add(name);
    return name || null;
  });
  for (let i = 0; i < targets.length; i++) {
    if (targets[i]) continue;
    const oldName = current[i].input.name;
    if ((oldName === LIST_INPUT_NAME || numberedInput(oldName)) && !assigned.has(oldName)) {
      targets[i] = oldName;
    } else {
      let n = 0;
      while (assigned.has(`${PREFIX}${n}`)) n++;
      targets[i] = `${PREFIX}${n}`;
    }
    assigned.add(targets[i]);
  }
  for (let i = 0; i < targets.length; i++) {
    const input = current[i].input;
    input.name = targets[i];
    input.type = INPUT_TYPE;
    if (input.name === LIST_INPUT_NAME) {
      input.label = `${LIST_ICON} TEXT_LIST`;
      input.shape = 1;
    } else {
      input.label = input.name;
      delete input.shape;
    }
  }
  node.__valhallaSavedInputLinks = null;
  return true;
}
function restoreSocketOrder(node) {
  const requested = node.__valhallaSavedSocketOrder;
  if (!requested?.length) return;
  // Let the graph finish restoring links before doing any physical moves.
  if (node.__valhallaAwaitingGraph) return;
  if (!restoreSocketIdentities(node)) return;
  ensureListSocket(node);
  let live = movableInputs(node);
  if (requested.some(name => !live.some(x => x.input.name === name))) return;
  const desired = [...requested, ...live.map(x => x.input.name).filter(n => !requested.includes(n))];
  for (let destination = 0; destination < desired.length; destination++) {
    let source = movableInputs(node).findIndex(x => x.input.name === desired[destination]);
    while (source > destination) {
      if (!moveSocket(node, movableInputs(node)[source].slot, -1)) {
        console.warn("Batch Text: could not restore socket order");
        return;
      }
      source = movableInputs(node).findIndex(x => x.input.name === desired[destination]);
    }
  }
  node.__valhallaSavedSocketOrder = null;
}
function updateInputs(node) {
  if (node.__valhallaBatchTextUpdating) return;
  node.__valhallaBatchTextUpdating = true;
  try {
    // Never discard dynamic sockets while ComfyUI is still restoring the graph.
    if (node.__valhallaAwaitingGraph) {
      const savedLinks = node.__valhallaSavedInputLinks;
      const live = new Set((node.inputs ?? []).map((_, slot) => inputLinkId(node, slot))
        .filter(id => id != null));
      if (savedLinks?.size && [...savedLinks.keys()].some(id => !live.has(id))) return;
      node.__valhallaAwaitingGraph = false;
    }
    ensureListSocket(node);
    restoreSocketOrder(node);
    const names = new Set();
    for (const input of node.inputs ?? []) {
      if (!numberedInput(input.name)) continue;
      if (names.has(input.name)) {
        let n = 0;
        while (names.has(`${PREFIX}${n}`)) n++;
        input.name = `${PREFIX}${n}`;
      }
      names.add(input.name);
      input.label = input.name;
      input.type = INPUT_TYPE;
    }
    for (let i = (node.inputs?.length ?? 0) - 1; i >= 0; i--) {
      const input = node.inputs[i];
      if (numberedInput(input.name) && !connected(input)) node.removeInput(i);
    }
    let free = 0;
    while ((node.inputs ?? []).some(x => x.name === `${PREFIX}${free}`)) free++;
    node.addInput(`${PREFIX}${free}`, INPUT_TYPE);
    syncLinkedSlots(node);
    syncOrderWidget(node);
    resizeNode(node);
  } finally {
    node.__valhallaBatchTextUpdating = false;
  }
}
function scheduleUpdate(node) {
  if (node.__valhallaBatchTextPending || node.__valhallaBatchTextUpdating) return;
  node.__valhallaBatchTextPending = true;
  setTimeout(() => {
    node.__valhallaBatchTextPending = false;
    updateInputs(node);
  }, 0);
}
function slotRowY(node, slot) {
  if (typeof node.getConnectionPos === "function") {
    const pos = node.getConnectionPos(true, slot);
    if (pos && Number.isFinite(pos[1])) return pos[1] - (node.pos?.[1] ?? 0);
  }
  return 32 + (slot + 1) * SLOT_HEIGHT;
}
function arrowPositions(node) {
  const width = node.size?.[0] ?? 280;
  return {upX:Math.max(126,width-119), downX:Math.max(156,width-88)};
}
function arrowHit(node, pos) {
  if (!pos || !Number.isFinite(pos[0]) || !Number.isFinite(pos[1])) return null;
  const {upX,downX}=arrowPositions(node), items=movableInputs(node);
  for (let idx=0;idx<items.length;idx++) {
    const {slot}=items[idx], y=slotRowY(node,slot);
    if (Math.abs(pos[1]-y)>13.5) continue;
    if (idx>0 && Math.abs(pos[0]-upX)<=13.5) return {slot,direction:-1};
    if (idx<items.length-1 && Math.abs(pos[0]-downX)<=13.5) return {slot,direction:1};
  }
  return null;
}
function roundedRect(ctx,x,y,size=23,r=4) {
  const left=x-size/2, top=y-size/2, right=left+size, bottom=top+size;
  ctx.beginPath();ctx.moveTo(left+r,top);ctx.lineTo(right-r,top);
  ctx.quadraticCurveTo(right,top,right,top+r);ctx.lineTo(right,bottom-r);
  ctx.quadraticCurveTo(right,bottom,right-r,bottom);ctx.lineTo(left+r,bottom);
  ctx.quadraticCurveTo(left,bottom,left,bottom-r);ctx.lineTo(left,top+r);
  ctx.quadraticCurveTo(left,top,left+r,top);ctx.closePath();
}
function drawArrow(ctx,x,y,dir,enabled,hovered) {
  ctx.save();roundedRect(ctx,x,y);
  ctx.fillStyle=hovered&&enabled?'#304E70':'#202832';
  ctx.strokeStyle=enabled?(hovered?'#81BDFF':'#6C7E90'):'#3A4756';
  ctx.lineWidth=1.25;ctx.fill();ctx.stroke();
  const shift=dir===-1?-1:1;
  ctx.beginPath();ctx.moveTo(x-5,y-3*shift);ctx.lineTo(x,y+3*shift);ctx.lineTo(x+5,y-3*shift);
  ctx.strokeStyle=!enabled?'#657181':hovered?'#FFFFFF':'#E8F0FA';
  ctx.lineWidth=2.2;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();ctx.restore();
}
function drawOrderControls(node,ctx) {
  if (!ctx||node.flags?.collapsed) return;
  const movable=movableInputs(node), pos=arrowPositions(node);
  const indexes=new Map(movable.map((x,i)=>[x.slot,i]));
  for (let slot=0;slot<(node.inputs?.length??0);slot++) {
    const input=node.inputs[slot];
    if (input.name!==LIST_INPUT_NAME&&!numberedInput(input.name)) continue;
    const idx=indexes.get(slot), y=slotRowY(node,slot), hover=node.__valhallaHover;
    drawArrow(ctx,pos.upX,y,-1,idx!==undefined&&idx>0,hover?.slot===slot&&hover.direction===-1);
    drawArrow(ctx,pos.downX,y,1,idx!==undefined&&idx<movable.length-1,hover?.slot===slot&&hover.direction===1);
  }
}
function installOrderControls(node) {
  if (node.__valhallaBatchTextOrderInstalled) return;
  node.__valhallaBatchTextOrderInstalled=true;
  ensureOrderWidget(node);
  const oldSerialize=node.onSerialize;
  node.onSerialize=function(...args){
    syncOrderWidget(this);
    const result=oldSerialize?.apply(this,args);
    saveSocketOrder(this,args[0]);
    return result;
  };
  const oldDraw=node.onDrawForeground;
  node.onDrawForeground=function(ctx,...args){
    const result=oldDraw?.call(this,ctx,...args);drawOrderControls(this,ctx);return result;
  };
  const oldMouseDown=node.onMouseDown;
  node.onMouseDown=function(event,pos,...args){
    if(event?.button===undefined||event.button===0){
      const hit=arrowHit(this,pos);
      if(hit&&moveSocket(this,hit.slot,hit.direction))return true;
    }
    return oldMouseDown?.call(this,event,pos,...args);
  };
  const oldMouseMove=node.onMouseMove;
  node.onMouseMove=function(event,pos,...args){
    const hit=arrowHit(this,pos), old=this.__valhallaHover;
    if(hit?.slot!==old?.slot||hit?.direction!==old?.direction){
      this.__valhallaHover=hit;this.setDirtyCanvas?.(true,false);
    }
    return oldMouseMove?.call(this,event,pos,...args);
  };
  const oldMouseLeave=node.onMouseLeave;
  node.onMouseLeave=function(...args){
    this.__valhallaHover=null;this.setDirtyCanvas?.(true,false);
    return oldMouseLeave?.apply(this,args);
  };
}
function delimiterWidgets(node) {
  return {mode:(node.widgets??[]).find(x=>x.name==='delimiter'),
    custom:(node.widgets??[]).find(x=>x.name==='custom_delimiter')};
}
function updateCustomVisibility(node) {
  const {mode,custom}=delimiterWidgets(node);
  if(!mode||!custom)return;
  custom.hidden=mode.value!==CUSTOM_OPTION;
  custom.options??={};custom.options.hidden=custom.hidden;
  resizeNode(node);
}
function initializeDelimiterWidgets(node) {
  if(node.__valhallaDelimiterInstalled)return;
  node.__valhallaDelimiterInstalled=true;
  const {mode}=delimiterWidgets(node);
  if(!mode)return;
  const callback=mode.callback;
  mode.callback=function(...args){const result=callback?.apply(this,args);updateCustomVisibility(node);return result};
  updateCustomVisibility(node);
}
function migrateLegacyDelimiter(node,data) {
  if(!data||typeof data!=='object')return;
  const {mode,custom}=delimiterWidgets(node);
  if(!mode||!custom||Object.hasOwn(data.widgets_values_named??{},'custom_delimiter'))return;
  const values=data.widgets_values;
  if(!Array.isArray(values)||values.length!==1||typeof values[0]!=='string')return;
  const raw=values[0];
  if(Object.hasOwn(LEGACY_TO_ENGLISH,raw)){mode.value=LEGACY_TO_ENGLISH[raw];return;}
  const preset=Object.entries(PRESET_TO_VALUE).find(([,v])=>v===raw)?.[0];
  if(preset!==undefined){mode.value=preset;custom.value='';}
  else{mode.value=CUSTOM_OPTION;custom.value=raw.replace(/\\/g,'\\\\');}
}
function ensureValidSelection(node) {
  const {mode,custom}=delimiterWidgets(node);
  if(!mode||!custom||typeof mode.value!=='string')return;
  if(Object.hasOwn(LEGACY_TO_ENGLISH,mode.value)){
    mode.value=LEGACY_TO_ENGLISH[mode.value];return;
  }
  if(ALL_PRESETS.has(mode.value))return;
  const raw=mode.value;
  const preset=Object.entries(PRESET_TO_VALUE).find(([,v])=>v===raw)?.[0];
  mode.value=preset??CUSTOM_OPTION;
  custom.value=preset===undefined?raw.replace(/\\/g,'\\\\'):'';
}
function showInfoDialog() {
  if(typeof document==='undefined'||!document.body)return;
  if(!document.getElementById(HELP_STYLE_ID)){
    const style=document.createElement('style');style.id=HELP_STYLE_ID;
    style.textContent=`dialog.valhalla-batch-info{position:fixed;inset:0;margin:auto;padding:0;
      width:min(610px,calc(100vw - 36px));max-height:85vh;color:#f1f5f9;
      background:#1e232b;border:1px solid #526071;border-radius:13px;z-index:2147483000;
      box-shadow:0 18px 65px #000a;font:14px/1.55 system-ui,Segoe UI,sans-serif}
      dialog.valhalla-batch-info::backdrop{background:#000a}
      .valhalla-batch-info .vb-content{padding:24px 26px;overflow:auto}
      .valhalla-batch-info h2{font-size:20px;margin:0 0 8px}
      .valhalla-batch-info h3{font-size:15px;margin:16px 0 6px}
      .valhalla-batch-info p{margin:8px 0}
      .valhalla-batch-info code{background:#303743;padding:1px 5px;border-radius:4px}
      .valhalla-batch-info button{cursor:pointer;padding:8px 18px;background:#3b4657;
        color:#fff;border:1px solid #8794a6;border-radius:7px}
      .valhalla-batch-info .vb-actions{display:flex;justify-content:end;padding-top:18px}`;
    document.head.appendChild(style);
  }
  const previousFocus=document.activeElement;
  const dialog=document.createElement('dialog');dialog.className='valhalla-batch-info';
  dialog.setAttribute('aria-label','Batch Text - help and license');
  dialog.innerHTML=`<div class="vb-content"><h2>ⓘ Batch Text</h2>
  <p>Valhalla's Calling · v1.5.4</p>
  <p>Combine a native ComfyUI <code>TEXT_LIST</code> and any number of individual
  <code>TEXT:n</code> inputs into a single STRING output.</p>
  <h3>How to use</h3><ol>
  <li>Connect a text list, individual strings, or both.</li>
  <li>Use the outlined up/down arrows to choose the top-to-bottom processing order.
  The connected cable moves together with its port.</li>
  <li>Choose a delimiter, or choose Custom for your own separator.</li>
  <li>Save the workflow normally. The socket order is restored after reload/restart.</li></ol>
  <h3>Delimiters</h3><p>Space, comma, semicolon, colon, pipe, tab,
  LF (\\n), CR (\\r), CRLF (\\r\\n), blank line, or Custom.</p>
  <p>Custom accepts real line breaks or escapes <code>\\n</code>, <code>\\r</code>,
  <code>\\t</code>, and <code>\\\\</code>. A multiline STRING is one item,
  not automatically split into a list.</p>
  <p>Disconnected inputs are skipped. Connected empty strings are included.</p>
  <p><strong>Conceived and created by Werner de Jong.</strong></p>
  <p><strong>License:</strong> Free to use — MIT License. © 2026 Werner de Jong.</p>
  <div class="vb-actions"><button class="vb-close" type="button">Close</button></div></div>`;
  document.body.appendChild(dialog);
  const close=dialog.querySelector('button.vb-close');
  close?.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
  dialog.addEventListener('close',()=>{
    dialog.remove();if(previousFocus?.focus&&previousFocus.isConnected)previousFocus.focus();
  },{once:true});
  if(typeof dialog.showModal==='function')dialog.showModal();
  else dialog.setAttribute('open','');
  close?.focus();
}
function addInfoButton(node) {
  if(node.__valhallaInfoInstalled)return;
  node.__valhallaInfoInstalled=true;
  const widget=node.addWidget?.('button',HELP_WIDGET_NAME,null,()=>showInfoDialog(),{serialize:false});
  if(widget){widget.serialize=false;widget.options??={};widget.options.serialize=false;
    widget.tooltip='Usage instructions, separators and MIT License';}
}
app.registerExtension({
  name:'Valhalla.BatchText.DynamicInputsDelimiterAndInfo',
  nodeCreated(node){
    if(node.comfyClass!==NODE_CLASS&&node.type!==NODE_CLASS)return;
    initializeDelimiterWidgets(node);
    installOrderControls(node);
    addInfoButton(node);
    const oldConnectionsChanged=node.onConnectionsChange;
    node.onConnectionsChange=function(...args){
      const result=oldConnectionsChanged?.apply(this,args);
      if(args[0]===1||args[0]==='input')scheduleUpdate(this);
      return result;
    };
    const oldConfigure=node.onConfigure;
    node.onConfigure=function(...args){
      const data=args[0];
      this.__valhallaSavedSocketOrder=readSavedOrder(this,data);
      rememberSerializedInputs(this,data);
      const result=oldConfigure?.apply(this,args);
      migrateLegacyDelimiter(this,data);
      ensureValidSelection(this);
      updateCustomVisibility(this);
      // ComfyUI can populate links after onConfigure: restoration is finalized
      // by onAfterGraphConfigured. Legacy frontends can use the deferred tick.
      this.__valhallaAwaitingGraph=true;
      scheduleUpdate(this);
      return result;
    };
    const oldAfterGraph=node.onAfterGraphConfigured;
    node.onAfterGraphConfigured=function(...args){
      const result=oldAfterGraph?.apply(this,args);
      this.__valhallaAwaitingGraph=false;
      scheduleUpdate(this);
      return result;
    };
    scheduleUpdate(node);
  }
});

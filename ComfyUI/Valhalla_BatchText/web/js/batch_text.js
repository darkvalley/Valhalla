/**
 * Valhalla Batch Text v1.5.3 — stable reorderable input sockets (including native
 * TEXT_LIST), dynamic TEXT:n inputs, custom delimiters, and help popup.
 * Joining is performed in Python. © 2026 Werner de Jong. MIT License.
 */
import { app } from "../../scripts/app.js";

const NODE_CLASS = "ValhallaBatchText";
const PREFIX = "TEXT:";
const INPUT_RE = /^TEXT:(\d+)$/;
const INPUT_TYPE = "STRING";
// ComfyUI list streams have the SAME wire datatype (STRING) as ordinary
// strings. INPUT_IS_LIST=True in Python is what collects the stream. The
// square connector and the list glyph distinguish TEXT_LIST in the UI.
const LIST_INPUT_NAME = "TEXT_LIST";
const LIST_ICON = "☷";
const ORDER_WIDGET_NAME = "input_order";
const HELP_WIDGET_NAME = "ⓘ  Info";
const INFO_STYLE_ID = "valhalla-batch-text-info-styles";
const CUSTOM_OPTION = "Custom";

// These match the backend's choices; only needed to migrate saved v1.1 nodes.
// New workflows rely on the COMBO produced by the Python INPUT_TYPES schema.
const PRESET_TO_VALUE = Object.freeze({
  "None (direct)": "",
  "Space ( )": " ",
  "Comma (, )": ", ",
  "Comma (,)": ",",
  "Semicolon (; )": "; ",
  "Semicolon (;)": ";",
  "Colon (: )": ": ",
  "Colon (:)": ":",
  "Pipe ( | )": " | ",
  "Pipe (|)": "|",
  "Tab (\\t)": "\t",
  "LF (\\n)": "\n",
  "CR (\\r)": "\r",
  "CRLF (\\r\\n)": "\r\n",
  "Blank line (\\n\\n)": "\n\n",
});
// The Dutch labels from v1.2/v1.3 are translated during workflow loading.
const LEGACY_TO_ENGLISH = Object.freeze({
  "Geen (direct)": "None (direct)",
  "Spatie ( )": "Space ( )",
  "Komma (, )": "Comma (, )",
  "Komma (,)": "Comma (,)",
  "Puntkomma (; )": "Semicolon (; )",
  "Puntkomma (;)": "Semicolon (;)",
  "Dubbele punt (: )": "Colon (: )",
  "Dubbele punt (:)": "Colon (:)",
  "Lege regel (\\n\\n)": "Blank line (\\n\\n)",
  "Custom (eigen tekst)": "Custom",
});
const ALL_PRESETS = new Set([...Object.keys(PRESET_TO_VALUE), CUSTOM_OPTION]);

function numberedInput(name) {
  return typeof name === "string" && INPUT_RE.test(name);
}

function connected(input) {
  return input?.link !== null && input?.link !== undefined;
}

// ComfyUI/LiteGraph can retain a fixed widgets_start_y when an extension
// adds inputs dynamically. computeSize()/setSize() changes the node height,
// but DOES NOT move the widgets: the combo/Info can overlap new TEXT slots.
// Keep the widget stack below the last input/output row on every change.
const SLOT_HEIGHT = 20; // LiteGraph.NODE_SLOT_HEIGHT (legacy default)
const WIDGET_GAP = 12;  // clearance between last socket row and first widget

function placeWidgetsAfterSockets(node) {
  // Count ALL inputs including TEXT_LIST. Omitting the list port would
  // reproduce the widget-overlap bug fixed in v1.2.1.
  const inputCount = (node.inputs ?? []).length;
  const outputCount = (node.outputs ?? []).length;
  const rows = Math.max(inputCount, outputCount, 1);
  const slotOffset = Number(node.constructor?.slot_start_y) || 0;
  // widgets_start_y is relative to node.pos[1], not absolute canvas coords.
  // Each standard slot has a fixed vertical row; this also works before
  // the node has been attached to a graph or has an input DOM position.
  node.widgets_start_y = slotOffset + rows * SLOT_HEIGHT + WIDGET_GAP;
}

function resizeNode(node) {
  placeWidgetsAfterSockets(node);
  const computed = node.computeSize?.();
  if (computed && Number.isFinite(computed[1]) && node.setSize) {
    const w = Math.max(node.size?.[0] ?? 280, computed[0] || 280, 280);
    // Shrink stale heights as well as growing: v1.5.1 used the previous node
    // height as a permanent lower bound, leaving a large blank area.
    const activeWidgets = (node.widgets ?? []).filter(w => !w.hidden && !w.options?.hidden);
    const widgetBottom = node.widgets_start_y + activeWidgets.reduce(
      (height, w) => height + (typeof w.computeSize === "function"
        ? (w.computeSize(w)[1] || 28) : 28) + 4, 0);
    node.setSize([w, Math.max(105, computed[1], widgetBottom + 15)]);
  }
  if (node.graph && typeof node.arrange === "function") node.arrange();
  node.setDirtyCanvas?.(true, true);
}

function ensureListSocket(node) {
  let slot = (node.inputs ?? []).find(input => input.name === LIST_INPUT_NAME);
  if (!slot) {
    // On previously saved workflows the new optional schema input may not
    // exist. Append it WITHOUT moving old TEXT sockets or their cables.
    node.addInput(LIST_INPUT_NAME, INPUT_TYPE);
    slot = (node.inputs ?? []).find(input => input.name === LIST_INPUT_NAME);
  }
  if (slot) {
    slot.type = INPUT_TYPE;
    slot.label = `${LIST_ICON} TEXT_LIST`;
    slot.shape = 1; // LiteGraph.BOX_SHAPE: distinguish from circular STRING slots
    slot.tooltip = "Native ComfyUI STRING list (OUTPUT_IS_LIST), or one STRING value";
  }
}

function updateInputs(node) {
  if (node.__valhallaBatchTextUpdating) return;
  node.__valhallaBatchTextUpdating = true;
  try {
    ensureListSocket(node);
    // A connected socket's NAME is its stable identity. Never renumber
    // connected sockets when moving/reloading them: changing TEXT:1 to
    // TEXT:0 after a swap makes different joins indistinguishable.
    const names = new Set();
    for (const input of node.inputs ?? []) {
      if (!numberedInput(input.name)) continue;
      if (names.has(input.name)) {
        let id = 0;
        while (names.has(`${PREFIX}${id}`)) id++;
        input.name = `${PREFIX}${id}`;
      }
      names.add(input.name);
      input.label = input.name;
      input.type = INPUT_TYPE;
    }
    // Keep one unconnected TEXT socket at the end. All connected inputs
    // keep their exact names, their physical order and their link IDs.
    for (let i = (node.inputs?.length ?? 0) - 1; i >= 0; i--) {
      const input = node.inputs[i];
      if (numberedInput(input.name) && !connected(input)) node.removeInput(i);
    }
    let nextId = 0;
    while ((node.inputs ?? []).some(input => input.name === `${PREFIX}${nextId}`)) nextId++;
    node.addInput(`${PREFIX}${nextId}`, INPUT_TYPE);
    // LiteGraph updates target_slot on removeInput normally. Repair links
    // afterwards as well, for canvas implementations with deferred changes.
    syncLinkedSlots(node);
    hideOrderWidget(node);
    syncOrderWidget(node);
    resizeNode(node);
  } finally {
    node.__valhallaBatchTextUpdating = false;
  }
}

// The input_order widget is supplied by the Python schema, saved in the
// workflow and sent with the API prompt. The widget stays hidden; physical
// socket positions and link target_slot indices are the user-facing control.
function orderWidget(node) {
  return (node.widgets ?? []).find((w) => w.name === ORDER_WIDGET_NAME);
}

// v1.5.0 assumed every ComfyUI frontend exposed the *optional* input_order
// STRING as a widget. Some installations do not: the arrow controls worked,
// but the Python node never received input_order and used its legacy default
// (TEXT_LIST first). Always install a real, prompt-serializable widget.
function ensureOrderWidget(node) {
  let widget = orderWidget(node);
  if (!widget) {
    widget = node.addWidget?.("text", ORDER_WIDGET_NAME, "", null, {
      serialize: true,
    });
  }
  if (!widget) return null;

  widget.options ??= {};
  // API prompt and workflow persistence have DIFFERENT serialize flags.
  widget.serialize = true;
  widget.options.serialize = true;
  widget.hidden = true;
  widget.options.hidden = true;
  widget.tooltip = "Automatically generated from the visual order of the sockets";

  // ComfyUI's graphToPrompt uses widget.serializeValue, if supplied. It runs
  // at queue time. Compute from live socket order instead of depending on
  // whether a previous drag/click fired a widget-change callback.
  widget.serializeValue = () => {
    const order = JSON.stringify(movableInputs(node).map(({ input }) => input.name));
    widget.value = order;
    return order;
  };
  return widget;
}

function hideOrderWidget(node) {
  ensureOrderWidget(node);
}

function movableInputs(node) {
  // Include TEXT_LIST even if currently empty. Include every connected TEXT
  // socket. The remaining free socket is an add-connection affordance, not a
  // meaningful item for join order. Its arrow buttons are shown disabled.
  return (node.inputs ?? [])
    .map((input, slot) => ({ input, slot }))
    .filter(({ input }) => input.name === LIST_INPUT_NAME ||
      (numberedInput(input.name) && connected(input)));
}

function syncOrderWidget(node) {
  const widget = ensureOrderWidget(node);
  if (widget) widget.serializeValue();
}

// ComfyUI's newer linkStore indexes links by (node, target_slot). The naive
// approach of swapping input objects and then changing target_slot one by one
// is *not* a legal swap: the first update is rejected while the destination is
// occupied. Worse, modern input.link is a read-only view of that store, so a
// swapped input object will immediately report whichever link still occupies
// the OLD row. Always snapshot links BEFORE changing anything.
function getGraphLink(graph, linkId) {
  if (!graph || linkId === null || linkId === undefined) return undefined;
  if (typeof graph.getLink === "function") return graph.getLink(linkId);
  if (typeof graph.links?.get === "function") return graph.links.get(linkId);
  return graph.links?.[linkId];
}

function inputLinkAt(node, slot) {
  // Public ComfyUI/LiteGraph API is preferred to the deprecated input.link.
  if (typeof node.getInputLink === "function") {
    const link = node.getInputLink(slot);
    if (link !== undefined && link !== null) return link;
  }
  return getGraphLink(node.graph, node.inputs?.[slot]?.link);
}

function syncLinkedSlots(node) {
  // When updateInputs REMOVE sockets, newer ComfyUI handles the shift through
  // its atomic replaceNodeInputs() operation. On older LiteGraph versions this
  // defensive pass corrects stale link indices. Never write a target slot just
  // because it differs unless its destination is genuinely vacant.
  for (let slot = 0; slot < (node.inputs?.length ?? 0); slot++) {
    const link = inputLinkAt(node, slot);
    if (!link || link.target_slot === slot) continue;
    if (!trySetTargetSlot(link, slot)) {
      console.warn("Batch Text: link target slot mismatch after input cleanup", link.id);
    }
  }
}

function trySetTargetSlot(link, slot) {
  if (!link) return true;
  try {
    link.target_slot = slot;
    // In recent ComfyUI this setter can silently reject an occupied slot;
    // explicitly inspect its result instead of assuming it worked.
    return link.target_slot === slot;
  } catch (error) {
    console.warn("Batch Text: failed to move link", link.id, error);
    return false;
  }
}

function moveSocket(node, index, direction) {
  const movable = movableInputs(node);
  const at = movable.findIndex(({ slot }) => slot === index);
  const next = at + direction;
  if (at < 0 || next < 0 || next >= movable.length) return false;
  const otherIndex = movable[next].slot;

  const firstInput = node.inputs[index];
  const secondInput = node.inputs[otherIndex];
  const firstLink = inputLinkAt(node, index);
  const secondLink = inputLinkAt(node, otherIndex);
  if (firstLink && firstLink === secondLink) return false;

  // Keep an unconnected, automatically-created trailing TEXT:n socket as a
  // temporary *vacant* target. This allows a collision-free rotation of two
  // already-connected links through the linkStore. Links keep their IDs and
  // original source nodes, including reroute chains.
  const spareIndex = (node.inputs ?? []).findIndex((input, slot) =>
    slot !== index && slot !== otherIndex && numberedInput(input.name) &&
    !connected(input));
  if (firstLink && secondLink && spareIndex < 0) {
    console.warn("Batch Text: cannot swap two linked sockets without a free input");
    return false;
  }

  // The only link updates permitted are those whose destinations are vacant.
  // Roll back if a backend rejects any step; never leave a visual-only reorder.
  if (firstLink && secondLink) {
    if (!trySetTargetSlot(firstLink, spareIndex)) return false;
    if (!trySetTargetSlot(secondLink, index)) {
      trySetTargetSlot(firstLink, index);
      return false;
    }
    if (!trySetTargetSlot(firstLink, otherIndex)) {
      // Restore both while the vacant spare socket still exists.
      if (trySetTargetSlot(secondLink, otherIndex)) {
        trySetTargetSlot(firstLink, index);
      }
      return false;
    }
  } else if (firstLink) {
    if (!trySetTargetSlot(firstLink, otherIndex)) return false;
  } else if (secondLink) {
    if (!trySetTargetSlot(secondLink, index)) return false;
  }

  // Reorder complete slot objects with one array splice. ComfyUI's current
  // renderer observes splice mutations (the array is shallowReactive). The
  // old writable LiteGraph input.link fields travel with their slot objects;
  // the newer read-only getters now return the link for the NEW target index.
  const updated = [...node.inputs];
  [updated[index], updated[otherIndex]] = [secondInput, firstInput];
  node.inputs.splice(0, node.inputs.length, ...updated);

  // The processing order is the actual visible order, not numeric TEXT:n IDs.
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

// Use getConnectionPos so buttons line up with sockets even when a frontend
// theme changes LiteGraph's slot offset or layout.
function slotRowY(node, slot) {
  if (typeof node.getConnectionPos === "function") {
    const p = node.getConnectionPos(true, slot);
    if (p && Number.isFinite(p[1])) return p[1] - (node.pos?.[1] ?? 0);
  }
  return 32 + (slot + 1) * SLOT_HEIGHT;
}

// Two aligned, outlined buttons per input row (as in the published guide),
// instead of floating glyphs at different X positions.
function arrowPositions(node) {
  const width = node.size?.[0] ?? 280;
  const side = 23;
  return {
    upX: Math.max(126, width - 119),
    downX: Math.max(156, width - 88),
    half: side / 2,
  };
}

function arrowHit(node, point) {
  if (!point || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) return null;
  const { upX, downX, half } = arrowPositions(node);
  const movable = movableInputs(node);
  for (let i = 0; i < movable.length; i++) {
    const { slot } = movable[i];
    const y = slotRowY(node, slot);
    if (Math.abs(point[1] - y) > half + 2) continue;
    if (i > 0 && Math.abs(point[0] - upX) <= half + 2)
      return { slot, direction: -1 };
    if (i < movable.length - 1 && Math.abs(point[0] - downX) <= half + 2)
      return { slot, direction: 1 };
  }
  return null;
}

function roundedRect(ctx, x, y, size, corner = 4) {
  const half = size / 2;
  const left = x - half, top = y - half, right = left + size, bottom = top + size;
  ctx.beginPath();
  ctx.moveTo(left + corner, top);
  ctx.lineTo(right - corner, top);
  ctx.quadraticCurveTo(right, top, right, top + corner);
  ctx.lineTo(right, bottom - corner);
  ctx.quadraticCurveTo(right, bottom, right - corner, bottom);
  ctx.lineTo(left + corner, bottom);
  ctx.quadraticCurveTo(left, bottom, left, bottom - corner);
  ctx.lineTo(left, top + corner);
  ctx.quadraticCurveTo(left, top, left + corner, top);
  ctx.closePath();
}

function drawArrowButton(ctx, x, y, direction, enabled, hovered) {
  ctx.save();
  roundedRect(ctx, x, y, 23);
  ctx.fillStyle = hovered && enabled ? "#304E70" : "#202832";
  ctx.strokeStyle = enabled ? (hovered ? "#81BDFF" : "#6C7E90") : "#3A4756";
  ctx.lineWidth = 1.25;
  ctx.fill();
  ctx.stroke();
  // Up/down chevrons: precisely the same geometry on each row.
  const shift = direction === -1 ? -1 : 1;
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 3 * shift);
  ctx.lineTo(x, y + 3 * shift);
  ctx.lineTo(x + 5, y - 3 * shift);
  ctx.strokeStyle = !enabled ? "#657181" : hovered ? "#FFFFFF" : "#E8F0FA";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();
}

function drawOrderControls(node, ctx) {
  if (!ctx || node.flags?.collapsed) return;
  const movable = movableInputs(node);
  const { upX, downX } = arrowPositions(node);
  const movableIndexes = new Map(movable.map((item, i) => [item.slot, i]));
  for (let slot = 0; slot < (node.inputs?.length ?? 0); slot++) {
    const input = node.inputs[slot];
    if (input.name !== LIST_INPUT_NAME && !numberedInput(input.name)) continue;
    const at = movableIndexes.get(slot);
    const canUp = at !== undefined && at > 0;
    const canDown = at !== undefined && at < movable.length - 1;
    const y = slotRowY(node, slot);
    drawArrowButton(ctx, upX, y, -1, canUp,
      canUp && node.__valhallaBatchTextHover?.slot === slot &&
      node.__valhallaBatchTextHover?.direction === -1);
    drawArrowButton(ctx, downX, y, 1, canDown,
      canDown && node.__valhallaBatchTextHover?.slot === slot &&
      node.__valhallaBatchTextHover?.direction === 1);
  }
}

function installOrderControls(node) {
  if (node.__valhallaBatchTextOrderInstalled) return;
  node.__valhallaBatchTextOrderInstalled = true;
  hideOrderWidget(node);
  const oldSerialize = node.onSerialize;
  node.onSerialize = function (...args) {
    syncOrderWidget(this);
    return oldSerialize?.apply(this, args);
  };
  const oldDraw = node.onDrawForeground;
  node.onDrawForeground = function(ctx, ...args) {
    const result = oldDraw?.call(this, ctx, ...args);
    drawOrderControls(this, ctx);
    return result;
  };
  const oldMouseDown = node.onMouseDown;
  node.onMouseDown = function(event, pos, ...args) {
    if (event?.button === undefined || event.button === 0) {
      const hit = arrowHit(this, pos);
      if (hit && moveSocket(this, hit.slot, hit.direction)) return true;
    }
    return oldMouseDown?.call(this, event, pos, ...args);
  };
  const oldMouseMove = node.onMouseMove;
  node.onMouseMove = function(event, pos, ...args) {
    const next = arrowHit(this, pos);
    const old = this.__valhallaBatchTextHover;
    if (next?.slot !== old?.slot || next?.direction !== old?.direction) {
      this.__valhallaBatchTextHover = next;
      this.setDirtyCanvas?.(true, false);
    }
    return oldMouseMove?.call(this, event, pos, ...args);
  };
  const oldMouseLeave = node.onMouseLeave;
  node.onMouseLeave = function(...args) {
    this.__valhallaBatchTextHover = null;
    this.setDirtyCanvas?.(true, false);
    return oldMouseLeave?.apply(this, args);
  };
}

function scheduleUpdate(node) {
  if (node.__valhallaBatchTextUpdating || node.__valhallaBatchTextPending) return;
  node.__valhallaBatchTextPending = true;
  setTimeout(() => {
    node.__valhallaBatchTextPending = false;
    updateInputs(node);
  }, 0);
}

function getDelimiterWidgets(node) {
  const widgets = node.widgets ?? [];
  return {
    mode: widgets.find((w) => w.name === "delimiter"),
    custom: widgets.find((w) => w.name === "custom_delimiter"),
  };
}

function updateCustomVisibility(node) {
  const { mode, custom } = getDelimiterWidgets(node);
  if (!mode || !custom) return;
  const visible = mode.value === CUSTOM_OPTION;
  // ComfyUI's widget.hidden setter works for both LiteGraph and Vue nodes.
  custom.hidden = !visible;
  custom.options ??= {};
  custom.options.hidden = !visible;
  resizeNode(node);
}

function initializeDelimiterWidgets(node) {
  if (node.__valhallaBatchTextDelimiterInstalled) return;
  node.__valhallaBatchTextDelimiterInstalled = true;
  const { mode, custom } = getDelimiterWidgets(node);
  if (!mode || !custom) return;
  const originalCallback = mode.callback;
  mode.callback = function (...args) {
    const result = originalCallback?.apply(this, args);
    updateCustomVisibility(node);
    return result;
  };
  updateCustomVisibility(node);
}

function migrateLegacyDelimiter(node, data) {
  if (!data || typeof data !== "object") return;
  const { mode, custom } = getDelimiterWidgets(node);
  if (!mode || !custom) return;

  const named = data.widgets_values_named;
  if (named && Object.prototype.hasOwnProperty.call(named, "custom_delimiter")) return;
  const values = data.widgets_values;
  // v1.0/1.1 had only ONE serializable widget: the literal delimiter.
  if (!Array.isArray(values) || values.length !== 1 || typeof values[0] !== "string") return;
  const legacyValue = values[0];
  // One-widget v1.0/v1.1 node values were raw separator strings.
  // Also handle a hand-edited old workflow holding a Dutch preset label.
  if (Object.hasOwn(LEGACY_TO_ENGLISH, legacyValue)) {
    mode.value = LEGACY_TO_ENGLISH[legacyValue];
    return;
  }
  const preset = Object.entries(PRESET_TO_VALUE).find(([, value]) => value === legacyValue)?.[0];
  if (preset !== undefined) {
    mode.value = preset;
    custom.value = "";
  } else {
    mode.value = CUSTOM_OPTION;
    // v1.1 treated backslashes literally; double them to preserve output.
    custom.value = legacyValue.replace(/\\/g, "\\\\");
  }
}

function ensureValidSelection(node) {
  const { mode, custom } = getDelimiterWidgets(node);
  if (!mode || !custom) return;
  if (typeof mode.value !== "string") return;
  // Translate v1.2/v1.3 combo values even when two widgets were saved.
  if (Object.hasOwn(LEGACY_TO_ENGLISH, mode.value)) {
    mode.value = LEGACY_TO_ENGLISH[mode.value];
    return;
  }
  if (ALL_PRESETS.has(mode.value)) return;
  // Fallback for workflows restoring a raw delimiter without old widgets_values.
  const legacy = mode.value;
  const preset = Object.entries(PRESET_TO_VALUE).find(([, value]) => value === legacy)?.[0];
  mode.value = preset ?? CUSTOM_OPTION;
  custom.value = preset === undefined ? legacy.replace(/\\/g, "\\\\") : "";
}

function addModalStyles() {
  if (document.getElementById(INFO_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = INFO_STYLE_ID;
  style.textContent = `
    dialog.valhalla-batch-info {
      position: fixed; inset: 0; width: min(610px, calc(100vw - 36px));
      max-height: min(85vh, 790px); margin: auto; padding: 0;
      border: 1px solid #526071; border-radius: 13px; color: #f1f5f9;
      background: #1e232b; box-shadow: 0 18px 65px rgba(0,0,0,.65);
      z-index: 2147483000; font: 14px/1.55 system-ui, Segoe UI, sans-serif;
    }
    dialog.valhalla-batch-info::backdrop { background: rgba(0, 0, 0, .68); }
    .valhalla-batch-info .vb-content { padding: 24px 26px 20px; overflow: auto; }
    .valhalla-batch-info h2 { font-size: 20px; margin: 0 0 4px; color: #fff; }
    .valhalla-batch-info h3 { font-size: 15px; margin: 20px 0 7px; color: #e2e8f0; }
    .valhalla-batch-info p { margin: 8px 0; }
    .valhalla-batch-info ol { margin: 6px 0; padding-left: 22px; }
    .valhalla-batch-info li { margin: 5px 0; }
    .valhalla-batch-info .vb-muted { color: #b6c2d0; }
    .valhalla-batch-info code {
      color: #e2e8f0; background: #303743; padding: 1px 5px; border-radius: 4px;
    }
    .valhalla-batch-info table { border-collapse: collapse; width: 100%; margin-top: 9px; }
    .valhalla-batch-info td, .valhalla-batch-info th { border-bottom: 1px solid #43505d; padding: 6px 9px; text-align: left; }
    .valhalla-batch-info .vb-license { border-top: 1px solid #45505e; margin-top: 18px; padding-top: 12px; }
    .valhalla-batch-info .vb-actions { display: flex; justify-content: end; padding-top: 18px; }
    .valhalla-batch-info button.vb-close {
      cursor: pointer; padding: 8px 18px; border: 1px solid #8794a6;
      border-radius: 7px; color: #fff; background: #3b4657; font: inherit;
    }
    .valhalla-batch-info button.vb-close:hover { background: #4e5d72; }
    .valhalla-batch-info button.vb-close:focus-visible { outline: 2px solid #a7c9ff; outline-offset: 3px; }
  `;
  document.head.appendChild(style);
}

function showInfoDialog() {
  if (typeof document === "undefined" || !document.body) return;
  addModalStyles();
  const previousFocus = document.activeElement;
  const dialog = document.createElement("dialog");
  dialog.className = "valhalla-batch-info";
  dialog.setAttribute("aria-label", "Batch Text - help and license");
  dialog.innerHTML = `
    <div class="vb-content">
      <h2>ⓘ Batch Text</h2>
      <p class="vb-muted">Valhalla's Calling · v1.5.3</p>
      <p>Combine an optional native ComfyUI text list and any number of individual text inputs into a single <code>STRING</code> output.</p>
      <h3>Inputs</h3>
      <p><strong>☷ TEXT_LIST:</strong> A square socket for a native ComfyUI STRING list (<code>OUTPUT_IS_LIST=True</code> at the source). It does not accept arbitrary image batches or object types. A multiline STRING remains a single text item; it is not split at line breaks.</p>
      <p><strong>TEXT:0, TEXT:1, ...:</strong> Regular STRING inputs. Connecting the last available input automatically adds another one. Connected sockets keep their unique TEXT:n names when you reorder them. The trailing free socket cannot be moved until connected.</p>
      <p><strong>Join order:</strong> The vertical order of the connected sockets, top to bottom. Use the outlined up/down buttons beside each row to move any connected TEXT input or TEXT_LIST; the original cable and socket name stay attached.</p>
      <h3>How to use</h3>
      <ol>
        <li>Connect a native text list to <code>☷ TEXT_LIST</code>, individual strings to the <code>TEXT:n</code> inputs, or both.</li>
        <li>Click the up or down button beside any connected TEXT:n input or TEXT_LIST to change its processing position. Disabled arrows indicate the edge of the available range. The cable stays attached; save the workflow to retain the order.</li>
        <li>Select the separator using the <code>delimiter</code> dropdown.</li>
        <li>Select <code>Custom</code> to show <code>custom_delimiter</code>. Enter any text, punctuation, emoji, multiple characters, or actual line breaks.</li>
        <li>Select <code>None (direct)</code> to join the texts with no separator.</li>
        <li>Connect the <code>TEXT</code> output to <em>Preview as Text</em>, a <em>prompt</em> input, or a <em>system_prompt</em> input.</li>
      </ol>
      <h3>Common separators</h3>
      <table>
        <tr><th>Dropdown selection</th><th>Inserted separator</th></tr>
        <tr><td>Space / Comma / Semicolon / Colon / Pipe</td><td>As shown in the dropdown</td></tr>
        <tr><td><code>Tab (\t)</code></td><td>Tab character</td></tr>
        <tr><td><code>LF (\n)</code></td><td>Line feed (U+000A)</td></tr>
        <tr><td><code>CR (\r)</code></td><td>Carriage return (U+000D)</td></tr>
        <tr><td><code>CRLF (\r\n)</code></td><td>Windows line ending: CR followed by LF</td></tr>
        <tr><td><code>Blank line (\n\n)</code></td><td>Two consecutive line feeds</td></tr>
      </table>
      <p><strong>Custom:</strong> Type literal characters or <code>\n</code> (LF), <code>\r</code> (CR), <code>\t</code> (tab), or <code>\\</code> (a literal backslash). To insert the two literal characters <code>\n</code>, type <code>\\n</code>.</p>
      <p><strong>Example:</strong> <code>Mara</code> + <code>Greek dress</code> with <code>Comma (, )</code> produces <code>Mara, Greek dress</code>.</p>
      <p class="vb-muted">Disconnected inputs are ignored; connected empty strings are included. The Python code uses <code>separator.join(parts)</code> and never adds a separator before the first or after the last item.</p>
      <p class="vb-muted">Batch Text does not remove duplicates. If two connected sources provide identical text, that text appears twice. The native list input is handled using <code>INPUT_IS_LIST=True</code>.</p>
      <div class="vb-license">
        <p><strong>Conceived and created by Werner de Jong.</strong></p>
        <p><strong>License:</strong> Free to use — MIT License.</p>
        <p class="vb-muted">Free for personal and commercial use. Modification and redistribution are allowed when the copyright and license notices are retained. Provided without warranty. See <code>LICENSE</code>.</p>
        <p class="vb-muted">© 2026 Werner de Jong.</p>
      </div>
      <div class="vb-actions"><button class="vb-close" type="button">Close</button></div>
    </div>
  `;
  document.body.appendChild(dialog);
  const close = dialog.querySelector("button.vb-close");
  close?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    dialog.remove();
    if (previousFocus?.focus && previousFocus.isConnected) previousFocus.focus();
  }, { once: true });
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    close?.focus();
  } else {
    dialog.setAttribute("open", "");
    close?.focus();
  }
}

function addInfoButton(node) {
  if (node.__valhallaBatchTextInfoInstalled) return;
  node.__valhallaBatchTextInfoInstalled = true;
  const widget = node.addWidget?.(
    "button", HELP_WIDGET_NAME, null, () => showInfoDialog(),
    { serialize: false }
  );
  if (widget) {
    widget.serialize = false;  // not part of widgets_values
    widget.options ??= {};
    widget.options.serialize = false; // not an API input
    widget.tooltip = "Usage instructions, separators, and MIT license";
  }
}

app.registerExtension({
  name: "Valhalla.BatchText.DynamicInputsDelimiterAndInfo",
  nodeCreated(node) {
    if (node.comfyClass !== NODE_CLASS && node.type !== NODE_CLASS) return;
    initializeDelimiterWidgets(node);
    // Always create the hidden order widget BEFORE the nonserializable Info
    // button, including when loading a workflow saved with an older version.
    installOrderControls(node);
    addInfoButton(node);

    const oldConnectionsChanged = node.onConnectionsChange;
    node.onConnectionsChange = function (...args) {
      const result = oldConnectionsChanged?.apply(this, args);
      if (args[0] === 1 || args[0] === "input") scheduleUpdate(this);
      return result;
    };

    const oldConfigure = node.onConfigure;
    node.onConfigure = function (...args) {
      const result = oldConfigure?.apply(this, args);
      migrateLegacyDelimiter(this, args[0]);
      ensureValidSelection(this);
      updateCustomVisibility(this);
      scheduleUpdate(this);
      return result;
    };
    scheduleUpdate(node);
  },
});

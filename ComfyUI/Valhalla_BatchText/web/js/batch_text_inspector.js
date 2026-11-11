/** Optional Text Inspector UI for Valhalla Batch Text v1.6.0.
 * No new node identity; all v1.5.4 saved widget positions remain compatible.
 * © 2026 Werner de Jong — MIT License.
 */
import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { ComfyWidgets } from "../../scripts/widgets.js";

const CLASS_NAME = "ValhallaBatchText";
const BASE = "/valhalla/batch_text";
const VISIBLE_MAX = 2000000;
const MIN_PREVIEW_HEIGHT = 150;
const WIDGET_ROW_GAP = 4;
const PREVIEW_BOTTOM_PADDING = 14;
const INFO_RADIUS = 8;
const INFO_RIGHT = 38;
const INFO_TOP = -4; // relative to node body; just under title, above TEXT output
const PREVIEW_DEFAULT = "Run workflow to preview...";
const COUNTER_FORMAT = new Intl.NumberFormat("nl-NL");

function find(node, name) { return (node.widgets ?? []).find(w => w.name === name); }
function asBoolean(value) { return value === true || value === 1 || String(value).toLowerCase() === "true"; }
function savedWidgetValue(widget) { return widget?.value ?? ""; }
function workflowHint() {
  const wf = app.workflowManager?.activeWorkflow;
  const path = [wf?.path, wf?.filename, wf?.name,
    app.workflowManager?.activeWorkflowName,
    app.graph?.extra?.workflow_path, app.graph?.extra?.workflowName,
    app.graph?.title, app.graph?.extra?.name].find(
    v => typeof v === "string" && v.trim()
  );
  if (path) return path.trim();
  if (typeof document !== "undefined") {
    const tab = document.querySelector?.(
      '[data-testid="workflow-tab"] [role="tab"][data-state="active"] .workflow-label'
    ) || document.querySelector?.(
      '[data-testid="workflow-tab"] [aria-selected="true"] .workflow-label'
    );
    if (tab?.textContent?.trim()) return tab.textContent.trim();
  }
  return "";
}
function setHidden(widget, hidden) {
  if (!widget) return;
  widget.options ??= {};
  if (!widget.__batchOriginalLayout) widget.__batchOriginalLayout = {
    type: widget.type,
    computeSize: widget.computeSize,
  };
  widget.hidden = hidden;
  widget.options.hidden = hidden;
  widget.type = hidden ? "hidden" : widget.__batchOriginalLayout.type;
  widget.computeSize = hidden ? () => [0, -4] : widget.__batchOriginalLayout.computeSize;
  // ComfyUI's multiline widgets are DOM-backed. Hide their own container,
  // not a global overlay that could belong to other nodes.
  const elem = widget.element;
  if (elem?.style) elem.style.display = hidden ? "none" : "";
  if (elem?.parentElement?.style && elem.parentElement !== document.body) {
    elem.parentElement.style.display = hidden ? "none" : "";
  }
}
function positionBefore(node, widget, target) {
  if (!widget || !target || widget === target) return;
  const widgets = node.widgets;
  const current = widgets.indexOf(widget);
  if (current < 0) return;
  widgets.splice(current, 1);
  widgets.splice(widgets.indexOf(target), 0, widget);
}
// Keep the user's node dimensions as the single source of truth. Previously a
// visibility change ran node.setSize() with a newly computed height, which
// collapsed large manually resized nodes and stranded whitespace below Info.
function visibleWidget(node, widget) {
  return Boolean(widget) && !widget.hidden && !widget.options?.hidden;
}
function normalWidgetHeight(node, widget) {
  let dimensions;
  try { dimensions = widget.computeSize?.(node.size?.[0] || 420); }
  catch (error) { console.debug("Batch Text: widget measurement unavailable", error); }
  const height = Number(dimensions?.[1]);
  return Number.isFinite(height) && height > 0 ? height : 28;
}
// A DOM widget must not define computeSize(): ComfyUI's _arrangeWidgets()
// treats any widget with computeSize as a FIXED-height widget, not a growable
// one. It also feeds computeSize into the node's MINIMUM height, creating the
// exact one-way resize bug (can grow, cannot shrink). With computeLayoutSize()
// and fixed getMinHeight(), ComfyUI owns distribution of remaining space.
function previewGeometry(node) {
  const preview = node.valhallaBatchPreviewWidget;
  if (!visibleWidget(node, preview)) return null;
  const widgets = (node.widgets || []).filter(widget => visibleWidget(node, widget));
  const others = widgets.filter(widget => widget !== preview);
  const rows = Math.max(node.inputs?.length || 0, node.outputs?.length || 0, 1);
  const layoutStart = Math.max(Number(node.widgets_start_y) || 0, rows * 20 + 12);
  const estimatedStart = layoutStart + others.reduce((sum, widget) =>
    sum + normalWidgetHeight(node, widget) + WIDGET_ROW_GAP, 0);
  const measuredY = Number(preview.y);
  const top = Number.isFinite(measuredY) && measuredY > 0 ? measuredY : estimatedStart;
  return {
    height: Math.max(MIN_PREVIEW_HEIGHT,
      Math.floor((node.size?.[1] || 0) - top - PREVIEW_BOTTOM_PADDING)),
    minHeight: estimatedStart + MIN_PREVIEW_HEIGHT + PREVIEW_BOTTOM_PADDING,
  };
}
function updatePreviewGeometry(node, allowGrow = false) {
  const preview = node.valhallaBatchPreviewWidget;
  if (!preview || !visibleWidget(node, preview)) return;
  let geometry = previewGeometry(node);
  if (!geometry) return;
  if (allowGrow && node.setSize && (node.size?.[1] || 0) < geometry.minHeight) {
    node.setSize([Math.max(node.size?.[0] || 0, 400), Math.ceil(geometry.minHeight)]);
    geometry = previewGeometry(node) || geometry;
  }
  const height = geometry.height;
  const width = Number(node.size?.[0]) || 420;
  if (node.__batchPreviewHeight === height && node.__batchPreviewWidth === width) return;
  node.__batchPreviewHeight = height;
  node.__batchPreviewWidth = width;
  preview.options ??= {};
  if (node.__batchIntegratedPreview) {
    // ComfyUI assigns computedHeight to the widget based on available space.
    // Never override computeSize on this DOM widget: it blocks shrink and flex.
    preview.options.getMinHeight = () => MIN_PREVIEW_HEIGHT;
    delete preview.options.getMaxHeight;
    delete preview.options.getHeight;
    if (preview.element?.style) {
      preview.element.style.height = "100%";
      preview.element.style.minHeight = "0";
      preview.element.style.maxHeight = "none";
    }
  } else {
    // Older frontends without addDOMWidget retain the existing textarea path.
    // Keep a CONSTANT computed minimum, so a manual resize can go smaller.
    preview.options.getMinHeight = () => MIN_PREVIEW_HEIGHT;
    preview.options.getHeight = () => height;
    if (preview.element?.style) {
      preview.element.style.height = `${height}px`;
      preview.element.style.minHeight = "0";
      preview.element.style.maxHeight = "none";
      preview.element.style.boxSizing = "border-box";
      preview.element.style.resize = "none";
    }
  }
  node.setDirtyCanvas?.(true, true);
}
// A small canvas header icon replaces the former Info footer in BOTH states.
// Avoid a regular Info widget after the DOM widget (causes overlapping/gaps).
function infoCenter(node) {
  return [Math.max(24, (node.size?.[0] || 420) - INFO_RIGHT), INFO_TOP];
}
function isInfoHit(node, pos) {
  if (!pos || node.flags?.collapsed) return false;
  const [x,y] = infoCenter(node);
  return Math.abs(Number(pos[0]) - x) <= INFO_RADIUS + 5 &&
         Math.abs(Number(pos[1]) - y) <= INFO_RADIUS + 5;
}
function drawInfoIcon(node, ctx) {
  if (!ctx?.beginPath || node.flags?.collapsed) return;
  const [x,y] = infoCenter(node);
  const active = Boolean(node.__batchInfoHover);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, INFO_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = active ? "#465568" : "#272b32";
  ctx.strokeStyle = active ? "#e3efff" : "#9da9b7";
  ctx.lineWidth = 1.25;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f2f5f8";
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("i", x, y + 0.5);
  ctx.restore();
}
function updateVisibility(node) {
  const enabled = asBoolean(find(node, "show_preview")?.value);
  const writing = enabled && asBoolean(find(node, "write_log")?.value);
  // Backend schema widgets stay in place for saved workflow compatibility.
  setHidden(find(node, "write_log"), !enabled);
  setHidden(find(node, "log_folder"), true);
  setHidden(find(node, "workflow_hint"), true);
  setHidden(node.valhallaBatchLogDisplay, !writing);
  setHidden(node.valhallaBatchBrowseButton, !writing);
  setHidden(find(node, "max_chars"), !enabled);
  setHidden(node.valhallaBatchPreviewWidget, !enabled);
  // The original Info widget is kept as a callback target (for the dialog)
  // but the header icon is now its ONLY visible trigger, in every mode.
  setHidden(find(node, "ⓘ  Info"), true);
  if (!enabled) {
    unmountCounter(node);
    node.__batchPreviewHeight = null;
  } else {
    const textarea = node.__batchIntegratedPreview ? node.valhallaBatchTextArea : node.valhallaBatchPreviewWidget?.element;
    if (textarea) textarea.readOnly = true;
    updatePreviewGeometry(node, true);
    scheduleCounterMount(node);
    // Layout may settle after ComfyUI processes hidden/show DOM widgets.
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => updatePreviewGeometry(node));
    }
  }
  if (writing) void checkFolder(node);
  node.setDirtyCanvas?.(true, true);
}
function setStatus(node, message, error = false) {
  node.valhallaBatchLogStatus = message;
  const browse = node.valhallaBatchBrowseButton;
  if (browse) {
    browse.label = error ? "📁 Choose log folder (check path)" : "📁 Choose log folder...";
    browse.tooltip = message;
    browse.options ??= {};
    browse.options.tooltip = message;
  }
  node.setDirtyCanvas?.(true, true);
}
async function checkFolder(node) {
  if (!asBoolean(find(node, "show_preview")?.value) ||
      !asBoolean(find(node, "write_log")?.value)) return;
  const hint = workflowHint() || savedWidgetValue(find(node, "workflow_hint"));
  const folder = String(savedWidgetValue(find(node, "log_folder")));
  const query = new URLSearchParams({ path:folder, workflow_hint:hint });
  const requestSequence = (node.__batchFolderSeq = (node.__batchFolderSeq || 0) + 1);
  try {
    const response = await api.fetchApi(`${BASE}/log_folder_status?${query}`);
    const result = await response.json();
    if (!response.ok) throw Error(result.error || `HTTP ${response.status}`);
    if (requestSequence !== node.__batchFolderSeq) return;
    if (node.valhallaBatchLogDisplay) {
      node.valhallaBatchLogDisplay.value = String(result.path || "");
      node.valhallaBatchLogDisplay.label = result.automatic ? "Logmap (automatisch)" : "Logmap";
    }
    setStatus(node, result.exists ? `Logmap: ${result.path}` : `Logmap ontbreekt: ${result.path}`, !result.exists);
  } catch (error) {
    if (requestSequence !== node.__batchFolderSeq) return;
    setStatus(node, `Logmapcontrole mislukt: ${error.message}`, true);
  }
}
async function chooseFolder(node) {
  const hidden = find(node, "log_folder");
  if (!hidden) return;
  const hint = workflowHint() || savedWidgetValue(find(node, "workflow_hint"));
  const initial = String(hidden.value ?? "");
  try {
    const response = await api.fetchApi(`${BASE}/choose_log_folder`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({initial_dir:initial, workflow_hint:hint}),
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || `HTTP ${response.status}`);
    if (result.path) {
      hidden.value = result.path; // always the ONLY stored path, never a second browse field
      node.valhallaBatchLogDisplay.value = result.path;
      await checkFolder(node);
      node.graph?.setDirtyCanvas?.(true, true);
    }
  } catch (error) {
    setStatus(node, `Logmap kiezen mislukt: ${error.message}`, true);
    console.warn("Batch Text: logmap kiezen mislukt", error);
  }

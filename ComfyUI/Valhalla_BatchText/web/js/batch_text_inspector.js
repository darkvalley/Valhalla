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

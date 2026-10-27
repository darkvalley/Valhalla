/**
 * Valhalla Batch Text v1.4.0 — native STRING_LIST processing plus dynamic STRING inputs,
 * conditional Custom text field and help popup.
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
    node.setSize([
      Math.max(node.size?.[0] ?? 230, computed[0] || 230, 230),
      Math.max(node.size?.[1] ?? 100, computed[1], 100),
    ]);
  }
  // Recalculate positions right now in classic LiteGraph; merely resizing
  // doesn't update widget.y. During nodeCreated the graph may be absent.
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
    // Compact to connected TEXT sockets; never touch TEXT_LIST or widgets.
    for (let i = (node.inputs?.length ?? 0) - 1; i >= 0; i--) {
      const input = node.inputs[i];
      if (numberedInput(input.name) && !connected(input)) node.removeInput(i);
    }
    const active = (node.inputs ?? []).filter((input) => numberedInput(input.name));
    active.forEach((input, index) => {
      input.name = `${PREFIX}${index}`;
      input.label = `${PREFIX}${index}`;
      input.type = INPUT_TYPE;
    });
    node.addInput(`${PREFIX}${active.length}`, INPUT_TYPE);
    resizeNode(node);
  } finally {
    node.__valhallaBatchTextUpdating = false;
  }
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
      <p class="vb-muted">Valhalla's Calling · v1.4.0</p>
      <p>Combine an optional native ComfyUI text list and any number of individual text inputs into a single <code>STRING</code> output.</p>
      <h3>Inputs</h3>
      <p><strong>☷ TEXT_LIST:</strong> A square socket for a native ComfyUI STRING list (<code>OUTPUT_IS_LIST=True</code> at the source). It does not accept arbitrary image batches or object types. A multiline STRING remains a single text item; it is not split at line breaks.</p>
      <p><strong>TEXT:0, TEXT:1, ...:</strong> Regular STRING inputs. Connecting the last available input automatically adds another one. Disconnecting an input removes unused sockets while retaining one free socket.</p>
      <p><strong>Join order:</strong> All items from <code>TEXT_LIST</code> first (if connected), then <code>TEXT:0</code>, <code>TEXT:1</code>, and so on in numeric order.</p>
      <h3>How to use</h3>
      <ol>
        <li>Connect a native text list to <code>☷ TEXT_LIST</code>, individual strings to the <code>TEXT:n</code> inputs, or both.</li>
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

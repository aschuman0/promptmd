# PromptMD

A VS Code / Cursor extension that provides a **custom editor** for Python prompt files (`*prompt*.py`). Edit triple-quoted Markdown prompt strings in a tabbed, WYSIWYG-style editor with live preview and f-string placeholder highlighting.

---

## Features

### Custom editor

- **File pattern:** Any file whose name matches `*prompt*.py` (e.g. `prompts.py`, `system_prompt.py`, `my_prompt.py`) opens in the Prompt Editor by default.
- **One tab per variable:** Each top-level triple-quoted string (or f-string) assignment in the file gets its own tab. Switch between prompts without touching the raw Python.

### Editing experience

- **Rich Markdown editing** via a format bar: headings (H1–H3), bold, italic, blockquote, inline code, code blocks, bullet and ordered lists. Content is edited as Markdown and saved back as valid Python.
- **F-string placeholders** like `{user_name}` or `{task_id}` are recognized and shown with distinct styling. Valid placeholders (names that exist in the file’s scope) are highlighted in one style; placeholders that don’t match an imported or defined name are shown in a warning style so you can spot typos or missing variables.
- **Placeholder recognition as you type:** When you type a closing `}` after `{something}`, the span is immediately turned into a placeholder node and styled—no need to reopen the file.
- **Add and rename variables:** Use the **+** button in the format bar to add a new prompt variable (you’ll be prompted for a Python identifier). Use the pencil icon on a tab to rename that variable. Names are validated (Python identifier, no duplicates).

### Save and revert

- **Save** (e.g. **Cmd+S** / **Ctrl+S**) rewrites the file: prompt content is updated in place, and new variables are appended. Non-prompt code and structure are preserved. F-strings are written with `{{` and `}}` where needed.
- **Revert** (e.g. **File: Revert File**) reloads the file from disk and discards in-memory changes.
- **Autosave:** The extension respects VS Code’s **Files: Auto Save** setting (`off`, `afterDelay`, `onFocusChange`, `onWindowChange`). The document is marked dirty on edit; VS Code decides when to call save.

---

## Usage

### Opening a prompt file

1. Open a file that matches `*prompt*.py`. It should open in the Prompt Editor automatically.
2. If it opens in the default text editor instead, you can **Reopen Editor With…** and choose **Prompt Editor**.

### Editing

- **Tabs:** Click a tab to switch between prompt variables. The active tab’s content is shown in the editor below the format bar.
- **Format bar:** Use the dropdown and buttons (bold, italic, quote, code, code block, lists) to format the current prompt. The **+** button on the right adds a new prompt variable.
- **Placeholders:** Type `{variable_name}` in the text. When you type the closing `}`, it’s recognized as a placeholder. If `variable_name` is in scope (imported or defined in the same file), it’s highlighted as valid; otherwise it’s shown with a warning style.
- **Rename a variable:** Hover over a tab and click the pencil icon, then enter the new name (must be a valid Python identifier and unique).

### Saving and reverting

- **Save:** **Cmd+S** (Mac) or **Ctrl+S** (Windows/Linux). The `.py` file is updated with your changes.
- **Revert:** **File: Revert File** (or equivalent) to reload from disk and discard unsaved edits.

---

## File format

PromptMD only considers **module-level** assignments whose right-hand side is a triple-quoted string:

- `"""..."""` or `'''...'''` — plain string (no placeholder highlighting).
- `f"""..."""` or `f'''...'''` — f-string (placeholders like `{name}` are highlighted and validated).

**In scope** for placeholder validation: names that appear at module level as:

- **Imports:** `import x`, `import x as y`, `from m import a, b as c`
- **Assignments:** `NAME = ...`
- **Definitions:** `def name(...)`, `class Name(...)`

Only the first assignment to a given name per “prompt variable” block is parsed; nested or indented blocks are ignored. Comments and non-matching lines do not affect parsing.

---

## Requirements

- **VS Code** or **Cursor** `^1.74.0`

---

## Development

### Setup

```bash
npm install
npm run compile
npm run build:webview
```

- `npm run compile` — compiles TypeScript under `src/` to `out/`.
- `npm run build:webview` — bundles `webview/editor.ts` (TipTap + placeholder logic) to `media/editor.js` with esbuild.

### Running the extension

1. Open this folder in VS Code/Cursor.
2. Press **F5** or use **Run and Debug** → **Launch Extension**.
3. A new window opens with the extension loaded. Open a file matching `*prompt*.py` (e.g. from the `examples/` folder) to use the Prompt Editor.

### Project layout

| Path | Purpose |
|------|--------|
| `src/extension.ts` | Extension entry; registers the custom editor provider. |
| `src/promptEditor/provider.ts` | Custom editor provider: open/resolve/save/revert, webview messaging (init, edit, add/rename variable, variablesUpdated). |
| `src/promptEditor/document.ts` | In-memory document: entries (name, rawValue, isFString, offsets), setVariableContent, addEntry, renameEntry, updateSavedContent, reloadFromDisk. |
| `src/promptEditor/parser.ts` | Python parsing: `parsePromptVariables()` (triple-quoted/f-string assignments), `getNamesInScope()` (imports, assignments, def/class for placeholder validation). |
| `src/promptEditor/save.ts` | `rebuildPyFile()`: replace name/value spans, append new entries; escapes content and f-string braces. |
| `src/promptEditor/getWebviewContent.ts` | Builds the webview HTML (tabs, panels, state, message handling) and injects the script. |
| `webview/editor.ts` | TipTap editor bundle: Placeholder node (with validation styling), Markdown, format bar, input rule for `{...}`; built to `media/editor.js`. |
| `examples/` | Sample `*prompt*.py` files for manual testing (see `examples/README.md`). |

### Publish / package

Before packaging for distribution, run:

```bash
npm run compile && npm run build:webview
```

(`vscode:prepublish` in `package.json` runs the same.)

---

## License

MIT

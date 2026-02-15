# PromptMD

A VS Code / Cursor extension that provides **custom editors** for:

- **Prompt files** (`*prompt*.py`) — Edit triple-quoted Markdown prompt strings in a tabbed, WYSIWYG editor with f-string placeholder highlighting.
- **Markdown files** (`.md`) — Edit any Markdown file in the same rich editor (headings, lists, code, etc.) with a format bar and live preview.

---

## Features

### Prompt Editor (`*prompt*.py`)

| Feature | Description |
|--------|-------------|
| **File pattern** | Files matching `*prompt*.py` (e.g. `prompts.py`, `system_prompt.py`) open in the Prompt Editor by default. |
| **One tab per variable** | Each top-level triple-quoted or f-string assignment gets its own tab; switch between prompts without editing raw Python. |
| **Rich Markdown** | Format bar: headings (H1–H3), bold, italic, blockquote, inline code, code blocks, bullet and ordered lists. Content is saved back as valid Python. |
| **F-string placeholders** | `{user_name}` and similar are recognized and styled. Valid names (in scope in the file) use one style; unknown names use a warning style. |
| **Placeholder as you type** | Typing `}` after `{something}` turns it into a placeholder node immediately. |
| **Add / rename variables** | **+** in the format bar adds a variable (Python identifier); pencil icon on a tab renames it. Names are validated. |
| **Save / revert** | Save rewrites the `.py` file in place and appends new variables; revert reloads from disk. Respects **Files: Auto Save**. |

### Markdown Editor (`.md`)

| Feature | Description |
|--------|-------------|
| **File pattern** | Any `.md` file can open in the Markdown Editor (PromptMD). |
| **Single-document view** | One editor per file; no tabs or variable UI. Same rich editing as the Prompt Editor. |
| **Format bar** | Headings, bold, italic, blockquote, code, code block, bullet and ordered lists. |
| **Save / revert** | Save and revert work as usual; content is written back to the `.md` file. |

### Shared

- **TipTap-based editor** — Same WYSIWYG engine and format bar for both editors.
- **Token count** — The format bar shows an approximate token count for the current prompt or markdown. The count uses an OpenAI-style tokenizer (accurate for e.g. GPT-4, GPT-3.5); other models (e.g. Claude) may differ slightly. No API or model access is used; counting is done locally in the editor.
- **Reopen in another editor** — Use “Reopen Editor With…” to switch to the default text editor or another custom editor if needed.

---

## Settings

Configure in **Settings** (JSON or UI) under the `promptmd` scope.

| Setting | Description | Default |
|--------|-------------|---------|
| **promptmd.editorWidth** | Editor width: `constrained` (122ch max) or `full`. | `constrained` |
| **promptmd.placeholderHighlightStyle** | How to highlight f-string placeholders: `both` (background + left border), `background` only, or `leftLine` only. | `both` |
| **promptmd.placeholderValidColor** | Color accent for **valid** placeholders: `default` (theme), `blue`, `green`, or `purple`. | `default` |
| **promptmd.placeholderInvalidColor** | Color accent for **invalid/unknown** placeholders: `default` (theme), `amber`, `red`, or `orange`. | `default` |
| **promptmd.tokenCounterModel** | Tokenizer for the format bar count: `cl100k_base` (GPT-4/3.5) or `o200k_base` (GPT-4o). | `cl100k_base` |
| **promptmd.promptVariablePattern** | Regex for which top-level variable names are prompt variables (e.g. `".*_PROMPT$"`). | `.*` |
| **promptmd.markdownEditorDefault** | Use Markdown Editor (PromptMD) as the default for `.md` files. When enabled, updates `workbench.editorAssociations` so `.md` files open in the Markdown Editor by default. | `false` |
| **promptmd.promptEditorDefault** | Use Prompt Editor as the default for `*prompt*.py` files. When enabled, updates `workbench.editorAssociations` so matching files open in the Prompt Editor by default. | `false` |

The extension applies the default-editor settings on startup and when you change them; no reload required. Placeholder style and color settings apply when the webview is loaded—reopen the editor or reload the window to see those changes.

---

## Usage

### Opening files

- **Prompt files:** Open a file matching `*prompt*.py`; it should open in the **Prompt Editor** automatically. If not, use **Reopen Editor With…** → **Prompt Editor**.
- **Markdown files:** Open a `.md` file; it can open in the **Markdown Editor (PromptMD)**. If it opens in the default editor, use **Reopen Editor With…** → **Markdown Editor (PromptMD)**.

### Editing (Prompt Editor)

- **Tabs:** Click a tab to switch between prompt variables. The active tab’s content is shown in the editor below the format bar.
- **Format bar:** Use the dropdown and buttons (bold, italic, quote, code, code block, lists) to format the current prompt. The **+** button adds a new prompt variable (prompt files only).
- **Placeholders:** Type `{variable_name}` in the text. When you type the closing `}`, it’s recognized as a placeholder. If `variable_name` is in scope (imported or defined in the same file), it’s highlighted as valid; otherwise it’s shown with a warning style.
- **Rename a variable:** Hover over a tab and click the pencil icon, then enter the new name (must be a valid Python identifier and unique).

### Editing (Markdown Editor)

- **Single pane:** One Markdown file, one editor. Use the format bar (headings, bold, italic, quote, code, lists) as in the Prompt Editor. Tabs and variable UI are hidden.

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

## Installing on your own machine

You can package the extension as a `.vsix` file and install it locally (no marketplace).

### First-time install

1. **Build and package** (from the repo root):

   ```bash
   npm install
   npx @vscode/vsce package
   ```

   This runs the build (compile + webview) and produces `promptmd-0.1.0.vsix` (or the current version in `package.json`).

2. **Install the `.vsix`** in VS Code or Cursor:

   - **UI:** Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) → **Extensions: Install from VSIX…** → choose the `.vsix` file.
   - **CLI (VS Code):** `code --install-extension promptmd-0.1.0.vsix`
   - **CLI (Cursor):** `cursor --install-extension promptmd-0.1.0.vsix`

3. Reload the editor if prompted. Open a `*prompt*.py` or `.md` file to confirm the Prompt Editor or Markdown Editor opens.

### Upgrading to a new version

1. Pull or apply your changes, then **bump the version** in `package.json` (e.g. `"version": "0.1.1"`).
2. Package again:

   ```bash
   npx @vscode/vsce package
   ```

   This creates a new `.vsix` (e.g. `promptmd-0.1.1.vsix`).

3. Install the new `.vsix` the same way as above (UI or CLI). It replaces the previously installed version; you don’t need to uninstall first.

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
3. A new window opens with the extension loaded. Open a `*prompt*.py` file (e.g. from `examples/`) for the Prompt Editor, or a `.md` file for the Markdown Editor.

### Auto-reload during development

Run one command to watch both the TypeScript extension and the webview bundle; they will rebuild on save:

```bash
npm run dev
```

Then press **F5** to launch the Extension Development Host. After you change extension or webview code, the watchers rebuild automatically. Reload the Extension Development Host window (**Cmd+Shift+F5** or the reload button in the toolbar) to load the new code.

### Project layout

| Path | Purpose |
|------|--------|
| `src/extension.ts` | Extension entry; registers both Prompt and Markdown custom editor providers. |
| `src/promptEditor/provider.ts` | Prompt editor provider: open/resolve/save/revert, webview messaging (init, edit, add/rename variable, variablesUpdated). |
| `src/promptEditor/document.ts` | In-memory prompt document: entries (name, rawValue, isFString, offsets), setVariableContent, addEntry, renameEntry, updateSavedContent, reloadFromDisk. |
| `src/promptEditor/parser.ts` | Python parsing: `parsePromptVariables()` (triple-quoted/f-string assignments), `getNamesInScope()` (imports, assignments, def/class for placeholder validation). |
| `src/promptEditor/save.ts` | `rebuildPyFile()`: replace name/value spans, append new entries; escapes content and f-string braces. |
| `src/promptEditor/getWebviewContent.ts` | Builds the webview HTML (tabs, panels, state, message handling) for both editors; `mode: 'prompt'` or `'markdown'` toggles UI (tabs vs single doc). |
| `src/markdownEditor/provider.ts` | Markdown editor provider: open/resolve/save/revert, single-document content messaging. |
| `src/markdownEditor/document.ts` | In-memory markdown document: getContent, setContent, updateSavedContent, reloadFromDisk. |
| `webview/editor.ts` | TipTap editor bundle: Placeholder node (with validation styling), Markdown, format bar, input rule for `{...}`; built to `media/editor.js`. |
| `examples/` | Sample `*prompt*.py` files for manual testing (see `examples/README.md`). |

### Publish / package

To produce a `.vsix` for local or manual install, see **Installing on your own machine**. The command `npx @vscode/vsce package` runs the build automatically via `vscode:prepublish`.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## License

MIT

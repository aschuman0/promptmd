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
| **Rich Markdown** | Format bar: headings (H1–H3), bold, italic, blockquote, inline code, code blocks, bullet and ordered lists, and **tables** (GFM). Insert table button adds a 3×3 table with header row. Content is saved back as valid Python. |
| **F-string placeholders** | `{user_name}` and similar are recognized and styled. Valid names (in scope in the file) use one style; unknown names use a warning style. |
| **Placeholder as you type** | Typing `}` after `{something}` turns it into a placeholder node immediately. |
| **Add / rename variables** | **+** in the format bar adds a variable (Python identifier); pencil icon on a tab renames it. Names are validated. |
| **Save / revert** | Save rewrites the `.py` file in place and appends new variables; revert reloads from disk. Respects **Files: Auto Save**. |

### Markdown Editor (`.md`)

| Feature | Description |
|--------|-------------|
| **File pattern** | Any `.md` file can open in the Markdown Editor (PromptMD). |
| **Single-document view** | One editor per file; no tabs or variable UI. Same rich editing as the Prompt Editor. |
| **Format bar** | Headings, bold, italic, blockquote, code, code block, bullet and ordered lists, and **tables** (GFM). Insert table button adds a 3×3 table with header row. |
| **Save / revert** | Save and revert work as usual; content is written back to the `.md` file. |

### Shared

- **TipTap-based editor** — Same WYSIWYG engine and format bar for both editors.
- **VS Code markdown preview styling** — Editor content (headings, blockquote, code, lists, links, tables) is styled to match VS Code’s built-in markdown preview, with a slightly smaller base font for readability. Styling follows your color theme (Light, Dark, High Contrast) and updates when you switch themes without reopening the tab.
- **Editor typeface** — Choose the content font via **promptmd.editorTypeface**: sans serif (default), serif, or monospace. Reopen the editor tab after changing the setting to apply.
- **Tables (GFM)** — GitHub Flavored Markdown tables are supported: type or paste table syntax, or use the **Insert table** button in the format bar (3×3 with header row). Tables round-trip to markdown on save.
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
| **promptmd.editorTypeface** | Typeface for the editor content: `sansSerif` (default), `serif`, or `monospace`. | `sansSerif` |
| **promptmd.promptVariablePattern** | Regex for which top-level variable names are prompt variables (e.g. `".*_PROMPT$"`). | `.*` |
| **promptmd.markdownEditorDefault** | Use Markdown Editor (PromptMD) as the default for `.md` files. When enabled, updates `workbench.editorAssociations` so `.md` files open in the Markdown Editor by default. | `false` |
| **promptmd.promptEditorDefault** | Use Prompt Editor as the default for `*prompt*.py` files. When enabled, updates `workbench.editorAssociations` so matching files open in the Prompt Editor by default. | `false` |

The extension applies the default-editor settings on startup and when you change them; no reload required. Placeholder style, placeholder colors, and editor typeface apply when the webview is loaded—reopen the editor tab or reload the window to see those changes.

---

## Usage

### Opening files

- **Prompt files:** Open a file matching `*prompt*.py`; it should open in the **Prompt Editor** automatically. If not, use **Reopen Editor With…** → **Prompt Editor**.
- **Markdown files:** Open a `.md` file; it can open in the **Markdown Editor (PromptMD)**. If it opens in the default editor, use **Reopen Editor With…** → **Markdown Editor (PromptMD)**.

### Editing (Prompt Editor)

- **Tabs:** Click a tab to switch between prompt variables. The active tab’s content is shown in the editor below the format bar.
- **Format bar:** Use the dropdown and buttons (bold, italic, quote, code, code block, lists, insert table) to format the current prompt. The **+** button adds a new prompt variable (prompt files only).
- **Placeholders:** Type `{variable_name}` in the text. When you type the closing `}`, it’s recognized as a placeholder. If `variable_name` is in scope (imported or defined in the same file), it’s highlighted as valid; otherwise it’s shown with a warning style.
- **Rename a variable:** Hover over a tab and click the pencil icon, then enter the new name (must be a valid Python identifier and unique).

### Editing (Markdown Editor)

- **Single pane:** One Markdown file, one editor. Use the format bar (headings, bold, italic, quote, code, lists, insert table) as in the Prompt Editor. Tabs and variable UI are hidden.

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

### Debugging / logs

If the editor shows only one tab, no editor content, or “No prompt variables found” when the file has variables, use these to track down the issue:

1. **Extension logs (Output channel)**  
   - Open the **Output** view: **View → Output** (or `Cmd+Shift+U` / `Ctrl+Shift+U`).  
   - In the dropdown on the right, select **PromptMD**.  
   - You’ll see lines such as:  
     - `[Prompt] resolveCustomEditor <uri> variables=N` — custom editor opened, document has N variables.  
     - `[Prompt] sent initial init` — extension sent initial data to the webview.  
     - `[Prompt] webviewReady … sending init` — webview reported it was ready; extension sent init again.  
     - `[Prompt] webview received init variables=N` — webview received init and applied it (N variables).  
   - If you see `resolveCustomEditor` and `sent initial init` but never `webview received init`, the webview isn’t getting messages. If `variables=0` for a file that has variables, the problem is parsing or filtering.

2. **Webview / extension host console**  
   - **Help → Toggle Developer Tools** (or **Developer: Toggle Developer Tools** from the Command Palette).  
   - In the **Console** tab you’ll see errors from the Extension Development Host and, when a webview has focus, from that webview.  
   - For webview-specific debugging: run the command **Developer: Open Webview Developer Tools**, then click the PromptMD editor tab so the correct webview is inspected; any script errors in the webview will appear there.

When reporting an issue, paste the **PromptMD** Output channel lines for the failing file (and any related errors from the Console).

### Project layout

| Path | Purpose |
|------|--------|
| `src/extension.ts` | Extension entry; registers both Prompt and Markdown custom editor providers. |
| `src/promptEditor/provider.ts` | Prompt editor provider: open/resolve/save/revert, webview messaging (init, edit, add/rename variable, variablesUpdated, themeChanged). Subscribes to `onDidChangeActiveColorTheme` and broadcasts theme to all panels. |
| `src/promptEditor/document.ts` | In-memory prompt document: entries (name, rawValue, isFString, offsets), setVariableContent, addEntry, renameEntry, updateSavedContent, reloadFromDisk. |
| `src/promptEditor/parser.ts` | Python parsing: `parsePromptVariables()` (triple-quoted/f-string assignments), `getNamesInScope()` (imports, assignments, def/class for placeholder validation). |
| `src/promptEditor/save.ts` | `rebuildPyFile()`: replace name/value spans, append new entries; escapes content and f-string braces. |
| `src/promptEditor/getWebviewContent.ts` | Builds the webview HTML (tabs, panels, state, message handling) for both editors; `mode: 'prompt'` or `'markdown'` toggles UI (tabs vs single doc). Injects initial theme class and handles `themeChanged` messages; CSS under `.promptmd-tiptap-editor` matches VS Code markdown preview (typography, headings, lists, blockquote, code, tables, theme-scoped borders). |
| `src/markdownEditor/provider.ts` | Markdown editor provider: open/resolve/save/revert, single-document content messaging. Subscribes to `onDidChangeActiveColorTheme` and broadcasts theme to all panels. |
| `src/markdownEditor/document.ts` | In-memory markdown document: getContent, setContent, updateSavedContent, reloadFromDisk. |
| `webview/editor.ts` | TipTap editor bundle: Placeholder node (with validation styling), Markdown (GFM), Table/TableRow/TableCell/TableHeader extensions, format bar (including insert table), input rule for `{...}`; built to `media/editor.js`. |
| `examples/` | Sample `*prompt*.py` files for manual testing (see `examples/README.md`). |

### Publish / package

To produce a `.vsix` for local or manual install, see **Installing on your own machine**. The command `npx @vscode/vsce package` runs the build automatically via `vscode:prepublish`.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## License

MIT

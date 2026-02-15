# PromptMD

A VS Code / Cursor extension that provides a custom editor for Python prompt files (`*prompt*.py`). Use it to edit triple-quoted Markdown prompt strings with a tabbed UI, live preview, and f-string placeholder highlighting.

## Features

- **Custom editor** for files matching `*prompt*.py` (e.g. `prompts.py`, `system_prompt.py`).
- **One tab per variable**: each top-level triple-quoted string (or f-string) gets its own tab.
- **Markdown editing** with a live preview pane.
- **F-string placeholders** like `{name}` are shown with distinct styling and preserved on save (including `{{`/`}}` encoding in the file).
- **Save** writes valid Python back to the file; structure and non-prompt code are preserved.

## Usage

1. Open a file whose name matches `*prompt*.py` (e.g. `test_prompt.py`). It will open in the Prompt Editor by default.
2. Use the tabs to switch between prompt variables.
3. Edit the Markdown in the text area; the preview updates as you type.
4. Save with **Cmd+S** (Mac) or **Ctrl+S** (Windows/Linux). Use **File: Revert File** to discard changes.

## Requirements

- VS Code or Cursor ^1.74.0

## Development

```bash
npm install
npm run compile
```

Then run **Launch Extension** from the Run and Debug view (F5) to open a new window with the extension loaded. Open a `*prompt*.py` file to test.

## License

MIT

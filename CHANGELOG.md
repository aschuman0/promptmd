# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-02-15

### Added

- **Prompt Editor** for `*prompt*.py` files
  - Custom editor with one tab per top-level triple-quoted (or f-string) prompt variable
  - WYSIWYG Markdown editing: headings (H1–H3), bold, italic, blockquote, inline code, code blocks, bullet and ordered lists
  - F-string placeholder highlighting: `{name}` styled as valid when the name is in scope (imported or defined), warning style when not
  - Placeholder recognition as you type (closing `}` turns the span into a placeholder node immediately)
  - Add new prompt variable via **+** button (Python identifier validation)
  - Rename variables via pencil icon on tabs
  - Save and revert; autosave respects VS Code’s Files: Auto Save setting
- **Markdown Editor** for `*.md` files
  - Same rich editor and format bar as the prompt editor
  - Single-document view (no tabs)
  - Placeholders `{...}` supported; no scope validation (all shown with same style)
- **Shared editor UX**
  - Constrained max-width (122ch) for the format bar and content, centered in the panel
  - Format bar: formatting controls left-aligned; **+** (add variable, prompt only) and **Reopen in editor** (sync icon) right-aligned
  - **Reopen in editor** button opens the “Reopen Editor With…” picker to switch to another editor (e.g. default text editor)
- **Development**
  - `npm run dev` runs TypeScript and webview watchers; F5 launches Extension Development Host
  - Packaging and local install instructions in README (VSIX, install/upgrade for VS Code and Cursor)

### Fixed

- Webview init race: “webviewReady” handshake so the editor receives initial state after the script loads
- Python scope: aliased imports (e.g. `import os.path as p`) now contribute the alias (`p`) to valid placeholder names

[0.1.0]: https://github.com/aschuman0/promptmd/releases/tag/v0.1.0

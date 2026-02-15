# PromptMD Examples

This folder contains example prompt files demonstrating the features of PromptMD.

## How to Use

1. Open any `*prompt*.py` file with the **Prompt Editor** (right-click → "Open With..." → "Prompt Editor")
2. Each triple-quoted string variable becomes a **tab** in the editor
3. Edit prompts with full markdown formatting support
4. Watch the **token counter** in the toolbar to monitor prompt size

## Example Files

### `test_prompt.py`
**Basic introduction to PromptMD**
- Multiple prompt variables (tabs)
- F-string placeholders with valid/invalid highlighting
- Basic markdown formatting

### `structured_prompt.py`
**Structured content and organization**
- Multiple heading levels
- Nested bullet and numbered lists
- Tables for checklists
- Blockquotes for callouts

### `long_form_prompt.py`
**Long-form narrative content**
- Extended prose paragraphs
- Storytelling structure
- Testing readability with large text blocks

### `kitchen_sink_prompt.py`
**Comprehensive feature demo**
- Every supported markdown feature
- Tables with multiple columns
- Code blocks with syntax hints
- F-string placeholder validation
- Quick reference guide

### `code_heavy_prompt.py`
**Developer-focused prompts**
- Multiple code block languages
- API documentation templates
- Code review checklists
- Technical formatting patterns

## Features Demonstrated

| Feature | Files |
|---------|-------|
| Multiple tabs | All |
| Headings (H1-H3) | All |
| Bold/Italic | All |
| Bullet lists | All |
| Numbered lists | `structured_prompt.py`, `kitchen_sink_prompt.py` |
| Nested lists | `structured_prompt.py`, `kitchen_sink_prompt.py` |
| Blockquotes | `structured_prompt.py`, `kitchen_sink_prompt.py` |
| Code blocks | `kitchen_sink_prompt.py`, `code_heavy_prompt.py` |
| Tables | `structured_prompt.py`, `kitchen_sink_prompt.py`, `code_heavy_prompt.py` |
| F-string placeholders | `test_prompt.py`, `kitchen_sink_prompt.py` |
| Valid/invalid highlighting | `test_prompt.py`, `kitchen_sink_prompt.py` |

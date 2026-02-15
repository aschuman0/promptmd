# PromptMD example files

This folder contains sample Python prompt files for testing and demos. Each file name matches `*prompt*.py`, so they open in the Prompt Editor when the PromptMD extension is loaded.

For an overview of the extension, file format, and usage, see the [main README](../README.md).

---

## Example files

| File | Purpose |
|------|--------|
| **long_form_prompt.py** | Long narrative text (Captain’s Log style). Good for testing scrolling, readability, and editing in large blocks of content. |
| **kitchen_sink_prompt.py** | One variable (`FULL_DEMO`) exercises most Markdown features: H1–H3, bold, italic, blockquote, inline code, code block, bullet and ordered lists, and a link. A second variable (`F_STRING_MIX`) demonstrates f-string placeholders. Use this for full editor and format-bar testing. |
| **structured_prompt.py** | Structure-heavy content: headings, nested lists, numbered steps. Useful for checking list and heading formatting and tab switching. |
| **code_heavy_prompt.py** | Many code blocks and inline code. Focuses on code and code-block styling and placeholder behavior alongside code. |

---

## How to use these examples

1. **Load the extension**  
   In VS Code or Cursor, open the PromptMD repo and run the extension (e.g. **F5** → “Launch Extension”). A new window opens with the extension active.

2. **Open an example**  
   In that window, open any file from this `examples/` folder (e.g. `examples/kitchen_sink_prompt.py`). It should open in the Prompt Editor.

3. **Try the editor**  
   - Switch tabs to move between prompt variables.  
   - Edit text and use the format bar (headings, bold, lists, etc.).  
   - Type `{some_name}` and then `}` to see placeholder highlighting; if `some_name` is defined or imported in the file, it appears as a valid placeholder; otherwise it appears in the warning style.  
   - Use the **+** button to add a new variable and the pencil on a tab to rename one.  
   - Save (**Cmd+S** / **Ctrl+S**) to write changes back to the `.py` file.

4. **Revert if needed**  
   Use **File: Revert File** to discard edits and reload from disk.

These files are safe to modify during testing; you can reset them via Git or by reverting in the editor.

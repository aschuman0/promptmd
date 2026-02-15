"""
Kitchen sink demo: showcases EVERY markdown feature supported by PromptMD.
Use this file to test the full capabilities of the editor.
"""

# Define variables for placeholder demo
project_name = "PromptMD"
version = "1.0"
feature_count = 42

FULL_FEATURE_DEMO = """# PromptMD Feature Showcase

This prompt demonstrates every markdown feature available in the editor.

## Text Formatting

Regular text with **bold**, *italic*, and ***bold italic*** styling.

You can also use `inline code` for technical terms like `function_name` or `file.py`.

## Headings

The editor supports three heading levels:

# Heading 1
## Heading 2  
### Heading 3

## Lists

### Bullet Lists

- First item
- Second item with **formatting**
- Third item with `code`
  - Nested item one
  - Nested item two
    - Deeply nested
- Back to top level

### Numbered Lists

1. First step
2. Second step
3. Third step
   1. Sub-step A
   2. Sub-step B
4. Fourth step

## Blockquotes

> This is a blockquote. Use it for callouts, quotes, or important notes.
>
> It can span multiple paragraphs and include **formatting**.

## Code Blocks

Inline code uses backticks: `print("hello")`

For multi-line code, use fenced code blocks:

```python
def greet(name: str) -> str:
    \"\"\"Return a greeting message.\"\"\"
    return f"Hello, {name}!"

# Call the function
message = greet("World")
print(message)
```

## Tables

Tables help organize structured data:

| Feature | Supported | Notes |
|---------|-----------|-------|
| Bold | Yes | Use `**text**` |
| Italic | Yes | Use `*text*` |
| Code | Yes | Use backticks |
| Tables | Yes | GFM syntax |
| Lists | Yes | Bullet and numbered |

### Complex Table Example

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create new user |
| GET | `/api/users/{id}` | Get user by ID |
| PUT | `/api/users/{id}` | Update user |
| DELETE | `/api/users/{id}` | Delete user |

## Combining Features

You can combine all these features in a single prompt:

1. **Start with a heading** to establish context
2. Use *emphasis* to highlight key points
3. Include `code` for technical accuracy
4. Add a table for structured data:

| Input | Output |
|-------|--------|
| `"test"` | `"TEST"` |
| `"Hello"` | `"HELLO"` |

> **Pro tip:** The token counter in the toolbar shows your prompt's size!
"""

FSTRING_DEMO = f"""# F-String Placeholder Demo

This prompt uses f-string syntax to show placeholder highlighting.

## Valid Placeholders

These placeholders reference variables defined in the Python file:

- Project: {{project_name}}
- Version: {{version}}
- Features: {{feature_count}}

Notice how they're highlighted as **valid** (they exist in scope).

## Invalid Placeholders

These reference undefined variables:

- User: {{undefined_user}}
- Config: {{missing_config}}

Notice how they're highlighted as **invalid** (not in scope).

## Why This Matters

When building prompts programmatically, you want to catch typos in placeholder names before runtime. The editor helps by visually distinguishing:

| Placeholder | Status | Reason |
|-------------|--------|--------|
| `{{project_name}}` | Valid | Defined above |
| `{{version}}` | Valid | Defined above |
| `{{typo_name}}` | Invalid | Not defined |

This makes it easy to spot errors while writing your prompts!
"""

MARKDOWN_REFERENCE = """# Quick Markdown Reference

## Text Styles

| Style | Syntax | Result |
|-------|--------|--------|
| Bold | `**text**` | **text** |
| Italic | `*text*` | *text* |
| Bold+Italic | `***text***` | ***text*** |
| Code | `` `code` `` | `code` |

## Structure

### Headings

```
# H1
## H2
### H3
```

### Lists

```
- Bullet item
- Another item

1. Numbered item
2. Another item
```

### Blockquotes

```
> Quoted text
```

### Code Blocks

Use triple backticks with optional language:

```
def example():
    pass
```

### Tables

```
| Col 1 | Col 2 |
|-------|-------|
| A | B |
| C | D |
```

## Tips

- Use the **format bar** above the editor for quick formatting
- Watch the **token count** to monitor prompt size
- Use **tabs** to organize multiple prompts in one file
"""

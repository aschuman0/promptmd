"""Kitchen sink: every markdown feature in at least one variable. Use for full editor testing."""

FULL_DEMO = """# Heading 1: The Grand Tour

This paragraph has **bold** and *italic* and `inline code` in the same sentence. You can also use ***bold italic*** for emphasis.

&nbsp;

## Heading 2: Lists and Structure

Here is a blockquote:

> The only way to do great work is to love what you do.  
> — Someone wise (probably)

And now a bullet list:

- First item
- Second item with **bold** and `code`
- Third item
  - Nested bullet
  - Another nested

And an ordered list:

1. Step one
2. Step two
3. Step three

&nbsp;

### Heading 3: Code

Use the `print()` function for output. For longer snippets:

```
def greet(name):
    return f\"Hello, {name}!\"
```

That was a **code block**. Back to normal text with *emphasis* and a [link](https://example.com).

&nbsp;

## Heading 2: Recap

- Blockquote above
- **Bold** and *italic* everywhere
- `Inline code` and code blocks
- Bullet and numbered lists
- Headings 1, 2, 3
- Mix and match in one prompt

&nbsp;"""

F_STRING_MIX = f"""# Dynamic prompt

Use placeholders like {{user_name}} and {{task_id}} in your response.

- Item with {{placeholder}}
- Another {{count}} items 

&nbsp;"""

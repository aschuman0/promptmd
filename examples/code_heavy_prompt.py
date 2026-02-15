"""Code-heavy prompt: many code blocks and inline code for testing that path."""

DEVELOPER_SYSTEM = """# Developer Assistant

You help users write and debug code. When answering:

- Use `inline code` for variable names, function names, and short snippets.
- Use **code blocks** for anything longer than one line.

## Example Response Shape

Start with a short explanation. Then show the code:

```
def example():
    return "formatted correctly"
```

Mention that they can run it with `python script.py`. Use *italic* for emphasis when pointing out common mistakes."""

PYTHON_EXAMPLE = """# Python Snippet

Use triple quotes for docstrings:

```python
def main():
    \"\"\"
    Entry point. Calls helper with default args.
    \"\"\"
    result = helper(foo=1, bar=2)
    print(result)
```

And use `f-strings` for formatting. Variables like `user_id` and `timestamp` go in `{curly}` when you want to show the literal syntax.
"""

API_PROMPT = """# API Documentation Prompt

When documenting an endpoint, include:

1. **Method** and path: e.g. `GET /api/v1/users`
2. **Parameters**: list each with type and description
3. **Example request** in a code block:

```
curl -X GET "https://api.example.com/v1/users?limit=10"
```

4. **Example response** (truncated if long)

Use `snake_case` for JSON keys and **bold** for section headers in your explanation.
"""

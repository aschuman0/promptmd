"""Sample prompt file for testing the PromptMD extension."""

SYSTEM_PROMPT = """You are a helpful assistant.

# Guidelines

- Be concise.
- Use **markdown** when appropriate.

&nbsp;

You are a helpful assistant that is good at editing markdown files. This

&nbsp;"""

USER_PROMPT = f"""Hello, {{name}}!

Please help with: {{task}}.
"""

OTHER_VAR = """Plain triple-quoted string.
With multiple lines.

test for a {{fstring}} """

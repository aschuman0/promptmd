"""
Basic example demonstrating core PromptMD features.
Open this file with the Prompt Editor to see multiple tabs in action.
"""

# This variable is defined so it can be referenced as a valid placeholder
user_name = "Alice"
task_description = "writing a report"

SYSTEM_PROMPT = """# Assistant Guidelines

You are a helpful AI assistant. Follow these principles:

- Be **concise** and clear
- Use *markdown* formatting when it helps readability
- Always be honest about uncertainty

When responding, structure your answers with headings and lists where appropriate.
"""

USER_PROMPT = f"""Hello, {{user_name}}!

Please help me with: {{task_description}}.

I'd like your response to include:

1. A brief summary
2. Detailed explanation
3. Next steps

Thank you!
"""

CONTEXT_PROMPT = """# Additional Context

This prompt demonstrates **placeholder highlighting**:

- `{user_name}` appears highlighted as **valid** (it's defined above)
- `{undefined_var}` appears highlighted as **invalid** (not in scope)

The editor shows both so you can verify your f-string placeholders reference real variables.
"""

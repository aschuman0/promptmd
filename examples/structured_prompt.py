"""Structure-heavy prompt: headings, nested lists, hierarchy."""

SYSTEM_INSTRUCTIONS = """# System Instructions

You are a technical writing assistant. Follow the structure below.

## Output Format

1. **Summary**
  - One short paragraph
  - Key points only
2. **Details**
  - Expand each point
  - Use sub-bullets where needed
    - Like this
    - And this
3. **Conclusion**
  - Restate the main takeaway
  - Suggest next steps

## Style Rules

- Use **bold** for terms and **key phrases**
- Use `code` for commands and identifiers
- Use headings to separate major sections
- Keep lists scannable (short items)
- Here is a variable in an {fstring}

&nbsp;"""

CHECKLIST_PROMPT = """# Pre-flight Checklist

## Before You Start

1. Read the full prompt
2. Identify all placeholders
3. Gather any required context

## While Writing

- Use the right heading level
- Match the requested format
- Check that **emphasis** and `code` are used correctly

## Before Submitting

1. Spell-check
2. Verify links
3. Confirm all sections are present
"""

EXAMPLE_NEW_ADD = """This is an example new add. I want to add a {variable} here."""

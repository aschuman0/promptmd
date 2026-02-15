"""
Structured prompts with headings, nested lists, and clear hierarchy.
Great for system instructions and checklists.
"""

SYSTEM_INSTRUCTIONS = """# System Instructions

You are a technical writing assistant specializing in clear, structured documentation.

## Your Responsibilities

1. **Analyze** the user's request carefully
2. **Structure** your response with appropriate headings
3. **Format** content for maximum readability

## Output Guidelines

### Formatting Rules

- Use **bold** for key terms and important concepts
- Use *italics* for emphasis and technical terms on first use
- Use `code formatting` for:
  - Variable names
  - Function calls
  - File paths
  - Commands

### Structure Rules

- Start with a summary when the response is long
- Use numbered lists for sequential steps
- Use bullet lists for non-sequential items
- Nest lists when showing hierarchy:
  - Main point
    - Supporting detail
    - Another detail
  - Next main point

## Quality Checklist

Before finalizing any response, verify:

1. All sections have clear headings
2. Lists are parallel in structure
3. Code examples are properly formatted
4. The response directly addresses the user's question
"""

REVIEW_CHECKLIST = """# Document Review Checklist

## Before You Start

- Read the full document once without editing
- Identify the document's purpose and audience
- Note any sections that seem unclear

## During Review

### Content Check

1. Is the information accurate?
2. Is anything missing?
3. Is anything redundant?

### Style Check

- Consistent heading levels
- Parallel list structure
- Appropriate use of **emphasis**
- Clear `code formatting`

### Final Pass

| Check      | Status |
| ---------- | ------ |
| Spelling   | ⬜      |
| Grammar    | ⬜      |
| Formatting | ⬜      |
| Links      | ⬜      |

## After Review

> Remember: Good documentation is *revised* documentation. 
> Don't be afraid to restructure if it improves clarity.

&nbsp;"""

TEMPLATE_PROMPT = """# Response Template

Use this structure for technical explanations:

## Overview

*One paragraph summary of the topic.*

## Details

### Key Concept 1

Explanation with examples.

### Key Concept 2

Explanation with examples.

## Examples

```
// Code example here
```

## Summary

- Main takeaway 1
- Main takeaway 2
- Main takeaway 3
"""

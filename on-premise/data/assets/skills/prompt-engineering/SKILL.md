# Prompt Engineering Patterns

Advanced prompt engineering techniques to maximize LLM performance, reliability, and controllability.

Adapted from [NeoLabHQ/context-engineering-kit](https://github.com/NeoLabHQ/context-engineering-kit).

## Core Techniques

### 1. Few-Shot Learning

Teach the model by showing examples instead of explaining rules. Include 2-5 input-output pairs.

```markdown
Extract key information from support tickets:

Input: "My login doesn't work and I keep getting error 403"
Output: {"issue": "authentication", "error_code": "403", "priority": "high"}

Input: "Feature request: add dark mode to settings"
Output: {"issue": "feature_request", "error_code": null, "priority": "low"}

Now process: "Can't upload files larger than 10MB, getting timeout"
```

### 2. Chain-of-Thought Prompting

Request step-by-step reasoning before the final answer. Improves accuracy on analytical tasks by 30-50%.

```markdown
Analyze this bug report and determine root cause.

Think step by step:
1. What is the expected behavior?
2. What is the actual behavior?
3. What changed recently that could cause this?
4. What components are involved?
5. What is the most likely root cause?
```

### 3. Prompt Optimization

Iterate systematically: start simple, measure, refine.

```
Version 1 (Simple): "Summarize this article"
→ Inconsistent length, misses key points

Version 2 (Constraints): "Summarize in 3 bullet points"
→ Better structure, still misses nuance

Version 3 (Reasoning): "Identify the 3 main findings, then summarize each"
→ Consistent, accurate, captures key information
```

### 4. Template Systems

Build reusable prompt structures with variables.

```python
template = """
Review this {language} code for {focus_area}.

Code:
{code_block}

Provide feedback on:
{checklist}
"""

prompt = template.format(
    language="TypeScript",
    focus_area="security vulnerabilities",
    code_block=user_code,
    checklist="1. SQL injection\n2. XSS risks\n3. Input validation"
)
```

### 5. System Prompt Design

Set global behavior that persists across the conversation.

```markdown
System: You are a senior backend engineer specializing in MCP tool development.

Rules:
- Always consider scalability and performance
- Use early return pattern
- Flag security concerns immediately
- Provide code examples in TypeScript

Format responses as:
1. Analysis
2. Recommendation
3. Code example
4. Trade-offs
```

## MAL-Specific Patterns

### MCP Tool Descriptions

Tool descriptions ARE prompts — they tell the LLM when and how to use each tool.

```typescript
server.registerTool("mal_list_skills", {
  title: "List Skills",
  description: "List skills with optional filters by category and tags. " +
    "Returns paginated results in markdown format. " +
    "Use this to browse the skills catalog or find skills by topic.",
  inputSchema: {
    category: z.string().optional()
      .describe("Filter by category: devops, frontend, data, document, custom"),
    tags: z.string().optional()
      .describe("Filter by tags (comma-separated, e.g. 'react,typescript')"),
  },
});
```

Key patterns:
- **First sentence**: What the tool does (for tool selection)
- **Second sentence**: What it returns (for output expectations)
- **Third sentence**: When to use it (for disambiguation)
- **`.describe()`**: Every parameter needs a description with examples

### Agent System Prompts

The chat agent system prompt in `front/backend/app/agent/prompts.py` follows:

1. **Role definition**: "You are an AI assistant for MAL platform..."
2. **Capabilities list**: All 51 tools organized by category
3. **Bilingual examples**: Spanish/English mappings to tool calls
4. **Destructive ops section**: Which tools require confirmation

### Subagent Prompts

Each subagent in the catalog has a focused system prompt:

```markdown
You are a [role] specialist for the MAL platform.

## Process
1. [Step-by-step approach]

## Tools Usage
- mal_search_catalog: [when to use]
- mal_get_skill_content: [when to use]

## Output Format
[Expected structure]
```

## Progressive Disclosure

Start with simple prompts, add complexity only when needed:

1. **Level 1**: Direct instruction — "Summarize this article"
2. **Level 2**: Add constraints — "Summarize in 3 bullet points, focusing on key findings"
3. **Level 3**: Add reasoning — "Read this article, identify main findings, then summarize"
4. **Level 4**: Add examples — Include 2-3 example summaries

## Instruction Hierarchy

```
[System Context] → [Task Instruction] → [Examples] → [Input Data] → [Output Format]
```

## Best Practices

1. **Be Specific**: Vague prompts produce inconsistent results
2. **Show, Don't Tell**: Examples are more effective than descriptions
3. **Test Extensively**: Evaluate on diverse, representative inputs
4. **Iterate Rapidly**: Small changes can have large impacts
5. **Version Control**: Treat prompts as code with proper versioning
6. **Document Intent**: Explain why prompts are structured as they are

## Common Pitfalls

- **Over-engineering**: Starting with complex prompts before trying simple ones
- **Example pollution**: Using examples that don't match the target task
- **Context overflow**: Exceeding token limits with excessive examples
- **Ambiguous instructions**: Leaving room for multiple interpretations
- **Ignoring edge cases**: Not testing on unusual or boundary inputs

## Persuasion Principles for Agent Prompts

Based on Meincke et al. (2025) — persuasion techniques doubled compliance rates (33% to 72%).

| Principle | Use in prompts | Example |
|-----------|---------------|---------|
| **Authority** | Imperative language, non-negotiable framing | "YOU MUST validate before proceeding" |
| **Commitment** | Require announcements, force explicit choices | "Announce which skill you're using" |
| **Scarcity** | Time-bound requirements | "IMMEDIATELY request review before next task" |
| **Social Proof** | Universal patterns, failure modes | "Skipping validation = bugs in production. Every time." |
| **Unity** | Collaborative language | "We're colleagues working together on this." |

Use for discipline-enforcing skills (TDD, code review). Avoid Liking (creates sycophancy) and Reciprocity (feels manipulative).

## Token Efficiency

- Remove redundant words and phrases
- Use abbreviations consistently after first definition
- Move stable instructions to system prompts
- Cache common prompt prefixes
- Batch similar requests when possible

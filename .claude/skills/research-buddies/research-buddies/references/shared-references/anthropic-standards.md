# Anthropic Skill Standards — Shared Reference

Writing conventions derived from Anthropic's skill authoring best practices. Applies to all skill types.

## Voice and Person

**Description:** Always third-person. "This skill should be used when..." — never "Use when..." or "You should use this when..."

**Why:** Claude's skill picker treats descriptions as routing signals. Second-person descriptions get confused with instructions and cause mis-routing.

**Body:** Always imperative/infinitive form. Verb-first instructions.

| Correct (imperative) | Incorrect (second person) |
|---|---|
| To create a hook, define the event type. | You should create a hook by defining the event type. |
| Validate the input before processing. | You need to validate the input. |
| Search the web for current standards. | You can search the web for standards. |

## Progressive Disclosure

Move heavy content out of SKILL.md into bundled files:
- Detailed documentation → `references/`
- Reusable scripts → `scripts/`
- Templates and boilerplate → `assets/`
- Examples → `examples/`

SKILL.md is the orchestration layer. It tells Claude WHAT to do and WHERE to find details. It does not embed the details.

## Trigger Phrases

The `description` field must contain the exact phrases users say to invoke this skill. These are routing signals, not documentation.

Good: "Triggers on 'write a skill', 'create a skill', 'new skill', 'edit skill'" Bad: "Helps users create high-quality skills" (no routing signal)

## Negative Routing

Every skill must include "Do NOT invoke for:" in the description and "When NOT to use:" in the body. List 2-3 alternatives with their skill names.

**Why:** Without negative routing, similar skills steal each other's triggers. Negative routing is the primary mechanism for disambiguation.

## Conciseness

- Under 500 lines in SKILL.md (working budget: 250 lines)
- Challenge every paragraph: "Does Claude need this?"
- One excellent example beats many mediocre ones
- Don't explain what Claude already knows
- Tables over paragraphs for structured information

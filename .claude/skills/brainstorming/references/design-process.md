# Design Mode — Detailed Process Guidance

Reference for how to run each stage of the design mode process. The stages are listed in SKILL.md — this file has the detailed how-to.

---

## Understanding the idea

- Check the current project state first (files, docs, recent commits)
- Before asking detailed questions, assess scope: if the request describes multiple independent parts, flag this immediately — don't spend questions refining details of a project that needs splitting first
- If the project is too large for a single spec, help the user break it into sub-projects: what are the independent pieces, how do they relate, what order should they be built? Then brainstorm the first sub-project through the normal design flow
- For appropriately-scoped projects, ask questions one at a time to refine the idea
- Prefer multiple choice questions when possible
- Only one question per message — if a topic needs more exploration, break it into multiple questions
- Focus on: purpose, constraints, success criteria

## Exploring approaches

- Propose 2-3 different approaches with trade-offs
- Lead with the recommended option and explain why

## Presenting the design

- Once the scope is understood, present the design
- Scale each section to its complexity: a few sentences if straightforward, up to 200-300 words if nuanced
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing
- Be ready to go back and clarify if something doesn't make sense

## Design for isolation and clarity

- Break the system into smaller units that each have one clear purpose and communicate through well-defined interfaces
- For each unit, answer: what does it do, how do you use it, and what does it depend on?

## Working in existing codebases

- Explore the current structure before proposing changes. Follow existing patterns.
- Where existing code has problems that affect the work, include targeted improvements as part of the design
- Don't propose unrelated refactoring

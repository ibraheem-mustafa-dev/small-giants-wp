# Spec-Writer Q&A Protocol

Shared reference used by `/spec-writer` and any skill that embeds guided Q&A-to-document flows. Reference as: `~/.agents/skills/shared-references/spec-writer-qa-protocol.md`

---

## Output Type Selection

Before asking questions, establish which output the user needs:

> **"What do you need at the end of this? Options:**
> - **A) CLAUDE.md** — project context file for AI coding sessions (Claude Code, Cursor, etc.)
> - **B) Requirements spec** — full feature/product requirements document (internal use)
> - **C) Technical brief** — concise handoff document for a developer or contractor
> - **D) Project proposal** — client-facing scope, timeline, and deliverables
>
> Or say 'not sure' and I'll help you decide."**

### Decision guide (if user says "not sure"):

| Situation | Recommend |
|---|---|
| About to start a Claude Code / Cursor session | A — CLAUDE.md |
| Planning a feature before building | B — Requirements spec |
| Handing work to a developer or agency | C — Technical brief |
| Pitching scope/cost to a client | D — Proposal |
| Complex product with many stakeholders | B — Requirements spec |

---

## Core Questions (All Output Types)

Ask these for every project. **One question at a time — wait for each answer before continuing. Do not batch questions.**

---

**Q1 — The one-liner**
> "In one sentence: what is this project?"

*Good answer:* "A patient intake form plugin for WordPress that stores data in a custom post type."  
*Bad answer:* "It's like a CRM but for doctors." (→ probe for specifics)

*If vague, ask:* "What does it actually do — what's the core action it performs?"

---

**Q2 — The user**
> "Who is this for, and what's their pain point right now?"

*Good answer:* "Field doctors in Gaza clinics who currently write patient data on paper and lose it when clinics relocate."  
*Bad answer:* "Doctors." (→ probe: which doctors? what do they currently do instead?)

*Probe:* "What are they doing today to solve this problem? Why is that not good enough?"

---

**Q3 — The problem**
> "What specific problem does this solve? (Not what it does — what pain does it remove?)"

*Good answer:* "Paper records are lost when clinics move. No patient history = dangerous treatment decisions."  
*Bad answer:* "It makes things more efficient." (→ probe for specific consequences of the current state)

---

**Q4 — Done looks like**
> "What does 'done' look like? Describe the moment you know it's finished."

Push for specifics:
- "A doctor can ___"
- "When ___ happens, the system ___"
- "The output is ___"

*If vague:* "If I built exactly what you've described and showed it to you, what would you check first to know it's right?"

---

**Q5 — What already exists**
> "What already exists? What should we NOT rebuild?"

Push for:
- Existing code, plugins, APIs, databases
- Third-party services already in use
- Previous attempts that didn't work (and why)

*Probe:* "Is there anything in the current codebase that partially does this?"

---

**Q6 — Hard constraints**
> "What are the hard constraints? Things we cannot change."

Examples to prompt:
- Tech stack (must be WordPress, must be PHP 8+, must run offline)
- Budget or time cap
- Compliance (GDPR, HIPAA, data sovereignty)
- Hosting environment (shared hosting, no Docker)
- Team skill level (no React allowed)

*Probe:* "What would make this fail even if the code was perfect?"

---

**Q7 — Out of scope**
> "What is explicitly out of scope for now?"

This is as important as what's in scope. A good spec has a clear NOT list.

*Probe:* "What might someone reasonably expect this to include that it won't?"

---

**Q8 — Stakeholders**
> "Who else needs to know about this? Who signs off, who uses it, who maintains it?"

- Decision-maker (approves the spec)
- End user (uses the thing)
- Maintainer (keeps it running)
- Anyone who could block or derail

---

## CLAUDE.md Additional Questions

Ask these **after** the core questions if output type = A (CLAUDE.md).

---

**Q9 — Tech stack**
> "What's the tech stack? Languages, frameworks, key dependencies."

Be exhaustive: PHP version, WordPress version, any plugins the code depends on, JS framework, CSS framework, build tools.

---

**Q10 — Naming conventions**
> "What are the naming conventions? Function prefixes, file naming, CSS class patterns, database table prefixes."

*Example:* "All functions prefixed `hd_`, CSS classes use BEM, files in `includes/` use kebab-case."

---

**Q11 — Hard rules**
> "What are the hard rules — things the AI must never do, and things it must always do?"

Examples:
- "Never use `wp_remote_get` without error checking"
- "Always use `$wpdb->prepare()` for queries"
- "Never commit to main directly"
- "Always run PHPUnit before suggesting a merge"
- "Do not modify `vendor/` directory"

---

**Q12 — Key files**
> "Where are the key files? Entry point, main classes, config, test suite."

*Example:*
```
Entry: helping-doctors.php
Core logic: includes/class-hd-patient.php
Admin UI: admin/views/
Tests: tests/
Config: .env (never commit)
```

---

**Q13 — Current state**
> "What's the current state of the project? What works, what's broken, what's in progress?"

*Probe:* "If I opened the codebase right now, what would I find? What's the last thing that was changed?"

---

**Q14 — AI priorities**
> "What should the AI prioritise? What's the most important thing to get right?"

Examples:
- "Correctness over cleverness — this is medical data"
- "Performance — the clinic has 2G internet"
- "Backward compatibility — we support PHP 7.4 still"
- "Security — all data is sensitive"

---

## Requirements Spec Additional Questions

Ask these after the core questions if output type = B (Requirements spec).

---

**Q9 — User stories**
> "Walk me through the main user journeys. What does each type of user need to do?"

For each user type: who they are → what they want to do → why → what a success looks like.

---

**Q10 — Data model**
> "What data does this handle? What are the key entities and their relationships?"

*Example:* "Patients have many visits. Visits have one doctor. Doctors belong to one clinic."

---

**Q11 — Integrations**
> "Does this integrate with anything external? APIs, services, existing systems?"

Name the integration, what data flows, who owns it.

---

**Q12 — Non-functional requirements**
> "What are the performance, security, and reliability requirements?"

- Load: "Must handle 200 concurrent users"
- Uptime: "Must work offline with sync when connected"
- Security: "All data encrypted at rest"
- Compliance: "Must not send data outside the country"

---

**Q13 — Phasing**
> "Is this all one phase or should it be split? What's the MVP vs. later phases?"

Good specs are phased. Define what's Phase 1, what can wait.

---

## Technical Brief Additional Questions

Ask these after core questions if output type = C (Technical brief).

---

**Q9 — Deliverables**
> "What exactly should the developer deliver? (Not goals — actual files, features, outputs.)"

---

**Q10 — Environment**
> "What environment does this run in? Local, staging, production? How do they deploy?"

---

**Q11 — Testing criteria**
> "How do we know the work is correct? What tests or checks should the developer run?"

---

## Proposal Additional Questions

Ask these after core questions if output type = D (Proposal).

---

**Q9 — Budget range**
> "What's the approximate budget? (I need this to scope deliverables honestly.)"

---

**Q10 — Timeline**
> "What's the desired timeline? Any hard deadlines?"

---

**Q11 — Decision criteria**
> "How will the client choose? Is this competitive? What matters most to them: price, speed, quality, trust?"

---

**Q12 — What's already been promised**
> "Has anything already been discussed or agreed with the client? Any expectations already set?"

---

## Holistic Testing Protocol (All Output Types — Mandatory)

**This section is completed by the agent, not the user.** After the Q&A is done and before writing the output document, the agent devises a test strategy for every functional requirement. Never skip for speed — an untested requirement is an unfinished requirement.

For each functional requirement (FR-XXX), work through these four layers:

**Layer 1 — Happy path** What does success look like when everything works as expected? Name the specific action, input, and observable output.

**Layer 2 — Edge cases** What inputs or states are at the boundary of the requirement? Empty inputs, maximum lengths, special characters, concurrent users, missing dependencies. List the 2–3 most likely edge cases.

**Layer 3 — Failure modes** What happens when the requirement fails? Missing permissions, database errors, API timeouts, invalid data. The test must confirm graceful failure — not just success.

**Layer 4 — Integration check** Does this requirement touch anything else in the system? If yes, name what and describe how to verify the connection still works after this feature is implemented.

**Test format for the FR table:**

```
Happy: [action → expected result]
Edge: [boundary condition to test]
Fail: [failure scenario + expected error handling]
Integration: [connected system or "standalone"]
```

**Model selection for testing:** Use `haiku` for simple assertion tests (happy path only), `sonnet` for multi-layer holistic test plans, `inline` for requirements where the test strategy requires architectural judgement.

**HARD GATE:** Every FR row in the output document must have all four layers completed before the spec is finalised. Marking any layer as "TBD" or skipping it is not permitted.

---

## Facilitation Notes

### Style
- One question at a time. Always. Never send a list of 5 questions.
- Affirm good answers briefly: "Got it." / "That's clear." / "Good — noted."
- Probe weak answers: "Can you be more specific?" / "What does that look like in practice?"
- Never skip a question. If the user doesn't know, write "Unknown — to be determined" and flag it as a risk.

### Pace
- Move at the user's pace. Some answers take 10 seconds; some take 10 minutes.
- If the user is clearly in flow, let them dump. Catch everything, then organise.
- If the user is stuck, offer examples: "For instance, would it be X or more like Y?"

### Closing the Q&A
When all questions are answered, summarise back before writing:

> "Here's what I've captured. Tell me if anything's wrong before I write the document:
> - [Project in one line]
> - [User + pain point]
> - [Done looks like: key acceptance criteria]
> - [Hard constraints: X, Y, Z]
> - [Out of scope: A, B, C]
> - [Output type: CLAUDE.md / spec / brief / proposal]"

Wait for confirmation. Then write the document.

### Fast mode (user in a hurry)
Ask only Q1, Q4, Q6, Q7 — the minimum viable spec:
- What is it?
- What does done look like?
- What are the constraints?
- What's out of scope?

Produce a skeleton document and flag which sections need filling in.

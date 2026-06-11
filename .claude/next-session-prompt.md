---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-10
primary_goal: "Land the converter REBUILD on the live page. Stage-1 Commits 2/3/4 changed the EMIT but produced ZERO change on page 8 (root cause: fold_eligible counts the hero's scalar-media sibling). The fix is the DB-driven routing design (ROUTING-CATEGORISATION-DESIGN.md) + the 9 converter rules G1–G9 + the DB-data additions. Step C (layer-by-layer mapping of both drafts, with responsive CSS) is DONE and awaits Bean's gate-2.5 approval + his critique of its accuracy before any code."
updated: 2026-06-10
---

> Invoke `/autopilot` first. Read this prompt + `.claude/handoff.md` IN FULL, then the three step-C docs in `.claude/reports/wave2/` (ROUTING-CATEGORISATION-DESIGN, STEP-C-LAYOUT-MAPPING-2026-06-10, STEP-C-STRESS-TEST-2026-06-10), then the "How cloning fidelity works — DO NOT REDESIGN THIS" box in `cloning-pipeline-flow.md`, BEFORE touching the converter.

## ⛔ THE 7 NON-NEGOTIABLE RULES (gate every action)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attrs; never a block whose `className` carries a draft BEM element class (`sgs-x__y`). The hero double-nesting (emitting `__content`/`__ctas` as BEM-classed `sgs/container`) is a live violation to fix.
2. **NO CHEATS** — no `sourceMode='bound'` emit, no echo-`$content`, no hardcoded per-variant styling (the trial card's hardcoded dashed border is being removed in the theme thread).
3. **UNIVERSAL, no carve-outs** — every fix applies to every qualifying block; no per-section special-case.
4. **NO SKIPPING** — every draft class's content + CSS transfers, or is reported skipped-with-reason.
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright live DOM + computed-style on page 8 vs the draft. Emit-green ≠ render-fixed (the whole D203 lesson). Closing on golden fixtures or parity2 alone is a violation.
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (walker, converter, shared mirror) via `/adversarial-council` or `/qc-council` + Bean approval before building.

## State recap (plain English)
The cloning converter rewrites a draft section into native SGS blocks. Stage-1 Commits 2/3/4 (cross-node CSS routing, F6a inheritance, carve-out retirement) shipped and pass tests — but **they change the emit without changing the live page**, because the hero's content wrapper never folds (the `fold_eligible` child-count counts the scalar-media `__media` sibling, so `__content` emits as a nested container and the new routing code, which lives inside the fold branch, never runs). The fix is NOT more patches — it is the **DB-driven routing design** (D203): resolve every element to a `slot` (via `slots.aliases`) → decide typed-attr-vs-child (`canonical_slot`/`role`/`has_inner_blocks`) → route box CSS name-free (`property_suffixes`) per breakpoint tier (`modifier_suffixes`), and read grid structure from the CSS (`display:grid`/`grid-template-areas`), never from a child count. Step C stress-tested this against every section of both drafts and it holds; the open work is 9 converter rules + DB data + (theme-thread) block fixes.

## Immediate focus (BEFORE any code — Bean gates this)
1. **Bean's critique of the step-C mapping accuracy** (gate 2.5). He is reviewing `STEP-C-LAYOUT-MAPPING-2026-06-10.md` line by line. Apply his corrections to the mapping + the routing design before building. Several earlier claims were wrong (e.g. "blocks missing per-property attrs" → actually preset + child-typography); take his live-editor observations as ground truth over DB guesses.
2. **Confirm the 9 converter rules (G1–G9)** are correct + complete with him.

## The work — 3 buckets (after gate)
- **⚙ Converter rules (G1–G9)** — the converter rebuild. Build to the routing design, not by patching the old walker. Each rule its own commit; `/qc-council` per commit; **live page-8 verify per commit** (the D203 discipline). G1 positional-grid-fallback · G2 tag→SGS-slot (not core/heading) · G3 typed-attr-beats-`has_inner_blocks` · G4 fold-multi-child-before-content (this is the hero fix — fold-eligibility must exclude scalar-media-consumed columns) · G5 array-item route · G6 ambiguous-alias parent-context tie-break · G7 section-root Step 0 · G8 compound-suffix+modifier · G9 missing `property_suffixes`.
- **➕ DB data** (deterministic, low-risk, can go first): the homepage + product-page `slots.aliases` gaps, 4 design tokens (surface-alt/cream/success/primary-dark), `modifier_suffixes` (`featured`/`trial`/`ghost`/`coming-soon`), `Order`/`Overflow` `property_suffixes`, set `blocks.variant_attr='variantStyle'` for product-card. Apply via `/sgs-update`-maintained seeds; re-run `/sgs-update`.
- **🧱 Block-side — HANDED TO THE THEME THREAD** via `reports/wave2/STEP-C-BLOCK-FIXES-PROMPT.md` (container-mirror must share border/bg/radius universally; testimonial + notice-banner reworks; product-card editor bugs; option-picker label controls). Coordinate — do not duplicate.

## Methodology guardrails (do not skip)
- **Live-DOM verification is the gate, not the emit.** No converter commit is "verified" without a cited computed-style read of the specific issue on the real page (clone-parity.js or Playwright). Golden fixtures are regression locks only. This is the D203 lesson — emit-green masked an unchanged render twice.
- **Read ground truth, never guess attrs.** Query `/sgs-db` / `/wp-blocks` before any "missing attr" claim; Bean's live editor beats DB attr-name guessing.
- **Deploy before measure** — `build-deploy.py --blocks-only` + OPcache reset before any page-8 read.
- **Root cause before instance fix** — the `convert-trace-b*.jsonl` per-section trace files log the route every element took; read them before conjecturing.
- **Commit by explicit path** (`git commit -- <paths>`) — co-active theme thread shares this branch + main.
- **Branch `feat/stage1-converter-core` stays open** until the rebuild lands on the live page + Bean's R-22-13 sign-off.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | converter-rule design decisions |
| `/gap-analysis` | grade outputs before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/strategic-plan` | order the G1–G9 build sequence |
| `/research` | when a routing decision isn't clear |
| `/qc-council` / `/adversarial-council` | per-converter-commit gate (blub.db 255) |
| `/subagent-driven-development` · `/dispatching-parallel-agents` | G1–G9 + DB-data dispatch |
| `/sgs-clone` · `/sgs-update` · `/verify-loop` | re-clone / DB sync / 2-attestation |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright MCP / superpowers-chrome | live page-8 + editor DOM verify (375/768/1440; login `.claude/secrets/sandybrown.env`) |
| `/wp-blocks` + `/sgs-db` | schema/attr ground truth before any "missing X" claim |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` (else general-purpose sonnet) | heavy converter/DB builds |
| `design-reviewer` | visual verify of re-cloned page 8 |

## Guardrails
Live-DOM gate per commit · read convert-trace before conjecturing · deploy before measure · commit by explicit path · branch stays open · the routing design (ROUTING-CATEGORISATION-DESIGN.md) is the build reference, not the old walker.

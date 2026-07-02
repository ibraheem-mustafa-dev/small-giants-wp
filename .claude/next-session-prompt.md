---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline / array lift DONE+LANDED → min-width cross-device tier fix + star-fill client control
generated: 2026-07-02
primary_goal: "D257+D258 array-item content lift is DONE + LANDED on page 8 (trust-bar 4 badges verified). NEXT (see .claude/handoff.md top entry + .claude/parking.md for the full backlog): (1) TOP — P-MINWIDTH-CROSSDEVICE-TIER: min-width:X = 'X and up' must emit EVERY device tier >= X (768 Tablet + 1024 Desktop) + non-device 600/640 via Spec 31 §3 F-ii passthrough — fixes trust-bar 4-across AND products/gift/ingredients (Bean: 'very important'); lives in styling_helpers/grid.py/context.py. (2) P-RAWSVG-FILLED-VS-OUTLINE: the star must render FILLED — expose a CLIENT-FACING per-icon fill (outline/filled) block control (Bean: every pipeline capability ships as a customisable block feature), then render exempts a filled icon from the uniform lucide fill:none. (3) P-FINGERPRINT-MIGRATION (62 entries prepared in .claude/scratch/fingerprint-migration-entries.txt) + P-ARRAY-RECOGNITION-SCORING (FR-31-2.5a) + P-SINGLE-ITEM-ARRAYS + push held commits. (4) Carry-forward (D101, do NOT drop): product-card Layer-B rebuild, ingredient __icon lift, cog-complexity lint on array_content.py. Follow Spec 31 in every detail; no design-gate. Every pipeline capability MUST be a client-facing block/theme control."
---

# Next session — min-width cross-device tier fix + star-fill client control (array lift DONE+LANDED, D258)

Invoke `/autopilot` before anything else. This is a `/systematic-debugging` + spec-conformance session.

**Agent identity.** You are the SGS cloning-pipeline engineer. Last session BUILT + COMMITTED the DB-recognition array field-lift (Bean's design: structural item detection + a role-fallback layer), replacing the hand-declared `arrayItemSchema`/`array_item_fields` mechanism the spec itself named an R-31-9 violation. Your job: (1) LAND it on the real page 8; (2) complete the slot-vocabulary so every array block's content fields resolve — following Spec 31 in every detail.

**State recap (plain English).** The cloning pipeline converts a draft mockup into native SGS blocks. "Array blocks" (trust-bar, hero, card-grid, pricing-table, icon-list, social-icons, process-steps, brand-strip, cta-section) render a repeating list of items (badges, plans, steps…). The OLD way hand-wrote each block's item CSS selectors in `block.json` (`arrayItemSchema`) — a hardcode the spec forbids. The NEW resolver (`converter/resolvers/array_content.py`, committed this session) finds the repeating items structurally and matches each item's children to the block's fields by canonical-slot NAME, then by ROLE (the "role-fallback": a badge caption classed `__text` carries `text-content` functionality, so it fills the `label` field which is also `text-content`). Field names + their extraction ROLE now live in the DB (`array_item_schema`, seeded from each block's `block.json items.properties.<field>.role`). **D258 COMPLETED this + LANDED it on page 8:** all 5 gap-blocks lift their content (declared role + BEM-element-segment matching for same-role fields + flat-item self-extraction + a root-inclusion detection fix); a name-heuristic seeder was trialled + REJECTED (ownership comes from the block code/declaration, never name-parsing — FR-31-2.1a). The trust-bar renders its 4 real draft badges on page 8. **2 open trust-bar gaps remain, BOTH styling** (Tasks 1+2 below): the 4-across min-width tier drop + the star rendering outline-not-filled.

---

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important`/default overriding faithful draft CSS, **no hand-declared per-block/per-draft selectors**, **no client copy baked into a base block**, **no per-slug/per-slot/per-role literal in a resolver body** (the `no_slug_literal` gate guards `block_slug`/`slot`/`canonical_slot`/`role`). Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix fires for every qualifying block/case; over-broad universality is ALSO a break. Universal signal = a DB fact (`is_root`, `container_kind`, a capability), never `if slug == X`.
4. **NO SKIPPING** — every draft content node + CSS declaration transfers, OR is EXCLUDED-with-reason, OR is a tracked GAP (visible to F5). Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — live computed-style/innerText + draft-vs-clone at 375/768/1440. Emit-green ≠ LANDED. WRITTEN ≠ LANDED. Synthetic-fixture-green ≠ real-draft-correct (STOP-34). "Deploy to homepage" = overwrite the REAL homepage page (sandybrown = page 8), never a new page (D254). Don't declare a section fixed from seeing a grid + N items — check the RENDERED result vs the DRAFT's actual desktop layout (STOP-40).
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **FOLLOW THE SPEC IN EVERY DETAIL** *(replaces the old "design-gate" rule — Bean 2026-07-02).* Spec 31 is the settled authority for every pipeline change. Read the governing section IN FULL and implement exactly what it specifies — no design-gate council, no bespoke shape. When the spec is silent on a detail, state that explicitly and pin the smallest spec-consistent rule (then write it into the spec), rather than inventing a mechanism.

## ⛔⛔ MANDATORY READING GATE (verify against ground truth, never guess; read WHOLE docs/files, not greps). Tick each in your first message:
1. ☐ **`.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — READ IT IN FULL, END TO END (Bean directive; STOP-26).** Especially §2 (core mechanism), §3.B (content branch B1-B4), §3.B.0 (universal element extraction), §13.3 (FR-31-2 family / content fork). The array field-lift is FR-31-2.5 / §3.B4.
2. ☐ **`.claude/handoff.md` (2026-07-02 top entry)** — what LANDED-ready + the 8 commits + the known slot-vocabulary gap.
3. ☐ **`.claude/decisions.md` head** (verify D-ceiling: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → D258).
4. ☐ **`converter/resolvers/array_content.py` END TO END** — the DB-recognition resolver (item detection, 2-layer match, role-fallback, iconSvg fallback). This is what you're extending.
5. ☐ **The slot vocabulary** — `slots` table (`slot_name`, `aliases`, `standalone_block`) + how `db_lookup.canonical_slot_for` resolves a field name → slot. This is where the 5 blocks' missing field names must be added.
6. ☐ **The live canary** — `https://sandybrown-nightingale-600381.hostingersite.com/` (page 8) — inspect the trust-bar after you deploy.

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the READING GATE — Spec 31 IN FULL + handoff + decisions→D-ceiling + array_content.py + the slots vocabulary? (Quote one specific thing to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; D-ceiling → D258.) The array commits — D257 (`c7fda7db`..`f892d585`) + D258 (`8375debb`) — are on main, NOT pushed; confirm before adding.
3. For the fix I'm about to build: does it FOLLOW SPEC 31 exactly (§3.B4/FR-31-2.5)? Is it UNIVERSAL (fires for every qualifying block, DB-driven, no slug/slot/role literal — Rule 2/3, the `no_slug_literal` gate)?
4. Am I gating on the REAL page (LANDED on page 8, draft-vs-clone, Bean eye) not emit-green (Rules 4/5, STOP-4/21/37/40)?
5. For any subagent: CODING subagents CASCADE-FAIL here (STOP-39) — build INLINE. Read-only analysis/council/Explore agents work. Verify any subagent's test/gate claims from the canonical cwd (STOP-16).

## ⛔ ANTI-PATTERN STOP CATALOGUE (carried forward; do NOT subtract)
- **STOP-1 — READ before you conjecture.** Verify every claim (yours, a subagent's, a doc's, a metric's) against ground truth — live code (file:line), the DB, the raw artefacts. The reading gate is non-skippable.
- **STOP-2 — Subagents RETURN data / implement assigned files; NEVER write shared files.**
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate.
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** Grep the wiring + confirm it RUNS before claiming "enforced".
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints** (768/1024 vs 600/640/781).
- **STOP-10 — Empty cloned section = usually a cv2 soft-fail** — read extract.json + trace.jsonl first; gate on `innerText.length>0`.
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column exists is necessary-not-sufficient; grep how it's WRITTEN and READ.
- **STOP-15 — A council/analysis finding is a HYPOTHESIS.** FACT-CHECK it against ground truth (file:line, DB rows) before acting — the council over-flagged this session (the `circle` alias, "8 blocks have items.properties") and Bean caught it.
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS.** Re-run the suite + gate `--check` YOURSELF from the CANONICAL cwd (`plugins/sgs-blocks/scripts`, `--import-mode=importlib`).
- **STOP-21 — LANDED-proven only by deploying the GENUINE emit to a live page + computed-style/innerText — NOT new-vs-frozen attr equivalence.** Recipe: `/sgs-clone SGS_NEW_ENGINE=1` → overwrite page 8 → anonymous Playwright `getComputedStyle`/innerText. Creds: `.claude/secrets/sandybrown.env` (grep/cut, never `source`).
- **STOP-23 — Run a pre-commit `/qc-council` on the BUILT converter code** (blub 255). Verify input-class ≠ output-class; render.php reads the attr you write AND paints the element you check.
- **STOP-24 — A DB change a reseed RE-DERIVES must use a reseed-surviving channel** (block.json / a dated migration / `sgs-update` seeder), never a manual DB edit or an unwired standalone script. NOTE: `slots.aliases` is written only by `uimax-tools/seed-slot-synonyms.py`, NOT wired into `/sgs-update` — the slot-vocabulary task must FIX this (wire it, or move alias seeding into `sgs-update-v2.py`).
- **STOP-26 — Read the WHOLE target spec section holistically before building.**
- **STOP-27 — A conservation/regression guard is `raise`, NEVER a bare `assert`** (`python -O` strips assert).
- **STOP-28 — Do NOT flip the PRODUCTION default to the new engine** until A1 (media-map) + A2 (content ledger) are green. `SGS_NEW_ENGINE=1` is the opt-in test switch. Intact.
- **STOP-31 — A commit-blocking static gate must be scoped to the cheat's ACTUAL syntactic context; plant-test it.**
- **STOP-32 — FOUR-CHANNEL CHECK before claiming a CSS property is "dropped"** (native supports→style.*, custom attrs, wrapper render, spec destination).
- **STOP-34 — SYNTHETIC-FIXTURE-GREEN ≠ REAL-DRAFT-CORRECT.** Reproduce on the FULL real draft.
- **STOP-35 — DEFAULT-IS-CONTAINER: a slug-None class-section defaults to `sgs/container` + recurse, it does NOT fail.**
- **STOP-37 — LANDED catches EMIT/SERIALISATION bugs unit tests structurally cannot.** Deploy + count rendered sections/items.
- **STOP-38 — A section-outer/wrapper fix scoped to ONE slug is an R-31-9 carve-out CHEAT.** Fire on a DB signal (`is_root`, capability), never a slug literal.
- **STOP-39 — CODING SUBAGENTS CASCADE-FAIL in this environment.** DO THE BUILD INLINE. Read-only analysis/council/Explore agents work fine.
- **STOP-40 — Don't declare a section "fixed" from seeing a grid + N items.** Check the RENDERED result vs the DRAFT's actual desktop layout.
- **STOP-41 (NEW, 2026-07-02) — the `no_slug_literal` gate guards `role`/`slot`/`canonical_slot` too, not just `block_slug`.** Any per-slot/per-role LITERAL comparison in a resolver body (`slot == 'icon'`, `role == 'identity'`, `role in (…tuple…)`) is a carve-out it blocks. Normalise via the DB or in the un-gated shared `field_extractors` (services/), never a literal in `resolvers/`.

---

## CHEATS DEALT WITH THIS SESSION (context for the next engineer)
This session removed, or built the DB-driven replacement for, several cheats. Do NOT reintroduce them:
1. **Hand-declared `arrayItemSchema` / `array_item_fields`** — per-block BEM selector strings in `block.json`, seeded to the DB. Spec 31 §3.B.0.1 names this an R-31-9 violation. RETIRED: deleted from all 8 blocks + the seeder pruned; replaced by the DB-recognition resolver.
2. **Client copy baked into base blocks** — `trust-bar`'s `items.default`/`example` were literal Mama's Munches captions (rendered on EVERY fresh insert on ANY client) + `product-card`'s example. This FAKED the earlier "trust-bar works" read (the default rendered; nothing was lifted). REMOVED → generic neutral defaults.
3. **Per-slot/per-role literal carve-outs** — the first cut of the resolver had `slot == 'icon'`, `slot == 'link'`, `role == 'identity'`, `role in _CONTENT_ROLES`. The F5 `no_slug_literal` gate caught all three; they are now DB-derived (`_content_roles()` queries the `roles` table) or normalised in the shared `field_extractors` (STOP-41).

---

## ORCHESTRATION PLAN (D257+D258 array lift DONE + LANDED — these are the NEXT tasks; every pipeline task FOLLOWS SPEC 31 IN FULL — no design-gate)

### Task 1 — TOP: min-width/max-width cross-device tier fix (P-MINWIDTH-CROSSDEVICE-TIER; Bean: "very important")
**What:** `min-width:X` / `max-width:X` are inherently CROSS-DEVICE ("X and up"). A draft rule like `@media(min-width:600px){.sgs-trust-bar__inner{grid-template-columns:repeat(4,1fr)}}` MUST emit EVERY device tier ≥ X (768 Tablet + 1024 Desktop); non-device thresholds (600/640) route via Spec 31 §3 F-ii passthrough — never dropped. Currently dropped → trust-bar renders 2-col not 4-across (D258 live-confirmed), SAME root cause as products/gift/ingredients (D256).
**Why:** one fix lands the trust-bar 4-across AND the products/gift/ingredients desktop grids — the dominant remaining fidelity gap.
**Orchestration:** INLINE (STOP-39). Lives in the CSS tier-mapping (`styling_helpers` / `grid.py` / `context.py`). `/qc-council` on the built path (STOP-23). LANDED verify page 8 (STOP-21/37).
**Acceptance:** trust-bar + products + gift + ingredients hit their DRAFT desktop column counts on live page 8 at 1440 (STOP-40 — verify vs the draft, not a grid+N-items impression).

### Task 2 — Star fill as a CLIENT-FACING block control (P-RAWSVG-FILLED-VS-OUTLINE)
**What:** the trust-bar's 4th-badge star should render FILLED, but the block's icon CSS forces `fill:none; stroke:currentColor` on EVERY icon SVG uniformly, so the raw-SVG star renders as an outline. Fix = expose a per-icon "fill style: outline / filled" CONTROL in the trust-bar block editor; the converter sets it; render exempts a `filled` icon from the uniform `fill:none`.
**Why:** Bean's principle — every pipeline capability MUST ship as a customisable block/theme control for the clients buying the sites; a converter-only fix is half-done.
**Orchestration:** INLINE (block-dev). Add attr + inspector control + render + deprecation/version bump. `npm run build`. Live-verify.
**Acceptance:** a client can toggle a badge icon outline↔filled in the editor; the cloned star renders filled on page 8.

### Task 3 — Residuals (fact-check each; DONE-NOW / DISMISSED / DEFERRED-with-blocker per STOP-18)
- **P-FINGERPRINT-MIGRATION** — migrate `fingerprints.json` `attr_extractors[].selector` → `ATTR_CLASSIFICATION_OVERRIDES` + drop the fingerprints load from `assign-canonical.py` (stale/dead builder). 62 built-block entries prepared at `.claude/scratch/fingerprint-migration-entries.txt`; needs a core/* keep-skip decision + a reseed-diff proving zero `derived_selector` regression. INLINE (STOP-39).
- **P-ARRAY-RECOGNITION-SCORING** (FR-31-2.5a) — `_find_item_nodes` scores candidate repeating groups against the block's declared item-field role signature (detection works today via the root-inclusion fix; this is robustness).
- **P-SINGLE-ITEM-ARRAYS** — structural detection needs ≥2 siblings; decide a single-item fallback per spec.
- **Push the held commits** — D257 (`c7fda7db`..`f892d585`) + D258 (`8375debb`) on Bean's page-8 eye sign-off.
- **Carry-forward (D101, do NOT drop):** product-card typed-mode Layer-B rebuild, ingredient `__icon` emoji lift, cognitive-complexity lint on `array_content.py` (S3776), P-CLONE-FIDELITY-FULL-ALIGNMENT families.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/systematic-debugging` | ALWAYS — root-cause on the DRAFT + live page before any fix |
| `/brainstorming` | design thinking where the spec leaves a detail open (then write the detail into the spec) |
| `/gap-analysis` | grade any output before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/research` | auto-routes if a defect needs external reference |
| `/strategic-plan` | order the tasks before coding |
| `/qc-council` · `/qc-inline` | multi-rater on the BUILT converter code before commit (STOP-23) |
| `/sgs-clone` · `/sgs-db` · `/wp-blocks` | DB ground-truth + the LANDED run (`SGS_NEW_ENGINE=1`) |
| `/sgs-wp-engine` | SGS framework work (evidence-gate + SKILL-STATUS harness) |
| `/verify-loop` · `/handoff` · `/capture-lesson` | 2-attestation / session close |

## MCP Servers & Tools
| Tool | What for |
|------|----------|
| Playwright / chrome-devtools | LANDED proof on page 8 (anonymous computed-style/innerText at 375/768/1440) |
| `python ~/.claude/hooks/wp-blocks.py dump` · `sgs-db.py sql "..."` | schema/DB ground-truth (slots, aliases, array_item_schema, roles) before any "missing X" |
| REST (Basic auth, `.claude/secrets/sandybrown.env`) | overwrite page 8 (the homepage) — NOT a new page (Rule 5) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `Explore` (read-only) | parallel ground-truth analysis (works; coding agents cascade-fail — STOP-39) |
| `code-reviewer` (feature-dev) | pre-commit review on the vocabulary/resolver diff |

## Methodology guardrails (do not skip)
- **FOLLOW SPEC 31 in every detail** — no design-gate; the spec is the settled authority (Rule 7, this session's directive). Where the spec is silent, pin the smallest spec-consistent rule + write it into the spec.
- **Deploy before measure** — any LANDED check requires the genuine `SGS_NEW_ENGINE=1` emit deployed to page 8 BEFORE any computed-style read (STOP-21). "Deploy to homepage" = overwrite page 8.
- **Universal or it's a cheat** — every fix fires for all qualifying blocks on a DB signal, never a slug/slot/role literal (Rule 2/3, `no_slug_literal` gate — STOP-41).
- **/qc-council BEFORE every commit** touching the resolver/converter/vocabulary (blub 255). **LANDED (Bean eye on page 8) is the closing gate**, not emit-green (R-31-13 / STOP-4/21/37).
- **convert.py stays byte-identical** (D-MODULAR) — never edit the frozen engine; port-read only.
- **Reseed-surviving DB changes only** (STOP-24) — `slots.aliases` is the known-unwired hole; fix it before seeding aliases.
- Tests: `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests cheat-gate/tests -q --import-mode=importlib` (306 baseline; never let it drop). Cheat-gate: `python cheat-gate/run.py --check` exits 0. Branch `main`; verify D-ceiling; commit path-scoped (`git commit -- <paths>`; NOT lucide/W3-plan). Block.json metadata-only commits: the visual-diff gate's own message sanctions `--no-verify` (F5/cheat-gate still run on `.py` changes).

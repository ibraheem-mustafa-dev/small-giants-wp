Invoke `/autopilot` before doing anything else.

# TRACK 2 · P2.5 — NAVIGATION FULL REWORK (requirements inventory → block architecture → mini-spec → audit-and-purge)

## Identity
You are architecting a complete, from-scratch rebuild of the SGS navigation block set for the WordPress
framework — desktop bar + dropdowns + rich mega-menu + mobile off-canvas drawer — that meets and exceeds
the top WP-theme competition AND general web/UI-UX navigation best practice, sits perfectly inside the
header CPT (P2), and is a faithful cloning-pipeline emit target.

## State recap (plain English — re-ground everything)
**P2 (the header/footer/control BUILDER design-gate) is CLOSED + signed off** — see
`.claude/plans/2026-07-18-P2-builder-ux-design-gate.md` (v-final). It designed the block-inspector
builder over a **CPT editing home** (`sgs_header`/`sgs_footer` CPTs, not the Site Editor), a tri-state
per-device control model, a starter-template picker, and a WP control-implementation spec bound to Spec 35.
It passed a 6-critic council + gap-analysis (B+) + a build + a UX specialist review.

**The NAVIGATION was carved out as P2.5** because Bean wants a **FULL REWORK, not a salvage.** A 3-stream
research pass + a 4-critic council ran (records live in the P2 doc §15.0–15.7 + the reports below). The
council recommended salvaging the current `sgs/adaptive-nav`; **Bean OVERRODE that on lived experience —
adaptive-nav is the messy, repeatedly-patch-fixed block he wants GONE.** His ground truth wins.

**What Bean LOCKED (only these):**
1. **Full rework of the whole nav block set.** No salvage of the current blocks — they are REFERENCE
   MATERIAL only. **Do NOT let the current OR the planned architecture influence the design at all**
   (Bean-locked). No conservation sentiment from salvaging — **except maybe the mega-menu, and even that
   becomes a CPT anyway.**
2. **Menu data = `wp_navigation` CPT** (the one settled mechanism).
3. **Feature bar (very high, meet-AND-exceed):** WP core nav's feature set as the **BASE**, then ADD every
   feature from **top-competitor WP themes** (Kadence/Spectra/GenerateBlocks/Elementor/Bricks — matrix in
   §15.0 Stream B), then every relevant **general web / UI-UX navigation standard + best practice we're
   missing** (the ONE research input not yet gathered), then the **WP platform features we'll use** (Spec
   35 control-completeness + more).
4. **The mega-menu is a REBUILD** — the current 3-store/slug-matched mechanism is broken (the Converter
   critic proved it can only render mega items LAST, so it can't place Indus's "Brands" at position 4/7).
   **Its IMPLEMENTATION is NOT locked.** Bean SUGGESTED a CPT (the Astra/Spectra saved-reusable-mega
   pattern) — treat that as a **candidate to evaluate on evidence**, not a decision. *(Bean, 2026-07-18:
   "the mega-menu comment was a suggestion/guess from me. You are the expert — decide from the research,
   evidence, your judgement + council/expert subagents + QC.")* Decide the mega implementation in Phase 3
   from the inventory + council + QC, like every other block.

**What is DELIBERATELY NOT decided (Bean — decide from research/evidence/judgement + council + QC):** the
NUMBER of blocks, what each does, how they compose, AND the mega-menu implementation. That architecture
is decided ONLY after the full-scale inventory of (a) everything we need to build and (b) everything we
have available to build it with. **Nothing here is pre-committed except the LOCKED items 1–3 above.**

## MANDATORY READING (in full, before P2.5 work)
1. `.claude/plans/2026-07-18-P2-builder-ux-design-gate.md` §15 — the nav decision: the **BEAN OVERRIDE
   banner** (top), then §15.0 (the 3 research streams: core-nav baseline, competitor matrix + mechanisms,
   client menus), §15.2 (WP mechanism inventory — GENERAL-reusable vs CORE-NAV-PRIVATE), §15.7 (the
   verify-platform-claims-against-source lesson). Read §15.1–15.6 as SUPERSEDED research record (inputs,
   not the current decision).
2. `.claude/reports/2026-07-18-P2-nav-decision-council.md` — the 4-critic council (what it caught, what
   survives the override).
3. `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` — control-completeness (Part L is the DoD) + Part G
   native-vs-hand-roll.
4. `.claude/specs/34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md` + `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md`
   §S9 — the CURRENT nav spec content (read as reference; it gets audited + purged in Phase 6).
5. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` §13 + `.claude/specs/33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md`
   Part 2 — converter-emittability (the nav must be a clone target).
6. `.claude/specs/common-wp-styling-errors.md` + Spec 32 — no-inline contract.

## The plan (phases — run roughly in order; one design phase per sitting is fine)

### Phase 1 — the ONE missing research pass (general web/UI-UX nav best practices)
The WP-competitor + core-nav research is DONE (§15.0). The gap is **general web / UI-UX navigation
standards + best practices BEYOND WP** — mega-menu UX (NN/g, IxDF, LogRocket, Stripe-class patterns),
mobile nav + off-canvas patterns, nav accessibility beyond WP's baseline (APG disclosure/menubar, focus,
reduced-motion), emerging patterns, and what "excellent" nav looks like outside WordPress. Delegate to
`/research` (+ `design-reviewer` for the visual/UX teardown). Goal: the features/standards we'd be MISSING
if we only matched WP competitors.

### Phase 2 — the COMPREHENSIVE nav requirements + available-tooling inventory
Assemble ONE inventory = "everything we need to build" + "everything we have to build it with":
- **NEED:** core-nav baseline (§15.0 A) + competitor features (§15.0 B) + Phase-1 web/UX best practices +
  Spec 35 controls + the concrete client menus to reproduce (§15.0 C: Mama's flat-5 + featured + cart
  badge; Indus 7-item / 3 dropdowns / 1 mega at position 4 / 5 rich panels / 2-row header / accordion).
- **HAVE:** the GENERAL-reusable WP mechanisms (§15.2 — `wp_navigation`, `registerBlockVariation`, Block
  Hooks, `render_block`, the Interactivity API as a pattern-to-PORT under SGS's own namespace/store), Spec
  35 components, the CPT pattern for mega. **NOT the CORE-NAV-PRIVATE internals (§15.2) — verified
  uncallable.** VERIFY every platform capability against SOURCE before relying on it (§15.7 lesson).

### Phase 3 — the block-architecture decision (from the inventory ONLY)
Decide: how many blocks, what each does, how they compose — **purely from Phase-2's inventory, with ZERO
influence from the current or planned architecture** (Bean-locked). Candidate axes to reason from, not
prejudge: a nav-bar block, a menu block, a mega-menu CPT + its render block, a drawer/off-canvas block, a
shared open/close/focus/inert plumbing utility (NOT one unified component — the council proved disclosure
vs dialog have incompatible ARIA contracts). Ground variant/composite structure in the DB (`/sgs-db`
`variant_slots`) — never guess.

### Phase 4 — write the new canonical nav mini-spec
The feature set + the block architecture (Phase 3) + the WP mechanisms + Spec 35 control-completeness
(Part L per block) + converter-emittability (Spec 31/33 Part 2) + the transform-ancestor-survival
requirement (a hide-on-scroll header uses `transform`; the drawer overlay must survive it via `<body>`
portal) + no-inline (Spec 32). This IS the canonical nav home (Phase 6 consolidates INTO it).

### Phase 5 — gate the architecture (+ the two completeness QCs Bean asked for)
`/adversarial-council` on the block architecture (Rule 7, high-blast-radius) **with ≥1 reviewer grounded
against LIVE SOURCE** (§15.7 lesson) + `/gap-analysis`. **PLUS a dedicated COMPLETENESS QC pass (subagents,
Bean-requested 2026-07-18)** checking BOTH: (a) **no requirement forgotten** — every feature from the
inventory + the Phase-6 spec-audit is represented; and (b) **no available tool overlooked** — no WP
feature/hook, existing SGS component (Spec 35 roster, shared components), or platform mechanism that would
make the build EASIER has been missed (Bean: "make sure you didn't forget any requirements or things we
have at our disposal that makes the building work easier"). Bean sign-off before any build.

### Phase 6 — SPEC AUDIT + PURGE (Bean's explicit end-of-P2.5 requirement — do NOT skip)
Once the new mini-spec exists:
1. **Dispatch subagents to read EVERY file in `.claude/specs/`** and report any menu/nav/navbar-related
   info anywhere.
2. **List EVERY menu/nav feature found, INLINE.** For each, a recommendation + a simple plain-English why:
   - **already in the new spec** (confirm it's covered), OR
   - **reword current for clarity** (the point exists but is unclear), OR
   - **not in the new spec → add it?** (your recommendation + why).
   Goal: confirm NOTHING listed as a menu feature anywhere is ignored.
3. **Then PURGE (NO archiving — DELETE):** remove all scattered menu/navbar content — as sections from
   docs where nav is one topic among many, or **delete the whole doc** where nav is the central topic
   (e.g. Spec 34). The new mini-spec is the single home. Bean: scattered nav content "creates a lot of
   confusion" — consolidate into one place, delete the rest.

## The 6 anti-failure gates (apply to EVERY phase — from the strategic plan)
1. Research → before design (Phase 1/2 are exactly this). 2. Verify LIVE/SOURCE not docs (§15.7 —
verify platform claims against source; the WP "levers" were mostly private internals). 3. Grep for hidden
parallel systems before building. 4. Note hardcodes for the lint scope. 5. No deferred-QC-as-signoff (the
council + gap-analysis + Bean sign-off close each gate). 6. Design-gate + council before any build.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/autopilot` | FIRST — routing + ADHD support |
| `/brainstorming` | design the block architecture (design mode) from the inventory |
| `/research` (+ `/research-buddies` / `/ui-ux-pro-max`) | Phase 1 general web/UX nav best-practices pass |
| `/gap-analysis` | grade the mini-spec + the architecture before Bean sign-off |
| `/adversarial-council` | Phase 5 — stress-test the architecture (Rule 7) with a code-grounded critic |
| `/strategic-plan` · `/phase-planner` | scope the build once the architecture is signed off |
| `/spec-writer` | write the new canonical nav mini-spec (Phase 4) |
| `/sgs-wp-engine` (+ `/wp-block-development`) | ground against live SGS block/attr schema + WP block API |
| `/sgs-db` · `/wp-blocks` | DB-first: variant_slots, block_attributes, block_composition — never guess |
| `/lifecycle` | if any skill/agent/pipeline change is needed |
| `/handoff` | session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| `search.py` / SerpAPI / WebSearch | Phase-1 general web/UX nav research |
| GitHub MCP | grep WP core nav source to VERIFY platform-capability claims (§15.7) + hidden-parallel-system sweep |
| Playwright / chrome-devtools | inspect competitor nav/mega/drawer UIs + the current SGS nav behaviour |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `design-reviewer` | Phase 1 general web/UX nav teardown (visual) + the architecture UX critique |
| `wp-sgs-developer` | ground the architecture + WP mechanisms against live SGS schema + WP source |
| `Explore` | Phase 6 — read all `.claude/specs/*` for menu/nav content fast |

## Guardrails (Bean-locked — do not skip)
- **ZERO influence from the current OR planned nav architecture on the design.** Decide from the
  inventory only. No salvage sentiment (except maybe mega-menu → CPT).
- **Menu data = `wp_navigation`** (locked). **Feature bar = core-base + competitors + general web/UX +
  Spec 35 + more** (locked, meet-and-exceed). **Mega-menu implementation is NOT locked** — a CPT is Bean's
  candidate suggestion, decided on evidence in Phase 3.
- **VERIFY every WP/platform capability against SOURCE before building on it** (§15.7 — the competitor
  research oversold WP "levers"; 4 of 5 were private core-nav internals that can't be called).
- **Constraints bind:** Spec 32 no-inline · Spec 35 Part L control-completeness per block · Spec 31/33
  converter-emittable · P2 §0c (no-inline, no banned core blocks) · WCAG 2.1 AA · transform-ancestor
  drawer survival · UK English · `viewScriptModule` (no jQuery).
- **Design-only until the architecture is council-passed + Bean-signed-off.** No building before Phase 5.
- **Shared worktree:** `git status` + `.git/MERGE_HEAD` before touching any tracked file; commit
  path-scoped to `main` via an isolated worktree (`git worktree add <tmp> main`); NEVER `git add -A`;
  re-check the branch in the SAME command as the commit (STOP-RECHECK-BRANCH — this worktree drifts onto
  other branches). Do NOT touch other tracks' files.
- **Model:** Opus high/max for the architecture synthesis + council; delegate research/teardown to Sonnet.

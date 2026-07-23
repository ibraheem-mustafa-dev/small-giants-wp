Invoke `/autopilot` before doing anything else.

> **Co-active tracks share this worktree.** A Spec-35 track commits between handoffs. Files under
> `plugins/sgs-blocks/scripts/behavioural-analyser/*`, `db-consistency/*`, `.claude/mistakes.md` and
> `next-session-prompt-spec35*.md` may carry UNCOMMITTED changes that are **not yours**. Path-scope every
> commit, re-check `git branch --show-current` in the SAME command as the commit, never `git add -A`.

---

# Next session — SGS header/footer/nav (Specs 36 + 37)

You are the engineer-orchestrator for the SGS header/footer/nav programme (Specs 36 + 37).

**Task 1 you DO hands-on, inline.** It is live verification: use Playwright/WP-CLI yourself to CREATE
the pages and settings that make last session's `DEPLOYED (unexercised)` work actually render, then
check it. That cannot be delegated — it is judgement about whether something looks and behaves right.

**Tasks 2-3 you DISPATCH** (two sequential SONNET agents) and QC their returns yourself.

*(The previous version of this line read "This session you do NOT implement" — correct for the
2026-07-22 orchestration session, wrong for this one, and it would have blocked Task 1. Fixed
2026-07-23.)*

## First action

**Smallest first step, under 5 minutes, zero dependencies — see the gap Task 1 exists to close:**

```bash
curl -s "https://sandybrown-nightingale-600381.hostingersite.com/?nocache=$(date +%s)"   | grep -oE 'wp-block-sgs-[a-z-]+' | sort -u
```

That lists every SGS block actually rendering on the canary homepage. You will see **no
`sgs-cart`, no `sgs-product-search`, and no `sgs-nav-menu`** — which is precisely why most of
2026-07-23's work is `DEPLOYED (unexercised)` and cannot be verified yet. Then read the LEDGER.

*(The previous version of this first action was `python …check-simple-surface-cap.js --help` —
broken three ways: it is a NODE script, there is no `--help` flag, and it was described as
reporting tree health when that gate is advisory and always exits 0. Fixed 2026-07-23.)*

## Mandatory READING — before anything else

1. **`.claude/LEDGER.md`** — the single living status.
2. **`.claude/STOP-CATALOGUE.md`** — the uncapped STOP catalogue + pre-flight ritual. **Answer the
   ritual inline before your first Write/Edit or first agent dispatch.**
3. **`.claude/specs/36-SGS-NAVIGATION-SYSTEM.md`** §6a (verified progress) + **FR-36-26/a/b/c** (the
   fully-scoped link-list build) — IN FULL.
4. **`.claude/specs/37-HEADER-FOOTER-BUILDER.md`** §5 (the three verification tiers) + the **§6
   note on "Spec 33 Part 2"** — which is the header/footer CLONING pipeline, NOT this spec. Spec 37
   owns the architecture and the BUILD. Read both IN FULL.
   ⛔ Specs 17 and 34 are DELETED — never cite them.

## Why this matters (motivation — Rule 7)

**Top USP:** a client edits their own header and footer in a findable admin screen and it appears on
their site. That works end-to-end on both sites. 2026-07-23 moved Specs 36+37 forward substantially — but count the TIERS, not a headline:
~16 of 64 FRs verified done, **~9 more shipped-but-never-run**, rest unbuilt, deployed to the canary with checksum proof and zero new axe violations.

**But most of it has never actually run.** The canary homepage carries no cart and no search block;
editor notices and `DeviceTabs` are editor-surface only; hide-on-scroll ships off by default; and
`sgs/nav-menu` is not on that page at all. Task 1 fixes that — it converts a pile of
`DEPLOYED (unexercised)` into either `LIVE-VERIFIED` or a real bug list. That is the highest-value
thing available, because everything downstream is currently resting on unobserved work.

## Task 1 — Make the unexercised work RENDER, then verify it (Bean-directed)

**What:** use Playwright and/or WP-CLI to CREATE the pages and settings that cause each unverified
item to render, then check both that it works and that it looks right.
**Why:** eight units shipped on 2026-07-23 with the visual-diff gate bypassed (honestly, with no
report fabricated). They are deployed and checksum-verified but unobserved. `DEPLOYED` is not `DONE`.
**Estimated time:** 45–60 min.

**Set up and then verify, one at a time:**

| Item | What must exist for it to render | What to check |
|---|---|---|
| FR-36-19 mini-cart | A page with `sgs/cart`, `displayMode` set to `flyout`, then again `drawer`; WooCommerce cart non-empty | Flyout is a DISCLOSURE (no focus trap, page usable); drawer is a DIALOG via `store('sgs/nav')`; qty-edit + remove work with no page reload; empty state renders |
| FR-36-20 search | A page with `sgs/product-search`, each of the 3 `displayMode` values | Overlay = DIALOG with `::backdrop`; icon-expand = DISCLOSURE; matched-portion highlighting; no-JS `<form role="search">` fallback still returns results |
| FR-36-21 social | A page with `sgs/social-icons`, both `source: manual` and `site-info` | Auto-generated accessible names read "Follow us on X"; `rel` correct; keyboard-reachable with visible focus |
| FR-36-12 / FR-37-19 notices | Open `sgs/nav-menu` and `sgs/site-header` in the editor (canary creds: `.claude/secrets/sandybrown.env`) | Notices appear; **and the operator can still SAVE** — that is the actual requirement (P1 DP2a) |
| FR-37-29 `DeviceTabs` | Any block with a responsive control, in the editor | Arrow keys + Home/End move between tiers; targets ≥44px; the canvas actually resizes (the native `deviceType` sync still works) |
| FR-37-13 hide-on-scroll | A header CPT with the Advanced toggle ON, set active | Header hides on scroll down, returns on scroll up; **then open the drawer while scrolled** — the header's `transform` could break the drawer's positioning (D323 class, untested) |
| FR-36-10/11 `<nav>` landmark | Any page rendering `sgs/nav-menu` | Exactly ONE `<nav>` exposed at a time; its accessible name is right; below the collapse point the landmark is GONE, not empty; re-run `nav-qa/axe-run.mjs` and confirm `region` + `landmark-unique` clear |
| FR-37-11 footer columns | A footer CPT with a known column count | Renders that many columns on desktop, stacks to 1 on mobile |

- **/qc gate after:** yes. Anything that fails becomes a named bug with evidence, not a retry loop.
- **Record results in Spec 37 §5 + Spec 36 §6a**, moving each item from `DEPLOYED (unexercised)` to
  `LIVE-VERIFIED` or to a defect. Do not leave the tier labels stale.

## Task 2 — FR-36-26c Dispatch A: icon-list presentation layer

**What:** markers + heading + typography on `sgs/icon-list`. **Fully scoped in Spec 36 FR-36-26c —
read it and build it; do NOT re-design it.**
**Why:** this block will be used in essentially every footer (Bean, 2026-07-23). The marker system
is universal — every existing `sgs/icon-list` instance benefits, not just footers.
**Estimated time:** 30–45 min.

- Execution: **delegated**, SONNET (per `/delegate`; it is bounded feature work in one block).
- Adds `markerType` (icon/emoji/bullet/numbered/none) with a real `<ol>` for `numbered`, `heading` +
  `headingLevel`, and both typography families via the SHARED `TypographyControls` + 
  `sgs_typography_css_rule` (R-22-13 — never hand-roll a font-size control).
- The marker renderer goes in ONE shared helper under `includes/`, never in the block folder
  (`--webpack-copy-php` only copies paths named in block.json; a sibling file 500s in production).
- **Dispatch MUST carry:** *"EXECUTE YOURSELF with your OWN tools. Do NOT use the Agent/Task tool to
  delegate — you are the implementer. Report actual command outputs."*
- Depends on: none. **NOT parallel-safe with Task 3** (same three files).
- **/qc gate after:** yes.

## Task 3 — FR-36-26c Dispatch B: icon-list data + semantics layer

**What:** the `source` toggle (typed | menu), menu binding, and the FR-36-26a discoverability
contract. **Also fully scoped in FR-36-26c.**
**Estimated time:** 30–45 min.

- Execution: **delegated**, SONNET. **Depends on Task 2** — same files, strictly sequential.
- Menu resolution CALLS the existing `SGS_Nav_Menu_Source` static class — reuse, never a second
  resolver (R-31-9). Heading defaults from the menu's own name; an operator title overrides it
  **stickily**.
- Then the FR-36-26a per-type table: conditional `<nav>` (opt-in, default OFF for typed),
  `aria-labelledby` → the rendered heading, and `aria-current` computed **client-side** (LiteSpeed
  would cache one page's answer for every page — FR-36-11).
- **/qc gate after:** yes — `/qc-council` before any commit touching SGS block logic (blub.db 255).

---

## Dependency graph

```
Task 1 — live verification setup + checks (Playwright/WP-CLI, inline)
   ↓  (independent of Tasks 2–3; do it FIRST — it may generate bugs that reorder everything)
Task 2 — FR-36-26c Dispatch A (sonnet)  ── presentation
   ↓  same files, strictly sequential
Task 3 — FR-36-26c Dispatch B (sonnet)  ── data + semantics
   ↓  /qc-council gate
commit (path-scoped, branch re-checked in the SAME command)
```

**Still open, NOT in these tasks:** FR-37-7 the starter picker — the single highest-leverage
remaining item, and the SAME build as Spec 36 FR-36-3 (schedule it ONCE, never twice).
`sgs/site-header` shows 7 default-visible controls vs the P2 §5 DEFAULT of 3 — advisory only, NOT a blocker (FR-37-27 roster work).

## Methodology guardrails (do not skip)

- **The ≤3 Simple-surface figure is a DEFAULT, not a ceiling (D368).** P2 §5 says so three times and
  explicitly REJECTED the hard-cap reading. `check-simple-surface-cap.js` is WARN-ONLY (exit 0);
  `--strict` enforces on demand. `sgs/site-header` at 7 default-visible controls is a NUDGE toward the
  P2 §5 roster — **not a defect, not a blocker**. Do NOT "fix" it by hiding controls a client relies on.
- **"Spec 33 Part 2" is the header/footer CLONING pipeline — it is NOT ownerless (D368).** Spec 37 owns
  the architecture and the BUILD (containers, CPT editing home, binding, behaviours, and every block
  inside a header/footer); Part 2 is separate, unstarted work that CONSUMES it. Specs 36+37 complete
  FIRST. Spec 33's own wording collapses the two labels — correct it when Part 2 is picked up.
- **A doc set can be internally consistent and uniformly wrong (D368).** This session's handoff `/qc`
  passed, then Bean corrected two claims it had verified — because QC checked the docs against THIS
  SESSION'S WORK, not against the source docs (P2) they cited. When a doc cites a source, open the
  source.

- **A dispatched agent must EXECUTE, not delegate** (NEW D362) — put the explicit "you are the
  implementer, do not use the Agent tool" line in every implementer dispatch. Two agents delegated
  instead of executing last session, burning a cycle and spawning nested agents that needed stopping.
- **Inspect the target before deleting on a live site** (NEW D362) — a delete instruction authorises the
  ACT, never skipping verification. Posts described as "scrap canary pages" were the LIVE Indus
  Retail/Wholesale sector pages. One `wp post get` per object prevented destroying client content.
- **Set option-driven state in the context that READS it** (D360) — never a raw `wp option update` from
  an arbitrary WP-CLI `--path`; use the admin action / a request against the live domain. A CLI/web store
  mismatch presented as a broken binding and nearly triggered a fix to correct code.
- **A live read contradicting a CLI read (no object cache) = a store/prefix/webroot mismatch, not a bug.**
- **An agent's "done" is a claim** — verify against the real repo / live state before believing it.
- **Prove the cause before the fix** — `"not cause A"` is exculpatory for A, never inculpatory for B.
  Never commit a fix for an unproven cause, nor a 2nd fix overlapping a working one.
- **A block-attr filter gate must be proven to FIRE on a live page** (D359) — WP-resolved values are not
  in the parsed attrs; match the attr the markup ACTUALLY carries and verify on a real render (R-31-11).
- **Deploy before measure**, and **checksum every deploy** — `[DONE]` + `[verify] HTTP 200` passes on ANY
  working SGS page including old code; `md5sum` local↔server BEFORE measuring.
- **On a shared canary a PASS is perishable** — re-assert before quoting an earlier live result.
- **Negative control, or the test is vacuous** — "would this still pass if the feature were absent?"
- **Verify an inherited deferral/description before executing it** — it is a hypothesis about the world.
- **A spec describing a superseded model misdirects the build** (D358) — amend the governing spec in the
  SAME work as the decision that changes the model.
- **Every council needs a code-grounded seat** (D358).
- **Root cause before instance fix**; **outcome vs completion** (code shipped ≠ outcome achieved).
- **STOP-29 — never "out of scope" on a spec'd surface.** Map every unbuilt part to a named spec STAGE.
- **Deploy on a shared worktree via an ISOLATED worktree** — copy `build/` (never junction node_modules)
  + `--skip-build`; reset the worktree to committed HEAD rather than copying loose files in.
- **/qc multi-rater BEFORE every commit** touching converter / pipeline / SGS block logic (blub.db 255).
- **WP_DEBUG_DISPLAY must stay false** on staging — debug notices contaminate every pixel-diff.

## Design guardrails — TRIMMED (justified: Tasks 1–3 author no design draft)

The full design-programme guardrails (brand-accent-as-ground, contrast-as-pairing, transition-only-
transform/opacity, no-hover-only-switching, degrade-to-more-content, recognised-slot-tokens, real-`<img>`
slots, background-recomputes-contrast, `dialog.close()`-kills-exit-animation, scrollbar-test-INCONCLUSIVE)
live UNCUT in `STOP-CATALOGUE.md`. **They apply only when AUTHORING A DESIGN DRAFT.** If a task pivots to
authoring a draft, load `/frontend-design` FIRST and re-read that block. Two still apply to any nav work:
`dialog.close()` kills exit animations, and never bank a scrollbar-dependent test from the harness.

## Known-open, NOT blockers (do not re-litigate)

- **Both sites show GENERIC proof headers** (sandybrown CPTs #1570/#1571; palestine-lives #360). Real
  branded headers come via the Spec 33 Part 2 cloning pipeline. Restore normal via admin "Clear active".
- **`sgs/heritage-strip` baselined debt** on posts 67/68 + 52/65/66 (deleted-block migration, REGISTER.md
  P1/P2) — baselined, does NOT block deploys. Separate from the resolved oldshape debt.
- **`P-TRUSTBAR-TRUSTPILOT-ATTR-COLLISIONS`** — the F5/F6 gate blocks commits on `sgs/trust-bar` attrs.
  **Owned by the co-active Spec-35 track.** Bypass with `[gates-ok:]` + `--no-verify`. Do NOT baseline it.
- **`P-NAV-FEATURED-HOVER-DRAFT-PARITY`** — ⛔ Bean-locked DO-NOT-FIX: the planted TEST CASE for cloning.
- **`P-NAV-STYLES-TAB-BLANKS-UNREPRODUCED`** — not reproduced; needs Bean's console capture.
- **LEDGER/decisions size caps** (`P-DOC-SIZE`) — sweep to `memory/` when over.
- **FR-36-15 converter emit + FR-36-18 real branded cutover + FR-36-25** are Phase-3, gated on Spec 33
  Part 2. Not this session.

## Skills to Invoke

| Skill | When to use |
|---|---|
| `/brainstorming` | Any architectural or design decision before building |
| `/strategic-plan` | **Task 2 — the core of this session** |
| `/gap-analysis` | Grade the audit + plan outputs before acting on them |
| `/research` | Auto-routes to the right research tier |
| `/lifecycle` | Before ANY skill / agent / pipeline change |
| `/delegate` | Pick the model per dispatched task (Tasks 1 + 3) |
| `/dispatching-parallel-agents` | **Task 3 — the parallel batch** |
| `/qc-council` | Multi-rater before any SGS-block / converter commit |
| `/qc-inline` | Small acceptance gates |
| `/adversarial-council` | Pre-build stress-test — **include a code-grounded seat** |
| `/systematic-debugging` | Root cause before fix |
| `/sgs-wp-engine` | Any SGS block / theme / client work |
| `/wp-block-development` | Core WP block-API questions |
| `/frontend-design` | **Before authoring ANY draft** — forces an explicit aesthetic direction |
| `/wp-sgs-deploy` | Deploy ceremony + gates |
| `/handoff` | Session close |

## Tool bindings — MCP Servers & Tools

| Tool | What to use it for |
|---|---|
| `playwright` | Live DOM verification (R-31-11) — the canonical proof; drawer/axe/overflow gates |
| `chrome-devtools` | CDP matched-rule provenance if CSS provenance is disputed |
| `hostinger` | Cache purge / WP version checks |
| `sgs-db.py` | Block attributes, slots, table checks — the DB is authoritative, never a prose count |
| `lints/*.py` | `bem-lint` · `token-lint` · `draft-vocab-lint` |
| `nav-qa/*.mjs` | `axe-run` · `crawl-assert` · `palette-contrast-sweep` (warn-only) |

## Agents to Delegate To

| Agent | When |
|---|---|
| `general-purpose` | Task 1 — the read-only Spec 37 conformance audit |
| `wp-sgs-developer` | Task 3 — the Batch A/B implementer agents (add the EXECUTE-YOURSELF line) |
| `code-reviewer` | Pre-commit review of any binding / converter change |
| `test-and-explain` | Plain-English confirmation for Bean that a feature works |

## Pre-flight self-attestation ritual (answer inline before first Write/Edit or first dispatch)

1. Read the governing specs (36 + 37 in full) + the LEDGER + both completion audits?
2. Did the prior session's work actually LAND? (Read the LEDGER's live status; verify HEAD.)
3. Am I about to assert a cause I have NOT tested? (STOP-PROVE-CAUSE-BEFORE-FIX.)
4. Verifying colour/contrast on ALL client palettes, not one? (STOP-VERIFY-EVERY-CLIENT.)
5. Passing the declared SHAPE (object vs flat; support vs attr)? Shape freeze respected? (STOP-D328.)
6. Does an SGS block/helper already do this? Did I grep? Did a parallel track already do it?
7. Am I building ahead of reconciling with what already shipped? (rework trap.)
8. Canary before dev-site? Full cache clear incl. Hostinger CDN before measuring? Desktop browser for
   any scrollbar/geometry check? (STOP-SCROLLBAR-LOCK / STOP-HARNESS-CANNOT-SEE-A-CLASSIC-SCROLLBAR.)
9. D-ceiling (`grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1`) + branch verified in
   the SAME command as the commit?
10. Am I touching another track's files/branches without checking their state first?
11. Would my acceptance test still pass if the feature were absent? (STOP-NEGATIVE-CONTROL.)
12. Is this inherited task's premise still true? (STOP-VERIFY-A-DEFERRAL-BEFORE-EXECUTING-IT.)
13. Am I authoring a design draft without having loaded `/frontend-design` first?
14. Does the governing spec still describe the model we are actually building? (D358.)
15. If I am running a review panel, does it have a seat that verifies claims against live source? (D358.)
16. Am I trusting a block-attr filter gate without proving it FIRES on a real page? (D359.)
17. **Am I about to DELETE anything on a live site without opening it first to confirm what it is?**
    (NEW D362 — STOP-INSPECT-THE-TARGET-BEFORE-DELETING-ON-A-LIVE-SITE. "Scrap" pages were live client
    pages. A delete instruction authorises the act, never skipping verification.)
18. **Does every implementer dispatch say "EXECUTE YOURSELF, do NOT delegate"?** (NEW D362 —
    STOP-A-DISPATCHED-AGENT-MUST-EXECUTE-NOT-DELEGATE.)
19. **Am I setting option-driven state in the same context that READS it** (admin action / live domain),
    not a raw `wp option update` from an arbitrary CLI path? (D360.)
20. **Have I verified this agent's "done" against the real repo / live state**, rather than believing the
    report? (Held all session; caught real gaps every time.)

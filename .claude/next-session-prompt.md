Invoke /autopilot before doing anything else.

> **⚠ THIS FILE IS A POINTER, NOT THE TRUTH.** This project is LEDGER-mode: `.claude/LEDGER.md`
> is THE single living-status doc. If this file and the LEDGER ever disagree, **the LEDGER wins** —
> and treat the disagreement itself as a finding worth reporting. On 2026-07-27 the previous version
> of this file was STALE (it briefed "build the mega CORE" when the core had shipped two days
> earlier, and its own ritual pre-answered "nothing shipped, nothing to verify"). A whole session was
> nearly spent rebuilding working code. **Verify this brief against `git log` before acting on it.**

> **Co-active tracks share this worktree.** A Spec-35/31 track commits between handoffs. Files under
> `plugins/sgs-blocks/scripts/behavioural-analyser/*`, `db-consistency/*`, `sgs-update-v2.py`,
> `includes/lucide-icons.php`, `reports/phase4-*.txt`, `.claude/reports/inline-styling-audit-*`,
> `plugins/sgs-blocks/scripts/tests/fixtures/phase-f/*`, `.claude/mistakes.md`, and
> `next-session-prompt-spec35*.md` / `next-session-prompt-track1-converter.md` may carry UNCOMMITTED changes
> that are **not yours**. Path-scope every commit, re-check `git branch --show-current` in the SAME command as
> the commit, never `git add -A`. **The shared prebuild is RED** on the co-active `sgs/tabs` `tabIndicatorColour`
> DB↔block.json finding (STOP-24). Build via `npx wp-scripts build --experimental-modules --webpack-copy-php`
> directly; the SGS visual-diff pre-commit gate blocks any touch to a block's render.php/block.json/edit.js
> without a passing visual-diff report — its OWN message sanctions `--no-verify` for logic-predominant changes
> (STOP-VISUAL-DIFF-GATE-NO-VERIFY-FOR-LOGIC). Do NOT reseed their DB; do NOT baseline their finding. A bare
> `git commit` (whole index) is gate-blocked on this shared tree — add `[batch-ok:<reason>]` in the command
> only after verifying `git diff --cached --name-only` is exclusively your paths.

---

# Next session — Gate 3: PROVE the mega menu works (one fixture unblocks everything)

You are the engineer-verifier for the SGS mega-menu. **The building is done. The proving is not.**
Spec 36 Phase 2's core AND its five deferred polish items are all built, committed and deployed to the
sandybrown canary. What does NOT exist is evidence that any of the motion actually runs on a real page.

## State recap (plain English — no assumed pretext)

A "mega menu" is the big rich panel that drops down from a navigation item. Over two sessions we built:
the panel block and its three layouts, two more layout variants (a logo grid and a media-card grid), a
dark colour set, five animation effects, a side panel with its own settings, and a smarter hover path so
the panel does not close when you move the mouse diagonally toward it.

**Everything above is code-complete and live on the canary. None of the ANIMATION is verified.** The
reason is mundane: the canary's mega panel (CPT post **1745**) is EMPTY. With no content inside it, there
is nothing for the reveal animation to reveal, and no open panel for an accessibility scan to inspect.

Three separate bugs last session were "built but inert" — perfect code that silently did nothing, all
passing `php -l`, eslint and every prebuild gate. That is exactly why a build is not accepted as evidence
here.

## First action (smallest step, <5 min, zero deps)
```bash
cd "c:/Users/Bean/Projects/small-giants-wp" && git log -1 --format='%h %s' && \
  grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1 && git branch --show-current
```
Expect branch `main`, **D-ceiling ≥ D397** (a co-active track may push it higher — that is normal, not a
conflict). Then read the LEDGER's ⭐CURRENT block before anything else.

## Mandatory READING — before any Write/Edit or dispatch
1. **`.claude/LEDGER.md`** ⭐ CURRENT + ⭐ NEXT — the single source of live status. Read FIRST.
2. **`.claude/STOP-CATALOGUE.md`** — the uncapped STOP catalogue (87 entries) + pre-flight ritual (§C).
3. **`.claude/specs/36-SGS-NAVIGATION-SYSTEM.md`** IN FULL (governing spec) — esp. FR-36-4/5/10/11/16/17
   and **§8 the concrete live-QC gate**, which defines what "verified" means for this surface.
4. **`.claude/plans/2026-07-24-mega-menu-BUILD-SPEC.md`** §0.5 (CORE + CF-1..CF-15), §3 (exact layout
   values), §4 (dark cascade), §6 (motion timings), §8 (aside formats) — what the built thing is SUPPOSED
   to do, so you can tell "working" from "wrong".
5. **`.claude/decisions.md` D396 + D397** — the three inert-bug root causes and the settled findings.
   D393 (co-active) is also load-bearing: `templateLock:'all'` re-applies templates by ARRAY POSITION.

## Why this matters (motivation — Rule 7)
A block-native, ARIA-compliant, content-preserving mega menu that replaces Max Mega Menu / JetMenu /
Kadence Pro with zero external dependencies — preserving rich content on mobile where every competitor
flattens to a link list. It is the headline navigation surface for every client build. **It is one
fixture away from being demonstrably real rather than theoretically built.**

## The work

### Task 1 — Build the Gate-3 fixture (THE unblocker)
**What:** put real content in the canary's mega panel and get it onto a page with a nav.
**Why:** this single fixture unblocks EVERY owed verification at once. Nothing else can proceed without it.
**Estimated time:** 20 min.

Steps: populate `sgs_mega_menu` post **1745** with real content (insert one of the 5 starter patterns —
`sgs/mega-general-2col-aside` exercises the most surface); confirm it is attached to menu **100** (item
**1746** already targets it); place `sgs/nav-menu` on a page bound to menu 100.

**Orchestration:** inline (main thread). Editor work — use Playwright with the canary credentials at
`.claude/secrets/sandybrown.env` (gitignored, always available, no need to ask). **NEVER edit
`post_content` via WP-CLI** (D270) — a PreToolUse hook blocks it and it corrupts block validation.
**Acceptance:** loading the page shows a mega trigger; clicking it opens a panel with visible content.

### Task 2 — Verify the motion actually fires
**What:** prove each effect runs, on a real page, in a real browser.
**Why:** three effects were dead code last session and every gate passed them. "The code exists" is
worth zero here.
**Estimated time:** 30 min. **Depends on:** Task 1.

Per effect, name the observable signal BEFORE looking, then check it:
- **Stagger** — panel children fade+rise in sequence on open. It is opt-in via `staggerOnOpen`, so turn
  it ON first or you will "verify" a disabled feature. Its observer watches the TRIGGER's
  `aria-expanded`, not the panel.
- **Sliding indicator** — opt-in via `indicatorStyle: 'pill'`. **Check the pill's SHAPE**: it animates
  `width` now (a deliberate scoped exception); the previous `scaleX` version stretched the corners.
- **Magnet label** — opt-in via `itemMagnetEnabled`. Label drifts slightly toward the cursor.
- **Caret flip** — always on; rotates 180° when expanded.
- **Cursor spotlight** — always on when an aside is present; a soft radial glow follows the pointer.
- **Card hover-lift** — `cards` style only; lifts 3px, shadow fades in via a pseudo-element.

**Orchestration:** inline + Playwright MCP. **Acceptance:** each effect either visibly runs or is proven
absent with a named reason. A "cannot tell" is a FAIL — extend the measurement, do not round up.

### Task 3 — The live a11y + degradation gate (Spec 36 §8)
**What:** the pre-registered exit gate for this phase.
**Why:** the accessibility claim is the competitive differentiator; unverified, it is marketing.
**Estimated time:** 30 min. **Depends on:** Task 1.

- `axe` = 0 on an **OPEN mega panel** AND on the **open drawer** (the drawer run has been INCONCLUSIVE
  since 2026-07-23 — a harness click timeout, not a page defect; close it this time).
- Keyboard: Tab through the panel (NO trap), Escape closes and returns focus to the trigger.
- `prefers-reduced-motion` emulated: every effect shows its FULL END STATE instantly. Content must never
  be left hidden or part-faded.
- JS-off crawl: every panel link AND its rich content present in the pre-JS HTML (FR-36-17).
- **Drawer no-regression** — the mega uses a SEPARATE `store('sgs/mega')`; prove the drawer is untouched.
- **Live recursion test** (CF-1): a panel whose content references the menu it hangs off must degrade to
  a plain link — no fatal, no infinite loop.

**Orchestration:** `nav-qa/axe-run.mjs` + Playwright. Delegate the sweep to a subagent ONLY with explicit
per-check evidence required back. **Acceptance:** every check has a recorded result, not an assumption.

### Task 4 — Honest visual-diff reports + Bean's eye (R-31-13)
**What:** replace the three `verdict: INCOMPLETE` reports with real ones, and get Bean's sign-off.
**Why:** the reports are currently committed as INCOMPLETE / `first_paint_capture_passed: false` —
deliberately NOT faked as PASS. Only real evidence may flip them.
**Estimated time:** 15 min. **Depends on:** Tasks 2 + 3.

`reports/visual-diff/{mega-panel,mega-aside,nav-menu}-<DATE>.md`. **NEVER fabricate `verdict: PASS`** —
that gate is the last thing standing between this work and a client site. Then show Bean a cropped
before/after pair; script measurement AND Bean's eye are co-authoritative (R-31-13), neither closes alone.

### Task 5 (only if 1–4 pass) — the deferred remainder
`sgs/icon-list` items have no description field, so the aside's `preview` format can only show a hovered
link's TITLE, not its description (§8 wants both). Adding the field touches another block — scope it
deliberately, do not absorb it silently.

## Dependency graph
```
Task 1 (fixture, inline) ──┬─ Task 2 (motion verify) ─┐
                           └─ Task 3 (a11y gate) ─────┴─ Task 4 (reports + Bean's eye) → Task 5 (optional)
```

## Pre-flight self-attestation ritual (answer inline before first Write/Edit or dispatch)
**Full uncapped ritual + ALL STOP defences = `STOP-CATALOGUE.md` §C — carried forward there, never dropped.
Below = the verification-phase subset + this session's NEW gates (12/21/22/23 from the 2026-07-27 session):**
1. Read the LEDGER ⭐CURRENT + STOP-CATALOGUE + Spec 36 in full + BUILD-SPEC §0.5/§3/§4/§6/§8?
2. **Did last session LAND, and does THIS FILE match reality?** Check `git log -1` + the D-ceiling
   against the LEDGER. **Do NOT trust a brief that pre-answers this question** — the previous version of
   this file asserted "nothing shipped" while 4 commits sat in `main`. (STOP-VERIFY-THE-BRIEF.)
3. Am I about to assert a cause I have NOT tested? (STOP-PROVE-CAUSE-BEFORE-FIX.)
4. Am I VERIFYING, not building? The build is done — new code this session is a signal something is wrong.
5. Passing the declared SHAPE (object vs flat; support vs attr)? (STOP-D328.)
6. Reusing what exists — the 5 starter patterns, `nav-qa/*.mjs`, the canary fixtures? Did I grep?
7. Am I extending `store('sgs/nav')`? DON'T — the mega is a SEPARATE `store('sgs/mega')` (CF-3).
8. Canary before dev-site? Full cache clear + theme-version bump (pattern cache) before measuring?
   Desktop browser for geometry (device emulation cannot reproduce the scrollbar bounce)?
9. D-ceiling + branch verified in the SAME command as the commit? (STOP-RECHECK-BRANCH.)
10. Touching another track's files (lucide-icons.php, phase4-*, phase-f fixtures, spec35/converter prompts)? DON'T.
11. Would my acceptance test still pass if the feature were absent? (STOP-NEGATIVE-CONTROL.)
12. Is this pinned CF/finding still true against source? Fact-check before acting (STOP-FACT-CHECK-COUNCIL-FINDINGS).
13. `role:content` on every editable child attr, verified LIVE (a green build won't catch it)? (CF-6.)
14. Recursion guard proven by a NAMED self-reference test, not by reading the code? (CF-1.)
15. Escaping: colour→`sgs_colour_value()`, dims→the nav-menu regex, text/URL→`esc_html`/`esc_url`,
    no raw attr in `<style>`? (CF-2.)
16. A 2+-instance-of-the-same-block live page (D374) + no top-level fn in per-render render.php?
17. Verifying a fix EMITS/RENDERS on the live page, not just that the code exists? (R-31-11/13.)
18. Every implementer dispatch says "EXECUTE YOURSELF, do NOT delegate" (D362)?
19. Setting option-driven/active state via the admin action / live-domain context, not a raw CLI
    `wp option update` (D360)?
20. Proving a thing is MISSING before adding it, against rendered output (D369)? Not deleting on a live
    site without inspecting (D362)?
21. **[NEW] Have I named the OBSERVABLE SIGNAL for every effect before checking it?** A green build is
    zero evidence an effect fires — 3 inert bugs passed every gate on 2026-07-27
    (STOP-A-GREEN-BUILD-IS-NOT-EVIDENCE-AN-EFFECT-FIRES).
22. **[NEW] Am I about to "fix" a doc I have not verified is actually wrong?** 1 of 3 such claims was MY
    error last session and would have corrupted a correct spec
    (STOP-VERIFY-A-DOC-IS-LYING-BEFORE-YOU-FIX-IT).
23. **[NEW] Did I add a `patterns/*.php` file? Then BUMP `theme/sgs-theme/style.css` `Version:`** — WP
    caches the pattern list against it and the pattern will never appear
    (STOP-NEW-PATTERN-FILES-NEED-A-THEME-VERSION-BUMP). Verify via the block-patterns REST endpoint.

## Methodology guardrails (do not skip)
- **A green build / passing gates are NOT evidence an effect fires.** Name the observable signal, check it live.
- **Verify a doc is lying before you fix it** — your own diagnostic claim is a hypothesis too.
- **/qc multi-rater BEFORE every commit** touching SGS block/converter logic (blub.db 255).
- **Deploy = `build-deploy.py --target sandybrown`** (the ONE path; keeps the `.bak` rollback + oldshape
  gate + verify). **NEVER hand-roll tar/scp** (D336 took 2 client sites down ~2.5h). Checksum every deploy
  (`md5sum` local↔server) — `[verify] HTTP 200` passes on ANY working page
  (STOP-VERIFY-DEPLOY-BY-CHECKSUM); a matching md5 proves CONSISTENCY, never correctness.
- **`git log -1` after every commit** — a "succeeded" commit can be silently gate-blocked (proven twice).
- **WP_DEBUG_DISPLAY stays false** on staging. **STOP-29** — never "out of scope" on a spec'd surface;
  map every deferral to a named spec stage.
- **An agent's "done" is a CLAIM** — verify against the real repo / live state (D362).

## Known-open, NOT blockers
- **Canary fixtures:** mega page **1762**, panel **1745** (EMPTY — Task 1 fills it), menu **100**, item
  **1746**; header CPT **1570**, footer CPT **1654**. Do not assume any are clean.
- `supports.interactivity` (27 blocks) — INVESTIGATED + SETTLED as harmless/dormant (D397). **Do NOT
  re-investigate.** Re-open ONLY if the framework adopts Interactivity-Router client navigation.
- `P-MAMAS-PRIMARY-CONTRAST` · two unnamed `<main>` landmarks (framework axe, NOT nav-menu — negative
  control proved the nav-free homepage reports the identical 5) · both sites generic proof headers.
- `decisions.md` is 2,697 lines vs a 600 cap — parked as `P-DOC-SIZE-AND-DOCSCORE-RESIDUALS`. Its docscore
  "US spelling" + "TODO stub" hits are **documented FALSE POSITIVES** (`Organization` is the Schema.org
  type name — anglicising breaks emitted JSON-LD). Do NOT "fix" them.
- Blub dashboard DOWN (port 5050) — lessons pending upload (CC-memory + workspace layers are written).

## Skills to Invoke
| Skill | When |
|---|---|
| `/brainstorming` | ALWAYS — but the design is DONE; only for a genuinely new sub-decision |
| `/gap-analysis` | ALWAYS — grade dispatched agents' output before acting on it |
| `/lifecycle` | ALWAYS — before any skill/agent change |
| `/research` | ALWAYS — auto-routes the tier |
| `/strategic-plan` | ALWAYS — but the plan EXISTS (the 5 tasks above are the sequence) |
| `/sgs-wp-engine` | Any SGS block/theme work |
| `/wp-block-development` | Core WP block-API questions |
| `/qc-council` | Multi-rater before any SGS-block commit (blub.db 255) |
| `/qc-inline` | Inline acceptance gate — incl. verifying a doc is wrong BEFORE editing it |
| `/a11y-audit` · `/visual-qa` | Task 3's accessibility + visual sweeps |
| `/systematic-debugging` | Root cause before fix, if an effect does not fire |
| `/sgs-db` · `/wp-blocks` | Mega CPT/block/variant DB ground truth |
| `/wp-sgs-deploy` | Deploy ceremony + gates |
| `/handoff` | Session close — rewrite THIS file + the LEDGER |

## MCP Servers & Tools
| Tool | What for |
|---|---|
| `playwright` / `chrome-devtools` | Live DOM (R-31-11): fixture build, hover/tap/keyboard, axe, reduced-motion, drawer no-regression |
| `hostinger` | Cache purge / WP version checks |
| `sgs-db.py` | Mega CPT + block attrs/variants — the DB is authoritative |
| `nav-qa/*.mjs` | `axe-run` · `crawl-assert` · `palette-contrast-sweep` |

## Agents to Delegate To
| Agent | When |
|---|---|
| `wp-sgs-developer` | Any code fix Task 2/3 surfaces (add "EXECUTE YOURSELF, do NOT delegate", D362) |
| `design-reviewer` | Compare the built mega panel against Bean's Claude Design drafts |
| `code-reviewer` / `general-purpose` | Pre-commit multi-rater review + verifying agents' "done" claims |
| `test-and-explain` | Plain-English confirmation for Bean that the mega menu works |

## Guardrails
- Build via `npx wp-scripts build --experimental-modules --webpack-copy-php` (shared prebuild RED on co-active sgs/tabs).
- Path-scoped commits only; re-check branch in the same command; `--no-verify` + `[gates-ok:<reason>]` for
  logic-only changes — **NOT for visual ones** (the gate's exemption is explicit; do not claim it falsely).
- The mega is a SEPARATE disclosure module — do NOT touch `store('sgs/nav')`'s drawer orchestration.
- The new `check-block-asset-targets` gate runs in **postbuild**. If it fires, a `block.json` names a file
  the build never produced — fix the missing `import` in that block's `index.js`, never the gate.

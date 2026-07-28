Invoke /autopilot before doing anything else.

> **⚠ THIS FILE IS A POINTER, NOT THE TRUTH.** This project is LEDGER-mode: `.claude/LEDGER.md`
> is THE single living-status doc. If this file and the LEDGER ever disagree, **the LEDGER wins** —
> and treat the disagreement itself as a finding worth reporting. On 2026-07-27 the previous version
> of this file was STALE (it briefed "build the mega CORE" when the core had shipped two days
> earlier, and its own ritual pre-answered "nothing shipped, nothing to verify"). A whole session was
> nearly spent rebuilding working code. **Verify this brief against `git log` before acting on it.**

> **Co-active tracks share this worktree.** A Spec-35/31/37 track commits between handoffs. Files under
> `plugins/sgs-blocks/scripts/behavioural-analyser/*`, `db-consistency/*`, `sgs-update-v2.py`,
> `includes/lucide-icons.php`, `reports/phase4-*.txt`, `.claude/reports/inline-styling-audit-*`,
> `plugins/sgs-blocks/scripts/tests/fixtures/phase-f/*`, `.claude/mistakes.md`, and
> `next-session-prompt-spec37.md` / `next-session-prompt-spec35*.md` / `next-session-prompt-track1-converter.md`
> may carry UNCOMMITTED changes that are **not yours**. Path-scope every commit, re-check
> `git branch --show-current` in the SAME command as the commit, never `git add -A`. **The shared prebuild
> may be RED** on a co-active finding (STOP-24) — build via
> `npx wp-scripts build --experimental-modules --webpack-copy-php` directly. The SGS visual-diff pre-commit
> gate blocks any touch to a block's render.php/block.json/edit.js without a passing visual-diff report; its
> OWN message sanctions `--no-verify` for logic-predominant changes
> (STOP-VISUAL-DIFF-GATE-NO-VERIFY-FOR-LOGIC). Do NOT reseed their DB; do NOT baseline their findings. A bare
> `git commit` (whole index) is gate-blocked on this shared tree — add `[batch-ok:<reason>]` in the command
> only after verifying `git diff --cached --name-only` is exclusively your paths.
> **⚠ NEW 2026-07-28: a commit of mine was silently gate-blocked and the subsequent `git push` reported
> success while pushing the CO-ACTIVE track's commit.** Always confirm with `git log -1 --format='%h %s'`
> that YOUR message is at HEAD — never trust push output (STOP-VERIFY-COMMIT-LANDED-ON-SHARED-CHECKOUT).

---

# Next session — categorise the drawer designs properly, then build the variants

You are the engineer for Spec 36's drawer. **Gate 3 is CLOSED — the mega menu is proven live.**
Desktop geometry is already measured for 8 reference sites. **What is NOT done is a proper
CATEGORISATION** — the previous pass bucketed six different designs into one `full-screen` slot on
geometry alone. Task 1 fixes that across 3 devices and produces the recommended block setup; Tasks
2-6 build it.

## State recap (plain English — no assumed pretext)

A "burger menu" is the three-line button that opens a menu panel. Ours (`sgs/nav-drawer`) was built
phone-first: it opens a panel filling the whole screen. Bean wants the burger usable on **any**
device including desktop — and on desktop a full-screen takeover is only one of the looks real sites
use. Last session measured ~30 real websites to establish what the alternatives are, and wrote it
up — **the desktop MEASUREMENTS stand and do not need redoing.** What does need doing is
categorising those designs properly, on more than size, and across all three device widths.

Last session also closed Gate 3 (the mega menu verifiably works on a real page), fixed two
root-cause defects, applied four rounds of Bean's visual feedback, fixed a security hole, and cut the
nav block's inspector from 13 panels to 8. All shipped and pushed.

## First action (smallest step, <5 min, zero deps)
```bash
cd "c:/Users/Bean/Projects/small-giants-wp" && git log -1 --format='%h %s' && \
  grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1 && git branch --show-current
```
Expect branch `main`, **D-ceiling ≥ D401** (a co-active track may push it higher — normal, not a
conflict). Then read the LEDGER's ⭐CURRENT blocks.

## Mandatory READING — before any Write/Edit or dispatch
1. **`.claude/LEDGER.md`** ⭐ CURRENT + ⭐ ALSO CURRENT — the single source of live status. FIRST.
2. **`.claude/STOP-CATALOGUE.md`** — the uncapped STOP catalogue (**81 entries**) + pre-flight ritual §C.
3. **`.claude/reports/2026-07-28-nav-drawer-desktop-variant-research.md`** — IN FULL. This is the
   brief for the whole session: measured desktop geometry, the a11y findings, the code audit of
   what is structurally blocking, and 4 named traps. **Do not re-run the desktop measurements** —
   but DO re-categorise, per Task 1.
4. **`.claude/specs/36-SGS-NAVIGATION-SYSTEM.md`** IN FULL (governing spec) — esp. **FR-36-6** (drawer
   + its new DESKTOP VARIANTS block), FR-36-8 (Burger Menu preset), FR-36-10 (disclosure vs dialog —
   the a11y contract), FR-36-14 (control completeness + the `hideExtensions` rule), §6a, §8.
5. **`.claude/decisions.md` D401** — last session's record, incl. the two root-cause defects and the
   vacuous-axe method correction. **D393** is also load-bearing (`templateLock:'all'` re-applies
   templates by ARRAY POSITION).
6. **`plugins/sgs-blocks/src/blocks/nav-drawer/{block.json,edit.js,render.php,style.css}`** AND
   **`plugins/sgs-blocks/src/blocks/modal/{block.json,render.php,style.css,view.js}`** — the modal
   already implements the centred-card geometry and hand-rolls its own `showModal()`. Read both
   before deciding where the geometry model lives.
7. **`.claude/plans/2026-07-24-mega-menu-BUILD-SPEC.md`** §0.5 (CORE + CF-1..CF-15) — the binding
   council fixes still govern the mega surface you may touch.

## Why this matters (motivation — Rule 7)
A block-native, ARIA-compliant burger menu that works at every breakpoint, with looks matching what
top studios ship — and **more accessible than the sites it is modelled on** (neither reference site
has `inert` or a focus trap; ours would). It is the headline navigation surface for every client
build, and it is one build away from covering desktop as well as mobile.

---

## Task 1 — PROPERLY CATEGORISE ALL 8 DRAWERS ACROSS ALL 3 DEVICES (Bean-directed — do this FIRST)

**What:** open every one of the 8 reference drawers at **desktop (leave the viewport at its natural
default — do not set a width), 800px tablet, and 400px mobile**, categorise each one PROPERLY, and
then say what the optimal `sgs/nav-drawer` setup should be across all 8 examples and all 3 devices.

**Why — read this before starting, it is the whole point of the task.** The previous pass
**collapsed six completely different designs into a single `full-screen` bucket** purely because
they shared ONE measurement: the panel fills the viewport. That is one dimension, and for those six
it is the dimension on which they are IDENTICAL — so it carries no information about what actually
makes them different. Bean had already named dogstudio and resn as distinct looks worth shipping as
separate variants; bucketing by geometry erased exactly that distinction. **Do not repeat it.**
Geometry is ONE axis among several, and for full-viewport panels it is the least informative one.

**Estimated time:** 45 min. **Depends on:** none. **Parallel with:** none — it gates Task 2.

### The 8 sites (every variant traces to one of these)
`lamalama.com` · `lusion.co` · `dogstudio.co` · `fantasy.co` · `buck.co` · `resn.co.nz`
(burger only via its own `#!/menu` hash route) · `studionamma.com` · `wearecollins.com`

### The 3 device widths
| Device | Viewport | Note |
|---|---|---|
| Desktop | **leave at the natural default** — set nothing | matches how the earlier rounds measured |
| Tablet | **800px** | deliberately just above our 768 collapse point, to be safe |
| Mobile | **400px** | deliberately just above 375, to be safe |

### Categorise on EVERY axis — not just size
For each site × each device, capture:
1. **Geometry** — panel rect, anchoring (viewport / header / trigger / edge), inset, radius.
2. **Layout INSIDE the panel** — single column, multi-column, grid, centred stack, split with
   imagery? How are the links arranged and at what scale?
3. **Submenu model** — none, accordion, drill-down, or columns revealed in place?
4. **Motion** — direction, duration, easing, stagger; does it differ per device?
5. **Close affordance** — ×, the burger morphing, ESC, outside-click; does its POSITION move?
6. **Backdrop** — dim, blur, opaque, none; does it block pointer events?
7. **Content differences** — is anything DROPPED on smaller screens (imagery, promos, secondary
   links, social)? Bean's standing rule is `degrade-to-more-content-never-less`, so note any site
   that violates it and any that handles it well.
8. **Mechanics** — native `<dialog>` or div? any `[inert]`? focus trap? scroll locked?

### Deliverables (in this order)
1. **A category per site** — a real descriptive character, not a size bucket. If two sites genuinely
   share a category, say so and justify it on more than geometry. If six sites are six different
   things, say that.
2. **A matrix**: 8 sites × 3 devices, showing what each one DOES at each width, and whether its
   character PERSISTS across devices or changes.
3. **The answer that gates the build:** does `variant` need a per-device dimension
   (`{desktop,tablet,mobile}`), or is one value enough because each variant's character holds at
   every width?
4. **⭐ THE OPTIMAL SETUP for `sgs/nav-drawer`** — Bean's explicit ask. Across all 8 examples and all
   3 devices, what should the block actually offer? How many variants, named descriptively (never
   studio names)? What is configurable per variant vs fixed? What is responsive vs constant? Where
   does our `<dialog showModal>` give us something all 8 references lack (none of them has `inert`
   or a focus trap)? Recommend, with reasoning, and flag anything that is a genuine judgement call
   for Bean rather than a finding.

### ⚠ Also flag: `side-panel` has NO reference site
Three of the four previously-proposed variants trace to measured sites. **`side-panel` traces to
nothing** — it exists only because `edge: left/right` is half-built in our own code
(`nav-drawer/style.css:332-346`, hardcoded `width: min(88vw, 360px)`, self-labelled "Phase 2+;
declared, not gate-tested"). Either find a real reference during this pass, or tell Bean it is a
variant with no evidence base and let him decide whether it ships.

**Orchestration:** delegated. Model **sonnet** via `/delegate` (needs a browser). Reuse the
researcher persona + probe set from rounds 2–3 — it already has the method and the desktop
baselines. **8 sites × 3 widths is the scope; do not sample.**
**/qc gate after:** no — measurement + recommendation, not code. Apply the honesty rules: only
report what was observed on a panel actually OPEN, mark anything unopenable UNCONFIRMED, name every
site, and report the real tally rather than a tidy one.
**Acceptance:** the matrix is complete (or gaps are explicitly marked UNCONFIRMED with reasons), and
deliverable 4 exists as a concrete recommendation Bean can approve or push back on. APPEND to
`.claude/reports/2026-07-28-nav-drawer-desktop-variant-research.md` — do not start a new report.

## Task 2 — Design-gate the variant + geometry model

**What:** decide, with Bean, the exact attribute shape before writing any code.
**Why:** `sgs/nav-drawer` is a shared mechanism with 16 stored instances; project rule 7 requires a
design gate before building shared-mechanism changes.
**Estimated time:** 20 min. **Depends on:** Task 1 — its verdict decides whether `variant` is flat
or per-device, so do NOT design-gate before it lands.

Bring to Bean: the 4 variants (`full-screen` default · `header-attached` · `trigger-anchored` ·
`side-panel`), how `header-attached` derives width from the header, whether geometry becomes a
responsive object (`{desktop,tablet,mobile}` — `drawerGap`/`drawerPadding` already are), and whether
the shared dialog-geometry primitive with `sgs/modal` is in scope.

**Orchestration:** inline (main thread). Use `/brainstorming` design mode.
**Depends on:** none. **Parallel with:** none. **/qc gate after:** no — a decision, not code.
**Acceptance:** Bean has signed off a written attribute shape. Nothing is built before this.

## Task 3 — Build the variant + responsive geometry model

**What:** implement the agreed variants on `sgs/nav-drawer`.
**Why:** the only way the burger works properly on desktop.
**Estimated time:** 60 min. **Depends on:** Tasks 1 + 2. **Parallel with:** none.

Pinned by prior research — do not re-litigate:
- `variant` declared via `supports.sgs.variants` + `blocks.variant_attr`/`variant_slots` (the
  `sgs/hero` pattern, FR-31-20). Seed with `/sgs-update`.
- **`header-attached` DERIVES its width from the header. Never hardcode 438px.**
- No `centre` hack on `edge` — position follows the variant.
- Add `justify-content` to the drawer body (only `align-items` exists today), or vertical centring is
  unreachable.
- Fold `animateFrom` into the variant default (kills the `edge:left` + `animateFrom:right` nonsense),
  keeping `fade` as an explicit override.
- Every variant declares its own a11y contract, not just CSS.

**Orchestration:** delegated. Model **sonnet** via `/delegate` (MCP-capable tier — the live editor
verification needs a browser). Dispatch pattern: single agent, `wp-sgs-developer`.
**Brief:** implement the Bean-approved shape (flat or per-device per Task 1's verdict); back-compatible defaults so the 16 zero-attribute
stored instances are untouched; live-verify in a real editor.
**Context it will not have:** the 4 traps in §8 of the research report — especially
**STOP-DIALOG-DISPLAY-GATE (D338)**: any per-device geometry setting `display` on the base
`.wp-block-sgs-nav-drawer` rule beats the UA's `dialog:not([open]){display:none}` and renders the
drawer permanently open, in-flow, on every page.
**/qc gate after:** yes — `/qc-council` multi-rater (blub.db 255, SGS-block logic).
**Acceptance:** each variant renders its measured geometry on the canary AND unset renders
byte-identical to today. Not "code shipped".

## Task 4 — Backdrop-click-to-close in `store('sgs/nav')`

**What:** clicking outside a non-full-screen panel closes it.
**Why:** `showModal()` makes the visible page `inert`; on a partial-width desktop panel with no
click-away dismissal that reads as a broken site.
**Estimated time:** 15 min. **Depends on:** Task 3. **Parallel with:** none.

**Orchestration:** inline. **/qc gate after:** `/qc-inline`.
**Acceptance:** verified live on a partial-width variant; ESC and the × still work; the full-screen
variant is unaffected.

## Task 5 — Live verification + Bean's eye (R-31-13)

**What:** the pre-registered exit gate for this surface.
**Estimated time:** 30 min. **Depends on:** Tasks 3 + 4.

- axe = 0 on EACH variant AT EACH BREAKPOINT it supports, **openness-guarded** (an unguarded scoped run is vacuous — see ritual Q24).
- Keyboard: containment per each variant's declared contract; ESC closes; focus returns to the burger.
- `prefers-reduced-motion`: full end state instantly, nothing left hidden.
- JS-off: links present and crawlable (FR-36-17).
- **A 2+-instance-of-the-same-block page** (D374) and a non-default `collapsePoint` sweep.
- Cropped before/after pair for Bean. **Script measurement AND Bean's eye are co-authoritative.**

**Orchestration:** inline + your OWN isolated Playwright browser (the shared MCP browser may be busy;
a working harness exists — see the research report). **/qc gate after:** `/qc-inline`.
**Acceptance:** every check has a recorded result. "Cannot tell" is a FAIL — extend the measurement.

## Task 6 (only if 1–5 land) — the shared dialog-geometry primitive
`sgs/modal` already implements the centred-card model and hand-rolls its own `showModal()`. Unifying
would also serve the cart flyout (FR-36-19) and search overlay (FR-36-20). **Must carry a
modal/non-modal flag** or it conflicts with `sgs/mega-panel`'s DISCLOSURE contract (FR-36-10). Scope
deliberately — do not absorb silently.

## Dependency graph
```
Task 1 (inline — MEASURE the reference sites at 375 + 768)
  ↓  its verdict decides whether `variant` is flat or per-device
Task 2 (inline, Opus — design gate, Bean sign-off REQUIRED)
  ↓
Task 3 (delegated, sonnet via /delegate) → /qc-council
  ↓
Task 4 (inline) → /qc-inline
  ↓
Task 5 (inline — live verify + Bean's eye)
  ↓
Task 6 (optional)
  ↓
Commit + push (verify with git log -1)
```

## Pre-flight self-attestation ritual (answer inline before first Write/Edit or dispatch)
**Full uncapped ritual + ALL STOP defences = `STOP-CATALOGUE.md` §C — carried forward there, never
dropped. Below = this surface's subset + the NEW gates (24–27) from 2026-07-28:**
1. Read the LEDGER ⭐CURRENT + STOP-CATALOGUE + Spec 36 in full + the drawer research report in full?
2. **Did last session LAND, and does THIS FILE match reality?** Check `git log -1` + the D-ceiling
   against the LEDGER. **Do NOT trust a brief that pre-answers this question** — a previous version of
   this file asserted "nothing shipped" while 4 commits sat in `main`. (STOP-VERIFY-THE-BRIEF.)
3. Am I about to assert a cause I have NOT tested? (STOP-PROVE-CAUSE-BEFORE-FIX.)
4. Am I re-running research that is already DONE and written up? The report IS the brief — new
   research this session is a signal something is wrong.
5. Passing the declared SHAPE (object vs flat; support vs attr)? (STOP-D328 — and see Q26.)
6. Reusing what exists — `sgs/modal`'s geometry, `ResponsiveControl`, `nav-qa/*.mjs`, the canary
   fixtures? Did I grep?
7. Am I extending `store('sgs/nav')` correctly, and is the mega's `store('sgs/mega')` untouched? (CF-3.)
8. Canary before dev-site? Full cache clear + theme-version bump (pattern cache) before measuring?
   Desktop browser for geometry (device emulation cannot reproduce the scrollbar bounce)?
9. D-ceiling + branch verified in the SAME command as the commit? (STOP-RECHECK-BRANCH.)
10. Touching another track's files (lucide-icons.php, phase4-*, phase-f fixtures, spec35/37 prompts)? DON'T.
11. Would my acceptance test still pass if the feature were absent? (STOP-NEGATIVE-CONTROL.)
12. Is this pinned CF/finding still true against source? Fact-check before acting (STOP-FACT-CHECK-COUNCIL-FINDINGS).
13. `role:content` on every editable child attr, verified LIVE (a green build won't catch it)? (CF-6.)
14. Recursion guard proven by a NAMED self-reference test, not by reading the code? (CF-1.)
15. Escaping: colour→`sgs_colour_value()`, dims→the nav-menu regex, text/URL→`esc_html`/`esc_url`,
    no raw attr in `<style>`? (CF-2.) **And no `;{}` breakout** — route through
    `sgs_css_value_has_breakout()` (added 2026-07-28).
16. A 2+-instance-of-the-same-block live page (D374) + no top-level fn in per-render render.php?
17. Verifying a fix EMITS/RENDERS on the live page, not just that the code exists? (R-31-11/13.)
18. Every implementer dispatch says "EXECUTE YOURSELF, do NOT delegate" (D362)?
19. Setting option-driven/active state via the admin action / live-domain context, not a raw CLI
    `wp option update` (D360)?
20. Proving a thing is MISSING before adding it, against rendered output (D369)? Not deleting on a live
    site without inspecting (D362)?
21. **Have I named the OBSERVABLE SIGNAL for every effect before checking it?** A green build is
    zero evidence an effect fires — 3 inert bugs passed every gate on 2026-07-27
    (STOP-A-GREEN-BUILD-IS-NOT-EVIDENCE-AN-EFFECT-FIRES).
22. **Am I about to "fix" a doc I have not verified is actually wrong?** 1 of 3 such claims was MY
    error and would have corrupted a correct spec (STOP-VERIFY-A-DOC-IS-LYING-BEFORE-YOU-FIX-IT).
23. **Did I add a `patterns/*.php` file? Then BUMP `theme/sgs-theme/style.css` `Version:`** — WP
    caches the pattern list against it and the pattern will never appear
    (STOP-NEW-PATTERN-FILES-NEED-A-THEME-VERSION-BUMP). Verify via the block-patterns REST endpoint.
24. **[NEW] Is my axe run OPENNESS-GUARDED?** A scoped axe run on a CLOSED drawer/panel returns
    "0 violations" identically to an open one (`excludeHidden` defaults true), so every prior
    unguarded drawer-axe claim proved nothing. Assert open + focusable-count > 0 first, and report
    VACUOUS not PASS when the guard fails
    (STOP-A-SCOPED-AXE-RUN-ON-A-CLOSED-SURFACE-PASSES-VACUOUSLY).
25. **[NEW] For any positioning / nth-child CSS: did I MEASURE the rendered box, and do I know which
    ancestor is actually the containing block?** A rule can be perfectly written and structurally
    incapable of working — two shipped this way on 2026-07-28
    (STOP-A-CSS-RULE-THAT-CANNOT-WORK-STILL-LOOKS-CORRECT-IN-SOURCE).
26. **[NEW] If two sibling blocks differ visibly in one property, did I diff their attribute SHAPES
    before their CSS?** A scalar where a box object is expected drops the WHOLE value silently
    (STOP-A-SHAPE-MISMATCH-SILENTLY-DROPS-THE-WHOLE-VALUE).
27. **[NEW] Does every block I touch declare `hideExtensions` deliberately?** Inheriting all four
    universal extensions is a decision, not a default — and a panel RENDERING is not evidence its
    attributes are registered
    (STOP-A-UNIVERSAL-EXTENSION-ATTACHES-TO-BLOCKS-IT-MAKES-NO-SENSE-ON).

## Methodology guardrails (do not skip)
- **A green build / passing gates are NOT evidence an effect fires.** Name the observable signal, check it live.
- **An unguarded scoped axe run is vacuous.** Assert the surface is OPEN before believing a 0.
- **Verify a doc is lying before you fix it** — your own diagnostic claim is a hypothesis too.
- **/qc multi-rater BEFORE every commit** touching SGS block/converter logic (blub.db 255).
- **Deploy = `build-deploy.py --target sandybrown`** (the ONE path; keeps the `.bak` rollback +
  oldshape gate + verify). **NEVER hand-roll tar/scp** (D336 took 2 client sites down ~2.5h). Verify
  deployed CONTENT by grepping the changed line — `[verify] HTTP 200` passes on ANY working page, and
  **a matching md5 proves consistency, never correctness**
  (STOP-A-MATCHING-MD5-PROVES-CONSISTENCY-NOT-CORRECTNESS).
- **`git log -1` after every commit** — a "succeeded" commit can be silently gate-blocked, and the
  push may carry a co-active track's commit instead (happened 2026-07-28).
- **WP_DEBUG_DISPLAY stays false** on staging. **STOP-29** — never "out of scope" on a spec'd surface;
  map every deferral to a named spec stage.
- **An agent's "done" is a CLAIM** — verify against the real repo / live state (D362).

## Known-open, NOT blockers
- **Canary fixtures:** Gate-3 page **1842** `/gate3-mega-nav/`, mega panel **1745** (populated), menu
  **100** (Home · Brands[mega] · Recipes · Contact), header CPT **1570** (has NO drawer — the live
  example of the FR-36-9a notice firing), drawer test page **1648**. Do not assume any are clean.
- **`nav-qa/axe-run.mjs` needs an openness guard wired in** — until then its scoped result is vacuous.
- **Plain (non-mega) dropdowns are NOT built** — `nav-menu/render.php` flattens submenu children
  ("no children this phase"); live-proven. Recorded in Spec 36 §6a against FR-36-4.
- **The bespoke Custom CSS field** is a Spec 35 Part F anti-pattern on all 81 blocks — framework-wide,
  deliberately not fixed with the nav cleanup.
- **`conditional-visibility.js` has no `hideExtensions` slug** — cannot be opted out of by any block.
- **`sgs/icon-list` has no description field**, so the mega aside's `preview` format can only show a
  hovered link's TITLE, not its description (§8 wants both).
- **The LEDGER is 29,368 bytes vs its 24,576 cap** — the oversized blocks belong to the co-active
  Spec 37 track.
- `supports.interactivity` (27 blocks) — INVESTIGATED + SETTLED as harmless/dormant (D397). **Do NOT
  re-investigate.** Re-open ONLY if the framework adopts Interactivity-Router client navigation.
- `P-MAMAS-PRIMARY-CONTRAST` · two unnamed `<main>` landmarks (framework axe, NOT nav-menu — a
  negative control proved the nav-free homepage reports the identical 5) · both sites generic proof headers.
- `decisions.md` docscore "US spelling" + placeholder-marker hits are **documented FALSE POSITIVES**
  (`Organization` is the Schema.org type name; the markers are historical narrative in an append-only
  log). Do NOT "fix" them — that is the `lean-beats-structural-theatre` failure mode.
- Blub dashboard DOWN (port 5050) — lessons pending upload (CC-memory + workspace layers written).

## Skills to Invoke
| Skill | When |
|---|---|
| `/brainstorming` | ALWAYS — Task 1 is a genuine design gate |
| `/gap-analysis` | ALWAYS — grade dispatched agents' output before acting on it |
| `/lifecycle` | ALWAYS — before any skill/agent change |
| `/research` | ALWAYS — but the drawer research is DONE; only for a genuinely new question |
| `/strategic-plan` | ALWAYS — the 5 tasks above are the sequence |
| `/delegate` | Pick the model for Task 3 before dispatching |
| `/sgs-wp-engine` | Any SGS block/theme work |
| `/wp-block-development` | Core WP block-API questions (variants, `supports`) |
| `/qc-council` · `/qc-inline` | Multi-rater before block commits · inline acceptance |
| `/a11y-audit` · `/visual-qa` | Task 4's sweeps |
| `/systematic-debugging` | Root cause before fix |
| `/sgs-db` · `/wp-blocks` | Variant/DB ground truth — seed `variant_slots` via `/sgs-update` |
| `/wp-sgs-deploy` | Deploy ceremony + gates |
| `/handoff` | Session close |

## MCP Servers & Tools
| Tool | What for |
|---|---|
| `playwright` / `chrome-devtools` | Live DOM (R-31-11): variant geometry, axe, keyboard, reduced-motion. **Use an isolated browser if the shared one is busy.** |
| `hostinger` | Cache purge / WP version checks |
| `sgs-db.py` | Variant attrs + `variant_slots` — the DB is authoritative |
| `nav-qa/*.mjs` | `axe-run` (needs the openness guard) · `crawl-assert` · `elementfrompoint-sweep` |

## Tool bindings (exact commands — do not improvise these)
| Operation | Command |
|---|---|
| Build | `cd plugins/sgs-blocks && npx wp-scripts build --experimental-modules --webpack-copy-php` (NOT `npm run build` — shared prebuild may be RED) |
| Deploy (canary) | `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only --skip-build --allow-dirty` |
| Verify a deploy | grep the CHANGED LINE on the server — `[verify] HTTP 200` passes on ANY working page |
| OPcache reset | write `<?php opcache_reset();` to webroot → `curl` it → `rm` it (the CLI pool is separate) |
| SSH | `ssh hd` · webroot `domains/sandybrown-nightingale-600381.hostingersite.com/public_html` |
| Canary credentials | `.claude/secrets/sandybrown.env` — gitignored, ALWAYS available, no need to ask |
| Editor login gotcha | LiteSpeed caches `wp-login.php` — cache-bust the login URL or the POST fails "Cookies are blocked" |
| Node/npm | Run via PowerShell — the nvm shim is broken in Git Bash |
| DB ground truth | `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` · `python ~/.claude/hooks/wp-blocks.py dump` |
| D-ceiling | `grep -oE 'D[0-9]{1,4}' .claude/decisions.md \| sort -V \| tail -1` |
| Confirm a commit landed | `git log -1 --format='%h %s'` — never trust push output |

## Agents to Delegate To
| Agent | When |
|---|---|
| `wp-sgs-developer` | Task 3 build (add "EXECUTE YOURSELF, do NOT delegate", D362) |
| `design-reviewer` | Compare each built variant against the measured reference geometry |
| `code-reviewer` / `general-purpose` | Pre-commit multi-rater; verifying agents' "done" claims |
| `test-and-explain` | Plain-English confirmation for Bean that each variant works |

## Guardrails
- Path-scoped commits only; re-check branch in the same command; `--no-verify` +
  `[gates-ok:<reason>]` for logic-only changes — **NOT for visual ones** (the gate's exemption is
  explicit; do not claim it falsely).
- Back-compatible defaults: 16 stored `sgs/nav-drawer` instances carry ZERO attributes. Unset must
  render byte-identical.
- Do NOT touch `store('sgs/mega')` — the mega is a separate disclosure module (CF-3).
- `check-block-asset-targets` runs in **postbuild**. If it fires, a `block.json` names a file the
  build never produced — fix the missing `import` in that block's `index.js`, never the gate.

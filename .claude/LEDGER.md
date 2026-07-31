---
doc_type: state
project: small-giants-wp
last_updated: 2026-07-30
note: "THE single living-status doc. Status is REPLACED here each session, never appended. History → dated snapshots in memory/session-YYYY-MM-DD*.md (the ledger-rotate Stop hook snapshots automatically past the cap but NEVER edits this file — the sweep is manual). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep this file lean (< 24,576 bytes)."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

### ⭐ FOR BEAN — plain English (read this first)

**What this is.** One file that answers "where are we and what's next", so a fresh session (or you)
gets ONE true answer instead of three drifting ones.

**Where things stand (2026-07-31).** Three tracks are live and independent — pick one, they do not
block each other. **TWO separate sessions ran today on this shared worktree**: the motion Wave C
build (below, D426–D427) and a **Track-1 verification session (D428)**.

> ### ⭐ TRACK 1 (D428) — full record: **`memory/session-2026-07-31-track1.md`**
> Kept there, not inline, because both sessions edited this file today. **Picking up Track 1? Read
> that file first — it is the authority and carries the whole next-session orchestration plan.**
>
> **Headline:** 5 commits. Two gates that could never fail now do (feature-parity; the D101 ratchet
> — compared a count, now compares identifier sets). 30 lost STOPs recovered, 123→169 additive only.
> Spec 31 C2 measurable at last: 499 declared / 21.2% attributed, with a pre-image and a **failing
> ground-truth control** (73 of 96 provably-owned rows unattributed).
>
> **Three corrections — do NOT re-derive:** the Phase-2c "missing resolver" does not exist (it is
> `block_attributes.derived_selector` — Bean caught this); `underlineOffset` is `bottom`, never a
> mis-seed; the BEM-regex diagnosis was wrong (13 cells, not 380).
>
> **⛔ `src/blocks/nav-menu/render.php` holds UNCOMMITTED work** — the submenu walker, written +
> tested, held back because the visual-diff gate correctly wants a deploy first. Do not revert it.
>
> **Final Track-1 task: Spec 35 Part L rollout** (4–32% applied). Bean's ruling: stays in living
> status, NOT `parking.md`. Brief = Task 5 in that record.

**What changed for you today — the motion toy box is now CHECKED WITH EYES ON A REAL PAGE, and
three things that were quietly broken are fixed.** Every effect was watched moving in a browser,
twice over: once normally, once with "reduce motion" switched on, so we know it both works AND
correctly calms down. All of it is committed and pushed.

**Verifying found three real faults that the earlier "it built and deployed" check could not
possibly have seen:**
1. The image gallery's "carousel" never actually slid sideways — extra images wrapped onto new
   rows instead. Every arrow, dot and the new drag feature were quietly doing nothing.
2. The drag feature could never have worked. The animation library's built-in drag mode
   secretly rewrites the page structure, which collapsed an eight-image row into one column.
   Rewritten so it only nudges the scroll position and touches nothing else.
3. The new before/after slider looked perfect on the live site but its preview was BROKEN in
   your editor. Only opening the real editor could ever have caught that.

**Also done:** the "draw my logo" effect is now selectable on icons, dividers and decorative
images — and deliberately NOT on the logo block, which already has its own control for it.

**Three honest limits:**
1. **One thing is still unproven, not passed** — whether the testimonial slider's "flick"
   momentum does anything. It behaves identically with the feature on and off, so the test
   could not tell them apart. Recorded as owed rather than dressed up as a pass.
2. **You have not looked at any of it yet.** Your eye is co-authoritative here; numbers alone
   do not close it.
3. **Shape-morphing and path-travel are designed but not built.** You signed the shape today
   (pick from thumbnails, with an upload option for advanced use). The build is the next job.

**Still waiting, none built:** header stacking on mobile (D420, still a visible defect on every
header) · drawer architecture gate (D421) · the two motion design gates above.

---

## ⭐ CURRENT FRONTS

> **Standing caveat (motion Wave A evidence):** probes are committed, their JSON output is not —
> `reports/2026-07-30-horizontal-panel-travel-and-reduced-motion.md` holds transcribed readings.
> Re-runnable, not reproducible.

### Track 3 — Spec 38 motion: **A + B + C CLOSED** · **WAVE D PLANNED 2026-07-31 (D430)**

`specs/38-SGS-MOTION-SYSTEM.md` is `active`. A: D414–D417. B: D422/D424. C: D426 (built) → D427
(verified live) → **D430 (adversarial council + 7 of its convergent items shipped same session)**.
Commits `88c2be1a` · `a06bba92` · `8da30b13` · `8172d8f4` · `02e87ee9` · `f7f61ebf` · **`6c8d78ca`**.

**⭐ THE PLAN FOR EVERYTHING REMAINING: `plans/2026-07-31-motion-wave-D-client-readiness.md`**
— 21 steps, 4 QA gates, carrying every unclosed council finding plus Bean's four new asks.
It replaces the wave-C prompt (archived). **Council findings are NOT in parking.md** — Bean-ruled
2026-07-31 that parking is strictly BLOCKED/POSTPONED work, never a reminder list.

**Council grades (six blind personas):** shippability B− · accessibility B− · competitive
defensibility C+ · specification rigour C+ · maintainability C− · **supportability D+**.

**Shipped in C, all live-verified with discriminating negative controls:** draggable roster
(derived, not declared) · NET-NEW `sgs/before-after` · DrawSVG + Vivus retired · ScrambleText ·
NET-NEW `sgs/image-sequence` + prep tooling · `draw` in the fx picker · Subtle/Standard/Dramatic
presets · the D427-signed motion-path route picker · motion-path made universal (4 blocks → 28).

**⛔ STILL OWED — the PASS verdicts are narrower than they look:**
1. **Touch is unmeasured on every drag surface** (the module gates itself off on coarse pointers
   by design, but that is a code reading, not a measurement).
2. **`post-grid` + `google-reviews` drag is UNPROVEN** — neither overflows on this site, so the
   runtime correctly declined; `sgs/buybox`'s toggle was NOT shipped (needs a WooCommerce product
   in context). All three recorded in their visual-diff reports.
3. **A clean clone still cannot finish `npm run build`** — the motion generators are fixed, but a
   dozen other prebuild scripts hard-depend on the same unversioned 13.9MB DB.
4. **Motion does not clone.** §11.3's lift has ZERO lines of code; two personas independently
   called it the product's whole point.
5. Preset/param normalisation lives in the editor's handlers, so a clone or pattern bypasses it ·
   the `svg` provision conflates "is a shape" with "contains SVG" (latent `morph` over-offer) ·
   two editor console errors survive the boot guards, cause unresolved · **Bean's eye given on
   Wave C, but not on anything shipped after it**.

**Bean rulings (do NOT re-litigate):** before/after VIDEO is KEPT · the physics sandbox is a
DESIGN GATE, not a cut — **GSAP can do it** (InertiaPlugin + Physics2D + Draggable, both bundled);
the objection is FR-38-14 plus WCAG 2.5.7 having no discrete equivalent for a thrown object ·
background cursor-follow is a new FR (`data-spotlight` in nav-menu/mega-panel is prior art) ·
morph should eventually reach any block via its CONTAINED svg.

**FR-38-12 (Flip) premise remains verified FALSE (D426)** — a live design gate, not parked, not
researched.

⚠ Parked, not ours: `P-MOTION-CANARY-CONTAINERS-INVALID-IN-EDITOR` ·
`P-FX-PANEL-UNGUARDED-BY-EVERY-CONTROL-GATE`.
⚠ Stale DB row (inert): `fx_effects.scroll-smoother` still says tier G / ScrollSmoother; D422 made
it Tier H / Lenis. Step 20 of the Wave D plan retires it.

**Canaries:** `/motion-canary-wave-c/` (page 2083, effects) · `/motion-roster-canary/` (page 2085,
roster first-paint). Harnesses: `scripts/motion-qa/probe-wave-c.mjs` + `probe-wave-c-editor.mjs`,
both self-verdicting (exit 1 fail, 2 inconclusive) and cache-busting.

### Tracks 2 + 2b MERGE (Bean, 2026-07-29) — ONE nav/header/footer track; **STRATEGIC PLAN LANDED (D413)**

**⭐ THE PLAN: `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`** — 5 waves (fixtures →
capabilities incl. drawer CPT → polish → 10-clone proof gate → Spec 33 Part 2 walker), peer-reviewed,
gap-graded B. Criteria: `verify/merged-spec36-37-track.md`. **Wave 1 CLOSED; Wave 2 in progress
(W2-i + W2-a done).** Effort forecast 18–22 taxed sessions.

**The SIGNED gate that produced it:**
`plans/2026-07-29-spec36-37-merged-architecture-and-drawer-cpt-gate.md`. Binding locks: merged 36/37
EXECUTION (§1.2 cross-amend couples the two specs) · drawer → CPT (`variantPreset` dies, 7 looks
become starter patterns, `drawerRef` becomes a post picker) · nav-menu stays a BLOCK with a
controllable burger trigger (DP4) · per-property controllability contract (DP5) · DP7 harness
honesty gates any re-present. **Bean-signed: admin name "Menu drawer" · site-wide Active default +
per-burger override · studionamma first. DP6 — cloning is the FINAL PROOF GATE (wave 4), NOT the
opening task.**

**Header-track inputs shipped 2026-07-28 (D412):** FR-36-9a(2) notice live (`6ddb9f48`) ·
**FR-37-42** column-shape picker APPROVED not built (`7ff5a184` — needs `1fr auto 1fr`; a
faithful-header-clone prerequisite) · teardowns 9/12
(`~/.claude/pipeline-state/sgs-discover/20260728-112649-7bc4a8/FINDINGS.md`; Away/ButcherBox/
rabbit.tech owed = W4-a; Lama Lama sticky by Bean's eye — probe-unmeasured ≠ non-sticky) · **SCOPE
SOURCE: `reports/2026-07-28-spec36-37-remaining-work-inventory.md`** · floating UI STAYS in the
Customiser.

Header residue: FR-37-26 FAIL verdict deliberately STANDS (blind-tester arm);
`P-HEADER-SIMPLICITY-FINDINGS` OPEN (findings 2 + 3).

### Track 2 — Spec 36 nav: TASK 5 ⛔ REJECTED BY BEAN 2026-07-29; W2-a CPT SHIPPED 2026-07-30

**Bean rejected the pairs: "night and day" — R-31-13, the eye is co-authoritative and it overrode a
21/21 mechanical pass. Do NOT re-present these; every variant needs real work first.** Narrative:
`memory/session-2026-07-29-task5-drawer-rejection.md` · **D411** ·
`reports/2026-07-29-nav-drawer-variants-task5-exit-gate.md` (read its CORRECTION box first). **Still
binding: a CPT changes where a drawer LIVES, not how faithfully it PAINTS** — W2-a (D419) proved the
mechanism, not the look.

**Two defects PROVEN LIVE, both OPEN, fixes scheduled W2-g/W2-h** (details in their parking
entries): `P-ICON-LIST-INVISIBLE-ON-DARK-DRAWER` (6 elements at **1:1** contrast on the 2
dark-`footer-bg` variants — Bean's "arrows with no labels"; **now harness-detectable**, D418) ·
`P-NAV-DRAWER-ALIGN-DOES-NOT-CENTRE-MENU` (no align class, so `centred-statement` renders left).

**Rework scope:** parking `P-DRAWER-POC-FIXTURES-NOT-EXACT-CLONES`. **The capture script must assert
the panel is OPEN before it shoots** — enforced since D418 on BOTH sides with a non-zero exit; an
unassertable reference returns UNVERIFIED.

**Standing warnings (do not lose these):** **every scoped drawer/mega axe result from before
2026-07-29 proves nothing — re-run it** (no openness guard existed; a CLOSED drawer returned
`0 violations` identically to an open one). **axe can NEVER measure contrast inside an open
`<dialog>`** — use `checkRestContrast()` in `sweep-drawer-variants.mjs` (D418). Two further harness
bugs manufactured false results, both fixed. **F1 `listColumns` `grid-auto-flow:row` is UNDECIDED**
(Bean's rows-of-2 counter stands; no ground truth — the reference capture failed). **F2** at 375px
the theme header is `position:absolute`, 251px tall, showing the DESKTOP logo over content.
**F3** `sgs/social-icons` has no Vimeo/Dribbble slug.

**Re-runnable assets:** `plugins/sgs-blocks/scripts/nav-qa/` — all guarded + self-testing since
D418; **read its `README.md` §1b/§1c before trusting or extending any of them.** Canary fixtures:
pages 1892/1897/1903/1907/1914/1922/1926, multi-instance 1930, anchor probes 1932; menus 102-109.

Parked follow-ons: `P-DRAWER-BURGER-MORPH-SYNC` · `P-DRAWER-TRIGGER-ANCHOR-JS` ·
`P-DRAWER-VARIANT-CONTENT-GENERICISE` · `P-NAV-DRAWER-VARIANTS-NO-DISCRIMINATORS` ·
`P-NAV-MENU-LISTCOLUMNS-READING-ORDER` · `P-NAV-DRAWER-DUPLICATE-DEFAULT-REF` ·
`P-ICON-LIST-INVISIBLE-ON-DARK-DRAWER` · `P-NAV-DRAWER-ALIGN-DOES-NOT-CENTRE-MENU`. None is GSAP.

> **⭐ Track-1's open work is NOT in the NEXT SESSION section any more** — that section now holds
> motion Wave C (2026-07-31). Track 1's remaining items live in the Track 1b / 1c cells directly
> below, and the four-task plan they came from is recorded in **D425** plus
> `reports/2026-07-30-track1-verification-audit.md` (which records three findings as WITHDRAWN —
> do not re-raise them). Read that report before calling any Track-1 item done.

### Track 1b — Spec 35: component layer + Part-K gate complete; **editor verification CLOSED 2026-07-30**

Components + the fail-closed gate are done (D400/D402/D405). **The editor gap is CLOSED (D425)** —
22 wave blocks opened in the real block editor, inspector rendering 7–23 panels each, zero crashes;
D372's BoxControl check discharged. Evidence:
`reports/2026-07-30-spec35-editor-canvas-verification.md`. Still open: Part I's 2 items (Spacing token, Dynamic content),
Part-L rollout at 4–32%, and T1 parity (**157 gaps / 23 blocks in scope** — the old 140/22 is
stale). Register: `reports/2026-07-30-track1-verification-audit.md`.

### Track 1c — Spec 31 converter completion

Completion wave + declarative CSS-routing shipped (D372/D373); the three "NEXT" items this cell
once carried were all already done. **The real open item is PROOF, not build** — `batch-report.json`
now reads WRITTEN-not-LANDED 0 but **33 UNVERIFIED**, and §5 defines completion as ZERO UNVERIFIED
(the "logged with a reason" escape covers GAP cells only). Triage = next session Task 1. Plan:
`plans/2026-07-22-spec31-completion-to-100.md`.

---

## Standing constraints (carry forward — these are rules, not history)

- **Per-row `position:sticky` is REJECTED** on the short-parent trap (D389). Sticky stays
  HEADER-level; a hidden row COLLAPSES to height 0 (gap measured 0.00 at all 3 tiers). The D4
  multi-sticky warning and the sticky↔hide-on-scroll exclusion were deliberately **NOT built** (both
  specified against the rejected model — do not "finish the job"). **Footer rows get NO sticky** —
  that is Spec 18 Floating UI (D390).
- **No absolute size value in a shared state-only stylesheet** (D386's GROW bug), gated by
  `check-shared-css-state-rules.js`.
- **After any `edit.js` / shared `src/components` change: deploy and OPEN the real editor** (D388 —
  two editor-killing crashes shipped past ALL-GREEN gates).
- **A scoped axe run on a CLOSED surface passes vacuously** — guard openness or the run proves
  nothing. Any earlier drawer-axe claim from that harness proves nothing.
- **A pattern verified by its METADATA is not verified by its CHILDREN** (D377 retro-invalidated).
  Anything else banked on metadata-only evidence deserves a second look.
- **`templateLock:'all'`/`'contentOnly'` re-applies the template on EVERY mount, matching children by
  ARRAY POSITION** (D393) — pass the template only into a genuinely empty container.
- **The D343 phantom border was never caused by shadows-as-borders.** Cause: WP core's
  `html :where([style*="border-width"])` substring-matching a custom property *named*
  `--sgs-tile-border-width`. Fix (shipped) = name width vars `--*-thickness`. Do not re-propagate the
  wrong diagnosis.
- **The no-login shareable preview link is DROPPED, not deferred** (Bean 2026-07-27) — a client who
  should see work-in-progress has an account or is shown a test site. Do not re-open it.
- **`<footer>` is generic** — the canary page has 5, four of them quote/testimonial attributions.
  The site footer is the LAST one, `<footer class="wp-block-template-part">`. **Key assertions on the
  CLASS**, never a naive regex.
- **Two durability caveats (setup-simplification track):** `~/.agents` is NOT a git repo, so the
  skillscore script + 5 grafted skills + `nextjs-testing` are LIVE but UNVERSIONED (recovery =
  per-file `.bak-2026-07-17-*`); the `lifecycle-gate-stop.py` unwire is local but NOT committed to
  the `~/.claude` repo.

---

## State Snapshot

### Live status (machine-checkable — verify, don't trust the cache)

- **Branch:** `main`. ⚠ **Shared worktree** — a co-active track commits between handoffs and holds
  uncommitted WIP. **Commit by EXACT PATH, never `git add -A`; never touch their uncommitted files**
  (`STOP-CO-ACTIVE-TRACK-ETIQUETTE-ON-A-SHARED-WORKTREE`).
- **Verify every session, no cached line is authoritative:**
  - `git log -1 --stat` + `git status` + `git branch --show-current` (re-check branch in the SAME
    command as any commit)
  - D-ceiling: `grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1`
  - Framework counts: `/sgs-db` or `/wp-blocks` — the DB is authoritative; counts are never in prose
- **Canonical specs:** cloning = `specs/31-UNIVERSAL-CLONING-PIPELINE.md` (read IN FULL each cloning
  session; its Appendix D is the stage index, Appendix C the run-artefact inventory). Nav =
  `specs/36-SGS-NAVIGATION-SYSTEM.md`; header/footer = `specs/37-HEADER-FOOTER-BUILDER.md`. Full
  roster + the DEAD-never-cite list: **`specs/README.md`** (the ONE roster).
- **Sites:** dev = palestine-lives.org (Indus). staging/canary =
  sandybrown-nightingale-600381.hostingersite.com. Both **WP 7.0.2** (verified 2026-07-20 by
  `wp core version` over SSH on both).
- **Fixtures left on the canary (do not assume they are clean):** mega page 1762, panel 1745, menu
  100, item 1746; header CPT 1570, footer CPT 1654.
- **Latent + open (not blockers):** Mama's `#e68a95` text-contrast (`P-MAMAS-PRIMARY-CONTRAST`) · two
  unnamed `<main>` landmarks · `minmax()` guard absent · both sites GENERIC proof headers
  (sandybrown #1570/#1571; palestine-lives #360) · FR-37-36.

---

## Product queue (the website-builder work)

**LIVE backlog, split out 2026-07-30 to keep this file under its cap — not archived:**
**`plans/strategy/product-queue.md`**. Holds the Indus core→SGS migration (A/B/C), the four
sequenced header/footer goals, and the Track B reconciliation. Reconcile before acting — some of
it is already live.

**Standing programmes (pointers only):** no-inline — the SUPPORTS migration is complete, but
**11 inline FR-32 sites across 9 blocks were found 2026-07-30** (10 fixed-not-committed, 1 still
live: `cta-section:333`) — the old "COMPLETE bar 5 block-fixes" line is SUPERSEDED by
`reports/2026-07-30-track1-verification-audit.md` · Spec 30 COMPLETE (D220) · L1–L4 DONE
(D290). Parked, not ours: `P-CONFORMANCE-GOLDEN-DRIFT`, `P-ARCHIVE-PRODUCT-WC-VALIDATION`.

---

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Spec roster + DEAD-never-cite list | `specs/README.md` (the ONE roster) |
| Decisions (D-numbered, INCIDENT/ROUTINE tagged) | `decisions.md` (+ `memory/decisions-archive.md`) |
| Parked work (OPEN/PARTIAL/BLOCKED/DEFERRED only) | `parking.md` (+ `memory/parking-archive.md`) |
| Prior sessions' full narrative | `memory/session-YYYY-MM-DD*.md` + `memory/state-archive.md` |
| Build / deploy / SSH / credentials / gotchas | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown\|palestine-lives` (the ONE path) |
| Goals + exit criteria | `goals.md` |
| Hook off-switches | `.claude/secrets/hook-off-switches.md` (gitignored operator cheat-sheet) |

## Blockers

**None.** Known-open items are the Product queue + `parking.md`.

---

## NEXT SESSION — execute Motion Wave D

**Read FIRST:** **`plans/2026-07-31-motion-wave-D-client-readiness.md`** (the whole thing — it is
the register), then **D426 → D427 → D430** in that order, then Spec 38 IN FULL.

**The plan is the plan.** It has 21 steps, four QA gates, per-step models, tests and on-fail
instructions. Do not re-derive it. Its own Honesty notes list what it lacks (no cold peer review,
no docscore, no `/qc-council` on its fix-shapes yet).

**Smallest first action, ≤20 min, zero deps:** Step 1 — measure touch on the drag surfaces. It
replaces a "by construction" claim in four reports with a real result, and if drag DOES bind on
touch that is a defect worth finding before anything else is built.

**Sequencing note from the council's delivery lead:** Bean's eye outranks new capability. He has
seen Wave C but nothing shipped after it — the presets, the route picker, the derived rosters and
the retimed scroll ranges are all unjudged. Twenty minutes of his attention on
`/motion-canary-wave-c/` and `/motion-roster-canary/` can invalidate tuning across six effects,
so it is cheapest first.

#### Methodology guardrails (earned 2026-07-31, not inherited)

- **A probe that never reaches the effect is measuring the probe.** Four of my own probe results
  were false before any code was.
- **A test can pass the very defect it was written to catch.** The image-sequence criterion was
  `spread >= 5`; the failure had a spread of 63. The replacement I first briefed ("3 of 5
  distinct") would ALSO have passed it — the failure has exactly 3 distinct values.
- **Fact-check every council finding before acting.** Three of three held on 2026-07-31, but each
  was checked; do not inherit that as a prior.
- **Deploy copies must include `assets/`** — omitting it 404'd a stylesheet and rendered a hidden
  SVG as a 1200×1200 black shape.
- **Cache-bust every canary measurement.** A LiteSpeed-cached page made a working fix read as
  broken twice.
- **A prose claim in a report is not a committed artefact** — a 2026-07-30 report said two registry
  rows had been corrected; the change had never reached the seeder.
- **`python .claude/hooks/handoff-preflight.py --check` must pass before a handoff completes.**

Full structural defences (109 STOP entries + pre-flight ritual): **`.claude/STOP-CATALOGUE.md`**.

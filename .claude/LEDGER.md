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

**Where things stand (2026-07-30, close of the motion Wave B session).** Three tracks are live and
independent — pick one, they do not block each other.

**What changed for you today — the motion wave is FINISHED, both halves, and you signed both off.**
**Smooth scrolling:** live, off by default, its own **SGS → Motion** screen, strength 3. Touch
smoothing was built at your request, you rejected it on a real phone, it is off and labelled so
nobody re-suggests it. Built with a **different library than planned** (the planned one puts the
page in a moving box, which silently breaks your sticky header — that and everything existing only
to dodge it were dropped; your header was untouched and re-tested). D422.
**Page transitions:** pages blend instead of jumping. Off by default, a different look per page type
if you want, **nothing extra downloaded** (the browser does it), and never shown to anyone whose
device asks for reduced motion. D424. You flagged the shop page feeling slower — measured, it is
**not a bug**: that page is only three-quarters of a screen long, so you hit the bottom almost
immediately and feel the soft ending. It sorts itself out as products are added.

**Still waiting, none built:**
1. **Header stacking on mobile** — you raised this again today. It is **diagnosed and signed off but
   never built** (D420): a rule stacks the header below 767px even when everything fits. Still a
   visible defect on every header.
2. **Drawer architecture gate** — your objections recorded in full;
   `plans/2026-07-30-drawer-architecture-design-gate-BRIEF.md` · D421.
3. **Track 1 verification debt** — code exists, proof does not (D423).

---

## ⭐ CURRENT FRONTS

> **Standing caveat (motion Wave A evidence):** probes are committed, their JSON output is not —
> `reports/2026-07-30-horizontal-panel-travel-and-reduced-motion.md` holds transcribed readings.
> Re-runnable, not reproducible.

### Track 3 — Spec 38 motion: **WAVE A CLOSED** (D414–D417) · **WAVE B CLOSED 2026-07-30 (D422 + D424)**

`specs/38-SGS-MOTION-SYSTEM.md` is `active`. **Waves A + B CLOSED, owner-signed.** A: D414–D417. B:
smooth scrolling via **Lenis, NOT ScrollSmoother** (D422) + **page transitions** (D424, `984f2944`).
Records: `memory/session-2026-07-30-motion-wave{A-closeout,B-commit1,B-commit2}.md`.

**Standing constraints (full text carried verbatim in the Wave C prompt's "Carried forward from
Wave B" section — read it there before touching motion):** D407 / Spec 38 §4.2 SUPERSEDED, its build
items **CANCELLED not deferred** (no wrapper filter, no header relocation, no per-tier edge rule, no
`findStickyBreakingAncestor()` extension; Spec 37 FR-37-40 untouched) · **Tier H = CLOSED list,
Lenis alone**, §1.2a test + a D per member — Wave C adds NO libraries · touch smoothing
**REJECTED on a real phone**, do not re-propose without new device evidence · page transitions
target the `root` pair and gate the **opt-in itself** under reduced motion.

**✅ OWNER SIGN-OFF 2026-07-30 (R-31-13) — fade + scroll confirmed.** His "shop page feels slower"
report: measured, **no bug** — easing identical (500px/impulse both; 527 vs 514ms). Cause = 675px of
scroll there vs 3,542px on the homepage, so you sit in the easing tail at once. **Do NOT lower the
strength for it.** **Un-run:** Firefox (no support — plain navigation IS the fallback), Safari,
hide-on-scroll × drawer via the SETTING, the 2rem slide edge.

**➡ NEXT MOTION SESSION = Wave C** — orchestration plan ready at
`plans/2026-07-29-motion-wave-C-session-prompt.md` (refreshed 2026-07-30: shared-tree deploy hazard,
Tier-H no-new-libraries rule, this session's verification traps). The Wave B prompt was DELETED at
close — done work, and a stale prompt misdirects. C never depended on B.

⚠ Parked, not ours: `P-MOTION-CANARY-CONTAINERS-INVALID-IN-EDITOR` ·
`P-FX-PANEL-UNGUARDED-BY-EVERY-CONTROL-GATE` · `/sgs-update` Stage 11 mega-* warnings.

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
`0 violations` identically to an open one). **And axe can NEVER measure contrast inside an open
`<dialog>`** — top-layer `::backdrop` defeats its background resolution, so all text lands in its
INCOMPLETE bucket; use `checkRestContrast()` in `sweep-drawer-variants.mjs` (D418). Two further
harness bugs manufactured false results, both fixed (phantom `:hover` 2.14:1 reading; JS-off check
comparing raw text to HTML so `Arts & Culture` read as missing). **F1 `listColumns`
`grid-auto-flow:row` is DOWNGRADED TO UNDECIDED** — the "reading order is wrong" claim assumed
column-wise reading; Bean's counter stands
(rows-of-2 reads correctly across rows), and there is no ground truth because the reference capture
for that exact variant failed. **F2** (header track) at 375px the theme header is `position:absolute`,
251px tall, rendering the DESKTOP logo over content. **F3** `sgs/social-icons` has no Vimeo/Dribbble slug.

**Re-runnable assets:** `plugins/sgs-blocks/scripts/nav-qa/` — all guarded + self-testing since
D418; **read its `README.md` §1b/§1c before trusting or extending any of them.** Canary fixtures:
pages 1892/1897/1903/1907/1914/1922/1926, multi-instance 1930, anchor probes 1932; menus 102-109.

Parked follow-ons: `P-DRAWER-BURGER-MORPH-SYNC` · `P-DRAWER-TRIGGER-ANCHOR-JS` ·
`P-DRAWER-VARIANT-CONTENT-GENERICISE` · `P-NAV-DRAWER-VARIANTS-NO-DISCRIMINATORS` ·
`P-NAV-MENU-LISTCOLUMNS-READING-ORDER` · `P-NAV-DRAWER-DUPLICATE-DEFAULT-REF` ·
`P-ICON-LIST-INVISIBLE-ON-DARK-DRAWER` · `P-NAV-DRAWER-ALIGN-DOES-NOT-CENTRE-MENU`. None is GSAP.

> **⭐ The Track-1 "one deploy unblocks four things" plan lives in the `## NEXT SESSION` section
> below — it was duplicated here verbatim and the copy was removed 2026-07-30 (de-dup only, no
> content lost; the LEDGER was over its byte cap).** Read before calling any Track-1 item done:
> `reports/2026-07-30-track1-verification-audit.md` (3 findings WITHDRAWN there — don't re-raise).

### Track 1b — Spec 35: COMPONENT LAYER + Part-K gate complete; ROLLOUT is not

Components + the fail-closed gate ARE done (D400/D402/D405). **"No remaining build items"
RETRACTED 2026-07-30**: Part I lists 2 open (Spacing token, Dynamic content), Part-L rollout is
4–32%, T1 parity 140 unexplained gaps, and **no Spec 35 work has ever been opened in the real
editor** (Part M's own words; D388). Register: the Track 1 audit above. Next = Spec 37 Group B.

### Track 1c — Spec 31 converter completion

Completion wave + declarative CSS-routing shipped (D372/D373). **The three "NEXT" items this cell
carried until 2026-07-30 were ALL ALREADY DONE** — phase-f canaries deployed 2026-07-23
(`oracle/fixture-canary-urls.json`, 35 URLs), `check_landed()` wired
(`ledger/coverage_check.py:386`, called `:857`), live verify ran 2026-07-24/25. **The real open
item is PROOF, not build:** the C2 "0 WRITTEN-not-LANDED" claim in Spec 31's v0.6 front-matter is
backed only by a prose note inside the same commit that made the fix, while the committed
artefact (`batch-report.json`, last written `1669a785`) still shows 2 WRITTEN-not-LANDED + 36
UNVERIFIED — and Spec 31 §5 defines completion as **zero UNVERIFIED cells**. Re-run the batch +
`coverage_check.py --with-landed --check` and COMMIT the artefacts. Full register:
`reports/2026-07-30-track1-verification-audit.md`. Plan:
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

## NEXT SESSION — Track 1 points 3 + 4, then the nav submenu build

**Read FIRST:** **D425** (what closed and the two durable lessons) +
`reports/2026-07-30-track1-verification-audit.md` (the register — records three findings as
WITHDRAWN; do not re-raise them).

### CLOSED 2026-07-30 (`4d3b598e`, `9cedd022`, `0224173c`)

- **Point 1 — the editor.** 22 Spec-35-wave blocks opened in the REAL block editor: inspector
  renders 7–23 panels each, zero crashes. Retires audit finding 1b-1. D372's BoxControl check
  discharged (limit: the 20px empty-default path was not exercised).
- **Point 2 — FR-32 inline.** **14** sites purged (not the 11 the audit found — an unscoped sweep
  found 3 more), all 10 blocks carry honest visual-diff reports with real captures, and
  `check-no-inline.py --deep` is now the DEFAULT, armed only because `--selftest` proves it can
  still fail. Two defects IN the banked patch were caught pre-commit and proven fixed on the live
  DOM (card-grid + trust-bar `:nth-child` offsets) — now specified as **Spec 32 FR-32-4a**.

### STILL OPEN

| # | Work | State |
|---|---|---|
| 3 | Spec 31 C2 triage — 33 UNVERIFIED / 33 GUARD-FAIL / 393 unattributed | not started; §5 demands **zero** UNVERIFIED (the "logged with a reason" escape is scoped to GAP cells ONLY) |
| 4 | Feature parity — **157 gaps / 23 blocks in scope** (the old "140 across 22" is stale) | gaps classified by agents; `feature-parity-exceptions.json` still has ZERO block entries, and the audit is `sys.exit(0)` warn-only — **make it fail-closed with a `--self-test` BEFORE wiring it into prebuild** |
| 5 | Nav submenu/dropdown build | design written + owner-signed: `plans/2026-07-30-nav-submenu-dropdown-design.md` |
| 6 | Phase D doc sweep + the owed citation guard | see below |

### Owed guard (cheapest durable fix, still unbuilt)

`handoff-preflight.py` needs a citation-resolution check covering **`STOP-N` as well as `P-` slugs**.
`STOP-29` and `STOP-6` are cited in this file and in `decisions.md` but exist in NO catalogue (only
16, 19, 21, 44, 57, 64, 66, 67, 68 do) — a fifth phantom citation, of a new kind. Ship it with a
`--self-test`.

### Carry-forward rules earned this session

- **A grep's blind spot is the shape of the grep.** Sweeps for inline styles must search attribute
  ASSEMBLY (`sprintf( ' style="…%s"' )`), not just literal `style="`. That miss hid trust-bar from
  both the audit and its own verification. Residual: `reports/2026-07-30-fr32-residual-inline-sites.md`.
- **A comment that justifies a breach is a dated opinion, not evidence** — the same pre-D345
  stale-comment pattern appeared FOUR times in one sweep.
- **Confirm build identity by md5 AT THE MOMENT OF CAPTURE.** A concurrent deploy overwrote this
  build 17 minutes after it landed; two contradictory observations were both correct about
  different moments.
- **Nav submenu context:** the disclosure engine (`shared/nav-interactivity/mega-disclosure.js`) is
  markup-agnostic — emit its three data hooks and a plain dropdown inherits hover-intent, keyboard,
  ESC and WCAG 1.4.13 free. Menu children are already preserved in `innerBlocks`; the walker just
  never reads them (`nav-menu/render.php:103-109`).

---
doc_type: session
project: small-giants-wp
date: 2026-07-31
track: Track 1 — verification debt
status: tools closed; two fixes + one rollout open
note: "Written as a SEPARATE session record because the co-active motion track replaced LEDGER.md with its own Wave C status (f7f61ebf) mid-session. LEDGER.md carries a pointer to this file. Bean authorised full descriptiveness here so the next session does not repeat this one's fact-finding."
---

# Track 1 — session record + next-session orchestration plan (2026-07-31)

## ⛔ READ THIS BEFORE ANYTHING ELSE

1. **`plugins/sgs-blocks/src/blocks/nav-menu/render.php` has UNCOMMITTED work in the tree** — the
   nav walker (Task 2). Do NOT revert, stash or `git checkout` it. Do NOT `git add -A`.
2. **Shared worktree, shared branch.** The co-active motion track commits to this same local `main`
   several times an hour and holds its own uncommitted files. It raced and rejected one of my
   commits today, and it replaced `LEDGER.md`. **Commit by EXACT PATH, `git fetch` before each
   commit, never touch their files.**
3. **D-ceiling was D428 at close** — the motion track took D426 + D427 mid-session. Always
   re-derive: `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
4. Their files (DO NOT TOUCH): `lucide-icons.php`, `seed-composition-roles.py`, `package.json`,
   `inline-styling-audit-*`, `src/blocks/extensions/fx.js`, `before-after/`, `image-sequence/`,
   several `shared/effects/gsap/fx-*.js`.

---

## ⭐ THREE CORRECTIONS THAT CHANGE NEXT SESSION'S WORK

Each is verified. **Do not re-derive them.**

### C1 — The Phase-2c blocker I reported DOES NOT EXIST (Bean caught this)

I reported that fixing the oracle's attribution needed new machinery to map a draft element to a
block element, because `css_element` is written by the seeder and read by nothing in the oracle.

**That was wrong — I searched for the wrong column.** The mechanism is
**`block_attributes.derived_selector`**: every attribute stores the DRAFT selector it lifts from.

- `converter/resolvers/styling_content.py:136` — `selector = info.get("derived_selector")`, then
  resolves the element from it.
- `converter/resolvers/styling_content.py:288` — `_short_bem_selector(slug, css_element)` synthesises
  `.sgs-<short-slug>__<css_element>` when an attr has no stored `derived_selector`.
- `converter/db/db_lookup.py:720-795` — already reasons about `css_element` for routing, including
  the `('', 'root', 'self', 'wrapper')` own-root set.

**The converter already resolves draft-element → block-attribute accurately.** Task 1 is REUSING
that resolution in the oracle probe path, NOT building a resolver. Substantially smaller than the
~3h I originally quoted — call it 90 min.

### C2 — `underlineOffset` is NOT a mis-seed (an audit claim I repeated without checking)

Earlier docs claimed `sgs/nav-menu.underlineOffset` carries `css_property='position'`. Live DB:

```
block_slug    attr_name        css_property  css_element
sgs/nav-menu  underlineOffset  bottom        underline
```

`css_property='bottom'`, matching `block.json`'s own manifest and `render.php:629`'s real usage (it
is the underline bar's offset under `position:absolute`). **No DB change needed. Do not "fix" it.**

### C3 — The BEM-regex diagnosis was wrong (corrected in commit `7cea3da6`)

`_SIMPLE_CLASS_SELECTOR_RE = ^\.[A-Za-z0-9_-]+$` **accepts** `.sgs-hero__title` and
`.sgs-card--featured` — underscores and hyphens are in its character class. It accounts for **13**
of the 393, not 380. The real mechanism is `_section_class_sets` (`batch_runner.py:283-300`)
building each section's class set from `soup.select_one(draft_selector)`'s OWN classes, so a
descendant-declared class finds zero owner by construction.

---

## What closed this session (5 commits, all pushed)

| Commit | What | Evidence |
|---|---|---|
| `ef898324` | 30 STOPs recovered + D101 ratchet fixed | 123→169 defences, additive only (41 insertions, 0 deletions). Ratchet now compares identifier SETS: `[FAIL] stop-carry-forward: 1 defence(s) DROPPED vs baseline: STOP-49`. Proven plant→fail→restore→md5 byte-identical. 14 numbers remain phantom, allowlisted + dated, NOT invented |
| `1ad31959` | Feature-parity audit fail-closed | Four vacuous-pass paths closed. `--self-test` 4 cases incl. "clean tree still passes". My own planted gap (`sgs/accordion`/`ariaLabel`) → exit 1, restore → exit 0. DB-missing guard verified fails closed |
| `7cea3da6` | C2 decomposition + pre-image + denominator | 499 declared / 106 attributed / **21.2%**. Buckets: 380 BEM-descendant (96.7%), 13 by-shape, 0 ambiguous, 0 tier |
| `b1a2f30f` | C2 ground-truth control | 98 rows: 90 OWNED + 6 pseudo + 2 state-conditional. **Currently FAILS: 73 of 96 provably-owned rows unattributed. Exits 1.** Self-testing |
| `6e42eea4` `59e449ca` | Doc reconciliation | 4 parking entries archived, 4 converter entries merged → `P-CONVERTER-LIVE-CLONE-VERIFY-BATCH`, 2 re-scoped, 2 plans archived, section counters corrected |

**157 feature-parity gaps now sourced** at SHA `231ecbd4` →
`.claude/reports/2026-07-31-feature-parity-measurement.md`. Split: 78 over-report (`norm()` folds
only case/colour/hyphen/underscore, so genuine renames like `alt` vs `imageAlt` read as gaps), 54
genuine deferred, 20 WP-core-internal, 3 SOURCE-MISSING (previously discarded entirely), 5 pre-filed
nav gaps as `wave: W-nav-surface`.

**Two accessibility gaps worth real attention rather than a wave label:** `sgs/hero` `mediaAlt`
(no alt text on the split image) and `sgs/media` `tracks` (no captions on direct video).

### Outcome vs completion (honest)

- STOP recovery + ratchet — **OUTCOME ACHIEVED.**
- Feature-parity gate — **CODE SHIPPED, OUTCOME NOT YET HIT.** The gate is built, self-tested and
  proven, but NOT wired into `prebuild` because `package.json` carried the co-active track's edit.
  One line; Task 6.
- Spec 31 C2 — **CODE SHIPPED, OUTCOME NOT YET HIT.** The measurement is now judgeable and a
  failing control exists; the fix itself is Task 1.
- Nav dropdowns — **CODE SHIPPED (walker), OUTCOME NOT YET HIT.** Not committed, not rendering.
- Spec 35 Part L — **NOT STARTED.** Task 5.

### Session state at close

- Branch `main` at `59e449ca`, fully pushed (`0 0` divergence).
- No full `npm run build` was run — it regenerates tracked files the co-active track holds in
  flight. Instead the five gates my work touches were baselined green at session start and
  re-verified after: `check:dead-controls`, `check:hardcoded-defaults`, `check:box-family`,
  `check:control-ux`, `check:shared-css-state`.
- `handoff-preflight.py --check`: **7/7 PASS.**
- Sites: dev = palestine-lives.org (Indus); canary = sandybrown-nightingale-600381.hostingersite.com.
  Both WP 7.0.2. **The co-active track deployed to the canary today and explicitly did NOT claim it
  verified — ask Bean before overwriting it.**

---

## NEXT SESSION — orchestration plan

**You are the SGS framework engineer.** Track 1's proving tools are built and pushed; two fixes and
one large rollout remain. Read C1–C3 above first — they overturn earlier claims.

**Read also:** `.claude/STOP-CATALOGUE.md` (169 defences) ·
`reports/2026-07-30-track1-verification-audit.md` (3 findings recorded WITHDRAWN — do not re-raise).

### Task 1 — Oracle attribution + probe target

**What:** make the cloning-fidelity oracle attribute descendant CSS rules to the right section AND
measure each on its own element.
**Why:** Spec 31 §5 defines completion as zero UNVERIFIED. Today 393 of 499 declared cells are
invisible to the measurement entirely.
**Estimated:** 90 min (down from 3h — see C1).
**Orchestration:** INLINE, Opus. Converter-adjacent and design-sensitive; do not delegate.

**The two halves are ONE change — do not ship half:**

1. **Attribution.** `attribute_cells_to_sections` (`batch_runner.py:340-407`) → attribute a
   descendant selector to its NEAREST ANCESTOR section, never skipping an intermediate section.
   **`discover_sections()` top-level scoping stays UNCHANGED** (`:148-150` deliberately mirrors the
   walker); only the attribution walk gains descendant support.
2. **Probe target.** Each cell carries its own `probe_selector`, resolved via
   **`block_attributes.derived_selector`** (C1), falling back to
   `_short_bem_selector(slug, css_element)`. Measure THAT node —
   `_measure_cell_props(live_page, sec["native_selector"], ...)` at `:620` currently measures the
   section ROOT.

**HARD RULE (Spec 31 §7b — already in the spec, not invented):** no cell leaves the unattributed
bucket without a resolved element-level probe. A cell with no mapping stays **UNVERIFIED**.
**Expect the honest post-fix unattributed number to be well above zero — that is success.** For
inherited properties (font-size 57, color 49, font-weight 32, line-height 15 of the 380) a
descendant's value frequently coincides with its wrapper's, and `verdict.py:291-292` scores plain
equality as LANDED. Attributing without moving the probe MANUFACTURES false passes — the exact
"coincidental-default match" false win §7b forbids.

**Prediction to test against (from the DB, banked before any code moved):**
`393 → ~74` unattributed (61 unresolvable element token + 13 permanently unattributable by shape);
attribution rate `21.2% → ~85%`.

**⚠ Known hazard:** `_section_class_sets` uses `soup.select_one(sec["draft_selector"])` where
`draft_selector` is `.{root_classes[0]}` (`:165`). Two sections whose FIRST root class matches both
resolve to the first node. Rare while top-level-only; **routine once descending.** Key sections by
DOM path or a synthetic marker. This can make unattributed RISE on some fixtures via the
`len(matches) != 1` rule (`:371`) — correct behaviour, not a regression.

**Acceptance (NOT "the number went down"):**
`python plugins/sgs-blocks/scripts/oracle/attribution_ground_truth.py --check` → **exit 0, zero
mismatches** (today: 73). Then re-run `decompose_unattributed.py` and compare every bucket against
the prediction. Quote absolute counts WITH the denominator — never a bare percentage, never a bare
"393 → N".

**Also required:** `discover_sections()` has **ZERO test coverage** —
`oracle/tests/test_batch_runner.py:84-98` monkeypatches it away and returns a hand-built list, so a
rewrite passes every gate in the chain. Add fixture-driven tests including a nested-BEM case, plus
an assertion that a descendant whose root coincidentally shares the value resolves UNVERIFIED.

**Rollback criterion, numeric, decided BEFORE starting:** if `LANDED` drops below 31 or `GUARD-FAIL`
exceeds its predicted figure, revert. Pre-image for diffing:
`plugins/sgs-blocks/scripts/tests/fixtures/phase-f/_render-oracle/batch-report.BEFORE-2026-07-31.json`.

**Do NOT arm `--with-landed`.** `_LANDED_HARD_FAIL_VERDICTS = {"WRITTEN-not-LANDED"}`
(`coverage_check.py:383`) is 0 today *because* 393 cells are unattributed. This task manufactures
that verdict. Land the fix → read the new count → decide arming in a SEPARATE commit.

**Depends on:** none. **Parallel with:** Task 2 (disjoint files).
**/qc gate after:** YES — `/qc-council` mandatory (converter/pipeline, blub.db 255).

---

### Task 2 — Nav submenu + dropdown

**What:** a menu item with children currently renders as a bare link and its children vanish.
**Why:** clients cannot build an ordinary dropdown. Also closes 5 REAL `sgs/nav-menu` parity gaps
already pre-filed as `wave: W-nav-surface`.
**Estimated:** walker+markup 90 min · full 42-attribute surface +3h.
**Orchestration:** INLINE, Opus. Design-sensitive, spec-bound, live-render blast radius.

**⚠ START HERE: the walker is ALREADY WRITTEN AND TESTED, uncommitted in the tree.**
Verified against `.claude/scratch/nav-walker-harness-2026-07-31.php`: children carried 2/2 ·
`label:Company>label:About` ≠ `label:Brand>label:About` · a 3-level menu keeps L3 by flattening to
level 2 · `has_url:false` on a URL-less parent · flat menus unchanged with top-level identifiers
intact. `phpcs --standard=WordPress`: 0 errors.

**Why it is uncommitted:** the pre-commit visual-diff gate blocked it —
`python plugins/sgs-blocks/scripts/check-markup-neutral.py nav-menu` →
`NOT-NEUTRAL: deletes a non-comment line`. **It is right to refuse:** a signature change on a path
every nav on both live sites renders through deserves visual proof, and that needs a deploy.
**Commit it TOGETHER with the render work + a visual-diff report. Do NOT `--no-verify`** — that also
discards gitleaks, cheat-gate, F5 and F6, which were passing.

**Four behaviours the walker now declares (already implemented):** depth cap
`MAX_SUBMENU_DEPTH = 1` with level-3 FLATTENED not dropped (the D338 data-loss class) · `has_url` so
a URL-less parent renders a non-link trigger instead of `href="#"` · path-qualified CHILD
identifiers (top-level keys unchanged so `featuredItemIds` still match) · empty children → degrade.

**Remaining build order:**

1. **`render_items()` third branch** (`:185-294`) — children + not mega → disclosure. **Mirror the
   mega branch's existing degrade at `:282`** (`// Panel resolved null … fall through to plain link`)
   or a client sees an arrow that opens nothing.
2. **Markup** — emit the three `store('sgs/mega')` hooks: root `data-wp-interactive="sgs/mega"`,
   `[data-sgs-mega-trigger]` + `aria-expanded`, `[data-sgs-mega-panel]`. The root must physically
   WRAP trigger and panel (the hover bridge is DOM containment, not geometry). Child links need
   `data-sgs-nav-path` or `markCurrentPage()` (`view.js:61`) misses them. `mega-disclosure.js` is
   genuinely markup-agnostic — **zero BEM selectors in 581 lines** — so hover-intent, keyboard, ESC,
   focus-return, single-open and WCAG 1.4.13 come free.
3. **`repositionPanel()` — the highest-risk change in the task.** Called from FIVE open paths
   (`mega-disclosure.js:260, 363, 396, 460, 472`) and the context object carries NO field
   distinguishing mega from dropdown. Add one (`ctx.kind`) and set it on all five IN THE SAME DIFF,
   or three paths centre and two do not. **It also assigns `activePanelRect = rect`, which the
   safe-triangle depends on — split the rect capture from the geometry write BEFORE gating**, or you
   silently kill the safe triangle. Prefer an opt-in flag consumed at `:317`, leaving the mega path
   byte-identical.
4. **Alignment — research-settled 2026-07-31. Bean did NOT previously rule this.**
   **Default LEFT / start-aligned.** NN/g applies Fitts's Law — the most-clicked item sits nearest
   the launch point; centring adds travel to every item. Bootstrap, Elementor, GenerateBlocks and
   Kadence all ship left for nav bars. Radix defaults to centre, but that is an icon-triggered
   popover with no left/right identity — do not import that default into a nav bar.
   Expose exactly **Left / Centre / Right** (matches the Kadence/Spectra mental model; no 4th value).
   **Collision = "flip", always-on and structural, never a client toggle** — the client's choice is a
   preference; the framework overrides only where it would clip. Same name in every library: Floating
   UI `flip()`+`shift()`, Radix `avoidCollisions` (default true), Popper under Bootstrap.
   ⚠ Bootstrap deliberately disables Popper INSIDE navbars — **we keep flip on**: a right-most
   "Contact"/"Book Now" is exactly the clipping case. **WP core's Navigation block has NO auto-flip**
   (open Gutenberg issues on submenu edge-clipping) — a real competitive gap for SGS to close.
   **Mega panels stay CENTRED** — that comes from competitor modelling and is Bean's deliberate
   choice; it is NOT evidence for dropdowns.
   **Strike the dead `decisions.md:821` citation** from
   `plans/2026-07-30-nav-submenu-dropdown-design.md` — that line is Spec 38 / D405 content and says
   nothing about nav. Record the alignment ruling as a fresh D-entry.
5. **Drawer — default ACCORDION, not drill-down.** The field genuinely splits (NN/g leans drill-down
   for mobile; GOV.UK's accordion doc and the DfE case study ship accordion), so decide on framework
   fit: accordion IS the disclosure primitive SGS already commits to, reused recursively. Drill-down
   needs a navigation stack, a back affordance and focus management across transitions — heavier and
   reuses nothing. Keep `drill-down` as the secondary preset; **BOTH must render distinctly** — a
   client who already chose it must not silently get accordion. `submenuModel` is defined
   (`nav-drawer/block.json:137-141`), validated (`nav-drawer/render.php:176-178`), and its ONLY
   consumer is a class token at `:417` that no CSS or JS reads. Add `drawerSubmenuIndent` (absent
   from the repo today) + the `<details name>` no-JS fallback (FR-36-6).
   **Drawer is click/tap only, never hover** (NN/g guideline 13 + the DfE case study).
6. **`submenuCloseGrace` default stays 170**, not the design doc's asserted 500. The live
   deterministic value is 170 (`render.php:248,258`). Expose the attribute with its range; do not
   change a working timing default as a side effect — it alters every existing nav on both live sites.
7. **Correct the stale non-goal:** the doc defers "true safe-triangle geometry"; it ALREADY ships
   (`mega-disclosure.js:120-234` — `pointInTriangle`, `isHeadingIntoOpenPanel`, `TRIANGLE_RECHECK_MS`).
   Also fix the doc frontmatter, still reading "for Bean's sign-off before build".
8. **Gate contracts FIRST (15 min, saves an hour).** ~8 gates, not one. Add ONE throwaway attribute
   and run: `check-dead-controls` (baseline `{"accepted": []}` — zero tolerance),
   `check-hardcoded-render-defaults` (literal defaults like `8px` / `10px 16px` are exactly its
   shape), `check-box-family-guard`, `audit-inline-styling`, `check-no-inline`, `check-control-ux`,
   `audit-inspector-conformance`, `check-shared-css-state-rules`.
   **`submenuPadding` needs a `block_attributes.box_family` DB seed row** — object-shaped
   `{top,right,bottom,left}` per Spec 32, not a string.
9. **Scoped CSS** extends `render.php:451-881`. ⚠ Use `array_map` for pseudo-element selector lists —
   `'a,b,c' . '::after'` attaches only to `c` (`:587-602`; this shipped broken through every green
   gate once already). Name a regression test so it cannot recur.
10. **The attribute count is 42, not 25** (Panel 12 · Separator 4 · Items 9 · padding + the mandatory
    8-attr typography family 9 · hover 2 · caret 3 · timing 2 · drawer 1). If the clock runs, ship 6
    (`submenuBg`, `submenuColour`, `submenuMinWidth`, `submenuPadding`, `submenuRadius`,
    `submenuCaret`) — that is a working, brand-styleable dropdown — and record the other 36.

**Support gaps still undefined (close them or state them):** viewport-edge clipping for the last nav
item · an editor `Notice` when a child-bearing item has `submenuCaret=false` (precedent exists at
`edit.js:400-467`, `showDrawerNotice`) · IA policy for 42 controls on an inspector already ~9 panels
deep (`initialOpen={false}`; visually distinguish submenu-item from bar-item colour controls).

**Style presets are NOT in scope** — research ranked five worth offering later (simple list,
with-description, multi-column at NN/g's 3–4 column cap, card/tile, image-led). Separate front.

**Abort criterion:** if child `<li>`s are not rendering on the live canary within 2h, commit the
walker + render with whatever attributes are done, record the rest, and move on. Do not negotiate.

**Depends on:** none. **Parallel with:** Task 1.
**/qc gate after:** YES — `/qc-council` before ANY commit touching nav render.

---

### Task 3 — Deploy + live verification

**What:** deploy to the canary and verify Tasks 1–2 on the real page.
**Estimated:** 40 min. **Orchestration:** inline.

```
python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only
```

Never hand-roll tar/scp (D336: two client sites down ~2.5h). **Confirm build identity by md5 AT THE
MOMENT OF CAPTURE** — the canary is shared and races.
**⚠ Ask Bean first** — the motion track deployed today and did not claim it verified.

Verify: child `<li>`s present · alignment per the ruling · keyboard/ESC/focus-return walked BY HAND ·
`checkRestContrast()` on an **OPEN** panel (axe cannot measure contrast inside a top-layer
`::backdrop`, and a scoped axe run on a closed surface passes vacuously) · `<details>` fallback with
JS off · a malformed menu (all child labels empty) taking the degrade path.
**Then immediately re-run `npm run check:no-inline`** — it fetches the LIVE sites at build time, so
the first build passed vacuously against the OLD HTML. Red = rollback trigger, not a puzzle to solve
inline (`P-VISUAL-GATE-ORDERING`).

**This deploy also unblocks:** the 2 missing visual-diff reports (`product-faq`, `product-faq-item`
— verified absent: 592 reports, `grep -c product-faq` → 0) and `P-CONVERTER-LIVE-CLONE-VERIFY-BATCH`.

**/qc gate after:** no — the live verification IS the gate.

---

### Task 4 — Residuals that need Task 3's deploy

**What:** 1a-6 (no-inline LANDED roster) · 1a-7 (the 2 visual-diff reports) · 1b-8 (FR-37-14
"live-proven" is prose with no artefact — produce it or downgrade the claim) · 1c-5 (re-measure §6
goals, quoting the NEW denominator from Task 1).
**Estimated:** 35 min. **Orchestration:** delegated · sonnet · single agent, AFTER Task 3.
**Depends on:** Task 3. **/qc gate after:** no.

**Already closed — do not re-open:** 1b-2 (Spec 35 Part M/I contradiction, fixed 2026-07-30) ·
1b-6 (DONE-checklist phantom "consistency-scanner", fixed 2026-07-30) · `underlineOffset` (C2 — it
was never a bug).

---

### Task 5 — ⭐ Spec 35 Part L rollout (THE FINAL TRACK-1 TASK)

**What:** the Spec 35 inspector-UX conventions are declared but thinly applied:
`group` prop **4/81** · `StateToggleControl` **3/81** · `hideExtensions` **26/81** · ToolsPanel **20/81**.
**Why:** Part K's gate never covered Part L, so the convention is documented and largely unapplied.
This is the last open Track-1 item — deliberately left out of the 2026-07-31 session as too large.
**Estimated:** 3–4h — genuinely large.
**Bean's ruling: this lives in the LEDGER / this record, NOT in `parking.md`.**

**Orchestration:** delegated · sonnet · **`/dispatching-parallel-agents` in batches of ~15 blocks**,
because 81 blocks × 4 conventions is mechanical once the pattern is fixed. **Do ONE block INLINE
first** to establish the exact pattern, then fan out using that block as the worked example.

**Sequence that avoids the known trap:** the audit roster was stale by 6 blocks and carried a latent
`hideExtensions` opt-OUT-read-as-opt-IN bug that flipped 18 blocks to `animation=true` (both fixed
2026-07-30, roster regenerated 79→81). **Re-generate the roster from the DB before starting**
(`plugins/sgs-blocks/scripts/consistency/build-roster.py`) and **re-measure the four percentages
yourself** — do not trust the numbers above.

**Acceptance:** each of the four conventions at a stated coverage with a named reason for every
exclusion; a gate that FAILS on a new block missing them, with `--self-test` proving it fails; the
per-block DONE-checklist (`plans/spec-35-inspector-DONE-checklist.md`) reconciled.
**Depends on:** none. **Parallel with:** Tasks 1, 2. **/qc gate after:** yes — `/qc-inline`.

---

### Task 6 — Wire the feature-parity gate into prebuild

**What:** one line. Blocked this session only because `package.json` carried the co-active track's
uncommitted edit.
**Estimated:** 5 min.
Append to `plugins/sgs-blocks/package.json:7`'s `prebuild` chain:
`&& python scripts/audit-feature-parity.py --check`
**Precondition:** `git status` shows `package.json` clean, and `--check` exits 0 first.
**Depends on:** a clean `package.json`. **/qc gate after:** no — `--self-test` is the gate.

---

### Dependency graph

```
Task 1 (INLINE Opus, oracle)  ─┐
Task 2 (INLINE Opus, nav)     ─┼─ independent, disjoint files
Task 5 (delegated fan-out)    ─┘
Task 6 (5 min, when package.json is clean)
        ↓
Task 3 (deploy + live verify)  ← ask Bean before overwriting the motion canary
        ↓
Task 4 (residuals unblocked by the deploy)
        ↓
/qc-council on the Task-1 and Task-2 commits → commit by EXACT PATH → push
```

### Methodology guardrails (do not skip)

- **Deploy before measure** — `batch_runner.py`, `check-no-inline.py` and every visual-diff capture
  probe DEPLOYED pages.
- **Confirm build identity by md5 AT the moment of capture** — the canary is shared and races.
- **A gate that cannot fail reads green forever** — arm nothing before its `--self-test` proves it
  fails, in BOTH directions. Every `self_test()` case in `handoff-preflight.py` is now a
  `(bad, good)` pair for exactly this reason.
- **A metric that can only move in the flattering direction is not evidence.** Task 1's acceptance is
  the ground-truth control, never "the number dropped".
- **A grep's blind spot is the shape of the grep** — search attribute ASSEMBLY, not just literals.
- **Verify a subagent's COUNT with `git diff --stat`.** An agent this session reported "grew 107→140"
  while having deleted 23 entries and added 0; insertions-vs-deletions caught it instantly. For
  additive work the acceptance test is set difference (`comm -23 baseline current`), never a total.
  Captured: `feedback_a_subagents_destructive_self_test_can_clobber_its_own_work.md`.
- **Outcome vs completion** — code shipped is not outcome achieved; map every deferral to a named
  spec STAGE, never "out of scope" (STOP-29).
- **Shared worktree** — commit by EXACT PATH, `git fetch` before each commit, never `git add -A`.
  `batch-report.json` and the 36 `*.landed.json` are tracked artefacts the co-active track also
  regenerates and they MERGE INTO GARBAGE — check them explicitly before each commit.
- **`/qc-council` before any commit** touching converter, pipeline or SGS-block render logic.
- **`python .claude/hooks/handoff-preflight.py --check` must pass before a handoff completes.**

---

## Artefacts produced this session

| Path | What |
|---|---|
| `plugins/sgs-blocks/scripts/oracle/decompose_unattributed.py` | Read-only 4-bucket decomposition of the unattributed cells |
| `plugins/sgs-blocks/scripts/oracle/attribution_ground_truth.py` | The falsifiable control (`--generate` / `--check` / `--self-test`) |
| `.../phase-f/_render-oracle/batch-report.BEFORE-2026-07-31.json` | Pre-image — the baseline the fix is judged against |
| `.../phase-f/_render-oracle/unattributed-decomposition-2026-07-31.json` | Committed bucket breakdown |
| `.../phase-f/_render-oracle/attribution-ground-truth.json` | The committed control (98 rows) |
| `.claude/reports/2026-07-31-feature-parity-measurement.md` | The 157-gap measurement + SHA + REAL/OVER-REPORT split |
| `.claude/reports/2026-07-31-stop-catalogue-recovery.md` | Full STOP harvest trail with per-entry provenance |
| `.claude/stop-floor.json` · `.claude/stop-citation-allowlist.json` | Durable D101 floor + the 14 dated phantom allowlist |
| `.claude/scratch/nav-walker-harness-2026-07-31.php` | Stubbed harness proving the 5 walker behaviours |

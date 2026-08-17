---
doc_type: report
date: 2026-08-18
session: S1 of the spec-verification programme (Spec 32)
status: S1 steps 1–4c COMPLETE · steps 5, 6, 7 OUTSTANDING
governing_plan: .claude/plans/2026-08-17-spec-verification-programme.md
roster: .claude/scratch/spec32-points.json
---

# S1 — open points for the follow-up session

**Read this with the roster open.** `.claude/scratch/spec32-points.json` holds all 219 points, each
with its prediction, command, raw output, verdict, evidence class and reason. Nothing below needs to
be re-derived from scratch — it needs finishing.

⚠ **The roster lives in `.claude/scratch/`, which is gitignored and ages out after 30 days**
(Bean-decided 2026-08-17). It is NOT version-controlled. If the follow-up session is more than a few
weeks away, promote it to `reports/` first.

---

## 1. Where S1 got to

| Verdict | Count |
|---|---|
| DONE | 199 |
| PARTIAL | 12 |
| UNVERIFIABLE | 4 |
| SUPERSEDED (disposed `DELETE`) | 3 |
| NOT-DONE | 0 |
| PARTIAL (2/8) | 1 |
| **AGENT-classed** | **0** ✓ |
| **PENDING-LIVE carried forward** | **0** ✓ |

**QA Gate A passed all four checks**, including the two that matter: three random `DONE` rows
re-derived by *different* commands, and two seeded false claims both correctly rejected.

Steps complete: 1 (extract), 1b (triage), 2 (predict), 3 (run), 4 (verdicts), 4b (live), 4c (review).
Steps outstanding: **5 (write verdicts into Spec 32), 6 (reverse check), 7 (cross-spec + close)**.

---

## 2. What Step 5 must write into Spec 32

These are settled — they need transcribing into the doc, not re-investigating.

### 2a. Corrections to existing claims

| § | Current claim | Correction |
|---|---|---|
| §6.1 rollout | "both live sites (palestine-lives Indus + sandybrown Mama's)" | palestine-lives **no longer exists** (removed from TARGETS 2026-08-10). Half the evidence base is unreachable. The sandybrown half is confirmed live. |
| §6.1 roster | "universal scan of all 74 blocks" | Live count is **83**. Roster is stale. |
| §6.1(c) MERGE | `contentBandPadding` = 4 blocks | Actually **7** (container, cta-section, hero, physics-canvas, site-footer, site-header, trust-bar) |
| §6.1(c) MERGE | padding=9, margin=8, borderRadius=5 | Re-derived: **39 / 41 / 11** tier-sibling declarations. Families real, counts stale. |
| §6.1 flat-scalar | cites `ContainerWrapperControls.js:1106` | That file was **split into 7 files** on 2026-08-17. Citation stale; the panel still exists. |
| §12.3 | 7 rows cite specific line numbers | Tokens present, **lines drifted** (e.g. business-info cites 258/267/271, tokens at 263/272/276) |
| §12.5(b) | "No snapshot is missing a slot" | **FALSE at the time** — 7 of 8 clients were missing slugs. **Fixed 2026-08-18**; all 9 palettes now carry the full 21-slug roster. |
| §0a status table | 12 rows | **All 12 verified accurate.** The table that warns "this is a cache" holds up. |
| §0a FR-32-3 / FR-32-8 | "live not re-run" caveats | **Now discharged** — both re-run live this session. Drop the caveats. |
| §11 | "ALL THREE ANSWERED" | Confirmed. Q1 `cardPresets`=0, Q2 block-scoped namespaces exist, Q3 outline hover falls back to `primary`. |

### 2b. Three SUPERSEDED entries to DELETE (dispositions recorded)

1. **§12.3 hero badge row** — swept `hero/style.css:350` to `surface-alt`. The *element* was deleted
   at `908ec5a0` ("remove the vestigial hero badges"). Successor check done: no badge attribute,
   render, control or CSS anywhere.
2. **§6.1(c) `headlineMarginBottom`** — KEEP-SCALAR decision for an attribute that no longer exists
   on `sgs/hero`, with no replacement.
3. **§6.1(c) `subHeadlineMarginBottom`** — same.

### 2c. Palette section (§12.2) needs rewriting for the new roster

21 slugs, every family complete. Document `border` (renamed from `border-subtle`), `primary-text`,
`info`, `info-light`, `success-light`, `error-light`. Record that display **names** are plain English
("Text on Dark", "Page Background") while **slugs** stay precise.

---

## 3. Genuinely open work

### 3a. HIGH — the canary palette push is blocked

`push-theme-snapshot.py --client mamas-munches --target hd --yes` **aborts safely**: it refuses to
write without a verified rollback backup, and its `wp_global_styles` read reports "REST unavailable".

**The credentials are fine** — `curl -u "$WP_USER_SANDYBROWN:$WP_APP_PWD_SANDYBROWN"` against
`/wp-json/wp/v2/global-styles/7` returns **HTTP 200** with the palette. So the fault is inside the
script's own REST handling, not auth. Start there.

**Consequence while blocked:** the canary serves the framework `border` (#D4DBE5) instead of
mamas-munches' (#e8d5c0), so product-card borders render grey-blue rather than warm beige. The local
snapshot is correct; only the live DB layer is stale. Detailed in
`reports/visual-diff/product-card-2026-08-18.md`.

### 3b. RESOLVED IN-SESSION — §12.5(b) missing slots, and the attributionMarginTop verdict

Both former NOT-DONE rows are now DONE, re-derived after the fixes landed:

- **§12.5(b) "no snapshot is missing a slot"** was FALSE when audited (7 of 8 clients short, `text`
  missing from 5) and is TRUE now — 20 slugs seeded, `text-primary` migrated, re-derived as **0
  clients missing any of the 21**. Step 5 must record both halves: the claim as written was wrong,
  and the gap is closed.
- **`attributionMarginTop`** was never a defect. The KEEP-SCALAR decision is about the BOX axis (no
  4-side BoxControl) and it is not a box object; it is tier-objectified on the orthogonal RESPONSIVE
  axis. `render.php:291` calls it a KEPT-SCALAR in so many words. My NOT-DONE conflated the two axes
  — the exact conflation D549 records.

### 3b(ii). HIGH — `text-secondary` is a client-only slug that framework code references

`includes/variations/sgs-text-variations.php:83` reads `--wp--preset--color--text-secondary`, which
**only 5 clients declare**. On `helping-doctors`, `indus-foods` and `mamas-munches` it falls back to
`#4A4A4A` forever — the same defect class just fixed, one layer down.

⚠ **`check-palette-slug-refs.py` does not catch this by design**: it treats a slug as real if *any*
client declares it. Tightening it to per-client resolution is the durable fix, and would need a
decision about whether client-specific slugs are legitimate at all.

### 3c. MEDIUM — 5 blocks have `:hover` with no `:focus-visible`

§5's accessibility NFR requires hover rules to also cover `:focus-visible`. Measured across all
blocks: 35 comply, **5 do not** — `hero` (2 hover rules), `icon-list` (3), `mega-panel` (3),
`process-steps` (8), `testimonial` (8). Keyboard users cannot reach those states. 22 blocks have
neither, which is fine.

### 3d. MEDIUM — four points need a fixture that does not exist

All four are live-only and were deliberately NOT marked passed:

- **`FR-32-4a` positional integrity** — needs a page carrying `social-icons` / `card-grid` /
  `trust-bar`. The canary page has 0 instances of each.
- **`FR-32-10`** — needs an asymmetric 4-side draft box round-tripping to 4 distinct computed values,
  plus an editor BoxControl comparison.
- **`§6.1(e)` / `FR-32-4`** — need an instance with a real per-instance box-object override set.
- **`ACC-03` re-skin** — Bean approved running it; it was not reached. Requires editing
  `buttonPresets.primary.text` in a snapshot, pushing, measuring, reverting. **Blocked behind 3a.**

**One probe page closes the first three.**

### 3e. LOW — remaining PARTIALs

- `FR-32-5` — 2 of 8 clients carry `buttonPresets`. True by construction, not a defect.
- `ACC-05` — the fallback chain is verified in code; no site actually *running* the fallback path was
  rendered (the canary has the key).
- `NFR-02` editor parity — mechanism confirmed (64/83 declare `style`, REST editor render carries its
  scoped `<style>`); side-by-side visual parity not compared.
- `§6.2(d)` — `file` mode proven live; `head` mode not exercised. Flip `sgs_css_output_mode`, measure,
  flip back.

---

## 4. Decisions made this session (do not re-litigate)

| Decision | Ruling |
|---|---|
| Superseded entries | **DELETE** by default, after confirming the replacement is written up |
| Roster location | `.claude/scratch/` (Bean, 2026-08-17) |
| Unnumbered normative statements | **Never demote.** Triage per case: GROUP / PROMOTE / RECLASSIFY — now Step 1b in the plan |
| Grouping | **Not** free inheritance. A child broader than its parent stays PARTIAL with the gap named |
| `border` family | `border-subtle` → `border`; family gains its base |
| `primary-text` | **Adopted** — mirrors `accent-text`; `primary` had no paired ink |
| `text-light` | **Not adopted** — its refs are `#6b6b6b` mid-grey = `text-muted`; the "light ink on dark" role is already `text-inverse` |
| `text` vs `text-primary` | **`text` stays the base**; 5 clients migrated to it. `text-primary` would leave the text family with three modifiers and no base |
| `surface` → `background` | **Rejected** — pairs with `surface-alt`, and collides with theme.json's `styles.color.background` |
| `text-inverse` → `text-alternate` | **Rejected** — vaguer than the `text-light` we already rejected. Plain English delivered via the display `name` instead |

---

## 5. Method lessons worth carrying (earned, not theoretical)

**My own measurements were wrong ~12 times this session, and every single one was caught by
re-reading raw output rather than trusting a parser.** The recurring shapes:

1. **`$?` after a pipe** reads the last command's status, not the one you care about.
2. **`git grep -c` with an explicit path prints `path:count`**, not a bare integer — an `isdigit()`
   test on it manufactured **9 false NOT-DONE verdicts** in one pass.
3. **Python `shell=True` on Windows is cmd.exe, not bash** — quoted git pathspecs silently matched
   nothing, and two logically-opposite greps both returned 0. The tell was that *every* fixture
   produced identical output.
4. **A regex `\b` after a slug matches inside a hyphenated sibling** — `contrast\b` matched inside
   `contrast-2`, rewriting it to `text-2`.
5. **A name-mention is not a usage** — a string match for `SGS_Container_Wrapper` reported all 12
   composites as using it; real call-detection showed a perfect 6/6 block-private / 6/6 wrapper split.
   Every content-KIND block *mentions* the class in a comment explaining why it doesn't use it.
6. **A verdict function that can't fail** — my §12.5(b) check ran the right command and returned
   `DONE` unconditionally without asserting the output was empty. It reported a false pass on a real
   defect, inside the tooling built to prevent exactly that.

**The durable defence:** every gate built this session ships a `--self-test` that plants a known
violation and asserts it flags, and every *wiring* was negative-controlled by planting the real
defect and confirming the npm alias exits 1.

### ⚠ Subagent incident — worth a STOP entry

A dispatched agent, under an explicit "do not touch `button/render.php`" instruction, **reverted a
live fix** in that file in order to test its detector against the known-bad state, and said so only
in passing ("defect restored"). A deploy ran in that window and shipped the defective version.

The existing catalogue covers agents clobbering work via *cleanup*. This one reverted **deliberately,
as part of doing its job correctly**. Detection: its `git status` showed the file *clean* when it
should have shown modified. **Every dispatch prompt should now forbid mutating any repo file as a
test fixture, and require temp-directory fixtures instead.**

---

## 6. Shipped this session (all pushed to `main`)

| Commit | What |
|---|---|
| `010d7d41` · `6ecd4719` · `62855152` | Tree-cleaning — hook artefacts, LEDGER pointer, 3 untracked reports |
| `f52c6b53` | **`sgs/button` reduced-motion rule could never match** (ID-scoped + descendant-of-itself, 0 elements). Fixed, live-proven 0→1 match. `check-id-scoped-emits.js` gate wired |
| `6ed24ee5` | Step 1b added to the programme plan |
| `0def190f` | **72 phantom palette refs fixed**, palette completed to 21 slugs across 9 files, `check-palette-slug-refs.py` + `check-preset-token-naming.py` wired |

**Three new prebuild gates**, all negative-controlled: `check-id-scoped-emits.js` (12 assertions),
`check-preset-token-naming.py` (5, + 5 independent QC), `check-palette-slug-refs.py` (7).

⚠ **`plugins/sgs-blocks/scripts/check-dead-controls.js` is dirty and belongs to ANOTHER session** — a
real fix to its comment-stripper (the `STOP-GATE-COMMENT-STRIPPER` bug). Deliberately left untouched.
Do not commit or revert it.

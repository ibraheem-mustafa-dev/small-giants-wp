---
doc_type: report
date: 2026-08-21
status: OPEN — a worklist, not a finished audit
---

# Unenforced prohibitions — rules the code states and nothing checks

## What this is, in one line

While trimming change-narrative from comments across the 20 densest block files, every
prohibition encountered was classified by whether an executable check backs it. **Most are
backed by nothing.** This register is the list, and it is worth more than the 212 lines the
trim removed.

## Why it matters

A prohibition in a comment is a rule enforced by hope. It works only while every future
reader happens to open that file, happens to read that paragraph, and happens to believe it.
This project's own R-31-12 already says the quiet part: **QC gates are structural, not
prompt.** Each entry below is therefore one of two things —

- **knowledge that must survive**, in which case it should be somewhere more durable, or
- **a gate that was never written**, in which case writing it retires the comment entirely.

One entry states the problem outright: `⛔ Found only by opening the editor: no static gate
in this repo can see this.`

## The classification rule used

| Class | Test | Action taken |
|---|---|---|
| GATE-BACKED | the prose NAMES an executable check (`*.py`, `*.js`, `prebuild`, `--check`) | compress to a pointer; the gate is the defence, the prose is a copy that can rot |
| UNENFORCED | nothing executable checks it | keep verbatim, list here |
| STALE | what it forbids is no longer possible | keep, flag for a ruling |

⚠ **A STOP-catalogue reference does NOT count as a gate.** It is prose in another file. An
early version of the detector treated `STOP-*` as enforcement and that was a real bug — it
marked unenforced rules as protected and hid exactly this list. It is now an explicit
assertion in the detector's self-test.

## Headline counts

Script inventory across all 91 over-limit files: **11 gate-backed, 37 unenforced.**
Zero STALE — every prohibition still forbids something the current code can still do.

⚠ **37 is an UPPER BOUND.** The detector also matches descriptive uses of "never"
(`it never used the shared wrapper`), and separating imperative from descriptive is judgement,
which is why humans/models classified rather than the script. Re-run rather than cite:
`python plugins/sgs-blocks/scripts/extract-comment-narrative.py --prohibitions --top 200`

## The register

### Highest value — a gate would retire the comment

| Where | Rule | Why a gate is possible |
|---|---|---|
| `nav-menu`, `site-header` | **STOP-NO-KSORT** — do not reorder `$attributes` before hashing | The uid is content-addressed; reordering silently changes it and fragments the CSS cache. A test could hash a fixture twice and assert stability. |
| `multi-button`, `card-grid` | ⛔ never cast a TIER OBJECT to string | Casting emits `gap:Array` — invalid CSS the browser drops. This is the D569/D570/D574 bug class, already recurrent. A static check for `(string) $attributes['<tier-obj>']` is straightforward. |
| `heading` | NEVER default heading colour, and no `'700'` weight fallback | A literal default silently disables the client's control on every heading. `check-hardcoded-render-defaults.js` F3b already enforces this CLASS — the comment simply never names it. |
| `mega-panel` | transitions restricted to `transform`+`opacity`, never `box-shadow`/`filter` | A measured frame-drop cause. A CSS scan could flag transition properties outside the allowlist. |
| `site-header` | the transparent-header scrolled rule MUST CARRY `!important` | Nothing pins it; dropping it is silent. |
| `product-card` | must not copy `data-wp-bind--hidden`/`data-wp-text` onto the ladder badge | Would wipe SSR text on hydration — invisible until a client looks. |
| `testimonial-slider` | the scoped-style uid hook must never collide with the WP `anchor` id | Collision is silent and data-dependent. |

### Keep verbatim — judgement, not mechanism

- `mega-panel` — `colourScheme:auto` must render LIGHT with no site-wide dark switcher, and must never silently follow `prefers-color-scheme`.
- `mega-panel` — selectors must not be built by concatenating `$content_sel`/`$group_sel` (produced a self-nested selector matching nothing).
- `before-after` — ⛔ selectors descend from `$root_sel` as a single compound token, never a multi-member list.
- `nav-drawer` — geometry never sets `display` (STOP-DIALOG-DISPLAY-GATE).
- `card-grid` — the `cpt-collection` path must stay; removing it deletes a working capability from every install without WooCommerce.
- `site-header` — the text-shadow contrast mode is COSMETIC ONLY and must never be described as WCAG-conformant.
- `cta-section` — no hardcoded fallback colour; unset stays unset (Bean-locked).
- `icon-list` — no top-level function in `render.php`: fatals with "Cannot redeclare" on the second block instance. (Live incident: a 5-instance page 500'd while a single instance rendered fine.)
- `hero` — R-22-14/R-31-14: no legacy scalar fallback; `'image'` tier type is STRICT; the tier-media CSS caller contract must append before printing.

## Gates BUILT from this register (2026-08-21, D728)

Two entries retired by writing the check rather than keeping the prose.

**Undefined variables in `render.php` — the entry that said `no static gate in this repo can see this`.**
Now `python scripts/check-render-undefined-vars.py --check`, wired into `prebuild`. PHPStan **level 1**
over `src/blocks` — ⚠ **not level 0**, which was the assumption going in and is wrong: level 0 across
all 83 blocks emits 1,294 errors and zero variable errors. `phpstan-render.neon` +
`phpstan-render-baseline.neon` (18 triaged entries, triage in the baseline's own header). `--self-test`
reintroduces the real hero defect at its real call site and asserts the gate reports it.

**`check-fx-list-drift.py` I4/I5 — the gate that admitted two of its seven invariants were vacuous.**
Root cause was whitespace, not logic: the self-test's exact-string anchors went stale when
`includes/fx-attributes.php` had its `=>` columns re-padded, so nothing got broken and "no violation"
proved nothing. Anchors are now regex, whitespace-tolerant, and rejected unless exactly one
substitution lands. `--self-test` reports zero unproven invariants.

⚠ **Both were observed failing before being trusted, in both directions** — the real defect caught,
AND a deliberately-corrupted anchor producing a red gate rather than a silent pass. The first attempt
at the second control **did not land** (the corruption assertion failed and the run passed anyway),
which is this register's own thesis biting mid-session. A negative control needs its own landing proof.

**Still open from the tables above:** every other row. `STOP-NO-KSORT`, the tier-object cast,
`mega-panel`'s transition allowlist, the `site-header` `!important` pin, `product-card`'s badge
directives, and `testimonial-slider`'s uid/anchor collision all remain prose enforced by hope.

## Owed follow-ups, recorded not dropped (STOP-29)

1. **`R-22-14` is a stale spec anchor** in `testimonial/render.php` and `option-picker/render.php`. Spec 22 was merged into Spec 31; the live rule is **R-31-14**. The rule holds — only the number is wrong. A rename is its own change.
2. **`multi-button`'s "H6 fix / kind was 'layout'" block** is history that doubles as an anti-regression note. It belongs as an explicit `do NOT set kind='layout'` prohibition. That is a rewrite, not a trim.
3. ~~**`card-grid` has a duplicated `$hover_bg_gradient` assignment**, twice, present at HEAD.~~ **✅ CLOSED — verified 2026-08-22, this was already fixed by `a9ea9b8f` ("two emit sites into one"); one assignment remains at `card-grid/render.php:65`. The entry was true when written and stale a day later.**
4. **The no-inline contract appears in many blocks and a real gate DOES exist** (`audit-inline-styling.js --check`) — but most comments never name it, so they classify as unenforced on their face. A pass compressing them all to one pointer would be cheap and would shrink the unenforced count honestly.

## Method note

Two of this sweep's findings were comments stating the OPPOSITE of the code (both in
`nav-menu`, both corrected in `6aa55619`). A third looked like a contradiction and was not —
the two comments differed in TENSE, not fact.

**How the real one was proven matters.** The file contained a warning recording a previous
agent concluding "this block emits no `<nav>`" from a grep that could not match, because the
tag came from a different file. Grepping for absence would have repeated the documented
mistake. The proof was reading the `printf()` at the end of the file.

---

# Addendum — 2026-08-22 cleanup batches 2 and 3 (70 files)

Appended by the comment-narrative cleanup track after trimming the remaining 70 files
(23 committed as `ec8166e9`; 47 more verified and pending the shared pre-commit gate).

## Prohibitions classified this pass

**GATE-BACKED** (the prose names a real executable check — left as pointers):

| Where | Prohibition | Gate |
|---|---|---|
| many blocks | NO-INLINE contract (Spec 32 / FR-32-4, D345) | `audit-inline-styling.js --check` |
| `heading` | D338 / F3b render defaults | `check-hardcoded-render-defaults.js` |
| `physics-canvas` | D447 decorative-only roster (4 items, WCAG 2.5.7) | fixed roster check |
| `product-search` | legacy-alias no-version-bump policy | `--no-version-bump` |

This directly advances **owed item 4** above: the no-inline prohibitions that DO have a gate
are now compressed to pointers naming it, so they stop inflating the unenforced count.

**UNENFORCED** (nothing checks them — kept verbatim, every one):

| Where | Prohibition |
|---|---|
| `site-header/edit.js` | WCAG 1.4.3 notices are advisory, never enforcement |
| `nav-menu/edit.js` | do not wire a "Selected" state · no Max-width control (D540) |
| `container/edit.js` | keep this in step with the PHP path |
| `trust-bar/render.php` | never emit `sourceMode` in any form (typed-only block) |
| `post-grid/render.php` | ATTR-NAME COLLISION `unset($sgs_wrapper_attributes['layout'])` · no hardcoded fallback colour (Bean-locked) |
| `info-box/edit.js` | attr names MUST match `sgs/icon`'s block.json (D338) |
| `mega-panel/edit.js`, `mega-aside/edit.js` | `templateLock:'all'` re-runs template-sync and drops content (D652) |
| `buybox/render.php` | hidden-when-out-of-stock · no `\|\|` in the Interactivity API |
| `google-reviews/render.php` | `JSON_HEX_TAG` XSS guard at every schema call site |
| `decorative-image/render.php` | naked-mode selector-construction rules |
| `site-footer-row/edit.js` | do NOT reintroduce a bridge to three flat attrs |
| `brand-strip` | the attr is named `thickness`, NOT `border-width` (WP-core selector clash) |

⚠ Two of these are **self-enforcing by literal value only**: `mega-panel` and `mega-aside`
encode the `templateLock:'insert'` prohibition in the value itself, but nothing lints against
someone changing it back to `'all'`. That is weaker than a gate and stronger than prose —
worth a check if one is ever cheap to write.

**STALE:** none found. Consistent with the first pass.

## Contradictions found (reported, never fixed unilaterally)

1. **`text/render.php` — an ID selector that does not exist.** At ~line 311 the file states the
   scope selector is class-level and "never an ID" (D303), which the code confirms
   (`$scope = '.wp-block-sgs-text.' . esc_attr($anchor)`). At ~line 549 a later comment says
   "the base value now lives in the `#uid` rule" — an ID reference contradicting both the code
   and the D303 comment in the same file.

2. **`check-markup-neutral.py`'s own docstring contradicts its code.** The summary states rule 1
   as "every staged file for the block is `.php` (a `.js`/`.css` change can move pixels, so the
   gate applies)". The implementation defines `_NEUTRAL_SUFFIXES = (".php", ".css", ".js")` and
   gives CSS/JS a stricter comment-only path — proven by its own passing self-tests
   ("edit.js comment-only is NEUTRAL"). Reading the docstring alone would wrongly split a
   comment-only commit in two. Caught because the docstring was read first and the code second.

3. **`db-consistency` prescribes a fix its own schema cannot express.** For an undeclared
   sub-element paint it instructs adding `"css:border-color": "borderColourHover"` to a base
   `attrMap`. But `sgs/quote` and `sgs/text` each declare `borderColour` AND `borderColourHover`,
   which collide on that single key. The correct mechanism is a `states.hover` block — census:
   0 of 83 blocks use the suggested shape, 16 use `states.hover`. Handed to the colour-golden
   track in `2026-08-22-handover-to-colour-golden-track.md`.

## A code defect found while classifying (not a comment problem)

**`text/render.php:519-524` — two dead controls.** Both `firstLetterColourHover` and
`borderColourHover` are appended to `$hover_decls` from *inside* `if ( $hover_decls )` at line
516 (their zero indentation against doubly-indented neighbours is the tell). They therefore fire
only when `$hover_decls` is already non-empty from some other hover setting: a client setting
only one of them gets nothing. `firstLetterColourHover` additionally paints `color` on the ROOT
rule rather than `::first-letter`, so when it does fire it recolours the whole block.

Owed to the colour-golden track, not fixed here — declaring these in an element manifest before
the code is corrected would enshrine the defect as the contract.

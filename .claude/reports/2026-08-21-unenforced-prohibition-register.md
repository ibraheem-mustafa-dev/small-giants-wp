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

## Owed follow-ups, recorded not dropped (STOP-29)

1. **`R-22-14` is a stale spec anchor** in `testimonial/render.php` and `option-picker/render.php`. Spec 22 was merged into Spec 31; the live rule is **R-31-14**. The rule holds — only the number is wrong. A rename is its own change.
2. **`multi-button`'s "H6 fix / kind was 'layout'" block** is history that doubles as an anti-regression note. It belongs as an explicit `do NOT set kind='layout'` prohibition. That is a rewrite, not a trim.
3. **`card-grid` has a duplicated `$hover_bg_gradient` assignment**, twice, present at HEAD. Dead but executable.
4. **The no-inline contract appears in many blocks and a real gate DOES exist** (`audit-inline-styling.js --check`) — but most comments never name it, so they classify as unenforced on their face. A pass compressing them all to one pointer would be cheap and would shrink the unenforced count honestly.

## Method note

Two of this sweep's findings were comments stating the OPPOSITE of the code (both in
`nav-menu`, both corrected in `6aa55619`). A third looked like a contradiction and was not —
the two comments differed in TENSE, not fact.

**How the real one was proven matters.** The file contained a warning recording a previous
agent concluding "this block emits no `<nav>`" from a grep that could not match, because the
tag came from a different file. Grepping for absence would have repeated the documented
mistake. The proof was reading the `printf()` at the end of the file.

# QA Gate C — the EDITOR half

**Verdict: PASS (3/3).** Target: sandybrown canary. Date: 2026-08-22.
Harness: `plugins/sgs-blocks/scripts/qa/check-colour-editor-roundtrip.js`.
Companion: the render half, `colour-golden-qa-gate-c-2026-08-22.md` (PASS, 6 assertions).

This settles the verification debt that report left open. Its own "not covered here"
section named exactly these three, because a rendered page is the wrong instrument for
them: they need a real editor session, a real pointer, and an opened drawer.

---

## Results

| # | Assertion | Verdict |
|---|---|---|
| A1 | A palette colour picked in the editor survives save + **reload** as the token **slug** | PASS |
| A2 | A hover rule **repaints** under a **real pointer** | PASS |
| A3 | `sgs/nav-drawer`'s background image, text colour and background gradient, drawer **OPEN** | PASS |

Probe pages are created via REST, measured, and deleted in a `finally`.

---

## A1 — slug, not hex, across a genuine reload

`sgs/heading.textColour` set to `primary`, saved, then the editor **reloaded** — reading the
store without reloading only proves the editor remembers what it was just told.

Two independent readings, both after reload:

- editor store — `getBlocks()` → `attributes.textColour` = **`"primary"`**
- REST `?context=edit` → `content.raw` → `"textColour":"primary"`

Two sources agreeing is the load-bearing proof; either alone is not. The save itself was
**polled** (`isSavingPost()` ≤ 40 × 250 ms, then `didPostSaveRequestSucceed()`) — a resolved
promise is not proof a save succeeded.

⛔ **This assertion is CONDITIONAL, and the condition is load-bearing.** "The stored value is
never a hex" is **false as a universal law**. `DesignTokenPicker` stores a raw hex
legitimately in two cases: a row declared `linked: false` stores the picked CSS value
verbatim *by design*, and on a `linked: true` row `makeChangeHandler` does
`onChange( match ? match.slug : picked )` — so a **Custom**-tab colour matching no palette
swatch stores the hex, correctly. The assertion targets a `linked: true` row with a real
palette slug. Read without that condition, a future editor would file correct hex storage as
a bug.

## A2 — hover repaints under a real pointer

`sgs/heading` with `textColour: primary` and `textColourHover: accent`, on the frontend,
under an actual `page.hover()`:

```
computed colour  rgb(230, 138, 149)  ->  rgb(245, 208, 80)
resting  "primary" resolves to rgb(230, 138, 149)
hover    "accent"  resolves to rgb(245, 208, 80)
```

The render gate proved the rule was emitted and correctly targeted. It never fired it. This
does.

⛔ **SGS block CSS is LIFTED** to `uploads/sgs-css/<hash>.css`, so grepping the page HTML for
the hover rule finds nothing and looks exactly like a failed fix. Everything here is
`getComputedStyle` on the live element.

### The expected colours are resolved LIVE, never hardcoded — and this bit first

The check was originally written with `accent = #F59E0B`, taken from
`theme/sgs-theme/theme.json`. It reported **FAIL** against a canary whose accent is
`#f5d050`. The hover had been repainting correctly the entire time; the *expectation* was
wrong.

Cause: per-client colour lives in `sites/<client>/theme-snapshot.json` and is pushed to
`wp_global_styles`, which **overrides** `theme.json`. A hardcoded hex measures the framework
default, not the site under test.

Fixed structurally, not by correcting the constant: the harness now resolves each slug
through a probe element on the page under test
(`color: var(--wp--preset--color--<slug>)` → `getComputedStyle`). That returns the same
`rgb()` string the assertion compares against, needs no hex→rgb parsing, and stays correct
for every client. Live canary palette confirmed: `primary #e68a95`, `accent #f5d050`,
`text-inverse #fffaf5`.

## A3 — nav-drawer, drawer OPEN, three properties on three elements

Opened via the **real burger click at a 480px viewport** — the path a client actually takes,
not a scripted `showModal()`. `document.getElementById(ref).open === true` asserted before
measuring.

| Attribute | Element measured | Result |
|---|---|---|
| `backgroundImage` | root `::before` | carries `url(…)` |
| `drawerBgGradient` | root `<dialog>` | carries a gradient, layered over `drawerBg` |
| `drawerTextColour` | `.sgs-nav-drawer__body` | `rgb(255, 250, 245)` = `text-inverse` |

⚠ **Three different elements.** Measuring all three on the root reads as three failures —
the text colour is never on the root, because a text gradient uses `background-clip: text`
and would clip the drawer's own background away.

⚠ `surfaceOpacity` is pinned to 1 in the probe; otherwise a competing `color-mix()` root
rule confuses the background reading.

⚠ **D323 body-reparent:** on first open the store re-parents the drawer *and* scrim to
`<body>`, so any locator held before opening is stale. Everything is re-queried by
`#{drawerRef}` after opening.

### Two harness bugs found and fixed getting the real path to work

1. **`.first()` grabbed the site header's burger**, not the probe's — the
   querySelector-first-match trap. Scoped to `[aria-controls="<drawerRef>"]`.
2. **Visibility was sampled instantly** instead of waited for. The burger is display-gated by
   `collapsePoint` (768), and the media query needs a beat after the viewport resize. A
   `waitFor({ state: 'visible' })` replaced the instantaneous check.

Verified independently that this was a *test* artefact, not a product defect: the burger's
computed display is `none` on its wrapper at 1440px and `flex` at 480px, exactly as designed.

---

## Honesty rules this harness enforces

- An assertion that cannot run reports **NOT RUN**, and `--check` exits non-zero on it. A
  skipped assertion counted as a pass is worse than no gate.
- If the real burger path is unreachable, the fallback is used **and named as the fallback**
  in the result line, rather than being reported as the real path.
- No probe page survives the run.

## Not covered here

- The 355 open rule-31 findings. This gate proves the colour rows that **do** exist behave
  correctly end to end; it says nothing about the 333 rows that still lack a hover or
  gradient attribute.
- Any block other than `sgs/heading` and `sgs/nav-drawer`. This is a mechanism proof, not a
  roster sweep.

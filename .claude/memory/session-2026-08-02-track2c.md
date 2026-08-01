---
doc_type: session
project: small-giants-wp
date: 2026-08-02
track: 2c — header/footer row fit + CSS-length validator
---

# Track 2c — full narrative (swept from LEDGER at handoff)

### Track 2c — header/footer row fit: D455 + D456 SHIPPED; CSS-length validator IN FLIGHT

**Pushed** (`18e504b9`, `de769386`, `1a747da4`, `45f05c2c`, `c5327603`):
- **D455 header row NEVER stacks.** Deleted the authored `@container(max-width:767px){flex-basis:100%}`;
  `flexWrap`→`nowrap`; logo `flex-shrink:0`→`min-width:min(100%,var(--sgs-header-logo-min,7.5rem))`.
  Swept 1400→320px (109 widths): no stack, no overflow, no sub-44px target. **Bean's eye GIVEN.**
- **D456 footer columns are a CEILING, not a count** (`supports.sgs.intrinsicColumns`, opt-in per
  block type). Transition at **860px** where NOTHING moved between 1023/767 before. ⚠ 860/1160 are
  PROVISIONAL — measured on placeholder copy; real content moves them.
- **Negative control:** re-injecting `flex-basis:100%` while KEEPING `nowrap` gives OVERFLOW, not a
  stack — the two are NOT overlapping; neither is removable.
- **`c5327603` cleared every dead Spec-17 citation** (9 IDs, 24 edits, 22 files; `FR-S9-4`→Spec
  **36**, not 37) + taught the visual gate comment-only CSS/JS. 3 "formerly cited as" notes stay
  BY DESIGN. Guard: `scripts/row-fit-sweep.mjs --self-test`.

**Fluid header gap SHIPPED + LIVE-VERIFIED** (Bean authorised `--allow-dirty` to the canary; the
co-active track's staged files rode along, accepted risk on a canary). `gap` default is now
`clamp(0.5rem, 0.25rem + 1.5cqi, 1rem)`. Live: served CSS carries the clamp INTACT and the computed
gap varies **16px → 8.8px** over 1400→320px, all on `.sgs-container__inner`; the D455 sweep still
PASSES 109/109 with touch-targets. ⚠ **Review CORRECTION — the validator is NOT what enabled this.**
This gap is an OBJECT, so it goes through `sgs_responsive_sanitise_css_value()`
(`helpers-responsive.php`), a PRE-EXISTING allowlist that already passed parens/commas — proven by
running that exact allowlist over the exact string. The clamp would have rendered without any of
it. `includes/helpers-css-safety.php` (`sgs_css_length_value`) is load-bearing for the ~19
FLAT-scalar gap callers, and it closed a real hole (breakouts hidden inside an allowlisted call:
`calc(}body{color:red)`, `clamp(<script>,…)`).

⚠ **Follow-up the review surfaced:** `sgs_responsive_sanitise_css_value()` permits `/` and `*`, so
it does NOT block the `/*` comment opener, and it STRIPS rather than failing closed. It validates
gap/gridTemplateColumns/contentWidth/maxWidth/padding/margin across BOTH row blocks — the more
exposed sibling of the path just hardened. Route it through `sgs_css_length_value()`.


## Extra detail that did not fit the LEDGER

- **The QC subagent caught a stale parking entry I wrote myself.** `P-CODE-CITES-DELETED-SPEC17`
  was drafted mid-session claiming "41 citations remaining", then the sweep cleared all 41 and I
  never updated it. Lesson: a parking entry written from a mid-flight count is stale the moment
  the work lands — re-check at handoff, not at drafting.

- **The fluid-gap review refuted my own causal claim.** I documented the new validator as what
  made the header clamp possible. It is not: that gap uses the OBJECT path
  (`sgs_responsive_sanitise_css_value`), a pre-existing allowlist that already passed parens and
  commas. Proven by running that exact allowlist over the exact clamp string — unchanged output.
  The validator remains load-bearing for ~19 flat-scalar callers and closed a real breakout hole.

- **D-number contention.** D455/D456 are mine; a co-active track took D457/D458 then D459/D460 in
  the same evening. The documented D-ceiling command was ALSO broken (`grep -oE 'D[0-9]{1,4}'`
  matched the hex colour `#0D5557` and returned D5557). Fixed in three places; bounding the digits
  does NOT fix it — only anchoring on `^## D` does.

- **Deploy contention.** The canary deploy was blocked for hours by a co-active track's staged
  files in deploy scope. Bean authorised `--allow-dirty` for the canary specifically; their
  in-progress `form/`, `gallery/` and theme CSS rode along. Acceptable on a canary, NOT on
  production.

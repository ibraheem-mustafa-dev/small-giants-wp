---
doc_type: plan
project: small-giants-wp
date: 2026-08-01
status: EXECUTING via /subagent-driven-development
decision: UNASSIGNED — D457/D458 were taken by a co-active track on 2026-08-01 and the ceiling
  reached D460. Re-read it live before numbering; the heading-anchored form is the only correct
  one: grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1
---

# One shared CSS-length validator

## Context

`sgs_container_gap_value()` (`includes/helpers-container.php:107`) sanitises the gap
attribute through the allowlist `/[^0-9a-z.% ]/`, which strips parentheses, commas and `+`.
A `clamp(0.5rem, 0.25rem + 1.5cqi, 1rem)` default therefore emits as the invalid
`clamp0.5rem 0.25rem 1.5cqi 1rem`; the browser drops the declaration and the gap **silently
dies**. Proven 2026-08-01 by running the real regex over the real string. It blocked Stage 3
of the D420 fit-cascade design.

Research (2026-08-01) established the blocker is not a security one:
**WordPress core's `safecss_filter_attr()` has safely accepted `clamp()`/`min()`/`max()`/
`calc()`/`var()` since Trac #55966 (2022)**, using a recursive balanced-paren pattern. WP core's
own `theme.json` `settings.spacing.spacingSizes[].size` documents `clamp()` as a valid value, so
core's spacing pipeline carries fluid values to output in production on every WP 6.1+ site.

**Note the inconsistency this exposes:** the sibling `sgs_sanitize_grid_template()` in the SAME
file already permits `(`, `)` and `,`. Grid templates can carry `clamp()` today; only gap cannot.
This is an accident, not a policy.

## Global constraints (binding — copy verbatim into every reviewer prompt)

1. **Reuse WP core's grammar; do not invent a regex.** The balanced-paren function-consumption
   pattern is core's, proven since 2022:
   `/\b(?:var|calc|min|max|minmax|clamp)(\((?:[^()]|(?1))*\))/` — a PCRE recursive pattern,
   `(?1)` matching nested parens to any depth.
2. **Fail CLOSED.** Anything that does not parse as a safe length returns `''`, exactly as the
   current sanitiser does for junk. Callers already guard on `'' !== $value`.
3. **Must reject**, with a test for each: `url(`, `expression(`, `@import`, `;`, `}`, `{`,
   `<`, `>`, backslash, and any unbalanced parenthesis.
4. **Must accept**, with a test for each: `16px`, `1rem`, `50%`, bare slug `30`
   (existing behaviour → `var(--wp--preset--spacing--30)`), `var(--x, 1rem)`,
   `clamp(0.5rem, 0.25rem + 1.5cqi, 1rem)`, `calc(100% - 48px)`, `min(100%, 16rem)`,
   two-value gap `16px 12px`.
5. **Backwards compatibility is non-negotiable.** Every value the old sanitiser accepted must
   still produce a byte-identical result. Prove it with a differential test over a corpus of
   real values, not by reasoning.
6. **No behaviour change to `sgs_sanitize_grid_template()`** in this plan — it already permits
   parens. Out of scope.
7. UK English. Complete implementations only — no stubs, no TODOs.
8. **PHP 8.0+ compatible.** `preg_replace` with `(?1)` recursion requires PCRE2 — verify it
   works on the target, do not assume.
9. Shared worktree: commit by exact path, never `git add -A`, never touch another track's files.

## Task 1 — Build the validator, standalone and tested

Create `sgs_css_length_value( $value )` in a new `includes/helpers-css-safety.php`
(new file: this is a shared safety primitive, not container-specific; `helpers-container.php`
is already at its remit).

Behaviour:
- Bare digits (`30`) → `var(--wp--preset--spacing--30)` (preserve today's slug behaviour).
- Otherwise: consume `var|calc|min|max|minmax|clamp` calls with core's recursive pattern; if
  anything remains that matches `[\\&=}{;<>]` or `/*` or an unconsumed `(`, return `''`.
- Reject `url(`, `expression(`, `@import` in the RAW input before consumption (belt and braces —
  core does not need this because `gap` is not in its url-bearing property list, but ours is a
  bespoke path and should be explicit).
- Otherwise return the value trimmed, with runs of whitespace collapsed to one space (the
  existing two-value `16px 12px` behaviour must survive).

Ship a `--self-test`-equivalent: a PHPUnit-style test file OR a `php` CLI self-check that
exercises every accept case (constraint 4) and every reject case (constraint 3), and **prints a
count that matches the number of cases**. A gate that cannot fail reads green forever — include
at least 3 negative controls that MUST be rejected.

**Do NOT wire it into anything in this task.** Standalone + proven first.

## Task 2 — Route the gap sanitiser through it

Change `sgs_container_gap_value()` to delegate to `sgs_css_length_value()`.

Before changing behaviour, write the differential test required by constraint 5: a corpus of
values the old function accepted (at minimum: `16px`, `48px`, `1rem`, `50%`, `30`, `16px 12px`,
`` (empty), and 3 junk inputs) asserted byte-identical between old and new. Only then swap.

Then set the header row's `gap` default to the fluid curve the fit-cascade design specified:
`clamp(0.5rem, 0.25rem + 1.5cqi, 1rem)` in `src/blocks/site-header-row/block.json`, replacing
the `16px` and the `_comment` that documents the blocker (that comment becomes wrong).

⚠ `cqi` resolves against the nearest ANCESTOR query container — an element is never its own.
`site-header-row` sets `container-type: inline-size` on itself, and the wrapper emits gap onto
`.sgs-container__inner`, whose ancestor container IS the row. That is why `cqi` is correct HERE.
Do not propagate `cqi` to blocks without a guaranteed container ancestor — research flagged the
silent fallback to viewport units as the failure mode.

## Task 3 — Prove it live, or revert

`npm run build` (all prebuild gates green), deploy to the sandybrown canary, then:
- Fetch the served CSS and confirm the emitted gap is the intact `clamp(...)`, not a mangled
  string. **Read the actual served bytes — do not infer from source.**
- Re-run `plugins/sgs-blocks/scripts/row-fit-sweep.mjs` against the live header: still no stack,
  no overflow, no sub-44px target across the sweep.
- Confirm the computed gap actually varies with width (sample at 1400px and at 380px and show
  the two different computed values). A clamp that emits but does not vary is the same failure
  wearing a better disguise.

If any of these fail, revert the block.json default to `16px` and report — the validator can
still ship without the fluid default.

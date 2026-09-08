# Visual diff — sgs/business-info — 2026-09-08

verdict: PASS
intent_capture_passed: true
source_sha: b3dc7e496a5ad291

## What changed

The `displayType="attribution"` credit link's hover effect was REPLACED, on Bean's
instruction, with the reference behaviour from muslimsinconstruction.uk.

**Before:** a `background-clip: text` gradient WIPE to `#e7d768` — the glyphs recoloured
left-to-right, with no underline. It forced `color: transparent` on the resting link, which
is why it needed an `@supports not (background-clip: text)` fallback to stop the credit
rendering INVISIBLE on unsupporting browsers.

**After:** a colour fade to `#d4a73c` plus a 1px underline on `::after` that grows from
`width: 0` to `width: 100%`, both over 300ms.

The `@supports` fallback is deleted, not ported: the resting state is now an ordinary
`color`, so there is no state in which the text can disappear. That failure mode is gone
rather than being guarded against.

`#d4a73c` is SGS's own credit colour — a component constant, not a client value (CLAUDE.md,
"a component's OWN constant STAYS"), overriding no theme default. Both custom-property
override hooks are kept and now feed the two halves of one effect, so an operator override
cannot leave the colour and the underline disagreeing.

Separately, the credit's font size was corrected from `x-small` (12px) back to `small`
(14px). The 12px was set earlier the same day on the reasoning that a credit should read as
subordinate; measured against the footer's own scale that was wrong — it made the credit
smaller than every other item in the footer.

## Assertions — stated before measuring

1. Resting: `position: relative`, no text-decoration, a `color` transition, and an `::after`
   underline at `width: 0`.
2. The underline is `1px` high, `#d4a73c`, offset `-2px` below the text.
3. Both transitions run at 300ms.
4. The credit's font size matches the other footer text rather than undercutting it.
5. `:focus-visible` gets the identical treatment (WCAG 2.1.1 — not mouse-only).

## Live results — measured on the canary footer

```
resting link
  position          relative
  text-decoration   none
  transition        color 0.3s
  font-size         14px

::after (the underline)
  content           ""
  width             0px          <- grows to 100% on hover/focus
  height            1px
  background        rgb(212, 167, 60)   = #d4a73c
  bottom            -2px
  transition        width 0.3s

size parity within the footer
  attribution 14px · copyright 14px · footer links 14px
```

Assertions 1-4 hold as measured. Assertion 5 is verified by construction — `:hover` and
`:focus-visible` share one selector list for both the colour and the `::after` width, so
they cannot diverge; a synthetic focus was not driven in this pass.

## Reduced motion

`prefers-reduced-motion: reduce` drops both transitions but keeps both end states: the
underline still appears on hover at full width, because it is an affordance rather than
decoration. It does not animate to get there.

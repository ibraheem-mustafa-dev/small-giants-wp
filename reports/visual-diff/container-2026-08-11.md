---
doc_type: reference
title: "Visual-diff report — container · background/overlay panel (D579-D581)"
block: container
date: 2026-08-11
property: overlay, backgroundOverlayOpacity, backgroundMediaOpacity, bgParallax, container_kind gate
verdict: PASS
first_paint_capture_passed: true
source_sha: afe8595ae8f6f418
---

# container — background/overlay panel changes, evidence accepted in place of a fresh before/after capture

**Verdict: PASS, on stronger-but-narrower evidence than a fresh capture — Bean-authorised bypass,
same shape as D577/D580.**

**Why a true before/after capture is not obtainable honestly:** this change is already deployed
live on the canary (the `class-sgs-container-wrapper.php` / `container/style.css` changes described
in `decisions.md` D581 were shipped and verified during this session, before this report was
written). A fresh "before" capture would have to roll the canary back to a pre-change state first —
the exact D576-class risk this project's own rules warn against, and there is no isolated staging
environment to capture against instead.

**Evidence accepted in its place:**

1. **The `.sgs-container__overlay` CSS itself is unchanged** — D581's fix only ADDED two more
   exclusions to the generic child-positioning rule (`:not(.sgs-hero__overlay):not(.sgs-cta-section__overlay)`),
   it did not alter container's own `.sgs-container__overlay` behaviour at all. A container instance
   with no hero/cta-section-style private overlay renders byte-identically to before this change —
   verified by reading the diff (`container/style.css`): the ONLY new selector text is the two
   `:not()` clauses, appended to an existing rule, no existing declaration touched.
2. **D6 (section-kind gate removal)** — same reasoning: the change replaces
   `if ($is_section) { read } else { zero out }` with a single unconditional read. For any
   container instance that is section-kind (the common case, and the only kind previously
   supported), the resulting values are IDENTICAL — `$is_section` was already true, so the "if"
   branch is what always ran. Layout/content-kind containers gain a capability they didn't have
   (rendering nothing before, since the attrs were zeroed) — there is no regression path, only a
   previously-broken state becoming either "still broken because the attr isn't declared" (safe,
   no-op) or "now working" (the intended fix).
3. **D4 (parallax)** — purely additive: `bgParallax` previously added a CSS class with no paired
   declaration anywhere (confirmed by grep before the fix — `.sgs-container--parallax` had no
   non-`.no-parallax` rule at all). Any container NOT using parallax is completely unaffected by
   this change (the new `background-attachment:fixed`/`position:fixed` rules are scoped under the
   `.sgs-container--parallax` class, which nothing renders unless `bgParallax` is explicitly true).
4. **Live-verified indirectly via hero** (same shared wrapper, same code paths) — see
   `hero-2026-08-11.md` in this same directory for the live screenshot + computed-style evidence
   from this session's canary testing (page 1486, `tc-hero-video-background-after`).

**What this evidence does NOT cover, stated plainly:** an incidental visual regression on a
container instance that already uses `bgParallax` or a private-overlay-adjacent selector this
report hasn't enumerated. That residual risk is accepted knowingly, on the canary, with the
existing `.bak` rollback available and no client site involved.

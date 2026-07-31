---
doc_type: report
project: small-giants-wp
date: 2026-07-31
reviewer: general-purpose agent (retry — Chrome DevTools MCP; standing in for Ibraheem)
targets:
  - https://sandybrown-nightingale-600381.hostingersite.com/motion-canary-wave-c/
  - https://sandybrown-nightingale-600381.hostingersite.com/motion-roster-canary/
standards: [".claude/specs/38-SGS-MOTION-SYSTEM.md", "~/.claude/rules/visual-standards.md", "WCAG 2.1 AA"]
verdict: MIXED — live verification completed at 375/768/1024/1440px; two real defects found; presets and reduced-motion emulation genuinely out of reach this session
---

# Motion Wave D standards review — retry, live via Chrome DevTools MCP

## 0. What changed from the previous (blocked) attempt

The prior attempt used Playwright MCP, whose shared browser was held by another process
for its entire run and correctly returned INCONCLUSIVE rather than inventing results. This
retry used **Chrome DevTools MCP** as instructed, which worked. Mid-session the coordinator
warned that the Chrome DevTools MCP browser is **also shared across every concurrent agent
in this run** (several other agents — B1-drag, IS-imageseq, K1-keyboard, etc. — were
actively working the same canary pages). Protection taken:

- Claimed a dedicated page via `new_page` with `isolatedContext: "review-retry-D431"`.
- Re-selected that page (`select_page`) and re-checked `window.location.href` inside the
  **same** `evaluate_script` call as every measurement that follows, discarding any reading
  where the URL didn't match.
- **One hijack was caught and discarded**: after a `select_page`, the browser's actually-selected
  page had silently become another agent's tab (`isolatedContext=B-step16-image-sequence-verify`).
  The scramble-text/label-colour reading taken in that window was thrown out and retaken after
  re-selecting page 10 and re-confirming the URL.
- `resize_page` silently failed to change viewport width on this shared-browser page (confirmed
  via `window.innerWidth` after the call reported success) — worked around by using `emulate`
  with an explicit `viewport` string instead, which did take effect and was verified via
  `innerWidth` every time.

**Genuine tooling gap, disclosed rather than proxied:** Chrome DevTools MCP's `emulate` tool
(schema checked directly) exposes `colorScheme`, `cpuThrottlingRate`, `extraHttpHeaders`,
`geolocation`, `networkConditions`, `userAgent`, `viewport` — **no `prefers-reduced-motion`
parameter**. Per the brief's own binding methodology, this is marked INCONCLUSIVE rather than
faked (e.g. stubbing `matchMedia` from JS, which is exactly the "weaker proxy" the brief warns
against). The `reduce` arm is genuinely unverified by this session for every effect; where the
8 visual-diff reports already claim a `reduce` result via their own Playwright harness
(`probe-wave-c.mjs`, which sets `reducedMotion: 'reduce'` in a real browser context), that is
a different, more capable tool than what I had — I have not independently re-audited those
specific claims live, and say so per-finding below.

---

## 1. Numbered findings

### 1.1 CONFIRMED-GOOD (live) — `sgs/before-after` labels sit over the correct image, both instances, desktop

**Evidence (live DOM, 1440px, URL-verified same call):** `--sgs-before-after-position: 50%`;
the after-image wrapper's clip is `inset(0px 50% 0px 0px)` (reveals the AFTER image on the
LEFT half only). Label rects: `afterLabel.left ≈ 516` (block left edge 504) vs
`beforeLabel.left ≈ 1327` (block right edge 1401) on instance 1; same pattern on instance 2.
**After label sits on the left where the After image paints; Before label sits on the right
where the Before image paints.** This upgrades the previous attempt's finding (deployed-CSS
inference only) to a live, rendered confirmation. Item (c) from the brief: **answered, PASS.**
Standard: content-correctness / not-colour-alone (visual-standards.md); no §10 row applies
(drag is user-driven, SIMPLIFY per FR-38-13, not a reduced-motion suppress/simplify case for
static label placement).

### 1.2 DEFECT — `sgs/before-after` instance 1 collapses to ~1/3 width specifically in the 767–900px band

**Severity: MEDIUM.** **Standard violated:** `visual-standards.md` responsive tiers
(768 = tablet, 1024 = desktop) and Spec 31's "faithful transfer includes a property's absence"
discipline — a block should scale predictably across the device-tier system, not diverge
non-monotonically between tiers.

**Evidence — live `getBoundingClientRect().width`, same block instance 1, URL-verified at
every step, 5 viewports on `/motion-canary-wave-c/`:**

| Viewport | Instance 1 width | Instance 2 width | Ratio (inst1/inst2) |
|---|---|---|---|
| 375px | full-width (screenshot, both fill column) | full-width | ~1.0 |
| **767px** | **224px** | 704px | **0.32** |
| **768px** | **225px** | 705px | **0.32** |
| 900px | 357px | 837px | 0.43 |
| 1024px | 961px | 961px | 1.0 (equal) |
| 1440px | 897px | 1200px | 0.75 |

Both instances are the SAME block on the SAME page under the SAME build — instance 2 scales
smoothly and predictably; instance 1 does not. At exactly 767–768px it visually renders as a
narrow ~225×360px column that no longer reads as a before/after comparison at a glance —
screenshot: `.claude/scratch/motion-wave-c-768-full.png` (not committed — regenerate by
opening the canary at 768px). I traced this partway: the block itself computes `width: 225px`
directly (not from `width`/`max-width`/`flex-basis` on any matched stylesheet rule I could
read, and not an inline style — `getAttribute('style')` is `null`), so the mechanism is not
fully diagnosed; I'm not proposing a fix, only reporting the measured, reproducible symptom.
**This looks like the exact failure class the codebase's own docs warn about** — two competing
responsive mechanisms (a device-tier system vs a fluid/`clamp()`-style rule) landing on
different values at different tiers, non-monotonically. Needs a code-level look, not a design
call.

### 1.3 DEFECT — a leftover debug marker renders live in the site header on both target pages, all three widths

**Severity: input needed (could be transient).** The text `SGS-CPT-HEADER-PROOF-20260722`
renders as a real, visible `<p class="wp-block-paragraph">` at the very top of the site header
(inside `.sgs-site-header-row--middle`), above the "MAMA'S MUNCHES" logo — confirmed live on
both `/motion-canary-wave-c/` and `/motion-roster-canary/`, at 1440, 768, and 375px.
Screenshot: `reports/visual-diff/screenshots/wave-d-header-debug-marker-2026-07-31.png`.
`position: static`, `opacity: 1`, real dark-on-cream text — not hidden, not aria-only. It sits
in the actual theme header template part, so it is visible on **every page that uses this
header**, not just the two canaries.

**Caveat, stated honestly:** this session ran concurrently with several other agents actively
editing header/nav/motion surfaces on this same site (the coordinator's own hijack warning
confirms live concurrent write activity). I cannot rule out that this marker is a **transient
artifact of another in-flight agent's header work this session**, rather than a standing
defect. Flagging as DEFECT with this caveat rather than silently dropping it — **re-check once
all concurrent agents in this run have finished** before treating it as a genuine regression to
fix.

### 1.4 DEFECT, MINOR — dropped word in the `sgs/text` motion-path canary copy

**Evidence (live DOM text):** `"...the render layer expands it into a hidden , and the runtime
resolves geometry from it..."` — a word is missing between "hidden" and the comma (almost
certainly an inline `<svg>` tag written into the source copy that WordPress's content
sanitiser stripped, leaving the surrounding prose with a gap). Cosmetic/content bug, visible
to any visitor of the canary, not part of the motion mechanism itself. Low severity, easy fix,
flagging so it isn't lost.

### 1.5 A11Y — ScrambleText heading colour measures ~2.25:1 against its background, below AA for both normal and large text

**Evidence (live computed style, URL-verified):** `SCRAMBLE TARGET ONE` / `TWO` render in
`rgb(230, 138, 149)` (20px, weight 700) on the page background `rgb(251, 243, 220)`. Computed
WCAG contrast ≈ **2.25:1** (I calculated this from the exact RGB pair using the standard
relative-luminance formula; 20px/700 clears the "large text" size threshold, which needs 3:1 —
still fails). Standard: WCAG 2.1 AA / `visual-standards.md` (4.5:1 normal, 3:1 large).

**Context that matters:** `rgb(230,138,149)` is exactly this site's `primary` brand token —
the SAME colour pairing `reports/visual-diff/nav-menu-2026-07-31.md` measured at an identical
2.25:1 on the nav dropdown and which **Bean explicitly ruled the AA floor not applicable to**
on 2026-07-31 ("pink on cream is easily discernible... the owner's call on his own brand
palette"). That ruling was scoped to the nav-menu submenu links specifically. This is the
**same token reused on a different block** (ScrambleText heading) — I'd treat Bean's ruling as
likely to extend here since it's the identical colour pair on the identical background, but
it has not been explicitly re-confirmed for this instance, so I'm flagging rather than
silently assuming the extension holds.

### 1.6 CONFIRMED-GOOD — before-after label pill contrast is safe under worst-case backdrop

**Evidence:** label text `rgb(255,255,255)` on `rgba(0,0,0,0.6)` pill. Because the backdrop is
a 60%-opacity black scrim over the photo, even the lightest plausible photo (pure white)
composites to `rgb(102,102,102)`, giving white text ≈5.75:1 contrast — comfortably above 4.5:1
regardless of the underlying image. Confirmed-good by construction, not just measurement of
one sampled photo.

### 1.7 CONFIRMED-GOOD (live, independently re-verified) — `sgs/gallery` drag-to-scroll fix holds

**Evidence (live DOM, this session, URL-verified):** `.sgs-gallery__grid` — `scrollWidth: 3227`,
`clientWidth: 1200`, `cursor: grab`. Matches `reports/visual-diff/gallery-2026-07-31.md`
exactly. I re-measured this myself rather than trusting the source report; it holds.

### 1.8 CONFIRMED — touch targets measure 44×44px live

**Evidence:** the before-after drag handle computed to `44×44px` at 768px viewport (live
`getBoundingClientRect`), matching the CSS rule (`.wp-block-sgs-before-after__handle{width:44px}`
+ matching `::-webkit-slider-thumb`/`::-moz-range-thumb` rules confirmed present). Meets
WCAG 2.1 AA / 2.2 minimum.

### 1.9 CONFIRMED — no frontend console errors on the wave-c canary

**Evidence:** `list_console_messages` (errors + warnings) on `/motion-canary-wave-c/` at
375px returned zero messages.

### 1.10 INCONCLUSIVE — item (a): do Subtle/Standard/Dramatic presets produce visibly different motion?

**Neither target page contains any preset UI or copy.** I searched both pages' rendered text
for `subtle|standard|dramatic` (case-insensitive) — zero matches on `/motion-canary-wave-c/`
and zero on `/motion-roster-canary/`. A third canary (`/motion-canary-pin-scrub/`) exists and
was open in another agent's tab, but it is **not one of the two pages this brief assigned me**,
so I did not use it to answer this question — reporting the gap honestly rather than silently
substituting an unassigned page. **Per the binding methodology: a probe that never reaches the
effect is measuring the probe — INCONCLUSIVE, not a pass or fail.** If preset differentiation
needs judging, it needs either the pin-scrub canary added to the assigned target list, or the
presets added to one of these two pages.

### 1.11 INCONCLUSIVE — reduced-motion arms (all effects, both pages)

Chrome DevTools MCP's `emulate` tool has no `prefers-reduced-motion` parameter (schema
verified directly — see §0). No live emulation was possible this session for the `reduce`
arm of anything: presets, DrawSVG, ScrambleText suppression, before-after (a narrow CSS
kill-switch was found in a static-CSS check in the previous attempt but not re-verified
live), pin-scrub, or the Lenis/page-transition site settings. **Genuinely INCONCLUSIVE by
tooling limit, not by absence of effort.** The 8 visual-diff reports claim `reduce`-arm
results via a different tool (`probe-wave-c.mjs`, real Playwright `reducedMotion: 'reduce'`
context) — those specific claims remain **unaudited by an independent second tool** after
this session, which was one of this review's core purposes.

### 1.12 INCONCLUSIVE — item (b): are retimed scroll ranges sensible (complete on-screen)?

Not independently exercised via live scroll-through this session (time budget spent on the
items above, which surfaced two genuine defects). The per-block visual-diff reports for
image-sequence and responsive-logo already sampled scroll position against effect progress
(luma ramp / dash-array sweep) and found sensible, monotonic completion within their tested
ranges — I did not find anything contradicting that, but I also did not re-run an independent
scroll-position sweep myself, so this is carried forward as **their claim, not my
verification.**

### 1.13 AESTHETIC-CONCERN — testimonial-slider adjacent-slide peeking at 375px

At 375px, the previous/next slide's text and reviewer-number avatar visibly peek in at the
edges of the active slide (e.g. "iber 3" — the tail end of "Reviewer" plus the next avatar
number, cut off). This reads oddly in a screenshot but is a common, often deliberate carousel
pattern (edge-peek hinting more content exists) — not clearly a defect. Needs the owner's eye,
not a code fix by default.

---

## 2. Carried forward from the previous (blocked) attempt, as instructed

- **`sgs/before-after` label-order CSS fix is live** — superseded by §1.1 above (live DOM
  confirmation is stronger than the static-CSS read that produced this line originally).
- **`google-logo.svg` 404 pre-existing, unrelated to Wave D** — not re-checked this session
  (low value re-check of an already-scoped, low-severity, unrelated item); carried forward
  as previously confirmed.

---

## 3. Judgement calls that need the owner's eye (cannot be settled against a documented standard)

1. **Preset differentiation (Subtle/Standard/Dramatic)** — still undetermined; the presets
   are not present on either page this review was scoped to. Needs either the assigned pages
   extended or the pin-scrub canary added to a future review's scope.
2. **Reduced-motion arms, all effects** — needs either a tool with real
   `prefers-reduced-motion` emulation (Playwright, or a Chrome DevTools MCP version that gains
   the parameter) or Bean's own OS-level toggle tested by eye on a real device.
3. **Whether §1.2's before-after tablet-width collapse is a rendering bug or an intentional
   narrow variant that simply looks wrong** — the measured numbers are unambiguous but the
   *intent* isn't: is instance 1 meant to be narrower than instance 2 at all, at any tier?
   If yes, the 1024px "equal width" reading is itself the anomaly, not 768px.
4. **Whether the ScrambleText pink-on-cream pairing (§1.5) should inherit Bean's nav-menu
   contrast ruling, or needs its own explicit sign-off** — same token, different block.
5. **The header debug marker (§1.3)** — genuinely open whether it's a standing defect or a
   transient artifact of concurrent agent work in this same session; needs a clean re-check
   once no other agent is actively touching the header.
6. **Drag "feel", momentum curves, preset intensity** — every source visual-diff report
   already defers this explicitly to Bean's eye (R-31-13); nothing in this session changes
   that.

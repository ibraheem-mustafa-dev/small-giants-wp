---
doc_type: report
date: 2026-07-30
subject: Motion Wave B commit 1 (D422 — Lenis smooth scrolling) — live verification on sandybrown
commit: 4776b73f
deploy: build-deploy.py --target sandybrown --blocks-only --skip-build, from an ISOLATED worktree
        pinned to 4776b73f (the shared tree carried the co-active track's uncommitted work)
---

# Wave B commit 1 — live verification record

Canary: `sandybrown-nightingale-600381.hostingersite.com`. Setting left **ON** (strength 4) for
the owner's eye check (R-31-13).

## PASS — measured, not inferred

| Check | Evidence |
|---|---|
| **OFF ships zero bytes** | Homepage with setting off: `smooth-scroll` refs **0**, `lenis` refs **0**, `@sgs/gsap` refs **0** |
| **ON enqueues exactly once** | module script tags **1**, CSS link tags **1** |
| **Settings reach the browser** | `<script id="wp-script-module-data-@sgs/smooth-scroll">` → `{"strength":4}`, matching the stored option |
| **Read-side defaulting works without the admin sanitiser** | option written directly by WP-CLI (bypassing `Sgs_Motion_Settings::sanitise()`); frontend still resolved correctly |
| **Smoothing actually eases** | 120ms after requesting 1400px, position was 100px (native would teleport). Real wheel input drove 1 → 660 → 931 → 1321px |
| **Stylesheet is parsed, not merely linked** | `document.styleSheets` contains a rule whose selector includes `lenis-smooth` |
| **iframe dead-zone fix fires, and only when it should** | at rest `pointer-events: auto` → during wheel scroll `lenis-smooth` present + `pointer-events: none` → after settle back to `auto` |
| **Editor + wp-admin clean** | authenticated (auth cookie verified, pages confirmed to BE admin pages): `/wp-admin/`, `post-new.php`, `site-editor.php` → module script tags **0**, CSS link tags **0** |
| **Reduced motion is reactive** | load with reduce ON → smoother never starts; flip OFF → starts with no reload; flip ON → full teardown; flip OFF → restarts. Exactly **1** listener registered (no leak, no double-init) |
| **Anchor offset** | target lands at **93.38px** = exactly header height (clear, not hidden); `scroll-padding-top: 93px`; `scrollIntoView()` (find-in-page / keyboard path) also lands clear |

## FR-37-40 regression — smoothing ON (desktop 1440)

Header held `getBoundingClientRect().top === 0.00` at top / 1400 / 600 / back-to-top **and
mid-flight**; `position: sticky` throughout; `--sgs-header-height` steady at **93px**;
`is-header-scrolled` / `is-header-shrunk` / `is-header-scrolling-down` and the row's
`is-row-scrolled` all toggled identically to the pre-deploy baseline; `document.scrollHeight`
unchanged (4435); no inline height forced onto `<body>`.

At **390px** the header computes `position: absolute` (sticky is off at that tier on this
header) and `--sgs-header-height` publishes an explicit **`0px`** — the D391 measured pinned-gate
behaving correctly with Lenis running, i.e. gating on the COMPUTED position rather than the
sticky class.

## Row COLLAPSE — RESOLVED 2026-07-30, PASS

Originally recorded as not-verified. **Cause found in the data, not inferred:** the active header
(CPT 1570) has 5 rows and all three `rowHideOnScroll` values were `{}` — never configured — so the
collapse path had nothing to trigger it. (The CPT named "T1 Header HideOnScroll", 1655, has no
hide-on-scroll set either, despite its title.)

Enabled `rowHideOnScroll: {"desktop":"on"}` on one row **via the block editor's `wp.data`** — the
sanctioned route; WP-CLI `post_content` edits are banned by project rule and hook-enforced — then
measured with smoothing ON, then restored the row to `{}`. The canary header is back exactly as
found.

| Measurement | Result |
|---|---|
| Row height, visible → hidden | 67.78px → **0** |
| Inline `blockSize` while collapsed | `0px` (transient, as designed) |
| `transform` throughout | **`none`** — the collapse path won by specificity; the translate path never ran |
| Classes when hidden | `is-row-hidden` + `is-row-collapse-mode` |
| Header drop | 67.79px |
| Row height removed | 67.78px |
| **Gap (FR-37-40's "no gap" criterion)** | **0.01px**, unrounded |
| Header pinned throughout | yes (`position: sticky`) |
| `--sgs-header-height` re-published | 93px → **26px** (ResizeObserver tracking the shrunken header) |
| Restore on scroll up | row back to 67.78px, inline height cleared |

So collapse-when-pinned behaves identically under Lenis, and the D391 scroll-padding gate composes
with it for free — the same result FR-37-40 recorded pre-Lenis.

## NOT verified — owed, named, not dropped (STOP-29)
2. **Anchor test distance was trivial (24px).** The only in-page anchor target on the homepage is
   the skip link. The OFFSET is proven; a long smoothed anchor journey is not.
3. **Reduced motion used a STUBBED media query.** The harness exposes no
   `prefers-reduced-motion` emulation, so `window.matchMedia` was stubbed before module load.
   This proves OUR branch logic and reactive wiring; it does not prove Chrome's own media
   matching. Same harness limit Spec 37 FR-37-40 already records.
4. **Touch momentum — MEASURED ON A REAL DEVICE 2026-07-30, and REJECTED.** An operator opt-in
   (`smooth_touch` + `smooth_touch_strength`, default OFF / 1) was added at the owner's request.
   Tried on an actual phone at the lightest setting (strength 1 = `syncTouchLerp` 0.3): the owner
   judged it **"abrupt and janky"** — worse than off, not better. Turned off on the canary (it was
   already the code default). The control is retained deliberately, labelled tested-and-rejected on
   the settings page and in FR-38-18(d). **Do not re-propose touch smoothing without new
   real-device evidence.** Desktop smoothing was separately judged sluggish at strength 4 and set
   to 3.
5. **Sticky-under-smoothing at mobile is untested by configuration** — the canary header is not
   sticky at 390px, so that combination does not occur there.
6. **The two qc-council sub-cases are not yet run:** sticky+transparent same-tier coexistence,
   and the nav-drawer `<dialog>`-in-header offset.
7. **Owner's eye (R-31-13) not yet given.** Setting is ON at strength 4 — scroll the canary.

## Method notes worth keeping

- The first admin check **failed vacuously**: the password contains shell metacharacters, so
  sourcing the env broke, the requests went out unauthenticated, and three login-page redirects
  returned "0 references". Re-run with a real auth cookie AND a positive control asserting the
  fetched page really is an admin page. A zero from an unauthenticated fetch proves nothing.
- A "missing settings blob" was reported mid-run and was **my own bad grep pattern**, not a
  defect — confirmed present by parsing the tag properly.
- `window.scrollTo()` does NOT produce Lenis's `lenis-smooth` state; only real wheel input does.
  A check that samples during a programmatic scroll will conclude the CSS is inert when it is not.

---
doc_type: reference
title: "Visual-diff report — container · Anim tab removal, native colour dedup, panel reorder"
block: container
date: 2026-08-12
property: supports.color (background/gradients/text/link/heading), BackgroundPanel tab order, panel position
verdict: PASS
first_paint_capture_passed: true
source_sha: fd57bb380b8d7696
---

# container — Anim tab removal / native colour dedup / panel reorder

**Verdict: PASS, on live-census evidence in place of a fresh before/after screenshot capture.**

**What changed:** (1) the `edit.js`-side `BackgroundPanel`'s "Anim" tab was removed and its two
controls (Ken-burns, Parallax) relocated below the tab strip — this is a pure editor-sidebar
reorganisation, zero effect on saved attribute values or render.php; (2) `block.json`'s
`supports.color` was changed from `{text,link,heading:true}` to `false` outright; (3) `BackgroundPanel`
moved to the top of the single `InspectorControls` group — editor-sidebar ordering only.

**Why a before/after capture is not the right evidence here:** items (1) and (3) touch only
`edit.js`/the shared `ContainerWrapperControls.js` component tree — no `render.php`, no `style.css`,
no saved markup path is touched by either, so there is no frontend pixel for a capture to compare.
Item (2) is the one genuine behaviour change with a frontend surface (it stops
`get_block_wrapper_attributes()` inlining `style.color.*` onto the block wrapper) — evidenced instead
via a live census, which is stronger than a single screenshot because it covers every live instance
rather than one sampled page.

**Evidence:**

1. **Live census of the canary DB** (`wp db query` over `wp_posts.post_content`,
   `sandybrown-nightingale-600381.hostingersite.com`): only 3 published posts anywhere on the site
   reference `wp-block-sgs-container` (IDs 2107, 2109, 2190 — all internal QA/motion-path probe pages,
   zero client content). None of the 3 carry a `style` object containing `color` on any
   `sgs/container` block comment (checked via a JSON-shaped grep against each post's raw content).
2. **`has-text-color`/`has-background` class census** — these WP-emitted marker classes appear ONLY
   when a native colour/background is actually set to a non-empty value. A site-wide
   `wp db query` for `wp-block-sgs-container...has-text-color` and `...has-background` across
   `wp_posts` returned **zero rows**. No page, published or otherwise, has ever had this control set.
3. **Mechanism confirms the census is sufficient**: removing `supports.color` stops WordPress
   generating an editor control and stops `render.php`'s `wp_style_engine_get_styles()` call from
   having a `style.color` array to read — but that array was already empty on every live instance
   (per the census), so the generated `<style>` block and `has-*` classes container's render.php adds
   were already omitted for every real page. The change removes a control and a code path that were
   never exercised, not a value any page currently renders.

**What this evidence does NOT cover:** a draft/unpublished post, or a post outside this canary
(e.g. on `mamasmunches.com` or another live site), that might have the value set. The census query
was run against `post_status` unrestricted on `sandybrown-nightingale-600381.hostingersite.com`
specifically (the only environment this branch is being verified against, per this project's own
canary-only development model) and returned zero rows regardless of status.

---
doc_type: report
date: 2026-07-30
subject: Motion Wave B commit 2 (D424 — FR-38-19 page transitions) — live verification on sandybrown
commit: 984f2944
deploy: build-deploy.py --target sandybrown --blocks-only --skip-build, from an ISOLATED worktree
        pinned to 984f2944, with the co-active track's 8 uncommitted render.php files REVERTED in
        the copied build/ and the reversion proven by md5 before shipping
---

# Wave B commit 2 — page transitions (FR-38-19), live verification record

Canary: `sandybrown-nightingale-600381.hostingersite.com`, with **smooth scrolling also ON**
(strength 3) throughout, so every result below is measured with both Wave B features live.

## The five acceptance criteria

| # | Criterion | Result |
|---|---|---|
| 1 | Setting OFF → no rule in the served HTML | **PASS** — 0 references to `view-transition` / `sgs-view-transitions` / `sgs-vt-`. Positive control: 230 `wp-block-sgs` markers, so the page genuinely rendered rather than erroring to an empty body |
| 2 | Setting ON → rule present, and a navigation visibly transitions | **PASS** — see the per-template table and the `pagereveal` result below |
| 3 | Unsupported / reduced motion → navigation still works, instantly | **PASS** — under emulated `reduce` the opt-in rule went inactive, no transition ran, `pagereveal` still fired and the navigation completed |
| 4 | Editor + wp-admin unaffected, asserted with an authenticated fetch **plus** a positive control | **PASS** — see below |
| 5 | Spec 38 updated + a D-number recorded | **DONE** — §3.5 FR-38-19, §8 Wave B, FR-38-18's owed-gaps block; D424 |

## Per-template selection — measured server-side

Option written by WP-CLI (deliberately bypassing the admin sanitiser, which also tests the
read-side defaulting): site default `fade`, with `page → slide` and `404 → none`.

| Template | HTTP | stylesheet linked | emitted rule |
|---|---|---|---|
| front-page (site default) | 200 | yes | `sgs-vt-fade-out` |
| page (override) | 200 | yes | `::view-transition-old(root){animation:260ms cubic-bezier(0.4,0,0.2,1) both sgs-vt-slide-out}` |
| 404 (override `none`) | 404 | **no** | **none — zero bytes** |

The `none` row is the load-bearing one: "off ships zero bytes" holds **per template**, not merely
site-wide.

## Reduced motion — REAL emulation with a negative control

This supersedes the stubbed-media-query caveat carried from commit 1.

| Leg | opt-in rule active? | browser ran a transition? | navigation completed? |
|---|---|---|---|
| `no-preference` | **true** | **true** ← the negative control | yes |
| `reduce` | **false** | **false** | yes |

Method notes that make this non-vacuous, both learned by getting it wrong first:

- **The verdict comes from the browser, not from us:** the incoming document's `pagereveal`
  event carries a non-null `viewTransition` only when one actually ran.
- **`page.goto()` cannot be used.** A browser-initiated navigation (address bar / scripted goto)
  is not eligible for a cross-document transition. The first attempt used `goto` and produced
  `false` on BOTH legs — a suppression "pass" with no negative control, i.e. proof of nothing.
  Redone by clicking a real in-page link.

## Editor + wp-admin — authenticated, with a positive control

`/wp-admin/`, `post-new.php?post_type=page`, `site-editor.php`: **0** references to
`view-transitions.css`, `view-transition-old(root)`, `sgs-vt-`, `sgs-view-transitions`.
Authenticated (a `wordpress_logged_in*` cookie was asserted present before any count was
believed), and each page asserted to BE an admin page before its zero was accepted.

> **A false positive worth recording.** The first run flagged a leak on all three pages: one
> `@view-transition` each. It is **WordPress core's own** —
> `<style id="wp-view-transitions-admin-inline-css">`, auto-generated in WP 7.0.2, containing
> `@media (prefers-reduced-motion:no-preference){@view-transition{navigation:auto}…}`. The needle
> was too broad, not the code wrong. Two consequences: the check now matches only our own
> identifiers, and core independently corroborates the media-wrapped opt-in shape this spec chose.

## Interaction with smooth scrolling (rater-flagged, previously untested)

Navigated **mid-tween** — real wheel input to 620px with `lenis-smooth` still active — then
clicked a link.

| Check | Result |
|---|---|
| Departed while Lenis was still easing | yes (`lenis-smooth` active) |
| Transition ran with smoothing live | yes |
| Landed at scroll 0 on the new document | yes |
| Lenis re-initialised on the new document | yes |
| Largest scroll movement across 26 post-arrival samples | **0px** — no stutter, no restoration jump |
| Console errors | none |

Caveat: the first visible link was the logo, so this was a home→home navigation. Still a genuine
cross-document transition; the per-template *selection* was proven separately server-side.

## Operator surface

Fetched authenticated and asserted: master toggle present and reflecting the stored ON state,
site style select showing `fade`, **15** per-template rows, `page` showing `slide` and `404`
showing `none`. The 15 include WooCommerce templates (`order-confirmation`, `page-cart`,
`page-checkout`, `taxonomy-product_attribute`…) that the theme's own directory does not contain —
which is the proof the list is genuinely enumerated from the theme, not hardcoded.

The shipped `motion-settings.js` was then run against that real admin markup: with transitions
OFF every style select is genuinely `disabled` (the property, not merely dimmed) and its row
dimmed; turning it back on re-enables them; the smooth-scrolling controls are unaffected.

## Owed items from commit 1 — both CLOSED

- **Long-distance anchor:** proven over **2,211px** (previously 24px). Eased through
  269 → 1295 → 2009 → 2190; not clamped at the document end; landed **0.21px clear** of the
  sticky header — the same offset the short test produced.
- **The two qc-council sub-cases:** both run, in Spec 38 §8. Sticky + transparent on the same
  tier PASSES under smoothing (17 samples, header `top: 0.00` including mid-flight, transparent
  ramp `0 → 1` and back). The nav-drawer `<dialog>` case PASSES — and the risk note it came from
  was **wrong about the DOM**: the drawer is a `BODY` child, not a header descendant, so the
  obvious test would have passed vacuously. Re-run against a real ancestor with a negative
  control (fixed probe moved −80px; the dialog moved 0).

## Still not verified — named, not dropped (STOP-29)

1. **Firefox.** It does not ship cross-document view transitions, so those visitors get plain
   navigation. That IS the specified fallback, and it is untested only in the sense that no
   Firefox run was made.
2. **Safari.** Supports it from 18.2; not exercised here. The mechanism is the same CSS opt-in.
3. **Hide-on-scroll × nav-drawer via the SETTING** (rather than a directly-applied transform) —
   see the §8 caveat.
4. **A visual/aesthetic judgement of the fade and slide.** Measurement says they run; whether
   they *look* right is Bean's call (R-31-13). The setting is currently ON on the canary with
   site default `fade` and `page → slide`.
5. **The 2rem slide edge.** The rater flagged that a translated root snapshot can expose a thin
   strip at the trailing edge for a frame. Not observed, not specifically hunted; worth an eye
   on a page whose background differs sharply from the next page's.

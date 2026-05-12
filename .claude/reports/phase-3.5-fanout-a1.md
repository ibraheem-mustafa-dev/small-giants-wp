# Phase 3.5 Fanout — Batch A1 proposals

Subagent: Sonnet A1. Read-only. Vocabulary anchored to `slot_synonyms` table (55 canonical slots) and Spec 15 §3.3.

Modifier convention: device-suffixed attrs (`Mobile`/`Tablet`/`Desktop`) peel to the same canonical_slot as the base (modifier `responsive-override`). Property suffixes (`Size`/`Colour`/`Bg`/`Style`/`Width`) peel to the stem slot (e.g. `closeButtonSize` → `button`).

## sgs/back-to-top (4 attrs)

This block is a deprecated wrapper (`description: "Deprecated — use Customiser → Floating UI → Back to Top instead."`). Its 6 attrs include `buttonColour`/`iconColour` (already canonical via `button`/`icon`). The 4 gap-candidates:

| attr_name | Proposed canonical_slot | Proposed role | Rationale |
|---|---|---|---|
| position | NEW: `floatingPosition` | select-from-enum | enum `bottom-right`/`bottom-left`/`top-right`/`top-left`; lands in fixed-position CSS class. No existing slot — `positionX`/`positionY` are numeric coords, not corner anchors. Candidate for a shared `floatingPosition` slot reusable by chat-widget, popup, cookie-banner. |
| scrollThreshold | NEW: `scrollThreshold` | number-css-px | px scroll distance before button reveals; behaviour control, not visual. Reusable by reading-progress, sticky-reveal headers, scroll-anchored animations. |
| shape | `variant` | select-from-enum | enum `circle`/`square`/`rounded`; alias of existing `variant` slot ("style") — purely a visual shape preset, identical pattern to button shape variants. |
| size | NEW: `size` | number-css-px | numeric button dimension in px (default 48); slot `width` is used for percentage layout widths, `max` is for max-w. A dedicated `size` slot is cleaner and would absorb closeButtonSize, socialIconSize, logoMaxWidth (squared dims). Could alternatively reuse `width`. |

## sgs/form (20 attrs)

`sgs/form` is the form wrapper (multi-step support, validation, N8N webhooks). Behaviour-heavy. Mix of identity, behaviour, payment, focus-ring styling, submit-button styling, success handling.

| attr_name | Proposed canonical_slot | Proposed role | Rationale |
|---|---|---|---|
| formId | NEW: `identifier` | text-content | Unique form identity string (`providesContext: sgs/formId`). Reusable across any block needing a stable ID (popups, chat, accordion). |
| formName | NEW: `identifier` | text-content | Human-readable form name for submissions/admin display. Same identity slot. |
| submitLabel | `button` | text-content | Submit button label text. Direct alias — `button.label`. |
| submitStyle | `button` | select-from-enum | enum `primary`/`secondary`/`ghost`/`outline`; button visual variant. |
| submitColour | `button` | colour-text | submit button text colour; lands in `--sgs-form-submit-color`. |
| submitBackground | `button` | colour-bg | submit button background colour. |
| successMessage | NEW: `successFeedback` | richtext-content | Post-submit message shown to user. Reusable by booking confirmation, payment success, subscribe forms. |
| successRedirect | `link` | link-href | URL to redirect to on successful submit; classic href payload. |
| honeypot | NEW: `securityFeature` | boolean-visibility | Boolean enabling honeypot spam protection. Behaviour flag, no existing slot. Reusable by comment forms, signup. |
| storeSubmissions | NEW: `securityFeature` | boolean-visibility | Boolean controlling DB persistence of submissions. Same behaviour-flag family. |
| requireLogin | NEW: `securityFeature` | boolean-visibility | Boolean — only logged-in users may submit. Same family. |
| rateLimit | NEW: `securityFeature` | number-css-px (numeric) | Integer requests-per-window for anti-abuse. Numeric behaviour control; role is "number" not CSS px but mapping to `number-css-px` since the role taxonomy has no plain integer-policy role. Alternative: defer until a numeric-policy role exists. |
| paymentEnabled | NEW: `paymentConfig` | boolean-visibility | Boolean toggling Stripe payment flow on submit. Reusable by booking, donation, e-commerce forms. |
| paymentAmount | NEW: `paymentConfig` | text-content | Currency amount string (Stripe-formatted). Same payment-config family. |
| paymentDescription | NEW: `paymentConfig` | text-content | Stripe charge description string. Same payment-config family. |
| progressBarColour | NEW: `progress` | colour-bg | Colour of the multi-step progress bar fill. Reusable by reading-progress, upload progress, loading indicators. |
| formFocusRingColour | NEW: `focusRing` | colour-border | Focus-ring outline colour applied to form fields. Reusable across every interactive block for a11y consistency. Sibling to existing `border` but semantically distinct (focus state only). |
| formFocusRingWidth | NEW: `focusRing` | number-css-px | Focus-ring outline width in px. |
| formFocusRingOpacity | NEW: `focusRing` | number-css-px | Focus-ring opacity 0-100 (treated as integer alpha %). |
| formFocusRingOffset | NEW: `focusRing` | number-css-px | Focus-ring offset distance in px. |

## sgs/media (25 attrs)

NOTE: `sgs/media` has no implementation directory under `plugins/sgs-blocks/src/blocks/`. The attribute set in `attribute_gap_candidates` is sourced from a planned/ghost block per `feedback_dont_delete_db_rows_on_ghost_verdict.md` (Bean's design intent: unified image-or-video container). Many attrs (`decorMedia`, `flipX`, `maxWidthPercent`, `overflow`, `parallaxStrength`, `fadeOnScroll`, `pathDrawOnScroll`, `pathDrawDurationMs`, `pathDrawTriggerOffset`, `pathDrawEasing`, `zIndex`) are mirrored from `sgs/decorative-image/block.json` (read for context). Video-related attrs presumed to mirror a video-player or hero backgroundVideo block.

| attr_name | Proposed canonical_slot | Proposed role | Rationale |
|---|---|---|---|
| decorMedia | `media` | image-object | Unified `{type, id, url, alt, aspectRatio}` object — replaces legacy imageId/imageUrl/imageAlt. Direct alias of `media` slot. |
| fadeOnScroll | `animation` | boolean-visibility | Toggle scroll-triggered fade animation; behaviour preset of `animation` slot. |
| flipX | NEW: `flip` | boolean-visibility | Horizontal mirror via `transform: scaleX(-1)`. Distinct from `rotation`. Reusable by hero, decorative-image, icon. Alternatively peel to `rotation` family. |
| imageId | `media` | image-object | Legacy WP attachment ID — replaced by `decorMedia.id`. Same slot, deprecated attr. |
| maxWidthPercent | `max` | number-css-percent | Percentage width cap; existing slot `max` aliases `maxWidth`/`maxHeight`. Role = percent. |
| mediaType | NEW: `mediaType` | select-from-enum | enum `image`/`video`/`svg`/`lottie`; discriminator for unified media block. No existing slot. Reusable by hero, gallery items. |
| overflow | NEW: `overflow` | select-from-enum | enum `visible`/`hidden`/`clip`/`auto`; CSS `overflow` property. Reusable by card, hero, gallery. |
| parallaxStrength | NEW: `parallax` | number-css-px (numeric) | Scroll-parallax intensity (0-100). Reusable by hero, decorative-image, backgrounds. |
| pathDrawDurationMs | `animation` | number-css-px (numeric ms) | SVG path-draw animation duration in ms; behaviour of `animation` slot. |
| pathDrawEasing | `animation` | select-from-enum | CSS easing keyword for path-draw. Same slot. |
| pathDrawOnScroll | `animation` | boolean-visibility | Boolean trigger path-draw on scroll. Same slot. |
| pathDrawTriggerOffset | `animation` | number-css-percent | Viewport % offset before triggering path-draw. Same slot. |
| playbackMode | NEW: `playback` | select-from-enum | enum `autoplay`/`click`/`hover`/`scroll`; video/lottie playback trigger. `autoplay` exists as a boolean slot but this is a discrete enum — broader. |
| videoAlt | `imageAlt` | text-content | Video alt/description text; alias of existing `imageAlt` (sensibly extends to video). |
| videoAttachmentId | `media` | image-object | WP attachment ID for self-hosted video. Same `media` slot, type-discriminated. |
| videoAutoplay | `autoplay` | boolean-visibility | Direct alias of existing `autoplay` slot. |
| videoControls | NEW: `playerControls` | boolean-visibility | Toggle native `<video controls>` chrome. Reusable by audio block, lottie. |
| videoLazyLoad | NEW: `lazyLoad` | boolean-visibility | Boolean — defer video src until intersect viewport. Reusable by gallery, embed, iframe. |
| videoLoop | NEW: `loop` | boolean-visibility | Boolean — `<video loop>`. Reusable by lottie, slider autoplay loop. |
| videoMuted | NEW: `muted` | boolean-visibility | Boolean — `<video muted>`. Required for autoplay in modern browsers. |
| videoPosterAttachmentId | `media` | image-object | Poster image attachment id; sub-property of `media` slot. |
| videoPosterUrl | `media` | image-object | Poster image URL (legacy alongside attachment id). |
| videoSchema | NEW: `seoSchema` | text-content | Schema.org/VideoObject JSON-LD descriptor block. Reusable by event block, product, review. |
| videoSource | NEW: `mediaSource` | select-from-enum | enum `upload`/`youtube`/`vimeo`/`url`; source-type discriminator. Pairs with `mediaType`. |
| zIndex | NEW: `zIndex` | number-css-px (numeric) | CSS `z-index` integer for stacking decorative media. Reusable by hero overlay, popup, sticky elements. |

## sgs/mobile-nav (52 attrs)

Full-screen mobile drawer with accordion submenus, spring-physics, swipe-to-close. Lots of responsive-modifier triplets (`Mobile`/`Tablet` overrides of a base) — these peel to the same canonical slot as the base.

| attr_name | Proposed canonical_slot | Proposed role | Rationale |
|---|---|---|---|
| accentColour | NEW: `accent` | colour-text | Accent colour applied to active link underline, focus rings, hover states. No existing slot — `variant` is enum, `border` is wrapper-level. Reusable across all interactive blocks. |
| animationPreset | `animation` | select-from-enum | enum `snappy`/`smooth`/`spring`/`bouncy`/`none`/`custom`; presets for drawer entry. |
| backdropBlur | NEW: `backdrop` | boolean-visibility | Boolean toggling `backdrop-filter: blur()` on modal scrim. Reusable by popup, lightbox, dialog. |
| backdropBlurAmount | NEW: `backdrop` | number-css-px | Blur radius in px. Same backdrop family. |
| backdropColour | NEW: `backdrop` | colour-bg | Scrim colour. Same family. |
| backdropOpacity | NEW: `backdrop` | number-css-percent | Scrim opacity 0-100. Same family. |
| breakpoint | NEW: `breakpoint` | number-css-px | Viewport px width below which the mobile nav activates. Cross-cutting; reusable by every responsive block. |
| closeButtonBg | `button` | colour-bg | Close button background colour. Direct `button` slot child. |
| closeButtonColour | `button` | colour-text | Close button icon/text colour. Same. |
| closeButtonSize | `button` | number-css-px | Close button square dimension px. Same. |
| closeButtonSizeMobile | `button` | number-css-px | Responsive-override of closeButtonSize at mobile breakpoint. Same. |
| closeButtonSizeTablet | `button` | number-css-px | Responsive-override at tablet breakpoint. Same. |
| closeButtonStyle | `button` | select-from-enum | enum `circle`/`square`/`plain`. Same. |
| contactDisplayMode | NEW: `displayMode` | select-from-enum | enum `icon-only`/`icon-text`/`hidden`; how contact shortcuts render. Reusable by socials, ctas, share-buttons. |
| ctaIcon | `button` | select-from-enum | Icon-name key for primary CTA. `button` slot sub-property; alias of `icon` within button context. |
| ctaText | `button` | text-content | Primary CTA label. |
| desktopHamburger | `hideOn` | boolean-visibility | Boolean — show hamburger on desktop (inverts default hideOn-desktop). Existing `hideOn` slot covers this family. |
| drawerPosition | `drawer` | select-from-enum | enum `top`/`centre`/`space-between`; drawer content vertical anchor. Existing `drawer` slot. |
| drawerText | `drawer` | colour-text | Drawer body text colour; existing `drawer` slot, colour child. |
| enableSwipe | NEW: `gesture` | boolean-visibility | Boolean — enable swipe-to-close. Behaviour control. Reusable by lightbox, gallery, carousel. |
| exitDuration | `animation` | number-css-px (numeric ms) | Exit animation duration in ms. `animation` slot child. |
| focusColour | NEW: `focusRing` | colour-border | Focus-outline colour for interactive elements inside drawer. Same `focusRing` family proposed in sgs/form. |
| linkActiveColour | `link` | colour-text | Active (current-page) link colour. `link` slot, active-state colour. |
| linkHoverColour | `link` | colour-text | Hover-state link colour. `link` slot, hover-state. |
| logoMaxWidth | NEW: `logo` | number-css-px | Logo max-width in px. Reusable by header, footer, mobile-nav. No existing slot. |
| logoMaxWidthMobile | NEW: `logo` | number-css-px | Responsive-override at mobile. |
| logoMaxWidthTablet | NEW: `logo` | number-css-px | Responsive-override at tablet. |
| secondaryCtaIcon | `buttonSecondary` | select-from-enum | Icon-name for secondary CTA. Direct `buttonSecondary` slot child. |
| secondaryCtaText | `buttonSecondary` | text-content | Secondary CTA label. Same. |
| showAccountTray | NEW: `feature` | boolean-visibility | Boolean — render user/account tray inside drawer. Visibility-feature flag pattern. Reusable across all configurable blocks. |
| showContactIcons | NEW: `feature` | boolean-visibility | Boolean — render contact icons. Same family. |
| showContactShortcuts | NEW: `feature` | boolean-visibility | Same family. |
| showCta | NEW: `feature` | boolean-visibility | Toggle primary CTA visibility. Same family. |
| showDividers | NEW: `feature` | boolean-visibility | Toggle separator lines between menu items. Same family. |
| showLogo | NEW: `feature` | boolean-visibility | Toggle logo render. Same family. |
| showSearch | NEW: `feature` | boolean-visibility | Toggle search input. Same family. |
| showSecondaryCta | NEW: `feature` | boolean-visibility | Toggle secondary CTA. Same family. |
| showSocials | NEW: `feature` | boolean-visibility | Toggle social icons. Same family. |
| showTagline | NEW: `feature` | boolean-visibility | Toggle tagline text. Same family. |
| showWhatsApp | NEW: `feature` | boolean-visibility | Toggle WhatsApp shortcut. Same family. |
| socialIconSize | `icon` | number-css-px | Social icon dimension px. Direct `icon` slot, size child (existing alias `iconSize`). |
| socialIconSizeMobile | `icon` | number-css-px | Responsive-override at mobile. |
| socialIconSizeTablet | `icon` | number-css-px | Responsive-override at tablet. |
| socialStyle | `variant` | select-from-enum | enum `coloured`/`plain`/`outline`; visual variant of social icons. `variant` slot. |
| sublinkColour | `link` | colour-text | Submenu link colour. `link` slot, sublink modifier. Alternatively NEW `sublink` slot if submenu deserves its own slot family. |
| sublinkFontSize | `link` | font-size-preset | Submenu link font-size preset/value. |
| sublinkFontSizeMobile | `link` | font-size-preset | Responsive-override at mobile. |
| sublinkHoverColour | `link` | colour-text | Hover-state colour for submenu link. |
| submenuIndent | NEW: `indent` | number-css-px | Left padding/indent of submenu items in px. Reusable by tree-nav, breadcrumb, list. |
| submenuIndentMobile | NEW: `indent` | number-css-px | Responsive-override at mobile. |
| submenuIndentTablet | NEW: `indent` | number-css-px | Responsive-override at tablet. |
| taglineText | NEW: `tagline` | text-content | Optional tagline string under the logo. Reusable by header, footer, hero. |

## Summary

- **Total attrs proposed:** 101 (4 + 20 + 25 + 52)
- **Existing-slot reuse:** 41
  - `button` (8), `buttonSecondary` (2), `link` (5), `icon` (3), `media` (5), `animation` (6), `drawer` (2), `variant` (2), `autoplay` (1), `hideOn` (1), `max` (1), `imageAlt` (1), `featuredImage` n/a, `width`/`size` ambiguous (1)
- **New-slot proposals:** 22 unique new slots
  1. `floatingPosition` — corner anchor enum (back-to-top, popup, cookie-banner, chat-widget)
  2. `scrollThreshold` — px scroll-distance trigger (back-to-top, reading-progress, sticky-reveal)
  3. `size` — generic square dimension px (cross-block; could be folded into `width`)
  4. `identifier` — stable id + human name (form, popup, accordion)
  5. `successFeedback` — post-action confirmation message (form, booking, payment)
  6. `securityFeature` — behaviour flag family (honeypot, storeSubmissions, requireLogin, rateLimit)
  7. `paymentConfig` — Stripe payment fields (form, booking, donation)
  8. `progress` — progress-bar colour/state (form steps, reading-progress, upload)
  9. `focusRing` — a11y focus outline family (form, mobile-nav, every interactive block)
  10. `flip` — horizontal/vertical mirror transform (media, icon, hero)
  11. `mediaType` — image/video/svg/lottie discriminator (media, hero, gallery)
  12. `overflow` — CSS overflow enum (card, hero, gallery)
  13. `parallax` — parallax strength (hero, decorative-image)
  14. `playback` — autoplay/click/hover/scroll trigger enum
  15. `playerControls` — native chrome toggle (video, audio)
  16. `lazyLoad` — defer load flag (media, embed, iframe)
  17. `loop` — repeat playback (video, lottie, carousel)
  18. `muted` — audio mute (video)
  19. `seoSchema` — JSON-LD schema descriptor (video, event, product, review)
  20. `mediaSource` — upload/youtube/vimeo/url enum
  21. `zIndex` — stacking integer (hero overlay, popup, sticky)
  22. `accent` — accent colour (cross-block hover/active highlight)
  23. `backdrop` — modal scrim family (mobile-nav, popup, lightbox, dialog)
  24. `breakpoint` — responsive trigger px (every responsive block)
  25. `displayMode` — icon-only/icon-text/hidden enum (socials, ctas, shortcuts)
  26. `gesture` — swipe/drag behaviour flag (lightbox, gallery, carousel, mobile-nav)
  27. `logo` — logo-specific sizing (header, footer, mobile-nav)
  28. `feature` — boolean visibility-feature flag family (catch-all for showX toggles)
  29. `indent` — list/submenu indent px (tree-nav, breadcrumb)
  30. `tagline` — optional tagline string (header, footer, hero)

(Count 22 was wrong — actual 30 distinct new-slot proposals. Some are clustered families used multiple times.)

### Open judgement calls flagged for human review

1. **`size` vs `width`** — `width` is the existing slot but tends to be percent/layout. `size` would be cleaner for square px dimensions. Recommend introducing `size` and aliasing `closeButtonSize`/`socialIconSize`/`logoMaxWidth` to it.
2. **`feature` mega-slot** — 10 showX booleans collapsed into one slot. Alternative: keep them as individual canonical slots (`accountTray`, `contactShortcuts`, etc.). The `feature` proposal trades specificity for cardinality reduction.
3. **`focusRing` vs `border`** — focus-ring is semantically distinct from border (state-triggered), but they share visual properties. Proposed as separate slot; reviewer may prefer folding into `border` with a `:focus` modifier.
4. **Responsive-modifier triplets** — proposed approach: same canonical_slot as base, modifier captured separately. Alternative: `<slot>Mobile`/`<slot>Tablet` as canonical_slot themselves. Recommend the former (modifier captured outside the slot dimension).
5. **`videoAlt` → `imageAlt`** — extending `imageAlt` to cover video. Cleaner alternative: rename slot to `mediaAlt` (would touch existing rows).
6. **`rateLimit` role** — integer policy value, not a CSS px. Mapped to `number-css-px` for taxonomy compatibility; flag for a future `number-policy` role.

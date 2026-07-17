# Phase 3.5 Fan-out A3 — Per-Block Attribute Classification

**Branch:** A3
**Blocks:** sgs/team-member (19), sgs/announcement-bar (18), sgs/icon-list (16), sgs/trustpilot-reviews (15), sgs/container (14), sgs/google-reviews (13), sgs/cta-section (5) — **100 attributes**
**Vocabulary:** 55 canonical slots + 20 roles
**Rule:** Reuse existing slots wherever a sensible match exists; propose NEW only when no slot fits.

---

## sgs/team-member (19 attrs)

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| bio | text | richtext-content | Paragraph body content; aliases include `description`. |
| blockLink | link | link-href | Legacy block-link URL; matches `link` slot (aliases: url, href, anchor). |
| blockLinkTarget | linkOpensNewTab | boolean-visibility | New-tab toggle; matches `linkOpensNewTab` slot (alias: target). |
| hoverOverlay | hover | boolean-visibility | Hover-state overlay toggle; `hover` slot covers hover-state behaviour. |
| memberMedia | media | image-object | Polymorphic image; matches `media` slot (aliases: image, photo). |
| photoShape | variant | select-from-enum | circle/square/rounded enum on the photo; `variant` slot covers stylistic enums. |
| role | label | text-content | Person role label (eyebrow/tag-like); matches `label` slot. |
| roleColour | label | colour-text | Text colour for the role label. |
| sgsBlockLink | link | link-href | sgs-prefixed duplicate of blockLink. |
| sgsBlockLinkTarget | linkOpensNewTab | boolean-visibility | sgs-prefixed duplicate of blockLinkTarget. |
| sgsHoverBgColour | hover | colour-bg | Hover-state background colour. |
| sgsHoverBorderColour | hover | colour-border | Hover-state border colour. |
| sgsHoverDuration | transition | transition-preset | Transition duration token (slow/medium/fast). |
| sgsHoverGrayscale | hover | boolean-visibility | Hover-state grayscale filter toggle. |
| sgsHoverImageZoom | hover | boolean-visibility | Hover-state inner image-zoom toggle. |
| sgsHoverScale | hover | number-css-percent | Hover-state scale factor (numeric multiplier). |
| sgsHoverShadow | hover | shadow-preset | Hover-state shadow preset token. |
| sgsHoverTextColour | hover | colour-text | Hover-state text colour. |
| socialLinks | items | query-descriptor | Repeating list of social-link objects; matches `items` slot. |

---

## sgs/announcement-bar (18 attrs)

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| closeBehaviour | variant | select-from-enum | session/persistent/none enum controlling dismissal persistence. |
| cookieDays | number | number-css-px | Numeric duration in days for the dismissal cookie. |
| countdownEndAction | variant | select-from-enum | hide/show-message enum for countdown completion. |
| countdownEndMessage | text | text-content | Replacement message string after countdown ends. |
| dismissible | dismissible | boolean-visibility | Close-affordance toggle. **Proposed NEW slot:** `dismissible`. |
| endDate | date | text-content | ISO end date for scheduled visibility window. |
| fontSize | text | font-size-preset | Typography font-size preset on the bar text. |
| messages | items | query-descriptor | Repeating array of message objects (text/ctaText/ctaUrl). |
| position | variant | select-from-enum | top/bottom enum for banner placement. |
| rotationInterval | autoplaySpeed | number-css-px | Rotation interval ms — matches `autoplaySpeed` slot semantics. |
| rotationType | variant | select-from-enum | fade/slide transition variant for message rotation. |
| showDays | showDays | boolean-visibility | Countdown-unit visibility. **Proposed NEW slot:** `showDays`. |
| showHours | showHours | boolean-visibility | Countdown-unit visibility. **Proposed NEW slot:** `showHours`. |
| showMinutes | showMinutes | boolean-visibility | Countdown-unit visibility. **Proposed NEW slot:** `showMinutes`. |
| showSeconds | showSeconds | boolean-visibility | Countdown-unit visibility. **Proposed NEW slot:** `showSeconds`. |
| startDate | date | text-content | ISO start date for scheduled visibility window. |
| sticky | variant | boolean-visibility | Sticky-position boolean; structural variant of placement behaviour. |
| targetDate | date | text-content | ISO countdown target date. |

**Proposed NEW slots (announcement-bar):** `dismissible`, `showDays`, `showHours`, `showMinutes`, `showSeconds` — parallel to existing `showDots`/`showArrows`/`showDate` pattern.

---

## sgs/icon-list (16 attrs)

These 16 attrs are legacy/proposed (not in current block.json). They model an advanced bullet/marker system with sub-list nesting.

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| bulletChar | icon | text-content | Custom bullet character string; slot=icon (alias: glyph, symbol). |
| dividers | separator | boolean-visibility | Toggle for between-item dividers; matches `separator` slot. |
| emojiChar | icon | text-content | Emoji character used as bullet marker. |
| letterCase | variant | select-from-enum | Upper/lower/title case enum for alphabetic markers (a/A/i/I). |
| markerPattern | variant | select-from-enum | Pattern enum for marker rendering (solid/outline/filled). |
| markerType | variant | select-from-enum | Marker type enum (icon/bullet/emoji/number/letter). |
| mode | variant | select-from-enum | Top-level list mode (unordered/ordered/checklist). |
| subBulletChar | subIcon | text-content | Sub-list bullet character. **Proposed NEW slot:** `subIcon`. |
| subEmojiChar | subIcon | text-content | Sub-list emoji character. |
| subIcon | subIcon | text-content | Sub-list icon glyph. |
| subIndent | padding | spacing-token | Indent amount for sub-list (left padding). |
| subLetterCase | variant | select-from-enum | Case enum for sub-list alphabetic markers. |
| subMarkerPattern | variant | select-from-enum | Pattern enum for sub-list markers. |
| subMarkerType | variant | select-from-enum | Marker type enum for sub-list. |
| subMode | variant | select-from-enum | Sub-list mode (unordered/ordered/checklist). |
| subNumberStyle | variant | select-from-enum | Numbering style for ordered sub-lists (decimal/lower-roman/upper-roman). |

**Proposed NEW slot (icon-list):** `subIcon` — nested-list icon glyph (parallel to existing `icon`).

---

## sgs/trustpilot-reviews (15 attrs)

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| businessUnitUrl | link | text-content | External Trustpilot business-profile URL used by the sync backend. |
| dataSource | variant | select-from-enum | inline/synced/placeholder enum controlling data origin. |
| reviews | items | query-descriptor | Repeating list of review objects (inline or synced). |
| reviewsAverage | rating | number-css-percent | Aggregate rating average; matches `rating` slot. |
| showAuthor | showAuthor | boolean-visibility | Reviewer name visibility. **Proposed NEW slot:** `showAuthor`. |
| showSchema | showSchema | boolean-visibility | JSON-LD schema emission. **Proposed NEW slot:** `showSchema`. |
| showSourceHeader | showSourceHeader | boolean-visibility | Top header band visibility. **Proposed NEW slot:** `showSourceHeader`. |
| showSubtitle | showSubtitle | boolean-visibility | Subtitle line visibility. **Proposed NEW slot:** `showSubtitle`. |
| showTrustpilotLogo | showLogo | boolean-visibility | Brand logo visibility. **Proposed NEW slot:** `showLogo` (covers Trustpilot + Google). |
| showVerifiedBadge | showVerifiedBadge | boolean-visibility | Per-review verified badge. **Proposed NEW slot:** `showVerifiedBadge`. |
| subtitleText | subheading | text-content | Subtitle string; matches `subheading` slot. |
| theme | variant | select-from-enum | light/dark enum for card theme. |
| totalReviews | number | number-css-px | Total review count integer. |
| trustScore | rating | number-css-percent | Numeric trust score 0–5. |
| trustScoreLabel | label | text-content | Text label for trust score ("Excellent"). |

**Proposed NEW slots (trustpilot-reviews):** `showAuthor`, `showSchema`, `showSourceHeader`, `showSubtitle`, `showLogo`, `showVerifiedBadge`.

---

## sgs/container (14 attrs)

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| backgroundOverlayColour | overlay | colour-bg | Overlay tint colour on background; matches `overlay` slot. |
| backgroundOverlayOpacity | overlay | number-css-percent | Overlay opacity 0–100; same slot. |
| htmlTag | htmlTag | select-from-enum | section/div/article/aside enum. **Proposed NEW slot:** `htmlTag`. |
| shapeDividerBottom | shapeDividerBottom | enum-class-probe | Shape-divider SVG enum at bottom edge. **Proposed NEW slot:** `shapeDividerBottom`. |
| shapeDividerBottomColour | shapeDividerBottom | colour-bg | Fill colour of bottom shape divider. |
| shapeDividerBottomFlip | shapeDividerBottom | boolean-visibility | Horizontal flip toggle for bottom divider. |
| shapeDividerBottomHeight | shapeDividerBottom | number-css-px | Height in px of bottom divider SVG. |
| shapeDividerBottomInvert | shapeDividerBottom | boolean-visibility | Vertical invert toggle for bottom divider. |
| shapeDividerTop | shapeDividerTop | enum-class-probe | Shape-divider SVG enum at top. **Proposed NEW slot:** `shapeDividerTop`. |
| shapeDividerTopColour | shapeDividerTop | colour-bg | Fill colour of top shape divider. |
| shapeDividerTopFlip | shapeDividerTop | boolean-visibility | Horizontal flip toggle for top divider. |
| shapeDividerTopHeight | shapeDividerTop | number-css-px | Height in px of top divider SVG. |
| shapeDividerTopInvert | shapeDividerTop | boolean-visibility | Vertical invert toggle for top divider. |
| verticalAlign | verticalAlign | select-from-enum | start/center/end enum for vertical alignment. **Proposed NEW slot:** `verticalAlign`. |

**Proposed NEW slots (container):** `htmlTag`, `verticalAlign`, `shapeDividerTop`, `shapeDividerBottom` — container-layout primitives not in existing 55-slot vocabulary. Shape dividers warrant dedicated slots rather than overloading `separator` (which is for between-item rules).

---

## sgs/google-reviews (13 attrs)

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| excludeKeywords | excludeKeywords | query-descriptor | Filter string excluding reviews matching keywords. **Proposed NEW slot:** `excludeKeywords`. |
| maxReviews | number | number-css-px | Maximum review count to render. |
| minRating | rating | number-css-percent | Minimum star rating filter. |
| placeId | placeId | query-descriptor | Google Place ID — external API binding key. **Proposed NEW slot:** `placeId`. |
| reviewRequestUrl | link | link-href | URL for "leave a review" CTA target. |
| showAggregate | showAggregate | boolean-visibility | Aggregate rating block visibility. **Proposed NEW slot:** `showAggregate`. |
| showAvatar | showAvatar | boolean-visibility | Reviewer avatar image visibility. **Proposed NEW slot:** `showAvatar`. |
| showBreakdown | showBreakdown | boolean-visibility | Star-rating breakdown bars visibility. **Proposed NEW slot:** `showBreakdown`. |
| showGoogleLogo | showLogo | boolean-visibility | Google brand logo visibility — reuses proposed `showLogo` slot. |
| sortBy | variant | select-from-enum | newest/highest/lowest enum for review ordering. |
| starColour | rating | colour-text | Star colour token for rating display. |
| textOnly | variant | boolean-visibility | Filter to only show reviews with text body. |
| theme | variant | select-from-enum | light/dark/transparent enum for theme. |

**Proposed NEW slots (google-reviews):** `placeId`, `excludeKeywords`, `showAggregate`, `showAvatar`, `showBreakdown`. `showGoogleLogo` reuses proposed `showLogo` slot.

---

## sgs/cta-section (5 attrs)

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| buttonSize | button | select-from-enum | xs/sm/md/lg/xl size enum applied to button(s). |
| buttons | items | query-descriptor | Repeating array of button objects (text/style/url). |
| gradientPreset | backgroundMedia | colour-gradient | Named gradient preset token applied to background; slot=backgroundMedia (covers background colour/gradient/image/video). |
| ribbon | badge | text-content | Decorative ribbon text band above CTA; matches `badge` slot (alias: pill). |
| stats | items | query-descriptor | Repeating array of stat objects (number + label). |

---

## Summary

| Metric | Count |
|---|---|
| Total attributes classified | 100 |
| Reused existing slots | 77 |
| Proposed NEW slots (unique) | 21 |
| Roles drawn from 20-role taxonomy | 100% |
| DB writes | 0 (read-only) |

### Proposed NEW canonical slots (21 unique)

| New slot | First-introduced by | Pattern |
|---|---|---|
| `dismissible` | announcement-bar | boolean-visibility (close affordance on banners/modals/popups) |
| `showDays` | announcement-bar | boolean-visibility (countdown unit) |
| `showHours` | announcement-bar | boolean-visibility (countdown unit) |
| `showMinutes` | announcement-bar | boolean-visibility (countdown unit) |
| `showSeconds` | announcement-bar | boolean-visibility (countdown unit) |
| `subIcon` | icon-list | text-content (nested-list icon glyph, parallel to `icon`) |
| `showAuthor` | trustpilot-reviews / google-reviews | boolean-visibility |
| `showSchema` | trustpilot-reviews | boolean-visibility (JSON-LD emission) |
| `showSourceHeader` | trustpilot-reviews | boolean-visibility (review-source header band) |
| `showSubtitle` | trustpilot-reviews | boolean-visibility |
| `showLogo` | trustpilot-reviews / google-reviews | boolean-visibility (review-source brand logo) |
| `showVerifiedBadge` | trustpilot-reviews | boolean-visibility |
| `htmlTag` | container | select-from-enum (semantic wrapper element) |
| `verticalAlign` | container | select-from-enum (layout cross-axis alignment) |
| `shapeDividerTop` | container | composite (svg shape + colour + height + flip + invert) |
| `shapeDividerBottom` | container | composite (mirror of shapeDividerTop) |
| `placeId` | google-reviews | query-descriptor (external API binding key) |
| `excludeKeywords` | google-reviews | query-descriptor (filter string) |
| `showAggregate` | google-reviews | boolean-visibility |
| `showAvatar` | google-reviews | boolean-visibility |
| `showBreakdown` | google-reviews | boolean-visibility |

**Note to consolidator:** The seven `show*` boolean-visibility slots could collapse into one generic `showFeature` slot keyed by feature name — but the existing pattern (`showDots`, `showArrows`, `showDate`) is already per-feature, so per-feature is the consistent choice. Recommend keeping per-feature slots.

**No DB writes performed.** Read-only classification.

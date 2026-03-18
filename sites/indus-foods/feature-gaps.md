# Indus Foods — Feature Gaps Log

Gaps identified during homepage replication comparison (2026-03-18).
Each gap represents a visual property that cannot be achieved through block attributes alone.

## Homepage Feature Gaps

| Block | Missing Feature | What it would control | Reference value | Severity |
|---|---|---|---|---|
| `sgs/hero` | Animated SVG background | Background with CSS/SVG animation (mountain + sun rays) | Custom SVG with keyframe animations | Low — gold gradient is an acceptable alternative |
| `sgs/hero` | Content width control | Max-width of content area within hero | ~50% width on desktop | Medium — content currently spans full width |
| `sgs/hero` | Split image max-height | Constrain split image height | ~400px | Low — image scales acceptably |
| Service cards (core/group + core/image) | Circular image clipping | `border-radius: 50%` + `overflow: hidden` on images | Circle-cropped food images | Medium — reference uses circular images, SGS uses rectangular |
| `sgs/brand-strip` | Distinct logo count | More than 4 unique logos in the strip | 8 unique brand logos | Content — need to upload more brand logos |
| `sgs/testimonial-slider` | Side image | Decorative image beside the testimonial carousel | Bakar Khani food image on right side | Low — SGS version focuses on testimonial cards |
| `sgs/info-box` | Icon style variants | Filled vs outline vs coloured circle icon styles | Reference uses coloured filled icons, SGS uses Lucide line icons | Medium — visual weight differs |
| CTA section (core/group) | Background colour mismatch | CTA section uses gold (#D8CA50), reference uses dark teal | dark teal #2C3E50 | Content — change via editor |

## Token Gaps

| Token | Current | Needed | Notes |
|---|---|---|---|
| `footer-bg` | `#0A7EA8` (teal) | `#2C3E50` (dark navy) | Reference footer is dark navy, not teal |

## Content Gaps (fixable via editor, not code)

| Item | Status | Notes |
|---|---|---|
| Brand logos | Only 4 unique logos | Need Indus Foods logo, Falak Rice, additional brand logos |
| Service card button labels | Slightly different from reference | "Top Ethnic Food Services" vs reference's same |
| Testimonial avatars | Using initials (SM, RP, DC, FK) | Reference has some with photos |
| Header top bar | Shows on some loads, not others | Template uses `header-sticky` which has top bar; caching inconsistency |

## Summary

- **Total feature gaps:** 8
- **Code-required (new attributes):** 4 (hero content width, circular images, side image, icon variants)
- **Content-only (editor fix):** 3 (brand logos, CTA bg colour, footer token)
- **Accepted differences:** 1 (animated SVG background)

None of these gaps are blocking. The homepage is functional and visually close to the reference. The gaps should be addressed in priority order during framework development.

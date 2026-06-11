# D8 — Testimonial variant rebuild — BUILD CONTRACT (Bean-approved 2026-06-11)

Status: APPROVED for build. Typed-attr, variant-driven rebuild of sgs/testimonial.
Reference mechanism: sgs/hero (variant system). Container-mirror: keep WS-4 CONTENT-kind wrapper.

## Bean's locked decisions
- **7 variants** (fold old dark `featured` into pull-quote-editorial as a colour treatment).
- **Visual thumbnail picker** in the editor (ToggleGroup / thumbnail grid — clients pick by eye).
- **rating-led** = ONE variant with a `ratingType` toggle (`stars` | `scale`). **Rating is FULLY OPTIONAL** — many testimonials have no score; showing ANY rating is gated (no rating set → no rating node at all, in every variant).
- **Typed attrs** (not child blocks); block renders its own elements → per-element typography controls are legitimate (D192 carve-in).
- **Avatar = gated attr** — empty photo → NO node, NO empty box, NO initials placeholder.

## Field taxonomy (typed attrs; every field optional + gated unless noted)
| attr | type | default | empty-handling | used by variants |
|---|---|---|---|---|
| `variant` | string enum (7) | `classic-card` | — | all (discriminator) |
| `quote` | string | `""` | empty → no quote node | all |
| `summaryPhrase` | string | `""` | empty → no pull-quote node | pull-quote-editorial, case-study-media |
| `reviewerName` | string | `""` | empty → no name | all |
| `reviewerRole` | string | `""` | empty → no role | all |
| `orgName` | string | `""` | empty → no org | all |
| `avatarMedia` | object | `null` | empty → no img/node (NO initials) | classic-card, avatar-spotlight, corporate-logo |
| `orgLogo` | object | `null` | empty → no logo | corporate-logo, case-study-media |
| `workMedia` | object {url,type:image\|video,id,alt,mime} | `null` | empty → no media | case-study-media |
| `showRating` | boolean | `false` | false → NO rating node (rating fully optional) | rating-led, classic-card |
| `ratingType` | string enum `stars`\|`scale` | `stars` | only when showRating | rating-led |
| `ratingStars` | number 0–5 | `0` | 0 or !showRating → none | rating-led, classic-card |
| `ratingScale` | number | `0` | 0 or type!=scale → none | rating-led |
| `ratingScaleMax` | string | `"10"` | only with ratingScale | rating-led |
| `reviewDate` | string | `""` | empty → none | rating-led |
| `verified` | boolean | `false` | false → no badge | rating-led |
| `sourcePlatform` | string | `""` | empty → none | rating-led |
| `schemaEnabled` | boolean | `false` | off → no JSON-LD | all |
| per-element typography: `quoteFontSize`,`quoteColour`,`summaryFontSize`,`summaryColour`,`nameColour`,`roleColour`,`ratingColour` | string | `""` | empty → CSS token default via `:not([style*="color"])` | all |
| KEEP verbatim: the WS-4 container-mirror CONTENT attrs (widthMode/customWidth/contentWidth/maxWidth) + hover/animation attrs already in block.json | — | — | — | all |

RETIRE: the `style` enum (replaced by `variant`); collapse dual `avatar`+`authorMedia` → single `avatarMedia` (render.php keeps a one-way READ of legacy `avatar.url` for migration only — NOT an empty($content) fallback; R-22-14-compliant).

## 7 variants (supports.sgs.variants discriminating-slot map)
```
classic-card         -> [ratingStars]          (default; quote + footer attribution, avatar-left)
pull-quote-editorial -> [summaryPhrase]        (big summary phrase, quote secondary; absorbs old 'featured' dark treatment as a colour option)
rating-led           -> [ratingScale, verified, reviewDate, sourcePlatform]  (score/verified/date row; e-commerce)
avatar-spotlight     -> [avatarMedia]          (large avatar leads; coaching/healthcare)
corporate-logo       -> [orgLogo]              (org logo leads; B2B/trade)
case-study-media     -> [workMedia]            (image/video of the work; trades/caterers/studios)
minimal-quote        -> []                     (typography only, accent border; fallback when no discriminator — law/luxury)
```
Note: classic-card uses `ratingStars`, rating-led uses `ratingScale` — distinct discriminators to avoid FR-22-20 detection ties.

## Variant mechanism (wire like hero)
- block.json: `supports.sgs.variantAttr: "variant"` + `supports.sgs.variants` map above + the `variant` enum attr (7 values) + keep `supports.sgs.containerKind: "content"`.
- edit.js: a VISUAL thumbnail picker (ToggleGroupControl or a custom thumbnail grid) bound to `variant`; per-variant inspector panels gated on `variant === '...'`; per-variant defaults seeded on switch; per-element RichText + typography controls; gated avatar/logo/work MediaUpload.
- render.php: `$variant = $attributes['variant'] ?? 'classic-card'`; wrapper class `sgs-testimonial--{variant}` (sanitize_html_class); gated nodes per field; keep `SGS_Container_Wrapper::render(..., 'content', ...)`; schema reads the scalar attrs.
- style.css: shared rules + `.sgs-testimonial--{variant}` layout blocks (grids for avatar-spotlight/case-study-media); reduced-motion + `:not([style*="color"])` fallbacks.

## Migration (HIGH RISK — separate step + adversarial-council)
save.js changes (InnerBlocks → typed/no-inner). deprecated.js needs a v8 migrate handling BOTH legacy shapes:
1. pre-FR-22-6 scalar posts (`quote`/`name`/`role`/`rating`/`avatar`/`style`) → map to typed attrs (`reviewerName`←name, `ratingStars`←rating + `showRating:true`, `avatarMedia`←avatar, `variant`← style map: card→classic-card, minimal→minimal-quote, featured→pull-quote-editorial).
2. FR-22-6 InnerBlocks posts → HOIST child-block text (quote/name/role from innerBlocks) back into typed attrs, drop children.
R-22-14: no server-side legacy fallback hack in render.php (the one-way avatar read is synthesise-on-read, compliant). Back-compat = the migrate + WP-CLI batch.

## Converter compatibility (cloning thread follow-on; block works standalone without it)
Routing map draft class → typed attr: `__quote`/`__text`→quote, `__author`/`__name`→reviewerName, `__role`→reviewerRole, `__org`→orgName, `__summary`/`__pullquote`→summaryPhrase, `__stars`→ratingStars (+showRating), `__score`(N/M)→ratingScale+ratingScaleMax, `__avatar img`→avatarMedia, `__logo img`→orgLogo, `__work` img/video→workMedia, `__date`/`__verified`/`__source`→reviewDate/verified/sourcePlatform. Needs slots rows + blocks.variant_attr=variant + variant_slots (via /sgs-update) + FR-22-20 generalisation (testimonial = 2nd variant block onboarded). DEFERRED to cloning thread — does not block the block build.

## Build order
1. block.json (schema) — foundation. 2. render.php + 3. style.css + 4. edit.js (core build). 5. deprecated.js v8 + save.js (migration, adversarial-council). 6. /sgs-update. 7. converter (deferred). Gates: build (dead-control + Gate B) → /sgs-update → deploy → /qc-council → /visual-qa 375/768/1440 → block-renderer per-variant live-verify → Bean R-22-13.

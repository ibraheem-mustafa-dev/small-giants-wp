# Repeater item fields: role, control and value kinds (2026-10-30)

What each SGS block's repeater item fields can hold, read from the block's editor controls (edit.js, its inspector components and the shared controls it delegates to) and its render.php. Each field's role is declared in its block.json `items.properties.<field>.role`, seeded into `array_item_schema.role`; `python plugins/sgs-blocks/scripts/check-item-field-roles.py --check` keeps every field declared. Input to the block-recognition design.

## Marker and icon kinds a block's controls offer

- `sgs/icon-list`: `markerType` icon, emoji, bullet, numbered, none (SelectControl; `numbered` renders an `<ol>`, `bullet` and `numbered` a native `::marker`); `numberFormat` decimal, decimal-leading-zero (numbered only); each item's icon and the default icon through IconPicker with the sources render.php draws: lucide, emoji, wp-icon, dashicon (brand and custom SVG are not drawn, so the picker no longer offers them). Fill's marker reader (`scripts/computed-route/lib/fill-list-marker.mjs`) maps an svg to icon, a glyph to emoji (written to `iconName`, the item field whose role is `icon`, with `iconSource` emoji), a dot, bar, disc, circle or square to bullet, a typed ordinal, counter or numeric list style to numbered with its number style; a value the DB's enum for the setting does not list is a named row.
- `sgs/form-field-tiles`: each tile's icon through IconPicker, sources lucide and emoji (render.php draws a Lucide icon or prints an emoji; any other source printed its slug as text, so the picker no longer offers them).
- `sgs/trust-bar`, `sgs/process-steps`, `sgs/pricing-table`, `sgs/card-grid` (glyph), `sgs/timeline`: Lucide only (IconPicker `sources={['lucide']}`); trust-bar also renders `iconSvg`, which only the cloning icon resolver writes.
- No other repeater draws a marker or icon per item.

## Every field

| Block | Field | Role | Type | Control that sets it | Value kinds it accepts |
|---|---|---|---|---|---|
| `sgs/brand-strip` | `logos.media` | image-object | anyOf | MediaPicker | image object {url,type,id,alt,mime,width,height}, a bare URL string, or null |
| `sgs/brand-strip` | `logos.alt` | image-alt | string | TextControl | free text |
| `sgs/brand-strip` | `logos.decorative` | boolean-visibility | boolean | ToggleControl | true/false |
| `sgs/brand-strip` | `logos.linkUrl` | url-href | string | LinkPopoverField (Spec 35 link standard) | URL (http/https/mailto/tel/relative) |
| `sgs/brand-strip` | `logos.linkUrlSource` | enum-mode | string | LinkPopoverField (Spec 35 link standard) source picker | '' (typed url), post:<id>, a Site Info link (phone, email, whatsapp, directions, google, facebook, instagram, twitter, linkedin, youtube, tiktok), top |
| `sgs/brand-strip` | `logos.linkTarget` | behaviour | string | LinkPopoverField (Spec 35 link standard) new-tab toggle | '_self' or '_blank' |
| `sgs/brand-strip` | `logos.linkRel` | technical | string | LinkPopoverField (Spec 35 link standard) rel field | rel tokens |
| `sgs/brand-strip` | `logos.name` | text-content | string | TextControl | free text |
| `sgs/brand-strip` | `logos._key` | technical | string | none (generateItemKey on add) | opaque id |
| `sgs/brand-strip` | `logos.objectFit` | visual | string | SelectControl | object-fit keyword (cover, contain, fill, none, scale-down) or empty for the block default |
| `sgs/card-grid` | `items.title` | text-content | string | TextControl | free text |
| `sgs/card-grid` | `items.subtitle` | text-content | string | TextControl | free text |
| `sgs/card-grid` | `items.media` | image-object | anyOf | MediaPicker | image object {url,id,alt,...} or URL |
| `sgs/card-grid` | `items.badge` | text-content | string | TextControl | free text |
| `sgs/card-grid` | `items.link` | url-href | string | LinkPopoverField (Spec 35 link standard) | URL |
| `sgs/card-grid` | `items.linkSource` | enum-mode | string | LinkPopoverField (Spec 35 link standard) source picker | '' (typed url), post:<id>, a Site Info link (phone, email, whatsapp, directions, google, facebook, instagram, twitter, linkedin, youtube, tiktok), top |
| `sgs/card-grid` | `items.linkTarget` | behaviour | string | LinkPopoverField (Spec 35 link standard) new-tab toggle | '_self' or '_blank' |
| `sgs/card-grid` | `items.linkRel` | technical | string | LinkPopoverField (Spec 35 link standard) rel field | rel tokens |
| `sgs/card-grid` | `items.badgeVariant` | css-modifier | string | SelectControl | '' , success, accent, primary (BEM --modifier) |
| `sgs/card-grid` | `items.decorative` | boolean-visibility | boolean | ToggleControl | true/false |
| `sgs/card-grid` | `items.glyph` | icon-slug | string | IconPicker sources=['lucide'] | Lucide slug |
| `sgs/card-grid` | `items.glyphImage` | image-object | anyOf | MediaPicker | image object {url,id,alt} |
| `sgs/card-grid` | `items._key` | technical | string | none (generateItemKey on add) | opaque id |
| `sgs/card-grid` | `items.objectFit` | visual | string | SelectControl | object-fit keyword (cover, contain, fill, none, scale-down) or empty for the block default |
| `sgs/card-grid` | `items.focalPoint` | visual | object | FocalPointPicker | {x,y} fractions 0..1 (object-position) |
| `sgs/choice-flow-question` | `options.summaryText` | text-content | string | TextControl | free text |
| `sgs/choice-flow-question` | `options.stageEffect` | enum-mode | string | SelectControl | '' , dim, deepen, soften, brighten |
| `sgs/choice-flow-question` | `options.label` | text-content | string | TextControl | free text |
| `sgs/choice-flow-question` | `options.value` | technical | string | TextControl | free text |
| `sgs/choice-flow-question` | `options.nextStepId` | technical | string | SelectControl (the flow's steps) | a step id of the same flow, or empty |
| `sgs/choice-flow-question` | `options.tags` | technical | array | TextControl (comma list) | array of tag strings |
| `sgs/choice-flow-question` | `options.image` | image-object | object | MediaPicker | image object {id,url,alt} or null |
| `sgs/choice-flow-question` | `options.helpText` | text-content | string | TextareaControl | free text |
| `sgs/choice-flow-question` | `options.addToBagNow` | boolean-visibility | boolean | ToggleControl | true/false |
| `sgs/choice-flow-question` | `options.isDefault` | state-modifier-boolean | boolean | ToggleControl | true on at most one option (the first wins) |
| `sgs/choice-flow-question` | `options.badge` | text-content | string | TextControl | free text |
| `sgs/choice-flow-question` | `options.description` | text-content | string | TextareaControl | free text |
| `sgs/form-field-checkbox` | `options.value` | technical | string | TextControl | free text |
| `sgs/form-field-checkbox` | `options.label` | text-content | string | TextControl | free text |
| `sgs/form-field-checkbox` | `options.checked` | state-modifier-boolean | boolean | ToggleControl | true/false |
| `sgs/form-field-radio` | `options.value` | technical | string | TextControl | free text |
| `sgs/form-field-radio` | `options.label` | text-content | string | TextControl | free text |
| `sgs/form-field-select` | `options.value` | technical | string | TextControl | free text |
| `sgs/form-field-select` | `options.label` | text-content | string | TextControl | free text |
| `sgs/form-field-tiles` | `tiles.label` | text-content | string | TextControl | free text |
| `sgs/form-field-tiles` | `tiles.value` | technical | string | TextControl | free text |
| `sgs/form-field-tiles` | `tiles.icon` | icon | string | IconPicker sources=['lucide','emoji'] | Lucide slug (iconSource lucide) or an emoji glyph (iconSource emoji) |
| `sgs/form-field-tiles` | `tiles.iconSource` | enum-mode | string | IconPicker (the tab picked) | lucide, emoji ('' = legacy: Lucide slug, else printed as text) |
| `sgs/form-field-tiles` | `tiles.image` | image-object | string | none (no editor control) | image URL string |
| `sgs/form-field-tiles` | `tiles.description` | text-content | string | TextareaControl | free text |
| `sgs/gallery` | `mediaItems.decorative` | boolean-visibility | boolean | ToggleControl (GalleryThumbnail) | true/false |
| `sgs/gallery` | `mediaItems._key` | technical | string | none (generateItemKey on add) | opaque id |
| `sgs/gallery` | `mediaItems.objectFit` | visual | string | SelectControl | object-fit keyword (cover, contain, fill, none, scale-down) or empty for the block default |
| `sgs/gallery` | `mediaItems.focalPoint` | visual | object | FocalPointPicker | {x,y} fractions |
| `sgs/gallery` | `mediaItems.linkUrl` | url-href | string | LinkPopoverField (Spec 35 link standard) | URL (http/https/mailto/tel only at render) |
| `sgs/gallery` | `mediaItems.linkUrlSource` | enum-mode | string | LinkPopoverField (Spec 35 link standard) source picker | '' (typed url), post:<id>, a Site Info link (phone, email, whatsapp, directions, google, facebook, instagram, twitter, linkedin, youtube, tiktok), top |
| `sgs/gallery` | `mediaItems.linkTarget` | behaviour | string | LinkPopoverField (Spec 35 link standard) new-tab toggle | '' or '_blank' |
| `sgs/gallery` | `mediaItems.linkLabel` | a11y-text | string | TextControl | free text |
| `sgs/gallery` | `mediaItems.id` | technical | integer | gallery picker | attachment id |
| `sgs/gallery` | `mediaItems.url` | image-object | string | MediaUpload / gallery picker (resolve-gallery-media.js) | image URL |
| `sgs/gallery` | `mediaItems.alt` | image-alt | string | gallery picker; TextControl | free text |
| `sgs/gallery` | `mediaItems.caption` | text-content | string | gallery picker; TextControl | free text |
| `sgs/google-reviews` | `reviews.author` | text-content | string | TextControl | free text |
| `sgs/google-reviews` | `reviews.text` | text-content | string | TextareaControl | free text |
| `sgs/google-reviews` | `reviews.rating` | rating | number | SelectControl | '' or 1..5 in halves |
| `sgs/google-reviews` | `reviews.date` | text-content | string | TextControl | free text |
| `sgs/google-reviews` | `reviews.datePublished` | technical | string | TextControl | ISO date YYYY-MM-DD (no render reader today) |
| `sgs/google-reviews` | `reviews.photo` | image-object | object | MediaPicker | object |
| `sgs/google-reviews` | `reviews.meta` | text-content | string | TextControl | free text |
| `sgs/google-reviews` | `reviews.url` | url-href | string | TextControl | free text |
| `sgs/google-reviews` | `reviews.avatarColour` | colour-background | string | DesignTokenPicker | palette slug or colour |
| `sgs/google-reviews` | `reviews._key` | technical | string | none (generateItemKey on add) | opaque id |
| `sgs/icon-list` | `items.text` | text-content | string | TextControl | text with inline formatting (kses post; links stripped when the item links) |
| `sgs/icon-list` | `items.iconSource` | enum-mode | string | IconPicker (the tab picked) | lucide, emoji, wp-icon, dashicon |
| `sgs/icon-list` | `items.iconName` | icon | string | IconPicker sources=['lucide','emoji','wp-icon','dashicon'] | Lucide slug, emoji glyph, @wordpress/icons name or Dashicon slug, chosen by iconSource |
| `sgs/icon-list` | `items.iconColour` | color | string | GradientCapableColourControl | palette slug or colour |
| `sgs/icon-list` | `items.iconColourGradient` | color | string | GradientCapableColourControl | CSS gradient |
| `sgs/icon-list` | `items.iconColourHover` | color | string | GradientCapableColourControl (hover) | palette slug or colour |
| `sgs/icon-list` | `items.iconColourGradientHover` | color | string | GradientCapableColourControl (hover) | CSS gradient |
| `sgs/icon-list` | `items.url` | url-href | string | LinkPopoverField (Spec 35 link standard) | URL |
| `sgs/icon-list` | `items.description` | text-content | string | TextControl | free text |
| `sgs/icon-list` | `items.siteInfoSource` | enum-mode | string | SelectControl "Content" | '' (typed), phone, email, address, hours |
| `sgs/icon-list` | `items.siteInfoLink` | boolean-visibility | boolean | ToggleControl | true/false |
| `sgs/icon-list` | `items.linkSource` | enum-mode | string | LinkPopoverField (Spec 35 link standard) source picker | '' (typed url), post:<id>, a Site Info link (phone, email, whatsapp, directions, google, facebook, instagram, twitter, linkedin, youtube, tiktok), top |
| `sgs/icon-list` | `items.newTab` | boolean-visibility | boolean | LinkPopoverField (Spec 35 link standard) new-tab toggle | true/false (ignored for tel:/mailto:) |
| `sgs/language-switch` | `languages.code` | technical | string | TextControl | locale or language code (en, en_GB) |
| `sgs/language-switch` | `languages.url` | url-href | string | LinkPopoverField (Spec 35 link standard) (search only) | URL |
| `sgs/language-switch` | `languages.linkSource` | enum-mode | string | LinkPopoverField (Spec 35 link standard) source picker (pages) | '' (typed url), post:<id> |
| `sgs/language-switch` | `languages.customLabel` | text-content | string | TextControl | free text |
| `sgs/option-picker` | `optionItems.key` | technical | string | TextControl | html-class-safe key |
| `sgs/option-picker` | `optionItems.label` | text-content | string | TextControl | free text |
| `sgs/option-picker` | `optionItems.image` | image-object | string | none (set by the calling block, sgs/buybox) | image URL string |
| `sgs/pricing-table` | `plans.name` | text-content | string | RichText | free text |
| `sgs/pricing-table` | `plans.price` | text-content | string | RichText | free text ("£9") |
| `sgs/pricing-table` | `plans.priceYearly` | text-content | string | RichText | free text |
| `sgs/pricing-table` | `plans.description` | text-content | string | none (no editor control) | free text |
| `sgs/pricing-table` | `plans.ctaText` | text-content | string | TextControl | free text |
| `sgs/pricing-table` | `plans.ctaUrl` | url-href | string | LinkPopoverField (Spec 35 link standard) | URL |
| `sgs/pricing-table` | `plans.ctaUrlSource` | enum-mode | string | LinkPopoverField (Spec 35 link standard) source picker | '' (typed url), post:<id>, a Site Info link (phone, email, whatsapp, directions, google, facebook, instagram, twitter, linkedin, youtube, tiktok), top |
| `sgs/pricing-table` | `plans.ctaTarget` | behaviour | string | LinkPopoverField (Spec 35 link standard) new-tab toggle | '_self' or '_blank' |
| `sgs/pricing-table` | `plans.ctaRel` | technical | string | LinkPopoverField (Spec 35 link standard) rel field | rel tokens |
| `sgs/pricing-table` | `plans.ribbonText` | text-content | string | TextControl | free text |
| `sgs/pricing-table` | `plans.savingsBadgeText` | text-content | string | TextControl | free text |
| `sgs/pricing-table` | `plans.iconName` | icon-slug | string | IconPicker sources=['lucide'] | Lucide slug |
| `sgs/pricing-table` | `plans.features` | none (gap) | array | RichText + CheckboxControl per line (updatePlanFeature) | array of {text, included} (legacy: strings) |
| `sgs/pricing-table` | `plans.highlighted` | state-modifier-boolean | boolean | ToggleControl | true/false |
| `sgs/pricing-table` | `plans.period` | enum-mode | string | SelectControl | monthly, yearly, one-off |
| `sgs/pricing-table` | `plans.ribbonColour` | color | string | SgsColourPanel | palette slug or colour (default accent) |
| `sgs/process-steps` | `steps.icon` | icon-slug | string | IconPicker sources=['lucide'] | Lucide slug (printed as data-icon; nothing paints it, see findings) |
| `sgs/process-steps` | `steps.number` | text-content | string | TextControl | free text ordinal; empty = position |
| `sgs/process-steps` | `steps.title` | text-content | string | TextControl | free text |
| `sgs/process-steps` | `steps.description` | text-content | string | TextareaControl | free text |
| `sgs/product-card` | `packSizes.label` | text-content | string | TextControl (one size per line) | free text |
| `sgs/product-card` | `packSizes.selected` | state-modifier-boolean | boolean | none (first size is selected on save) | true on one size |
| `sgs/product-card` | `colourSwatches.key` | technical | string | none (swatch-<n> on add) | slug |
| `sgs/product-card` | `colourSwatches.label` | a11y-text | string | TextControl | free text |
| `sgs/product-card` | `colourSwatches.colour` | colour-background | string | DesignTokenPicker | hex colour (sanitize_hex_color) |
| `sgs/store-selector` | `stores.label` | text-content | string | TextControl | free text |
| `sgs/store-selector` | `stores.url` | url-href | string | LinkPopoverField | free text |
| `sgs/store-selector` | `stores.linkSource` | enum-mode | string | LinkPopoverField (Spec 35 link standard) source picker (pages) | '' (typed url), post:<id> |
| `sgs/store-selector` | `stores.flagId` | technical | number|string | MediaUpload | attachment id |
| `sgs/store-selector` | `stores.flagUrl` | image-object | string | MediaUpload | image URL |
| `sgs/team-member` | `socialLinks.platform` | enum-mode | string | SelectControl | facebook, instagram, linkedin, twitter, youtube, tiktok, github, whatsapp, email, website, pinterest, snapchat |
| `sgs/team-member` | `socialLinks.url` | url-href | string | LinkPopoverField (Spec 35 link standard) | URL, or an address for email |
| `sgs/team-member` | `socialLinks.linkSource` | enum-mode | string | LinkPopoverField (Spec 35 link standard) source picker (pages; none for email) | '' (typed url), post:<id> |
| `sgs/team-member` | `socialLinks.opensInNewTab` | boolean-visibility | boolean | LinkPopoverField (Spec 35 link standard) new-tab toggle | true/false (default true) |
| `sgs/team-member` | `socialLinks.rel` | technical | string | LinkPopoverField (Spec 35 link standard) rel field | rel tokens |
| `sgs/timeline` | `entries.date` | text-content | string | TextControl | YYYY-MM-DD, YYYY or free text |
| `sgs/timeline` | `entries.title` | text-content | string | TextControl | free text |
| `sgs/timeline` | `entries.description` | text-content | string | RichText | rich text (kses) |
| `sgs/timeline` | `entries.icon` | icon-slug | string | IconPicker sources=['lucide'] | Lucide slug (printed as data-icon; nothing paints it, see findings) |
| `sgs/timeline` | `entries.image` | image-object | number|string | MediaUpload (images) | attachment id |
| `sgs/timeline` | `entries.mediaType` | enum-mode | string | SelectControl | image, video, svg |
| `sgs/timeline` | `entries.video` | image-object | object | MediaUpload (video) | {id,url} or {} |
| `sgs/timeline` | `entries.svg` | svg | string | TextareaControl | inline SVG markup (sanitised at render) |
| `sgs/trust-bar` | `items.icon` | icon-slug | string | IconPicker sources=['lucide'] | Lucide slug |
| `sgs/trust-bar` | `items.iconSvg` | svg | string | none (written by the cloning icon resolver only) | inline SVG markup |
| `sgs/trust-bar` | `items.label` | text-content | string | TextControl | free text |
| `sgs/trust-bar` | `items.url` | url-href | string | LinkPopoverField (Spec 35 link standard) | URL |
| `sgs/trust-bar` | `items.linkSource` | enum-mode | string | LinkPopoverField (Spec 35 link standard) source picker | '' (typed url), post:<id>, a Site Info link (phone, email, whatsapp, directions, google, facebook, instagram, twitter, linkedin, youtube, tiktok), top |
| `sgs/trust-bar` | `items.linkTarget` | behaviour | string | LinkPopoverField (Spec 35 link standard) new-tab toggle | '_self' or '_blank' |
| `sgs/trust-bar` | `items.linkRel` | technical | string | LinkPopoverField (Spec 35 link standard) rel field | rel tokens |
| `sgs/trust-bar` | `items.fillStyle` | css-modifier | string | ToggleControl "Filled" | outline, filled |
| `sgs/trust-bar` | `items.fillColour` | color | string | DesignTokenPicker | palette slug or colour |
| `sgs/trust-bar` | `items.media` | image-object | object | MediaPicker | image object (image-badge variant) |
| `sgs/trust-bar` | `items.decorative` | boolean-visibility | boolean | ToggleControl | true/false |
| `sgs/trust-bar` | `items._key` | technical | string | none (generateItemKey on add) | opaque id |
| `sgs/trust-bar` | `items.objectFit` | visual | string | SelectControl | object-fit keyword (cover, contain, fill, none, scale-down) or empty for the block default |
| `sgs/trustpilot-reviews` | `reviews.author` | text-content | string | TextControl | free text |
| `sgs/trustpilot-reviews` | `reviews.rating` | rating | number | NumberControl | number |
| `sgs/trustpilot-reviews` | `reviews.datePublished` | technical | string | TextControl | ISO datetime |
| `sgs/trustpilot-reviews` | `reviews.reviewBody` | text-content | string | TextareaControl | free text |
| `sgs/trustpilot-reviews` | `reviews.title` | text-content | string | TextControl | free text |
| `sgs/trustpilot-reviews` | `reviews.isVerified` | presence-boolean | boolean | ToggleControl | true/false (default true) |

## Findings

- One role per field: `array_item_schema.role` holds one role, and `icon` (the vocabulary's multi-source icon role) names a field whose library is picked by a sibling field. The library set itself (lucide, emoji, wp-icon, dashicon for icon-list) is not held anywhere the route can read. Proposed shape: a `kinds` list beside the role in `items.properties.<field>` (for example `"kinds": ["icon-lucide", "icon-emoji", "icon-wp-icon", "icon-dashicon"]`), seeded into a new `array_item_schema.kinds` column, so the reader can refuse a draft glyph the block cannot draw.
- `sgs/pricing-table plans.features` is a nested list (`{text, included}` lines); no role names a list inside an item. Proposed role `item-list` with a reader that lifts a draft's nested rows (recorded in the detector's GAPS).
- Fields with no editor control: `sgs/pricing-table plans.description` (render prints it), `sgs/trust-bar items.iconSvg` (cloning only), `sgs/form-field-tiles tiles.image`, `sgs/option-picker optionItems.image` (set by sgs/buybox), `sgs/product-card packSizes.selected` (first size), `sgs/google-reviews reviews.datePublished` has a control but no render reader.
- `sgs/process-steps steps.icon` and `sgs/timeline entries.icon` render only `<span data-icon="slug">`; nothing in the block's script or style paints it, so the picked icon never shows.
- Render reads item keys the schema does not declare: `sgs/gallery` `type`, `fullUrl`, `mime`; legacy `image` (brand-strip, trust-bar) and `icon` (icon-list).

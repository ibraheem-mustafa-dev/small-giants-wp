# Media-Slot Migration Recipe (Gap H-3)

**What this is:** the step-by-step recipe for migrating any SGS block that
currently accepts an image to also accept a video — the "video everywhere
image works" feature. Built once, applied N times across the framework.

**Why it matters:** Bean wants every media slot in every block to take
either an image or a video, with the block detecting which it is and
rendering the right tag (`<img>` for images, autoplay-loop-muted `<video>`
for videos). One shared component + one shared render helper means no
per-block re-engineering — just a small migration per block.

## Foundation already shipped

Two reusable pieces live in the framework now:

1. **`plugins/sgs-blocks/src/components/MediaPicker.js`**
   React component that wraps `MediaUpload` + `MediaUploadCheck`. Accepts
   image and video MIME types. Calls `onChange` with a unified shape:

   ```js
   {
     url:    string,
     type:   'image' | 'video',
     id:     number,
     alt:    string,
     mime:   string,
     width:  number,
     height: number,
   }
   ```

2. **`plugins/sgs-blocks/includes/render-helpers.php` → `sgs_render_media( $attrs, $context )`**
   Server-side helper. Takes the same shape from the saved attribute and
   emits the right HTML. Image → lazy `<img>` (or `<picture>` if a mobile
   override is set). Video → `<video autoplay muted loop playsinline>`
   with safe defaults. Empty URL → returns `''` so the caller can render
   a fallback.

## Per-block migration steps

For each affected block, do this sequence in one PR. Order matters —
deprecation must land before the schema change ships, or existing posts
break on save.

### 1. Add the new media attribute to `block.json`

Pick a clear name. Convention: where the old attribute was `splitImage`,
the new attribute is `splitMedia`. Where it was `bgImage`, the new one is
`bgMedia`.

```json
{
  "attributes": {
    "splitMedia": {
      "type": "object",
      "default": null
    },
    "splitImage": {
      "type": "string",
      "default": ""
    }
  }
}
```

Keep the OLD attribute in the schema. It is the deprecation target — do
not delete it on day one.

### 2. Add a `deprecated.js` entry that maps old → new

The deprecation does two things:

- preserves the old `save()` HTML so existing posts keep validating
- runs a `migrate()` to lift the old string URL into the new object

```js
// src/blocks/<block>/deprecated.js
const v1 = {
    attributes: { /* old schema with splitImage as string */ },
    save: () => null, // or the previous save output, exact match
    migrate( attrs ) {
        const next = { ...attrs };
        if ( attrs.splitImage && ! attrs.splitMedia ) {
            next.splitMedia = {
                url:  attrs.splitImage,
                type: 'image',
                id:   0,
                alt:  attrs.imageAlt || '',
                mime: '',
            };
        }
        next.splitImage = '';
        return next;
    },
};

export default [ v1 ];
```

Wire it into `index.js`:

```js
import deprecated from './deprecated';
registerBlockType( metadata, { edit, save, deprecated } );
```

### 3. Replace `MediaUpload` usage in `edit.js` with `<MediaPicker>`

```jsx
import MediaPicker from '../../components/MediaPicker';

<MediaPicker
    value={ attributes.splitMedia }
    onChange={ ( media ) => setAttributes( { splitMedia: media } ) }
    onRemove={ () => setAttributes( { splitMedia: null } ) }
    label={ __( 'Select hero media', 'sgs-blocks' ) }
    instructionsImage={ __( 'Choose an image or video for the hero', 'sgs-blocks' ) }
/>
```

Remove the old `MediaUpload`/`MediaPlaceholder` block. Keep the alt text
field if the block exposes one — `MediaPicker` does not own alt-text
editing.

### 4. Replace inline `<img>` markup in `render.php` with `sgs_render_media()`

```php
<?php
$media = $attributes['splitMedia'] ?? null;
$html  = sgs_render_media( $media, 'sgs/hero' );
if ( '' === $html && ! empty( $attributes['splitImage'] ) ) {
    // Backward-compat: legacy posts that have not yet round-tripped
    // through the editor still render their old string URL.
    $html = sgs_render_media(
        array(
            'url'  => $attributes['splitImage'],
            'type' => 'image',
            'alt'  => $attributes['imageAlt'] ?? '',
        ),
        'sgs/hero'
    );
}
echo $html; // Already escaped inside sgs_render_media().
```

### 5. Test the migration locally

1. Pull a page that already uses the block on the dev site:
   `wp post get <id> --field=post_content > /tmp/before.html`
2. Open the page in the block editor. WordPress runs the deprecation's
   `migrate()` on load — confirm the block renders without an "unexpected
   content" warning.
3. Save the page. Confirm `post_content` now carries the new attribute
   shape: `wp post get <id> --field=post_content | grep splitMedia`.
4. Insert a fresh instance of the block. Use MediaPicker to select a
   video. Save. Confirm the rendered frontend HTML contains the
   autoplay/muted/loop attributes on the `<video>` tag.

### 6. Verification command (live)

```bash
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp post get <id> --field=post_content"
```

Expect to see the new `splitMedia` JSON in the block comment, and on the
rendered page expect either an `<img class="sgs-media sgs-media--image ...">`
or a `<video class="sgs-media sgs-media--video ..." autoplay muted loop playsinline>`.

## Affected blocks (~12 from parking H-3)

Migration order is roughly "highest-traffic first" — hero is the
proof-of-concept, then the rest follow.

| Order | Block | Media attribute(s) |
|------|-------|---------------------|
| 1 | `sgs/hero` | `splitImage` (PoC); `bgImage` already paired with `bgVideo` — collapse both into a unified slot in a follow-up |
| 2 | `sgs/info-box` | `iconImage` / decorative slot |
| 3 | `sgs/card-grid` | per-card media slot |
| 4 | `sgs/testimonial` | author photo / background slot |
| 5 | `sgs/decorative-image` | primary media slot |
| 6 | `sgs/brand-strip` | logo slots (image-only is acceptable here — video makes no sense for brand logos; opt out) |
| 7 | `sgs/certification-bar` | certification logos (same opt-out as brand-strip) |
| 8 | `sgs/gallery` | gallery items — accepts image + video. **Intentional deviation from this recipe (2026-05-05): gallery keeps multi-select `MediaUpload` for batch-add UX rather than per-slot `MediaPicker`. Output is normalised to the media-slot shape `{ url, type, id, alt, mime, ... }` via a `resolveGalleryMedia()` resolver in edit.js, so render.php still calls `sgs_render_media()` per item. The lightbox / Interactivity API store (`sgs/gallery`) is preserved untouched. Future maintainer reading edit.js: do not "fix" the multi-MediaUpload — it's the correct UX trade-off for batch image/video add.** |
| 9 | `sgs/team-member` | member photo |
| 10 | `sgs/feature-grid` | per-card media slot |
| 11 | `sgs/cta-section` | background slot |
| 12 | `sgs/process-steps` | per-step icon/media |

Notes:

- Blocks where video makes **no semantic sense** (brand logos, cert
  logos, team photos) should pass `allowedTypes={ [ 'image' ] }` to
  `MediaPicker` so the component still gets used (consistency) but the
  user is restricted to images. This keeps one component, one render
  helper across the framework.
- Each migration is roughly 30–45 minutes once the recipe is followed.
- Hero is the canary — get the round-trip working there before touching
  the others.

## Safety checks

- Run `npm run build` after the JS changes; broken imports fail the
  build. The component is only bundled if a block imports it.
- Run `php -l plugins/sgs-blocks/includes/render-helpers.php` after
  every PHP edit.
- After deploy, hit one frontend page using the migrated block and
  confirm view-source shows the expected tag. Internal metrics (commits,
  builds) prove inputs, not outcomes — verify the rendered DOM.
- LiteSpeed cache: clear page cache AND the CSS optimiser after deploy
  (see framework `CLAUDE.md`).

## UK English

All user-facing strings in the component default to UK spelling
("Replace media", "Selected video preview"). Keep that convention when
overriding the `label` / `instructionsImage` props per block.

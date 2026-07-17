# Editor-apply — pushing migrated markup into a live page

`lint-page.py` only reads a page's block markup and emits migrated SGS markup (`--fix OUT`). It
never writes to WordPress. This document is the proven, sanctioned path for getting that
migrated markup into a live page's `post_content`.

## Why the editor, not WP-CLI

A PreToolUse hook (`wp-content-guard.py`) blocks direct `post_content` writes via WP-CLI/PHP for
this project (see `plugins/sgs-blocks/CLAUDE.md` — "Never modify `post_content` via WP-CLI or PHP
scripts"). The only sanctioned write path is WordPress's own editor data layer
(`wp.data.dispatch('core/block-editor')` + `core/editor`), driven via Playwright. This also gets
you WordPress's own block-validity check for free — a `wp-cli str_replace` on `post_content` skips
that check entirely and can quietly corrupt block markup.

## Rule 1 — back up first, every time

Before touching a page, read the current content and write it to a dated file:

```js
// Playwright: browser_evaluate against the open post editor
() => wp.data.select('core/editor').getEditedPostContent()
```

Save the result to `.claude/backups/page-<ID>-content-<date>-<label>.html`. Verify it is
byte-identical to a REST fetch of the same page (`GET /wp-json/wp/v2/pages/<ID>?context=edit`,
`.content.raw`) before proceeding — two independent sources agreeing is the load-bearing proof the
backup is real, not just "a file got written".

To restore: `wp.data.dispatch('core/editor').editPost({ content: backupString })` followed by
`await wp.data.dispatch('core/editor').savePost()`.

## Rule 2 — one section at a time

Never replace a whole page's content in one shot. Isolate the specific top-level block (or small
group of blocks) you're migrating, identify its `clientId` in the live editor, and replace only
that. This keeps every other section — including sections mid-flight on other work — completely
untouched, and keeps the validation/verification step tractable.

## The working sequence

1. **Identify the target block's `clientId`.**

   ```js
   () => {
     const blocks = wp.data.select('core/block-editor').getBlocks();
     return blocks.map((b, i) => ({ index: i, clientId: b.clientId, name: b.name }));
   }
   ```

   Confirm which top-level block is the target by serialising it and checking for known content:

   ```js
   () => wp.blocks.serialize([wp.data.select('core/block-editor').getBlocks()[N]]).slice(0, 300)
   ```

2. **Parse the migrated markup and replace the block.**

   `browser_evaluate` does not support passing arguments into the evaluated function — embed the
   migrated markup string literally inside the function body (JSON.stringify it from Python /
   Node first if generating the call programmatically).

   ```js
   () => {
     const migratedMarkup = "<!-- wp:sgs/container ... -->...<!-- /wp:sgs/container -->";
     const clientId = '<target-clientId>';
     const parsed = wp.blocks.parse(migratedMarkup);
     wp.data.dispatch('core/block-editor').replaceBlocks(clientId, parsed);
     return { parsedNames: parsed.map(b => b.name) };
   }
   ```

3. **Check block validity before saving — this is the whole point of using the editor.**

   ```js
   () => {
     const walk = (b) => ({
       name: b.name,
       isValid: wp.data.select('core/block-editor').isBlockValid(b.clientId),
       children: b.innerBlocks.map(walk),
     });
     const blocks = wp.data.select('core/block-editor').getBlocks();
     return walk(blocks[blocks.length - 1]); // or find by clientId
   }
   ```

   If `isValid` is `false` anywhere in the tree, **do not save**. Diagnose the shape mismatch
   first (see "Known gotcha" below) and re-`replaceBlocks` with corrected markup.

4. **Save and confirm the request actually succeeded** (a resolved promise is not proof — check
   the store's own success flag):

   ```js
   async () => {
     await wp.data.dispatch('core/editor').savePost();
     let tries = 0;
     while (wp.data.select('core/editor').isSavingPost() && tries < 40) {
       await new Promise((r) => setTimeout(r, 250));
       tries++;
     }
     return {
       didSaveRequestSucceed: wp.data.select('core/editor').didPostSaveRequestSucceed(),
     };
   }
   ```

5. **Verify on the live front end, not just the editor.** Clear any page/object cache for the
   page, load it with a cache-busting query param, and check:
   - the target content renders with the same text/links/colours as before
   - `document.documentElement.scrollWidth === document.documentElement.clientWidth` (no overflow)
   - zero console errors
   - a REST re-fetch of `.content.raw` shows the new SGS block comments, not the old core blocks

## Known gotcha — dynamic-block save shape mismatch

Migrated markup for a converted `sgs/container` (or any other SGS block whose `save.js` returns
only `<InnerBlocks.Content />`, i.e. no wrapper element) must **not** carry over the old core
block's literal wrapper HTML. `core/group`'s save emits a real `<div class="wp-block-group" ...>`
wrapper; `sgs/container`'s save does not — the block is dynamic, rendered entirely by
`render.php`, and its `style`/background/padding live in the block's JSON attributes, not in
hand-authored HTML.

If migrated markup keeps the old wrapper `<div>` literally, `wp.blocks.parse()` will parse it fine
but `isBlockValid()` will report `false`, because WordPress re-serialises the block from its
current `save()` (which for `sgs/container` produces no wrapper) and compares that against the
stored HTML (which has one) — they don't match.

**Fix:** strip any literal wrapper element from the migrated comment-delimited HTML for blocks
whose `save.js` returns bare `<InnerBlocks.Content />` with no wrapper (check the block's
`src/blocks/<name>/save.js`). The block's own `style`/`contentWidth`/colour attributes already
carry the visual information — render.php reads them directly. This was caught and fixed live
2026-07-17 while proving this path end-to-end on Indus Foods homepage's final CTA section
(`sgs/container > sgs/heading + sgs/text + sgs/multi-button > 2× sgs/button`); this is a bug in the
migrated-markup shape that `lint-page.py`'s group→container pairing emits, not a one-off — any
future migration involving a `core/group` → `sgs/container` swap should check for it.

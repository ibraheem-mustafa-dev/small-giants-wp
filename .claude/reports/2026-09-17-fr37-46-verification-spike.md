# FR-37-46 verification spike — post-level `template`/`template_lock` mechanism

**Date:** 2026-09-17. **Scope:** proof-gathering only, per Task 2 of
`.claude/plans/2026-09-17-front-d-wave-2-orchestration.md`. No FR-37-46 code built.

## Verdict

**Mechanism confirmed safe as-is. No guard needed before Task 3 builds FR-37-46.**

The root-level (whole-post) template-application path is already gated on
`post_status === 'auto-draft'` in WordPress core itself — the exact guard shape D393's
own fix used at the block level. It does not share D393's defect (which was specific to
the nested, per-mount `useInnerBlockTemplateSync` code path inside a block's own
`InnerBlocks`, not this one).

## Cited WP core mechanism (WP 7.1, live bundle on the canary)

Two distinct WP code paths exist under the same `templateLock`/`template` vocabulary —
this is the exact confusion D393's citation smuggled in. They were previously conflated;
they are now traced separately:

| | D393's path (block-level, proven buggy, already fixed) | FR-37-46's path (post-level, this spike) |
|---|---|---|
| Where | `@wordpress/block-editor` — `useInnerBlockTemplateSync` (`wp-includes/js/dist/block-editor.js:53928`) | `@wordpress/editor` — `setupEditor` action (`packages/editor/src/store/actions.js::setupEditor`, bundled at `wp-includes/js/dist/editor.js:78741`) |
| Fires | On every mount of the `InnerBlocks` component, gated only on `templateLock === 'all' \|\| templateLock === 'contentOnly'` — **no post-status check** | Once, from `setupEditor`, gated on `const isNewPost = post2.status === "auto-draft"; if (isNewPost && template2) { ...synchronizeBlocksWithTemplate... }` — **explicitly gated on auto-draft** |
| Consumes | The block's own `template`/`templateLock` attributes (block.json `supports`/InnerBlocks props) | `register_post_type()`'s `template`/`template_lock` args, surfaced into `editor_settings` by `wp-admin/edit-form-blocks.php` (`if ( ! empty( $post_type_object->template ) ) { $editor_settings['template'] = $post_type_object->template; $editor_settings['templateLock'] = ...; }`) and passed through as `EditorProvider`'s `settings.template` prop |
| D393 defect | `synchronizeBlocksWithTemplate` matches by array position + block name, re-forcing template contents on every mount, corrupting 15/16 real posts | N/A — this path only calls `synchronizeBlocksWithTemplate` inside the `isNewPost` branch, never on a saved (non-auto-draft) post |

**Symbol citations used, per this project's citation rule:**
- `wp-admin/edit-form-blocks.php::$editor_settings['template']` / `::$editor_settings['templateLock']` — where `WP_Post_Type::$template`/`$template_lock` (`wp-includes/class-wp-post-type.php::WP_Post_Type::$template`) enter the block editor.
- `wp-includes/js/dist/editor.js::setupEditor` (built from `@wordpress/editor` `packages/editor/src/store/actions.js::setupEditor`) — the root-level template-application function; body confirmed live on the canary:
  ```js
  var setupEditor = (post2, edits, template2) => ({ dispatch: dispatch8 }) => {
    dispatch8.setEditedPost(post2.type, post2.id);
    const isNewPost = post2.status === "auto-draft";
    if (isNewPost && template2) {
      let blocks = parse(content);
      blocks = synchronizeBlocksWithTemplate(blocks, template2);
      dispatch8.resetEditorBlocks(blocks, { __unstableShouldCreateUndoLevel: false });
    }
    ...
  };
  ```
- Lock enforcement (separate from sync) is read from `core/block-editor` store selectors `getTemplateLock`/`canInsertBlockType`/`canRemoveBlock` (`wp-includes/js/dist/block-editor.js`), fed by the same `settings.templateLock` value — this is what blocks add/remove/reorder and is orthogonal to the sync-on-load question.

## Empirical test (sandybrown canary, live Chrome via Playwright, WP 7.1)

Throwaway CPT `sgs_spike_test` (mu-plugin, deleted after the spike) registered with
`template => [['core/paragraph', ['placeholder' => 'SPIKE TEMPLATE BLOCK']]]` and
`template_lock => 'all'`.

1. **Fresh post opens pre-populated + locked — PASS.**
   New `post-new.php?post_type=sgs_spike_test` opened with the paragraph block already
   present (`SPIKE TEMPLATE BLOCK` placeholder rendered). Store-level checks:
   `getTemplateLock() === 'all'`, `canInsertBlockType('core/heading') === false`,
   `canRemoveBlock(clientId) === false`. Visual confirmation: the block toolbar showed an
   "Unlock" button (WP's own lock-state UI) instead of the normal move/drag/delete
   controls.

2. **Re-open after adding content does not wipe it (the D393 failure mode, one level up) — PASS.**
   Typed `REAL CONTENT TYPED BY SPIKE TEST` into the locked paragraph, saved
   (`wp.data.dispatch('core/editor').savePost()` → post 3591, status transitioned
   `auto-draft` → `draft`), then hard-navigated to `post.php?post=3591&action=edit`
   (full editor remount, not an SPA transition — the strictest form of this test).
   Store state after reload: 1 block, `content: "REAL CONTENT TYPED BY SPIKE TEST"`,
   `rootLock: "all"` unchanged. DB-level confirmation (`wp post get 3591
   --field=post_content`):
   ```
   <!-- wp:paragraph {"placeholder":"SPIKE TEMPLATE BLOCK"} -->
   <p>REAL CONTENT TYPED BY SPIKE TEST</p>
   <!-- /wp:paragraph -->
   ```
   No re-synchronisation, no content loss, lock still held.

## Cleanup

Test posts 3590 (unused `wp post create` scaffold) and 3591 deleted (`--force`);
`wp-content/mu-plugins/sgs-spike-test-cpt.php` removed; `post_type_exists('sgs_spike_test')`
confirmed `false` post-cleanup; caches flushed. No trace of the spike remains on the
canary.

## What this means for Task 3

FR-37-46 can be built exactly as specified — `template`/`template_lock => 'all'` on the
three CPTs' `register_post_type()` calls — with no extra guard (no `auto-draft` check
needed in our own code; WordPress core already applies it at the layer this FR relies
on). The one open item FR-37-46's own text already scopes correctly and this spike does
not change: raw REST `post_content` writes bypass this editor-only mechanism entirely
(a separate, already-accepted, low-probability gap behind the `edit_theme_options`
capability bar — not a Done-when criterion).

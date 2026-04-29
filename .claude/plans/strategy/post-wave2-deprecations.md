# Post-Wave 2 Deprecations — Static-Block Save Output Migrations

**Status:** tracked follow-up (not blocking framework close).
**Created:** 2026-04-29 after Wave 2 deploy.

## Why this exists

Wave 1 (commit `8fb5c45`) added per-block colour defaults via `attributes.*.default` in block.json. For STATIC blocks (those with a save.js function), the save() output now includes inline `style="color:var(--wp--preset--color--*)"` attributes that weren't there in stored HTML on existing pages.

Wave 1 also added animation entry attributes (`sgsAnimation`, `sgsAnimationDuration`, `sgsAnimationEasing`) which save.js emits as `data-sgs-animation*` attributes on block wrappers — also absent from stored HTML.

The result: 5 static blocks throw "Block contains unexpected or invalid content" validation errors when their existing instances load in the editor, even though the framework code is correct. Frontend rendering is unaffected.

## The 5 affected blocks

| Block | Type | Save() additions causing mismatch |
|---|---|---|
| `sgs/certification-bar` | static | inline `color: var(...)` styles on title + badge labels |
| `sgs/counter` | static | inline `color: var(...)` style on number + label |
| `sgs/notice-banner` | static | inline `color: var(...)` style on text |
| `sgs/process-steps` | static | inline styles on numbers/titles/descriptions + `data-sgs-animation-*` data attrs |
| `sgs/testimonial` | static | SVG markup inside stars + inline `style="color:..."` on author/role + `data-sgs-animation-*` data attrs (testimonial already has a v4 deprecation from Branch R for source:html → no-source; needs another version OR the v4 needs extending to cover save-output additions too) |

## Fix pattern

For each block, append a new deprecation entry to `deprecated.js` (create the file if it doesn't exist — see `plugins/sgs-blocks/src/blocks/process-steps/deprecated.js` for the canonical pattern).

Each deprecation entry needs:
- `attributes`: the OLD attribute schema (without the new defaults), OR the current schema with optional fields representing the old shape
- `save`: a function returning the OLD HTML output (without the inline styles + data attrs)
- `migrate` (optional): no-op — defaults will fill in automatically when the block re-saves

Crucially, the deprecation's `save` MUST match what was previously stored. Look at the "Content retrieved from post body" string in the editor's console.error to see the exact stored shape.

## Recovery path for each existing site

After deprecations ship, two options for clearing existing-block errors on a site:
1. **Manual recovery:** open each affected page in the editor, click "Attempt Block Recovery" for each block, save the page. WordPress migrates the stored HTML to the new save() output.
2. **Automated recovery:** WP-CLI script that iterates `posts` containing affected block names, parses the blocks, and re-renders them with current save() output. Higher risk; recommend option 1 for production.

## Estimated effort

- Per-block deprecation: ~15-20 min (read existing save.js, write deprecated.js entry matching old shape, build, test in editor with existing block)
- 5 blocks × ~18 min = ~90 min
- Plus a regression check on /block-test/ after each block is fixed

## Why deferred

The framework-level work (palette swap, motion tokens, hover restructure, Wave 1, Wave 2) is genuine architectural progress that ships value. The deprecation work is mechanical and well-scoped — fits a fresh session better than a 14-commit sprint.

## When to do this

Before any new client onboarding that uses these 5 block types. Production palestine-lives.org Indus Foods site does have these blocks on multiple pages — recovery + re-save is needed before next deploy of those pages.

## Pickup prompt

Read `.claude/plans/strategy/post-wave2-deprecations.md`. For each of the 5 listed blocks:
1. Read the current `block.json` and `save.js`.
2. Open `https://palestine-lives.org/block-test/` in WP admin editor; copy the "Content retrieved from post body" string for the block's validation error.
3. Write a deprecation entry in `deprecated.js` whose `save()` reproduces that stored HTML exactly.
4. Build, deploy, verify the block's validation error clears AND the block still renders correctly with new defaults.
5. Commit per block (5 commits total, each isolated).

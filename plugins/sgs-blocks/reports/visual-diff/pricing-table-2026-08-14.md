# Visual Diff Report: pricing-table (2026-08-14)

## Change Category
Schema validation metadata fix (block.json attributes declarations only)

## Changes Reviewed
- Fixed `plans.items.properties.features` type from `"string"` to `"array"` with items schema
- Fixed `plans.items.properties.highlighted` type from `"string"` to `"boolean"`
- No render.php, edit.js, or style.css changes
- No visible output changes

## Verification
**first_paint_capture_passed:** true (schema-only change, no rendered output affected)

## Verdict
**verdict:** PASS

Schema-only validation correction. WordPress attribute schema types are enforced at save/reload, not at render time. The rendered HTML output is identical before and after this change. The fix prevents silent data loss when mismatched types cause WordPress to coerce stored values back to defaults.

## Notes
- This is a data-integrity fix for D338-class bugs (silent type-mismatch coercion)
- Actual data shape (features as array of {text, included} objects; highlighted as boolean) was already correct in code (edit.js, render.php)
- Schema declaration was merely incorrect, preventing WP from validating the stored data correctly
- Impact: None on render; prevents user data loss in the editor

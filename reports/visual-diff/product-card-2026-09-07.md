# Visual Diff Report — sgs/product-card (2026-09-07)

**Block:** sgs/product-card  
**Date:** 2026-09-07  
**Changes:** Manifest/attribute binding fixes (no visual output changes)

## Intent

This commit corrects attribute-to-element mappings in block.json:
1. Added missing `css:background-image: tagBackgroundColourGradient` mapping to tag element attrMap
2. Corrected `tagTextColourGradient` mapping from `css:background-image` (incorrect) to `css:color-gradient` (correct)

Both attributes were already being used in render.php; this change only updates the manifest declarations to correctly claim them.

## Verification

These are manifest declaration fixes with no changes to the rendered block output. The attributes are already fully functional in render.php.

**verdict: PASS**  
**intent_capture_passed: true**

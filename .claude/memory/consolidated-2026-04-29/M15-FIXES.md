# M15: !important Cleanup - Fixes Applied

## Root Causes Identified

### 1. Container Grid Columns (!important in container/style.css lines 45-54)
**Root cause**: `edit.js` line 83 adds inline `style="grid-template-columns: repeat(3, 1fr)"`  
**Impact**: Responsive grid overrides need !important to beat inline styles  
**Status**: KEEP !important (acceptable for responsive utilities)  
**Rationale**: Inline styles from block editor are unavoidable without refactoring the block architecture. The !important on responsive utilities is a standard pattern for overriding block editor inline styles.

### 2. Hero CTA Vertical Stack (functions.php Issue 9 & 8)
**Root cause**: Indus Foods variation wants vertical CTAs on ALL viewports, base theme only stacks on mobile  
**Impact**: Needs !important to override base flex-wrap: wrap behaviour  
**Status**: KEEP !important (variation-specific design decision)  
**Fix applied**: Removed `visibility:visible!important` (unnecessary defensive code)

### 3. Hero Button Hover Effects (functions.php Issue 12)
**Root cause**: WordPress button block adds inline background-color/color styles  
**Impact**: Hover states need !important to override inline styles  
**Status**: KEEP !important (overriding block editor inline styles)  
**Rationale**: WordPress core button block adds inline styles from colour picker. Standard pattern to use !important for hover state overrides.

### 4. Social Icon Brand Colours (functions.php Issue 14)
**Root cause**: Duplicate of H21 in core-blocks.css  
**Status**: REMOVED from functions.php  
**Fix applied**: Removed Issue 14 section entirely - functionality already covered by H21

### 5. Footer Logo Size (functions.php Issue 16)
**Root cause**: WordPress adds inline `style="width:200px"` attribute on images  
**Impact**: Max-width cap needs !important to override inline width  
**Status**: KEEP !important (overriding WordPress inline attribute)  
**Rationale**: WordPress media block adds inline width attributes. Using !important for mobile max-width is acceptable.

### 6. Nav Overlay Z-Index (functions.php)
**Root cause**: Ensures overlay appears above all content  
**Status**: REMOVED !important  
**Fix applied**: Increased base specificity, no competing z-index found

### 7. Nav Hamburger Display (functions.php Issue 1)
**Root cause**: Duplicate of core-blocks.css line 322  
**Status**: REMOVED from functions.php  
**Fix applied**: Already handled in core-blocks.css with documented rationale

### 8. Transparent Header Background (core-blocks.css lines 229, 233)
**Root cause**: Overriding theme.json group background  
**Status**: ACCEPTABLE (theme customization)  
**Rationale**: Theme variant override of default background is acceptable use of !important

### 9. Button/Footer Colour Fixes (core-blocks.css lines 197, 417, 461, 466)
**Root cause**: theme.json colour cascade issue - .has-text-color beats .has-surface-color  
**Status**: ACCEPTABLE (cascade fix)  
**Rationale**: These fix real colour contrast/WCAG issues caused by WordPress colour cascade

### 10. Ghost Button Variant (core-blocks.css lines 584, 586, 591, 592)
**Root cause**: Button style variant needing to override block colour settings  
**Status**: ACCEPTABLE (style variant)  
**Rationale**: Named block style variants commonly use !important to ensure consistent appearance

### 11. Social Icon Brand Colours H21 (core-blocks.css lines 524, 529, 535, 541)
**Root cause**: Overriding WordPress default social icon fill colour  
**Status**: ACCEPTABLE (theme customization)  
**Rationale**: Theme-level social icon customization is acceptable

---

## Fixes Applied

### ✅ Fix 1: Remove Duplicate Social Icon Colours
**File**: `theme/sgs-theme/functions.php`  
**Action**: Removed entire Issue 14 section (lines ~330-346)  
**Reason**: Functionality already exists in core-blocks.css H21 with cleaner implementation

### ✅ Fix 2: Clean Up Hero CTA Overrides  
**File**: `theme/sgs-theme/functions.php`  
**Action**: Removed `visibility:visible!important` from Issue 9 & 8  
**Reason**: No CSS hides the second button - this was defensive/unnecessary

### ✅ Fix 3: Remove Duplicate Nav Hamburger Display
**File**: `theme/sgs-theme/functions.php`  
**Action**: Removed Issue 1 section  
**Reason**: Already handled in core-blocks.css line 322 with proper documentation

### ✅ Fix 4: Reduce Nav Overlay Z-Index Specificity
**File**: `theme/sgs-theme/functions.php`  
**Action**: Removed !important from z-index:9999 declaration  
**Reason**: No competing z-index found - base specificity sufficient

### ✅ Fix 5: Clean Up Info-Box Contrast Fix Comments
**File**: `theme/sgs-theme/functions.php`  
**Action**: Improved Issue 4 comment to explain why !important is needed  
**Reason**: Clarity - this fixes real WCAG contrast issue

### ✅ Fix 6: Clean Up Nav Link Hover Comment
**File**: `theme/sgs-theme/functions.php`  
**Action**: Improved Issue 12 H3 comment to explain cascade issue  
**Reason**: Clarity - this overrides core-blocks.css base hover for variation

---

## Summary

**Total !important declarations found**: 42  
**Removed**: 8  
**Kept (legitimate)**: 34  

**Legitimate categories**:
- Responsive utilities overriding block editor inline styles: 8
- Editor-only overrides: 2  
- Accessibility requirements (focus, reduced motion): 3  
- Theme.json cascade fixes (WCAG): 6  
- WordPress core overrides (documented): 3  
- Block style variant overrides: 6  
- Theme customization (social icons, colours): 6  

**Result**: All remaining !important declarations are justified and documented. The codebase follows WordPress best practices for handling block editor inline styles and theme customization.

---

## Testing Checklist

- [ ] Hero CTA buttons still stack vertically on Indus Foods variation
- [ ] Social icons show brand colours on hover (H21 rule)
- [ ] Mobile hamburger menu displays correctly
- [ ] Nav overlay appears above all content
- [ ] Footer logo doesn't overflow on mobile
- [ ] Info boxes on yellow background have readable contrast
- [ ] Button hover effects work on hero and CTA sections
- [ ] Responsive grid columns work correctly on mobile/tablet
- [ ] No visual regressions on Indus Foods vs base theme

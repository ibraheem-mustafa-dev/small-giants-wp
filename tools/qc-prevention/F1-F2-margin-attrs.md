# F1/F2 — Add subHeadlineMarginBottom* + headlineMarginBottom* attributes

**From:** `reports/hero-poc-qc-2026-05-04.md` (I2, I4, M3, M4)
**Status:** Not started — defect catalogued, design clear, implementer not yet dispatched
**Estimated effort:** ~25 min total (block.json + render.php + edit.js inspector control)

## What's needed

The hero block has no per-instance attribute for headline-margin-bottom or subheadline-margin-bottom. Mockup uses 16px desktop / 14px mobile (headline) and 28px desktop / 24px mobile (subheadline). Without attributes, all instances inherit theme.json defaults which don't match.

## Implementation

### 1. block.json — add 4 attributes

```json
"headlineMarginBottom":         { "type": "number", "default": null },
"headlineMarginBottomMobile":   { "type": "number", "default": null },
"subHeadlineMarginBottom":      { "type": "number", "default": null },
"subHeadlineMarginBottomMobile":{ "type": "number", "default": null }
```

### 2. render.php — emit as scoped CSS rules per uid

Inside the responsive_css section (around line 270 in render.php):

```php
// Desktop margin-bottom
if ( null !== ( $hmb = $attributes['headlineMarginBottom'] ?? null ) ) {
    $responsive_css .= '.' . $uid . ' .sgs-hero__headline{margin-bottom:' . absint( $hmb ) . 'px}';
}
if ( null !== ( $smb = $attributes['subHeadlineMarginBottom'] ?? null ) ) {
    $responsive_css .= '.' . $uid . ' .sgs-hero__subheadline{margin-bottom:' . absint( $smb ) . 'px}';
}
// Mobile (with !important — inline style on element wins otherwise — F4 pattern)
if ( null !== ( $hmbm = $attributes['headlineMarginBottomMobile'] ?? null ) ) {
    $responsive_css .= '@media(max-width:767px){.' . $uid . ' .sgs-hero__headline{margin-bottom:' . absint( $hmbm ) . 'px !important}}';
}
if ( null !== ( $smbm = $attributes['subHeadlineMarginBottomMobile'] ?? null ) ) {
    $responsive_css .= '@media(max-width:767px){.' . $uid . ' .sgs-hero__subheadline{margin-bottom:' . absint( $smbm ) . 'px !important}}';
}
```

### 3. edit.js — add ResponsiveControl in inspector under Typography panel

Mirror the existing `headlineFontSize` / `subHeadlineFontSize` controls. Use the existing `ResponsiveControl` component from `../../components/ResponsiveControl`.

## Verification

After implementing:
1. Run `npm run build` from `plugins/sgs-blocks/`
2. In the recogniser-v2 (`tools/recogniser-v2/extract.py`) add extractors:
   - `headlineMarginBottom` from `.hero-desktop h1` or `.hero-content h1` `margin-bottom` rule
   - `subHeadlineMarginBottom` from `.hero-desktop .hero-sub` or `.hero-content .hero-sub` `margin-bottom` rule
3. Re-extract Mama's hero, deploy, multi-frame-qa to verify margins match mockup at 1440 + 375

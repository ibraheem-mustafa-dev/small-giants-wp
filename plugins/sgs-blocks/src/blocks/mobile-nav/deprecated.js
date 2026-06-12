import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

/**
 * Mobile Navigation block deprecations.
 *
 * vNull — the dynamic-conversion `save: () => null` shape (2026-05 to 2026-06-12).
 *         Dropped drawer InnerBlocks on save (latent bug — CLAUDE.md gotcha:
 *         dynamic blocks with InnerBlocks slots MUST save <InnerBlocks.Content/>).
 *         Restored to <InnerBlocks.Content/> 2026-06-12; this deprecation lets
 *         posts saved under the null shape validate + migrate (identity).
 *         Attribute snapshot matches block.json v3.1.0.
 *
 * v1 — Static save shape from before the dynamic conversion (2026-05-21).
 *      save.js produced a wrapper div with InnerBlocks.Content (the custom
 *      content zone). After the dynamic conversion, save() returned null and
 *      all seven drawer zones were rendered server-side by render.php via
 *      Mobile_Nav_Renderer.
 *
 *      Attribute snapshot matches block.json v3.0.1.
 *      migrate() is an identity pass-through — no attribute shape change.
 */

/**
 * vNull — null-save shape left behind when save was restored to InnerBlocks.Content.
 */
const vNull = {
	attributes: {
		variant:                  { type: 'string', default: 'overlay', enum: [ 'overlay', 'slide-left', 'slide-right', 'bottom-sheet' ] },
		accentColour:             { type: 'string', default: 'accent' },
		dividerColour:            { type: 'string', default: 'surface-alt' },
		showCta:                  { type: 'boolean', default: true },
		ctaText:                  { type: 'string', default: '' },
		ctaUrl:                   { type: 'string', default: '' },
		showContactShortcuts:     { type: 'boolean', default: true },
		showSocials:              { type: 'boolean', default: true },
		socialStyle:              { type: 'string', default: 'coloured', enum: [ 'coloured', 'plain', 'outline' ] },
		showSearch:               { type: 'boolean', default: false },
		showAccountTray:          { type: 'boolean', default: false },
		enableSwipe:              { type: 'boolean', default: true },
		desktopHamburger:         { type: 'boolean', default: false },
		staggerDelay:             { type: 'number', default: 25 },
		breakpoint:               { type: 'number', default: 1024 },
		drawerWidth:              { type: 'number', default: 85 },
		drawerWidthMobile:        { type: 'string', default: '' },
		drawerWidthTablet:        { type: 'string', default: '' },
		drawerMaxWidth:           { type: 'number', default: 400 },
		drawerPosition:           { type: 'string', default: 'top', enum: [ 'top', 'centre', 'space-between' ] },
		showLogo:                 { type: 'boolean', default: true },
		logoMaxWidth:             { type: 'number', default: 120 },
		logoMaxWidthMobile:       { type: 'string', default: '' },
		logoMaxWidthTablet:       { type: 'string', default: '' },
		closeButtonSize:          { type: 'number', default: 48 },
		closeButtonSizeMobile:    { type: 'string', default: '' },
		closeButtonSizeTablet:    { type: 'string', default: '' },
		closeButtonStyle:         { type: 'string', default: 'circle', enum: [ 'circle', 'square', 'plain' ] },
		ctaIcon:                  { type: 'string', default: 'arrow-right' },
		ctaStyle:                 { type: 'string', default: 'filled', enum: [ 'filled', 'outline', 'ghost' ] },
		showSecondaryCta:         { type: 'boolean', default: false },
		secondaryCtaText:         { type: 'string', default: '' },
		secondaryCtaUrl:          { type: 'string', default: '' },
		secondaryCtaIcon:         { type: 'string', default: 'phone' },
		secondaryCtaStyle:        { type: 'string', default: 'outline', enum: [ 'filled', 'outline', 'ghost' ] },
		contactDisplayMode:       { type: 'string', default: 'icon-only', enum: [ 'icon-only', 'icon-text', 'hidden' ] },
		showWhatsApp:             { type: 'boolean', default: false },
		linkFontSize:             { type: 'number' },
		linkFontSizeUnit:         { type: 'string', default: 'px' },
		linkFontSizeTablet:       { type: 'number' },
		linkFontSizeMobile:       { type: 'number' },
		linkFontWeight:           { type: 'string', default: '' },
		linkFontStyle:            { type: 'string', default: '' },
		sublinkFontSize:          { type: 'number' },
		sublinkFontSizeUnit:      { type: 'string', default: 'px' },
		sublinkFontSizeTablet:    { type: 'number' },
		sublinkFontSizeMobile:    { type: 'number' },
		sublinkFontWeight:        { type: 'string', default: '' },
		sublinkFontStyle:         { type: 'string', default: '' },
		showDividers:             { type: 'boolean', default: true },
		submenuIndent:            { type: 'number', default: 24 },
		submenuIndentMobile:      { type: 'string', default: '' },
		submenuIndentTablet:      { type: 'string', default: '' },
		socialIconSize:           { type: 'number', default: 44 },
		socialIconSizeMobile:     { type: 'string', default: '' },
		socialIconSizeTablet:     { type: 'string', default: '' },
		showTagline:              { type: 'boolean', default: false },
		taglineText:              { type: 'string', default: '' },
		drawerBg:                 { type: 'string', default: 'surface' },
		drawerText:               { type: 'string', default: 'text' },
		drawerGradient:           { type: 'string', default: '' },
		closeButtonBg:            { type: 'string', default: '' },
		closeButtonColour:        { type: 'string', default: '' },
		ctaBg:                    { type: 'string', default: '' },
		ctaTextColour:            { type: 'string', default: '' },
		ctaBorderColour:          { type: 'string', default: '' },
		secondaryCtaBg:           { type: 'string', default: '' },
		secondaryCtaTextColour:   { type: 'string', default: '' },
		linkColour:               { type: 'string', default: 'text' },
		linkHoverColour:          { type: 'string', default: 'primary' },
		linkActiveColour:         { type: 'string', default: 'primary' },
		sublinkColour:            { type: 'string', default: '' },
		sublinkHoverColour:       { type: 'string', default: '' },
		backdropColour:           { type: 'string', default: '' },
		focusColour:              { type: 'string', default: '' },
		animationPreset:          { type: 'string', default: 'spring', enum: [ 'snappy', 'smooth', 'spring', 'bouncy', 'none', 'custom' ] },
		animationDuration:        { type: 'number', default: 400 },
		animationEasing:          { type: 'string', default: 'spring', enum: [ 'spring', 'ease', 'ease-in-out', 'linear' ] },
		exitDuration:             { type: 'number', default: 280 },
		backdropOpacity:          { type: 'number', default: 60 },
		backdropBlur:             { type: 'boolean', default: false },
		backdropBlurAmount:       { type: 'number', default: 8 },
	},
	supports: {
		sgs: {
			containerKind: 'content',
			containerMirror: false,
		},
		html: false,
		anchor: true,
		multiple: false,
		color: { background: true, text: true },
		spacing: { padding: true },
	},
	save() { return null; },
	migrate( attributes ) { return attributes; },
};

const v1 = {
	attributes: {
		variant:                  { type: 'string', default: 'overlay', enum: [ 'overlay', 'slide-left', 'slide-right', 'bottom-sheet' ] },
		accentColour:             { type: 'string', default: 'accent' },
		dividerColour:            { type: 'string', default: 'surface-alt' },
		showCta:                  { type: 'boolean', default: true },
		ctaText:                  { type: 'string', default: '' },
		ctaUrl:                   { type: 'string', default: '' },
		showContactShortcuts:     { type: 'boolean', default: true },
		showSocials:              { type: 'boolean', default: true },
		socialStyle:              { type: 'string', default: 'coloured', enum: [ 'coloured', 'plain', 'outline' ] },
		showSearch:               { type: 'boolean', default: false },
		showAccountTray:          { type: 'boolean', default: false },
		enableSwipe:              { type: 'boolean', default: true },
		desktopHamburger:         { type: 'boolean', default: false },
		staggerDelay:             { type: 'number', default: 25 },
		breakpoint:               { type: 'number', default: 1024 },
		drawerWidth:              { type: 'number', default: 85 },
		drawerWidthMobile:        { type: 'string', default: '' },
		drawerWidthTablet:        { type: 'string', default: '' },
		drawerMaxWidth:           { type: 'number', default: 400 },
		drawerPosition:           { type: 'string', default: 'top', enum: [ 'top', 'centre', 'space-between' ] },
		showLogo:                 { type: 'boolean', default: true },
		logoMaxWidth:             { type: 'number', default: 120 },
		logoMaxWidthMobile:       { type: 'string', default: '' },
		logoMaxWidthTablet:       { type: 'string', default: '' },
		closeButtonSize:          { type: 'number', default: 48 },
		closeButtonSizeMobile:    { type: 'string', default: '' },
		closeButtonSizeTablet:    { type: 'string', default: '' },
		closeButtonStyle:         { type: 'string', default: 'circle', enum: [ 'circle', 'square', 'plain' ] },
		ctaIcon:                  { type: 'string', default: 'arrow-right' },
		ctaStyle:                 { type: 'string', default: 'filled', enum: [ 'filled', 'outline', 'ghost' ] },
		showSecondaryCta:         { type: 'boolean', default: false },
		secondaryCtaText:         { type: 'string', default: '' },
		secondaryCtaUrl:          { type: 'string', default: '' },
		secondaryCtaIcon:         { type: 'string', default: 'phone' },
		secondaryCtaStyle:        { type: 'string', default: 'outline', enum: [ 'filled', 'outline', 'ghost' ] },
		contactDisplayMode:       { type: 'string', default: 'icon-only', enum: [ 'icon-only', 'icon-text', 'hidden' ] },
		showWhatsApp:             { type: 'boolean', default: false },
		linkFontSize:             { type: 'string', default: 'medium' },
		linkFontSizeMobile:       { type: 'string', default: '' },
		linkFontWeight:           { type: 'string', default: '600', enum: [ '400', '500', '600', '700' ] },
		sublinkFontSize:          { type: 'string', default: 'small' },
		sublinkFontSizeMobile:    { type: 'string', default: '' },
		showDividers:             { type: 'boolean', default: true },
		submenuIndent:            { type: 'number', default: 24 },
		submenuIndentMobile:      { type: 'string', default: '' },
		submenuIndentTablet:      { type: 'string', default: '' },
		socialIconSize:           { type: 'number', default: 44 },
		socialIconSizeMobile:     { type: 'string', default: '' },
		socialIconSizeTablet:     { type: 'string', default: '' },
		showTagline:              { type: 'boolean', default: false },
		taglineText:              { type: 'string', default: '' },
		drawerBg:                 { type: 'string', default: 'surface' },
		drawerText:               { type: 'string', default: 'text' },
		drawerGradient:           { type: 'string', default: '' },
		closeButtonBg:            { type: 'string', default: '' },
		closeButtonColour:        { type: 'string', default: '' },
		ctaBg:                    { type: 'string', default: '' },
		ctaTextColour:            { type: 'string', default: '' },
		ctaBorderColour:          { type: 'string', default: '' },
		secondaryCtaBg:           { type: 'string', default: '' },
		secondaryCtaTextColour:   { type: 'string', default: '' },
		linkColour:               { type: 'string', default: 'text' },
		linkHoverColour:          { type: 'string', default: 'primary' },
		linkActiveColour:         { type: 'string', default: 'primary' },
		sublinkColour:            { type: 'string', default: '' },
		sublinkHoverColour:       { type: 'string', default: '' },
		backdropColour:           { type: 'string', default: '' },
		focusColour:              { type: 'string', default: '' },
		animationPreset:          { type: 'string', default: 'spring', enum: [ 'snappy', 'smooth', 'spring', 'bouncy', 'none', 'custom' ] },
		animationDuration:        { type: 'number', default: 400 },
		animationEasing:          { type: 'string', default: 'spring', enum: [ 'spring', 'ease', 'ease-in-out', 'linear' ] },
		exitDuration:             { type: 'number', default: 280 },
		backdropOpacity:          { type: 'number', default: 60 },
		backdropBlur:             { type: 'boolean', default: false },
		backdropBlurAmount:       { type: 'number', default: 8 },
	},
	supports: {
		html: false,
		anchor: true,
		multiple: false,
		color: { background: true, text: true },
		spacing: { padding: true },
	},
	save() {
		return (
			<div { ...useBlockProps.save() }>
				<InnerBlocks.Content />
			</div>
		);
	},
	migrate( attributes ) {
		return attributes;
	},
};

export default [ vNull, v1 ];
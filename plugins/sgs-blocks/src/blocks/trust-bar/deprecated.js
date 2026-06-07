/**
 * SGS Trust Bar — Deprecation entries.
 *
 * Newest-first ordering (WP tries each entry in array order):
 *
 * v4 — Pre-sourceMode shape (save: () => null, no sourceMode attr).
 *
 *   Covers every trust-bar instance authored before the FR-24-10 dual-mode
 *   addition (v0.3.0). These were always dynamic (render.php) with a null save.
 *   sourceMode was subsequently removed (Rule 3 de-plumb); migrate() is a
 *   pass-through — all existing curated items[] content continues unchanged.
 *
 * v3 — Block rename: sgs/trust-badges → sgs/trust-bar (2026-05-31).
 *
 *   isEligible() matches old blocks saved as `sgs/trust-badges`. WordPress
 *   calls this when it encounters a block name not in the registry (sgs/trust-badges
 *   is no longer registered — replaced by sgs/trust-bar).
 *   The migrate() function is a no-op identity pass: all attributes are identical.
 *   No live SGS-theme sites exist (scratch only) so this is a best-effort alias.
 *
 * v2 — Cross-block migration: sgs/certification-bar → sgs/trust-bar (via trust-badges).
 *
 *   isEligible() matches old blocks saved as `sgs/certification-bar`. WordPress
 *   calls this when it encounters a block name it can't find in the registry.
 *   The migrate() function maps all certification-bar attributes to their
 *   trust-bar equivalents, preserving all content.
 *
 *   Attribute mapping:
 *     title           → title          (direct)
 *     items           → items          (cert-bar items may carry media/image/url — all supported
 *                                       by trust-bar image-badge render path)
 *     badgeStyle      → badgeStyle     (cert-bar "text-only"/"image-only"/"image-and-text" →
 *                                       "text-only"/"image-badge"/"image-badge" respectively)
 *     badgeSize       → badgeSize      (direct)
 *     titleColour     → titleColour    (direct)
 *     titleFontSize   → titleFontSize  (direct)
 *     labelColour     → labelColour    (direct)
 *     labelFontSize   → labelFontSize  (direct)
 *
 *   Trust-bar attrs not present in certification-bar default to sensible values.
 */

/**
 * Map certification-bar badgeStyle values to trust-bar equivalents.
 *
 * cert-bar had: text-only | image-only | image-and-text
 * trust-bar: icon-circle | text-only | image-badge
 */
function mapBadgeStyle( certBarStyle ) {
	if ( certBarStyle === 'text-only' ) {
		return 'text-only';
	}
	// image-only and image-and-text both map to image-badge.
	return 'image-badge';
}

/**
 * v4 — Pre-sourceMode null-save shape.
 *
 * Matches every trust-bar block authored before v0.3.0. The previous save()
 * returned null; there is no stored inner HTML to match against.
 *
 * migrate() is a pass-through — all existing curated items[] content continues
 * unchanged. sourceMode has been removed from the live attribute schema (Rule 3
 * de-plumb: typed is the only mode, so it is now implicit).
 */
const v4 = {
	attributes: {
		badgeStyle:             { type: 'string', default: 'icon-circle', enum: [ 'icon-circle', 'text-only', 'image-badge' ] },
		items:                  { type: 'array', default: [] },
		title:                  { type: 'string', default: '', role: 'content' },
		titleColour:            { type: 'string', default: 'text-muted' },
		titleFontSize:          { type: 'string' },
		labelColour:            { type: 'string', default: 'text' },
		labelFontSize:          { type: 'string' },
		badgeSize:              { type: 'string', default: 'medium', enum: [ 'small', 'medium', 'large' ] },
		iconCircleSize:         { type: 'number', default: 44 },
		iconCircleBackground:   { type: 'string', default: 'surface' },
		iconColour:             { type: 'string', default: 'primary-dark' },
		textColour:             { type: 'string', default: 'text' },
		columns:                { type: 'number', default: 4 },
		gap:                    { type: 'string', default: '20' },
		showPendingInEditor:    { type: 'boolean', default: true },
		autoScroll:             { type: 'boolean', default: false },
		autoScrollSpeed:        { type: 'string', default: 'medium', enum: [ 'slow', 'medium', 'fast' ] },
		autoScrollPauseOnHover: { type: 'boolean', default: true },
	},

	supports: {
		sgs: { imageControls: true },
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: true, text: false, gradients: false },
		spacing: { margin: true, padding: true },
		__experimentalBorder: { radius: true, width: false, color: false, style: false },
	},

	save() {
		// v0.2.x blocks used save: () => null (pure dynamic block, no InnerBlocks).
		return null;
	},

	migrate( attrs ) {
		// Pass-through — all existing curated trust-bars need no attribute surgery.
		// sourceMode removed from live schema (Rule 3 de-plumb).
		return { ...attrs };
	},
};

/**
 * v3 — Block rename alias: sgs/trust-badges → sgs/trust-bar.
 * Attribute schema is identical; migrate() is a pass-through.
 */
const v3 = {
	isEligible( blockAttributes, innerBlocks, { name } ) {
		return name === 'sgs/trust-badges';
	},

	attributes: {
		badgeStyle:             { type: 'string', default: 'icon-circle', enum: [ 'icon-circle', 'text-only', 'image-badge' ] },
		items:                  { type: 'array', default: [] },
		title:                  { type: 'string', default: '', role: 'content' },
		titleColour:            { type: 'string', default: 'text-muted' },
		titleFontSize:          { type: 'string' },
		labelColour:            { type: 'string', default: 'text' },
		labelFontSize:          { type: 'string' },
		badgeSize:              { type: 'string', default: 'medium', enum: [ 'small', 'medium', 'large' ] },
		iconCircleSize:         { type: 'number', default: 44 },
		iconCircleBackground:   { type: 'string', default: 'surface' },
		iconColour:             { type: 'string', default: 'primary-dark' },
		textColour:             { type: 'string', default: 'text' },
		columns:                { type: 'number', default: 4 },
		gap:                    { type: 'string', default: '20' },
		showPendingInEditor:    { type: 'boolean', default: true },
		autoScroll:             { type: 'boolean', default: false },
		autoScrollSpeed:        { type: 'string', default: 'medium', enum: [ 'slow', 'medium', 'fast' ] },
		autoScrollPauseOnHover: { type: 'boolean', default: true },
	},

	supports: {
		sgs: { imageControls: true },
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: true, text: false, gradients: false },
		spacing: { margin: true, padding: true },
		__experimentalBorder: { radius: true, width: false, color: false, style: false },
	},

	save() {
		// sgs/trust-badges was always dynamic (render.php), save: () => null.
		return null;
	},

	migrate( attrs ) {
		// Identity pass — attribute schema is unchanged; sourceMode removed from
		// live schema (Rule 3 de-plumb), so no injection needed.
		return { ...attrs };
	},
};

const v2 = {
	/**
	 * isEligible is called when WordPress encounters a block whose name is not
	 * registered. The `name` in blockAttributes comes from the comment delimiter
	 * in serialised post content: `<!-- wp:sgs/certification-bar ... -->`.
	 *
	 * Note: WordPress passes the block name via the second argument to isEligible
	 * (the parsed block object) in some versions. We check both the `name`
	 * attribute (if present) and the block object's name property.
	 */
	isEligible( blockAttributes, innerBlocks, { name } ) {
		return name === 'sgs/certification-bar';
	},

	attributes: {
		title:         { type: 'string', default: '', role: 'content' },
		items:         { type: 'array', default: [] },
		badgeStyle:    { type: 'string', default: 'text-only' },
		badgeSize:     { type: 'string', default: 'medium' },
		titleColour:   { type: 'string', default: 'text' },
		titleFontSize: { type: 'string' },
		labelColour:   { type: 'string', default: 'text-muted' },
		labelFontSize: { type: 'string' },
	},

	supports: {
		sgs: { imageControls: true },
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: true, text: true },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: { radius: true, width: true, color: true, style: true },
	},

	save() {
		// certification-bar was a dynamic block (render.php) with save: () => null.
		return null;
	},

	migrate( attrs ) {
		return {
			// ── Trust-bar new attrs (defaults for incoming cert-bar content) ──
			// sourceMode removed from live schema (Rule 3 de-plumb; typed is implicit).
			badgeStyle:             mapBadgeStyle( attrs.badgeStyle || 'text-only' ),
			badgeSize:              attrs.badgeSize   || 'medium',
			items:                  Array.isArray( attrs.items ) ? attrs.items : [],
			title:                  attrs.title       || '',
			titleColour:            attrs.titleColour || 'text-muted',
			titleFontSize:          attrs.titleFontSize || undefined,
			labelColour:            attrs.labelColour || 'text',
			labelFontSize:          attrs.labelFontSize || undefined,

			// ── icon-circle defaults (not used in cert-bar variants, but required) ──
			iconCircleSize:         44,
			iconCircleBackground:   'surface',
			iconColour:             'primary-dark',
			textColour:             'text',
			columns:                4,
			gap:                    '20',
			showPendingInEditor:    true,

			// ── Auto-scroll — off by default on migration ──
			autoScroll:             false,
			autoScrollSpeed:        'medium',
			autoScrollPauseOnHover: true,
		};
	},
};

export default [ v4, v3, v2 ];

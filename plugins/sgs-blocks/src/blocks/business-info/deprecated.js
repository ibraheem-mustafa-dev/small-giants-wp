/**
 * Business Info Block — Deprecations
 *
 * v1 (FR-S4-4, Wave 2): pre-Site-Info shape. This block was always rendered
 * server-side (`save: () => null`), but earlier iterations may have stored
 * extra per-instance data attributes (phone, email, address, hours, etc.)
 * before the data was lifted into the site-wide Sgs_Site_Info store.
 *
 * Provides:
 *   - A permissive attribute schema that accepts any of the old data fields
 *   - `save: () => null` to match the original null-save shape
 *   - `migrate()` strips the obsolete data attributes from the post content,
 *     keeping only `type` + presentation attributes. The companion PHP
 *     migration in includes/migrations/0002-spec-17-foundation.php has
 *     already lifted the data into the Site Info store on plugin upgrade,
 *     so the JS migrate() is purely a cleanup.
 *
 * @package SGS\Blocks
 */

/** Attributes the v1 schema accepted (presentation + the old data fields). */
const v1Attributes = {
	type:         { type: 'string', default: 'phone' },
	showIcon:     { type: 'boolean', default: true },
	linkPhone:    { type: 'boolean', default: true },
	linkEmail:    { type: 'boolean', default: true },
	iconColour:   { type: 'string', default: 'primary' },
	textColour:   { type: 'string', default: 'text' },
	labelColour:  { type: 'string', default: 'text-muted' },
	// Legacy data attributes — accepted on read, stripped on migrate.
	phone:        { type: 'string', default: '' },
	email:        { type: 'string', default: '' },
	address:      { type: 'string', default: '' },
	hours:        { type: 'object', default: {} },
	socials:      { type: 'object', default: {} },
	copyright:    { type: 'string', default: '' },
	description:  { type: 'string', default: '' },
	mapsCid:      { type: 'string', default: '' },
	businessName: { type: 'string', default: '' },
};

/** v1 — null save (dynamic block). */
const v1 = {
	attributes: v1Attributes,
	save: () => null,

	/**
	 * Strip obsolete data attributes; keep type + presentation only.
	 * The server-side migration has already lifted the data into the store.
	 *
	 * @param {Object} oldAttrs Stored attributes.
	 * @return {Object} New-shape attributes.
	 */
	migrate( oldAttrs ) {
		return {
			type:        oldAttrs.type        ?? 'phone',
			showIcon:    oldAttrs.showIcon    ?? true,
			linkPhone:   oldAttrs.linkPhone   ?? true,
			linkEmail:   oldAttrs.linkEmail   ?? true,
			iconColour:  oldAttrs.iconColour  ?? 'primary',
			textColour:  oldAttrs.textColour  ?? 'text',
			labelColour: oldAttrs.labelColour ?? 'text-muted',
		};
	},
};

export default [ v1 ];

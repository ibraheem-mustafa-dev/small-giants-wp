/**
 * SGS Icon — deprecated.js
 *
 * Newest first (WordPress walks this array, stopping at the first version whose
 * save() output matches the stored post_content).
 *
 * v1 — null-save catch-all (v0.1.x era, pre-v0.2.0).
 *
 *   The icon block has always been fully dynamic (render.php); save() has always
 *   returned null. No serialised HTML is stored in post_content.
 *
 *   v0.2.0 changes that require this entry:
 *     - `backgroundShape` gains `pill` and `outline` enum values.
 *     - `hoverColour` attr renamed to `hoverIconColour` (new separate
 *       `hoverShapeColour` attr added).
 *
 *   Because save() was null before AND remains null in v0.2.0, WordPress will
 *   not detect a save-output mismatch for this block. However, the attribute
 *   rename (hoverColour → hoverIconColour) means existing posts that have a
 *   non-default hoverColour would lose that value on re-save without a
 *   migrate() function.
 *
 *   migrate() maps hoverColour → hoverIconColour so the value is preserved.
 *   New attrs (hoverShapeColour) pick up their block.json defaults automatically.
 *
 * Note: for a purely dynamic block (save: () => null) WordPress only invokes
 * the deprecation chain when the stored attributes fail to parse. This entry
 * acts as a safety net for any post that carries the old hoverColour key in its
 * serialised comment delimiter.
 */

/**
 * Attribute snapshot matching block.json immediately before v0.2.0.
 * Only attrs that changed or were renamed need to be listed; the rest are
 * inherited from the current block.json definition by WordPress.
 */
const V1_ATTRIBUTES = {
	iconSource:       { type: 'string', default: 'lucide' },
	iconName:         { type: 'string', default: 'star' },
	emojiChar:        { type: 'string', default: '' },
	dashiconName:     { type: 'string', default: '' },
	wpIconName:       { type: 'string', default: '' },
	iconSize:         { type: 'number', default: 32 },
	iconColour:       { type: 'string', default: 'primary' },
	backgroundColour: { type: 'string', default: 'surface-alt' },
	backgroundShape:  { type: 'string', default: 'none' },
	linkUrl:          { type: 'string', default: '', role: 'content' },
	linkTarget:       { type: 'string', default: '_self' },
	linkRel:          { type: 'string', default: '' },
	ariaLabel:        { type: 'string', default: '' },
	// v0.1.x name — renamed to hoverIconColour in v0.2.0.
	hoverColour:      { type: 'string', default: 'accent-text' },
	hoverScale:       { type: 'number', default: 1.1 },
};

const v1 = {
	attributes: V1_ATTRIBUTES,

	// Dynamic block — save was null in this era; no serialised HTML to match.
	save: () => null,

	/**
	 * Migrate v0.1.x attrs to v0.2.0 shape.
	 *
	 * Maps hoverColour → hoverIconColour so any custom value is preserved.
	 * hoverShapeColour picks up its '' default from block.json automatically.
	 *
	 * @param {Object} attributes Old block attributes.
	 * @return {Object} New-shape attributes.
	 */
	migrate( attributes ) {
		const { hoverColour, ...rest } = attributes;
		return {
			...rest,
			hoverIconColour: hoverColour ?? 'accent-text',
		};
	},
};

// Newest first.
export default [ v1 ];

/**
 * Deprecations for sgs/quote.
 *
 * v2 — `variantStyle` scalar attribute removed (2026-06-01). Cosmetic presets
 *      are now native WordPress block styles registered via register_block_style()
 *      in includes/variations/sgs-quote-variations.php. The active style class
 *      (`is-style-pullquote`, `is-style-testimonial`, `is-style-plain`) is written
 *      automatically to the `className` attribute by the block editor.
 *
 *      migrate() appends the equivalent `is-style-{value}` class to `className`
 *      so existing posts authored with variantStyle != 'default' display correctly
 *      without a database migration. Posts with variantStyle='default' (or absent)
 *      need no class change — they render identically as the base style.
 *
 * v1 — original save output was `() => null` because sgs/quote was registered as
 *      a leaf dynamic block (all content lived in $attributes['body'][] +
 *      $attributes['attribution']; render.php handled all frontend output).
 *
 *      Phase 1H (2026-05-25) added InnerBlocks support so the deterministic
 *      converter v2 F1 universal-nesting path (Spec 16 §15 line 990) can emit
 *      nested core/paragraph + sgs/text children inside the quote's InnerBlocks
 *      slot. Save now returns <InnerBlocks.Content /> to survive the editor
 *      save round-trip.
 *
 *      This v1 entry reproduces the previous `save: () => null` so existing
 *      posts authored before Phase 1H (with empty innerHTML between the block
 *      comment open/close markers) don't trigger "This block contains
 *      unexpected content" validation errors.
 *
 *      No migrate() needed — the attribute schema is unchanged. Existing posts
 *      keep using $attributes['body'][] + $attributes['attribution']; render.php
 *      still honours that path when $content is empty.
 */

import { InnerBlocks } from '@wordpress/block-editor';

// v2 — variantStyle → is-style-* block-style migration.
const v2 = {
	attributes: {
		body: {
			type: 'array',
			items: { type: 'string' },
			default: [],
			role: 'content',
		},
		attribution: {
			type: 'string',
			default: '',
		},
		attributionEnabled: {
			type: 'boolean',
			default: true,
		},
		// The attribute being retired. Listed here so the editor can read it from
		// serialised post content and pass it to migrate().
		variantStyle: {
			type: 'string',
			enum: [ 'default', 'pullquote', 'testimonial', 'plain' ],
			default: 'default',
		},
	},
	supports: {
		anchor: true,
		className: true,
		html: false,
		color: false,
	},
	// Only apply this deprecation when a non-default variantStyle was saved.
	isEligible( attrs ) {
		return !! attrs.variantStyle && attrs.variantStyle !== 'default';
	},
	migrate( attrs ) {
		const { variantStyle, ...rest } = attrs;
		const existing = rest.className ? rest.className.trim() : '';
		const styleClass = 'is-style-' + variantStyle;
		rest.className = [ existing, styleClass ].filter( Boolean ).join( ' ' );
		return rest;
	},
	save() {
		return <InnerBlocks.Content />;
	},
};

const v1 = {
	// Mirror block.json attributes verbatim. The schema didn't change in Phase 1H —
	// only save output + render.php branching did — so an empty attributes object
	// would also match. Listing the load-bearing attrs explicitly makes the
	// deprecation self-documenting.
	attributes: {
		body: {
			type: 'array',
			items: { type: 'string' },
			default: [],
			role: 'content',
		},
		attribution: {
			type: 'string',
			default: '',
		},
		attributionEnabled: {
			type: 'boolean',
			default: true,
		},
	},
	supports: {
		anchor: true,
		className: true,
		html: false,
		color: false,
	},
	save() {
		return null;
	},
};

export default [ v2, v1 ];

/**
 * Deprecations for sgs/quote.
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

export default [ v1 ];

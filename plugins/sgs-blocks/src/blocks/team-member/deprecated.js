import { createBlock } from '@wordpress/blocks';

/**
 * Deprecated versions of the SGS Team Member block.
 *
 * v2 — socialLinks flat-array → InnerBlocks (sgs/social-icons) migration.
 *      Introduced when the socialLinks attribute was removed and social link
 *      editing was delegated to a child sgs/social-icons InnerBlock. Existing
 *      posts carry a serialised socialLinks array on the team-member block
 *      comment. migrate() converts that array into one sgs/social-icons inner
 *      block, preserving all platform/url data and adding an empty label field
 *      so the WCAG aria-label fallback logic in sgs/social-icons render.php
 *      kicks in for each item.
 *      Returns [ newAttributes, innerBlocks ] tuple — WordPress uses the
 *      innerBlocks value to seed the child block tree on the next editor save.
 *
 * v1 — Schema before memberMedia was introduced (2026-05-05). The block
 *      accepted a headshot via the legacy `photo` object attribute. v1
 *      migrates legacy `photo` objects into the new `memberMedia` unified
 *      slot so existing posts open without "unexpected content" warnings.
 *      `photo` is preserved as a back-compat denormalised fallback.
 *
 * Block is dynamic (save: () => null) — no save HTML to preserve.
 * Order: newest first → [ v2, v1 ].
 */

/**
 * v2 — Full attribute schema as it existed before socialLinks was removed.
 * Includes all attrs that were present at the time of the last v1→current
 * migration (memberMedia era) so WordPress can match stored block comments.
 */
const v2 = {
	attributes: {
		memberMedia:         { type: 'object', default: null },
		photo:               { type: 'object' },
		name:                { type: 'string', default: '', role: 'content' },
		role:                { type: 'string', default: '' },
		bio:                 { type: 'string', default: '', role: 'content' },
		socialLinks:         { type: 'array', default: [], items: { type: 'object' } },
		nameColour:          { type: 'string', default: 'primary' },
		roleColour:          { type: 'string', default: 'text-muted' },
		cardStyle:           { type: 'string', default: 'elevated' },
		photoShape:          { type: 'string', default: 'circle' },
		sgsHoverBgColour:    { type: 'string', default: '' },
		sgsHoverTextColour:  { type: 'string', default: '' },
		sgsHoverBorderColour: { type: 'string', default: '' },
		sgsHoverScale:       { type: 'number', default: 0 },
		sgsHoverShadow:      { type: 'string', default: '' },
		sgsHoverDuration:    { type: 'string', default: 'medium' },
		sgsHoverImageZoom:   { type: 'boolean', default: false },
		sgsHoverGrayscale:   { type: 'boolean', default: false },
		sgsBlockLink:        { type: 'string', default: '' },
		sgsBlockLinkTarget:  { type: 'boolean', default: false },
		hoverScale:          { type: 'string', default: '' },
		hoverShadow:         { type: 'string', default: '' },
		hoverImageZoom:      { type: 'boolean', default: false },
		hoverGrayscale:      { type: 'boolean', default: false },
		transitionDuration:  { type: 'string', default: '300' },
		transitionEasing:    { type: 'string', default: 'ease-in-out' },
		blockLink:           { type: 'string', default: '' },
		blockLinkTarget:     { type: 'boolean', default: false },
		staggerDelay:        { type: 'number', default: 80 },
		sgsAnimation:        { type: 'string', default: 'fade-up' },
		sgsAnimationDuration: { type: 'string', default: 'medium' },
		sgsAnimationEasing:  { type: 'string', default: 'default' },
		hoverOverlay:        { type: 'boolean', default: false },
	},
	// Dynamic block — no serialised save HTML to match.
	save: () => null,
	isEligible( attributes ) {
		// Run only when the old socialLinks attribute is present on the block.
		// Posts already migrated to InnerBlocks won't carry socialLinks.
		return Array.isArray( attributes.socialLinks ) && attributes.socialLinks.length > 0;
	},
	migrate( attributes ) {
		const { socialLinks = [], ...remainingAttrs } = attributes;

		// Build one sgs/social-icons inner block carrying the old links.
		// Each item gets an empty label — render.php falls back to the
		// platform display name for aria-label when label is empty.
		const iconsBlock = createBlock( 'sgs/social-icons', {
			icons: socialLinks.map( ( link ) => ( {
				platform: link.platform || 'website',
				url:      link.url      || '',
				label:    link.label    || '',
			} ) ),
		} );

		// Returning a tuple [ newAttributes, innerBlocks ] tells WordPress
		// to seed the inner block tree with iconsBlock on the next save.
		return [ remainingAttrs, [ iconsBlock ] ];
	},
};

/**
 * v1 — Schema before memberMedia was introduced (2026-05-05).
 */
const v1 = {
	attributes: {
		photo:        { type: 'object' },
		name:         { type: 'string', default: '' },
		role:         { type: 'string', default: '' },
		bio:          { type: 'string', default: '' },
		socialLinks:  { type: 'array', default: [] },
		nameColour:   { type: 'string', default: 'primary' },
		roleColour:   { type: 'string', default: 'text-muted' },
		cardStyle:    { type: 'string', default: 'elevated' },
		photoShape:   { type: 'string', default: 'circle' },
		hoverOverlay: { type: 'boolean', default: false },
	},
	save: () => null,
	isEligible( attributes ) {
		// Only run when a legacy photo exists and memberMedia has not yet
		// been populated — prevents re-running on already-migrated posts.
		return !! (
			attributes &&
			attributes.photo &&
			attributes.photo.url &&
			! attributes.memberMedia
		);
	},
	migrate( attributes ) {
		const next = { ...attributes };
		if ( attributes.photo && attributes.photo.url && ! attributes.memberMedia ) {
			next.memberMedia = {
				url:  attributes.photo.url,
				type: 'image',
				id:   attributes.photo.id  || 0,
				alt:  attributes.photo.alt || '',
				mime: 'image/jpeg',
			};
		}
		return next;
	},
};

export default [ v2, v1 ];

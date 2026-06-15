import { createBlock } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Deprecated versions of the SGS Team Member block.
 *
 * v3 — InnerBlocks (sgs/social-icons) era -> socialLinks scalar array.
 *      Introduced when InnerBlocks were removed and social links moved back
 *      to a flat socialLinks array attribute. Posts saved in the v3→current
 *      transition carry a serialised <InnerBlocks.Content /> in post_content.
 *      WordPress will try to match the stored save output against each
 *      deprecated save() in order. The v3 save (InnerBlocks.Content) matches
 *      existing posts so WordPress can open them. migrate() extracts any
 *      sgs/social-icons child blocks' icons attr into the new socialLinks attr.
 *
 * v2 — socialLinks flat-array -> InnerBlocks (sgs/social-icons) migration.
 *      Existing posts carried a serialised socialLinks array on the team-member
 *      block comment. migrate() converts that array into one sgs/social-icons
 *      inner block, preserving all platform/url data.
 *      Returns [ newAttributes, innerBlocks ] tuple.
 *
 * v1 — Schema before memberMedia was introduced (2026-05-05). The block
 *      accepted a headshot via the legacy `photo` object attribute. v1
 *      migrates legacy `photo` objects into the new `memberMedia` unified
 *      slot so existing posts open without "unexpected content" warnings.
 *      `photo` is preserved as a back-compat denormalised fallback.
 *
 * Block is dynamic (save: () => null) — no save HTML to preserve for
 * current version; deprecations only exist to handle prior eras.
 * Order: newest first -> [ v3, v2, v1 ].
 */

/**
 * v3 — InnerBlocks era (sgs/social-icons as child block).
 *
 * Full attribute schema as it existed in the InnerBlocks era:
 * same as current but WITHOUT socialLinks (social icons lived in a child block)
 * and WITH the implicit widthMode/contentWidth/maxWidth wrapper attrs added
 * during WS-4. The save emits <InnerBlocks.Content /> so WordPress can match
 * existing serialised post_content.
 *
 * migrate() extracts social link data from the innerBlocks argument (second
 * param WordPress passes to migrate for blocks that have inner blocks) and
 * maps it into the new socialLinks scalar array. If no sgs/social-icons child
 * is present the migration still succeeds with an empty socialLinks array.
 */
const v3 = {
	attributes: {
		memberMedia:           { type: 'object', default: null },
		photo:                 { type: 'object' },
		name:                  { type: 'string', default: '', role: 'content' },
		role:                  { type: 'string', default: '' },
		bio:                   { type: 'string', default: '', role: 'content' },
		nameColour:            { type: 'string', default: 'primary' },
		roleColour:            { type: 'string', default: 'text-muted' },
		cardStyle:             { type: 'string', default: 'elevated' },
		displayMode:           { type: 'string', default: 'full' },
		photoShape:            { type: 'string', default: 'circle' },
		sgsHoverBgColour:      { type: 'string', default: '' },
		sgsHoverTextColour:    { type: 'string', default: '' },
		sgsHoverBorderColour:  { type: 'string', default: '' },
		sgsHoverScale:         { type: 'number', default: 0 },
		sgsHoverShadow:        { type: 'string', default: '' },
		sgsHoverDuration:      { type: 'string', default: 'medium' },
		sgsHoverImageZoom:     { type: 'boolean', default: false },
		sgsHoverGrayscale:     { type: 'boolean', default: false },
		sgsBlockLink:          { type: 'string', default: '' },
		sgsBlockLinkTarget:    { type: 'boolean', default: false },
		hoverScale:            { type: 'string', default: '' },
		hoverShadow:           { type: 'string', default: '' },
		hoverImageZoom:        { type: 'boolean', default: false },
		hoverGrayscale:        { type: 'boolean', default: false },
		transitionDuration:    { type: 'string', default: '300' },
		transitionEasing:      { type: 'string', default: 'ease-in-out' },
		blockLink:             { type: 'string', default: '' },
		blockLinkTarget:       { type: 'boolean', default: false },
		staggerDelay:          { type: 'number', default: 80 },
		sgsAnimation:          { type: 'string', default: 'fade-up' },
		sgsAnimationDuration:  { type: 'string', default: 'medium' },
		sgsAnimationEasing:    { type: 'string', default: 'default' },
		hoverOverlay:          { type: 'boolean', default: false },
		widthMode:             { type: 'string', default: 'default', enum: [ 'default', 'wide', 'full', 'custom' ] },
		widthModeMobile:       { type: 'string', default: '' },
		widthModeTablet:       { type: 'string', default: '' },
		widthModeDesktop:      { type: 'string', default: '' },
		customWidth:           { type: 'number', default: 0 },
		customWidthUnit:       { type: 'string', default: 'px' },
		contentWidth:          { type: 'string', default: '' },
		maxWidth:              { type: 'string', default: '' },
	},
	// This save matches the InnerBlocks era serialised output.
	// eslint-disable-next-line react/display-name
	save: () => <InnerBlocks.Content />,
	isEligible( attributes ) {
		// Run only when there is no socialLinks attr (InnerBlocks era posts
		// don't carry socialLinks on the block comment).
		return ! Array.isArray( attributes.socialLinks );
	},
	migrate( attributes, innerBlocks ) {
		// Extract social link data from any sgs/social-icons child blocks.
		let socialLinks = [];
		if ( Array.isArray( innerBlocks ) ) {
			for ( const child of innerBlocks ) {
				if ( child.name === 'sgs/social-icons' ) {
					const icons = child.attributes?.icons || [];
					socialLinks = icons
						.filter( ( item ) => !! item.url )
						.map( ( item ) => ( {
							platform: item.platform || 'website',
							url:      item.url,
						} ) );
					break; // Only the first sgs/social-icons child is used.
				}
			}
		}
		// Return new attributes only — pure leaf, no inner blocks.
		return { ...attributes, socialLinks };
	},
};

/**
 * v2 — Full attribute schema as it existed before socialLinks was removed
 * the first time (era: flat socialLinks array on the block).
 */
const v2 = {
	attributes: {
		memberMedia:          { type: 'object', default: null },
		photo:                { type: 'object' },
		name:                 { type: 'string', default: '', role: 'content' },
		role:                 { type: 'string', default: '' },
		bio:                  { type: 'string', default: '', role: 'content' },
		socialLinks:          { type: 'array', default: [], items: { type: 'object' } },
		nameColour:           { type: 'string', default: 'primary' },
		roleColour:           { type: 'string', default: 'text-muted' },
		cardStyle:            { type: 'string', default: 'elevated' },
		photoShape:           { type: 'string', default: 'circle' },
		sgsHoverBgColour:     { type: 'string', default: '' },
		sgsHoverTextColour:   { type: 'string', default: '' },
		sgsHoverBorderColour: { type: 'string', default: '' },
		sgsHoverScale:        { type: 'number', default: 0 },
		sgsHoverShadow:       { type: 'string', default: '' },
		sgsHoverDuration:     { type: 'string', default: 'medium' },
		sgsHoverImageZoom:    { type: 'boolean', default: false },
		sgsHoverGrayscale:    { type: 'boolean', default: false },
		sgsBlockLink:         { type: 'string', default: '' },
		sgsBlockLinkTarget:   { type: 'boolean', default: false },
		hoverScale:           { type: 'string', default: '' },
		hoverShadow:          { type: 'string', default: '' },
		hoverImageZoom:       { type: 'boolean', default: false },
		hoverGrayscale:       { type: 'boolean', default: false },
		transitionDuration:   { type: 'string', default: '300' },
		transitionEasing:     { type: 'string', default: 'ease-in-out' },
		blockLink:            { type: 'string', default: '' },
		blockLinkTarget:      { type: 'boolean', default: false },
		staggerDelay:         { type: 'number', default: 80 },
		sgsAnimation:         { type: 'string', default: 'fade-up' },
		sgsAnimationDuration: { type: 'string', default: 'medium' },
		sgsAnimationEasing:   { type: 'string', default: 'default' },
		hoverOverlay:         { type: 'boolean', default: false },
	},
	// Dynamic block — no serialised save HTML to match.
	save: () => null,
	isEligible( attributes ) {
		// Run only when the old socialLinks attribute is present on the block
		// AND there's no displayMode (pre-WS-4 era without wrapper attrs).
		return Array.isArray( attributes.socialLinks ) && attributes.socialLinks.length > 0
			&& ! attributes.widthMode;
	},
	migrate( attributes ) {
		const { socialLinks = [], ...remainingAttrs } = attributes;

		// Build one sgs/social-icons inner block carrying the old links.
		const iconsBlock = createBlock( 'sgs/social-icons', {
			icons: socialLinks.map( ( link ) => ( {
				platform: link.platform || 'website',
				url:      link.url      || '',
				label:    link.label    || '',
			} ) ),
		} );

		// v2 -> v3 path: return as inner blocks (the v3 InnerBlocks era).
		// v3 migration will then pick up and flatten them to socialLinks.
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

export default [ v3, v2, v1 ];
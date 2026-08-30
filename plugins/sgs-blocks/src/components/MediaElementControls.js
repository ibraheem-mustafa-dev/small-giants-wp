/**
 * L1 — media attribute NAMING. The contract every later wave inherits.
 *
 * Mirrors the typography helper pair (`typographyAttrName`/`typographyAttrKeys`
 * in TypographyControls.js) deliberately: that pair is proven, is measured by
 * `check-control-helper-parity.py`, and is the shape this repo already rewards.
 * Media becomes the fourth name-keyed family.
 *
 * ⛔ LIVES IN src/components/ ON PURPOSE. The parity gate discovers helper
 * families from disk by convention - a `*AttrName`/`*AttrKeys` export in THIS
 * directory, plus a `sgs_*` PHP function whose name carries this component's
 * slug (`MediaElementControls` -> `media_element`, hence
 * `sgs_media_element_attr()` in includes/helpers-media-element.php). The
 * originally-proposed `src/media/controls/` sits outside that scan, so Media
 * would have silently never registered as the fourth family.
 *
 * ⛔ ZERO ATTRIBUTE RENAMES. WordPress silently discards an attribute a block no
 * longer declares, so a rename is a stored-`post_content` migration and the
 * client's image vanishes with every gate green (D338 / STOP-SILENT-ATTR-DISCARD).
 * The naming convention below was DERIVED from the census
 * (reports/migrations/media-element-census.json), not invented: across 124 real
 * media attributes on six surfaces there are only THREE names the convention
 * does not reproduce, and all three are one intentional case (see STORED_AS).
 */

/**
 * Build a prefixed attribute name.
 *
 * Identical rule to `typographyAttrName`: with a prefix, PascalCase the base
 * onto it; without one, the base drops to camelCase.
 *
 *   mediaAttrName( 'before', 'ImageUrl' ) -> 'beforeImageUrl'
 *   mediaAttrName( '', 'ImageUrl' )       -> 'imageUrl'
 *   mediaAttrName( 'split', 'Image' )     -> 'splitImage'
 *   mediaAttrName( 'bg', 'Video' )        -> 'bgVideo'
 *
 * @param {string} prefix Surface prefix ('' for an unprefixed surface).
 * @param {string} base   PascalCase base from MEDIA_BASES.
 * @return {string} The attribute name.
 */
export function mediaAttrName( prefix, base ) {
	return prefix ? prefix + base : base.charAt( 0 ).toLowerCase() + base.slice( 1 );
}

/**
 * The canonical base vocabulary, DERIVED from the census rather than invented.
 *
 * Grouped by what each base is FOR, because the groups gate differently: a
 * source base is meaningless without media, a behaviour base only applies to
 * video, and so on.
 */
export const MEDIA_BASES = {
	// The media itself. `Image`/`Video` are OBJECT-shaped ({id,url,alt}) on
	// hero/container; `ImageId` + `ImageUrl` are the scalar PAIR shape used by
	// media/before-after/decorative-image. Both are real and both are kept -
	// see the census `storage_shapes` field. A helper that assumes one shape
	// can only read part of the population.
	source: [
		'Image',
		'ImageId',
		'ImageUrl',
		'Video',
		'VideoId',
		'VideoUrl',
		'Svg',
		'SvgContent',
		'Thumbnail',
		'ThumbnailId',
	],
	// Which of the three types is showing.
	type: [ 'MediaType', 'VideoSource', 'VideoMimeType' ],
	// Meaning / accessibility. Per-instance by design: the same logo is
	// meaningful in a header and decorative in a footer strip.
	meaning: [ 'ImageAlt', 'VideoAlt', 'ImageIsDecorative' ],
	// Video playback. Currently declared only by sgs/media - the other video
	// surfaces hardcode these server-side, which is a GAP in those surfaces
	// rather than a naming difference.
	behaviour: [
		'VideoAutoplay',
		'VideoLoop',
		'VideoMuted',
		'VideoControls',
		'VideoPlaysInline',
		'VideoLazyLoad',
		'VideoCaptionsId',
		'VideoCaptionsUrl',
		'VideoCaptionsLabel',
		'VideoCaptionsSrcLang',
	],
	// SVG presentation.
	svg: [
		'SvgAnimation',
		'SvgAnimationSpeed',
		'SvgOpacity',
		'SvgPosition',
		'SvgMinHeight',
		'SvgTextShadow',
	],
	// Intrinsic dimensions, written from the chosen media rather than edited.
	intrinsic: [ 'ImageWidth', 'ImageHeight' ],
};

/** Device tiers. Never hardcode 768/1024 here - see SGS_BREAKPOINTS. */
export const MEDIA_TIERS = [ 'Tablet', 'Mobile' ];

/**
 * Attribute names that the convention does NOT reproduce, per surface.
 *
 * Measured, not assumed: exactly three across the whole population, and all
 * three are `sgs/before-after`'s shared autoplay - ONE toggle governing BOTH
 * video slots per its sync contract, so it is deliberately block-level rather
 * than per-prefix. `decorMedia` is listed for `sgs/decorative-image` because it
 * is a legacy composite object with no prefix/base decomposition at all.
 *
 * An entry here is a name the shared layer must READ AS-IS. It is never a
 * licence to rename the stored attribute.
 */
export const STORED_AS = {
	'sgs/before-after': {
		// Block-level, not per-slot: one autoplay governs both <video> elements.
		videoAutoplay: 'videoAutoplay',
		videoAutoplayTablet: 'videoAutoplayTablet',
		videoAutoplayMobile: 'videoAutoplayMobile',
	},
	'sgs/decorative-image': {
		decorMedia: 'decorMedia',
	},
};

/**
 * The canonical key set for a prefix - the thing a block spreads rather than
 * hand-declaring each key.
 *
 * Returns a logical-name -> attribute-name map, exactly as
 * `typographyAttrKeys()` does, so a consumer never concatenates strings itself.
 * Tiered keys are included for every source base, because art direction is the
 * one capability every surveyed surface either has or is missing.
 *
 * @param {string} prefix Surface prefix ('' for unprefixed).
 * @return {Object} logical name -> attribute name.
 */
export function mediaAttrKeys( prefix ) {
	const keys = {};

	Object.keys( MEDIA_BASES ).forEach( ( group ) => {
		MEDIA_BASES[ group ].forEach( ( base ) => {
			const logical = base.charAt( 0 ).toLowerCase() + base.slice( 1 );
			keys[ logical ] = mediaAttrName( prefix, base );
		} );
	} );

	// Per-tier siblings for the source + behaviour families. Presentation and
	// meaning are not tiered anywhere in the measured population, so adding
	// tiers for them would declare attributes nothing reads - the dead-control
	// class the framework already gates against.
	[ ...MEDIA_BASES.source, ...MEDIA_BASES.behaviour ].forEach( ( base ) => {
		MEDIA_TIERS.forEach( ( tier ) => {
			const logical =
				base.charAt( 0 ).toLowerCase() + base.slice( 1 ) + tier;
			keys[ logical ] = mediaAttrName( prefix, base + tier );
		} );
	} );

	return keys;
}

/**
 * Resolve the attribute name a SURFACE actually stores, honouring STORED_AS.
 *
 * Use this rather than `mediaAttrName()` directly whenever a block slug is in
 * hand - it is the difference between reading the client's real value and
 * reading an attribute that has never existed.
 *
 * @param {string} blockSlug e.g. 'sgs/before-after'.
 * @param {string} prefix    Surface prefix.
 * @param {string} base      PascalCase base.
 * @return {string} The stored attribute name.
 */
export function mediaStoredAttrName( blockSlug, prefix, base ) {
	const generated = mediaAttrName( prefix, base );
	const overrides = STORED_AS[ blockSlug ];
	if ( ! overrides ) {
		return generated;
	}
	const unprefixed = base.charAt( 0 ).toLowerCase() + base.slice( 1 );
	return overrides[ unprefixed ] || overrides[ generated ] || generated;
}

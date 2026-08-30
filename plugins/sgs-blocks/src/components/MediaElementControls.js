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
 * media attributes on six surfaces there are only FOUR names the convention
 * does not reproduce, across TWO blocks (see STORED_AS).
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

	// ── PRESENTATION (atoms 7-10). Added from the census's presentation half.
	//
	// Two vocabularies, one concept, split by SCOPE and kept apart on purpose:
	// `ObjectFit`/`ObjectPosition` apply to a replaced element (an <img> or
	// <video>); `Size`/`Position`/`Repeat`/`Attachment` apply to a painted
	// background box. They are not interchangeable, which is exactly what the
	// atom layer normalises for the client.
	//
	// ⛔ Neither applies to an inline <svg>: object-fit does nothing to one, so
	// the SVG path is a separate implementation (preserveAspectRatio or a sized
	// wrapper), never a third selector pretending otherwise.
	fit: [ 'ObjectFit', 'Size' ],
	focal: [ 'ObjectPosition', 'Position', 'Repeat', 'Attachment' ],
	shape: [
		'MediaSizing',
		'AspectRatio',
		'Shape',
		'Height',
		'HeightUnit',
		'MaxHeight',
		'MaxHeightUnit',
		'MaxWidth',
		'MaxWidthUnit',
		'MaxWidthPercent',
		'MinHeight',
		'Width',
		'WidthUnit',
	],
	overlay: [
		'OverlayColour',
		'OverlayColourHover',
		'OverlayGradient',
		'OverlayGradientHover',
		'OverlayOpacity',
		'OverlayBlendMode',
	],
};

/**
 * Bases whose VALUE legitimately differs per device.
 *
 * Tiering is a capability, not a default. Every source and behaviour base is
 * tiered because art direction and playback genuinely differ per device. Of the
 * presentation bases only these four do: a crop focus, a size and an overlay
 * strength differ on a phone; a fit mode, a blend mode and a unit do not.
 *
 * ⛔ Declaring a tier for a base nothing varies per device creates attributes no
 * renderer reads - the dead-control class `check-dead-controls.js` gates. This
 * list is the single source for BOTH injection filters; neither derives the
 * tiered set from group membership any more.
 */
export const MEDIA_TIERED_BASES = [
	...[ 'Image', 'ImageId', 'ImageUrl', 'Video', 'VideoId', 'VideoUrl', 'Svg',
		'SvgContent', 'Thumbnail', 'ThumbnailId' ],
	...[ 'VideoAutoplay', 'VideoLoop', 'VideoMuted', 'VideoControls',
		'VideoPlaysInline', 'VideoLazyLoad', 'VideoCaptionsId', 'VideoCaptionsUrl',
		'VideoCaptionsLabel', 'VideoCaptionsSrcLang' ],
	'ObjectPosition',
	'Height',
	'Width',
	'MinHeight',
	'OverlayOpacity',
];

/** Device tiers. Never hardcode 768/1024 here - see SGS_BREAKPOINTS. */
export const MEDIA_TIERS = [ 'Tablet', 'Mobile' ];

/**
 * The declared TYPE for each base, keyed by base name.
 *
 * ⛔ Shape is not cosmetic. WordPress coerces a value that does not match its
 * declared type back to the attribute's default, silently - a flat string on an
 * object-typed attr, or an out-of-enum value, simply vanishes on load with no
 * error (STOP-D328-SHAPE-NOT-JUST-VALUE). Declaring the wrong type here would
 * delete the client's media rather than fail loudly.
 *
 * `null` in a union is the INHERIT sentinel for tiered booleans: null means
 * "use the tier above", which is why those cannot be plain booleans.
 *
 * This map is the single source. `scripts/generate-media-attributes.mjs` emits
 * the PHP twin from it, so the server schema cannot drift from the client's.
 */
export const MEDIA_ATTR_TYPES = {
	// Composite {id,url,alt} objects.
	Image: 'object',
	Video: 'object',
	Thumbnail: 'object',
	DecorMedia: 'object',
	// Attachment IDs.
	ImageId: 'integer',
	VideoId: 'integer',
	ThumbnailId: 'integer',
	VideoCaptionsId: 'integer',
	// Strings.
	ImageUrl: 'string',
	VideoUrl: 'string',
	ImageAlt: 'string',
	VideoAlt: 'string',
	Svg: 'string',
	SvgContent: 'string',
	MediaType: 'string',
	VideoSource: 'string',
	VideoMimeType: 'string',
	VideoCaptionsUrl: 'string',
	VideoCaptionsLabel: 'string',
	VideoCaptionsSrcLang: 'string',
	SvgAnimation: 'string',
	SvgAnimationSpeed: 'string',
	SvgPosition: 'string',
	SvgMinHeight: 'string',
	// Booleans.
	ImageIsDecorative: 'boolean',
	SvgTextShadow: 'boolean',
	VideoAutoplay: 'boolean',
	VideoLoop: 'boolean',
	VideoMuted: 'boolean',
	VideoControls: 'boolean',
	VideoPlaysInline: 'boolean',
	VideoLazyLoad: 'boolean',
	// Numbers.
	SvgOpacity: 'number',
	ImageWidth: 'number',
	ImageHeight: 'number',

	// ── PRESENTATION.
	//
	// ⛔ TWO BASES CARRY A TYPE CONFLICT ACROSS SURFACES, and the type declared
	// here is what a FRESH adoption gets - never a retrofit of an existing one.
	// A block's own declaration always wins at injection, so the divergent
	// surfaces keep their shape and the atom READS it (see the atom registry's
	// `reads` field):
	//
	//   Height  object here. `sgs/media` and `sgs/before-after` agree; but
	//           `sgs/product-card` declares `imageHeight` as a plain "180px"
	//           STRING. Two concepts under one base - see the census traps.
	//   Width   object here. `sgs/decorative-image` agrees; `sgs/hero` declares
	//           `splitMediaWidth` as a NUMBER paired with `splitMediaWidthUnit`.
	//
	// Declaring a union would accept both and lose the shape validation that
	// makes a mismatched value fail loudly instead of silently (D549).
	ObjectFit: 'string',
	Size: 'string',
	ObjectPosition: 'string',
	Position: 'string',
	Repeat: 'string',
	Attachment: 'string',
	MediaSizing: 'string',
	AspectRatio: 'string',
	Shape: 'string',
	Height: 'object',
	HeightUnit: 'string',
	MaxHeight: 'object',
	MaxHeightUnit: 'string',
	MaxWidth: 'object',
	MaxWidthUnit: 'string',
	MaxWidthPercent: 'number',
	MinHeight: 'object',
	Width: 'object',
	WidthUnit: 'string',
	OverlayColour: 'string',
	OverlayColourHover: 'string',
	OverlayGradient: 'string',
	OverlayGradientHover: 'string',
	OverlayOpacity: 'number',
	OverlayBlendMode: 'string',
};

/**
 * Resolve the declared type for a base at a given tier.
 *
 * A tiered BOOLEAN becomes `[ 'boolean', 'null' ]` because null is the
 * inherit-from-the-tier-above sentinel. Every other type is unchanged by tier.
 *
 * @param {string} base PascalCase base.
 * @param {string} tier '' | 'Tablet' | 'Mobile'.
 * @return {string|string[]} The declared type.
 */
export function mediaAttrType( base, tier ) {
	const type = MEDIA_ATTR_TYPES[ base ] || 'string';
	if ( tier && 'boolean' === type ) {
		return [ 'boolean', 'null' ];
	}
	return type;
}

/**
 * Attribute names that the convention does NOT reproduce, per surface.
 *
 * Measured, not assumed: exactly FOUR across the whole population, in TWO
 * distinct cases. Three are `sgs/before-after`'s shared autoplay - ONE toggle governing BOTH
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

	// Per-tier siblings, driven by MEDIA_TIERED_BASES rather than by group
	// membership - presentation is only PARTLY tiered, so a group-derived rule
	// would either miss ObjectPosition or invent tiers for OverlayBlendMode.
	MEDIA_TIERED_BASES.forEach( ( base ) => {
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

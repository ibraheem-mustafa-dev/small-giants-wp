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
	// The media itself. `ImageId`+`ImageUrl` / `VideoId`+`VideoUrl` are the
	// scalar PAIR shape every live consumer actually stores (media,
	// before-after, decorative-image, and — since the Wave 6 decomposition,
	// D-pending 2026-09-02 — hero's split-media too). `SvgContent` is the
	// inline-markup string. `Thumbnail`/`ThumbnailId` is a genuine
	// OBJECT-shaped ({id,url,alt}) pair, still real (sgs/media's video
	// poster, sgs/image-sequence).
	//
	// ⛔ `Image`/`Video`/`Svg` (the BARE, composite {id,url,alt}/string forms
	// this comment used to also list here) were REMOVED 2026-09-02. They
	// were a pre-decomposition convention — true when hero stored a single
	// `splitImage` object attr — and by the time hero's decomposition
	// shipped (dcd9940d2) no block anywhere still wrote or read them: zero
	// `"image":`/`"video":`/`"svg":` (bare) declarations in any block.json,
	// zero render.php/edit.js reads, zero editor control in
	// `source.control.js` (which only ever writes the Id/Url pair or
	// SvgContent). Keeping them in this atom meant EVERY surface adopting
	// `atoms:['source']` had these three dead names silently
	// re-registered server-side by `sgs_register_media_element_attrs()`
	// even after a block's own block.json stopped declaring them — exactly
	// how hero's already-deleted `splitImage`/`splitImageMobile` kept
	// reappearing in the live registered schema post-deploy. See
	// `includes/media-element-attrs-register.php`'s module docblock.
	source: [
		'ImageId',
		'ImageUrl',
		'VideoId',
		'VideoUrl',
		'SvgContent',
		'Thumbnail',
		'ThumbnailId',
	],
	// Which of the three types is showing.
	type: [ 'MediaType', 'VideoSource', 'VideoMimeType' ],
	// Meaning / accessibility. Per-instance by design: the same logo is
	// meaningful in a header and decorative in a footer strip.
	meaning: [ 'ImageAlt', 'VideoAlt', 'ImageDecorative' ],
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
		// A genuine editable radius for `Shape:'rounded'`, distinct from the
		// clip-path vocabulary (2026-09-01). NEW attribute — no existing block
		// declares it, so nothing breaks. Tiered (see MEDIA_TIERED_BASES below):
		// a 4-corner box-family object per device, matching
		// `ResponsiveBorderRadiusControl`'s own shape. This is intentionally a
		// SEPARATE custom property from `SgsBorderControl`/native
		// `__experimentalBorder`'s `border-radius` — it governs the MEDIA
		// ELEMENT's own shape (`.sgs-media-el`), not the block wrapper's border
		// chrome, so the two never target the same node today. See
		// box-shape.js's module docblock for the collision risk this still
		// leaves open if a future block adopts both on one element.
		'BorderRadius',
		// The border's own paint (2026-09-02, Bean-directed) — `SgsBorderControl`
		// fed this atom's OWN attribute names, exactly as `sgs/before-after`
		// feeds it its own (`src/blocks/before-after/edit.js:739-761`, the
		// canonical live adopter). `BorderWidth` is an UNTIERED 4-side box
		// object ({top,right,bottom,left}) — per-device border width is
		// CANCELLED, not deferred (Bean, 2026-08-29; see CLAUDE.md "Border
		// controls"), so this base is deliberately absent from
		// MEDIA_TIERED_BASES below. `BorderStyle` is a flat keyword string.
		// `BorderColour`/`BorderColourGradient` are the flat colour pair
		// (`colourLinked:true` — a palette slug, not a baked hex). This is a
		// SEPARATE paint from `--sgs-media-border-radius` above; the two
		// together are the media element's own border, distinct from the
		// block WRAPPER's border chrome (still `SgsBorderControl`/native
		// `__experimentalBorder` on the wrapper itself).
		'BorderWidth',
		'BorderStyle',
		'BorderColour',
		'BorderColourGradient',
	],
	overlay: [
		'OverlayColour',
		'OverlayColourHover',
		'OverlayGradient',
		'OverlayGradientHover',
		'OverlayOpacity',
		'OverlayBlendMode',
	],
	// Motion (atom 11, added 2026-09-01, Bean-directed). Harvested from two
	// working implementations rather than designed fresh — sgs/hero's
	// mediaParallax/mediaKenBurns/mediaAnimationDuration (split-media, element
	// scope) and sgs/container's bgParallax/bgKenBurns/bgAnimationDuration
	// (backdrop scope). Mutually exclusive pair (KenBurns/Parallax), enforced
	// in the control's own onChange exactly as hero already does — the
	// registry's `requires` field expresses "X requires Y", not "X excludes
	// Y", so exclusivity is a control-layer rule, not a registry one. Not
	// tiered: neither reference implementation has Tablet/Mobile variants.
	motion: [
		'KenBurns',
		'Parallax',
		'AnimationDuration',
	],

	// ── Wave 5c atoms (12-16, added 2026-09-01) ─────────────────────────────
	//
	// Harvested from `sgs/media`'s own hand-rolled controls — every base name
	// below is EXACTLY the attribute name that block already stores (zero
	// renames, D338). `padding` is the one genuinely new attribute; the other
	// four already existed as unprefixed, unpromoted block-private attrs.
	opacity: [ 'Opacity' ],
	shadow: [ 'BoxShadow', 'BoxShadowColour', 'BoxShadowColourHover' ],
	// A 4-side box-family object ({top,right,bottom,left}), matching
	// `ResponsiveBoxControl`'s own shape (padding/margin/border-width). Brand
	// new — `sgs/media` never declared a padding attribute before this atom.
	padding: [ 'Padding' ],
	caption: [ 'Caption', 'CaptionTag' ],
	link: [ 'LinkUrl', 'LinkOpensNewTab', 'LinkRel' ],
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
	...[ 'ImageId', 'ImageUrl', 'VideoId', 'VideoUrl',
		'SvgContent', 'Thumbnail', 'ThumbnailId' ],
	...[ 'VideoAutoplay', 'VideoLoop', 'VideoMuted', 'VideoControls',
		'VideoPlaysInline', 'VideoLazyLoad', 'VideoCaptionsId', 'VideoCaptionsUrl',
		'VideoCaptionsLabel', 'VideoCaptionsSrcLang' ],
	'ObjectFit',
	'ObjectPosition',
	'Height',
	'Width',
	'MinHeight',
	'OverlayOpacity',
	'BorderRadius',
	// Wave 5c: padding genuinely differs per device, same reasoning as every
	// other box-family base above.
	'Padding',
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
	// Composite {id,url,alt} objects. `Image`/`Video` (bare) were removed
	// 2026-09-02 — dead pre-decomposition bases, see MEDIA_BASES.source above.
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
	ImageDecorative: 'boolean',
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
	// A 4-corner box-family object ({topLeft,topRight,bottomLeft,bottomRight}),
	// matching ResponsiveBorderRadiusControl's own per-tier shape.
	BorderRadius: 'object',
	// A 4-side box-family object ({top,right,bottom,left}), matching
	// SgsBorderControl's own `widthValues` shape. Untiered — see the
	// MEDIA_BASES.shape docblock above.
	BorderWidth: 'object',
	BorderStyle: 'string',
	BorderColour: 'string',
	BorderColourGradient: 'string',
	OverlayColour: 'string',
	OverlayColourHover: 'string',
	OverlayGradient: 'string',
	OverlayGradientHover: 'string',
	OverlayOpacity: 'number',
	OverlayBlendMode: 'string',
	// Motion (atom 11).
	KenBurns: 'boolean',
	Parallax: 'boolean',
	AnimationDuration: 'number',

	// ── Wave 5c atoms (12-16). ──────────────────────────────────────────────
	Opacity: 'number',
	BoxShadow: 'string',
	BoxShadowColour: 'string',
	BoxShadowColourHover: 'string',
	// A 4-side box-family object, matching `BorderWidth`'s own shape above.
	Padding: 'object',
	Caption: 'string',
	CaptionTag: 'string',
	LinkUrl: 'string',
	LinkOpensNewTab: 'boolean',
	LinkRel: 'string',
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
	'sgs/brand-strip': {
		// Pre-existing client control, kept as the only UI — this block's
		// logo-fit dropdown already writes `logoFit` (enum contain|cover,
		// default contain). Bridged onto the shared object-fit atom rather
		// than renamed, per the zero-renames rule above.
		objectFit: 'logoFit',
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

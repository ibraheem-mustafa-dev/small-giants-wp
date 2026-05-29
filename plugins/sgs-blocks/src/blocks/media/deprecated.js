/**
 * sgs/media — deprecation entries.
 *
 * v1: block.json 1.0.0 (image-only, no video attrs).
 *     save() returned null (dynamic block), so WordPress validates against
 *     the serialised comment only. No structural HTML change — the only risk
 *     is attribute schema validation for new video attrs that existing posts
 *     don't carry. Adding new attrs with defaults in v1 here prevents
 *     "unexpected or invalid content" errors on existing image-only posts.
 *
 * Order: newest first (v1 is the only historical entry at this point).
 */

const v1 = {
	attributes: {
		imageId: {
			type:    'integer',
			default: null,
		},
		imageUrl: {
			type:    'string',
			default: '',
			role:    'content',
		},
		imageAlt: {
			type:    'string',
			default: '',
			role:    'content',
		},
		imageWidth: {
			type:    'integer',
			default: null,
		},
		imageHeight: {
			type:    'integer',
			default: null,
		},
		maxWidth:        { type: 'string',  default: null },
		maxWidthUnit:    { type: 'string',  default: 'px' },
		maxWidthMobile:  { type: 'string',  default: null },
		maxWidthTablet:  { type: 'string',  default: null },
		maxHeight:       { type: 'string',  default: null },
		maxHeightUnit:   { type: 'string',  default: 'px' },
		maxHeightMobile: { type: 'string',  default: null },
		maxHeightTablet: { type: 'string',  default: null },
		aspectRatio:     { type: 'string',  default: '' },
		objectFit: {
			type:    'string',
			default: 'cover',
			enum:    [ 'cover', 'contain', 'fill', 'none', 'scale-down' ],
		},
		objectPosition:   { type: 'string',  default: 'center center' },
		borderRadius:     { type: 'string',  default: '' },
		borderRadiusUnit: { type: 'string',  default: 'px' },
		borderRadiusTL:   { type: 'string',  default: '' },
		borderRadiusTR:   { type: 'string',  default: '' },
		borderRadiusBL:   { type: 'string',  default: '' },
		borderRadiusBR:   { type: 'string',  default: '' },
		boxShadow:        { type: 'string',  default: '' },
		opacity:          { type: 'number',  default: 1 },
		alignment: {
			type:    'string',
			default: 'left',
			enum:    [ 'left', 'center', 'right' ],
		},
		order:       { type: 'integer', default: null },
		orderMobile: { type: 'integer', default: null },
		orderTablet: { type: 'integer', default: null },
		caption: {
			type:    'string',
			default: '',
			role:    'content',
		},
		captionTag: {
			type:    'string',
			default: 'figcaption',
			enum:    [ 'figcaption', 'div' ],
		},
		captionColour:        { type: 'string',  default: '' },
		captionFontSize:      { type: 'integer', default: null },
		captionFontSizeUnit:  { type: 'string',  default: 'px' },
		linkUrl: {
			type:    'string',
			default: '',
			role:    'content',
		},
		linkOpensNewTab: { type: 'boolean', default: false },
		linkRel:         { type: 'string',  default: '' },
	},

	/**
	 * Dynamic block — save returns null. WordPress stores only the block
	 * comment delimiter in post_content; there is no inner HTML to validate.
	 */
	save() {
		return null;
	},

	/**
	 * Migrate v1 image-only posts to v1.1.0 schema.
	 * Adds mediaType: 'image' so the new branch logic resolves correctly
	 * on first edit of a legacy post.
	 *
	 * @param {Object} oldAttributes Stored attributes from the v1 post.
	 * @return {Object} Migrated attributes compatible with the current schema.
	 */
	migrate( oldAttributes ) {
		return {
			...oldAttributes,
			mediaType:       'image',
			videoUrl:        '',
			videoSource:     'external',
			videoId:         null,
			videoMimeType:   '',
			videoPoster:     '',
			videoPosterId:   null,
			videoAutoplay:   false,
			videoLoop:       false,
			videoMuted:      true,
			videoControls:   true,
			videoPlaysInline: true,
			videoLazyLoad:   true,
		};
	},
};

export default [ v1 ];

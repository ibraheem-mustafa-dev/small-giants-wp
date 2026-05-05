/**
 * Deprecated versions of the SGS Decorative Image block.
 *
 * v1 — Schema before decorMedia was introduced (2026-05-05). The block
 *      accepted only an image via imageId/imageUrl/imageAlt. v1 migrates
 *      legacy attributes into the new decorMedia unified slot so existing
 *      posts open without "unexpected content" warnings. Legacy attributes
 *      are preserved alongside decorMedia as a back-compat fallback.
 */

const V1_ATTRIBUTES = {
	imageId: { type: 'number' },
	imageUrl: { type: 'string' },
	imageAlt: { type: 'string', default: '' },
	positionX: { type: 'number', default: 50 },
	positionY: { type: 'number', default: 50 },
	width: { type: 'number', default: 200 },
	maxWidthPercent: { type: 'number', default: 20 },
	rotation: { type: 'number', default: 0 },
	opacity: { type: 'number', default: 85 },
	zIndex: { type: 'number', default: 1 },
	flipX: { type: 'boolean', default: false },
	parallaxStrength: { type: 'number', default: 0 },
	fadeOnScroll: { type: 'boolean', default: false },
	overflow: { type: 'string', default: 'visible' },
	positionXTablet: { type: 'number' },
	positionYTablet: { type: 'number' },
	widthTablet: { type: 'number' },
	rotationTablet: { type: 'number' },
	hideOnTablet: { type: 'boolean', default: false },
	positionXMobile: { type: 'number' },
	positionYMobile: { type: 'number' },
	widthMobile: { type: 'number' },
	rotationMobile: { type: 'number' },
	hideOnMobile: { type: 'boolean', default: false },
};

/**
 * v1 — Pre-decorMedia schema. The block was fully dynamic (server-rendered),
 * so save returned null. Migrate the legacy imageId/imageUrl/imageAlt trio
 * into the unified decorMedia object. Legacy fields are kept so the rich
 * srcset pipeline in render.php continues to work for existing posts.
 */
const v1 = {
	attributes: V1_ATTRIBUTES,
	save() {
		return null;
	},
	isEligible( attributes ) {
		return !! (
			attributes &&
			attributes.imageUrl &&
			! attributes.decorMedia
		);
	},
	migrate( attributes ) {
		const next = { ...attributes };
		if ( attributes.imageUrl && ! attributes.decorMedia ) {
			next.decorMedia = {
				url: attributes.imageUrl,
				type: 'image',
				id: attributes.imageId || 0,
				alt: attributes.imageAlt || '',
				mime: 'image/jpeg',
			};
		}
		return next;
	},
};

export default [ v1 ];

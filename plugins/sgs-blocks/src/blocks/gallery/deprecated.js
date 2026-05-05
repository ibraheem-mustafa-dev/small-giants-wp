/**
 * Deprecated versions of the SGS Image Gallery block.
 *
 * v1 (FRONT — newest first) — Schema before mediaItems was introduced
 *      (2026-05-05, media-slot migration). The block stored items in an
 *      `images` array of `{ id, url, fullUrl, alt, caption, width, height }`.
 *      v1 migrates legacy `images` entries into the unified `mediaItems`
 *      slot shape (`{ url, type, id, alt, mime, ... }`) so existing posts
 *      open without "unexpected content" warnings and the new render path
 *      can route through sgs_render_media().
 */

/**
 * Legacy attribute schema as it existed before the media-slot migration.
 * Mirrors block.json prior to the introduction of the mediaItems attribute.
 */
const LEGACY_ATTRIBUTES = {
	images: { type: 'array', default: [], items: { type: 'object' } },
	layout: { type: 'string', default: 'grid' },
	columns: { type: 'number', default: 3 },
	columnsTablet: { type: 'number', default: 2 },
	columnsMobile: { type: 'number', default: 1 },
	gap: { type: 'string', default: '16' },
	aspectRatio: { type: 'string', default: '1/1' },
	hoverEffect: { type: 'string', default: 'zoom' },
	enableLightbox: { type: 'boolean', default: true },
	showCaptions: { type: 'boolean', default: false },
	captionColour: { type: 'string', default: 'text-inverse' },
	captionBgColour: { type: 'string', default: 'primary-dark' },
	hoverOverlayColour: { type: 'string', default: 'primary-dark' },
	hoverScale: { type: 'string', default: '' },
	hoverImageZoom: { type: 'boolean', default: true },
	transitionDuration: { type: 'string', default: '300' },
	transitionEasing: { type: 'string', default: 'ease' },
	carouselAutoplay: { type: 'boolean', default: false },
	carouselSpeed: { type: 'number', default: 5000 },
	carouselShowDots: { type: 'boolean', default: true },
	carouselShowArrows: { type: 'boolean', default: true },
	imageSize: { type: 'string', default: 'large' },
	captionReveal: { type: 'boolean', default: false },
	hoverGrayscale: { type: 'boolean', default: false },
	staggerDelay: { type: 'number', default: 60 },
	hoverShadow: { type: 'string', default: '' },
	sgsAnimation: { type: 'string', default: 'fade-in' },
	sgsAnimationDuration: { type: 'string', default: 'medium' },
	sgsAnimationEasing: { type: 'string', default: 'ease-out' },
};

/**
 * v1 — Pre-mediaItems schema. Save was already null (dynamic block) so the
 * deprecation only needs to lift legacy `images` entries into the new
 * `mediaItems` shape.
 */
const v1 = {
	attributes: LEGACY_ATTRIBUTES,
	save() {
		return null;
	},
	isEligible( attributes ) {
		// Run only when legacy `images` exist and `mediaItems` has not yet
		// been populated. Prevents re-running on already-migrated posts.
		return !! (
			attributes &&
			Array.isArray( attributes.images ) &&
			attributes.images.length > 0 &&
			( ! attributes.mediaItems || attributes.mediaItems.length === 0 )
		);
	},
	migrate( attributes ) {
		const next = { ...attributes };
		const legacy = Array.isArray( attributes.images ) ? attributes.images : [];
		next.mediaItems = legacy.map( ( img ) => ( {
			url:     img.url || img.fullUrl || '',
			type:    'image',
			id:      img.id || 0,
			alt:     img.alt || '',
			mime:    'image/jpeg',
			caption: img.caption || '',
			fullUrl: img.fullUrl || img.url || '',
			width:   img.width  || 0,
			height:  img.height || 0,
		} ) );
		// Clear the legacy attribute — the new render path reads mediaItems
		// first, so keeping a duplicate copy invites drift. The schema still
		// declares `images` for back-compat on un-migrated posts.
		next.images = [];
		return next;
	},
};

export default [ v1 ];

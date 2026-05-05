/**
 * Brand Strip block deprecations.
 *
 * v1: original null-save shape (pre-render.php era). Logos array empty or
 *     written via WP-CLI without serialised innerHTML.
 *
 * v2: per-logo shape was { image: { id, url, alt, width, height }, alt,
 *     url (link) }. The media-slot migration unifies media handling across
 *     blocks: each logo is now { media: { url, type:'image', id, alt,
 *     mime, width, height }, alt, linkUrl }. The old per-logo `url` (which
 *     stored the LINK, not the media URL) is renamed to `linkUrl` to free
 *     `url` for the media object's URL field, matching the unified shape.
 */
const v1 = {
	attributes: {
		logos: { type: 'array', default: [] },
		scrolling: { type: 'boolean', default: false },
		scrollSpeed: { type: 'string', default: 'medium' },
		greyscale: { type: 'boolean', default: true },
		maxHeight: { type: 'number', default: 48 },
	},
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: true, text: false },
		spacing: { margin: true, padding: true },
		__experimentalBorder: {
			radius: true,
			width: true,
			color: true,
			style: true,
		},
	},
	save() {
		return null;
	},
	migrate( attributes ) {
		return attributes;
	},
};

const v2 = {
	attributes: {
		logos: { type: 'array', default: [] },
		scrolling: { type: 'boolean', default: false },
		scrollSpeed: { type: 'string', default: 'medium' },
		scrollDirection: { type: 'string', default: 'left' },
		fadeEdges: { type: 'boolean', default: false },
		fadeWidth: { type: 'number', default: 60 },
		greyscale: { type: 'boolean', default: false },
		maxHeight: { type: 'number', default: 80 },
		hoverBackgroundColour: { type: 'string', default: '' },
		hoverTextColour: { type: 'string', default: '' },
		hoverBorderColour: { type: 'string', default: '' },
		hoverEffect: { type: 'string', default: 'none' },
		transitionDuration: { type: 'string', default: '300' },
		transitionEasing: { type: 'string', default: 'ease-in-out' },
	},
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: true, text: false },
		spacing: { margin: true, padding: true },
		__experimentalBorder: {
			radius: true,
			width: true,
			color: true,
			style: true,
		},
	},
	save() {
		return null;
	},
	isEligible( attributes ) {
		const list = Array.isArray( attributes.logos ) ? attributes.logos : [];
		// Eligible when any legacy logo entry still uses the old { image: {...} }
		// shape and has not yet been lifted into the unified media slot.
		return list.some(
			( logo ) =>
				logo &&
				typeof logo === 'object' &&
				! logo.media &&
				logo.image &&
				typeof logo.image === 'object'
		);
	},
	migrate( attributes ) {
		const next = { ...attributes };
		const list = Array.isArray( attributes.logos ) ? attributes.logos : [];
		next.logos = list.map( ( logo ) => {
			if ( ! logo || typeof logo !== 'object' ) {
				return logo;
			}
			const migrated = { ...logo };
			if ( ! migrated.media && logo.image && typeof logo.image === 'object' ) {
				migrated.media = {
					url: logo.image.url || '',
					type: 'image',
					id: logo.image.id || 0,
					alt: logo.alt || logo.image.alt || '',
					mime: '',
					width: logo.image.width,
					height: logo.image.height,
				};
			}
			// The old per-logo `url` was the LINK URL — rename to linkUrl.
			if ( typeof logo.url === 'string' && ! migrated.linkUrl ) {
				migrated.linkUrl = logo.url;
			}
			delete migrated.image;
			delete migrated.url;
			return migrated;
		} );
		return next;
	},
};

export default [ v2, v1 ];

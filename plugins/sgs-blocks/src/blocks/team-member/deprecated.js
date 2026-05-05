/**
 * Deprecated versions of the SGS Team Member block.
 *
 * v1 — Schema before memberMedia was introduced (2026-05-05). The block
 *      accepted a headshot via the legacy `photo` object attribute. v1
 *      migrates legacy `photo` objects into the new `memberMedia` unified
 *      slot so existing posts open without "unexpected content" warnings.
 *      `photo` is preserved as a back-compat denormalised fallback.
 *
 * Block is dynamic (save: () => null) — no save HTML to preserve.
 */

const v1 = {
	attributes: {
		photo: { type: 'object' },
		name: { type: 'string', default: '' },
		role: { type: 'string', default: '' },
		bio: { type: 'string', default: '' },
		socialLinks: { type: 'array', default: [] },
		nameColour: { type: 'string', default: 'primary' },
		roleColour: { type: 'string', default: 'text-muted' },
		cardStyle: { type: 'string', default: 'elevated' },
		photoShape: { type: 'string', default: 'circle' },
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
				url: attributes.photo.url,
				type: 'image',
				id: attributes.photo.id || 0,
				alt: attributes.photo.alt || '',
				mime: 'image/jpeg',
			};
		}
		return next;
	},
};

export default [ v1 ];

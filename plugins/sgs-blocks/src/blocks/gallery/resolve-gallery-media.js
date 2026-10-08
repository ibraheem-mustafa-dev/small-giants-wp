/**
 * Media-library item to sgs/gallery media-slot shape.
 */
import { generateItemKey } from '../../utils';

/**
 * Resolve a WordPress media library object to the SGS unified media-slot shape.
 *
 * Mirrors the resolver inside src/components/MediaPicker.js. Used here because
 * gallery uses a multi-select MediaUpload (better UX for batch add) rather
 * than one MediaPicker per slot — but we still emit the media-slot shape so
 * sgs_render_media() can consume each item server-side.
 *
 * @param {Object} media      WP media object from MediaUpload onSelect.
 * @param {string} preferSize Preferred image size slug (large, medium, etc.).
 * @return {Object}            Unified media-slot shape with extra gallery fields.
 */
export function resolveGalleryMedia( media, preferSize ) {
	const mime = media?.mime || media?.mime_type || '';
	const type = mime.startsWith( 'video/' ) ? 'video' : 'image';
	const url =
		type === 'image'
			? media.sizes?.[ preferSize ]?.url ||
			  media.sizes?.large?.url ||
			  media.url
			: media.url;
	return {
		id: media.id || 0,
		url,
		type,
		alt: media.alt || '',
		mime,
		caption: media.caption || '',
		fullUrl: media.sizes?.full?.url || media.url,
		width: media.width || 0,
		height: media.height || 0,
		// Spec 35 Part 4 — stable identity for per-item crop CSS scoping,
		// never array index or the WP attachment id (the id collides the
		// moment the same image is used twice in one gallery).
		_key: generateItemKey(),
		objectFit: 'cover',
		focalPoint: { x: 0.5, y: 0.5 },
	};
}

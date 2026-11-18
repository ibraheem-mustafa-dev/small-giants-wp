/**
 * The main photo's sharp file for a gallery entry.
 *
 * A gallery entry carries the small thumbnail copy (`url`) the strip shows, plus the attachment `id`. The buy box
 * prints every attachment's `src` and `srcset` once, in `<script class="sgs-buybox-images">`, keyed by id. A swap
 * writes that pair to the main photo together, so the browser chooses a copy wide enough for the screen. An entry
 * with no id, or a card with no such script, falls back to the entry's own `url` and an empty `srcset`, which is
 * the behaviour before the map existed. A product card prints its own map (`<script class="sgs-photo-images">`)
 * keyed by the thumbnail address, because its seeded context carries no attachment id.
 */

/**
 * Parsed images map, cached per card element.
 *
 * @type {WeakMap<Element, (Object|null)>}
 */
const imagesByRef = new WeakMap();

/**
 * The card's images map (attachment id, or a card's thumbnail address -> { src, srcset }), or null when it has none.
 *
 * @param {Element|undefined} card The card or buybox root.
 * @return {(Object|null)} The parsed map.
 */
export function imageMap( card ) {
	if ( ! card ) {
		return null;
	}
	if ( imagesByRef.has( card ) ) {
		return imagesByRef.get( card );
	}
	let map = null;
	const el = card.querySelector( 'script.sgs-photo-images, script.sgs-buybox-images' );
	if ( el ) {
		try {
			const parsed = JSON.parse( el.textContent || '{}' );
			map = parsed && typeof parsed === 'object' ? parsed : null;
		} catch ( e ) {
			map = null;
		}
	}
	imagesByRef.set( card, map );
	return map;
}

/**
 * The `src` and `srcset` to show for a gallery entry.
 *
 * @param {Element|undefined} card     The card or buybox root.
 * @param {number}            id       The attachment id (0 or absent when the entry has none).
 * @param {string}            fallback The entry's own `url`, used when the map has no file for the id.
 * @return {{src: string, srcset: string, sharp: boolean}} The pair to write to the context; `sharp` is true when it came from the images map.
 */
export function photoFor( card, id, fallback ) {
	const map = imageMap( card );
	const entry = map ? ( id > 0 && map[ id ] ) || map[ fallback ] || null : null;
	if ( entry && entry.src ) {
		return { src: entry.src, srcset: entry.srcset || '', sharp: true };
	}
	return { src: fallback || '', srcset: '', sharp: false };
}

/**
 * Write a photo to the context's `imageSrc` and `imageSrcset` together.
 *
 * @param {Object}            ctx      The live Interactivity context.
 * @param {Element|undefined} card     The card or buybox root.
 * @param {number}            id       The attachment id (0 when none).
 * @param {string}            fallback The entry's own `url`.
 * @return {boolean} True when the photo changed.
 */
export function applyPhoto( ctx, card, id, fallback ) {
	const next = photoFor( card, id, fallback );
	if ( ! next.src ) {
		return false;
	}
	if ( ! next.sharp ) {
		// No sharp pair known: a swap to the file already shown changes nothing; any other file replaces
		// the printed photo, so the old `srcset` (which would outrank the new `src`) is emptied.
		if ( ctx.imageSrc === next.src ) {
			return false;
		}
		ctx.imageSrc = next.src;
		ctx.imageSrcset = '';
		return true;
	}
	const changed = ctx.imageSrc !== next.src || ( ctx.imageSrcset || '' ) !== next.srcset;
	ctx.imageSrc = next.src;
	ctx.imageSrcset = next.srcset;
	return changed;
}

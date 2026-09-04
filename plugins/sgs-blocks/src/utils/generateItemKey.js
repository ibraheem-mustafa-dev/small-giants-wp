/**
 * Stable per-item identity for a flat-array repeater attribute (gallery
 * mediaItems, card-grid items, trust-bar items, brand-strip logos).
 *
 * Existing repeaters key their React `.map()` by array index or by the
 * media attachment ID, both fragile: index breaks on reorder/add/remove,
 * and an attachment ID collides the moment two items share one image
 * (e.g. a placeholder logo repeated in trust-bar). Per-item CSS (crop /
 * object-fit) needs a key that survives all of that, so each item gets
 * its own `_key` the moment it is created — same shape as Gutenberg's own
 * `clientId`, just persisted in the attribute instead of runtime-only.
 *
 * `_key` is intentionally NOT declared in any block's item schema as a
 * client-visible field (no label, no role) — it is plumbing, backfilled
 * silently for pre-existing items that predate this mechanism.
 *
 * @package SGS\Blocks
 */

/**
 * @return {string} A new stable item key.
 */
export function generateItemKey() {
	if ( typeof crypto !== 'undefined' && crypto.randomUUID ) {
		return crypto.randomUUID();
	}
	// Fallback for a non-secure-context editor preview iframe, where
	// crypto.randomUUID() is unavailable (Editor.js Playground, some
	// third-party iframe embeds). Collision risk is negligible for a
	// per-instance repeater key.
	return 'key-' + Math.random().toString( 36 ).slice( 2 ) + Date.now().toString( 36 );
}

/**
 * Backfills `_key` on any item in an array attribute that predates this
 * mechanism, without touching items that already have one. Call once on
 * mount; returns the SAME array reference when nothing needed backfilling,
 * so a caller can skip `setAttributes()` when the return === input.
 *
 * @param {Array<Object>} items Repeater array attribute value.
 * @return {Array<Object>} The same array, or a new array with `_key` filled in.
 */
export function withStableItemKeys( items ) {
	if ( ! Array.isArray( items ) || items.length === 0 ) {
		return items;
	}
	if ( items.every( ( item ) => item && item._key ) ) {
		return items;
	}
	return items.map( ( item ) =>
		item && item._key ? item : { ...item, _key: generateItemKey() }
	);
}

/**
 * Shared editor-canvas mirror of the surface-ground backdrop filter
 * (`surfaceBlur` / `surfaceSaturate`) — U-1 commit 4e.
 *
 * Extracted from `sgs/site-header`'s `float-preview.js::floatPreview`, the
 * ONLY block that had built this mirror before this fan-out reached the
 * other 7 `<BackgroundPanel>` blocks. Built EXACTLY the way `floatPreview`
 * built it (saturate first, then blur — matches the order
 * `includes/helpers-surface-ground.php::sgs_surface_backdrop_decls()` emits
 * server-side), so a block's canvas preview agrees with what the published
 * page renders.
 *
 * ⛔ Keep in step with `sgs_surface_backdrop_decls()`. If they disagree, the
 * editor lies about what the page will look like — the exact failure a
 * canvas preview exists to prevent.
 *
 * @package SGS\Blocks
 */

/**
 * @param {Object} attributes Block attributes (reads `surfaceBlur` / `surfaceSaturate`).
 * @return {{backdropFilter?: string, WebkitBackdropFilter?: string}} A partial
 *   style object — `{}` when neither attribute is set.
 */
export function surfaceBackdropPreview( attributes ) {
	const { surfaceBlur, surfaceSaturate } = attributes || {};
	const filterParts = [];
	if ( typeof surfaceSaturate === 'number' ) {
		filterParts.push( `saturate(${ surfaceSaturate }%)` );
	}
	if ( surfaceBlur ) {
		filterParts.push( `blur(${ surfaceBlur })` );
	}
	if ( ! filterParts.length ) {
		return {};
	}
	return {
		backdropFilter: filterParts.join( ' ' ),
		WebkitBackdropFilter: filterParts.join( ' ' ),
	};
}

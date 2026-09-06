/**
 * Shared editor-canvas mirror of the "content band" (Layer 2 / `.sgs-container__inner`)
 * — extracted 2026-09-05 from `sgs/container`'s `edit.js` (the ONLY block that had built
 * this mirror, at lines ~99 and ~388-420, previously local + unexported) into ONE shared
 * module so every other block routed through `SGS_Container_Wrapper::render()` can show
 * the same two-layer structure on canvas instead of applying `contentWidth`/band padding
 * to the outer element (or not at all), which is NOT what the frontend renders.
 *
 * `resolveContentWidthPreview()` and `contentBandPreview()` are copied VERBATIM in logic
 * from `sgs/container`'s edit.js — same behaviour, same docblocks — so this extraction
 * cannot itself introduce a behavioural drift for container's own regression baseline.
 *
 * ⛔ Keep this in step with the PHP path (`class-sgs-container-wrapper.php`'s
 * `$sgs_resolve_content_width` / `$has_band_props` / `$grid_on_inner`). If they disagree,
 * the editor lies about what the page will look like — which is the failure this mirror
 * exists to prevent.
 */

/**
 * Editor mirror of `$sgs_resolve_content_width` in class-sgs-container-wrapper.php.
 *
 * Kept token-for-token in step with the PHP: `normal`/`wide` map to the SAME global
 * custom properties the frontend uses, so the canvas band and the rendered band resolve
 * to one number rather than two that merely look alike. `full` and `''` both resolve to
 * NOTHING — they are identical on the frontend and must stay identical here, because
 * "no cap" is what makes `$has_band_props` false and suppresses the band entirely.
 *
 * @param {string} value Raw contentWidth tier value.
 * @return {string} A CSS length, or '' for no cap.
 */
export function resolveContentWidthPreview( value ) {
	const v = String( value ?? '' );
	if ( v === 'normal' ) return 'var(--wp--style--global--content-size,1200px)';
	if ( v === 'wide' ) return 'var(--wp--style--global--wide-size,1400px)';
	if ( v === 'full' || v === '' ) return '';
	return v;
}

/**
 * Computes the editor-canvas content band for any block routed through
 * `SGS_Container_Wrapper::render()` — mirrors `$has_band_props` / `$grid_on_inner` in
 * class-sgs-container-wrapper.php so the canvas shows the SAME two-layer structure the
 * frontend renders whenever a contentWidth cap or band padding is set.
 *
 * GRID-ON-INNER: the frontend moves the grid/flex declarations ONTO the band whenever a
 * band exists (`$grid_on_inner`) — a grid container previews its columns on the
 * full-bleed outer while rendering them on the capped band otherwise. This mutates the
 * passed-in `style` object (deleting the migrated keys), matching container's own
 * mutation-in-place pattern, so the caller's outer `style` and this function's returned
 * `bandStyle` never both carry the same grid/flex declaration.
 *
 * @param {Object} params
 * @param {string} params.contentWidth  Resolved contentWidth CSS length (from
 *                                       `resolveContentWidthPreview()`) or '' for no cap.
 * @param {Object} [params.bandPadding] {top,right,bottom,left} band padding box.
 * @param {Object} params.style         The MUTABLE outer style object built so far —
 *                                       grid/flex/layout keys are migrated OUT of this
 *                                       when a band exists.
 * @param {string} params.layout        'grid'|'flex'|'stack'|other.
 * @return {{hasBandProps: boolean, bandStyle: Object}}
 */
export function contentBandPreview( { contentWidth, bandPadding = {}, style, layout } ) {
	const pad = bandPadding && typeof bandPadding === 'object' ? bandPadding : {};
	const hasBandPadding = [ 'top', 'right', 'bottom', 'left' ].some( ( side ) => !! pad[ side ] );
	const hasBandProps = contentWidth !== '' || hasBandPadding;

	const bandStyle = {};
	if ( contentWidth ) {
		bandStyle.maxWidth = contentWidth;
		bandStyle.marginInline = 'auto';
	}
	if ( pad.top ) bandStyle.paddingTop = pad.top;
	if ( pad.right ) bandStyle.paddingRight = pad.right;
	if ( pad.bottom ) bandStyle.paddingBottom = pad.bottom;
	if ( pad.left ) bandStyle.paddingLeft = pad.left;

	const gridOnInner = ( layout === 'grid' || layout === 'flex' || layout === 'stack' ) && hasBandProps;
	if ( gridOnInner ) {
		for ( const key of [ 'display', 'gridTemplateColumns', 'gridAutoRows', 'gap', 'alignItems',
			'justifyItems', 'alignContent', 'flexWrap', 'flexDirection', 'justifyContent' ] ) {
			if ( style[ key ] !== undefined ) {
				bandStyle[ key ] = style[ key ];
				delete style[ key ];
			}
		}
	}

	return { hasBandProps, bandStyle };
}

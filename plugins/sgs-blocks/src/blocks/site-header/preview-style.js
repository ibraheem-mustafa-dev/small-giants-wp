/**
 * sgs/site-header — editor-canvas mirror of what the shared wrapper and
 * render.php paint on the header element at the previewed device tier: border,
 * corner radius, max-width, min-height, the section shadow and the rows'
 * vertical alignment (`sgs_header_rows_align_css()`).
 *
 * @package SGS\Blocks
 */

import { containerWrapperPreview, resolveResponsiveTier, resolveTier } from '../../utils';
import { resolveShadowPreviewComposed } from '../../utils/tokens';

const ROWS_ALIGN = {
	start: 'flex-start',
	center: 'center',
	end: 'flex-end',
	stretch: '',
};

/**
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed tier from the editor's device type.
 * @param {Array}  palette    Theme colour palette.
 * @return {Object} Style fragment for the header root.
 */
export function siteHeaderWrapperPreview( attributes, tier, palette ) {
	const wrapper = containerWrapperPreview( attributes, tier, palette ).style;
	const style = {};
	[ 'borderWidth', 'borderStyle', 'borderColor', 'borderImage', 'borderRadius', 'maxWidth' ].forEach( ( key ) => {
		if ( undefined !== wrapper[ key ] ) {
			style[ key ] = wrapper[ key ];
		}
	} );
	const minHeight = resolveResponsiveTier( attributes.minHeight || {}, tier )?.value;
	if ( minHeight ) {
		style.minHeight = minHeight;
	}
	if ( attributes.shadow ) {
		style.boxShadow = resolveShadowPreviewComposed( attributes.shadow, attributes.shadowColour );
	}
	// Rows alignment: the header is a column flex box at every tier (default centre).
	const align = resolveTier( attributes.rowsAlign, tier, 'center' ).value;
	if ( align in ROWS_ALIGN ) {
		style.display = 'flex';
		style.flexDirection = 'column';
		if ( ROWS_ALIGN[ align ] ) {
			style.justifyContent = ROWS_ALIGN[ align ];
		}
	}
	return style;
}

/**
 * The rows' own sizing under `rowsAlign` (render.php's `{root} > *` rules), scoped
 * to the editor instance.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed tier.
 * @param {string} scope      Editor scope class on the header root.
 * @return {string} CSS text.
 */
export function siteHeaderRowsCss( attributes, tier, scope ) {
	const align = resolveTier( attributes.rowsAlign, tier, 'center' ).value;
	const rows = 'stretch' === align ? 'flex:1 1 auto;min-height:0;' : 'flex:0 1 auto;min-height:auto;';
	return `.${ scope } > *{${ rows }}:where(.${ scope } > *){width:100%;}`;
}

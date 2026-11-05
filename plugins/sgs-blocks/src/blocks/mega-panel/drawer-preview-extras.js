/**
 * SGS Mega Panel — editor-canvas twin of
 * `includes/mega-panel-drawer-extras-css.php`: the drawer copy's card shell
 * (`drawerShell*`), the link-row fill at rest and on hover (`drawerLinkBg*`, `drawerLinkHoverBg*`,
 * `drawerLinkRadius`), the aside card's radius and padding outside compact
 * mode, and the `stacked-overlay` card layout. Called from `drawer-preview.js`
 * with the same enumerated attribute object.
 *
 * @package SGS\Blocks
 */

import { colourVar, isCssGradient, resolveShadowPreviewComposed } from '../../utils';
import { fontFamilyCssValue } from '../../utils/typography-preview';

const BOX_SIDES = [ 'top', 'right', 'bottom', 'left' ];
const SAFE_LENGTH_RE = /^[-\w.\s%(),+*/]+$/;

const fill = ( colour, grad ) => {
	if ( isCssGradient( grad ) ) {
		return `background-image:${ grad };`;
	}
	const value = colour ? colourVar( colour ) || colour : '';
	return value ? `background-color:${ value };` : '';
};

const padBox = ( box ) =>
	box && 'object' === typeof box
		? BOX_SIDES.map( ( side ) => {
				const value = String( box[ side ] ?? '' ).trim();
				return value && SAFE_LENGTH_RE.test( value ) ? `padding-${ side }:${ value };` : '';
		  } ).join( '' )
		: '';

/**
 * The card shell and link-row hover.
 *
 * @param {string} scope Panel wrapper selector.
 * @param {string} row   Link-row selector.
 * @param {Object} v     Enumerated drawer attributes.
 * @return {string} CSS.
 */
export function drawerShellPreviewCss( scope, row, v ) {
	let css = '';
	const shadow = resolveShadowPreviewComposed( v.drawerShellShadow, v.drawerShellShadowColour );
	const shell =
		( v.drawerShellRadius ? `border-radius:${ v.drawerShellRadius };` : '' ) +
		padBox( v.drawerShellPadding ) +
		( shadow ? `box-shadow:${ shadow };` : '' );
	if ( shell ) {
		css += `${ scope }{${ shell }}`;
	}
	const rest = ( v.drawerLinkRadius ? `border-radius:${ v.drawerLinkRadius };` : '' ) + fill( v.drawerLinkBg, v.drawerLinkBgGradient );
	if ( rest ) {
		css += `${ row }{${ rest }}`;
	}
	const hover = fill( v.drawerLinkHoverBg, v.drawerLinkHoverBgGradient );
	if ( hover ) {
		css += `${ row }:hover,${ row }:focus-within{${ hover }}`;
	}
	return css;
}

/**
 * The aside card's radius and padding outside compact mode.
 *
 * @param {Object} v Enumerated drawer attributes.
 * @return {string} Declarations.
 */
export function drawerCardBoxPreviewDecls( v ) {
	return ( v.drawerCardRadius ? `border-radius:${ v.drawerCardRadius };` : '' ) + ( v.drawerCardPadding ? `padding:${ v.drawerCardPadding };` : '' );
}

/**
 * The `stacked-overlay` aside card.
 *
 * @param {string} aside     Aside selector.
 * @param {string} cardDecls The card's ground and spacing declarations.
 * @param {Object} v         Enumerated drawer attributes.
 * @return {string} CSS.
 */
export function drawerStackedPreviewCss( aside, cardDecls, v ) {
	const pad = v.drawerCardPadding || '14px';
	let css =
		`${ aside }{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:${ v.drawerCardGap || '12px' };align-items:center;position:relative;overflow:hidden;flex:none;width:100%;padding:0;` +
		( v.drawerCardRadius ? `border-radius:${ v.drawerCardRadius };` : '' ) +
		`${ cardDecls }}`;
	css += `${ aside } > :nth-child(1){grid-column:1 / -1;grid-row:1;width:100%;margin:0;}`;
	css += `${ aside } > :nth-child(2){position:absolute;inset-block-start:12px;inset-inline-start:12px;z-index:1;margin:0;pointer-events:none;}`;
	css += `${ aside } > :nth-child(3){grid-column:1;grid-row:2;margin:0;padding-block-start:${ pad };padding-inline-start:${ pad };}`;
	css += `${ aside } > :nth-child(4){grid-column:1;grid-row:3;margin:4px 0 0;padding-block-end:${ pad };padding-inline-start:${ pad };}`;
	css += `${ aside } > :nth-child(5){grid-column:2;grid-row:2 / span 2;margin:0;padding-inline-end:${ pad };}`;
	css += `${ aside } > :nth-child(5).sgs-button,${ aside } > :nth-child(5) .sgs-button{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:40px;height:40px;min-width:40px;padding:0;border-radius:50%;}`;
	css += `${ aside } > :nth-child(5) .sgs-button__label{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}`;
	const tagPad = padBox( v.drawerCardTagPadding );
	const tagRadius = v.drawerCardTagRadius && SAFE_LENGTH_RE.test( v.drawerCardTagRadius ) ? `border-radius:${ v.drawerCardTagRadius };` : '';
	const tagType = drawerTagTypePreviewDecls( v );
	if ( v.drawerCardTagSize || tagPad || tagRadius || tagType ) {
		css += `${ aside } > :nth-child(2) .wp-block-sgs-label{${ tagType }${ tagRadius }${ v.drawerCardTagSize ? `font-size:${ v.drawerCardTagSize };line-height:1.5;` : '' }${ tagPad }}`;
	}
	// A fill photo in the stacked card has no definite height: it takes its width and the chosen ratio (render.php: sgs_mega_panel_drawer_media_css()).
	const ratio = String( v.drawerCardMediaRatio || '' ).trim();
	css += `${ aside } .sgs-media-box--fill{height:auto;aspect-ratio:${ /^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/.test( ratio ) ? ratio : '2 / 1' };}`;
	if ( v.drawerCardTitleSize || v.drawerCardTitleLineHeight ) {
		css += `${ aside } > :nth-child(3){${ v.drawerCardTitleSize ? `font-size:${ v.drawerCardTitleSize };` : '' }${ v.drawerCardTitleLineHeight ? `line-height:${ v.drawerCardTitleLineHeight };` : '' }}`;
	}
	return css;
}

/**
 * The aside card's link in every layout (twin of
 * `sgs_mega_panel_drawer_card_link_css()`): its colours.
 *
 * @param {string} aside Aside selector.
 * @param {Object} v     Enumerated drawer attributes.
 * @return {string} CSS, or ''.
 */
export function drawerCardLinkPreviewCss( aside, v ) {
	const bg = v.drawerCardLinkBg ? colourVar( v.drawerCardLinkBg ) || v.drawerCardLinkBg : '';
	const colour = v.drawerCardLinkColour ? colourVar( v.drawerCardLinkColour ) || v.drawerCardLinkColour : '';
	const paint = ( bg ? `background-color:${ bg };` : '' ) + ( colour ? `color:${ colour };` : '' );
	let css = '';
	if ( paint ) {
		css += `${ aside } .sgs-button{${ paint }}`;
	}
	return css;
}

/**
 * The card tag's font family and letter spacing declarations (twin of
 * `sgs_mega_panel_drawer_tag_type_decls()`).
 *
 * @param {Object} v Enumerated drawer attributes.
 * @return {string} Declarations, or ''.
 */
export function drawerTagTypePreviewDecls( v ) {
	const family = fontFamilyCssValue( v.drawerCardTagFontFamily );
	const spacing = String( v.drawerCardTagLetterSpacing || '' ).trim();
	return ( family ? `font-family:${ family };` : '' ) + ( spacing && SAFE_LENGTH_RE.test( spacing ) ? `letter-spacing:${ spacing };` : '' );
}

/**
 * The aside card's description colour (twin of
 * `sgs_mega_panel_drawer_card_desc_css()`): slot 4, as the element itself or
 * inside the clone's wrapper.
 *
 * @param {string} aside Aside selector.
 * @param {Object} v     Enumerated drawer attributes.
 * @return {string} CSS, or ''.
 */
export function drawerCardDescPreviewCss( aside, v ) {
	const colour = v.drawerCardDescColour ? colourVar( v.drawerCardDescColour ) || v.drawerCardDescColour : '';
	if ( ! colour ) {
		return '';
	}
	return `${ aside } > :nth-child(4):not(.wp-block-sgs-container),${ aside } > .wp-block-sgs-container:nth-child(2) > .sgs-container__inner > :nth-child(3){color:${ colour };}`;
}

/**
 * The link rows' trailing arrow (`drawerLinkTrailingIcon` = arrow), twin of
 * `sgs_mega_panel_drawer_trailing_css()`.
 *
 * @param {string} row Link-row selector.
 * @param {Object} v   Enumerated drawer attributes.
 * @return {string} CSS, or ''.
 */
export function drawerTrailingPreviewCss( row, v ) {
	if ( 'arrow' !== v.drawerLinkTrailingIcon ) {
		return '';
	}
	const colour = v.drawerLinkTrailingColour ? colourVar( v.drawerLinkTrailingColour ) || v.drawerLinkTrailingColour : '';
	const mask = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12h14M13 6l6 6-6 6'/%3E%3C/svg%3E\")";
	return `${ row } > .sgs-container__inner::after{content:"";flex:none;align-self:center;margin-inline-start:auto;width:16px;height:16px;background-color:${ colour || 'currentColor' };${ colour ? '' : 'opacity:.6;' }-webkit-mask:${ mask } center/contain no-repeat;mask:${ mask } center/contain no-repeat;}`;
}

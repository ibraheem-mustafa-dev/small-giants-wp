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
	css += `${ aside } > :nth-child(5) .sgs-button{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:40px;height:40px;min-width:40px;padding:0;border-radius:50%;}`;
	css += `${ aside } > :nth-child(5) .sgs-button__label{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}`;
	const tagPad = padBox( v.drawerCardTagPadding );
	if ( v.drawerCardTagSize || tagPad ) {
		css += `${ aside } > :nth-child(2) .wp-block-sgs-label{${ v.drawerCardTagSize ? `font-size:${ v.drawerCardTagSize };line-height:1.5;` : '' }${ tagPad }}`;
	}
	if ( v.drawerCardTitleSize || v.drawerCardTitleLineHeight ) {
		css += `${ aside } > :nth-child(3){${ v.drawerCardTitleSize ? `font-size:${ v.drawerCardTitleSize };` : '' }${ v.drawerCardTitleLineHeight ? `line-height:${ v.drawerCardTitleLineHeight };` : '' }}`;
	}
	return css;
}

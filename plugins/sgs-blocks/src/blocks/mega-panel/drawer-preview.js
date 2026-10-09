/**
 * SGS Mega Panel — editor-canvas twin of render.php's "In the drawer" rules.
 *
 * render.php paints the drawer copy of a panel from the `drawer*` attributes
 * (Spec 36 FR-36-6) into an instance stylesheet the editor canvas never loads.
 * When the operator switches the inspector's "Preview in the editor as" toggle
 * to Drawer, edit.js adds `sgs-mega-panel--in-drawer` (so style.css's own
 * in-drawer stack applies) and renders the string this returns in a `<style>`
 * element inside the wrapper. Editor-canvas only: the no-inline-style contract
 * (Spec 32) governs render.php's frontend output, not the canvas.
 *
 * The selectors and declarations mirror render.php's `$sgs_mm_in_drawer`
 * block one for one. The panel ground is not here: edit.js paints it on the
 * wrapper's own inline style so it out-ranks style.css's root rule.
 *
 * ⚠ Callers pass the attributes ENUMERATED (never `attributes` wholesale) so
 * check-editor-render-parity.js CHECK A sees each name read in edit.js.
 *
 * @package SGS\Blocks
 */

import { colourVar, isCssGradient } from '../../utils';

const SAFE_LENGTH_RE = /^[-\w.\s%(),+*/]+$/;
const BOX_SIDES = [ 'top', 'right', 'bottom', 'left' ];

/**
 * The set sides of a {top,right,bottom,left} box as longhand declarations
 * (`padding-top:3px;`), mirroring render.php's sgs_box_object_longhand_list().
 *
 * @param {Object} box    Box object; anything else yields ''.
 * @param {string} family 'padding' or 'margin'.
 * @return {string} Declarations, '' when no side is set.
 */
function boxSideDecls( box, family ) {
	if ( ! box || 'object' !== typeof box ) {
		return '';
	}
	return BOX_SIDES.map( ( side ) => {
		const value = String( box[ side ] ?? '' ).trim();
		return value && SAFE_LENGTH_RE.test( value ) ? `${ family }-${ side }:${ value };` : '';
	} ).join( '' );
}

const flat = ( value ) => ( value ? colourVar( value ) || value : '' );
const gradient = ( value ) => ( isCssGradient( value ) ? value : '' );
const decl = ( prop, value ) => ( value ? `${ prop }:${ value };` : '' );

/**
 * A text colour: flat, or a text-clip gradient (gradient wins).
 *
 * @param {string} colour Flat colour value.
 * @param {string} grad   Gradient value.
 * @return {string} Declarations.
 */
function textPaint( colour, grad ) {
	const g = gradient( grad );
	if ( g ) {
		return `background-image:${ g };-webkit-background-clip:text;background-clip:text;color:transparent;`;
	}
	return decl( 'color', flat( colour ) );
}

/**
 * A border colour: flat, or a border-image approximation of the gradient ring
 * render.php paints (a masked ::before cannot be expressed in one rule).
 *
 * @param {string} colour Flat colour value.
 * @param {string} grad   Gradient value.
 * @return {string} Declarations.
 */
function borderPaint( colour, grad ) {
	const g = gradient( grad );
	if ( g ) {
		return `border-image:${ g } 1;`;
	}
	return decl( 'border-color', flat( colour ) );
}

/**
 * Build the drawer-preview stylesheet.
 *
 * @param {string} scope Selector of the panel wrapper, e.g. `.sgs-mega-panel-dv-abc`.
 * @param {Object} v     The drawer attributes, enumerated by the caller.
 * @return {string} CSS text.
 */
export default function drawerPreviewCss( scope, v ) {
	const aside = `${ scope } .sgs-mega-aside`;
	const row = `${ scope } .sgs-mega-group > .wp-block-sgs-container`;
	let css = '';

	// Link rows.
	const minHeight = v.drawerLinkMinHeight;
	const padY = v.drawerLinkPaddingY;
	const rowDecls =
		borderPaint( v.drawerLinkDivider, v.drawerLinkDividerGradient ) +
		decl( 'min-height', minHeight ) +
		( minHeight ? 'box-sizing:border-box;' : '' ) +
		( padY ? `padding-top:${ padY };padding-bottom:${ padY };` : '' );
	if ( rowDecls ) {
		css += `${ row }{${ rowDecls }}`;
	}

	// Number / label / description.
	const parts = [
		[ `${ row } > .wp-block-sgs-text`, v.drawerLinkNumColour, v.drawerLinkNumColourGradient, v.drawerLinkNumSize ],
		[ `${ row } .wp-block-sgs-heading`, v.drawerLinkLabelColour, v.drawerLinkLabelColourGradient, v.drawerLinkLabelSize ],
		[
			`${ row } .wp-block-sgs-container .wp-block-sgs-text`,
			v.drawerLinkDescColour,
			v.drawerLinkDescColourGradient,
			v.drawerLinkDescSize,
		],
	];
	parts.forEach( ( [ selector, colour, grad, size ] ) => {
		const decls = textPaint( colour, grad ) + decl( 'font-size', size );
		if ( decls ) {
			css += `${ selector }{${ decls }}`;
		}
	} );

	// Aside position and card.
	const orderFirst = 'first' === v.drawerAsideOrder;
	if ( orderFirst ) {
		css += `${ aside }{order:-1;}`;
	}
	const cardGradient = gradient( v.drawerCardBgGradient );
	let cardDecls = cardGradient
		? `background-image:${ cardGradient };`
		: decl( 'background-color', flat( v.drawerCardBg ) );
	if ( v.drawerCardSpacing ) {
		cardDecls += `${ orderFirst ? 'margin-bottom' : 'margin-top' }:${ v.drawerCardSpacing };`;
	}
	if ( ! v.drawerCardCompact ) {
		return cardDecls ? `${ css }${ aside }{${ cardDecls }}` : css;
	}

	const thumb = v.drawerCardThumbSize || '64px';
	const hasBorder = !! ( v.drawerCardBorderColour || gradient( v.drawerCardBorderColourGradient ) );
	css +=
		`${ aside }{display:grid;grid-template-columns:${ thumb } minmax(0,1fr);` +
		`column-gap:${ v.drawerCardGap || '14px' };align-items:center;align-content:center;flex:none;width:100%;` +
		`border-style:solid;border-width:${ hasBorder ? '1px' : '0' };` +
		`border-radius:${ v.drawerCardRadius || '0' };padding:${ v.drawerCardPadding || '0' };` +
		`${ cardDecls }${ borderPaint( v.drawerCardBorderColour, v.drawerCardBorderColourGradient ) }}`;
	css += `${ aside } > :nth-child(1){grid-column:1;grid-row:1 / span 3;width:${ thumb };height:${ thumb };min-height:0;margin:0;overflow:hidden;}`;
	css += `${ aside } > :nth-child(2){grid-column:2;grid-row:1;justify-self:start;margin:0 0 6px;${ boxSideDecls( v.drawerCardTagMargin, 'margin' ) }}`;
	css += `${ aside } > :nth-child(3){grid-column:2;grid-row:2;margin:0;letter-spacing:normal;line-height:${ v.drawerCardTitleLineHeight || 'normal' };}`;
	css += `${ aside } > :nth-child(4){display:none;}`;
	css += `${ aside } > :nth-child(5){grid-column:2;grid-row:3;margin:6px 0 0;}`;

	const tagPad = boxSideDecls( v.drawerCardTagPadding, 'padding' );
	if ( v.drawerCardTagSize || tagPad ) {
		css +=
			`${ aside } > :nth-child(2) .wp-block-sgs-label{` +
			decl( 'font-size', v.drawerCardTagSize ) +
			tagPad +
			( v.drawerCardTagSize ? 'line-height:1.5;' : '' ) +
			'}';
	}
	if ( v.drawerCardTitleSize ) {
		css += `${ aside } > :nth-child(3){font-size:${ v.drawerCardTitleSize };}`;
	}
	if ( v.drawerCardLinkSize ) {
		css += `${ aside } > :nth-child(5) .sgs-button{font-size:${ v.drawerCardLinkSize };line-height:1.5;}`;
	}
	return css;
}

/**
 * sgs/buybox — the editor canvas's sample configurator.
 *
 * The real buybox needs a variable product, which the editor does not have
 * (render.php resolves it from the product page's context), so the canvas draws
 * one sample product with the SAME markup classes render.php emits: the block's
 * style.css and sgs/option-picker's style.css (both loaded in the canvas) paint
 * it, and every style setting is applied the way render.php's scoped rules apply
 * it, at the device tier the editor is previewing. Responsive rules that hang on
 * breakpoints (the gallery column ratio and gap, the stack point) are emitted as
 * the same @media rules, so the canvas width decides them as the page width does.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { resolveColourToken } from '../../components';
import {
	backgroundPaintPreview,
	textPaintPreview,
	wrapperBorderPreview,
	tierBoxLonghands,
	sgsBorderPreview,
	typographyPreviewStyle,
	typographyPreviewCss,
	gapVar,
	resolveResponsiveTier,
	tierValueOf,
} from '../../utils';

import AuthoredText from '../../components/AuthoredText';
import { QUERY_DESKTOP, QUERY_TABLET_UP } from '../../utils/breakpoints';
import { composeShadow } from '../../utils/shadow-layers';
import { galleryStickerPreviewCss, stickerCorner } from './gallery-sticker-preview';
const PICKER_STYLES = [ 'outlined', 'filled', 'ghost', 'tile' ];
const BADGE_POSITIONS = [
	'top-right',
	'top-left',
	'bottom-right',
	'bottom-left',
];
const METER_STYLES = [ 'segments', 'bar', 'dots' ];

/** Sample product the canvas draws: £30.00, RRP £40.00 (a £10.00 / 25% saving). */
const SAMPLE = {
	price: '£30.00',
	rrp: '£40.00',
	saving: { amount: '£10.00', percentage: '25%' },
	colours: [
		__( 'Black', 'sgs-blocks' ),
		__( 'Tortoiseshell', 'sgs-blocks' ),
	],
	sizes: [
		__( 'Small', 'sgs-blocks' ),
		__( 'Medium', 'sgs-blocks' ),
		__( 'Large', 'sgs-blocks' ),
	],
	// Per-unit price ladder: pack size, per-unit price, saving against the £3.00 single.
	ladder: [
		{ pack: '1', perUnit: '£3.00', saving: '' },
		{ pack: '3', perUnit: '£2.70', saving: __( 'save 10%', 'sgs-blocks' ) },
		{ pack: '6', perUnit: '£2.40', saving: __( 'save 20%', 'sgs-blocks' ) },
	],
};

/**
 * A CSS length the mock may print: letters, digits and the length punctuation only.
 *
 * @param {*} value Stored length.
 * @return {string} The length, or '' when it is not safe to print.
 */
const safeLength = ( value ) => ( /^[\w.%() ,-]+$/.test( String( value || '' ) ) ? String( value ) : '' );

/**
 * Whether the add-to-basket bar is on at a tier (render.php's sgs_buybox_sticky_bar_data).
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed tier.
 * @return {boolean} True when the bar is switched on at that tier.
 */
export function stickyBarOnAtTier( attributes, tier ) {
	return (
		'after-button' ===
		resolveResponsiveTier( attributes.stickyBar || {}, tier ).value
	);
}

/**
 * Root style: render.php's fill, text colour, border, corner radius and margin.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed tier.
 * @param {Array}  palette    Theme colour palette.
 * @return {Object} Style for the block root.
 */
export function buyboxRootStyle( attributes, tier, palette ) {
	const style = {
		...backgroundPaintPreview(
			attributes.backgroundColour,
			attributes.backgroundColourGradient,
			palette
		),
		...textPaintPreview(
			attributes.textColour,
			attributes.textColourGradient,
			palette
		),
	};
	Object.assign( style, wrapperBorderPreview( attributes, tier, palette ) );
	Object.assign(
		style,
		tierBoxLonghands( attributes.margin, tier, 'margin' )
	);
	if ( stickyBarOnAtTier( attributes, tier ) ) {
		// The sample bar sits at the bottom of the mock, not the screen.
		style.position = 'relative';
	}
	return style;
}

/**
 * The breakpoint-bound and state-bound rules, scoped to the editor instance:
 * the gallery column ratio/gap from the stack point up, the three stock
 * status colours (the sample shows the in-stock state), and the typography of
 * the elements the canvas draws as styled sample markup.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} scope      Editor scope class on the root.
 * @param {Array}  palette    Theme colour palette.
 * @param {string} [tier]     Previewed tier.
 * @return {string} CSS text.
 */
export function buyboxMockCss( attributes, scope, palette, tier = 'desktop' ) {
	const root = `.${ scope }.${ scope }`;
	let css = '';
	// Each prefix paints the sample elements render.php's
	// sgs_typography_css_rule() calls pair it with. The prefixes stay literal
	// so the wiring-fingerprint gate can credit each surface's canvas read.
	css += typographyPreviewCss(
		attributes,
		'stock',
		`${ root } .buybox__stock`,
		tier
	);
	css += typographyPreviewCss(
		attributes,
		'savingBadge',
		`${ root } .sgs-buybox__saving-badge`,
		tier
	);
	css += galleryStickerPreviewCss( attributes, root, palette, tier );
	css += typographyPreviewCss(
		attributes,
		'rrpPrice',
		`${ root } .buybox__rrp-price`,
		tier
	);
	css += typographyPreviewCss(
		attributes,
		'rrpChip',
		`${ root } .buybox__rrp-pill`,
		tier
	);
	css += typographyPreviewCss(
		attributes,
		'notifyHeading',
		`${ root } .sgs-buybox__notify-heading`,
		tier
	);
	css += typographyPreviewCss(
		attributes,
		'notifyLabel',
		`${ root } .sgs-buybox__notify-label`,
		tier
	);
	css += typographyPreviewCss(
		attributes,
		'notifyLabel',
		`${ root } .sgs-buybox__notify-consent-label`,
		tier
	);
	css += typographyPreviewCss(
		attributes,
		'notifyInput',
		`${ root } .sgs-buybox__notify-email`,
		tier
	);
	css += typographyPreviewCss(
		attributes,
		'notifySubmit',
		`${ root } .sgs-buybox__notify-submit`,
		tier
	);
	css += typographyPreviewCss(
		attributes,
		'notifyStatus',
		`${ root } .sgs-buybox__notify-status`,
		tier
	);
	css += typographyPreviewCss(
		attributes,
		'guidedMeter',
		`${ root } .sgs-buybox-guided__meter-btn`,
		tier
	);
	css += typographyPreviewCss(
		attributes,
		'guidedMeter',
		`${ root } .sgs-buybox-guided__meter-index`,
		tier
	);
	css += typographyPreviewCss(
		attributes,
		'guidedMeter',
		`${ root } .sgs-buybox-guided__meter-compact`,
		tier
	);
	css += typographyPreviewCss(
		attributes,
		'guidedGroupTitle',
		`${ root } .sgs-buybox-guided__group-title`,
		tier
	);
	// The stock status row and the guided meter buttons are full-width flex boxes:
	// render.php maps their alignment to justify-content, and so does the canvas.
	const justify = {
		left: 'flex-start',
		start: 'flex-start',
		justify: 'flex-start',
		center: 'center',
		right: 'flex-end',
		end: 'flex-end',
	};
	const stockAlign = resolveResponsiveTier( attributes.stockTextAlign, tier ).value;
	if ( justify[ stockAlign ] ) {
		css += `${ root } .buybox__stock--status{justify-content:${ justify[ stockAlign ] };}`;
	}
	const meterAlign = resolveResponsiveTier( attributes.guidedMeterTextAlign, tier ).value;
	if ( justify[ meterAlign ] ) {
		css += `${ root } .sgs-buybox-guided__meter-btn{justify-content:${ justify[ meterAlign ] };}`;
	}
	const ratio = parseFloat( attributes.galleryColumnRatio ) || 0;
	const gap = String(
		tierValueOf( attributes.galleryColumnGap, tier ) || ''
	).trim();
	const decls = [];
	if ( ratio > 0 ) {
		decls.push(
			`grid-template-columns:minmax(0,${ ratio }fr) minmax(0,1fr)`
		);
	}
	if ( gap && ! /[;{}<>]/.test( gap ) ) {
		decls.push( `gap:${ gapVar( gap ) }` );
	}
	if ( decls.length ) {
		const query =
			'tablet' === attributes.stackBelow ? QUERY_DESKTOP : QUERY_TABLET_UP;
		css += `@media ${ query }{${ root }{${ decls.join( ';' ) };}}`;
	}
	[
		[ 'in-stock', attributes.stockInStockColour ],
		[ 'low-stock', attributes.stockLowStockColour ],
		[ 'out-of-stock', attributes.stockOutOfStockColour ],
	].forEach( ( [ status, colour ] ) => {
		const resolved = colour
			? resolveColourToken( colour, palette ) || colour
			: '';
		if ( resolved && ! /[;{}<>]/.test( resolved ) ) {
			css += `${ root } .buybox__stock--${ status }{color:${ resolved };}${ root } .buybox__stock--${ status } .buybox__stock-dot{background-color:${ resolved };}`;
		}
	} );
	// Gallery thumbnails: the same settings extras.php::sgs_buybox_extras_scoped_css writes.
	const colourOf = ( value ) => {
		const resolved = value
			? resolveColourToken( value, palette ) || value
			: '';
		return resolved && ! /[;{}<>]/.test( resolved ) ? resolved : '';
	};
	// Main photo frame, price row gap, chip radius and cart padding: the same settings render.php prints.
	const photoDecls = [];
	const photoGround = colourOf( attributes.mainPhotoBackgroundColour );
	if ( photoGround ) {
		photoDecls.push( `background:${ photoGround }` );
	}
	const photoBorderColour = colourOf( attributes.mainPhotoBorderColour );
	if ( photoBorderColour ) {
		photoDecls.push( `border-color:${ photoBorderColour }` );
	}
	const photoWidth = attributes.mainPhotoBorderWidth || {};
	const photoBox = photoWidth.desktop || photoWidth;
	const photoSides = [ 'top', 'right', 'bottom', 'left' ].map( ( side ) => safeLength( photoBox[ side ] ) );
	if ( photoSides.some( Boolean ) ) {
		photoDecls.push(
			`border-style:${ attributes.mainPhotoBorderStyle || 'solid' }`,
			`border-width:${ photoSides.map( ( side ) => side || '0' ).join( ' ' ) }`
		);
	}
	if ( safeLength( attributes.mainPhotoRadius ) ) {
		photoDecls.push( `border-radius:${ safeLength( attributes.mainPhotoRadius ) }` );
	}
	const photoShadow = attributes.mainPhotoShadow
		? composeShadow( attributes.mainPhotoShadow, attributes.mainPhotoShadowColour )
		: '';
	if ( photoShadow && ! /[;{}<>]/.test( photoShadow ) ) {
		photoDecls.push( `box-shadow:${ photoShadow }` );
	}
	if ( photoDecls.length ) {
		css += `${ root } .product-card__media{${ photoDecls.join( ';' ) };}`;
	}
	if ( safeLength( attributes.priceRowGap ) ) {
		css += `${ root } .buybox__price-row{gap:${ safeLength( attributes.priceRowGap ) };}`;
	}
	if ( safeLength( attributes.rrpPillRadius ) ) {
		css += `${ root } .buybox__rrp-pill{border-radius:${ safeLength( attributes.rrpPillRadius ) };}`;
	}
	const hairlineMargin = attributes.stockLineHairlineMargin || {};
	const hairlineMarginDecls = [ 'top', 'bottom' ]
		.filter( ( side ) => safeLength( hairlineMargin[ side ] ) )
		.map( ( side ) => `margin-${ side }:${ safeLength( hairlineMargin[ side ] ) }` );
	if ( hairlineMarginDecls.length ) {
		css += `${ root } .sgs-buybox__stock-hairline{${ hairlineMarginDecls.join( ';' ) };}`;
	}
	const cartPadding = attributes.addToCartPadding || {};
	const cartPaddingDecls = [ 'top', 'right', 'bottom', 'left' ]
		.filter( ( side ) => safeLength( cartPadding[ side ] ) )
		.map( ( side ) => `padding-${ side }:${ safeLength( cartPadding[ side ] ) }` );
	if ( cartPaddingDecls.length ) {
		css += `${ root } .buybox__add-to-cart{${ cartPaddingDecls.join( ';' ) };}`;
	}
	const galleryThumbSizeValue = safeLength( tierValueOf( attributes.galleryThumbSize, tier ) || '' );
	if ( galleryThumbSizeValue ) {
		css += `${ root }{--sgs-buybox-thumb-size:${ galleryThumbSizeValue };}`;
	}
	// Thumbnail rail layout: the same rules extras.php writes for thumbGap and thumbsPerRow.
	const rawGap = String(
		tierValueOf( attributes.thumbGap, tier ) || ''
	).trim();
	const thumbGap = /^\d+(\.\d+)?$/.test( rawGap ) ? `${ rawGap }px` : rawGap;
	// thumbsPerRow is a tier object; an unset tablet or mobile tier follows the next larger one.
	const perRowTiers =
		attributes.thumbsPerRow && 'object' === typeof attributes.thumbsPerRow
			? attributes.thumbsPerRow
			: {};
	let perRow = 0;
	for ( const name of [ 'desktop', 'tablet', 'mobile' ] ) {
		const rawPerRow = perRowTiers[ name ];
		if (
			null !== rawPerRow &&
			undefined !== rawPerRow &&
			'' !== rawPerRow &&
			Number.isFinite( Number( rawPerRow ) )
		) {
			perRow = Math.min(
				8,
				Math.max( 0, Math.trunc( Number( rawPerRow ) ) )
			);
		}
		if ( name === tier ) {
			break;
		}
	}
	const rawOffset = String( attributes.thumbStripOffset || '' ).trim();
	const thumbOffset = /^\d+(\.\d+)?$/.test( rawOffset )
		? `${ rawOffset }px`
		: rawOffset;
	const railDecls = [];
	if ( thumbOffset && ! /[;{}<>]/.test( thumbOffset ) ) {
		railDecls.push( `--sgs-buybox-thumb-offset:${ thumbOffset }` );
	}
	if ( perRow > 0 ) {
		railDecls.push(
			'display:grid',
			`grid-template-columns:repeat(${ perRow },minmax(48px,1fr))`,
			`--sgs-buybox-thumb-gutter:calc(4px + 10% / ${ perRow })`
		);
	}
	if ( thumbGap && ! /[;{}<>]/.test( thumbGap ) ) {
		railDecls.push( `gap:${ thumbGap }` );
	}
	if ( railDecls.length ) {
		css += `${ root } .product-card__thumbs{${ railDecls.join( ';' ) };}`;
	}
	if ( perRow > 0 ) {
		css += `@supports(overflow-clip-margin:1px){${ root } .product-card__thumbs{overflow:clip;overflow-clip-margin:24px;padding:0;margin:var(--sgs-buybox-thumb-offset,0.75rem) 0 0;}}`;
		css += `${ root } .product-card__thumb{width:100%;height:auto;aspect-ratio:1;}`;
	}
	// The thumbnails' border is the shared border panel's twin: width, style, normal colour
	// and corner radius, with the stylesheet's own 2px transparent border underneath.
	const thumbBorder = sgsBorderPreview(
		{
			widthValues: attributes.galleryThumbBorderWidth,
			styleValue: attributes.galleryThumbBorderStyle,
			colourValue: attributes.galleryThumbBorderColour,
			radiusValues: { base: attributes.galleryThumbBorderRadius },
		},
		tier,
		palette,
		{ defaultBorder: true }
	);
	const thumbColour = colourOf( attributes.galleryThumbBorderColour );
	const thumbHover = colourOf( attributes.galleryThumbBorderColourHover );
	const thumbSelected = colourOf(
		attributes.galleryThumbBorderColourCurrent
	);
	const rawScale = attributes.thumbSelectedScale;
	const thumbScale =
		null === rawScale ||
		undefined === rawScale ||
		'' === rawScale ||
		! Number.isFinite( Number( rawScale ) )
			? 105
			: Math.min( 150, Math.max( 50, Number( rawScale ) ) );
	const thumbDecls = Object.entries( thumbBorder )
		.filter(
			( [ , value ] ) =>
				'string' === typeof value && value && ! /[;{}<>]/.test( value )
		)
		.map(
			( [ property, value ] ) =>
				`${ property.replace(
					/[A-Z]/g,
					( letter ) => `-${ letter.toLowerCase() }`
				) }:${ value }`
		);
	if ( thumbDecls.length ) {
		css += `${ root } .product-card__thumb{${ thumbDecls.join( ';' ) };}`;
	}
	if ( thumbHover ) {
		css += `${ root } .product-card__thumb:hover{border-color:${ thumbHover };}`;
	}
	const selectedDecls = [];
	if ( thumbSelected ) {
		selectedDecls.push( `border-color:${ thumbSelected }` );
	} else if ( thumbColour ) {
		selectedDecls.push(
			'border-color:var(--wp--preset--color--primary,#0f7e80)'
		);
	}
	if ( 105 !== thumbScale ) {
		selectedDecls.push( `transform:scale(${ thumbScale / 100 })` );
	}
	if ( selectedDecls.length ) {
		css += `${ root } .product-card__thumb[aria-current="true"]{${ selectedDecls.join(
			';'
		) };}`;
	}
	// Pick a set: the preview box, the summary and the option pills (render.php prints the same settings scoped).
	if ( 'configurator' === attributes.buyboxLayout ) {
		const resolve = ( value ) => ( value ? resolveColourToken( value, palette ) || value : '' );
		const previewDecls = [];
		if ( attributes.previewBackgroundColour ) {
			previewDecls.push( `background:${ resolve( attributes.previewBackgroundColour ) }` );
		}
		if ( attributes.previewBorderColour ) {
			previewDecls.push( `border-color:${ resolve( attributes.previewBorderColour ) }` );
		}
		if ( attributes.previewBorderWidth ) {
			previewDecls.push( `border-width:${ attributes.previewBorderWidth }` );
		}
		if ( attributes.previewRadius ) {
			previewDecls.push( `border-radius:${ attributes.previewRadius }` );
		}
		const previewPad = tierBoxLonghands( attributes.previewPadding, tier, 'padding' );
		Object.entries( previewPad ).forEach( ( [ prop, val ] ) => {
			previewDecls.push( `${ prop.replace( /[A-Z]/g, ( c ) => `-${ c.toLowerCase() }` ) }:${ val }` );
		} );
		if ( previewDecls.length ) {
			css += `${ root } .sgs-buybox__pick-preview{${ previewDecls.join( ';' ) };}`;
		}
		if ( attributes.pickSummaryColour ) {
			css += `${ root } .sgs-buybox__pick-summary{color:${ resolve( attributes.pickSummaryColour ) };}`;
		}
		css += typographyPreviewCss( attributes, 'pickSummary', `${ root } .sgs-buybox__pick-summary`, tier );
		if ( attributes.pickOptionRadius ) {
			css += `${ root } .sgs-buybox__pick-option{border-radius:${ attributes.pickOptionRadius };}`;
		}
		const kebab = ( prop ) => prop.replace( /[A-Z]/g, ( c ) => `-${ c.toLowerCase() }` );
		const optionPad = Object.entries( tierBoxLonghands( attributes.pickOptionPadding, tier, 'padding' ) ).map( ( [ prop, val ] ) => `${ kebab( prop ) }:${ val }` );
		if ( optionPad.length ) {
			css += `${ root } .sgs-buybox__pick-option{${ optionPad.join( ';' ) };}`;
		}
		const tilePad = Object.entries( tierBoxLonghands( attributes.pickTilePadding, tier, 'padding' ) ).map( ( [ prop, val ] ) => `${ kebab( prop ) }:${ val }` );
		if ( tilePad.length ) {
			css += `${ root } .sgs-buybox__pick-box .sgs-option-picker__pill{${ tilePad.join( ';' ) };}`;
		}
		if ( attributes.pickTileGap ) {
			css += `${ root } .sgs-buybox__pick-box .sgs-option-picker__options{gap:${ attributes.pickTileGap };}`;
		}
		const tile = `${ root } .sgs-buybox__pick-box .sgs-option-picker--tile`;
		const pill = `${ root } .sgs-buybox__pick-box .sgs-option-picker:not(.sgs-option-picker--tile)`;
		[
			[ attributes.pickTileNumberSize, `${ tile } .sgs-option-picker__pill-label` ],
			[ attributes.pickTilePriceSize, `${ tile } .sgs-option-picker__sub-label` ],
			[ attributes.pickTileEachSize, `${ tile } .sgs-option-picker__term-description` ],
			[ attributes.pickPricedFontSize, `${ pill } .sgs-option-picker__pill` ],
		].forEach( ( [ sizes, sel ] ) => {
			const size = tierValueOf( sizes, tier );
			if ( size ) {
				css += `${ sel }{font-size:${ safeLength( size ) };}`;
			}
		} );
		const pricedPad = Object.entries( tierBoxLonghands( attributes.pickPricedPadding, tier, 'padding' ) ).map( ( [ prop, val ] ) => `${ kebab( prop ) }:${ val }` );
		if ( pricedPad.length ) {
			css += `${ pill } .sgs-option-picker__pill{${ pricedPad.join( ';' ) };}`;
		}
		const pricedMin = tierValueOf( attributes.pickPricedMinHeight, tier );
		if ( pricedMin ) {
			css += `${ pill } .sgs-option-picker__pill{min-height:${ safeLength( pricedMin ) };}`;
		}
		if ( 'auto' === attributes.pickPricedLayout ) {
			css += `${ pill } .sgs-option-picker__options{display:flex;flex-wrap:wrap;align-items:center;}${ pill } .sgs-option-picker__option{width:auto;}${ pill } .sgs-option-picker__pill{width:auto;}`;
		}
		const badgeDecls = [];
		if ( attributes.pickBadgeBackgroundColour ) {
			badgeDecls.push( `background-color:${ resolve( attributes.pickBadgeBackgroundColour ) }` );
		}
		if ( attributes.pickBadgeTextColour ) {
			badgeDecls.push( `color:${ resolve( attributes.pickBadgeTextColour ) }` );
		}
		if ( badgeDecls.length ) {
			css += `${ root } .sgs-buybox__pick-box .sgs-option-picker__term-badge,${ root } .sgs-buybox__pick-box .sgs-buybox-pick__option-badge{${ badgeDecls.join( ';' ) };}`;
		}
		if ( attributes.pickPricedGap ) {
			css += `${ pill } .sgs-option-picker__options{gap:${ safeLength( attributes.pickPricedGap ) };}`;
		}
		if ( attributes.pickPricedRadius ) {
			css += `${ pill }{--sgs-op-pill-radius:${ safeLength( attributes.pickPricedRadius ) };}${ pill } .sgs-option-picker__pill{border-radius:${ safeLength( attributes.pickPricedRadius ) };}`;
		}
		if ( attributes.pickOptionGap ) {
			css += `${ root } .sgs-buybox-pick__options{gap:${ attributes.pickOptionGap };}`;
		}
		const selVars = [];
		if ( attributes.pickSelectedBackgroundColour ) {
			selVars.push( `--sgs-pick-sel-bg:${ resolve( attributes.pickSelectedBackgroundColour ) }` );
		}
		if ( attributes.pickSelectedBorderColour ) {
			selVars.push( `--sgs-pick-sel-border:${ resolve( attributes.pickSelectedBorderColour ) }` );
		}
		if ( attributes.pickSelectedTextColour ) {
			selVars.push( `--sgs-pick-sel-text:${ resolve( attributes.pickSelectedTextColour ) }` );
		}
		if ( selVars.length ) {
			css += `${ root }{${ selVars.join( ';' ) };}`;
		}
	}
	// Pick a set: the box around the pickers (render.php paints the same four settings on .sgs-buybox-pick__groups).
	if ( 'configurator' === attributes.buyboxLayout ) {
		const boxDecls = [];
		const boxFill = attributes.pickerBoxBackgroundColour;
		const boxBorder = attributes.pickerBoxBorderColour;
		if ( boxFill ) {
			boxDecls.push(
				`background-color:${ resolveColourToken( boxFill, palette ) || boxFill }`
			);
		}
		if ( boxBorder ) {
			boxDecls.push(
				`border-color:${ resolveColourToken( boxBorder, palette ) || boxBorder }`
			);
		}
		if ( attributes.pickerBoxBorderWidth ) {
			boxDecls.push(
				`border-width:${ attributes.pickerBoxBorderWidth }`,
				'border-style:solid'
			);
		}
		if ( attributes.pickerBoxRadius ) {
			boxDecls.push( `border-radius:${ attributes.pickerBoxRadius }` );
		}
		if ( boxDecls.length ) {
			css += `${ root } .sgs-buybox__pick-box{${ boxDecls.join( ';' ) };padding:var(--wp--preset--spacing--30,1rem);}`;
		}
	}
	return css;
}

/**
 * One sample option picker, in sgs/option-picker's own markup.
 *
 * @param {Object}   root0                   Component props.
 * @param {string}   root0.label             The picker's heading (Colour, Size).
 * @param {string[]} root0.options           Sample option names; the first is shown selected.
 * @param {string}   root0.pillStyle         The picker style (outlined, filled, ghost, tile).
 * @param {boolean}  root0.showTick          Whether the selected pill shows its tick.
 * @param {Object}   root0.labelStyle        Inline preview style for the heading.
 * @param {Object}   root0.valueStyle        Inline preview style for the chosen value.
 * @param {Object}   root0.optionStyle       Inline preview style for a tile-style option name.
 * @param {boolean}  root0.showSelectedValue Whether the chosen value prints beside the heading.
 * @param {Object}   root0.pillStyleVars     Inline preview custom properties for the picker (pill border width).
 * @param {Object}   root0.pillTextStyle     Inline preview style for a non-tile option pill (font size).
 * @param {string}   root0.linkText          The label-row link wording; empty = no link.
 * @param {Object}   root0.linkStyle         Inline preview style for the label-row link.
 */
function SampleOptionGroup( {
	label,
	options,
	pillStyle,
	showTick,
	labelStyle,
	valueStyle,
	optionStyle,
	showSelectedValue,
	pillStyleVars,
	pillTextStyle,
	linkText,
	linkStyle,
} ) {
	const style = PICKER_STYLES.includes( pillStyle ) ? pillStyle : 'outlined';
	return (
		<>
			<div className="sgs-buybox__picker-label-row">
				<span
					className="sgs-buybox__picker-label-text"
					style={ labelStyle }
				>
					{ label }
				</span>
				{ showSelectedValue && (
					<span
						className="sgs-buybox__picker-selected-value"
						style={ valueStyle }
					>
						{ options[ 0 ] }
					</span>
				) }
				{ linkText && (
					<a
						className="sgs-buybox__picker-label-link"
						href="#sgs-buybox-link-preview"
						style={ linkStyle }
						onClick={ ( event ) => event.preventDefault() }
					>
						{ linkText }
					</a>
				) }
			</div>
			<fieldset
				className={ `wp-block-sgs-option-picker sgs-option-picker sgs-option-picker--${ style } sgs-option-picker--medium${
					showTick ? '' : ' sgs-option-picker--no-tick'
				}` }
				style={ pillStyleVars }
			>
				<div className="sgs-option-picker__options" role="group">
					{ options.map( ( option, index ) => (
						// The option name sits three levels inside the label (pill > pill-text > pill-label), deeper than the rule reads.
						// eslint-disable-next-line jsx-a11y/label-has-associated-control
						<label
							key={ option }
							className="sgs-option-picker__option"
						>
							<input
								type="radio"
								checked={ 0 === index }
								readOnly
								tabIndex={ -1 }
							/>
							<span
								className="sgs-option-picker__pill"
								style={
									'tile' === style ? undefined : pillTextStyle
								}
							>
								<span className="sgs-option-picker__pill-text">
									<span
										className="sgs-option-picker__pill-label"
										style={
											'tile' === style
												? optionStyle
												: undefined
										}
									>
										{ option }
									</span>
								</span>
							</span>
						</label>
					) ) }
				</div>
			</fieldset>
		</>
	);
}

/**
 * The sample comparative value ladder, in render.php's markup: the wrapper and the
 * saving text take their own typography settings, as sgs_typography_css_rule() applies them.
 *
 * @param {Object} props
 * @param {Object} props.attributes Block attributes.
 * @param {string} props.tier       Previewed tier.
 * @return {JSX.Element} The ladder list.
 */
/**
 * Pick a set sample: one pick-several group wearing the look chosen for it, so the canvas reads groupStyles.
 *
 * @param {Object} props            Props.
 * @param {Object} props.attributes Block attributes.
 * @return {Element} Sample markup.
 */
function SamplePickSet( { attributes } ) {
	const looks = attributes.groupStyles && 'object' === typeof attributes.groupStyles ? Object.values( attributes.groupStyles ) : [];
	const style = [ 'filled', 'outlined', 'ghost', 'tile' ].includes( looks[ 0 ] ) ? looks[ 0 ] : 'outlined';
	return (
		<div className="sgs-buybox-pick">
			<div className="sgs-buybox-pick__groups sgs-buybox__pick-box">
				<div className="sgs-buybox-pick__group" role="group" aria-label={ __( 'Flavour', 'sgs-blocks' ) }>
					<p className="sgs-buybox-pick__group-title">{ __( 'Flavour, choose up to 3', 'sgs-blocks' ) }</p>
					<div className={ `sgs-buybox-pick__options sgs-buybox-pick__options--${ style }` }>
						{ [ __( 'Vanilla', 'sgs-blocks' ), __( 'Mango', 'sgs-blocks' ), __( 'Mint', 'sgs-blocks' ) ].map( ( name ) => (
							<span key={ name } className="sgs-buybox-pick__option">
								<span className="sgs-buybox-pick__option-body">
									<span className="sgs-buybox-pick__swatch" aria-hidden="true" />
									<span className="sgs-buybox-pick__option-name">{ name }</span>
								</span>
							</span>
						) ) }
					</div>
				</div>
			</div>
			<div className="sgs-buybox-pick__side">
				<div className="sgs-buybox-pick__preview-box sgs-buybox__pick-preview sgs-buybox-pick__preview-box--plain" aria-hidden="true" />
				<p className="sgs-buybox-pick__caption sgs-buybox__pick-summary">{ ( attributes.summaryText || 'Your {pack}: {split}' ).replace( '{pack}', '20' ).replace( '{split}', '7 Vanilla · 7 Mango · 6 Mint' ).replace( /\{[a-z_]+\}/g, '' ) }</p>
			</div>
		</div>
	);
}

function SampleValueLadder( { attributes, tier } ) {
	const savingStyle = typographyPreviewStyle(
		attributes,
		'valueLadderSaving',
		tier
	);
	const badgeText = attributes.decoyEnabled
		? __( 'Most popular', 'sgs-blocks' )
		: __( 'Best value', 'sgs-blocks' );
	const lastIndex = SAMPLE.ladder.length - 1;
	return (
		<ul
			className="buybox__value-ladder"
			aria-label={ __( 'Price per unit by pack size', 'sgs-blocks' ) }
			style={ typographyPreviewStyle( attributes, 'valueLadder', tier ) }
		>
			{ SAMPLE.ladder.map( ( row, index ) => (
				<li
					key={ row.pack }
					className="value-ladder__row"
					aria-current={ 0 === index ? 'true' : undefined }
				>
					<span className="value-ladder__pack">{ row.pack }</span>
					<span className="value-ladder__per-unit">
						{ row.perUnit }
					</span>
					{ row.saving && (
						<span
							className="value-ladder__saving buybox__value-ladder__saving"
							style={ savingStyle }
						>
							{ row.saving }
						</span>
					) }
					{ index === lastIndex && (
						<span className="wp-block-sgs-label is-style-pill-wrap product-card__best-value-badge">
							{ badgeText }
						</span>
					) }
				</li>
			) ) }
		</ul>
	);
}

/**
 * The sample back-in-stock form, in notify-form.php's markup, so its typography
 * settings are visible in the editor. The real form shows only for an
 * out-of-stock variation, so the canvas draws it only while the form is enabled.
 *
 * @param {Object} props
 * @param {Object} props.attributes Block attributes.
 * @return {JSX.Element} The notify panel.
 */
function SampleNotifyForm( { attributes } ) {
	return (
		<div className="sgs-buybox__notify" aria-hidden="true">
			<AuthoredText
				as="p"
				className="sgs-buybox__notify-heading"
				value={
					attributes.notifyMeLabel || __( 'Notify me', 'sgs-blocks' )
				}
			/>
			<div className="sgs-buybox__notify-form">
				<div className="sgs-buybox__notify-field">
					<span className="sgs-buybox__notify-label">
						{ __( 'Email address', 'sgs-blocks' ) }
					</span>
					<input
						type="email"
						className="sgs-buybox__notify-email"
						readOnly
						tabIndex={ -1 }
						placeholder={ __( 'your@email.com', 'sgs-blocks' ) }
					/>
				</div>
				<div className="sgs-buybox__notify-consent-row">
					<input
						type="checkbox"
						className="sgs-buybox__notify-consent"
						readOnly
						tabIndex={ -1 }
					/>
					<span className="sgs-buybox__notify-consent-label">
						{ __(
							'Email me once when this is back in stock.',
							'sgs-blocks'
						) }
					</span>
				</div>
				<AuthoredText
					className="wp-element-button sgs-buybox__notify-submit"
					value={
						attributes.notifyMeLabel ||
						__( 'Notify me', 'sgs-blocks' )
					}
				/>
				<p className="sgs-buybox__notify-status" data-status="success">
					{ __(
						'Thanks, we will email you when it is back.',
						'sgs-blocks'
					) }
				</p>
			</div>
		</div>
	);
}

/**
 * The add-to-basket bar drawn statically at the bottom of the mock: the same
 * classes and colour properties render.php prints, but positioned inside the
 * mock (never fixed to the screen) and shown, with a sample price and options.
 *
 * @param {Object} props
 * @param {Object} props.attributes  Block attributes.
 * @param {Array}  props.palette     Theme colour palette.
 * @param {string} props.cartVariant Add-to-cart style modifier class (leading space) or ''.
 * @return {JSX.Element} The sample bar.
 */
function SampleStickyBar( { attributes, palette, cartVariant } ) {
	const colour = ( value ) =>
		value ? resolveColourToken( value, palette ) || value : undefined;
	const style = {
		position: 'absolute',
		insetInline: 0,
		bottom: 0,
		transform: 'none',
		visibility: 'visible',
		'--sgs-buybox-bar-bg': colour( attributes.stickyBarBackground ),
		'--sgs-buybox-bar-text': colour( attributes.stickyBarText ),
		'--sgs-buybox-bar-border': colour( attributes.stickyBarBorderColour ),
	};
	return (
		<div
			className="sgs-buybox__bar is-on"
			role="presentation"
			style={ style }
		>
			<div>
				<span className="sgs-buybox__bar-price">{ SAMPLE.price }</span>
				<span className="sgs-buybox__bar-variant">{ `${ SAMPLE.colours[ 0 ] } / ${ SAMPLE.sizes[ 1 ] }` }</span>
			</div>
			<span
				className={ `wp-element-button buybox__add-to-cart${ cartVariant }` }
			>
				<AuthoredText
					value={
						attributes.addToCartLabel ||
						__( 'Add to Cart', 'sgs-blocks' )
					}
				/>
			</span>
		</div>
	);
}

/**
 * The sample configurator's two columns.
 *
 * @param {Object} props
 * @param {Object} props.attributes Block attributes.
 * @param {string} props.tier       Previewed tier.
 * @param {Array}  props.palette    Theme colour palette.
 * @param {*}      props.extras     The extras slot (InnerBlocks).
 * @return {JSX.Element} Gallery and configurator columns.
 */
export function BuyboxCanvasMock( { attributes, tier, palette, extras } ) {
	const isGuided = 'guided' === attributes.buyboxLayout;
	const format =
		'percentage' === attributes.rrpSavingFormat ? 'percentage' : 'amount';
	const savingText = `${
		attributes.rrpSavingPrefix ?? __( 'Save', 'sgs-blocks' )
	} ${ SAMPLE.saving[ format ] }`.trim();
	const badgePosition = BADGE_POSITIONS.includes(
		attributes.gallerySavingBadgePosition
	)
		? attributes.gallerySavingBadgePosition
		: 'top-right';
	const showTick = true === attributes.pickerShowSelectedTick;
	const labelStyle = {
		...typographyPreviewStyle( attributes, 'pickerLabel', tier ),
		...( attributes.pickerLabelColour
			? {
					color:
						resolveColourToken(
							attributes.pickerLabelColour,
							palette
						) || attributes.pickerLabelColour,
			  }
			: {} ),
	};
	// The chosen value renders beside the label only on the own-render path, so
	// the canvas shows it under the same condition render.php uses.
	const valueStyle = {
		...typographyPreviewStyle( attributes, 'pickerValue', tier ),
		...( attributes.pickerValueColour
			? {
					color:
						resolveColourToken(
							attributes.pickerValueColour,
							palette
						) || attributes.pickerValueColour,
			  }
			: {} ),
	};
	// The option tile names (render.php scopes the same typography and colour to a tile-style picker's .sgs-option-picker__pill-label).
	const optionStyle = {
		...typographyPreviewStyle( attributes, 'pickerOption', tier ),
		...( attributes.pickerOptionColour
			? {
					color:
						resolveColourToken(
							attributes.pickerOptionColour,
							palette
						) || attributes.pickerOptionColour,
			  }
			: {} ),
	};
	const showSelectedValue = true === attributes.pickerShowSelectedValue;
	// The forwarded option-pill settings (render.php passes them to sgs/option-picker as pillFontSize and pillBorderWidth).
	const pillTextStyle = typographyPreviewStyle(
		attributes,
		'pickerPill',
		tier
	);
	const pillSelTextColour = attributes.pickerPillSelectedTextColour
		? resolveColourToken( attributes.pickerPillSelectedTextColour, palette ) ||
		  attributes.pickerPillSelectedTextColour
		: '';
	const pillStyleVars =
		attributes.pickerPillBorderWidth || pillSelTextColour
			? {
					...( attributes.pickerPillBorderWidth
						? { '--sgs-op-border-width': attributes.pickerPillBorderWidth }
						: {} ),
					...( pillSelTextColour ? { '--sgs-op-sel-text': pillSelTextColour } : {} ),
			  }
			: undefined;
	// The label-row link, shown on the Size sample group.
	const linkText = attributes.pickerLabelLinkAxis
		? attributes.pickerLabelLinkText || ''
		: '';
	const linkColour = attributes.pickerLabelLinkColour
		? resolveColourToken(
				attributes.pickerLabelLinkColour,
				palette
		  ) || attributes.pickerLabelLinkColour
		: '';
	const linkUnderline = attributes.pickerLabelLinkUnderlineColour
		? resolveColourToken(
				attributes.pickerLabelLinkUnderlineColour,
				palette
		  ) || attributes.pickerLabelLinkUnderlineColour
		: '';
	const linkStyle = {
		...( linkColour ? { color: linkColour } : {} ),
		...( linkUnderline ? { borderBottomColor: linkUnderline } : {} ),
		...tierBoxLonghands(
			{ desktop: attributes.pickerLabelLinkPadding },
			tier,
			'padding'
		),
	};
	const rrpPillStyle = {
		...tierBoxLonghands(
			{ desktop: attributes.rrpPillPadding },
			tier,
			'padding'
		),
		...( attributes.rrpPillBackgroundColour
			? {
					backgroundColor:
						resolveColourToken(
							attributes.rrpPillBackgroundColour,
							palette
						) || attributes.rrpPillBackgroundColour,
			  }
			: {} ),
		...( attributes.rrpPillTextColour
			? {
					color:
						resolveColourToken(
							attributes.rrpPillTextColour,
							palette
						) || attributes.rrpPillTextColour,
			  }
			: {} ),
	};
	const cartStyle = {
		...typographyPreviewStyle( attributes, 'addToCart', tier ),
		...( attributes.addToCartBackgroundColour
			? backgroundPaintPreview(
					attributes.addToCartBackgroundColour,
					'',
					palette
			  )
			: {} ),
		...( attributes.addToCartBorderColour
			? {
					borderColor:
						resolveColourToken(
							attributes.addToCartBorderColour,
							palette
						) || attributes.addToCartBorderColour,
			  }
			: {} ),
		...( attributes.addToCartMinHeight &&
		! /[;{}<>]/.test( attributes.addToCartMinHeight )
			? { minHeight: attributes.addToCartMinHeight }
			: {} ),
	};
	const cartVariant = [ 'primary', 'secondary', 'outline' ].includes(
		attributes.addToCartStyle
	)
		? ` buybox__add-to-cart--${ attributes.addToCartStyle }`
		: '';
	const stockAbove = 'above' === attributes.stockLinePosition;
	const stockLine = (
		<p className="buybox__stock buybox__stock--status buybox__stock--in-stock">
			<span className="buybox__stock-dot" aria-hidden="true"></span>
			<AuthoredText
				value={
					attributes.stockInStockLabel ||
					__( 'In stock', 'sgs-blocks' )
				}
			/>
		</p>
	);
	const meterStyle = METER_STYLES.includes( attributes.guidedMeterStyle )
		? attributes.guidedMeterStyle
		: 'segments';
	const meterColour = attributes.guidedMeterColour
		? resolveColourToken( attributes.guidedMeterColour, palette ) ||
		  attributes.guidedMeterColour
		: '';

	// Pick a set can drop the photo column (pickHideGallery), as render.php does.
	const hideGallery = 'configurator' === attributes.buyboxLayout && true === attributes.pickHideGallery;

	return (
		<>
			{ ! hideGallery && (
			<div className="sgs-buybox__gallery-col">
				<div
					className="product-card__media sgs-buybox__mock-image"
					aria-hidden="true"
					style={ {
						aspectRatio: '1 / 1',
						display: 'grid',
						placeItems: 'center',
						background:
							'var(--wp--preset--color--surface-alt, #f0f0f0)',
					} }
				>
					{ __( 'Product image', 'sgs-blocks' ) }
					{ attributes.galleryStickerText && (
						<span
							className={ `sgs-buybox__gallery-sticker sgs-buybox__gallery-sticker--${ stickerCorner( attributes ) }` }
						>
							{ attributes.galleryStickerText }
						</span>
					) }
				</div>
				<div
					className="product-card__thumbs"
					aria-hidden="true"
					style={
						attributes.thumbsFlexWrap
							? { flexWrap: attributes.thumbsFlexWrap }
							: undefined
					}
				>
					{ [ 1, 2, 3, 4 ].map( ( n ) => (
						<span
							key={ n }
							className="product-card__thumb sgs-buybox__gallery-thumb"
							aria-current={ 1 === n ? 'true' : undefined }
							style={ {
								display: 'block',
								background:
									'var(--wp--preset--color--surface-alt, #f0f0f0)',
							} }
						/>
					) ) }
				</div>
				{ attributes.gallerySavingBadge && (
					<span
						className={ `sgs-buybox__saving-badge sgs-buybox__saving-badge--${ badgePosition }` }
					>
						{ savingText }
					</span>
				) }
			</div>
			) }
			<div className="sgs-buybox__config-col">
				{ stockAbove && stockLine }
				{ stockAbove && attributes.stockLineHairline && (
					<hr
						className="sgs-buybox__stock-hairline"
						aria-hidden="true"
						style={ {
							borderTop:
								'1px solid var(--wp--preset--color--border)',
							marginTop:
								safeLength(
									attributes.stockLineHairlineMargin?.top
								) || '8px',
							marginBottom:
								safeLength(
									attributes.stockLineHairlineMargin?.bottom
								) || '8px',
						} }
					/>
				) }
				<div
					className="buybox__price-row"
					style={
						attributes.priceRowFlexWrap
							? { flexWrap: attributes.priceRowFlexWrap }
							: undefined
					}
				>
					<span
						className="buybox__price buybox__price--current"
						style={ typographyPreviewStyle(
							attributes,
							'price',
							tier
						) }
					>
						{ SAMPLE.price }
					</span>
				</div>
				<p>
					<span className="buybox__rrp-price">
						<s>{ SAMPLE.rrp }</s>
					</span>{ ' ' }
					<span className="buybox__rrp-pill" style={ rrpPillStyle }>
						{ savingText }
					</span>
				</p>
				{ false !== attributes.showLadder && (
					<SampleValueLadder
						attributes={ attributes }
						tier={ tier }
					/>
				) }
				{ ! stockAbove && stockLine }
				{ isGuided ? (
					<div
						className="sgs-buybox-guided"
						style={
							meterColour
								? {
										'--sgs-buybox-guided-meter-colour':
											meterColour,
								  }
								: undefined
						}
					>
						<div className="sgs-buybox-guided__meter-wrap">
							{ /* role="list" mirrors includes/buybox-guided.php: Safari drops list semantics from a list-style:none list without it. */ }
							{ /* eslint-disable-next-line jsx-a11y/no-redundant-roles */ }
							<ol
								className={ `sgs-buybox-guided__meter sgs-buybox-guided__meter--${ meterStyle }` }
								role="list"
							>
								{ [ 1, 2 ].map( ( step ) => (
									<li
										key={ step }
										className="sgs-buybox-guided__meter-item"
									>
										<span
											className={ `sgs-buybox-guided__meter-btn${
												1 === step
													? ' sgs-buybox-guided__meter-btn--current'
													: ''
											}` }
										>
											<span className="sgs-buybox-guided__meter-index">
												{ step }
											</span>
										</span>
									</li>
								) ) }
							</ol>
							<p className="sgs-buybox-guided__meter-compact">{ `1 ${ __(
								'of',
								'sgs-blocks'
							) } 2 · ${ __( 'Colour', 'sgs-blocks' ) }` }</p>
						</div>
						<h3 className="sgs-buybox-guided__group-title">
							{ __( 'Colour', 'sgs-blocks' ) }
						</h3>
						<SampleOptionGroup
							label={ __( 'Colour', 'sgs-blocks' ) }
							options={ SAMPLE.colours }
							pillStyle={ attributes.pickerSwatchStyle }
							showTick={ showTick }
							labelStyle={ labelStyle }
							valueStyle={ valueStyle }
							optionStyle={ optionStyle }
							showSelectedValue={ showSelectedValue }
							pillStyleVars={ pillStyleVars }
							pillTextStyle={ pillTextStyle }
						/>
						<div
							className="sgs-buybox-guided__nav"
							style={
								attributes.navFlexWrap
									? { flexWrap: attributes.navFlexWrap }
									: undefined
							}
						>
							<span className="sgs-buybox-guided__nav-btn sgs-buybox-guided__nav-btn--back">
								{ attributes.guidedBackLabel ||
									__( 'Back', 'sgs-blocks' ) }
							</span>
							<AuthoredText
								className="sgs-buybox-guided__nav-btn sgs-buybox-guided__nav-btn--next"
								value={
									attributes.guidedNextLabel ||
									__( 'Next', 'sgs-blocks' )
								}
							/>
						</div>
					</div>
				) : (
					<>
						<SampleOptionGroup
							label={ __( 'Colour', 'sgs-blocks' ) }
							options={ SAMPLE.colours }
							pillStyle={ attributes.pickerSwatchStyle }
							showTick={ showTick }
							labelStyle={ labelStyle }
							valueStyle={ valueStyle }
							optionStyle={ optionStyle }
							showSelectedValue={ showSelectedValue }
							pillStyleVars={ pillStyleVars }
							pillTextStyle={ pillTextStyle }
						/>
						<SampleOptionGroup
							label={ __( 'Size', 'sgs-blocks' ) }
							options={ SAMPLE.sizes }
							pillStyle={ attributes.pickerStyle }
							showTick={ showTick }
							labelStyle={ labelStyle }
							valueStyle={ valueStyle }
							optionStyle={ optionStyle }
							showSelectedValue={ showSelectedValue }
							pillStyleVars={ pillStyleVars }
							pillTextStyle={ pillTextStyle }
							linkText={ linkText }
							linkStyle={ linkStyle }
						/>
						{ 'configurator' === attributes.buyboxLayout && (
							<SamplePickSet attributes={ attributes } />
						) }
					</>
				) }
				<div className="buybox__cart-form">
					<span
						className={ `wp-element-button buybox__add-to-cart${ cartVariant }` }
						style={ cartStyle }
					>
						<AuthoredText
							value={
								attributes.addToCartLabel ||
								__( 'Add to Cart', 'sgs-blocks' )
							}
						/>
					</span>
				</div>
				{ false !== attributes.notifyEnabled && (
					<SampleNotifyForm attributes={ attributes } />
				) }
				{ extras }
			</div>
			{ stickyBarOnAtTier( attributes, tier ) && (
				<SampleStickyBar
					attributes={ attributes }
					palette={ palette }
					cartVariant={ cartVariant }
				/>
			) }
		</>
	);
}

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
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { resolveColourToken } from '../../components';
import {
	backgroundPaintPreview,
	textPaintPreview,
	wrapperBorderPreview,
	tierBoxLonghands,
	typographyPreviewStyle,
	typographyPreviewCss,
} from '../../utils';

const PICKER_STYLES = [ 'outlined', 'filled', 'ghost', 'tile' ];
const BADGE_POSITIONS = [ 'top-right', 'top-left', 'bottom-right', 'bottom-left' ];
const METER_STYLES = [ 'segments', 'bar', 'dots' ];

/** Sample product the canvas draws: £30.00, RRP £40.00 (a £10.00 / 25% saving). */
const SAMPLE = {
	price: '£30.00',
	rrp: '£40.00',
	saving: { amount: '£10.00', percentage: '25%' },
	colours: [ __( 'Black', 'sgs-blocks' ), __( 'Tortoiseshell', 'sgs-blocks' ) ],
	sizes: [ __( 'Small', 'sgs-blocks' ), __( 'Medium', 'sgs-blocks' ), __( 'Large', 'sgs-blocks' ) ],
	// Per-unit price ladder: pack size, per-unit price, saving against the £3.00 single.
	ladder: [
		{ pack: '1', perUnit: '£3.00', saving: '' },
		{ pack: '3', perUnit: '£2.70', saving: __( 'save 10%', 'sgs-blocks' ) },
		{ pack: '6', perUnit: '£2.40', saving: __( 'save 20%', 'sgs-blocks' ) },
	],
};

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
		...backgroundPaintPreview( attributes.backgroundColour, attributes.backgroundColourGradient, palette ),
		...textPaintPreview( attributes.textColour, attributes.textColourGradient, palette ),
	};
	Object.assign( style, wrapperBorderPreview( attributes, tier, palette ) );
	Object.assign( style, tierBoxLonghands( attributes.margin, tier, 'margin' ) );
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
	css += typographyPreviewCss( attributes, 'stock', `${ root } .buybox__stock`, tier );
	css += typographyPreviewCss( attributes, 'savingBadge', `${ root } .sgs-buybox__saving-badge`, tier );
	css += typographyPreviewCss( attributes, 'notifyHeading', `${ root } .sgs-buybox__notify-heading`, tier );
	css += typographyPreviewCss( attributes, 'notifyLabel', `${ root } .sgs-buybox__notify-label`, tier );
	css += typographyPreviewCss( attributes, 'notifyLabel', `${ root } .sgs-buybox__notify-consent-label`, tier );
	css += typographyPreviewCss( attributes, 'notifyInput', `${ root } .sgs-buybox__notify-email`, tier );
	css += typographyPreviewCss( attributes, 'notifySubmit', `${ root } .sgs-buybox__notify-submit`, tier );
	css += typographyPreviewCss( attributes, 'notifyStatus', `${ root } .sgs-buybox__notify-status`, tier );
	css += typographyPreviewCss( attributes, 'guidedMeter', `${ root } .sgs-buybox-guided__meter-btn`, tier );
	css += typographyPreviewCss( attributes, 'guidedMeter', `${ root } .sgs-buybox-guided__meter-index`, tier );
	css += typographyPreviewCss( attributes, 'guidedMeter', `${ root } .sgs-buybox-guided__meter-compact`, tier );
	css += typographyPreviewCss( attributes, 'guidedGroupTitle', `${ root } .sgs-buybox-guided__group-title`, tier );
	const ratio = parseFloat( attributes.galleryColumnRatio ) || 0;
	const gap = String( attributes.galleryColumnGap || '' ).trim();
	const decls = [];
	if ( ratio > 0 ) {
		decls.push( `grid-template-columns:minmax(0,${ ratio }fr) minmax(0,1fr)` );
	}
	if ( gap && ! /[;{}<>]/.test( gap ) ) {
		decls.push( `gap:${ /^\d+(\.\d+)?$/.test( gap ) ? `${ gap }px` : gap }` );
	}
	if ( decls.length ) {
		const breakpoint = 'tablet' === attributes.stackBelow ? '1024px' : '768px';
		css += `@media(min-width:${ breakpoint }){${ root }{${ decls.join( ';' ) };}}`;
	}
	[ [ 'in-stock', attributes.stockInStockColour ], [ 'low-stock', attributes.stockLowStockColour ], [ 'out-of-stock', attributes.stockOutOfStockColour ] ].forEach( ( [ status, colour ] ) => {
		const resolved = colour ? resolveColourToken( colour, palette ) || colour : '';
		if ( resolved && ! /[;{}<>]/.test( resolved ) ) {
			css += `${ root } .buybox__stock--${ status }{color:${ resolved };}${ root } .buybox__stock--${ status } .buybox__stock-dot{background-color:${ resolved };}`;
		}
	} );
	// Gallery thumbnails: the same settings extras.php::sgs_buybox_extras_scoped_css writes.
	const colourOf = ( value ) => {
		const resolved = value ? resolveColourToken( value, palette ) || value : '';
		return resolved && ! /[;{}<>]/.test( resolved ) ? resolved : '';
	};
	// Thumbnail rail layout: the same rules extras.php writes for thumbGap and thumbsPerRow.
	const rawGap = String( attributes.thumbGap || '' ).trim();
	const thumbGap = /^\d+(\.\d+)?$/.test( rawGap ) ? `${ rawGap }px` : rawGap;
	// thumbsPerRow is a tier object; an unset tablet or mobile tier follows the next larger one.
	const perRowTiers = attributes.thumbsPerRow && 'object' === typeof attributes.thumbsPerRow ? attributes.thumbsPerRow : {};
	let perRow = 0;
	for ( const name of [ 'desktop', 'tablet', 'mobile' ] ) {
		const rawPerRow = perRowTiers[ name ];
		if ( null !== rawPerRow && undefined !== rawPerRow && '' !== rawPerRow && Number.isFinite( Number( rawPerRow ) ) ) {
			perRow = Math.min( 8, Math.max( 0, Math.trunc( Number( rawPerRow ) ) ) );
		}
		if ( name === tier ) {
			break;
		}
	}
	const rawOffset = String( attributes.thumbStripOffset || '' ).trim();
	const thumbOffset = /^\d+(\.\d+)?$/.test( rawOffset ) ? `${ rawOffset }px` : rawOffset;
	const railDecls = [];
	if ( thumbOffset && ! /[;{}<>]/.test( thumbOffset ) ) {
		railDecls.push( `--sgs-buybox-thumb-offset:${ thumbOffset }` );
	}
	if ( perRow > 0 ) {
		railDecls.push( 'display:grid', `grid-template-columns:repeat(${ perRow },minmax(48px,1fr))`, `--sgs-buybox-thumb-gutter:calc(4px + 10% / ${ perRow })` );
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
	const rawWidth = String( attributes.thumbBorderWidth || '' ).trim();
	// A bare number is pixels, as sgs_css_length_value() reads it on the front end.
	const thumbWidth = /^\d+(\.\d+)?$/.test( rawWidth ) ? `${ rawWidth }px` : rawWidth;
	const thumbColour = colourOf( attributes.thumbBorderColour );
	const thumbSelected = colourOf( attributes.thumbSelectedBorderColour );
	const rawScale = attributes.thumbSelectedScale;
	const thumbScale = null === rawScale || undefined === rawScale || '' === rawScale || ! Number.isFinite( Number( rawScale ) )
		? 105
		: Math.min( 150, Math.max( 50, Number( rawScale ) ) );
	const thumbDecls = [];
	if ( thumbWidth && ! /[;{}<>]/.test( thumbWidth ) ) {
		thumbDecls.push( `border-width:${ thumbWidth }` );
	}
	if ( thumbColour ) {
		thumbDecls.push( `border-color:${ thumbColour }` );
	}
	if ( thumbDecls.length ) {
		css += `${ root } .product-card__thumb{${ thumbDecls.join( ';' ) };}`;
	}
	const selectedDecls = [];
	if ( thumbSelected ) {
		selectedDecls.push( `border-color:${ thumbSelected }` );
	} else if ( thumbColour ) {
		selectedDecls.push( 'border-color:var(--wp--preset--color--primary,#0f7e80)' );
	}
	if ( 105 !== thumbScale ) {
		selectedDecls.push( `transform:scale(${ thumbScale / 100 })` );
	}
	if ( selectedDecls.length ) {
		css += `${ root } .product-card__thumb[aria-current="true"]{${ selectedDecls.join( ';' ) };}`;
	}
	return css;
}

/** One sample option picker, in sgs/option-picker's own markup. */
function SampleOptionGroup( { label, options, pillStyle, showTick, labelStyle, valueStyle, showSelectedValue } ) {
	const style = PICKER_STYLES.includes( pillStyle ) ? pillStyle : 'outlined';
	return (
		<>
			<div className="sgs-buybox__picker-label-row">
				<span className="sgs-buybox__picker-label-text" style={ labelStyle }>{ label }</span>
				{ showSelectedValue && (
					<span className="sgs-buybox__picker-selected-value" style={ valueStyle }>{ options[ 0 ] }</span>
				) }
			</div>
			<fieldset className={ `wp-block-sgs-option-picker sgs-option-picker sgs-option-picker--${ style } sgs-option-picker--medium${ showTick ? '' : ' sgs-option-picker--no-tick' }` }>
				<div className="sgs-option-picker__options" role="group">
					{ options.map( ( option, index ) => (
						<label key={ option } className="sgs-option-picker__option">
							<input type="radio" checked={ 0 === index } readOnly tabIndex={ -1 } />
							<span className="sgs-option-picker__pill">
								<span className="sgs-option-picker__pill-text">
									<span className="sgs-option-picker__pill-label">{ option }</span>
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
function SampleValueLadder( { attributes, tier } ) {
	const savingStyle = typographyPreviewStyle( attributes, 'valueLadderSaving', tier );
	const badgeText = attributes.decoyEnabled ? __( 'Most popular', 'sgs-blocks' ) : __( 'Best value', 'sgs-blocks' );
	const lastIndex = SAMPLE.ladder.length - 1;
	return (
		<ul
			className="buybox__value-ladder"
			aria-label={ __( 'Price per unit by pack size', 'sgs-blocks' ) }
			style={ typographyPreviewStyle( attributes, 'valueLadder', tier ) }
		>
			{ SAMPLE.ladder.map( ( row, index ) => (
				<li key={ row.pack } className="value-ladder__row" aria-current={ 0 === index ? 'true' : undefined }>
					<span className="value-ladder__pack">{ row.pack }</span>
					<span className="value-ladder__per-unit">{ row.perUnit }</span>
					{ row.saving && <span className="value-ladder__saving" style={ savingStyle }>{ row.saving }</span> }
					{ index === lastIndex && (
						<span className="wp-block-sgs-label is-style-pill-wrap product-card__best-value-badge">{ badgeText }</span>
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
			<p className="sgs-buybox__notify-heading">{ attributes.notifyMeLabel || __( 'Notify me', 'sgs-blocks' ) }</p>
			<div className="sgs-buybox__notify-form">
				<div className="sgs-buybox__notify-field">
					<span className="sgs-buybox__notify-label">{ __( 'Email address', 'sgs-blocks' ) }</span>
					<input type="email" className="sgs-buybox__notify-email" readOnly tabIndex={ -1 } placeholder={ __( 'your@email.com', 'sgs-blocks' ) } />
				</div>
				<div className="sgs-buybox__notify-consent-row">
					<input type="checkbox" className="sgs-buybox__notify-consent" readOnly tabIndex={ -1 } />
					<span className="sgs-buybox__notify-consent-label">{ __( 'Email me once when this is back in stock.', 'sgs-blocks' ) }</span>
				</div>
				<span className="wp-element-button sgs-buybox__notify-submit">{ attributes.notifyMeLabel || __( 'Notify me', 'sgs-blocks' ) }</span>
				<p className="sgs-buybox__notify-status" data-status="success">{ __( 'Thanks, we will email you when it is back.', 'sgs-blocks' ) }</p>
			</div>
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
	const format = 'percentage' === attributes.rrpSavingFormat ? 'percentage' : 'amount';
	const savingText = `${ attributes.rrpSavingPrefix ?? __( 'Save', 'sgs-blocks' ) } ${ SAMPLE.saving[ format ] }`.trim();
	const badgePosition = BADGE_POSITIONS.includes( attributes.gallerySavingBadgePosition ) ? attributes.gallerySavingBadgePosition : 'top-right';
	const showTick = true === attributes.pickerShowSelectedTick;
	const labelStyle = {
		...typographyPreviewStyle( attributes, 'pickerLabel', tier ),
		...( attributes.pickerLabelColour ? { color: resolveColourToken( attributes.pickerLabelColour, palette ) || attributes.pickerLabelColour } : {} ),
	};
	// The chosen value renders beside the label only on the own-render path, so
	// the canvas shows it under the same condition render.php uses.
	const valueStyle = typographyPreviewStyle( attributes, 'pickerValue', tier );
	const showSelectedValue = true === attributes.pickerShowSelectedValue;
	const rrpPillStyle = {
		...( attributes.rrpPillBackgroundColour ? { backgroundColor: resolveColourToken( attributes.rrpPillBackgroundColour, palette ) || attributes.rrpPillBackgroundColour } : {} ),
		...( attributes.rrpPillTextColour ? { color: resolveColourToken( attributes.rrpPillTextColour, palette ) || attributes.rrpPillTextColour } : {} ),
	};
	const cartStyle = {
		...typographyPreviewStyle( attributes, 'addToCart', tier ),
		...( attributes.addToCartBackgroundColour ? backgroundPaintPreview( attributes.addToCartBackgroundColour, '', palette ) : {} ),
		...( attributes.addToCartBorderColour ? { borderColor: resolveColourToken( attributes.addToCartBorderColour, palette ) || attributes.addToCartBorderColour } : {} ),
		...( attributes.addToCartMinHeight && ! /[;{}<>]/.test( attributes.addToCartMinHeight ) ? { minHeight: attributes.addToCartMinHeight } : {} ),
	};
	const cartVariant = [ 'primary', 'secondary', 'outline' ].includes( attributes.addToCartStyle ) ? ` buybox__add-to-cart--${ attributes.addToCartStyle }` : '';
	const stockAbove = 'above' === attributes.stockLinePosition;
	const stockLine = (
		<p className="buybox__stock buybox__stock--status buybox__stock--in-stock">
			<span className="buybox__stock-dot" aria-hidden="true"></span>
			{ attributes.stockInStockLabel || __( 'In stock', 'sgs-blocks' ) }
		</p>
	);
	const meterStyle = METER_STYLES.includes( attributes.guidedMeterStyle ) ? attributes.guidedMeterStyle : 'segments';
	const meterColour = attributes.guidedMeterColour ? resolveColourToken( attributes.guidedMeterColour, palette ) || attributes.guidedMeterColour : '';

	return (
		<>
			<div className="sgs-buybox__gallery-col">
				<div
					className="product-card__media sgs-buybox__mock-image"
					aria-hidden="true"
					style={ { aspectRatio: '1 / 1', display: 'grid', placeItems: 'center', background: 'var(--wp--preset--color--surface-alt, #f0f0f0)' } }
				>
					{ __( 'Product image', 'sgs-blocks' ) }
				</div>
				<div className="product-card__thumbs" aria-hidden="true">
					{ [ 1, 2, 3, 4 ].map( ( n ) => (
						<span key={ n } className="product-card__thumb" aria-current={ 1 === n ? 'true' : undefined } style={ { display: 'block', background: 'var(--wp--preset--color--surface-alt, #f0f0f0)' } } />
					) ) }
				</div>
				{ attributes.gallerySavingBadge && (
					<span className={ `sgs-buybox__saving-badge sgs-buybox__saving-badge--${ badgePosition }` }>{ savingText }</span>
				) }
			</div>
			<div className="sgs-buybox__config-col">
				{ stockAbove && stockLine }
				{ stockAbove && attributes.stockLineHairline && <hr className="sgs-buybox__stock-hairline" aria-hidden="true" style={ { borderTop: '1px solid var(--wp--preset--color--border)', margin: '8px 0' } } /> }
				<div className="buybox__price-row">
					<span className="buybox__price buybox__price--current" style={ typographyPreviewStyle( attributes, 'price', tier ) }>{ SAMPLE.price }</span>
				</div>
				<p>
					<span className="buybox__rrp-price"><s>{ SAMPLE.rrp }</s></span>{ ' ' }
					<span className="buybox__rrp-pill" style={ rrpPillStyle }>{ savingText }</span>
				</p>
				{ false !== attributes.showLadder && <SampleValueLadder attributes={ attributes } tier={ tier } /> }
				{ ! stockAbove && stockLine }
				{ isGuided ? (
					<div className="sgs-buybox-guided" style={ meterColour ? { '--sgs-buybox-guided-meter-colour': meterColour } : undefined }>
						<div className="sgs-buybox-guided__meter-wrap">
							<ol className={ `sgs-buybox-guided__meter sgs-buybox-guided__meter--${ meterStyle }` } role="list">
								{ [ 1, 2 ].map( ( step ) => (
									<li key={ step } className="sgs-buybox-guided__meter-item">
										<span className={ `sgs-buybox-guided__meter-btn${ 1 === step ? ' sgs-buybox-guided__meter-btn--current' : '' }` }>
											<span className="sgs-buybox-guided__meter-index">{ step }</span>
										</span>
									</li>
								) ) }
							</ol>
							<p className="sgs-buybox-guided__meter-compact">{ `1 ${ __( 'of', 'sgs-blocks' ) } 2 · ${ __( 'Colour', 'sgs-blocks' ) }` }</p>
						</div>
						<h3 className="sgs-buybox-guided__group-title">{ __( 'Colour', 'sgs-blocks' ) }</h3>
						<SampleOptionGroup label={ __( 'Colour', 'sgs-blocks' ) } options={ SAMPLE.colours } pillStyle={ attributes.pickerSwatchStyle } showTick={ showTick } labelStyle={ labelStyle } valueStyle={ valueStyle } showSelectedValue={ showSelectedValue } />
						<div className="sgs-buybox-guided__nav">
							<span className="sgs-buybox-guided__nav-btn sgs-buybox-guided__nav-btn--back">{ attributes.guidedBackLabel || __( 'Back', 'sgs-blocks' ) }</span>
							<span className="sgs-buybox-guided__nav-btn sgs-buybox-guided__nav-btn--next">{ attributes.guidedNextLabel || __( 'Next', 'sgs-blocks' ) }</span>
						</div>
					</div>
				) : (
					<>
						<SampleOptionGroup label={ __( 'Colour', 'sgs-blocks' ) } options={ SAMPLE.colours } pillStyle={ attributes.pickerSwatchStyle } showTick={ showTick } labelStyle={ labelStyle } valueStyle={ valueStyle } showSelectedValue={ showSelectedValue } />
						<SampleOptionGroup label={ __( 'Size', 'sgs-blocks' ) } options={ SAMPLE.sizes } pillStyle={ attributes.pickerStyle } showTick={ showTick } labelStyle={ labelStyle } valueStyle={ valueStyle } showSelectedValue={ showSelectedValue } />
					</>
				) }
				<div className="buybox__cart-form">
					<span className={ `wp-element-button buybox__add-to-cart${ cartVariant }` } style={ cartStyle }>
						{ attributes.addToCartLabel || __( 'Add to Cart', 'sgs-blocks' ) }
					</span>
				</div>
				{ false !== attributes.notifyEnabled && <SampleNotifyForm attributes={ attributes } /> }
				{ extras }
			</div>
		</>
	);
}

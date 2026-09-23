/**
 * Google Reviews — the field controls the styling sections share.
 *
 * Each is a thin composition of a control the other blocks already mount
 * (ResponsiveOverride + SgsLengthControl / SgsBoxControl, SgsBorderControl, TypographyControls);
 * nothing here is a new control. The section shell and reset logic are in panel-kit.js.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import {
	ResponsiveOverride,
	SgsLengthControl,
	SgsBoxControl,
	SgsBorderControl,
	TypographyControls,
	BOX_UNITS,
	normaliseResponsiveBox,
} from '../../../components';
import { Row, borderStyleValue, typographyAttrs } from './panel-kit';

/** A tier object of CSS lengths ({desktop, tablet, mobile}), one length per device. */
export function TierLength( { label, attr, attributes, setAttributes } ) {
	return (
		<ResponsiveOverride
			label={ label }
			value={ attributes[ attr ] }
			onChange={ ( obj ) => setAttributes( { [ attr ]: obj } ) }
		>
			{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
				<SgsLengthControl
					presets={ false }
					label={ label }
					hideLabelFromVision
					units={ BOX_UNITS }
					value={ ownValue || '' }
					placeholder={ inherited ? effectiveValue : '' }
					onChange={ ( val ) => setOwnValue( val || '' ) }
				/>
			) }
		</ResponsiveOverride>
	);
}

/** A tier object of four-side boxes (padding), one box per device. */
export function TierBox( { label, attr, attributes, setAttributes } ) {
	return (
		<ResponsiveOverride
			value={ attributes[ attr ] }
			onChange={ ( obj ) => setAttributes( { [ attr ]: obj } ) }
		>
			{ ( { ownValue, setOwnValue } ) => (
				<SgsBoxControl
					label={ label }
					values={ ownValue && 'object' === typeof ownValue ? ownValue : {} }
					units={ BOX_UNITS }
					presets
					onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
				/>
			) }
		</ResponsiveOverride>
	);
}

/**
 * The border pair (width + colour with style in its popover + radius) for one element.
 *
 * Colour is one solid/gradient state, or Normal + Hover states when a hover attribute exists.
 * `contrastAgainst` names the background actually behind the border so the control can warn
 * below 3:1 (WCAG 1.4.11) — the wire-border-contrast gate requires it on every mount.
 */
export function BorderField( {
	label,
	attributes,
	setAttributes,
	widthAttr,
	styleAttr,
	colourAttr,
	gradientAttr,
	hoverAttr,
	hoverGradientAttr,
	radiusAttr,
	contrastAgainst = '',
} ) {
	const state = ( key, stateLabel, attr, gradAttr ) => ( {
		key,
		label: stateLabel,
		value: attributes[ attr ],
		onChange: ( val ) => setAttributes( { [ attr ]: val ?? '' } ),
		linked: true,
		...( gradAttr
			? {
					gradientValue: attributes[ gradAttr ],
					onGradientChange: ( val ) => setAttributes( { [ gradAttr ]: val ?? '' } ),
			  }
			: {} ),
	} );
	const colourProps = hoverAttr
		? {
				colourStates: [
					state( 'normal', __( 'Normal', 'sgs-blocks' ), colourAttr, gradientAttr ),
					state( 'hover', __( 'Hover', 'sgs-blocks' ), hoverAttr, hoverGradientAttr ),
				],
		  }
		: {
				colourValue: attributes[ colourAttr ],
				onColourChange: ( val ) => setAttributes( { [ colourAttr ]: val ?? '' } ),
				colourGradientValue: gradientAttr ? attributes[ gradientAttr ] : undefined,
				onColourGradientChange: gradientAttr
					? ( val ) => setAttributes( { [ gradientAttr ]: val ?? '' } )
					: undefined,
				colourLinked: true,
		  };
	const radius = radiusAttr ? attributes[ radiusAttr ] : null;

	return (
		<SgsBorderControl
			label={ label }
			widthValues={ attributes[ widthAttr ] ?? {} }
			onWidthChange={ ( next ) => setAttributes( { [ widthAttr ]: next } ) }
			widthPresets={ [ '10', '20', '30' ] }
			styleValue={ attributes[ styleAttr ] }
			onStyleChange={ ( val ) => setAttributes( { [ styleAttr ]: borderStyleValue( styleAttr, val ) } ) }
			colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
			{ ...colourProps }
			contrastAgainst={ contrastAgainst }
			{ ...( radiusAttr
				? {
						radiusValues: {
							base: radius?.desktop ?? {},
							tablet: radius?.tablet ?? {},
							mobile: radius?.mobile ?? {},
						},
						onRadiusChange: ( tier, next ) => {
							const key = 'base' === tier ? 'desktop' : tier;
							setAttributes( { [ radiusAttr ]: { ...radius, [ key ]: next } } );
						},
				  }
				: {} ) }
		/>
	);
}

/** One typography target for TypographyControls: the full field set, keyed by its attribute prefix. */
export function typoTarget( prefix, label, extra = {} ) {
	return {
		key: prefix || 'wrapper',
		label,
		prefix,
		showSize: true,
		showWeight: true,
		showStyle: true,
		showLineHeight: true,
		showResponsive: true,
		showFontFamily: true,
		showDecoration: true,
		showTransform: true,
		showLetterSpacing: true,
		showTextAlign: true,
		showTextWrap: true,
		...extra,
	};
}

/** One typography row: a TypographyControls element toggle over the given targets. */
export function TypographyRow( { label, targets, attributes, setAttributes } ) {
	const attrs = typographyAttrs( targets.map( ( target ) => target.prefix ) );
	return (
		<Row label={ label } attrs={ attrs } attributes={ attributes } setAttributes={ setAttributes }>
			<TypographyControls attributes={ attributes } setAttributes={ setAttributes } targets={ targets } />
		</Row>
	);
}

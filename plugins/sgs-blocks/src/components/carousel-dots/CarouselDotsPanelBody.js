/**
 * The carousel dots kit's controls for one declared set of dots.
 *
 * Every attribute name is `prefix + base`, with the bases taken from `registry.json` (the table the generator writes
 * `block.json` attributes from), so a control can never write a name the generator did not create. The colours go in the
 * shared Colour panel (Normal, Hover and Current states); the border colour is a second row there. The lengths sit in one
 * Styles panel titled with the declared label: dot size, current dot width and gap are `{desktop,tablet,mobile}` lengths
 * (`ResponsiveOverride` around `SgsLengthControl`); border width and radius are one length each.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';

import registry from './registry.json';
import ResponsiveOverride from '../ResponsiveOverride';
import SgsColourPanel from '../SgsColourPanel';
import SgsLengthControl from '../SgsLengthControl';
import fillRow from '../colour-variants/fillRow';
import { carouselDotsAttrName } from '../CarouselDotsPanel';

const BASES = new Set( registry.rows.map( ( row ) => row.base ) );

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block `setAttributes`.
 * @param {string}   props.prefix        The dots' attribute prefix.
 * @param {string}   props.label         Panel title.
 * @return {JSX.Element} The panels.
 */
export default function CarouselDotsPanelBody( {
	attributes,
	setAttributes,
	prefix,
	label,
} ) {
	/**
	 * The attribute name for a registry base.
	 *
	 * @param {string} base Registry base, for example 'ColourActive'.
	 * @return {string} `prefix + base`.
	 */
	const attr = ( base ) => {
		if ( ! BASES.has( base ) ) {
			throw new Error(
				`CarouselDotsPanel: "${ base }" is not in carousel-dots/registry.json`
			);
		}
		return carouselDotsAttrName( prefix, base );
	};

	const colourRows = [
		fillRow( {
			key: `${ prefix }-dot`,
			label: __( 'Dot', 'sgs-blocks' ),
			heading: label,
			attrs: {
				base: attr( 'Colour' ),
				hover: attr( 'ColourHover' ),
				current: attr( 'ColourActive' ),
			},
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: `${ prefix }-border`,
			label: __( 'Dot border', 'sgs-blocks' ),
			attrs: { base: attr( 'BorderColour' ) },
			attributes,
			setAttributes,
		} ),
	];

	/**
	 * One `{desktop,tablet,mobile}` length.
	 *
	 * @param {string} base  Registry base.
	 * @param {string} title Control label.
	 * @return {JSX.Element} The control.
	 */
	const tierLength = ( base, title ) => (
		<ResponsiveOverride
			label={ title }
			value={ attributes[ attr( base ) ] }
			onChange={ ( obj ) => setAttributes( { [ attr( base ) ]: obj } ) }
		>
			{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
				<SgsLengthControl
					presets
					label={ title }
					hideLabelFromVision
					value={ ownValue ?? '' }
					placeholder={ inherited ? effectiveValue : '' }
					onChange={ ( val ) => setOwnValue( val || undefined ) }
				/>
			) }
		</ResponsiveOverride>
	);

	/**
	 * One length that is the same at every device.
	 *
	 * @param {string} base  Registry base.
	 * @param {string} title Control label.
	 * @return {JSX.Element} The control.
	 */
	const singleLength = ( base, title ) => (
		<SgsLengthControl
			label={ title }
			value={ attributes[ attr( base ) ] ?? '' }
			onChange={ ( val ) =>
				setAttributes( { [ attr( base ) ]: val || undefined } )
			}
		/>
	);

	return (
		<>
			<SgsColourPanel rows={ colourRows } />
			<InspectorControls group="styles">
				<PanelBody title={ label } initialOpen={ false }>
					{ tierLength( 'Size', __( 'Dot size', 'sgs-blocks' ) ) }
					{ tierLength(
						'ActiveWidth',
						__( 'Current dot width', 'sgs-blocks' )
					) }
					{ tierLength(
						'Gap',
						__( 'Space between dots', 'sgs-blocks' )
					) }
					{ singleLength(
						'BorderWidth',
						__( 'Dot border width', 'sgs-blocks' )
					) }
					{ singleLength(
						'Radius',
						__( 'Dot corner radius', 'sgs-blocks' )
					) }
				</PanelBody>
			</InspectorControls>
		</>
	);
}

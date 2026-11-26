/**
 * The carousel dots kit's controls for one declared set of dots.
 *
 * Every attribute name is `prefix + base`, with the bases taken from `registry.json` (the table the generator writes
 * `block.json` attributes from), so a control can never write a name the generator did not create. The colours (Normal, Hover
 * and Current states, and the border colour as a second row) go in the block's one main Colour panel when the block passes
 * `colourInMainPanel`, and in the kit's own Colour panel otherwise. The lengths sit in one
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
import KitColourPanel from '../KitColourPanel';
import SgsLengthControl from '../SgsLengthControl';
import { dotsColourRows } from './colour-rows';
import { carouselDotsAttrName } from '../CarouselDotsPanel';

const BASES = new Set( registry.rows.map( ( row ) => row.base ) );

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block `setAttributes`.
 * @param {string}   props.prefix        The dots' attribute prefix.
 * @param {string}   props.label         Panel title.
 * @param {boolean}  [props.colourInMainPanel=false] True when the block draws these colour rows in its own main Colour panel
 *                                       (`carouselDotsColourRows`), so the kit draws none; false keeps them in the kit's own panel.
 * @return {JSX.Element} The panels.
 */
export default function CarouselDotsPanelBody( {
	attributes,
	setAttributes,
	prefix,
	label,
	colourInMainPanel = false,
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

	// The colour rows (`./colour-rows.js`): a block with 12 or fewer base colours draws them in its one main Colour panel, and any
	// other block gets them in the kit's own Colour panel below.
	const colourRows = colourInMainPanel
		? []
		: dotsColourRows( { attributes, setAttributes, prefix, label } );

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
			<KitColourPanel rows={ colourRows } />
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

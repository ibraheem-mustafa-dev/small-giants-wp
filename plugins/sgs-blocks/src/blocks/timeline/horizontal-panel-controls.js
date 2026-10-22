import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	SelectControl,
	ToggleControl,
	__experimentalNumberControl as NumberControl,
} from '@wordpress/components';
import { DesignTokenPicker, ResponsiveOverride } from '../../components';

const COUNTER_FORMATS = [
	{ value: 'padded-index-of-total', label: __( '01 / 12', 'sgs-blocks' ) },
	{ value: 'index-of-total', label: __( '1 / 12', 'sgs-blocks' ) },
	{ value: 'percent', label: __( 'Percentage', 'sgs-blocks' ) },
];

/**
 * A bounded decimal setting stored as a number, or cleared to use the engine default.
 *
 * @param {Object}   props          Props.
 * @param {string}   props.label    Control label.
 * @param {number}   props.value    Stored value.
 * @param {number}   props.max      Upper bound.
 * @param {Function} props.onChange Receives a number or undefined.
 * @return {JSX.Element} The control.
 */
function DecimalControl( { label, value, max, onChange } ) {
	return (
		<NumberControl
			label={ label }
			min={ 0 }
			max={ max }
			step={ 0.05 }
			spinControls="custom"
			value={ undefined === value ? '' : value }
			onChange={ ( next ) => {
				const parsed = parseFloat( next );
				onChange( Number.isNaN( parsed ) ? undefined : Math.min( max, Math.max( 0, parsed ) ) );
			} }
			__next40pxDefaultSize
		/>
	);
}

/**
 * The timeline's pinned-horizontal settings: the progress counter, the proximity focus, and the look of the active
 * entry's year. Shown only while the scroll effect is "pinned-horizontal".
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute writer.
 * @return {JSX.Element|null} The panel, or null for any other scroll effect.
 */
export default function HorizontalPanelControls( { attributes, setAttributes } ) {
	if ( 'pinned-horizontal' !== attributes.scrollEffect ) {
		return null;
	}
	const {
		panelCounter,
		panelCounterFormat,
		panelProximityFocus,
		panelFocusScale,
		panelEdgeScale,
		panelFocusOpacity,
		panelEdgeOpacity,
		dateActiveColour,
		dateActiveTextStrokeWidth,
		dateActiveTextStrokeColour,
	} = attributes;
	return (
		<PanelBody title={ __( 'Pinned scroll extras', 'sgs-blocks' ) } initialOpen={ false }>
			<ToggleControl
				label={ __( 'Show a progress counter', 'sgs-blocks' ) }
				help={ __( 'A running "01 / 12" that follows the pinned scroll.', 'sgs-blocks' ) }
				checked={ !! panelCounter }
				onChange={ ( next ) => setAttributes( { panelCounter: next } ) }
				__nextHasNoMarginBottom
			/>
			{ panelCounter && (
				<SelectControl
					label={ __( 'Counter style', 'sgs-blocks' ) }
					value={ panelCounterFormat }
					options={ COUNTER_FORMATS }
					onChange={ ( next ) => setAttributes( { panelCounterFormat: next } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
			<ToggleControl
				label={ __( 'Focus the entry nearest the centre', 'sgs-blocks' ) }
				help={ __( 'Entries away from the centre shrink and fade as the row slides. A value left empty uses the standard one.', 'sgs-blocks' ) }
				checked={ !! panelProximityFocus }
				onChange={ ( next ) => setAttributes( { panelProximityFocus: next } ) }
				__nextHasNoMarginBottom
			/>
			{ panelProximityFocus && (
				<>
					<DecimalControl
						label={ __( 'Centre size (1 is full size)', 'sgs-blocks' ) }
						value={ panelFocusScale }
						max={ 2 }
						onChange={ ( next ) => setAttributes( { panelFocusScale: next } ) }
					/>
					<DecimalControl
						label={ __( 'Edge size (1 is full size)', 'sgs-blocks' ) }
						value={ panelEdgeScale }
						max={ 2 }
						onChange={ ( next ) => setAttributes( { panelEdgeScale: next } ) }
					/>
					<DecimalControl
						label={ __( 'Centre opacity', 'sgs-blocks' ) }
						value={ panelFocusOpacity }
						max={ 1 }
						onChange={ ( next ) => setAttributes( { panelFocusOpacity: next } ) }
					/>
					<DecimalControl
						label={ __( 'Edge opacity', 'sgs-blocks' ) }
						value={ panelEdgeOpacity }
						max={ 1 }
						onChange={ ( next ) => setAttributes( { panelEdgeOpacity: next } ) }
					/>
				</>
			) }
			<DesignTokenPicker
				label={ __( 'Year colour while the entry is in focus', 'sgs-blocks' ) }
				help={ __( 'Leave empty to keep the normal year colour. Choose a transparent colour for hollow digits.', 'sgs-blocks' ) }
				value={ dateActiveColour || '' }
				onChange={ ( next ) => setAttributes( { dateActiveColour: next ?? '' } ) }
			/>
			<ResponsiveOverride
				label={ __( 'Year outline width while in focus', 'sgs-blocks' ) }
				value={ dateActiveTextStrokeWidth }
				onChange={ ( obj ) => setAttributes( { dateActiveTextStrokeWidth: obj } ) }
			>
				{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
					<NumberControl
						label={ __( 'Year outline width (px)', 'sgs-blocks' ) }
						hideLabelFromVision
						min={ 0 }
						max={ 20 }
						step={ 0.5 }
						spinControls="custom"
						value={ ownValue }
						placeholder={ inherited && undefined !== effectiveValue ? String( effectiveValue ) : '' }
						onChange={ ( val ) => {
							const parsed = parseFloat( val );
							setOwnValue( Number.isNaN( parsed ) ? '' : Math.min( 20, Math.max( 0, parsed ) ) );
						} }
						__next40pxDefaultSize
					/>
				) }
			</ResponsiveOverride>
			<DesignTokenPicker
				label={ __( 'Year outline colour while in focus', 'sgs-blocks' ) }
				help={ __( 'Leave empty to draw the outline in the year colour.', 'sgs-blocks' ) }
				value={ dateActiveTextStrokeColour || '' }
				onChange={ ( next ) => setAttributes( { dateActiveTextStrokeColour: next ?? '' } ) }
			/>
		</PanelBody>
	);
}

import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';
import { NumberControl, ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';
import { DesignTokenPicker, ResponsiveOverride, TypographyControls } from '../../components';

const COUNTER_FORMATS = [
	{ value: 'padded-index-of-total', label: __( '01 / 12', 'sgs-blocks' ) },
	{ value: 'index-of-total', label: __( '1 / 12', 'sgs-blocks' ) },
	{ value: 'percent', label: __( '%', 'sgs-blocks' ), title: __( 'Percentage', 'sgs-blocks' ) },
];

const COUNTER_BASES = [
	{ value: 'progress', label: __( 'Scroll progress', 'sgs-blocks' ) },
	{ value: 'active', label: __( 'Card in view', 'sgs-blocks' ) },
];

/**
 * The colour rows of the pinned header row (bar track, bar fill, counter, hint) for the timeline's colour panel. Empty
 * for any scroll effect other than "pinned-horizontal".
 *
 * @param {Object}   attributes    Block attributes.
 * @param {Function} setAttributes Attribute writer.
 * @return {Array} Rows for `SgsColourPanel`.
 */
export function pinnedColourRows( attributes, setAttributes ) {
	if ( 'pinned-horizontal' !== attributes.scrollEffect ) {
		return [];
	}
	const flat = ( key, attr, label ) => ( {
		key,
		label,
		states: [
			{
				key: 'normal',
				label: __( 'Normal', 'sgs-blocks' ),
				value: attributes[ attr ],
				onChange: ( val ) => setAttributes( { [ attr ]: val ?? '' } ),
			},
		],
	} );
	return [
		flat( 'panelCounterColour', 'counterColour', __( 'Pinned counter colour', 'sgs-blocks' ) ),
		flat( 'panelHintColour', 'hintColour', __( 'Pinned hint colour', 'sgs-blocks' ) ),
		flat( 'panelBarTrack', 'panelBarTrackColour', __( 'Progress bar track colour', 'sgs-blocks' ) ),
		{
			key: 'panelBarFill',
			label: __( 'Progress bar fill colour', 'sgs-blocks' ),
			gradientCapable: true,
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: attributes.panelBarFillColour,
					onChange: ( val ) => setAttributes( { panelBarFillColour: val ?? '' } ),
					gradientValue: attributes.panelBarFillGradient,
					onGradientChange: ( val ) => setAttributes( { panelBarFillGradient: val ?? '' } ),
				},
			],
		},
	];
}

/**
 * A whole-number setting stored as a number.
 *
 * @param {Object}   props          Props.
 * @param {string}   props.label    Control label.
 * @param {string}   props.help     Help text.
 * @param {number}   props.value    Stored value.
 * @param {number}   props.min      Lower bound.
 * @param {number}   props.max      Upper bound.
 * @param {Function} props.onChange Receives the number.
 * @return {JSX.Element} The control.
 */
function WholeNumberControl( { label, help, value, min, max, onChange } ) {
	return (
		<NumberControl
			label={ label }
			help={ help }
			min={ min }
			max={ max }
			step={ 1 }
			spinControls="custom"
			value={ undefined === value ? '' : value }
			onChange={ ( next ) => {
				const parsed = parseFloat( next );
				onChange( Number.isNaN( parsed ) ? 0 : Math.min( max, Math.max( min, parsed ) ) );
			} }
			__next40pxDefaultSize
		/>
	);
}

/**
 * A per-device scroll distance in vh.
 *
 * @param {Object}   props          Props.
 * @param {string}   props.label    Control label.
 * @param {string}   props.help     Help text.
 * @param {Object}   props.value    Tier object.
 * @param {Function} props.onChange Receives the tier object.
 * @return {JSX.Element} The control.
 */
function ScrollLengthControl( { label, help, value, onChange } ) {
	return (
		<ResponsiveOverride label={ label } value={ value } onChange={ onChange }>
			{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
				<NumberControl
					label={ label }
					help={ help }
					hideLabelFromVision
					min={ 0 }
					max={ 400 }
					step={ 1 }
					spinControls="custom"
					value={ ownValue }
					placeholder={ inherited && undefined !== effectiveValue ? String( effectiveValue ) : '' }
					onChange={ ( val ) => {
						const parsed = parseFloat( val );
						setOwnValue( Number.isNaN( parsed ) ? '' : Math.min( 400, Math.max( 0, parsed ) ) );
					} }
					__next40pxDefaultSize
				/>
			) }
		</ResponsiveOverride>
	);
}

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
		panelCounterBasis,
		panelProgressBar,
		panelHint,
		panelBarHeight,
		panelRowGap,
		panelRowSpacing,
		panelTransitionMs,
		panelPinLength,
		panelPinTail,
	} = attributes;
	return (
		<>
		<PanelBody title={ __( 'Pinned scroll extras', 'sgs-blocks' ) } initialOpen={ false }>
			<ScrollLengthControl
				label={ __( 'Scroll distance per card (vh)', 'sgs-blocks' ) }
				help={ __( 'How much page scroll each card takes while pinned. Empty uses the standard distance.', 'sgs-blocks' ) }
				value={ panelPinLength }
				onChange={ ( obj ) => setAttributes( { panelPinLength: obj } ) }
			/>
			<ScrollLengthControl
				label={ __( 'Extra scroll after the last card (vh)', 'sgs-blocks' ) }
				value={ panelPinTail }
				onChange={ ( obj ) => setAttributes( { panelPinTail: obj } ) }
			/>
			<WholeNumberControl
				label={ __( 'Card change transition (ms)', 'sgs-blocks' ) }
				help={ __( '0 switches the year and card changes instantly. Not applied when the visitor prefers reduced motion.', 'sgs-blocks' ) }
				value={ panelTransitionMs }
				min={ 0 }
				max={ 3000 }
				onChange={ ( next ) => setAttributes( { panelTransitionMs: next } ) }
			/>
			<ToggleControl
				label={ __( 'Show a progress counter', 'sgs-blocks' ) }
				help={ __( 'A running "01 / 12" that follows the pinned scroll.', 'sgs-blocks' ) }
				checked={ !! panelCounter }
				onChange={ ( next ) => setAttributes( { panelCounter: next } ) }
				__nextHasNoMarginBottom
			/>
			{ panelCounter && (
				<ToggleGroupControl
					label={ __( 'Counter style', 'sgs-blocks' ) }
					value={ panelCounterFormat }
					onChange={ ( next ) => setAttributes( { panelCounterFormat: next } ) }
					isBlock
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				>
					{ COUNTER_FORMATS.map( ( format ) => (
						<ToggleGroupControlOption key={ format.value } value={ format.value } label={ format.label } aria-label={ format.title } />
					) ) }
				</ToggleGroupControl>
			) }
			{ panelCounter && (
				<ToggleGroupControl
					label={ __( 'Counter follows', 'sgs-blocks' ) }
					value={ panelCounterBasis || 'progress' }
					onChange={ ( next ) => setAttributes( { panelCounterBasis: next } ) }
					isBlock
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				>
					{ COUNTER_BASES.map( ( basis ) => (
						<ToggleGroupControlOption key={ basis.value } value={ basis.value } label={ basis.label } />
					) ) }
				</ToggleGroupControl>
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
		<PanelBody title={ __( 'Pinned header row', 'sgs-blocks' ) } initialOpen={ false }>
			<ToggleControl
				label={ __( 'Show a progress bar', 'sgs-blocks' ) }
				help={ __( 'A bar beside the counter that fills as the pinned scroll advances.', 'sgs-blocks' ) }
				checked={ !! panelProgressBar }
				onChange={ ( next ) => setAttributes( { panelProgressBar: next } ) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Hint text', 'sgs-blocks' ) }
				help={ __( 'Shown at the end of the row, for example "Scroll to explore". Empty shows none.', 'sgs-blocks' ) }
				value={ panelHint || '' }
				onChange={ ( next ) => setAttributes( { panelHint: next } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ panelProgressBar && (
				<WholeNumberControl
					label={ __( 'Bar height (px)', 'sgs-blocks' ) }
					value={ panelBarHeight }
					min={ 1 }
					max={ 40 }
					onChange={ ( next ) => setAttributes( { panelBarHeight: next } ) }
				/>
			) }
			<WholeNumberControl
				label={ __( 'Space between counter, bar and hint (px)', 'sgs-blocks' ) }
				value={ panelRowGap }
				min={ 0 }
				max={ 400 }
				onChange={ ( next ) => setAttributes( { panelRowGap: next } ) }
			/>
			<WholeNumberControl
				label={ __( 'Space below the row (px)', 'sgs-blocks' ) }
				value={ panelRowSpacing }
				min={ 0 }
				max={ 400 }
				onChange={ ( next ) => setAttributes( { panelRowSpacing: next } ) }
			/>
		</PanelBody>
		<PanelBody title={ __( 'Pinned counter typography', 'sgs-blocks' ) } initialOpen={ false }>
			<TypographyControls
				fontSizePresets
				showFontFamily
				showTransform
				showLetterSpacing
				attributes={ attributes }
				setAttributes={ setAttributes }
				prefix="counter"
			/>
		</PanelBody>
		<PanelBody title={ __( 'Pinned hint typography', 'sgs-blocks' ) } initialOpen={ false }>
			<TypographyControls
				fontSizePresets
				showFontFamily
				showTransform
				showLetterSpacing
				attributes={ attributes }
				setAttributes={ setAttributes }
				prefix="hint"
			/>
		</PanelBody>
		</>
	);
}

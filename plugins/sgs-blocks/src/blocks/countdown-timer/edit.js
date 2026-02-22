import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	RangeControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalNumberControl as NumberControl,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';

const CARD_STYLES = [
	{ label: __( 'Flat', 'sgs-blocks' ), value: 'flat' },
	{ label: __( 'Bordered', 'sgs-blocks' ), value: 'bordered' },
	{ label: __( 'Elevated', 'sgs-blocks' ), value: 'elevated' },
	{ label: __( 'Filled', 'sgs-blocks' ), value: 'filled' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		targetDate,
		evergreenMode,
		evergreenHours,
		evergreenMinutes,
		expiredMessage,
		showDays,
		showHours,
		showMinutes,
		showSeconds,
		cardStyle,
	} = attributes;

	const className = [
		'sgs-countdown',
		`sgs-countdown--${ cardStyle }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

	const units = [];
	if ( showDays ) units.push( { value: '00', label: __( 'Days', 'sgs-blocks' ) } );
	if ( showHours ) units.push( { value: '00', label: __( 'Hours', 'sgs-blocks' ) } );
	if ( showMinutes ) units.push( { value: '00', label: __( 'Minutes', 'sgs-blocks' ) } );
	if ( showSeconds ) units.push( { value: '00', label: __( 'Seconds', 'sgs-blocks' ) } );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Timer Settings', 'sgs-blocks' ) }>
					<ToggleControl
						label={ __( 'Evergreen mode', 'sgs-blocks' ) }
						help={ __( 'Starts fresh for each visitor', 'sgs-blocks' ) }
						checked={ evergreenMode }
						onChange={ ( val ) => setAttributes( { evergreenMode: val } ) }
						__nextHasNoMarginBottom
					/>
					{ ! evergreenMode && (
						<TextControl
							label={ __( 'Target date/time', 'sgs-blocks' ) }
							help={ __( 'Format: YYYY-MM-DDTHH:MM', 'sgs-blocks' ) }
							value={ targetDate }
							onChange={ ( val ) => setAttributes( { targetDate: val } ) }
							type="datetime-local"
							__nextHasNoMarginBottom
						/>
					) }
					{ evergreenMode && (
						<>
							<RangeControl
								label={ __( 'Hours', 'sgs-blocks' ) }
								value={ evergreenHours }
								onChange={ ( val ) => setAttributes( { evergreenHours: val } ) }
								min={ 0 }
								max={ 720 }
								__nextHasNoMarginBottom
							/>
							<RangeControl
								label={ __( 'Minutes', 'sgs-blocks' ) }
								value={ evergreenMinutes }
								onChange={ ( val ) => setAttributes( { evergreenMinutes: val } ) }
								min={ 0 }
								max={ 59 }
								__nextHasNoMarginBottom
							/>
						</>
					) }
					<TextControl
						label={ __( 'Expired message', 'sgs-blocks' ) }
						value={ expiredMessage }
						onChange={ ( val ) => setAttributes( { expiredMessage: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody title={ __( 'Display', 'sgs-blocks' ) } initialOpen={ false }>
					<ToggleControl
						label={ __( 'Show days', 'sgs-blocks' ) }
						checked={ showDays }
						onChange={ ( val ) => setAttributes( { showDays: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show hours', 'sgs-blocks' ) }
						checked={ showHours }
						onChange={ ( val ) => setAttributes( { showHours: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show minutes', 'sgs-blocks' ) }
						checked={ showMinutes }
						onChange={ ( val ) => setAttributes( { showMinutes: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show seconds', 'sgs-blocks' ) }
						checked={ showSeconds }
						onChange={ ( val ) => setAttributes( { showSeconds: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody title={ __( 'Styling', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Card style', 'sgs-blocks' ) }
						value={ cardStyle }
						options={ CARD_STYLES }
						onChange={ ( val ) => setAttributes( { cardStyle: val } ) }
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Number colour', 'sgs-blocks' ) }
						value={ attributes.numberColour }
						onChange={ ( val ) => setAttributes( { numberColour: val } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Label colour', 'sgs-blocks' ) }
						value={ attributes.labelColour }
						onChange={ ( val ) => setAttributes( { labelColour: val } ) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="sgs-countdown__grid">
					{ units.map( ( unit, i ) => (
						<div key={ i } className="sgs-countdown__unit">
							<span className="sgs-countdown__number">{ unit.value }</span>
							<span className="sgs-countdown__label">{ unit.label }</span>
						</div>
					) ) }
				</div>
			</div>
		</>
	);
}

import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	RangeControl,
} from '@wordpress/components';
import { DesignTokenPicker, ResponsiveBoxControl, ResponsiveBorderRadiusControl } from '../../components';
import { colourVar } from '../../utils';

const CARD_STYLES = [
	{ label: __( 'Flat', 'sgs-blocks' ), value: 'flat' },
	{ label: __( 'Bordered', 'sgs-blocks' ), value: 'bordered' },
	{ label: __( 'Elevated', 'sgs-blocks' ), value: 'elevated' },
	{ label: __( 'Filled', 'sgs-blocks' ), value: 'filled' },
];

const DIGIT_STYLES = [
	{ label: __( 'Simple', 'sgs-blocks' ), value: 'simple' },
	{ label: __( 'Flip', 'sgs-blocks' ), value: 'flip' },
];

/**
 * Editor-canvas box shorthand preview — mirrors render.php's scoped shorthand
 * output so the canvas matches the frontend (contract §E). Editor-only
 * convenience; the frontend never emits these as inline styles (contract §A).
 */
function boxShorthand( box, order = [ 'top', 'right', 'bottom', 'left' ] ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	const vals = order.map( ( key ) => box[ key ] );
	if ( vals.every( ( v ) => ! v ) ) return undefined;
	return vals.map( ( v ) => v || '0' ).join( ' ' );
}

/**
 * Build the editor-canvas preview style object (base tier only — tablet/
 * mobile tiers are not simulated on the fixed-width canvas, matching quote/
 * media precedent).
 */
function buildPreviewStyle( attributes ) {
	const { style, textAlign } = attributes;

	const preview = {};

	const paddingPreview = boxShorthand( style?.spacing?.padding );
	if ( paddingPreview ) {
		preview.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( style?.spacing?.margin );
	if ( marginPreview ) {
		preview.margin = marginPreview;
	}

	const border = style?.border ?? {};
	if ( border.style && border.style !== 'none' ) {
		const borderWidthPreview = boxShorthand( border.width, [ 'top', 'right', 'bottom', 'left' ] );
		if ( typeof border.width === 'string' ) {
			preview.borderWidth = border.width;
		} else if ( borderWidthPreview ) {
			preview.borderWidth = borderWidthPreview;
		}
		preview.borderStyle = border.style;
		if ( border.color ) {
			preview.borderColor = border.color;
		}
	}
	if ( border.radius ) {
		preview.borderRadius = typeof border.radius === 'string'
			? border.radius
			: boxShorthand( border.radius, [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] );
	}

	if ( style?.color?.text ) {
		preview.color = style.color.text;
	}
	if ( style?.color?.background ) {
		preview.backgroundColor = style.color.background;
	}
	if ( style?.typography?.fontSize ) {
		preview.fontSize = style.typography.fontSize;
	}
	if ( textAlign ) {
		preview.textAlign = textAlign;
	}

	return preview;
}

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
		digitStyle,
		style,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
		borderRadiusTablet,
		borderRadiusMobile,
	} = attributes;

	const className = [
		'sgs-countdown',
		`sgs-countdown--${ cardStyle }`,
	].join( ' ' );

	const blockProps = useBlockProps( {
		className,
		style: buildPreviewStyle( attributes ),
	} );

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
					<SelectControl
						label={ __( 'Digit style', 'sgs-blocks' ) }
						help={ __( 'Flip animates each digit when it changes. Disabled when "Reduce motion" is on.', 'sgs-blocks' ) }
						value={ digitStyle }
						options={ DIGIT_STYLES }
						onChange={ ( val ) => setAttributes( { digitStyle: val } ) }
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

				{ /*
				 * Box families: base padding/margin/border-radius are WP-native
				 * style.spacing.* / style.border.radius objects (already responsive-
				 * capable at the base tier via the block's native Styles panel);
				 * these controls add the SGS Tablet/Mobile tier overrides
				 * (contract §B, mirrors sgs/quote + sgs/media).
				 */ }
				<PanelBody title={ __( 'Responsive spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						values={ {
							base: style?.spacing?.padding ?? {},
							tablet: paddingTablet ?? {},
							mobile: paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, spacing: { ...style?.spacing, padding: next } } } );
							} else {
								setAttributes( { [ `padding${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						values={ {
							base: style?.spacing?.margin ?? {},
							tablet: marginTablet ?? {},
							mobile: marginMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, spacing: { ...style?.spacing, margin: next } } } );
							} else {
								setAttributes( { [ `margin${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
					<ResponsiveBorderRadiusControl
						label={ __( 'Border radius', 'sgs-blocks' ) }
						values={ {
							base: style?.border?.radius ?? {},
							tablet: borderRadiusTablet ?? {},
							mobile: borderRadiusMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, border: { ...style?.border, radius: next } } } );
							} else {
								setAttributes( { [ `borderRadius${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
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

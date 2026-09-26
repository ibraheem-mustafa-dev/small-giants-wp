/**
 * Hover Effects extension — "Click Effects" inspector panel.
 *
 * Split out of the former hover-effects.js (D551, Phase 2.1 header docs live
 * in ../index.js). Verbatim move of the PanelBody JSX; receives every value
 * it reads from the withHoverControls HOC as props.
 *
 * @package SGS\Blocks
 */
import { PanelBody, RangeControl, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

// Lazy-import DesignTokenPicker if available, fallback to nothing.
let DesignTokenPicker;
try {
	DesignTokenPicker = require( '../../../components' ).DesignTokenPicker;
} catch {
	DesignTokenPicker = null;
}

/**
 * @param {Object}   props
 * @param {string}   props.sgsClickEffect
 * @param {string}   props.sgsClickRippleColour
 * @param {number}   props.sgsClickRippleDuration
 * @param {Function} props.setAttributes
 */
export default function ClickPanel( {
	sgsClickEffect,
	sgsClickRippleColour,
	sgsClickRippleDuration,
	setAttributes,
} ) {
	return (
		<PanelBody
			title={ __( 'Click Effects', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<SelectControl
				label={ __( 'Click effect', 'sgs-blocks' ) }
				help={ __( 'Ripple: a radial wave radiates from the click point.', 'sgs-blocks' ) }
				value={ sgsClickEffect }
				options={ [
					{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
					{ label: __( 'Ripple', 'sgs-blocks' ), value: 'ripple' },
				] }
				onChange={ ( val ) => setAttributes( { sgsClickEffect: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ sgsClickEffect === 'ripple' && (
				<>
					{ DesignTokenPicker ? (
						<DesignTokenPicker
							label={ __( 'Ripple colour', 'sgs-blocks' ) }
							help={ __( 'Leave empty to use currentColour at 30% opacity.', 'sgs-blocks' ) }
							value={ sgsClickRippleColour }
							onChange={ ( val ) => setAttributes( { sgsClickRippleColour: val || '' } ) }
						/>
					) : null }
					<RangeControl
						label={ __( 'Ripple duration (ms)', 'sgs-blocks' ) }
						value={ sgsClickRippleDuration }
						onChange={ ( val ) => setAttributes( { sgsClickRippleDuration: val } ) }
						min={ 200 }
						max={ 1200 }
						step={ 50 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</>
			) }
		</PanelBody>
	);
}

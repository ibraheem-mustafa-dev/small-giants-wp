/**
 * Nav drawer "Motion" panel (Wave 3C U-5): how the drawer arrives and leaves,
 * its timing and speed curve, and the one-after-another arrival of its menu
 * items. The render side is `includes/helpers-nav-drawer-motion.php`; the
 * curtain colour row lives in the block's top-level SgsColourPanel.
 *
 * @package SGS\Blocks
 */

import { __, sprintf } from '@wordpress/i18n';
import { PanelBody, RangeControl, SelectControl, ToggleControl } from '@wordpress/components';
import { ResponsiveOverride, MotionEasingControl } from '../../components';

/** Anchor → what Automatic does at that anchor. */
const AUTO_LABEL = {
	'full-screen': __( 'fade and drop', 'sgs-blocks' ),
	header: __( 'expand down', 'sgs-blocks' ),
	trigger: __( 'scale from corner', 'sgs-blocks' ),
	centred: __( 'scale up', 'sgs-blocks' ),
};

/** Values mirror includes/helpers-nav-drawer-motion.php::sgs_nav_drawer_motion_shapes(). */
const SHAPE_OPTIONS = [
	{ label: __( 'Automatic', 'sgs-blocks' ), value: 'auto' },
	{ label: __( 'None (appears instantly)', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Fade', 'sgs-blocks' ), value: 'fade' },
	{ label: __( 'Slide from the start edge', 'sgs-blocks' ), value: 'slide-start' },
	{ label: __( 'Slide from the end edge', 'sgs-blocks' ), value: 'slide-end' },
	{ label: __( 'Slide up from the bottom', 'sgs-blocks' ), value: 'slide-up' },
	{ label: __( 'Slide down from the top', 'sgs-blocks' ), value: 'slide-down' },
	{ label: __( 'Wipe down', 'sgs-blocks' ), value: 'wipe-down' },
	{ label: __( 'Wipe down, slanted edge', 'sgs-blocks' ), value: 'wipe-down-skew' },
	{ label: __( 'Reveal from the header bar', 'sgs-blocks' ), value: 'reveal-from-bar' },
	{ label: __( 'Curtain sweep', 'sgs-blocks' ), value: 'curtain' },
	{ label: __( 'Scale up', 'sgs-blocks' ), value: 'scale' },
];

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @param {string}   props.anchorDesktop The desktop anchor, for the Automatic hint.
 * @return {Element} The panel.
 */
export default function MotionPanel( { attributes, setAttributes, anchorDesktop } ) {
	const {
		entryAnimation,
		entryDuration,
		exitDuration,
		entryEasing,
		entryEasingCustom,
		entryFade,
		itemStagger,
		itemStaggerDistance,
		itemStaggerDuration,
		itemStaggerMax,
		itemStaggerOnClose,
		scrimFadeDuration,
	} = attributes;

	return (
		<PanelBody title={ __( 'Motion', 'sgs-blocks' ) } initialOpen={ false }>
			<ResponsiveOverride
				label={ __( 'Open and close animation', 'sgs-blocks' ) }
				value={ entryAnimation || {} }
				onChange={ ( obj ) => setAttributes( { entryAnimation: obj } ) }
			>
				{ ( { ownValue, effectiveValue, setOwnValue } ) => (
					<SelectControl
						hideLabelFromVision
						label={ __( 'Open and close animation', 'sgs-blocks' ) }
						help={ sprintf(
							/* translators: %s: what Automatic does for the current desktop panel position. */
							__(
								'Automatic follows the panel position (currently: %s). Closing plays it in reverse. Visitors who ask their device to reduce motion see no movement.',
								'sgs-blocks'
							),
							AUTO_LABEL[ anchorDesktop ] || AUTO_LABEL[ 'full-screen' ]
						) }
						value={ ownValue || effectiveValue || 'auto' }
						options={ SHAPE_OPTIONS }
						onChange={ ( value ) => setOwnValue( value || undefined ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				) }
			</ResponsiveOverride>

			<RangeControl
				label={ __( 'Opening time (ms)', 'sgs-blocks' ) }
				value={ entryDuration ?? 250 }
				onChange={ ( value ) => setAttributes( { entryDuration: value ?? 250 } ) }
				min={ 0 }
				max={ 3000 }
				step={ 10 }
				allowReset
				resetFallbackValue={ 250 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<RangeControl
				label={ __( 'Closing time (ms)', 'sgs-blocks' ) }
				value={ exitDuration ?? 200 }
				onChange={ ( value ) => setAttributes( { exitDuration: value ?? 200 } ) }
				min={ 0 }
				max={ 3000 }
				step={ 10 }
				allowReset
				resetFallbackValue={ 200 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<MotionEasingControl
				label={ __( 'Speed curve', 'sgs-blocks' ) }
				value={ entryEasing }
				custom={ entryEasingCustom }
				fallback="ease-out-css"
				onChange={ ( value ) => setAttributes( { entryEasing: value } ) }
				onCustomChange={ ( value ) => setAttributes( { entryEasingCustom: value } ) }
			/>
			<ToggleControl
				label={ __( 'Fade while sliding or wiping', 'sgs-blocks' ) }
				checked={ false !== entryFade }
				onChange={ ( value ) => setAttributes( { entryFade: value } ) }
				__nextHasNoMarginBottom
			/>
			<RangeControl
				label={ __( 'Background dim fade time (ms)', 'sgs-blocks' ) }
				help={ __( '0 fades the dimmed page behind with the drawer.', 'sgs-blocks' ) }
				value={ scrimFadeDuration ?? 0 }
				onChange={ ( value ) => setAttributes( { scrimFadeDuration: value ?? 0 } ) }
				min={ 0 }
				max={ 3000 }
				step={ 10 }
				allowReset
				resetFallbackValue={ 0 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>

			<RangeControl
				label={ __( 'Item stagger (ms between items)', 'sgs-blocks' ) }
				help={ __( 'Menu items arrive one after another. 0 turns this off.', 'sgs-blocks' ) }
				value={ itemStagger ?? 0 }
				onChange={ ( value ) => setAttributes( { itemStagger: value ?? 0 } ) }
				min={ 0 }
				max={ 1000 }
				step={ 5 }
				allowReset
				resetFallbackValue={ 0 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ ( itemStagger ?? 0 ) > 0 && (
				<>
					<ResponsiveOverride
						label={ __( 'Item travel distance (px)', 'sgs-blocks' ) }
						value={ itemStaggerDistance || {} }
						onChange={ ( obj ) => setAttributes( { itemStaggerDistance: obj } ) }
					>
						{ ( { ownValue, effectiveValue, setOwnValue } ) => (
							<RangeControl
								hideLabelFromVision
								label={ __( 'Item travel distance (px)', 'sgs-blocks' ) }
								help={ __( 'Negative values drop items in from above.', 'sgs-blocks' ) }
								value={ ownValue ?? effectiveValue ?? 16 }
								onChange={ ( value ) => setOwnValue( value ?? undefined ) }
								min={ -400 }
								max={ 400 }
								allowReset
								resetFallbackValue={ 16 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
					<RangeControl
						label={ __( 'Item arrival time (ms)', 'sgs-blocks' ) }
						help={ __( '0 uses the opening time.', 'sgs-blocks' ) }
						value={ itemStaggerDuration ?? 0 }
						onChange={ ( value ) => setAttributes( { itemStaggerDuration: value ?? 0 } ) }
						min={ 0 }
						max={ 3000 }
						step={ 10 }
						allowReset
						resetFallbackValue={ 0 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<RangeControl
						label={ __( 'Longest item delay (ms)', 'sgs-blocks' ) }
						help={ __( 'Caps the delay so a long menu does not keep arriving. 0 means no cap.', 'sgs-blocks' ) }
						value={ itemStaggerMax ?? 0 }
						onChange={ ( value ) => setAttributes( { itemStaggerMax: value ?? 0 } ) }
						min={ 0 }
						max={ 3000 }
						step={ 10 }
						allowReset
						resetFallbackValue={ 0 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Items leave one after another on close', 'sgs-blocks' ) }
						checked={ !! itemStaggerOnClose }
						onChange={ ( value ) => setAttributes( { itemStaggerOnClose: value } ) }
						__nextHasNoMarginBottom
					/>
				</>
			) }
		</PanelBody>
	);
}

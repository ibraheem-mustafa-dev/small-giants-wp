/**
 * SGS Nav Drawer Menu (sgs/nav-drawer-menu) — Styles tab: "Section motion".
 * How an accordion section opens and closes: none, fade, fade and lift, height.
 * It runs on the `<details>` element's `::details-content` pseudo-element, which
 * the motion model cannot target, so it keeps its own attributes. Render side:
 * `includes/nav-drawer-menu-section-css.php::sgs_nav_drawer_menu_section_motion`
 * and the end of `style.css`. Accordion mode only: a drill-down section slides
 * in as an overlay and keeps its own motion.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import EasingAtom from '../../components/motion/EasingAtom';
import { PanelBody, RangeControl, SelectControl } from '@wordpress/components';

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {Element} The panel.
 */
export default function SectionMotionPanel( { attributes, setAttributes } ) {
	const {
		submenuAnimation,
		submenuAnimationDuration,
		submenuExitDuration,
		submenuAnimationEasing,
		submenuAnimationEasingCustom,
	} = attributes;
	const animated = !! submenuAnimation && 'none' !== submenuAnimation;

	const range = ( label, key, value, fallback, min, max, step, help ) => (
		<RangeControl
			label={ label }
			help={ help }
			value={ value ?? fallback }
			onChange={ ( next ) => setAttributes( { [ key ]: next ?? fallback } ) }
			min={ min }
			max={ max }
			step={ step }
			allowReset
			resetFallbackValue={ fallback }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>
	);

	return (
		<PanelBody title={ __( 'Section motion', 'sgs-blocks' ) } initialOpen={ false }>
			<SelectControl
				label={ __( 'Open and close animation', 'sgs-blocks' ) }
				help={ __(
					'How an accordion section opens and closes. Off keeps the instant toggle. Drill-down keeps its own slide, and reduced motion always opens whole.',
					'sgs-blocks'
				) }
				value={ submenuAnimation || 'none' }
				options={ [
					{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
					{ label: __( 'Fade', 'sgs-blocks' ), value: 'fade' },
					{ label: __( 'Fade and lift', 'sgs-blocks' ), value: 'fade-lift' },
					{ label: __( 'Height', 'sgs-blocks' ), value: 'height' },
				] }
				onChange={ ( val ) =>
					setAttributes( { submenuAnimation: val || 'none' } )
				}
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ animated && (
				<>
					{ range( __( 'Opening time (ms)', 'sgs-blocks' ), 'submenuAnimationDuration', submenuAnimationDuration, 180, 0, 3000, 10 ) }
					{ range(
						__( 'Closing time (ms)', 'sgs-blocks' ),
						'submenuExitDuration',
						submenuExitDuration,
						150,
						0,
						3000,
						10,
						__( '0 closes instantly.', 'sgs-blocks' )
					) }
					<EasingAtom vocab="nav"
						label={ __( 'Speed curve', 'sgs-blocks' ) }
						value={ submenuAnimationEasing }
						custom={ submenuAnimationEasingCustom }
						fallback="ease-out-css"
						onChange={ ( value ) => setAttributes( { submenuAnimationEasing: value } ) }
						onCustomChange={ ( value ) => setAttributes( { submenuAnimationEasingCustom: value } ) }
					/>
				</>
			) }
		</PanelBody>
	);
}

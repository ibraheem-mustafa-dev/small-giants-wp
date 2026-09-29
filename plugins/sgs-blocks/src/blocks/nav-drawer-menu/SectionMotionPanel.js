/**
 * SGS Nav Drawer Menu (sgs/nav-drawer-menu) — Styles tab: "Section motion".
 * How an accordion section opens and closes, and how its rows arrive. The
 * drawer counterpart of the bar's "Open and close animation" select
 * (DropdownStylePanel) plus its "Panel motion" panel (PanelMotionPanel), with
 * the same attributes and a values list that suits an inline accordion:
 * none, fade, fade and lift, height. Render side:
 * `includes/nav-drawer-menu-section-css.php::sgs_nav_drawer_menu_section_motion`
 * and the end of `style.css`. Accordion mode only: a drill-down section slides
 * in as an overlay and keeps its own motion.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl, SelectControl } from '@wordpress/components';
import { MotionEasingControl } from '../../components';

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
		submenuItemStagger,
		submenuItemStaggerDuration,
		submenuItemStaggerMax,
		submenuItemStaggerDistance,
		submenuItemStaggerScope,
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
					<MotionEasingControl
						label={ __( 'Speed curve', 'sgs-blocks' ) }
						value={ submenuAnimationEasing }
						custom={ submenuAnimationEasingCustom }
						fallback="ease-out-css"
						onChange={ ( value ) => setAttributes( { submenuAnimationEasing: value } ) }
						onCustomChange={ ( value ) => setAttributes( { submenuAnimationEasingCustom: value } ) }
					/>
				</>
			) }
			{ range(
				__( 'Row stagger (ms between rows)', 'sgs-blocks' ),
				'submenuItemStagger',
				submenuItemStagger,
				0,
				0,
				1000,
				1,
				__( 'The rows of a section arrive one after another when it opens. 0 turns this off.', 'sgs-blocks' )
			) }
			{ ( submenuItemStagger ?? 0 ) > 0 && (
				<>
					{ range(
						__( 'Row arrival time (ms)', 'sgs-blocks' ),
						'submenuItemStaggerDuration',
						submenuItemStaggerDuration,
						0,
						0,
						3000,
						10,
						__( '0 uses the opening time.', 'sgs-blocks' )
					) }
					{ range(
						__( 'Longest row delay (ms)', 'sgs-blocks' ),
						'submenuItemStaggerMax',
						submenuItemStaggerMax,
						0,
						0,
						3000,
						10,
						__( '0 means no cap.', 'sgs-blocks' )
					) }
					{ range(
						__( 'Row travel distance (px)', 'sgs-blocks' ),
						'submenuItemStaggerDistance',
						submenuItemStaggerDistance,
						8,
						-400,
						400,
						1,
						__( 'Negative values drop rows in from above.', 'sgs-blocks' )
					) }
					<SelectControl
						label={ __( 'Stagger applies to', 'sgs-blocks' ) }
						value={ submenuItemStaggerScope || 'columns' }
						options={ [
							{
								label: __( 'A section’s rows, or a mega section’s columns', 'sgs-blocks' ),
								value: 'columns',
							},
							{
								label: __( 'Link rows and cards inside each mega column', 'sgs-blocks' ),
								value: 'rows',
							},
						] }
						onChange={ ( value ) =>
							setAttributes( { submenuItemStaggerScope: value || 'columns' } )
						}
						help={ __(
							'A plain section is unaffected either way. "Rows" cascades link by link down each mega column instead of moving whole columns.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</>
			) }
		</PanelBody>
	);
}

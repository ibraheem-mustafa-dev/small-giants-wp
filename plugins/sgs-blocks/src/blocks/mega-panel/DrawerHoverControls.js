/**
 * SGS Mega Panel — the drawer's own hover effects, mounted inside the "In the
 * drawer" panel after the shell controls: the link row's text slide (the number
 * stays put), the trailing arrow's hover colour, the aside card's lift, tilt and
 * link nudge, and one speed and curve for all of them. Render side:
 * `includes/mega-panel-drawer-extras-css.php::sgs_mega_panel_drawer_hover_css()`;
 * canvas twin: `drawer-preview-extras.js::drawerHoverPreviewCss()`.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { RangeControl } from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import EasingAtom from '../../components/motion/EasingAtom';
import SgsResetPanel from '../../components/SgsResetPanel';

/** The four 0-is-off range rows. */
const RANGE_KEYS = [
	'drawerLinkTextShiftHover',
	'drawerCardHoverLift',
	'drawerCardHoverRotate',
	'drawerCardLinkShiftHover',
];

const RESET = {
	drawerLinkTextShiftHover: 0,
	drawerLinkTrailingColourHover: '',
	drawerCardHoverLift: 0,
	drawerCardHoverRotate: 0,
	drawerCardLinkShiftHover: 0,
	drawerHoverDuration: 300,
	drawerHoverEasing: 'ease',
	drawerHoverEasingCustom: '',
};

/**
 * @param {Object}   root0               Props.
 * @param {Object}   root0.attributes    Block attributes.
 * @param {Function} root0.setAttributes The block's attribute setter.
 * @return {Element} The controls.
 */
export default function DrawerHoverControls( { attributes, setAttributes } ) {
	const range = ( key, label, help, min, max, step = 1 ) => (
		<div>
			<RangeControl
				label={ label }
				help={ help }
				value={ attributes[ key ] ?? 0 }
				min={ min }
				max={ max }
				step={ step }
				onChange={ ( value ) =>
					setAttributes( {
						[ key ]: typeof value === 'number' ? value : 0,
					} )
				}
				allowReset
				resetFallbackValue={ 0 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</div>
	);

	return (
		<SgsResetPanel
			title={ __( 'Drawer hover effects', 'sgs-blocks' ) }
			items={ [
				...RANGE_KEYS.map( ( key ) => ( {
					hasValue: () => 0 !== ( attributes[ key ] ?? 0 ),
					onDeselect: () => setAttributes( { [ key ]: 0 } ),
				} ) ),
				{
					hasValue: () => !! attributes.drawerLinkTrailingColourHover,
					onDeselect: () =>
						setAttributes( { drawerLinkTrailingColourHover: '' } ),
				},
				{
					hasValue: () =>
						300 !== ( attributes.drawerHoverDuration ?? 300 ) ||
						'ease' !== ( attributes.drawerHoverEasing || 'ease' ),
					onDeselect: () =>
						setAttributes( {
							drawerHoverDuration: 300,
							drawerHoverEasing: 'ease',
							drawerHoverEasingCustom: '',
						} ),
				},
			] }
			resetAll={ () => setAttributes( RESET ) }
			nested
		>
			{ range(
				'drawerLinkTextShiftHover',
				__( 'Link row text slide (px)', 'sgs-blocks' ),
				__(
					'On hover the label and description slide this far toward the end of the row. The number stays where it is. 0 is off.',
					'sgs-blocks'
				),
				0,
				60
			) }

			<DesignTokenPicker
				label={ __( 'Link row arrow colour on hover', 'sgs-blocks' ) }
				value={ attributes.drawerLinkTrailingColourHover }
				onChange={ ( value ) =>
					setAttributes( {
						drawerLinkTrailingColourHover: value ?? '',
					} )
				}
				linked
			/>

			{ range(
				'drawerCardHoverLift',
				__( 'Side card lift (px)', 'sgs-blocks' ),
				__(
					'On hover the side card rises by this much. 0 is off.',
					'sgs-blocks'
				),
				0,
				40
			) }
			{ range(
				'drawerCardHoverRotate',
				__( 'Side card tilt (degrees)', 'sgs-blocks' ),
				__(
					'On hover the side card turns by this much. Negative turns anticlockwise. 0 is off.',
					'sgs-blocks'
				),
				-15,
				15,
				0.5
			) }
			{ range(
				'drawerCardLinkShiftHover',
				__( 'Side card arrow nudge (px)', 'sgs-blocks' ),
				__(
					'On hover the arrow in the side card link moves this far toward the end. 0 is off.',
					'sgs-blocks'
				),
				0,
				40
			) }

			<RangeControl
				label={ __( 'Hover speed (milliseconds)', 'sgs-blocks' ) }
				value={ attributes.drawerHoverDuration ?? 300 }
				min={ 0 }
				max={ 3000 }
				step={ 10 }
				onChange={ ( value ) =>
					setAttributes( {
						drawerHoverDuration:
							typeof value === 'number' ? value : 300,
					} )
				}
				allowReset
				resetFallbackValue={ 300 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<EasingAtom
				vocab="nav"
				label={ __( 'Hover curve', 'sgs-blocks' ) }
				value={ attributes.drawerHoverEasing }
				custom={ attributes.drawerHoverEasingCustom }
				onChange={ ( value ) =>
					setAttributes( { drawerHoverEasing: value } )
				}
				onCustomChange={ ( value ) =>
					setAttributes( { drawerHoverEasingCustom: value } )
				}
			/>
		</SgsResetPanel>
	);
}

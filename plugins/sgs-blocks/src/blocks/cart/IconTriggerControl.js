import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl } from '@wordpress/components';
import { ResponsiveControl, SgsLengthControl } from '../../components';
import { resolveTier, patchTier } from '../../utils';

// Same shape as the pill's radius: one CSS length for the whole button, in px or %.
const RADIUS_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: '%', label: '%', default: 0 },
];

/**
 * SGS Cart: the icon button's own corner radius and square size. Icon tiers only.
 *
 * @param {Object}   root0                   Props.
 * @param {boolean}  root0.hasIconTier       Whether any breakpoint shows the icon trigger.
 * @param {string}   root0.iconTriggerRadius CSS length for the button's corners.
 * @param {Object}   root0.iconTriggerSize   `{desktop,tablet,mobile}` of px.
 * @param {Function} root0.setAttributes     The block's attribute setter.
 */
export default function IconTriggerControl( { hasIconTier, iconTriggerRadius, iconTriggerSize, setAttributes } ) {
	if ( ! hasIconTier ) {
		return null;
	}
	return (
		<PanelBody title={ __( 'Icon button', 'sgs-blocks' ) } initialOpen={ false }>
			<SgsLengthControl
				label={ __( 'Button radius', 'sgs-blocks' ) }
				value={ iconTriggerRadius || '' }
				units={ RADIUS_UNITS }
				onChange={ ( val ) => setAttributes( { iconTriggerRadius: val ?? '' } ) }
				help={ __( 'Icon button only. Leave blank for the default corners; 999px makes it round.', 'sgs-blocks' ) }
				presets={ false }
			/>
			<ResponsiveControl
				label={ __( 'Button size (px)', 'sgs-blocks' ) }
				value={ iconTriggerSize }
				isInherited={ ( tier ) => resolveTier( iconTriggerSize, tier, null ).inherited }
				resolvedValue={ ( tier ) => ( null === resolveTier( iconTriggerSize, tier, null ).value ? __( 'default tap area', 'sgs-blocks' ) : `${ resolveTier( iconTriggerSize, tier, null ).value }px` ) }
				onReset={ ( tier ) => patchTier( { iconTriggerSize }, setAttributes, 'iconTriggerSize', tier, null ) }
			>
				{ ( tier ) => (
					<RangeControl
						label={ __( 'Button size (px)', 'sgs-blocks' ) }
						hideLabelFromVision
						value={ resolveTier( iconTriggerSize, tier, null ).value ?? undefined }
						onChange={ ( val ) => patchTier( { iconTriggerSize }, setAttributes, 'iconTriggerSize', tier, val ?? null ) }
						min={ 24 }
						max={ 96 }
						allowReset
						help={ __( 'Icon button only: a square size that replaces the 44px tap area at this device. It never goes below 24px.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				) }
			</ResponsiveControl>
		</PanelBody>
	);
}

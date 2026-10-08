/**
 * Gallery settings-tab Layout panel: layout mode, per-device columns and image aspect ratio.
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, RadioControl, RangeControl, SelectControl } from '@wordpress/components';
import ResponsiveOverride from '../../../components/ResponsiveOverride';
import { LAYOUT_OPTIONS, ASPECT_RATIO_OPTIONS } from './constants';

export default function LayoutSettingsPanel( { attributes, setAttributes, set } ) {
	const { layout, columns, aspectRatio } = attributes;

	return (
		<>
				{ /* Panel 2: Layout */ }
				<PanelBody
					title={ __( 'Layout', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<RadioControl
						label={ __( 'Layout', 'sgs-blocks' ) }
						selected={ layout }
						options={ LAYOUT_OPTIONS }
						onChange={ set( 'layout' ) }
					/>
					{ /*
						  columns is a TIER OBJECT — ONE attr holding
						  {desktop,tablet,mobile} (Spec 35 pass 4). It must
						  therefore use ResponsiveOverride, which reads and
						  writes the object, NOT ResponsiveControl, which
						  writes one flat attr per tier.

						  ⛔ Do NOT revert this to `ResponsiveControl` + an
						  attrMap of `{desktop:'columns',
						  tablet:'columnsTablet', mobile:'columnsMobile'}`.
						  `columnsTablet`/`columnsMobile` are no longer
						  declared by block.json, and WordPress SILENTLY
						  DISCARDS an attribute a block does not declare
						  (D338) — so both tiers would save nothing. The
						  desktop branch would be worse: it would write a
						  NUMBER into an attr declared `"type":"object"`,
						  which coerces to the default and drops the whole
						  setting (D563's gap regression, same bug class).
					*/ }
					<ResponsiveOverride
						label={ __( 'Columns', 'sgs-blocks' ) }
						value={ columns }
						onChange={ ( obj ) => setAttributes( { columns: obj } ) }
					>
						{ ( { tier, ownValue, effectiveValue, setOwnValue } ) => (
							<RangeControl
								label={ __( 'Columns', 'sgs-blocks' ) }
								hideLabelFromVision
								value={
									ownValue !== ''
										? ownValue
										: ( effectiveValue !== '' ? effectiveValue : ( tier === 'mobile' ? 1 : 3 ) )
								}
								onChange={ setOwnValue }
								min={ 1 }
								max={ 6 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
					<SelectControl
						label={ __( 'Image aspect ratio', 'sgs-blocks' ) }
						value={ aspectRatio }
						options={ ASPECT_RATIO_OPTIONS }
						onChange={ set( 'aspectRatio' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
		</>
	);
}

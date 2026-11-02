/**
 * Gallery settings-tab Layout panel: layout mode, per-device columns and image aspect ratio.
 */
import { __ } from '@wordpress/i18n';
import { Notice, PanelBody, RangeControl, SelectControl } from '@wordpress/components';
import ResponsiveOverride from '../../../components/ResponsiveOverride';
import ResponsiveLengthControl from '../../../components/ResponsiveLengthControl';
import { galleryLayoutTiers } from '../layout-tiers';
import { LAYOUT_OPTIONS, ASPECT_RATIO_OPTIONS } from './gallery-options';

export default function LayoutSettingsPanel( { attributes, setAttributes, set } ) {
	const { layout, columns, aspectRatio, scrollItemWidth, scrollInset } = attributes;
	const layoutTiers = galleryLayoutTiers( layout );

	return (
		<>
				{ /* Panel 2: Layout */ }
				<PanelBody
					title={ __( 'Layout', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /* The layout is a TIER OBJECT ({desktop,tablet,mobile}); an empty tier inherits
					       the one above and the desktop default is a grid. */ }
					<ResponsiveOverride
						label={ __( 'Layout', 'sgs-blocks' ) }
						value={ layout }
						onChange={ ( obj ) => setAttributes( { layout: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								label={ __( 'Layout', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ ownValue }
								options={ [
									{
										label:
											tier === 'desktop'
												? __( 'Grid (default)', 'sgs-blocks' )
												: __( 'Same as the larger screen', 'sgs-blocks' ),
										value: '',
									},
									...LAYOUT_OPTIONS,
								] }
								onChange={ setOwnValue }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
					{ layoutTiers.rewritten && (
						<Notice status="warning" isDismissible={ false }>
							{ __( "A carousel can't change by screen size; this tier is a swipe row", 'sgs-blocks' ) }
						</Notice>
					) }
					{ layoutTiers.scroll && (
						<>
							<ResponsiveLengthControl
								label={ __( 'Card width in swipe row', 'sgs-blocks' ) }
								help={ __( "Leave empty for one column's width; e.g. 78% shows a peek of the next card", 'sgs-blocks' ) }
								value={ scrollItemWidth }
								onChange={ ( obj ) => setAttributes( { scrollItemWidth: obj } ) }
								units={ [
									{ value: '%', label: '%', default: 78 },
									{ value: 'px', label: 'px', default: 240 },
								] }
							/>
							<ResponsiveLengthControl
								label={ __( 'Row edge padding', 'sgs-blocks' ) }
								help={ __( 'Lets cards run to the screen edge while the first card lines up with your page content', 'sgs-blocks' ) }
								value={ scrollInset }
								onChange={ ( obj ) => setAttributes( { scrollInset: obj } ) }
							/>
						</>
					) }
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

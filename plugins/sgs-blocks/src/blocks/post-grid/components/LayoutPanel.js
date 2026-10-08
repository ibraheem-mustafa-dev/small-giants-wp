/**
 * Post Grid — Layout inspector panel.
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl, RadioControl } from '@wordpress/components';
import ResponsiveOverride from '../../../components/ResponsiveOverride';
import { LAYOUT_OPTIONS } from './constants';

export default function LayoutPanel( { attributes, setAttributes, set } ) {
	const {
		layout,
		columns,
	} = attributes;

	return (
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
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
						  Those siblings are no longer declared by block.json
						  (D338 silent-discard), and a raw number written to
						  `columns` itself coerces the object-typed attr to
						  its default, dropping the whole setting (D563 bug
						  class).
					*/ }
					<ResponsiveOverride
						label={ __( 'Columns', 'sgs-blocks' ) }
						value={ columns }
						onChange={ ( obj ) => setAttributes( { columns: obj } ) }
					>
						{ ( { tier, ownValue, effectiveValue, setOwnValue } ) => {
							return (
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
							);
						} }
					</ResponsiveOverride>
					{ /* Gap is provided by the shared ContainerWrapperControls panel below. */ }
				</PanelBody>
	);
}

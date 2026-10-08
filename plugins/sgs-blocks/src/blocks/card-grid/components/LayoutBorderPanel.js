/**
 * Card Grid — Layout panel: grid border width, style, colour and radius.
 */

import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { SgsBorderControl } from '../../../components';

export default function LayoutBorderPanel( { attributes, setAttributes } ) {
	return (
		<>
				{ /* GRID element (wrapper) — border/radius resolve to the same
				   TIER-2 "Layout" property family as ContainerWrapperControls'
				   grid/gap/width controls above (block.json attrMap:
				   css:border-* → borderWidth/Style/Colour/Radius, all declared
				   on the `grid` element's `layout` cluster). Titled "Layout" so
				   it reads as the grid wrapper's Layout family rather than a
				   generic catch-all "Border" panel. */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ attributes.borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ attributes.borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourValue={ attributes.borderColour }
						onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
						colourGradientValue={ attributes.borderColourGradient }
						onColourGradientChange={ ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) }
						colourLinked={ true }
						radiusValues={ {
								base: attributes.borderRadius?.desktop ?? {},
								tablet: attributes.borderRadius?.tablet ?? {},
								mobile: attributes.borderRadius?.mobile ?? {},
							} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( { borderRadius: { ...attributes.borderRadius, [ key ]: next } } );
						} }
					/>
				</PanelBody>
		</>
	);
}

import { PanelBody, ToolsPanel, ToolsPanelItem, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

// Same title on PanelBody and the nested ToolsPanel, no
// sgs-nested-tools-panel marker — must FLAG (mirrors the live
// image-sequence/product-card gap).
export default function Edit( { attributes, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Responsive frame sources', 'sgs-blocks' ) } initialOpen={ false }>
			<ToolsPanel
				label={ __( 'Responsive frame sources', 'sgs-blocks' ) }
				resetAll={ () => setAttributes( { tabletFramesUrl: '' } ) }
			>
				<ToolsPanelItem
					label={ __( 'Tablet frames URL', 'sgs-blocks' ) }
					hasValue={ () => !! attributes.tabletFramesUrl }
					onDeselect={ () => setAttributes( { tabletFramesUrl: '' } ) }
				>
					<TextControl
						label={ __( 'Tablet frames URL', 'sgs-blocks' ) }
						value={ attributes.tabletFramesUrl }
						onChange={ ( v ) => setAttributes( { tabletFramesUrl: v } ) }
					/>
				</ToolsPanelItem>
			</ToolsPanel>
		</PanelBody>
	);
}

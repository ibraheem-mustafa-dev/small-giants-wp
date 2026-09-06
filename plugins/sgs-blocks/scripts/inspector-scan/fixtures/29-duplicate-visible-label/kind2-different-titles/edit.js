import { PanelBody, ToolsPanel, ToolsPanelItem, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

// Titles genuinely differ — the ToolsPanel legitimately covers a narrower
// scope than the PanelBody. Must NOT flag.
export default function Edit( { attributes, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Content', 'sgs-blocks' ) } initialOpen={ false }>
			<ToolsPanel
				label={ __( 'Advanced content options', 'sgs-blocks' ) }
				resetAll={ () => setAttributes( { heading: '' } ) }
			>
				<ToolsPanelItem
					label={ __( 'Heading', 'sgs-blocks' ) }
					hasValue={ () => !! attributes.heading }
					onDeselect={ () => setAttributes( { heading: '' } ) }
				>
					<TextControl
						label={ __( 'Heading', 'sgs-blocks' ) }
						value={ attributes.heading }
						onChange={ ( v ) => setAttributes( { heading: v } ) }
					/>
				</ToolsPanelItem>
			</ToolsPanel>
		</PanelBody>
	);
}

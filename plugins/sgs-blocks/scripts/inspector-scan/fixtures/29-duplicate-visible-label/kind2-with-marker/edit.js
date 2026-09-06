import { PanelBody, ToolsPanel, ToolsPanelItem, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

// Same title, but the sgs-nested-tools-panel marker is present — this pair is
// already fixed and its ongoing durability is rule 28's job, not this rule's.
// Must NOT flag.
export default function Edit( { attributes, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
			<ToolsPanel
				className="sgs-nested-tools-panel"
				label={ __( 'Typography', 'sgs-blocks' ) }
				resetAll={ () => setAttributes( { fontSize: '' } ) }
			>
				<ToolsPanelItem
					label={ __( 'Font size', 'sgs-blocks' ) }
					hasValue={ () => !! attributes.fontSize }
					onDeselect={ () => setAttributes( { fontSize: '' } ) }
				>
					<TextControl
						label={ __( 'Font size', 'sgs-blocks' ) }
						value={ attributes.fontSize }
						onChange={ ( v ) => setAttributes( { fontSize: v } ) }
					/>
				</ToolsPanelItem>
			</ToolsPanel>
		</PanelBody>
	);
}

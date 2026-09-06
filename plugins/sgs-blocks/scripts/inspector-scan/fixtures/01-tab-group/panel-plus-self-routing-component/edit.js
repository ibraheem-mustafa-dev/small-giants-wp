import { PanelBody, TextControl } from '@wordpress/components';
import { SgsColourPanel } from '../../../../../src/components';

// NEGATIVE CONTROL: a content-only PanelBody (no group prop of its own) plus
// a shared component (SgsColourPanel) that self-routes to group="styles"
// internally, in its own file. Must NOT be flagged — the block's own file
// carries no literal group= string, but is still fully routed.
export default function Edit( { attributes, setAttributes } ) {
	return (
		<>
			<PanelBody title="Aside">
				<TextControl label="Label" value="" onChange={ () => {} } />
			</PanelBody>
			<SgsColourPanel
				attrs={ [] }
				attributes={ attributes }
				setAttributes={ setAttributes }
				rows={ [] }
			/>
		</>
	);
}

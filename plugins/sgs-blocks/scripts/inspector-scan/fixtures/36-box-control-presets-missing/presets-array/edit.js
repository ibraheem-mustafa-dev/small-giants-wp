import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import ResponsiveBoxControl from '../../../src/components/ResponsiveBoxControl';

// Mirrors container/edit.js:714 — the border-width restricted-scale array. Must not flag.
export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<PanelBody title="Border">
				<ResponsiveBoxControl
					label="Border width"
					presets={ [ 'XXS', 'XS', 'S' ] }
					values={ { base: attributes.borderWidth ?? {} } }
					showResponsive={ false }
					onChange={ ( _tier, next ) => setAttributes( { borderWidth: next } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}

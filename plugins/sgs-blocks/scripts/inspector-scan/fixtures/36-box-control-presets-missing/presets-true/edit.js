import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import ResponsiveBoxControl from '../../../src/components/ResponsiveBoxControl';

// Mirrors container/edit.js:613 — bare boolean shorthand `presets`. Must not flag.
export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<PanelBody title="Spacing">
				<ResponsiveBoxControl
					label="Padding"
					presets
					values={ {
						base: attributes.padding ?? {},
						tablet: attributes.paddingTablet ?? {},
						mobile: attributes.paddingMobile ?? {},
					} }
					onChange={ ( tier, next ) => {
						const attrFor = { base: 'padding', tablet: 'paddingTablet', mobile: 'paddingMobile' };
						setAttributes( { [ attrFor[ tier ] ]: next } );
					} }
				/>
			</PanelBody>
		</InspectorControls>
	);
}

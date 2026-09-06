import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import ResponsiveBoxControl from '../../../src/components/ResponsiveBoxControl';

// Mirrors the pre-rollout shape of e.g. multi-button/edit.js:275 — a real
// ResponsiveBoxControl mount with NO presets prop at all. Must flag.
export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<PanelBody title="Spacing">
				<ResponsiveBoxControl
					label="Padding"
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

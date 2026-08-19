import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, BoxControl } from '@wordpress/components';
import { ResponsiveOverride } from '../../components';

// Mirrors the live container/edit.js:381-395 + cta-section/edit.js:398-412 +
// hero/edit.js:1463-1477 shape: contentBandPadding is object-typed
// ({desktop,tablet,mobile}), so Spec 35 §12 field 3 row 2 mandates
// <ResponsiveOverride> wrapping a PLAIN <BoxControl> — ResponsiveOverride
// owns the tier cascade and hands the active tier's flat value down. This is
// the canonical shape the rule must NOT flag.
export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls group="styles">
			<PanelBody title="Content band">
				<ResponsiveOverride
					label="Content band padding"
					value={ attributes.contentBandPadding }
					onChange={ ( next ) => setAttributes( { contentBandPadding: next } ) }
				>
					{ ( ownValue, setOwnValue ) => (
						<BoxControl
							label="Padding"
							values={ ownValue ?? {} }
							onChange={ ( next ) => setOwnValue( next ) }
							__next40pxDefaultSize
						/>
					) }
				</ResponsiveOverride>
			</PanelBody>
		</InspectorControls>
	);
}

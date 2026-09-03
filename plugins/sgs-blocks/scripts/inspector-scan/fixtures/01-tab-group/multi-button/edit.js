import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';

// NEGATIVE CONTROL for the mixed-panel exemption (2026-09-03): folder name
// matches the REAL block slug 'sgs/multi-button' so the DB lookup resolves
// against real, already-verified sgs-framework.db rows -- flexDirection/gap/
// flexWrap are ALL real CSS (flex-direction/gap/flex-wrap), split across two
// panels, and NEITHER panel carries a structural/behavioural anchor control.
// Under the new exemption logic neither panel qualifies, so this must stay
// flagged exactly as it would have under the old rule -- proving the
// exemption does not over-match a genuinely all-CSS block.
export default function Edit( { attributes, setAttributes } ) {
	const { flexDirection, gap, flexWrap } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Layout" initialOpen={ true }>
				<SelectControl
					label="Direction"
					value={ flexDirection }
					options={ [
						{ label: 'Row', value: 'row' },
						{ label: 'Column', value: 'column' },
					] }
					onChange={ ( value ) => setAttributes( { flexDirection: value } ) }
				/>
				<SelectControl
					label="Gap"
					value={ gap }
					options={ [
						{ label: 'Small', value: 'small' },
						{ label: 'Large', value: 'large' },
					] }
					onChange={ ( value ) => setAttributes( { gap: value } ) }
				/>
			</PanelBody>
			<PanelBody title="Wrap" initialOpen={ false }>
				<SelectControl
					label="Wrap"
					value={ flexWrap }
					options={ [
						{ label: 'Wrap', value: 'wrap' },
						{ label: 'No wrap', value: 'nowrap' },
					] }
					onChange={ ( value ) => setAttributes( { flexWrap: value } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}

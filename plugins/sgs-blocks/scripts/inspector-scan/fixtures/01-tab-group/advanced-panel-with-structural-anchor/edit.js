import { InspectorControls, InspectorAdvancedControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, SelectControl } from '@wordpress/components';

// Covers the InspectorAdvancedControls x structural-anchor interaction
// (2026-09-03 review finding): the "Hidden Advanced" panel below carries a
// 'variant' control -- shaped exactly like the structural/behavioural anchor
// vocabulary the mixed-panel exemption looks for -- but lives INSIDE
// InspectorAdvancedControls. It must be excluded from BOTH panelCount and the
// exempt-panel candidate list before either is ever computed (advancedAncestor()
// mirrors the pre-existing ADVANCED_SPAN_RE/textOutsideAdvanced exclusion that
// already fed panelCount). The two OUTSIDE panels ("Behaviour"/"Appearance")
// carry no structural anchor of their own (synthetic slug -> no DB row -> safe
// default), so this fixture must stay flagged on exactly those 2 panels,
// never 3 -- proving the Advanced panel was never counted at all, not merely
// exempted after being counted.
export default function Edit( { attributes, setAttributes } ) {
	const { labelText, iconColour, variant } = attributes;
	return (
		<>
			<InspectorControls>
				<PanelBody title="Behaviour" initialOpen={ true }>
					<TextControl
						label="Label"
						value={ labelText }
						onChange={ ( value ) => setAttributes( { labelText: value } ) }
					/>
				</PanelBody>
				<PanelBody title="Appearance" initialOpen={ false }>
					<TextControl
						label="Icon colour"
						value={ iconColour }
						onChange={ ( value ) => setAttributes( { iconColour: value } ) }
					/>
				</PanelBody>
			</InspectorControls>
			<InspectorAdvancedControls>
				<PanelBody title="Hidden Advanced" initialOpen={ false }>
					<SelectControl
						label="Variant"
						value={ variant }
						options={ [
							{ label: 'Default', value: 'default' },
							{ label: 'Alternate', value: 'alternate' },
						] }
						onChange={ ( value ) => setAttributes( { variant: value } ) }
					/>
				</PanelBody>
			</InspectorAdvancedControls>
		</>
	);
}

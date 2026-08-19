import { InspectorControls } from '@wordpress/block-editor';
import { SgsColourPanel } from '../../components';

// Mirrors the live sgs/tabs edit.js:176-199 shape — the ONLY 3-state colour
// row in the library (golden-controls.json controls.colour.states.
// referenceImplementations.threeState). The row's normal state binds to
// `tabColour`, which this fixture's block.json maps (via supports.sgs.
// elements.tab.attrMap) to an element declaring hover + selected states —
// so the derived required count is 1 + 2 = 3, and this row supplies exactly
// 3 states. Proves the derivation reads block.json, not just a flat floor.
export default function Edit( { attributes, setAttributes } ) {
	const {
		tabColour,
		tabColourGradient,
		tabColourHover,
		tabColourHoverGradient,
		tabColourSelected,
		tabColourSelectedGradient,
	} = attributes;
	return (
		<InspectorControls group="styles">
			<SgsColourPanel
				rows={ [
					{
						key: 'tab',
						label: 'Tab colour',
						states: [
							{
								key: 'normal',
								label: 'Normal',
								value: tabColour,
								onChange: ( val ) => setAttributes( { tabColour: val ?? '' } ),
								gradientValue: tabColourGradient,
								onGradientChange: ( val ) => setAttributes( { tabColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: 'Hover',
								value: tabColourHover,
								onChange: ( val ) => setAttributes( { tabColourHover: val ?? '' } ),
								gradientValue: tabColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { tabColourHoverGradient: val ?? '' } ),
							},
							{
								key: 'selected',
								label: 'Selected',
								value: tabColourSelected,
								onChange: ( val ) => setAttributes( { tabColourSelected: val ?? '' } ),
								gradientValue: tabColourSelectedGradient,
								onGradientChange: ( val ) =>
									setAttributes( { tabColourSelectedGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
		</InspectorControls>
	);
}

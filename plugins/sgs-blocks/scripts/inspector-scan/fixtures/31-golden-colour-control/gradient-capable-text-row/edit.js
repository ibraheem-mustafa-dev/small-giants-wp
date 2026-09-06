import { InspectorControls } from '@wordpress/block-editor';
import { SgsColourPanel } from '../../components';

// Mirrors the live sgs/text edit.js:392/459-shaped rows: gradientCapable:true
// at the ROW level routes text colour through GradientCapableColourControl
// (background-clip:text needs a different mechanism from a background/
// border gradient) — golden-controls.json controls.colour.canonical.
// textGradientRow. No per-state gradientValue/onGradientChange is needed or
// present; gradientCapable alone satisfies the gradient requirement.
export default function Edit( { attributes, setAttributes } ) {
	const { textColour, textColourHover } = attributes;
	return (
		<InspectorControls group="styles">
			<SgsColourPanel
				rows={ [
					{
						key: 'text',
						label: 'Text colour',
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: 'Normal',
								value: textColour,
								onChange: ( val ) => setAttributes( { textColour: val ?? '' } ),
							},
							{
								key: 'hover',
								label: 'Hover',
								value: textColourHover,
								onChange: ( val ) => setAttributes( { textColourHover: val ?? '' } ),
							},
						],
					},
				] }
			/>
		</InspectorControls>
	);
}

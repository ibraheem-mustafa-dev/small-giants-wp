import { InspectorControls } from '@wordpress/block-editor';
import { SgsColourPanel } from '../../components';

// golden-controls.json controls.colour.gradient.exemption.expectedFirstExemption:
// "shadow colour — a box-shadow colour has no gradient form; a gradient
// control there would produce invalid CSS." This row's key ("shadow") is
// declared at block.json supports.sgs.colourExemptions.shadow with a real
// (>=12 char, non-boilerplate) reason, so the missing gradient path here is
// data, not a defect.
export default function Edit( { attributes, setAttributes } ) {
	const { shadowColour, shadowColourHover } = attributes;
	return (
		<InspectorControls group="styles">
			<SgsColourPanel
				rows={ [
					{
						key: 'shadow',
						label: 'Shadow colour',
						states: [
							{
								key: 'normal',
								label: 'Normal',
								value: shadowColour,
								onChange: ( val ) => setAttributes( { shadowColour: val ?? '' } ),
							},
							{
								key: 'hover',
								label: 'Hover',
								value: shadowColourHover,
								onChange: ( val ) => setAttributes( { shadowColourHover: val ?? '' } ),
							},
						],
					},
				] }
			/>
		</InspectorControls>
	);
}

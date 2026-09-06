import { InspectorControls } from '@wordpress/block-editor';
import { SgsColourPanel } from '../../components';

// Mirrors the live sgs/button edit.js:400-424 shape exactly — the reference
// implementation named in golden-controls.json controls.colour.states.
// referenceImplementations.twoState. Two states, both gradient-capable.
export default function Edit( { attributes, setAttributes } ) {
	const {
		colourBackground,
		colourBackgroundGradient,
		colourBackgroundHover,
		colourBackgroundHoverGradient,
	} = attributes;
	return (
		<InspectorControls group="styles">
			<SgsColourPanel
				rows={ [
					{
						key: 'background',
						label: 'Background colour',
						states: [
							{
								key: 'normal',
								label: 'Normal',
								value: colourBackground,
								onChange: ( val ) => setAttributes( { colourBackground: val ?? '' } ),
								gradientValue: colourBackgroundGradient,
								onGradientChange: ( val ) =>
									setAttributes( { colourBackgroundGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: 'Hover',
								value: colourBackgroundHover,
								onChange: ( val ) => setAttributes( { colourBackgroundHover: val ?? '' } ),
								gradientValue: colourBackgroundHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { colourBackgroundHoverGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
		</InspectorControls>
	);
}

import { InspectorControls } from '@wordpress/block-editor';
import { SgsColourPanel } from '../../components';

// OVER-MATCH CONTROL for the sole-declared-state exemption.
//
// Byte-for-byte the shape of 'sole-declared-state-row' apart from the state
// KEY, which here is not in golden-controls.json's _meta.stateVocabulary.real
// (hover / current / scrolled). A typo'd or invented state name must NOT buy
// silent exemption from the 2-state floor — otherwise the exemption becomes a
// way to switch the rule off by misspelling a word, and the floor stops
// meaning anything.
//
// Must FLAG below-min-states.
export default function Edit( { attributes, setAttributes } ) {
	const { textColour, textColourGradient } = attributes;
	return (
		<InspectorControls group="styles">
			<SgsColourPanel
				rows={ [
					{
						key: 'text',
						label: 'Text colour',
						states: [
							{
								key: 'wobble',
								label: 'Wobble',
								value: textColour,
								onChange: ( val ) => setAttributes( { textColour: val ?? '' } ),
								gradientValue: textColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { textColourGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
		</InspectorControls>
	);
}

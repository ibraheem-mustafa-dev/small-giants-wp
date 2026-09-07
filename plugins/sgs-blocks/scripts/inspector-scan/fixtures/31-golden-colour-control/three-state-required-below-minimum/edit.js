import { InspectorControls } from '@wordpress/block-editor';
import { SgsColourPanel } from '../../components';

// NEGATIVE CONTROL for the 2026-09-07 narrowing (Bean's ruling) — proves the
// below-min-states check can still fail after being narrowed to fire only
// when `required > 2`. Byte-identical block.json element manifest to
// 'three-state-required-by-element' (mustNotFlag), which derives a required
// count of 3 (1 + hover + selected) — but THIS row supplies only 2 states
// (normal + hover), never wiring 'selected' at all. classify-end-shape.js's
// own needsHover computation is `statesCount < 2`, so this row's 2 states
// would read as satisfied there — the census cannot see that the block's OWN
// element manifest demands a third. That gap is the entire reason this check
// still exists.
export default function Edit( { attributes, setAttributes } ) {
	const { tabColour, tabColourGradient, tabColourHover, tabColourHoverGradient } = attributes;
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
						],
					},
				] }
			/>
		</InspectorControls>
	);
}

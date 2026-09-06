import { InspectorControls } from '@wordpress/block-editor';
import { SgsColourPanel } from '../../components';

// Two states satisfy the state-count floor, but neither state carries
// gradientValue/onGradientChange and the row has no gradientCapable flag —
// golden-controls.json controls.colour.gradient (required, with declared
// exemptions) is violated with no exemption present.
export default function Edit( { attributes, setAttributes } ) {
	const { borderColour, borderColourHover } = attributes;
	return (
		<InspectorControls group="styles">
			<SgsColourPanel
				rows={ [
					{
						key: 'border',
						label: 'Border colour',
						states: [
							{
								key: 'normal',
								label: 'Normal',
								value: borderColour,
								onChange: ( val ) => setAttributes( { borderColour: val ?? '' } ),
							},
							{
								key: 'hover',
								label: 'Hover',
								value: borderColourHover,
								onChange: ( val ) => setAttributes( { borderColourHover: val ?? '' } ),
							},
						],
					},
				] }
			/>
		</InspectorControls>
	);
}

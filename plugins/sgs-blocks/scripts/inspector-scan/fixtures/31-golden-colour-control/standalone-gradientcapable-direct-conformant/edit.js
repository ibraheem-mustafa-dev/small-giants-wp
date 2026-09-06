import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { GradientCapableColourControl } from '../../components';

// Mirrors sgs/card-grid edit.js:476-497 EXACTLY: <GradientCapableColourControl>
// mounted DIRECTLY (never through SgsColourPanel), with an inline literal
// states array carrying a gradient path on the normal state. Before this fix
// the standalone branch recognised ONLY the literal tag name
// 'DesignTokenPicker' — a direct GradientCapableColourControl mount was
// invisible to this rule ENTIRELY (worse than a false positive). Must NOT
// flag: 2 states, gradient present, and — because the tag name itself is
// GradientCapableColourControl — gradientCapable correctly resolves to true,
// satisfying the 'text' mechanism (seeded in _css-property-map.json).
export default function Edit( { attributes, setAttributes } ) {
	const { titleColour, titleColourGradient, titleColourHover } = attributes;
	return (
		<InspectorControls group="styles">
			<PanelBody title="Title">
				<GradientCapableColourControl
					label="Title colour"
					states={ [
						{
							key: 'normal',
							label: 'Normal',
							value: titleColour,
							onChange: ( val ) => setAttributes( { titleColour: val ?? '' } ),
							gradientValue: titleColourGradient,
							onGradientChange: ( val ) =>
								setAttributes( { titleColourGradient: val ?? '' } ),
						},
						{
							key: 'hover',
							label: 'Hover',
							value: titleColourHover,
							onChange: ( val ) => setAttributes( { titleColourHover: val ?? '' } ),
						},
					] }
				/>
			</PanelBody>
		</InspectorControls>
	);
}

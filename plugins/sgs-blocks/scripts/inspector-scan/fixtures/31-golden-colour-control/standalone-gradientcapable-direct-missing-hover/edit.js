import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { GradientCapableColourControl } from '../../components';

// NEGATIVE CONTROL for standalone-gradientcapable-direct-conformant —
// byte-identical shape, genuinely 1 state only (no hover). Must STILL flag
// row-below-minimum-states: if it stops flagging, widening the standalone
// branch to recognise GradientCapableColourControl has over-matched into a
// blanket exemption for every direct mount of that control.
export default function Edit( { attributes, setAttributes } ) {
	const { titleColour, titleColourGradient } = attributes;
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
					] }
				/>
			</PanelBody>
		</InspectorControls>
	);
}

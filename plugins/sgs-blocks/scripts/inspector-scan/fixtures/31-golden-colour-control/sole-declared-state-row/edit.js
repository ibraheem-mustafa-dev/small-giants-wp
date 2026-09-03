import { InspectorControls } from '@wordpress/block-editor';
import { SgsColourPanel } from '../../components';

// The shape measured on 9 real rows across 7 blocks, 2026-09-03: a row that IS
// a single named state rather than a row that forgot its hover. Mirrors
// sgs/testimonial's real "Border colour (hover)" row — the RESTING half
// (borderColour) is owned by SgsBorderControl, a different component rule 31
// cannot see.
//
// ⛔ Adding a 'normal' state here would give this panel write-access to an
// attribute SgsBorderControl already writes — the duplicate-writer defect, so
// the "fix" would be the bug. Hence must NOT flag.
//
// Pairs with the mustFlag fixture 'sole-unknown-state-row': identical shape,
// one state KEY apart, proving this matches without over-matching.
export default function Edit( { attributes, setAttributes } ) {
	const { borderColourHover, borderColourHoverGradient } = attributes;
	return (
		<InspectorControls group="styles">
			<SgsColourPanel
				rows={ [
					{
						key: 'border',
						label: 'Border colour (hover)',
						states: [
							{
								key: 'hover',
								label: 'Hover',
								value: borderColourHover,
								onChange: ( val ) => setAttributes( { borderColourHover: val ?? '' } ),
								gradientValue: borderColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { borderColourHoverGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
		</InspectorControls>
	);
}

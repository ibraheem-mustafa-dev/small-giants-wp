import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

// Spec 43 §2/§9 (Phase 2) — sgs/choice-flow only ever contains sgs/form-step
// children, reused unchanged as an inert step marker (FR-43-9). This mirrors
// sgs/form/edit.js's pattern (allowedBlocks restricted to a fixed roster, a
// starter template on first insert) but with a NARROWER roster: sgs/form
// also allows field blocks directly as top-level children; choice-flow does
// not — every step's own content (question/options/fields) lives INSIDE the
// sgs/form-step, built by the sibling sgs/choice-flow-question and
// sgs/choice-flow-result blocks (built in parallel, not part of this file).
const ALLOWED_BLOCKS = [ 'sgs/form-step' ];

// Two starter steps so a freshly-inserted flow isn't empty — the smallest
// non-trivial branching shape (a question step routing into a second step).
// templateLock left unset (== false) so steps can be freely added/removed,
// matching sgs/form's own multi-step editing experience.
const TEMPLATE = [
	[ 'sgs/form-step', { label: __( 'Step 1', 'sgs-blocks' ) } ],
	[ 'sgs/form-step', { label: __( 'Step 2', 'sgs-blocks' ) } ],
];

export default function Edit( { attributes, setAttributes } ) {
	const { title } = attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-choice-flow',
	} );

	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-choice-flow__inner' },
		{
			allowedBlocks: ALLOWED_BLOCKS,
			template: TEMPLATE,
			templateLock: false,
			orientation: 'vertical',
		}
	);

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Choice Flow Settings', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Flow title', 'sgs-blocks' ) }
						value={ title }
						onChange={ ( value ) => setAttributes( { title: value } ) }
						help={ __(
							'Internal label for this flow, shown in the editor and admin lists — not necessarily displayed to visitors.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ title && (
					<p className="sgs-choice-flow__title-preview">
						{ __( 'Flow:', 'sgs-blocks' ) } { title }
					</p>
				) }
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}

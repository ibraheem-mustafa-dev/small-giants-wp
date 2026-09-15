import { __, sprintf } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useMemo } from '@wordpress/element';
import { PanelBody, TextControl, Notice } from '@wordpress/components';

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

// FR-43-2a — same sentinel string choice-flow-question/edit.js and
// choice-flow/view.js already use for "jump to whichever result step is
// reachable". Duplicated here as a plain string constant (no cross-block
// import — these files are siblings, not modules of one another) rather
// than re-derived, so it can never drift from the runtime's own literal.
const TERMINAL_SENTINEL = '__terminal__';

// Symbolic graph node for "resolves via the terminal sentinel" — distinct
// from every real step index (which are non-negative integers), so it can
// never collide with a genuine step position while walking the routing
// graph in validateFlow() below.
const TERMINAL_NODE = 'terminal';

/**
 * Recursively collect every descendant block of `block` (at any depth)
 * whose name matches `blockName`. `getBlocks( flowClientId )` (called by
 * the caller below) already returns each top-level child with its full
 * nested `innerBlocks` tree populated by the block-editor store — no
 * separate `getClientIdsOfDescendants` walk is needed.
 *
 * @param {Object} block     A block object (with `.innerBlocks`).
 * @param {string} blockName Block name to match, e.g. 'sgs/choice-flow-question'.
 * @return {Object[]} Matching descendant block objects, depth-first order.
 */
function findDescendantsByName( block, blockName ) {
	const found = [];
	( block.innerBlocks || [] ).forEach( ( child ) => {
		if ( child.name === blockName ) {
			found.push( child );
		}
		found.push( ...findDescendantsByName( child, blockName ) );
	} );
	return found;
}

/**
 * FR-43-2a — validate every `sgs/choice-flow-question` option's `nextStepId`
 * against this flow's own `sgs/form-step` tree:
 *   1. Dangling reference — a `nextStepId` that isn't `""`, isn't
 *      `"__terminal__"`, and isn't a valid stringified index within
 *      `[0, stepCount)` for THIS flow.
 *   2. Routing cycle / unreachable result — walking the routing graph
 *      (every step's default linear-advance edge to `index + 1`, PLUS
 *      every valid explicit `nextStepId` edge) from step 0 must reach a
 *      step containing an `sgs/choice-flow-result` block. A flow with no
 *      result step anywhere is its own named error, since `"__terminal__"`
 *      can then never resolve to anything (mirrors
 *      `view.js`'s `resolveTerminalStepIndex()`, which returns `-1` in
 *      that case).
 *
 * @param {Object[]} steps Top-level `sgs/form-step` children of this flow,
 *                          in DOM order, each with its full nested
 *                          `innerBlocks` tree already populated.
 * @return {{message: string}[]} Named, human-readable validation errors.
 *                                Empty array = flow is valid, publish is
 *                                unlocked.
 */
function validateFlow( steps ) {
	const errors = [];
	const stepCount = steps.length;
	const hasAnyResultStep = steps.some(
		( step ) => findDescendantsByName( step, 'sgs/choice-flow-result' ).length > 0
	);

	// Build the routing graph while checking for dangling references.
	const edges = steps.map( () => new Set() );

	steps.forEach( ( step, stepIndex ) => {
		// Default linear-advance edge — always present per FR-43-2a's own
		// instruction, independent of whether any option in this step
		// explicitly uses the "" (advance) value.
		if ( stepIndex + 1 < stepCount ) {
			edges[ stepIndex ].add( stepIndex + 1 );
		}

		const questions = findDescendantsByName( step, 'sgs/choice-flow-question' );

		questions.forEach( ( questionBlock ) => {
			const questionText =
				questionBlock.attributes.question ||
				__( '(untitled question)', 'sgs-blocks' );
			const options = questionBlock.attributes.options || [];

			options.forEach( ( option ) => {
				const nextStepId = option.nextStepId || '';
				const optionLabel = option.label || __( '(untitled option)', 'sgs-blocks' );

				if ( '' === nextStepId ) {
					// Advance-to-next-step — already covered by the default
					// edge above; nothing extra to add.
					return;
				}

				if ( TERMINAL_SENTINEL === nextStepId ) {
					edges[ stepIndex ].add( TERMINAL_NODE );
					return;
				}

				// A valid explicit target is a stringified non-negative
				// integer within [0, stepCount). Reject anything else —
				// including non-numeric strings, negative numbers, and
				// floats — as a dangling reference.
				const isValidIndexString = /^\d+$/.test( nextStepId );
				const parsedIndex = isValidIndexString ? parseInt( nextStepId, 10 ) : -1;
				const isValidTarget =
					isValidIndexString && parsedIndex >= 0 && parsedIndex < stepCount;

				if ( ! isValidTarget ) {
					errors.push( {
						message: sprintf(
							/* translators: 1: step number, 2: question text, 3: option label, 4: the invalid target value, 5: total step count. */
							__(
								'Step %1$d, question "%2$s": option "%3$s" routes to step "%4$s", which does not exist in this flow (this flow has %5$d step(s)).',
								'sgs-blocks'
							),
							stepIndex + 1,
							questionText,
							optionLabel,
							nextStepId,
							stepCount
						),
					} );
					return;
				}

				edges[ stepIndex ].add( parsedIndex );
			} );
		} );
	} );

	if ( ! hasAnyResultStep ) {
		errors.push( {
			message: __(
				'This flow has no result step (an "SGS Choice Flow — Result" block) anywhere — it can never reach an end. Add a result step to at least one step in the flow.',
				'sgs-blocks'
			),
		} );
		return errors;
	}

	// Walk the routing graph from step 0 — does any path reach a step that
	// contains a result block (or a "__terminal__" edge, which always
	// resolves since we've just confirmed at least one result step exists)?
	if ( stepCount > 0 ) {
		const visited = new Set();
		const queue = [ 0 ];
		let reachedResult = false;

		while ( queue.length > 0 && ! reachedResult ) {
			const current = queue.shift();
			if ( visited.has( current ) ) {
				continue;
			}
			visited.add( current );

			if ( findDescendantsByName( steps[ current ], 'sgs/choice-flow-result' ).length > 0 ) {
				reachedResult = true;
				break;
			}

			edges[ current ].forEach( ( target ) => {
				if ( TERMINAL_NODE === target ) {
					reachedResult = true;
				} else if ( ! visited.has( target ) ) {
					queue.push( target );
				}
			} );
		}

		if ( ! reachedResult ) {
			errors.push( {
				message: __(
					'No path from Step 1 can ever reach a result step — this flow has a routing cycle (e.g. two or more steps whose options only route back to each other) with no way out. Check the "Goes to" setting on each question\'s options.',
					'sgs-blocks'
				),
			} );
		}
	}

	return errors;
}

export default function Edit( { attributes, setAttributes, clientId } ) {
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

	// FR-43-2a — re-read this flow's own sgs/form-step children (with their
	// full nested tree) on every block-editor store change, so a question's
	// option edit anywhere inside the flow re-triggers validation.
	const steps = useSelect(
		( select ) =>
			select( 'core/block-editor' )
				.getBlocks( clientId )
				.filter( ( block ) => block.name === 'sgs/form-step' ),
		[ clientId ]
	);

	const errors = useMemo( () => validateFlow( steps ), [ steps ] );

	// FR-43-2a's publish-blocking mechanism: `core/editor`'s
	// lockPostSaving()/unlockPostSaving() is the standard WordPress API for
	// "block the whole post's Publish/Update button until a named condition
	// clears" — it disables the button directly (the same mechanism WP core
	// itself uses, e.g. to block saving while an upload is still in
	// progress) rather than merely showing a dismissible warning, which a
	// PluginPrePublishPanel would only ever do for a document already mid-
	// publish-flow. The lock name is scoped to this block instance's
	// clientId so multiple sgs/choice-flow blocks on one page (or one
	// invalid flow being fixed while another is still valid) never clobber
	// each other's lock state.
	const { lockPostSaving, unlockPostSaving } = useDispatch( 'core/editor' );
	const lockName = `sgs-choice-flow-validation-${ clientId }`;

	useEffect( () => {
		if ( errors.length > 0 ) {
			lockPostSaving( lockName );
		} else {
			unlockPostSaving( lockName );
		}
		// Release the lock if this block instance is ever removed — a
		// deleted flow must never leave the post permanently unpublishable.
		return () => unlockPostSaving( lockName );
	}, [ errors, lockName, lockPostSaving, unlockPostSaving ] );

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
				{ errors.length > 0 && (
					<Notice
						status="error"
						isDismissible={ false }
						className="sgs-choice-flow__validation-notice"
					>
						<p>
							{ __(
								'This flow can’t be published yet — fix the following before publishing/updating:',
								'sgs-blocks'
							) }
						</p>
						<ul>
							{ errors.map( ( error, index ) => (
								<li key={ index }>{ error.message }</li>
							) ) }
						</ul>
					</Notice>
				) }
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}

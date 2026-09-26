import { __, sprintf } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useMemo, useRef } from '@wordpress/element';
import { PanelBody, TextControl, SelectControl, Notice } from '@wordpress/components';
import {
	SgsLengthControl,
	SgsBoxControl,
	SgsBorderControl,
	SgsColourPanel,
	ResponsiveOverride,
	BOX_UNITS,
	normaliseResponsiveBox,
} from '../../components';
import fillRow from '../../components/colour-variants/fillRow';
import textRow from '../../components/colour-variants/textRow';
import { colourVar } from '../../utils';
import PricingSettingsPanel from './PricingSettingsPanel';
import SummaryPanel from './SummaryPanel';
import FlowLayoutPanel from './FlowLayoutPanel';
import ShowcasePanel from './ShowcasePanel';
import LinkedFlowPanel from './LinkedFlowPanel';
import ChromePanel from './ChromePanel';
import FlowNavigationPanel from './FlowNavigationPanel';

// Box-object interface contract — length units for the kept-scalar maxWidth
// attr (base only). Mirrors sgs/notice-banner/edit.js's LENGTH_UNITS exactly
// (Visual-QA pass, 2026-09-15, design-reviewer gap #1).
const LENGTH_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
	{ value: '%', label: '%' },
];

// Editor canvas preview only (desktop styles; responsive tiers are PHP-side
// @media, matches sgs/notice-banner/edit.js's buildWrapperStyle()). The
// SAVED/RENDERED frontend output is dynamic (render.php) and carries zero
// inline declarations (Spec 32) — this exists only for the live editor
// preview.
function boxShorthand( box, keys ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

function buildWrapperStyle( attributes ) {
	const { padding, maxWidth } = attributes;
	const wrapperStyle = {};

	const paddingPreview = boxShorthand( padding?.desktop, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) {
		wrapperStyle.padding = paddingPreview;
	}
	if ( maxWidth ) {
		wrapperStyle.maxWidth = maxWidth;
		wrapperStyle.marginLeft = 'auto';
		wrapperStyle.marginRight = 'auto';
	}
	return wrapperStyle;
}

/**
 * Editor canvas preview of the Back button's colour/border styling — same
 * "inline style, editor-only" contract as buildWrapperStyle() above. Without
 * this, the Back-button colour/border panel writes attributes the canvas
 * never reflects at all (the block's own InnerBlocks are the only thing
 * rendered in edit.js otherwise) — caught by check-editor-render-parity.js's
 * CHECK A, 2026-09-15.
 *
 * @param {Object} attributes Block attributes.
 * @return {Object} Inline style object for the preview `<span>`.
 */
function buildBackButtonPreviewStyle( attributes ) {
	const {
		backColourBackground,
		backColourText,
		backColourBorder,
		backBorderStyle,
		backBorderWidth,
		backBorderRadius,
	} = attributes;

	const style = {
		backgroundColor: backColourBackground ? colourVar( backColourBackground ) : 'transparent',
		color: backColourText ? colourVar( backColourText ) : undefined,
		borderStyle: backBorderStyle || 'solid',
		borderColor: backColourBorder ? colourVar( backColourBorder ) : undefined,
	};

	const widthShorthand = boxShorthand( backBorderWidth, [ 'top', 'right', 'bottom', 'left' ] );
	if ( widthShorthand ) {
		style.borderWidth = widthShorthand;
	}

	const radiusShorthand = boxShorthand( backBorderRadius, [
		'topLeft',
		'topRight',
		'bottomRight',
		'bottomLeft',
	] );
	if ( radiusShorthand ) {
		style.borderRadius = radiusShorthand;
	}

	return style;
}

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
 * Reorder-desync guard (found by adversarial review, 2026-09-15).
 *
 * `nextStepId` is stored as a positional index — the target step's 0-based
 * DOM-order position at the moment it was picked (see
 * `choice-flow-question/edit.js`'s `stepChoices`). That value is necessary
 * because `sgs/form-step` has no stable identity of its own that survives
 * to render/runtime (a clientId does not — see `view.js`'s own docblock for
 * the full history of that earlier bug). But a bare position is NOT stable
 * across a step reorder, which `sgs/choice-flow`'s `templateLock: false`
 * explicitly allows (drag-and-drop, "Move up"/"Move down"). Without this
 * guard, reordering steps silently repoints every `nextStepId` at whatever
 * step now occupies the OLD position — `validateFlow()`'s bounds-only check
 * (below) cannot catch this, because the repointed value is still a valid,
 * in-range index; it is just the WRONG one.
 *
 * Fix: track each step's clientId order across renders. When the order
 * changes (and it is genuinely the SAME SET of steps, just reordered — an
 * add/remove is a different, already-handled case via the dangling-
 * reference check), translate every question option's `nextStepId` from its
 * OLD position to the SAME STEP's NEW position, keyed by clientId identity,
 * so a client's authored routing intent survives a reorder unchanged.
 *
 * @param {Object[]} steps        Current top-level `sgs/form-step` children,
 *                                 in DOM order, each with clientId + full
 *                                 nested innerBlocks tree.
 * @param {string[]} previousOrder The same steps' clientIds, in the order
 *                                 recorded before this render's change.
 * @param {Function} updateBlockAttributes `core/block-editor`'s dispatch
 *                                 action, used to rewrite each affected
 *                                 question block's `options` attribute.
 */
function remapStepReferencesOnReorder( steps, previousOrder, updateBlockAttributes ) {
	const currentOrder = steps.map( ( step ) => step.clientId );

	// Only remap when it's a genuine REORDER of the same step set — a
	// different length (a step was added/removed) is out of scope here;
	// the dangling-reference check already covers a removed step's
	// now-invalid references, and a newly added step has no existing
	// nextStepId pointing at it yet.
	if (
		previousOrder.length !== currentOrder.length ||
		previousOrder.every( ( id, i ) => id === currentOrder[ i ] )
	) {
		return;
	}

	const sameSet =
		previousOrder.every( ( id ) => currentOrder.includes( id ) ) &&
		currentOrder.every( ( id ) => previousOrder.includes( id ) );
	if ( ! sameSet ) {
		return;
	}

	// oldIndex -> newIndex, by clientId identity.
	const indexMap = new Map();
	previousOrder.forEach( ( clientIdAtOldPos, oldIndex ) => {
		indexMap.set( oldIndex, currentOrder.indexOf( clientIdAtOldPos ) );
	} );

	steps.forEach( ( step ) => {
		findDescendantsByName( step, 'sgs/choice-flow-question' ).forEach(
			( questionBlock ) => {
				let changed = false;
				const newOptions = ( questionBlock.attributes.options || [] ).map(
					( option ) => {
						const raw = option.nextStepId || '';
						if ( '' === raw || TERMINAL_SENTINEL === raw ) {
							return option;
						}
						const oldIndex = /^\d+$/.test( raw ) ? parseInt( raw, 10 ) : -1;
						if ( ! indexMap.has( oldIndex ) ) {
							// Not a value this remap recognises (already
							// dangling, or somehow out of range) — leave it
							// for validateFlow()'s dangling-reference check
							// to report as-is, don't guess a translation.
							return option;
						}
						const newIndex = indexMap.get( oldIndex );
						if ( newIndex === oldIndex ) {
							return option;
						}
						changed = true;
						return { ...option, nextStepId: String( newIndex ) };
					}
				);
				if ( changed ) {
					updateBlockAttributes( questionBlock.clientId, {
						options: newOptions,
					} );
				}
			}
		);
	} );
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
	const {
		title,
		maxWidth,
		padding,
		progressStyle,
		backBorderWidth,
		backBorderStyle,
		backBorderRadius,
		showPricePanel,
		pricePanelTitle,
		flowProductId,
		flowId,
		flowIsLinked,
		closeStyle,
		summaryBaseLabel,
	} = attributes;

	const blockProps = useBlockProps( {
		className: `sgs-choice-flow sgs-choice-flow--layout-${ attributes.flowLayout || 'compact' } sgs-choice-flow--close-${ closeStyle || 'icon' }`,
		style: buildWrapperStyle( attributes ),
		'data-summary-base-label': summaryBaseLabel || '',
		'data-opener-label': attributes.openerLabel || '',
	} );

	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-choice-flow__inner' },
		{
			allowedBlocks: ALLOWED_BLOCKS,
			// A linked flow shows another post's steps (FR-43-6), so it gets
			// no starter steps of its own.
			template: flowIsLinked ? undefined : TEMPLATE,
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

	const errors = useMemo(
		() => ( flowIsLinked ? [] : validateFlow( steps ) ),
		[ steps, flowIsLinked ]
	);

	// Reorder-desync guard (see remapStepReferencesOnReorder's own docblock).
	// previousStepOrder persists across renders without itself triggering a
	// re-render (a ref, not state) — this is a synchronisation side effect,
	// not something the UI reads directly.
	const previousStepOrder = useRef( null );
	const { updateBlockAttributes } = useDispatch( 'core/block-editor' );

	useEffect( () => {
		const currentOrder = steps.map( ( step ) => step.clientId );
		if ( previousStepOrder.current !== null ) {
			remapStepReferencesOnReorder(
				steps,
				previousStepOrder.current,
				updateBlockAttributes
			);
		}
		previousStepOrder.current = currentOrder;
		// Deliberately NOT depending on `updateBlockAttributes` (a stable
		// dispatch function identity) beyond this one read — including
		// `steps` (already covers array-identity changes from any
		// attribute edit anywhere in the tree, which is fine: the internal
		// clientId-order comparison is a no-op when only content changed,
		// not order).
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ steps ] );

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
				<LinkedFlowPanel
					flowId={ flowId }
					flowIsLinked={ flowIsLinked }
					setAttributes={ setAttributes }
				/>
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
				{ /* Visual-QA pass (2026-09-15, design-reviewer gap #1) — a
				   DELIBERATELY MINIMAL box+width shape (maxWidth + padding
				   only), mirroring sgs/notice-banner's "Wrapper" panel
				   exactly. Do not extend toward the full
				   SGS_Container_Wrapper capability set here (CLAUDE.md
				   rule 7 — this block is content-block, not
				   wrapper-shell-kind). */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsLengthControl
						presets={ false }
						label={ __( 'Outer max-width', 'sgs-blocks' ) }
						value={ maxWidth || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) => setAttributes( { maxWidth: val ?? '' } ) }
						help={ __( 'Exact CSS length, e.g. 800px. Leave blank for no cap.', 'sgs-blocks' ) }
					/>
					<ResponsiveOverride
						value={ padding }
						onChange={ ( obj ) => setAttributes( { padding: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Padding', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>
				{ /* User-directed (2026-09-15) — operator choice across the 3 real
				   reference patterns found live: see progressStyle's own
				   block.json description for the evidence. */ }
				<PanelBody title={ __( 'Progress indicator', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Style', 'sgs-blocks' ) }
						value={ progressStyle || 'bar' }
						options={ [
							{ label: __( 'Plain bar', 'sgs-blocks' ), value: 'bar' },
							{ label: __( 'Numbered circles', 'sgs-blocks' ), value: 'circles' },
							{ label: __( 'Badge on bar', 'sgs-blocks' ), value: 'badge' },
						] }
						onChange={ ( val ) => setAttributes( { progressStyle: val } ) }
						help={ __(
							'Plain bar matches the real lens-configurator reference; Numbered circles matches AthleanX; Badge on bar matches Invisalign.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
				{ /* User-reported gap (2026-09-15) — Back button colour/border,
				   rendered via the shared sgs_button_element_style_css()
				   helper. Defaults are grounded in the real lens-configurator
				   source, not the theme's 'primary' preset — see the 'back'
				   element's own block.json _note for the evidence. */ }
				<PanelBody title={ __( 'Back button', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsColourPanel
						rows={ [
							fillRow( {
								key: 'back-fill',
								label: __( 'Background', 'sgs-blocks' ),
								attrs: {
									base: 'backColourBackground',
									hover: 'backColourBackgroundHover',
								},
								attributes,
								setAttributes,
							} ),
							textRow( {
								key: 'back-text',
								label: __( 'Text', 'sgs-blocks' ),
								attrs: {
									base: 'backColourText',
									hover: 'backColourTextHover',
								},
								attributes,
								setAttributes,
							} ),
						] }
					/>
					<SgsBorderControl
						widthValues={ backBorderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { backBorderWidth: next } ) }
						styleValue={ backBorderStyle }
						onStyleChange={ ( val ) => setAttributes( { backBorderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourValue={ attributes.backColourBorder }
						onColourChange={ ( val ) => setAttributes( { backColourBorder: val ?? '' } ) }
						colourLinked
						radiusValues={ { base: backBorderRadius ?? {} } }
						showRadiusResponsive={ false }
						onRadiusChange={ ( _tier, next ) => setAttributes( { backBorderRadius: next } ) }
					/>
				</PanelBody>
				<PricingSettingsPanel
					showPricePanel={ showPricePanel }
					pricePanelTitle={ pricePanelTitle }
					flowProductId={ flowProductId }
					setAttributes={ setAttributes }
				/>
			</InspectorControls>
			<ChromePanel attributes={ attributes } setAttributes={ setAttributes } />
			<FlowLayoutPanel attributes={ attributes } setAttributes={ setAttributes } />
			<ShowcasePanel attributes={ attributes } setAttributes={ setAttributes } />
			<FlowNavigationPanel attributes={ attributes } setAttributes={ setAttributes } />
			<InspectorControls>
				<SummaryPanel
					showPricePanel={ showPricePanel }
					summaryShowImage={ attributes.summaryShowImage }
					summaryPosition={ attributes.summaryPosition }
					summaryBaseLabel={ summaryBaseLabel }
					stageNote={ attributes.stageNote }
					stageNoteLink={ attributes.stageNoteLink }
					setAttributes={ setAttributes }
				/>
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
				{ flowIsLinked ? (
					<Notice
						status="info"
						isDismissible={ false }
						className="sgs-choice-flow__linked-notice"
					>
						{ sprintf(
							/* translators: %s: the linked flow's slug. */
							__( 'Showing the saved flow “%s”. Edit its steps under Choice Flows.', 'sgs-blocks' ),
							flowId
						) }
					</Notice>
				) : (
					<div { ...innerBlocksProps } />
				) }
				{ /* Editor-canvas-only preview of the Back button's colour/border
				   styling (Spec 32-safe: inline style here, zero inline style
				   on the actual frontend render.php output). Static, never
				   clickable in the canvas — the real Back button only exists
				   at runtime, shown/hidden by view.js. */ }
				<div className="sgs-choice-flow__footer-preview">
					<span
						className="sgs-choice-flow__nav-back-preview"
						style={ buildBackButtonPreviewStyle( attributes ) }
					>
						{ __( '← Back', 'sgs-blocks' ) }
					</span>
				</div>
			</div>
		</>
	);
}

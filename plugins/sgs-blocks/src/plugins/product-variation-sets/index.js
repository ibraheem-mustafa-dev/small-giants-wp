/**
 * SGS Product — Variation Sets editor panel.
 *
 * Registers a PluginDocumentSettingPanel shown only on `sgs_product` posts.
 * Lets the client define variation TYPES (pack-size, flavour, etc.), each with:
 *   - A display mode: pills | static-list | hidden  (D144.1)
 *   - Content-impact slots: which card areas this type changes (price, image, …)
 *   - Options: the selectable items within this type (key + label rows)
 *
 * Implements:
 *   FR-24-11 — _sgs_variation_sets data model
 *   FR-24-14 — slot-conflict warning (first type wins; SKU matrix is Phase 2)
 *   D144.6   — Gutenberg panel, not a classic meta box
 *
 * Reads/writes `_sgs_variation_sets` via useEntityProp on the current post.
 * The meta key is registered with show_in_rest + a full schema in
 * class-product-cpt.php, so the editor REST layer exposes it automatically.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { useEntityProp } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import {
	Button,
	TextControl,
	SelectControl,
	Notice,
	__experimentalDivider as Divider,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The meta key registered in class-product-cpt.php. */
const META_KEY = '_sgs_variation_sets';

/** The CPT slug — panel renders only for this post type. */
const POST_TYPE = 'sgs_product';

/**
 * Known card slots presented as checkboxes in the content-impact picker.
 * Kept as a data-driven list (R-22-9): extend here when new slots are added
 * to the card block — no further JS changes required.
 */
const CARD_SLOTS = [
	{ value: 'price',       label: __( 'Price', 'sgs-blocks' ) },
	{ value: 'image',       label: __( 'Image', 'sgs-blocks' ) },
	{ value: 'description', label: __( 'Description', 'sgs-blocks' ) },
	{ value: 'badge',       label: __( 'Badge', 'sgs-blocks' ) },
	{ value: 'title',       label: __( 'Title', 'sgs-blocks' ) },
];

/** Display-mode choices (D144.1). */
const DISPLAY_AS_OPTIONS = [
	{ value: 'pills',       label: __( 'Pills (interactive)', 'sgs-blocks' ) },
	{ value: 'static-list', label: __( 'Static list (e.g. "Available in 3 flavours: …")', 'sgs-blocks' ) },
	{ value: 'hidden',      label: __( 'Hidden (price-only mode)', 'sgs-blocks' ) },
];

/** An empty variation type used when the client adds a new one. */
const EMPTY_VARIATION_TYPE = {
	type_key:       '',
	type_label:     '',
	display_as:     'pills',
	content_impact: [],
	options:        [],
};

/** An empty option row. */
const EMPTY_OPTION = { key: '', label: '' };

// ---------------------------------------------------------------------------
// Helper: detect slot conflicts (FR-24-14)
// ---------------------------------------------------------------------------

/**
 * Returns the set of slots that appear in more than one variation type's
 * content_impact array. Used to drive the conflict warning Notice.
 *
 * Phase-1 rule: first type wins. The warning is non-blocking — it informs
 * the client so they understand the display behaviour without preventing save.
 *
 * @param {Array} variationSets  The full _sgs_variation_sets array.
 * @returns {string[]}  Slot names that have a conflict.
 */
function findConflictingSlots( variationSets ) {
	const seen    = new Map(); // slot → first type_label that claimed it
	const clashes = new Set();

	for ( const vt of variationSets ) {
		for ( const slot of ( vt.content_impact || [] ) ) {
			if ( seen.has( slot ) ) {
				clashes.add( slot );
			} else {
				seen.set( slot, vt.type_label || vt.type_key );
			}
		}
	}

	return [ ...clashes ];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * A single option row (key + label) inside a variation type.
 *
 * @param {object} props
 * @param {object}   props.option     — { key, label }
 * @param {number}   props.index      — position within options array
 * @param {Function} props.onChange   — called with updated option object
 * @param {Function} props.onRemove   — called when the Remove button is clicked
 */
function OptionRow( { option, index, onChange, onRemove } ) {
	return (
		<div className="sgs-vs-option-row" role="group" aria-label={ __( 'Option', 'sgs-blocks' ) + ' ' + ( index + 1 ) }>
			<TextControl
				label={ __( 'Key', 'sgs-blocks' ) }
				help={ __( 'Machine key, e.g. "8pack". No spaces.', 'sgs-blocks' ) }
				value={ option.key }
				onChange={ ( val ) => onChange( { ...option, key: val.replace( /\s+/g, '-' ).toLowerCase() } ) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Label', 'sgs-blocks' ) }
				help={ __( 'Display label, e.g. "8-pack".', 'sgs-blocks' ) }
				value={ option.label }
				onChange={ ( val ) => onChange( { ...option, label: val } ) }
				__nextHasNoMarginBottom
			/>
			<Button
				variant="tertiary"
				isDestructive
				onClick={ onRemove }
				aria-label={ __( 'Remove option', 'sgs-blocks' ) + ' ' + ( option.label || option.key || String( index + 1 ) ) }
				style={ { marginTop: '4px' } }
			>
				{ __( 'Remove option', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

/**
 * Content-impact slot selector — a list of checkboxes, one per known card slot.
 *
 * @param {object}   props
 * @param {string[]} props.value     — currently selected slot names
 * @param {Function} props.onChange  — called with new selected slots array
 */
function ContentImpactPicker( { value, onChange } ) {
	const selected = new Set( value );

	function toggle( slot ) {
		const next = new Set( selected );
		if ( next.has( slot ) ) {
			next.delete( slot );
		} else {
			next.add( slot );
		}
		onChange( [ ...next ] );
	}

	return (
		<fieldset className="sgs-vs-impact-picker">
			<legend className="sgs-vs-impact-picker__legend">
				{ __( 'Changes these card areas:', 'sgs-blocks' ) }
			</legend>
			{ CARD_SLOTS.map( ( { value: slotValue, label } ) => (
				<label
					key={ slotValue }
					className="sgs-vs-impact-picker__item"
				>
					<input
						type="checkbox"
						checked={ selected.has( slotValue ) }
						onChange={ () => toggle( slotValue ) }
					/>
					{ ' ' }{ label }
				</label>
			) ) }
		</fieldset>
	);
}

/**
 * Editor card for a single variation TYPE.
 *
 * @param {object}   props
 * @param {object}   props.vt         — the variation-type object
 * @param {number}   props.index      — position within the array
 * @param {boolean}  props.isFirst    — true when this is the first item
 * @param {boolean}  props.isLast     — true when this is the last item
 * @param {Function} props.onChange   — called with the updated vt object
 * @param {Function} props.onRemove   — called to delete this type
 * @param {Function} props.onMoveUp   — called to move this type up
 * @param {Function} props.onMoveDown — called to move this type down
 */
function VariationTypeCard( { vt, index, isFirst, isLast, onChange, onRemove, onMoveUp, onMoveDown } ) {
	const [ expanded, setExpanded ] = useState( true );

	function updateOption( optIndex, updated ) {
		const next = [ ...vt.options ];
		next[ optIndex ] = updated;
		onChange( { ...vt, options: next } );
	}

	function removeOption( optIndex ) {
		onChange( { ...vt, options: vt.options.filter( ( _, i ) => i !== optIndex ) } );
	}

	function addOption() {
		onChange( { ...vt, options: [ ...vt.options, { ...EMPTY_OPTION } ] } );
	}

	const title = vt.type_label || vt.type_key || ( __( 'Variation type', 'sgs-blocks' ) + ' ' + ( index + 1 ) );

	return (
		<div
			className="sgs-vs-type-card"
			style={ { border: '1px solid #ddd', borderRadius: '4px', padding: '12px', marginBottom: '12px' } }
		>
			{ /* Card header — title + reorder + remove */ }
			<div
				className="sgs-vs-type-card__header"
				style={ { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: expanded ? '12px' : 0 } }
			>
				<button
					className="sgs-vs-type-card__toggle"
					type="button"
					aria-expanded={ expanded }
					onClick={ () => setExpanded( ( v ) => ! v ) }
					style={ { background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', textAlign: 'left', padding: 0 } }
				>
					{ expanded ? '▾' : '▸' } { title }
				</button>
				<div style={ { display: 'flex', gap: '4px' } }>
					<Button
						variant="tertiary"
						size="small"
						disabled={ isFirst }
						onClick={ onMoveUp }
						aria-label={ __( 'Move up', 'sgs-blocks' ) }
					>
						↑
					</Button>
					<Button
						variant="tertiary"
						size="small"
						disabled={ isLast }
						onClick={ onMoveDown }
						aria-label={ __( 'Move down', 'sgs-blocks' ) }
					>
						↓
					</Button>
					<Button
						variant="tertiary"
						size="small"
						isDestructive
						onClick={ onRemove }
						aria-label={ __( 'Remove variation type', 'sgs-blocks' ) + ': ' + title }
					>
						✕
					</Button>
				</div>
			</div>

			{ expanded && (
				<>
					{ /* Type key */ }
					<TextControl
						label={ __( 'Type key', 'sgs-blocks' ) }
						help={ __( 'Machine key, e.g. "pack-size". No spaces.', 'sgs-blocks' ) }
						value={ vt.type_key }
						onChange={ ( val ) => onChange( { ...vt, type_key: val.replace( /\s+/g, '-' ).toLowerCase() } ) }
						__nextHasNoMarginBottom
					/>

					{ /* Type label */ }
					<TextControl
						label={ __( 'Type label', 'sgs-blocks' ) }
						help={ __( 'Shown to the visitor, e.g. "Number in Pack".', 'sgs-blocks' ) }
						value={ vt.type_label }
						onChange={ ( val ) => onChange( { ...vt, type_label: val } ) }
						__nextHasNoMarginBottom
					/>

					{ /* Display mode */ }
					<SelectControl
						label={ __( 'Display as', 'sgs-blocks' ) }
						value={ vt.display_as }
						options={ DISPLAY_AS_OPTIONS }
						onChange={ ( val ) => onChange( { ...vt, display_as: val } ) }
						__nextHasNoMarginBottom
					/>

					{ /* Content impact */ }
					<ContentImpactPicker
						value={ vt.content_impact }
						onChange={ ( val ) => onChange( { ...vt, content_impact: val } ) }
					/>

					{ /* Options repeater */ }
					<div className="sgs-vs-options" style={ { marginTop: '12px' } }>
						<p style={ { margin: '0 0 8px', fontWeight: 600, fontSize: '12px' } }>
							{ __( 'Options', 'sgs-blocks' ) }
						</p>
						{ vt.options.map( ( opt, i ) => (
							<OptionRow
								key={ i }
								option={ opt }
								index={ i }
								onChange={ ( updated ) => updateOption( i, updated ) }
								onRemove={ () => removeOption( i ) }
							/>
						) ) }
						<Button
							variant="secondary"
							onClick={ addOption }
							style={ { marginTop: '8px' } }
						>
							{ __( '+ Add option', 'sgs-blocks' ) }
						</Button>
					</div>
				</>
			) }
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main panel component
// ---------------------------------------------------------------------------

/**
 * The PluginDocumentSettingPanel content.
 *
 * Reads and writes `_sgs_variation_sets` via useEntityProp so every change
 * is tracked by the editor's unsaved-changes indicator and saved via the
 * normal post-save flow — no bespoke REST call needed.
 */
function VariationSetsPanel() {
	const postType = useSelect(
		( select ) => select( 'core/editor' ).getCurrentPostType(),
		[]
	);

	// Only render on sgs_product screens (defence-in-depth — the PHP enqueue
	// hook already gates the bundle to this post type).
	if ( POST_TYPE !== postType ) {
		return null;
	}

	const [ meta, setMeta ] = useEntityProp( 'postType', POST_TYPE, 'meta' );
	const variationSets     = meta?.[ META_KEY ] ?? [];

	function updateVariationSets( next ) {
		setMeta( { ...meta, [ META_KEY ]: next } );
	}

	function addVariationType() {
		updateVariationSets( [ ...variationSets, { ...EMPTY_VARIATION_TYPE, options: [] } ] );
	}

	function updateVariationType( idx, updated ) {
		const next = [ ...variationSets ];
		next[ idx ] = updated;
		updateVariationSets( next );
	}

	function removeVariationType( idx ) {
		updateVariationSets( variationSets.filter( ( _, i ) => i !== idx ) );
	}

	function moveVariationType( idx, direction ) {
		const next    = [ ...variationSets ];
		const swapIdx = idx + direction;
		if ( swapIdx < 0 || swapIdx >= next.length ) return;
		[ next[ idx ], next[ swapIdx ] ] = [ next[ swapIdx ], next[ idx ] ];
		updateVariationSets( next );
	}

	// Slot-conflict detection (FR-24-14).
	const conflictingSlots = findConflictingSlots( variationSets );
	const hasConflict      = conflictingSlots.length > 0;

	return (
		<>
			{ /* Slot-conflict warning — non-blocking (D144.2 / FR-24-14) */ }
			{ hasConflict && (
				<Notice status="warning" isDismissible={ false }>
					{ __(
						'Two or more variation types both affect the same card area: ',
						'sgs-blocks'
					) }
					<strong>{ conflictingSlots.join( ', ' ) }</strong>
					{ '. ' }
					{ __(
						'The first type listed wins. Per-combination pricing (SKU matrix) is a future feature.',
						'sgs-blocks'
					) }
				</Notice>
			) }

			{ variationSets.length === 0 && (
				<p style={ { margin: '0 0 12px', color: '#757575', fontSize: '13px' } }>
					{ __( 'No variation types defined. Add one below to let visitors choose between options (pack sizes, flavours, etc.).', 'sgs-blocks' ) }
				</p>
			) }

			{ variationSets.map( ( vt, idx ) => (
				<VariationTypeCard
					key={ idx }
					vt={ vt }
					index={ idx }
					isFirst={ idx === 0 }
					isLast={ idx === variationSets.length - 1 }
					onChange={ ( updated ) => updateVariationType( idx, updated ) }
					onRemove={ () => removeVariationType( idx ) }
					onMoveUp={ () => moveVariationType( idx, -1 ) }
					onMoveDown={ () => moveVariationType( idx, 1 ) }
				/>
			) ) }

			<Divider />

			<Button
				variant="primary"
				onClick={ addVariationType }
				style={ { width: '100%', justifyContent: 'center' } }
			>
				{ __( '+ Add variation type', 'sgs-blocks' ) }
			</Button>
		</>
	);
}

// ---------------------------------------------------------------------------
// Plugin registration
// ---------------------------------------------------------------------------

registerPlugin( 'sgs-product-variation-sets', {
	render() {
		return (
			<PluginDocumentSettingPanel
				name="sgs-product-variation-sets"
				title={ __( 'Variation Sets', 'sgs-blocks' ) }
				className="sgs-product-variation-sets-panel"
			>
				<VariationSetsPanel />
			</PluginDocumentSettingPanel>
		);
	},
} );

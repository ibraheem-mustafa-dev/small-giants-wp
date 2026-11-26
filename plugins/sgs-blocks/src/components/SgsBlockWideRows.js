/**
 * Block-wide rows: one slot in a panel that holds switches belonging to the whole block, not to one part of it
 * ("Keyboard focus keeps the resting look", later "Hover as one card").
 *
 * A panel draws `<SgsBlockWideRowsSlot home="hover" />` wherever its block-wide rows belong: the motion Hover panel draws
 * it as its LAST row, below everything else, under a rule that marks it as the whole block's (Bean, 2026-11-26). A
 * feature puts its row in with `<SgsBlockWideRowsFill home="hover">...</SgsBlockWideRowsFill>`; any number of fills share
 * one slot and stack in the order they mount. A fill whose slot is not mounted (the panel is collapsed, or the block has
 * no such panel) draws nothing, so a feature names its home once and never tests whether the panel exists. A slot with no
 * fill is empty and takes no room (`.sgs-block-wide-rows:empty`).
 *
 * Each home is its own slot name. The slot sits wherever the panel renders it, so a panel can put it at the top or the
 * foot; the Hover panel puts it at the foot. A block with no Hover panel does not use a slot: its switch goes into
 * WordPress's Advanced section (`InspectorAdvancedControls`, see `focus-rests.js`).
 *
 * @package SGS\Blocks
 */
import { createSlotFill } from '@wordpress/components';

/** The homes a block-wide row can sit in. */
export const BLOCK_WIDE_HOMES = [ 'hover' ];

const slotFills = {};

/**
 * The slot and fill pair for one home.
 *
 * @param {string} home 'hover'.
 * @return {{Fill: Function, Slot: Function}} The pair.
 */
function pairFor( home ) {
	if ( ! slotFills[ home ] ) {
		slotFills[ home ] = createSlotFill( `SgsBlockWideRows/${ home }` );
	}
	return slotFills[ home ];
}

/**
 * The place a panel keeps for block-wide rows.
 *
 * @param {Object} props
 * @param {string} props.home 'hover'.
 * @return {Element} The slot.
 */
export function SgsBlockWideRowsSlot( { home } ) {
	const { Slot } = pairFor( home );
	return <Slot bubblesVirtually className="sgs-block-wide-rows" />;
}

/**
 * A row for a block-wide slot.
 *
 * @param {Object} props
 * @param {string} props.home     'hover'.
 * @param {Node}   props.children The row.
 * @return {Element} The fill.
 */
export function SgsBlockWideRowsFill( { home, children } ) {
	const { Fill } = pairFor( home );
	return <Fill>{ children }</Fill>;
}

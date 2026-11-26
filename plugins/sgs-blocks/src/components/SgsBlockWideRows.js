/**
 * Block-wide rows: one slot at the top of a panel that holds switches belonging to the whole block, not to one part of
 * it ("Keyboard focus keeps the resting look", later "Hover as one card").
 *
 * A panel draws `<SgsBlockWideRowsSlot home="hover" />` (the motion Hover panel, above its target picker) or
 * `home="colour"` (the shared `SgsColourPanel`, above its rows). A feature puts its row in with
 * `<SgsBlockWideRowsFill home="hover">...</SgsBlockWideRowsFill>`; any number of fills share one slot and stack in the
 * order they mount. A fill whose slot is not mounted (the panel is collapsed, or the block has no such panel) draws
 * nothing, so a feature names its home once and never tests whether the panel exists.
 *
 * Each home is its own slot name, so a block with both a Hover panel and a Colour panel shows a row in one of them.
 *
 * @package SGS\Blocks
 */
import { createSlotFill } from '@wordpress/components';

/** The homes a block-wide row can sit in. */
export const BLOCK_WIDE_HOMES = [ 'hover', 'colour' ];

const slotFills = {};

/**
 * The slot and fill pair for one home.
 *
 * @param {string} home 'hover' or 'colour'.
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
 * @param {string} props.home 'hover' or 'colour'.
 * @return {Element} The slot.
 */
export function SgsBlockWideRowsSlot( { home } ) {
	const { Slot } = pairFor( home );
	return <Slot bubblesVirtually />;
}

/**
 * A row for a block-wide slot.
 *
 * @param {Object} props
 * @param {string} props.home     'hover' or 'colour'.
 * @param {Node}   props.children The row.
 * @return {Element} The fill.
 */
export function SgsBlockWideRowsFill( { home, children } ) {
	const { Fill } = pairFor( home );
	return <Fill>{ children }</Fill>;
}

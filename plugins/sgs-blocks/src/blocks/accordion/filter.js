/**
 * Accordion filter: narrows an sgs/accordion's items by a search box and topic chips.
 *
 * A separate script module, loaded by includes/accordion-filter.php only for an accordion with its filter on, so an
 * accordion without it carries none of this code. Vanilla; native <details> items; no network.
 *
 * - Search matches an item's heading plus its answer (filter-text.js).
 * - A non-matching item gets `hidden` and its <details> is closed; the open state of every item is recorded before the
 *   first filter and restored when the query clears and All is chosen again (an exclusive accordion restores one item).
 * - The visible count and the polite announcement update once the query settles (300ms), never on first paint.
 * - If filtering hides the open item the focus was in, focus moves to the search box. A chip press never moves focus.
 * - Escape in the search box clears it.
 *
 * @package SGS\Blocks
 */

import { matches, squash } from '../../utils/filter-text';

const SETTLE_MS = 300;

function countText( bar, count ) {
	const countEl = bar.querySelector( '.sgs-accordion__count' );
	const plural = countEl?.dataset.template || '{count}';
	const singular = countEl?.dataset.singular || plural;
	return ( 1 === count ? singular : plural ).replace( '{count}', String( count ) );
}

function itemText( item ) {
	const title = item.querySelector( '.sgs-accordion-item__title' );
	const body = item.querySelector( '.sgs-accordion-item__content' );
	return squash( ( title ? title.textContent : '' ) + ' ' + ( body ? body.textContent : '' ) );
}

function initAccordion( accordion ) {
	const bar = accordion.querySelector( '[data-sgs-accordion-filter]' );
	if ( ! bar || 'true' === accordion.dataset.filterReady ) {
		return;
	}
	accordion.dataset.filterReady = 'true';

	const items = Array.from( accordion.querySelectorAll( '.sgs-accordion-item' ) ).filter(
		( item ) => item.closest( '.sgs-accordion' ) === accordion
	);
	const input = bar.querySelector( '.sgs-accordion__search-input' );
	const chips = Array.from( bar.querySelectorAll( '.sgs-accordion__chip' ) );
	const empty = accordion.querySelector( '[data-sgs-accordion-empty]' );
	const live = bar.querySelector( '[data-sgs-accordion-live]' );
	const painted = bar.querySelector( '.sgs-accordion__count-text' );
	const allowMultiple = 'true' === accordion.dataset.allowMultiple;
	const texts = new Map( items.map( ( item ) => [ item, itemText( item ) ] ) );

	let category = '';
	let openBefore = null;
	let settleTimer = 0;

	function restoreOpenState() {
		const wasOpen = openBefore || [];
		openBefore = null;
		const toOpen = allowMultiple ? wasOpen : wasOpen.slice( 0, 1 );
		items.forEach( ( item ) => {
			item.open = toOpen.includes( item );
		} );
	}

	function settle( shown ) {
		const text = countText( bar, shown );
		if ( painted ) {
			painted.textContent = text;
		}
		if ( live ) {
			live.textContent = text;
		}
	}

	function apply() {
		const query = input ? input.value : '';
		const active = '' !== query.trim() || '' !== category;
		const focusInside = items.find( ( item ) => item.contains( document.activeElement ) );

		if ( active && null === openBefore ) {
			openBefore = items.filter( ( item ) => item.open );
		}

		let shown = 0;
		let hidOpen = false;
		items.forEach( ( item ) => {
			const show =
				( '' === category || item.dataset.category === category ) &&
				matches( texts.get( item ), query );
			item.hidden = ! show;
			if ( show ) {
				shown += 1;
			} else if ( item.open ) {
				item.open = false;
				hidOpen = true;
			}
		} );

		if ( ! active && null !== openBefore ) {
			restoreOpenState();
		}
		if ( empty ) {
			empty.hidden = 0 !== shown;
		}
		// Focus that sat inside an item the filter just hid would fall to the page; the search box takes it. A chip keeps its own focus.
		if ( input && hidOpen && focusInside && focusInside.hidden ) {
			input.focus();
		}

		window.clearTimeout( settleTimer );
		settleTimer = window.setTimeout( () => settle( shown ), SETTLE_MS );
	}

	function selectChip( chip ) {
		const next = chip.dataset.category || '';
		category = category === next ? '' : next;
		chips.forEach( ( other ) => {
			const on = '' === category ? '' === ( other.dataset.category || '' ) : other.dataset.category === category;
			other.setAttribute( 'aria-pressed', on ? 'true' : 'false' );
		} );
		apply();
	}

	chips.forEach( ( chip ) => chip.addEventListener( 'click', () => selectChip( chip ) ) );
	if ( input ) {
		input.addEventListener( 'input', apply );
		input.addEventListener( 'keydown', ( event ) => {
			if ( 'Escape' === event.key && '' !== input.value ) {
				input.value = '';
				apply();
			}
		} );
	}

	bar.hidden = false;
}

function init() {
	document.querySelectorAll( '.sgs-accordion[data-filter]' ).forEach( initAccordion );
}

if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}

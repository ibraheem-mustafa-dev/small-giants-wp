/**
 * Shop "Load more" mode (FR-30-3b): turns the product collection's pagination into a Load more button.
 *
 * The server renders `sgs_batches=k` batches of products in one response. This module never fetches or appends
 * cards itself: it asks the Interactivity router for the same URL with one more batch, so the router swaps the
 * region and hydrates every card. Settings come from the JSON block `#sgs-shop-load-more-settings`.
 */
import {
	announce,
	anchorKey,
	formatCount,
	readBatches,
	rememberAnchor,
	restoreAnchor,
	withBatches,
} from '@sgs/load-more-core';

const SETTINGS_ID = 'sgs-shop-load-more-settings';
const REGION = '.wp-block-woocommerce-product-collection';
const ITEM = 'li.wc-block-product';
const NAV = '.wp-block-query-pagination';
const NEXT = '.wp-block-query-pagination-next';
const NEXT_LINK = 'a' + NEXT + ', ' + NEXT + ' a';
const NUMBERS = '.wp-block-query-pagination-numbers';
const COUNT_TEXT = '.wp-block-woocommerce-product-results-count';
const ROOT_CLASS = 'sgs-shop-load-more';
const WIDE = '(min-width: 1024px) and (pointer: fine)';

let settings = null;
let announcer = null;
let busy = false;
let topUpDone = false;
let lastSignature = '';
let skipSignature = false;
let scheduled = false;

function readSettings() {
	const node = document.getElementById( SETTINGS_ID );
	if ( ! node ) {
		return null;
	}
	try {
		return JSON.parse( node.textContent );
	} catch ( error ) {
		return null;
	}
}

function fill( template, value ) {
	return String( template ).replace( /%d/g, String( value ) );
}

/** Query string without the paging keys: a change means the shopper changed a filter or the sort. */
function signature() {
	const params = new URLSearchParams( window.location.search );
	params.delete( 'paged' );
	params.delete( settings.param );
	params.sort();
	return params.toString();
}

function region() {
	return document.querySelector( REGION );
}

function items() {
	const scope = region();
	return scope ? Array.from( scope.querySelectorAll( ITEM ) ) : [];
}

/** The list total: the collection's `data-sgs-total`, else the last number in the results-count text, else 0. */
function readTotal( scope ) {
	const fromServer = parseInt( scope.dataset.sgsTotal || '', 10 );
	if ( fromServer > 0 ) {
		return fromServer;
	}
	const node = document.querySelector( COUNT_TEXT );
	const numbers = node ? ( node.textContent.match( /\d+/g ) || [] ) : [];
	return numbers.length ? parseInt( numbers[ numbers.length - 1 ], 10 ) : 0;
}

function ensureAnnouncer() {
	if ( announcer && announcer.isConnected ) {
		return announcer;
	}
	announcer = document.createElement( 'div' );
	announcer.className = 'sgs-shop-load-more__announcer';
	announcer.setAttribute( 'role', 'status' );
	announcer.setAttribute( 'aria-live', 'polite' );
	document.body.appendChild( announcer );
	return announcer;
}

function speak( text ) {
	announce( ensureAnnouncer(), text );
}

function countSentence( loaded, total ) {
	return formatCount( settings.labels.count, loaded, total );
}

function buildBox( loaded, total, more ) {
	const box = document.createElement( 'div' );
	box.className = ROOT_CLASS;
	box.dataset.state = loaded + '/' + total + '/' + ( more ? 1 : 0 );
	if ( more ) {
		const button = document.createElement( 'button' );
		button.type = 'button';
		button.className = 'sgs-shop-load-more__button';
		button.textContent = settings.labels.button;
		button.addEventListener( 'click', () => loadMore( button ) );
		box.appendChild( button );
	}
	const count = document.createElement( 'p' );
	count.className = 'sgs-shop-load-more__count';
	if ( total ) {
		count.textContent = countSentence( loaded, total );
	} else {
		count.hidden = true;
	}
	box.appendChild( count );
	return box;
}

/** Stateless: read the DOM, then build, keep or remove the button box to match. Idempotent. */
function sync() {
	scheduled = false;
	const scope = region();
	if ( ! scope ) {
		return;
	}
	const nav = scope.querySelector( NAV );
	const next = scope.querySelector( NEXT_LINK );
	const loaded = items().length;
	const total = readTotal( scope );
	const more = total ? loaded < total : !! next;
	const batches = readBatches( window.location.href );
	const showBox = loaded > 0 && ( more || ( batches > 1 && total > 0 ) );
	const existing = scope.querySelector( '.' + ROOT_CLASS );
	const state = loaded + '/' + total + '/' + ( more ? 1 : 0 );
	if ( ! showBox ) {
		if ( existing && ! busy ) {
			existing.remove();
		}
		checkFilterReset();
		return;
	}
	if ( nav ) {
		const numbers = nav.querySelector( NUMBERS );
		const nextBlock = nav.querySelector( NEXT );
		if ( numbers && ! numbers.hidden ) {
			numbers.hidden = true;
		}
		if ( nextBlock && ! nextBlock.hidden ) {
			nextBlock.hidden = true;
		}
	}
	const keep = existing && ( existing.dataset.state === state || busy );
	if ( ! keep ) {
		if ( existing ) {
			existing.remove();
		}
		const anchor = nav || scope.querySelector( '.wp-block-woocommerce-product-template' );
		if ( anchor ) {
			anchor.insertAdjacentElement( 'afterend', buildBox( loaded, total, more ) );
		}
	}
	checkFilterReset();
	scheduleTopUp();
}

function schedule() {
	if ( ! scheduled ) {
		scheduled = true;
		window.requestAnimationFrame( sync );
	}
}

async function navigate( url ) {
	const { actions } = await import( '@wordpress/interactivity-router' );
	await actions.navigate( url, { replace: true, screenReaderAnnouncement: false } );
}

async function loadMore( button ) {
	if ( busy ) {
		return;
	}
	busy = true;
	const before = items().length;
	const box = button.closest( '.' + ROOT_CLASS );
	button.disabled = true;
	button.setAttribute( 'aria-busy', 'true' );
	button.textContent = settings.labels.loading;
	if ( box ) {
		box.classList.add( ROOT_CLASS + '--busy' );
	}
	const url = withBatches( window.location.href, readBatches( window.location.href ) + 1 );
	try {
		await navigate( url );
		busy = false;
		sync();
		afterLoad( before );
	} catch ( error ) {
		busy = false;
		if ( button.isConnected ) {
			button.disabled = false;
			button.removeAttribute( 'aria-busy' );
			button.textContent = settings.labels.button;
			if ( box ) {
				box.classList.remove( ROOT_CLASS + '--busy' );
			}
		}
		speak( settings.messages.failed );
	}
}

/** Focus the first new product link and announce the result. */
function afterLoad( before ) {
	const list = items();
	const first = list[ before ];
	const link = first ? first.querySelector( 'a[href]' ) : null;
	if ( link ) {
		link.focus();
	}
	const scope = region();
	const total = scope ? readTotal( scope ) : 0;
	if ( total && list.length >= total ) {
		speak( fill( settings.messages.allShown, total ) );
		return;
	}
	const added = list.length - before;
	const tail = total ? ' ' + countSentence( list.length, total ) + '.' : '';
	speak( fill( settings.messages.loadedMore, added ) + tail );
}

/** Desktop top-up: once per page load, on first idle, go straight to the wide-screen batch count. */
function scheduleTopUp() {
	if ( topUpDone || busy ) {
		return;
	}
	topUpDone = true;
	const run = async () => {
		const scope = region();
		if ( ! scope || ! window.matchMedia( WIDE ).matches || readBatches( window.location.href ) > 1 ) {
			return;
		}
		const total = readTotal( scope );
		const loaded = items().length;
		if ( ! total || loaded >= total ) {
			return;
		}
		const wanted = Math.min( settings.desktopBatches, Math.ceil( total / settings.batchSize ) );
		if ( wanted < 2 || busy ) {
			return;
		}
		busy = true;
		try {
			await navigate( withBatches( window.location.href, wanted ) );
		} catch ( error ) {
			// The button still works; the top-up is only a convenience.
		}
		busy = false;
		sync();
	};
	if ( 'requestIdleCallback' in window ) {
		window.requestIdleCallback( run, { timeout: 2000 } );
	} else {
		window.setTimeout( run, 600 );
	}
}

/** A filter or sort change carries `sgs_batches` into its URL; go back to batch 1 once. */
function checkFilterReset() {
	const current = signature();
	if ( skipSignature ) {
		skipSignature = false;
		lastSignature = current;
		return;
	}
	if ( current === lastSignature ) {
		return;
	}
	lastSignature = current;
	if ( busy || readBatches( window.location.href ) < 2 ) {
		return;
	}
	busy = true;
	navigate( withBatches( window.location.href, 1 ) )
		.catch( () => {} )
		.finally( () => {
			busy = false;
			lastSignature = signature();
			sync();
		} );
}

/** Remember which product was opened so Back can return to it. */
function onProductClick( event ) {
	const link = event.target instanceof Element ? event.target.closest( ITEM + ' a[href]' ) : null;
	if ( ! link ) {
		return;
	}
	const item = link.closest( ITEM );
	const match = item ? item.className.match( /(?:^|\s)post-(\d+)(?:\s|$)/ ) : null;
	if ( match ) {
		rememberAnchor( window.sessionStorage, anchorKey( window.location ), match[ 1 ], item.getBoundingClientRect().top );
	}
}

function restoreScroll() {
	const navEntry = window.performance.getEntriesByType( 'navigation' )[ 0 ];
	if ( ! navEntry || 'back_forward' !== navEntry.type ) {
		return;
	}
	const anchor = restoreAnchor( window.sessionStorage, anchorKey( window.location ) );
	if ( ! anchor ) {
		return;
	}
	window.history.scrollRestoration = 'manual';
	const apply = () => {
		const card = document.querySelector( ITEM + '.post-' + anchor.id );
		if ( card ) {
			card.scrollIntoView( { block: 'center', behavior: 'instant' } );
		}
	};
	apply();
	// Lazy images settle after load and move the card; centre it once more.
	window.addEventListener( 'load', apply, { once: true } );
}

function init() {
	settings = readSettings();
	if ( ! settings || ! region() ) {
		return;
	}
	lastSignature = signature();
	document.addEventListener( 'click', onProductClick );
	window.addEventListener( 'popstate', () => {
		skipSignature = true;
	} );
	new MutationObserver( schedule ).observe( document.body, { childList: true, subtree: true } );
	restoreScroll();
	sync();
}

if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', init, { once: true } );
} else {
	init();
}

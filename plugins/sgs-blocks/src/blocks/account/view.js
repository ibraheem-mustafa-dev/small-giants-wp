/**
 * sgs/account — Sign in / Create account tabs (authLayout "tabs").
 *
 * Progressive enhancement of the server-rendered ARIA tabs: each tab is a real
 * link to `?mode=…` and the right panel is already visible, so everything works
 * without this module. Here a click or key press switches the panels in place,
 * with roving tabindex, Left/Right/Home/End keys and the address bar kept in
 * step so a reload or a shared link opens the same tab.
 */

import './address-editor';

const TAB_SELECTOR = '[role="tab"][data-sgs-auth-tab]';

/**
 * @param {HTMLElement} tab The tab to open.
 * @param {boolean}     focus Whether to move focus to it.
 */
function select( tab, focus ) {
	const list = tab.closest( '[role="tablist"]' );
	if ( ! list ) {
		return;
	}
	list.querySelectorAll( TAB_SELECTOR ).forEach( ( other ) => {
		const on = other === tab;
		other.setAttribute( 'aria-selected', on ? 'true' : 'false' );
		other.tabIndex = on ? 0 : -1;
		const panel = document.getElementById( other.getAttribute( 'aria-controls' ) );
		if ( panel ) {
			panel.hidden = ! on;
		}
	} );
	if ( focus ) {
		tab.focus();
	}
	const url = new URL( window.location.href );
	url.searchParams.set( 'mode', tab.dataset.sgsAuthTab === 'register' ? 'register' : 'signin' );
	window.history.replaceState( null, '', url );
}

/**
 * @param {Event} event Click or keydown inside a tab list.
 */
function onEvent( event ) {
	const tab = event.target instanceof Element ? event.target.closest( TAB_SELECTOR ) : null;
	if ( ! tab ) {
		return;
	}
	if ( event.type === 'click' ) {
		event.preventDefault();
		select( tab, false );
		return;
	}
	const tabs = Array.from( tab.closest( '[role="tablist"]' ).querySelectorAll( TAB_SELECTOR ) );
	const at = tabs.indexOf( tab );
	let next = null;
	switch ( event.key ) {
		case 'ArrowRight':
			next = tabs[ ( at + 1 ) % tabs.length ];
			break;
		case 'ArrowLeft':
			next = tabs[ ( at - 1 + tabs.length ) % tabs.length ];
			break;
		case 'Home':
			next = tabs[ 0 ];
			break;
		case 'End':
			next = tabs[ tabs.length - 1 ];
			break;
		case ' ':
			next = tab;
			break;
		default:
			return;
	}
	event.preventDefault();
	select( next, true );
}

document.querySelectorAll( '.sgs-account__auth-tabs' ).forEach( ( list ) => {
	list.addEventListener( 'click', onEvent );
	list.addEventListener( 'keydown', onEvent );
} );

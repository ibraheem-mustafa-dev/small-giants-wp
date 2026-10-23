// Fill's theme-token writes (Spec 48 FR-48-81, Spec 32 FR-32-19): three state looks live in the client's
// theme-snapshot.json, not in a block setting, so Fill collects them into one patch beside the filled tree:
//   focus   a keyboard-focus look unlike the hover look → settings.custom.focus (source "draft": the draft's styling wins
//           over the 3:1 contrast rule; lib/snapshot-tokens.mjs::focusTokens)
//   press   an :active look on a block that reads buttonPresets → settings.custom.buttonPresets.<variant>.active-*
//           (lib/snapshot-tokens.mjs::pressTokens)
//   link    a :link, :any-link or :visited look on a plain content link → styles.elements.link[':<state>']
//           (lib/snapshot-tokens.mjs::linkStateTokens, judged by isThemeLink)
// The patch has theme-snapshot.json's own shape and is written beside Fill's other outputs; Fill never edits the
// client's snapshot. One key set by two targets keeps the first value; the later one is reported as a conflict.

import { focusTokens, pressTokens, linkStateTokens } from './snapshot-tokens.mjs';
import { LOOSE } from './resolve.mjs';

export const COVERAGE_WRITES = [
	'css-pseudo-class:active',
	'css-pseudo-class:focus',
	'css-pseudo-class:focus-visible',
	'css-pseudo-class:focus-within',
	'css-pseudo-class:visited',
];

// The declared properties a focus look feeds into settings.custom.focus.
export const FOCUS_PROPS = [ 'outline-width', 'outline-color', 'outline-style', 'outline-offset', 'box-shadow' ];
// The declared properties a pressed look feeds into buttonPresets (the two painted ones, and the colours pressTokens names as gaps).
export const PRESS_PROPS = [ 'transform', 'box-shadow', 'background-color', 'color', 'border-color', 'border-top-color' ];
// The states a theme link takes from styles.elements.link.
export const LINK_STATES = [ 'visited', 'link', 'any-link' ];
// The blocks that paint buttonPresets' pressed tokens (includes/helpers-button-press.php), with the preset variant each uses.
const PRESS_BLOCKS = { 'sgs/button': ( attrs ) => attrs.inheritStyle || 'primary', 'sgs/whatsapp-cta': () => 'default' };

// The preset variant a block's pressed look goes to, or null when the block does not read buttonPresets.
export const pressVariant = ( block, node ) => PRESS_BLOCKS[ block ]?.( node?.attributes || {} ) ?? null;

// The elements that take the site-wide focus ring: links, buttons, summaries and the interactive roles. A form control paints
// its own focus look.
const RING_TAGS = [ 'a', 'button', 'summary' ];
const RING_ROLES = [ 'button', 'tab', 'link', 'menuitem' ];
const takesRing = ( tag, role ) => RING_TAGS.includes( String( tag || '' ).toLowerCase() ) || RING_ROLES.includes( String( role || '' ).toLowerCase() );

// Whether a focus look on this element feeds the ring: never a form control, always an element that takes the ring or whose
// look is outline-only. An element the read did not identify (no tag and no role at any read width) feeds nothing: the
// route is null, a named gap.
const ringFocus = ( { prop, tag, role } ) => {
	if ( [ 'input', 'select', 'textarea' ].includes( String( tag || '' ).toLowerCase() ) ) {
		return false;
	}
	return ( !! tag || !! role ) && ( takesRing( tag, role ) || prop.startsWith( 'outline' ) );
};

// The theme token a state look feeds ('focus', 'press' or 'link'), or null when it goes to a setting. A state the block's own
// settings hold (held) is never a token. A focus look goes to the ring only from an element that takes it (tag and role are
// the target's own; a read with neither, or an outline-only look, is the ring's); a press look only from the block's root
// element (slot ''), since a descendant's pressed look is not the whole button's.
export function tokenRoute( { state, prop, held, block, node, slot = '', tag = null, role = null } ) {
	if ( held.has( state ) ) {
		return null;
	}
	if ( 'focus' === state && FOCUS_PROPS.includes( prop ) ) {
		return ringFocus( { prop, tag, role } ) ? 'focus' : null;
	}
	if ( 'active' === state && '' === slot && PRESS_PROPS.includes( prop ) && null !== pressVariant( block, node ) ) {
		return 'press';
	}
	return LINK_STATES.includes( state ) ? 'link' : null;
}

// The browser's own focus ring, which an element shows when the draft declares no focus outline for it (Chromium's
// user-agent stylesheet: `:focus-visible { outline: auto 1px -webkit-focus-ring-color }`, and
// `a:-webkit-any-link:focus-visible { outline-offset: 1px }`; the colour is -webkit-focus-ring-color as Chromium computes
// it). Fill's declared reads leave user-agent rules out (parity/lib/devtools.mjs::declaredValues), so no read carries it.
export const BROWSER_RING = { 'outline-style': 'auto', 'outline-width': '1px', 'outline-color': 'rgb(16, 16, 16)', 'outline-offset': '0px' };
const LINK_RING_OFFSET = '1px';
const OUTLINE_PROPS = FOCUS_PROPS.filter( ( p ) => p.startsWith( 'outline' ) );
const isFocusState = ( state ) => String( state ).split( '+' ).some( ( s ) => 'focus' === s || 'focus-visible' === s );

// Whether a resting declared map switches the outline off (style none or hidden, or a zero width), so no browser ring
// shows when the element takes focus.
function clearsOutline( rest ) {
	const style = String( rest[ 'outline-style' ] ?? '' ).trim().toLowerCase();
	const width = String( rest[ 'outline-width' ] ?? '' ).trim();
	const short = String( rest.outline ?? '' ).trim().toLowerCase();
	return [ 'none', 'hidden' ].includes( style ) || /^0(?:\.0+)?(?:px|rem|em)?$/.test( width ) || /(?:^|\s)(?:none|hidden|0(?:px)?)(?:\s|$)/.test( short );
}

// The focus look an element shows when the draft declares no focus outline for it: the browser's ring
// (BROWSER_RING, with a link's 1px offset) and no focus shadow unless the draft declares one, merged under the
// draft's own focus look (`focus`, the token look built so far). drafts: the target's state drafts
// (lib/fill-state.mjs::stateDrafts); reads/id: Fill's reads and the target's id (the resting declared values sit at
// reads.declared[width][id]); snap: the target's resting snapshot (tag, href, role). Returns null when the element does
// not take the site ring or the draft declares a focus outline for it (that look is the draft's own); { gap } when the
// draft's resting code clears the outline and it declares no focus shadow either, so the draft shows no focus
// indicator at all: the site ring is kept and the case is reported, never removed (WCAG 2.4.7). Else
// { looks: { focus, focusBrowser } }, focusBrowser naming the properties the browser supplied (applyTokenLooks
// writes those as browser values, which a draft's declared ring replaces).
export function ringLook( { drafts, reads, id, snap = {}, focus } ) {
	const tag = String( snap.tag || '' ).toLowerCase();
	if ( [ 'input', 'select', 'textarea' ].includes( tag ) || ! takesRing( tag, snap.role ) ) {
		return null;
	}
	const declared = [ ...( drafts?.values() || [] ) ].filter( ( d ) => ! d.pseudo && isFocusState( d.state ) ).map( ( d ) => d.prop );
	if ( OUTLINE_PROPS.some( ( p ) => declared.includes( p ) ) ) {
		return null;
	}
	const rests = ROOT_FIRST.map( ( w ) => reads?.declared?.[ w ]?.[ id ] ).filter( Boolean );
	const cleared = rests.find( clearsOutline );
	if ( cleared ) {
		if ( declared.includes( 'box-shadow' ) ) {
			return null;
		}
		const value = Object.fromEntries( [ 'outline', ...OUTLINE_PROPS ].filter( ( p ) => undefined !== cleared[ p ] ).map( ( p ) => [ p, cleared[ p ] ] ) );
		return { gap: { property: 'outline-style', state: 'focus', value: JSON.stringify( value ), reason: 'focus-invisible: the draft clears the outline at rest and declares no focus outline or shadow, so it shows no focus indicator (WCAG 2.4.7); the site ring is kept and the case is left for the owner' } };
	}
	const ring = { ...BROWSER_RING, ...( 'a' === tag && snap.href ? { 'outline-offset': LINK_RING_OFFSET } : {} ), 'box-shadow': 'none' };
	const own = focus || {};
	return { looks: { focus: { ...ring, ...own }, focusBrowser: Object.keys( ring ).filter( ( p ) => undefined === own[ p ] ) } };
}

// The declared property each settings.custom.focus key is mapped from (lib/snapshot-tokens.mjs::focusTokens).
const FOCUS_KEY_PROPS = { width: [ 'outline-width' ], ring: [ 'outline-color' ], offset: [ 'outline-offset' ], near: [ 'box-shadow' ], far: [ 'box-shadow' ], bloom: [ 'box-shadow' ], source: FOCUS_PROPS };

const ROOT_FIRST = [ 1440, 768, 375 ];
// The value a token reads from a look's per-width values: the widest read width that has one.
export const pickValue = ( perWidth ) => perWidth[ ROOT_FIRST.find( ( w ) => undefined !== perWidth[ w ] ) ];

// The snapshot patch under construction: { patch, entries, conflicts, set( path, value, from ) }. `set` writes one leaf by
// its key path; a key already set to another value keeps the first and records the conflict, except that a browser
// value (`from.browser`: the browser's own ring, which the draft never declares) yields to a value the draft declares,
// whichever comes first, and the browser value is recorded as the dropped one.
export function createPatch() {
	const patch = {};
	const entries = [];
	const conflicts = [];
	const set = ( path, value, from ) => {
		let at = patch;
		const name = path.join( '.' );
		for ( const [ i, k ] of path.slice( 0, -1 ).entries() ) {
			// A leaf already set on the way down: the path cannot run under it.
			if ( undefined !== at[ k ] && ( 'object' !== typeof at[ k ] || null === at[ k ] ) ) {
				const above = path.slice( 0, i + 1 ).join( '.' );
				conflicts.push( { path: name, kept: at[ k ], dropped: value, from, keptFrom: entries.find( ( e ) => e.path === above ) } );
				return;
			}
			at = at[ k ] ??= {};
		}
		const key = path[ path.length - 1 ];
		if ( key in at ) {
			const prior = entries.findIndex( ( e ) => e.path === name );
			if ( prior >= 0 && entries[ prior ].browser && ! from?.browser ) {
				if ( JSON.stringify( at[ key ] ) !== JSON.stringify( value ) ) {
					const dropped = entries[ prior ];
					conflicts.push( { path: name, kept: value, dropped: at[ key ], from: dropped, keptFrom: { path: name, value, ...from }, replaced: true } );
				}
				at[ key ] = value;
				entries[ prior ] = { path: name, value, ...from };
				return;
			}
			if ( JSON.stringify( at[ key ] ) !== JSON.stringify( value ) ) {
				const keptFrom = entries[ prior ];
				conflicts.push( { path: name, kept: at[ key ], dropped: value, from, keptFrom, ...( from?.browser && ! keptFrom?.browser ? { replaced: true } : {} ) } );
			}
			return;
		}
		at[ key ] = value;
		entries.push( { path: name, value, ...from } );
	};
	return { patch, entries, conflicts, set };
}

const gapRow = ( from, gap, state, value ) => ( { node: from.node, block: from.block, slot: from.slot, property: gap.split( ':' )[ 0 ], state, value, reason: gap } );

// Flattens { group: { prop: value } } under `base` into leaf sets.
function setLeaves( sink, base, value, from ) {
	for ( const [ k, v ] of Object.entries( value ) ) {
		if ( v && 'object' === typeof v ) {
			setLeaves( sink, [ ...base, k ], v, from );
		} else {
			sink.set( [ ...base, k ], v, from );
		}
	}
}

// Whether a block setting at the target's element already holds a state look (hover, focus, visited), which makes the
// element that setting's own look rather than a theme link: the calibration lists each setting's state and reach.
export function ownedBySetting( cal, slot ) {
	return Object.values( cal?.settings || {} ).some( ( s ) => null != s.state && ( s.reaches || s.slots || [] ).map( LOOSE ).includes( LOOSE( slot ) ) );
}

// Applies one target's token looks. looks: { focus?, active? (the press look), <link state>? }, each a declared map
// (each from the state's drafts, one value per property). from: { node, block, slot, index }. target: { tag, href, role,
// className }. variant: the press variant or null. Writes into `sink` (createPatch) and returns the unmapped rows.
export function applyTokenLooks( { looks, sink, from, target, variant, owned } ) {
	const unmapped = [];
	const asJson = ( d ) => JSON.stringify( d );
	if ( looks.focus ) {
		// A key mapped only from properties the browser supplied (ringLook) is a browser value. The browser's ring is
		// the same on every ground, so its colour also sets the dark-ground ring.
		const browser = looks.focusBrowser || [];
		const fromBrowser = ( k ) => FOCUS_KEY_PROPS[ k ].filter( ( p ) => undefined !== looks.focus[ p ] ).every( ( p ) => browser.includes( p ) );
		const { focus, gaps } = focusTokens( { declared: looks.focus } );
		for ( const [ k, v ] of Object.entries( focus || {} ) ) {
			const ground = fromBrowser( k ) ? { browser: true } : {};
			sink.set( [ 'settings', 'custom', 'focus', k ], v, { ...from, state: 'focus', ...ground } );
			'ring' === k && ground.browser && sink.set( [ 'settings', 'custom', 'focus', 'ringOnDark' ], v, { ...from, state: 'focus', ...ground } );
		}
		unmapped.push( ...gaps.map( ( g ) => gapRow( from, g, 'focus', asJson( looks.focus ) ) ) );
	}
	if ( looks.active ) {
		const { tokens, gaps } = pressTokens( { declared: looks.active }, variant );
		for ( const [ k, v ] of Object.entries( tokens ) ) {
			sink.set( [ 'settings', 'custom', 'buttonPresets', variant, k ], v, { ...from, state: 'active' } );
		}
		unmapped.push( ...gaps.map( ( g ) => gapRow( from, g, 'active', asJson( looks.active ) ) ) );
	}
	for ( const state of LINK_STATES.filter( ( s ) => looks[ s ] ) ) {
		const { state: key, value, gaps } = linkStateTokens( { declared: looks[ state ] }, state, { ...target, ownedBySetting: owned } );
		if ( value ) {
			setLeaves( sink, [ 'styles', 'elements', 'link', key ], value, { ...from, state } );
		}
		unmapped.push( ...gaps.map( ( g ) => gapRow( from, g, state, asJson( looks[ state ] ) ) ) );
	}
	return unmapped;
}

// A conflict as an unmapped row.
export const conflictRow = ( c ) => ( { node: c.from.node, block: c.from.block, slot: c.from.slot, property: c.path, state: c.from.state, value: JSON.stringify( c.dropped ), reason: c.replaced ? `conflict: ${ c.keptFrom.node } ${ c.keptFrom.slot || 'root' } declares ${ c.path } ${ JSON.stringify( c.kept ) }; it replaces the browser ring's ${ JSON.stringify( c.dropped ) } from ${ c.from.node } ${ c.from.slot || 'root' }` : `conflict: ${ c.keptFrom ? `${ c.keptFrom.node } ${ c.keptFrom.slot || 'root' }` : 'an earlier target' } already set ${ c.path } to ${ JSON.stringify( c.kept ) }; ${ c.from.node } ${ c.from.slot || 'root' } wanted ${ JSON.stringify( c.dropped ) }; the first value is kept` } );

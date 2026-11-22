// What the account page's piece reads of a draft (Spec 48 FR-48-87; lib/template-piece-account.mjs): the signed-out prompt
// card, the sign-in and create-account forms, and the signed-in view's panels, each told by structure, never by its words.
// Two sources give one shape of tree, so one reader serves both:
//   - inventoryTree: the shown elements of the surface's inventory under one element (the account region the skeleton
//     placed the block at), each with its opening tag's attributes and its own words;
//   - templateTree: a draft file's template as written (lib/shop-parts-read.mjs::parseTemplate), with its conditions
//     (`sc-if`, `sc-else`) and loops (`sc-for`) as nodes, for a draft page or state the inventory did not render.
// A node is { key, tag, attrs (lower-cased names; the draft runtime's `sc-camel-auto-complete` read as `autocomplete`),
// text (its own words, spaces squashed), children, parent }.
// The forms are told apart by HTML's own autocomplete tokens (data/account-parts.json `tokens`):
//   - the sign-in form holds a current-password field and an email or username field, and no new-password field;
//   - the create-account form holds a new-password field and an email or username field, and no current-password field;
//   - the signed-in view's details form holds a current-password and a new-password field (the password change).
import { openTag } from './template-piece-draft.mjs';

const ws = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
const NOT_TYPED = [ 'checkbox', 'radio', 'hidden', 'submit', 'button', 'reset', 'image', 'file', 'range', 'color' ];
const HEADING = /^h[1-6]$/;
const CONDITIONS = [ 'sc-if', 'sc-else' ];
const camel = ( name ) => ( name.startsWith( 'sc-camel-' ) ? name.slice( 9 ).replace( /-/g, '' ) : name );

// An opening tag's attributes, names lower-cased and the runtime's `sc-camel-<kebab>` spelling read as the property's name.
export function tagAttrs( tag ) {
	const out = {};
	for ( const m of String( tag || '' ).replace( /^<[a-z0-9-]+/i, '' ).matchAll( /\s([^\s=>"'/]+)(?:="([^"]*)"|='([^']*)')?/g ) ) {
		out[ camel( m[ 1 ].toLowerCase() ) ] = m[ 2 ] ?? m[ 3 ] ?? '';
	}
	return out;
}

// Plain words: some, and no live value (`{{ x }}`) among them.
export const plain = ( text ) => !! ws( text ) && ! /\{\{/.test( text );
// The `{{ x }}` key a value names, or null.
export const holeKey = ( value ) => /^\s*\{\{\s*([^}\s]+)\s*\}\}\s*$/.exec( String( value ?? '' ) )?.[ 1 ] ?? null;

// The inventory under `rootKey` (included) as a node tree, shown elements only; null when the inventory has no such element.
export function inventoryTree( inventory, rootKey ) {
	const els = ( inventory?.elements || [] ).filter( ( e ) => Object.values( e.visible || {} ).some( Boolean ) );
	const byParent = new Map();
	els.forEach( ( e ) => byParent.set( e.parentKey, [ ...( byParent.get( e.parentKey ) || [] ), e ] ) );
	const make = ( e, parent ) => {
		const node = { key: e.key, tag: e.tag, attrs: { ...tagAttrs( openTag( e.snippet ) ), ...Object.fromEntries( Object.entries( e.attrs || {} ).map( ( [ k, v ] ) => [ k.toLowerCase(), v ] ) ) }, text: ws( e.srcOwnText ?? e.words ), children: [], parent };
		node.children = ( byParent.get( e.key ) || [] ).map( ( c ) => make( c, node ) );
		return node;
	};
	const root = els.find( ( e ) => e.key === rootKey );
	return root ? make( root, null ) : null;
}

// A parsed template (lib/shop-parts-read.mjs::parseTemplate) as a node tree: its elements, script and style left out.
export function templateTree( parsed ) {
	const make = ( el, parent ) => {
		const node = { key: `tpl:${ el.tpl ?? `n${ el.n }` }`, tag: el.tag, attrs: Object.fromEntries( Object.entries( el.attrs || {} ).map( ( [ k, v ] ) => [ camel( k.toLowerCase() ), v ] ) ), text: ws( ( el.children || [] ).filter( ( c ) => ! c.tag ).map( ( c ) => c.text ).join( ' ' ) ), children: [], parent };
		node.children = ( el.children || [] ).filter( ( c ) => c.tag && ! [ 'script', 'style' ].includes( c.tag ) ).map( ( c ) => make( c, node ) );
		return node;
	};
	return make( parsed, null );
}

// Every node under `node`, itself first, depth-first in the draft's order.
export function below( node ) {
	const out = [];
	const go = ( n ) => {
		out.push( n );
		n.children.forEach( go );
	};
	node && go( node );
	return out;
}
const ancestors = ( n, upTo = null ) => {
	const out = [];
	for ( let p = n.parent; p && p !== upTo; p = p.parent ) {
		out.push( p );
	}
	return out;
};
const typeOf = ( n ) => String( n.attrs.type ?? '' ).toLowerCase();
const tokenOf = ( n ) => String( n.attrs.autocomplete ?? '' ).toLowerCase().trim();
const isField = ( n ) => [ 'input', 'select', 'textarea' ].includes( n.tag ) && ! NOT_TYPED.includes( typeOf( n ) );
const isTick = ( n ) => 'input' === n.tag && 'checkbox' === typeOf( n );
const isControl = ( n ) => [ 'a', 'button' ].includes( n.tag ) || ( 'input' === n.tag && [ 'submit', 'button' ].includes( typeOf( n ) ) );
// A control submits its form: a submit button, or a button that names no type and runs no handler of its own.
const submits = ( n ) => ( 'button' === n.tag && ( 'submit' === typeOf( n ) || ( ! typeOf( n ) && ! n.attrs.onclick ) ) ) || ( 'input' === n.tag && 'submit' === typeOf( n ) );
const controlWords = ( n ) => ws( 'input' === n.tag ? n.attrs.value : below( n ).map( ( x ) => x.text ).join( ' ' ) );
// The words of the label holding a field: the label's own words, the field's own `aria-label` when no label holds it.
const labelOf = ( field ) => ancestors( field ).find( ( a ) => 'label' === a.tag )?.text || ws( field.attrs['aria-label'] ) || null;

export const hasPassword = ( scope ) => below( scope ).some( ( n ) => 'input' === n.tag && 'password' === typeOf( n ) );

// The sign-in and create-account forms of a scope by their fields' tokens: { signIn, register } (each a form node or null
// when not exactly one form is that form).
export function authForms( scope, tokens ) {
	const forms = below( scope ).filter( ( n ) => 'form' === n.tag );
	const facts = ( f ) => {
		const t = below( f ).filter( isField ).map( ( n ) => ( { n, token: tokenOf( n ), type: typeOf( n ) } ) );
		return { current: t.some( ( x ) => x.token === tokens.currentPassword ), fresh: t.some( ( x ) => x.token === tokens.newPassword ), identity: t.some( ( x ) => tokens.identity.includes( x.token ) || 'email' === x.type ) };
	};
	const one = ( list ) => ( 1 === list.length ? list[ 0 ] : null );
	return {
		signIn: one( forms.filter( ( f ) => facts( f ).current && ! facts( f ).fresh && facts( f ).identity ) ),
		register: one( forms.filter( ( f ) => facts( f ).fresh && ! facts( f ).current && facts( f ).identity ) ),
	};
}

// The draft's words for the forms' parts: { found: [ { part, value, at } ], gaps: [ text ] }. `part` names an entry of
// data/account-parts.json `form`. A part whose words carry a live value is a gap, never a write.
export function formWords( scope, tokens ) {
	const found = [];
	const gaps = [];
	const word = ( part, n, value ) => ( plain( value ) ? found.push( { part, value: ws( value ), at: n.key } ) : gaps.push( `${ part }: the draft's words at ${ n.key } carry a live value ("${ ws( value ) }"), so the block's own are kept` ) );
	const fixed = ( part, n ) => found.push( { part, value: true, at: n.key } );
	const { signIn, register } = authForms( scope, tokens );
	const heading = ( f ) => below( f ).find( ( n ) => HEADING.test( n.tag ) );
	const submit = ( f ) => below( f ).filter( submits );
	if ( ! signIn ) {
		gaps.push( 'sign-in form: no single form holds a current-password field and an email or username field, so its words are not read' );
	} else {
		const s = submit( signIn );
		1 === s.length && word( 'signInSubmit', s[ 0 ], controlWords( s[ 0 ] ) );
		heading( signIn ) && word( 'signInHeading', heading( signIn ), heading( signIn ).text );
		const id = below( signIn ).find( ( n ) => isField( n ) && ( tokens.identity.includes( tokenOf( n ) ) || 'email' === typeOf( n ) ) );
		id && labelOf( id ) && word( 'identityLabel', id, labelOf( id ) );
		const ticks = below( signIn ).filter( isTick );
		1 === ticks.length && labelOf( ticks[ 0 ] ) && word( 'remember', ticks[ 0 ], labelOf( ticks[ 0 ] ) );
		0 === ticks.length && fixed( 'noRemember', signIn );
		// The form's one other control (no submit, outside a label) leaves for the lost-password step.
		const other = below( signIn ).filter( ( n ) => n !== signIn && isControl( n ) && ! submits( n ) && ! ancestors( n, signIn ).some( ( a ) => 'label' === a.tag ) );
		1 === other.length && word( 'lostPassword', other[ 0 ], controlWords( other[ 0 ] ) );
		other.length > 1 && gaps.push( `lostPassword: the sign-in form holds ${ other.length } other controls (${ other.map( ( n ) => n.key ).join( ', ' ) }), so none is taken for the lost-password link` );
		const pw = below( signIn ).find( ( n ) => tokenOf( n ) === tokens.currentPassword );
		pw && labelOf( pw ) && gaps.push( `the sign-in password field's label ("${ labelOf( pw ) }", ${ pw.key }) has no setting of the block` );
	}
	if ( ! register ) {
		gaps.push( 'create-account form: no single form holds a new-password field and an email or username field, so its words are not read' );
	} else {
		const s = submit( register );
		1 === s.length && word( 'registerSubmit', s[ 0 ], controlWords( s[ 0 ] ) );
		heading( register ) && word( 'registerHeading', heading( register ), heading( register ).text );
		const email = below( register ).find( ( n ) => isField( n ) && ( tokens.identity.includes( tokenOf( n ) ) || 'email' === typeOf( n ) ) );
		email && labelOf( email ) && word( 'registerEmailLabel', email, labelOf( email ) );
		const given = below( register ).find( ( n ) => tokenOf( n ) === tokens.givenName );
		given && fixed( 'givenName', given );
		const family = below( register ).find( ( n ) => tokenOf( n ) === tokens.familyName );
		family && fixed( 'familyName', family );
		const ticks = below( register ).filter( isTick );
		if ( 1 === ticks.length ) {
			fixed( 'optIn', ticks[ 0 ] );
			labelOf( ticks[ 0 ] ) && word( 'optInLabel', ticks[ 0 ], labelOf( ticks[ 0 ] ) );
		}
		const pw = below( register ).find( ( n ) => tokenOf( n ) === tokens.newPassword );
		const label = pw && ancestors( pw ).find( ( a ) => 'label' === a.tag );
		// A hint is an element of the password's label after the field, with words of its own.
		const hint = label ? below( label ).find( ( n ) => n !== label && n !== pw && plain( n.text ) && below( label ).indexOf( n ) > below( label ).indexOf( pw ) ) : null;
		hint && word( 'passwordHint', hint, hint.text );
		pw?.attrs.placeholder && gaps.push( `the create-account password field's placeholder ("${ pw.attrs.placeholder }", ${ pw.key }) has no setting of the block` );
		label && gaps.push( `the create-account password field's label ("${ label.text }", ${ pw.key }) has no setting of the block` );
	}
	return { found, gaps, forms: { signIn, register } };
}

// The condition key a node shows under: its nearest condition's `{{ key }}`, or null.
const conditionKey = ( n ) => holeKey( ancestors( n ).find( ( a ) => CONDITIONS.includes( a.tag ) )?.attrs.value );

// The sign-in tabs of a template scope: two `role="tab"` controls, each selected (`aria-selected`) by the key whose condition
// shows the sign-in or the create-account form. { found, gaps } as formWords.
export function tabWords( scope, forms ) {
	const tabs = below( scope ).filter( ( n ) => 'tab' === String( n.attrs.role ?? '' ).toLowerCase() );
	if ( ! tabs.length ) {
		return { found: [], gaps: [] };
	}
	const of = ( form ) => ( form ? tabs.filter( ( t ) => holeKey( t.attrs['aria-selected'] ) && holeKey( t.attrs['aria-selected'] ) === conditionKey( form ) ) : [] );
	const a = of( forms.signIn );
	const b = of( forms.register );
	if ( 2 !== tabs.length || 1 !== a.length || 1 !== b.length ) {
		return { found: [], gaps: [ `tabs: ${ tabs.length } tab(s) (${ tabs.map( ( t ) => t.key ).join( ', ' ) }) are not one per form, each selected by the condition showing that form, so the layout and tab words are left to the block` ] };
	}
	const found = [ { part: 'tabs', value: true, at: a[ 0 ].key } ];
	const gaps = [];
	for ( const [ part, t ] of [ [ 'signInTab', a[ 0 ] ], [ 'registerTab', b[ 0 ] ] ] ) {
		plain( controlWords( t ) ) ? found.push( { part, value: controlWords( t ), at: t.key } ) : gaps.push( `${ part }: the tab's words at ${ t.key } carry a live value, so the block's own are kept` );
	}
	return { found, gaps };
}

// The signed-out prompt card (a scope holding no password field): its one heading, its one line of text and the links that
// `leads( href )` says go to the sign-in surface, the bare one the sign-in button and the one with a query its register
// variant. { heading, copy, signIn, register, gaps } (each part a node or null).
export function promptParts( scope, leads ) {
	const gaps = [];
	const all = below( scope );
	const inControl = ( n ) => isControl( n ) || ancestors( n, scope ).some( isControl );
	const headings = all.filter( ( n ) => HEADING.test( n.tag ) );
	const texts = all.filter( ( n ) => ! HEADING.test( n.tag ) && ! inControl( n ) && ! ancestors( n, scope ).some( ( a ) => HEADING.test( a.tag ) ) && n.text && ! below( n ).some( ( d ) => d !== n && isControl( d ) ) );
	const links = all.filter( ( n ) => isControl( n ) && leads( n.attrs.href ) );
	const bare = links.filter( ( n ) => ! /[?]/.test( String( n.attrs.href ) ) );
	const variant = links.filter( ( n ) => /[?]/.test( String( n.attrs.href ) ) );
	1 !== headings.length && gaps.push( `prompt heading: ${ headings.length } headings in the card, so none is taken` );
	1 !== texts.length && gaps.push( `prompt text: ${ texts.length } lines of text in the card (${ texts.map( ( n ) => n.key ).join( ', ' ) }), so none is taken` );
	1 !== bare.length && gaps.push( `sign-in button: ${ bare.length } links to the sign-in page without a query in the card, so none is taken` );
	variant.length > 1 && gaps.push( `create-account button: ${ variant.length } links to the sign-in page with a query in the card, so none is taken` );
	return { heading: 1 === headings.length ? headings[ 0 ] : null, copy: 1 === texts.length ? texts[ 0 ] : null, signIn: 1 === bare.length ? bare[ 0 ] : null, register: 1 === variant.length ? variant[ 0 ] : null, gaps, words: controlWords };
}

// The signed-in view of an account draft's template: the panels beside the details panel (the condition holding the one
// password-change form, whose parent holds two or more conditions: one panel each), the addresses panel (a panel holding an
// address field), each panel's heading (its first heading outside a form, loop or inner condition) and the account
// menu's one control outside its loop of tabs (sign out). { found, gaps } as formWords.
export function signedInWords( root, tokens ) {
	const found = [];
	const gaps = [];
	const forms = below( root ).filter( ( n ) => 'form' === n.tag );
	const change = forms.filter( ( f ) => below( f ).some( ( n ) => tokenOf( n ) === tokens.currentPassword ) && below( f ).some( ( n ) => tokenOf( n ) === tokens.newPassword ) );
	if ( 1 !== change.length ) {
		return { found, gaps: [ `signed-in view: ${ change.length } password-change forms in the account draft, so its panels are not read` ] };
	}
	const isPanel = ( c ) => CONDITIONS.includes( c.tag ) && c.parent && c.parent.children.filter( ( s ) => CONDITIONS.includes( s.tag ) ).length >= 2;
	const details = ancestors( change[ 0 ] ).find( isPanel );
	if ( ! details ) {
		return { found, gaps: [ 'signed-in view: the password-change form stands in no panel beside other panels, so the panels are not read' ] };
	}
	const panels = details.parent.children.filter( ( c ) => CONDITIONS.includes( c.tag ) );
	const headingOf = ( p ) => below( p ).find( ( n ) => HEADING.test( n.tag ) && ! ancestors( n, p ).some( ( a ) => [ 'form', 'sc-for', ...CONDITIONS ].includes( a.tag ) ) ) || null;
	const take = ( part, h, what ) => ( h && plain( h.text ) ? found.push( { part, value: h.text, at: h.key } ) : gaps.push( `${ what } panel: no heading of plain words, so its tab heading is left to the block` ) );
	take( 'detailsHeading', headingOf( details ), 'account details' );
	const addresses = panels.filter( ( p ) => p !== details && below( p ).some( ( n ) => isField( n ) && tokens.address.includes( tokenOf( n ) ) ) );
	1 === addresses.length ? take( 'addressesHeading', headingOf( addresses[ 0 ] ), 'addresses' ) : gaps.push( `addresses panel: ${ addresses.length } panels hold an address field, so none is taken` );
	found.some( ( f ) => /Heading$/.test( f.part ) ) && found.push( { part: 'headings', value: true, at: details.key } );
	for ( const p of panels.filter( ( x ) => x !== details && ! addresses.includes( x ) ) ) {
		const h = headingOf( p );
		gaps.push( `panel ${ p.key } (shown by "${ ws( p.attrs.value ) }"${ h ? `, heading "${ h.text }"` : '' }): no structural tell says which account tab it is (orders, order detail, a subscription or saved items list), so its words are not written` );
	}
	// The account menu: the nearest container of the panels that holds a nav; its controls outside the loop of tabs.
	const nav = ancestors( details ).map( ( a ) => below( a ).find( ( n ) => 'nav' === n.tag ) ).find( Boolean );
	const outside = nav ? below( nav ).filter( ( n ) => isControl( n ) && ! ancestors( n, nav ).some( ( a ) => 'sc-for' === a.tag ) ) : [];
	if ( 1 === outside.length && plain( controlWords( outside[ 0 ] ) ) ) {
		found.push( { part: 'signOut', value: controlWords( outside[ 0 ] ), at: outside[ 0 ].key } );
	} else {
		gaps.push( `sign out: ${ nav ? `the account menu holds ${ outside.length } controls outside its loop of tabs` : 'no account menu (nav) beside the panels' }, so its words are left to the block` );
	}
	nav && below( nav ).some( ( n ) => 'sc-for' === n.tag ) && gaps.push( 'account menu: the tab names are a loop over draft data (read only from the draft\'s logic), so the menu\'s labels are left to the block' );
	return { found, gaps };
}

// The lines of words in an account region outside its forms: shown text that is no heading (nor inside one), no control (nor inside
// one) and not inside a form. A signed-out card's own text line is one; a guest line beside it ("No account? Check out as a guest")
// would be a second.
export function looseLines( scope ) {
	const out = below( scope ).filter( ( n ) => n.text && ! HEADING.test( n.tag ) && ! isControl( n ) && ! ancestors( n, scope ).some( ( a ) => HEADING.test( a.tag ) || isControl( a ) || 'form' === a.tag ) && 'form' !== n.tag );
	return out;
}

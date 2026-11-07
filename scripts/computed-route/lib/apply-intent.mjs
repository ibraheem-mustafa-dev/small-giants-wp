// How the draft opens a menu's panel: the handler its menu buttons run on mouse enter and on focus, and whether that handler waits.
// A handler that opens the panel at once is an intent delay of 0; one that waits on a timer is that timer's delay. The header
// menu's `submenuIntentDelay` (milliseconds the pointer rests on an item before its panel opens) is written from it. The draft's
// source is the handoff's component file (`sites/<client>/handoff/*.dc.html`), read as text.
import fs from 'node:fs';
import path from 'node:path';
import { declaredAttr } from './fill-behaviour.mjs';
import { settle } from './apply-chrome-records.mjs';

// The component source of a client's draft: every `.dc.html` of its handoff folder, joined.
export function loadDraftSource( repo, client ) {
	const dir = path.join( repo, 'sites', client, 'handoff' );
	return fs.existsSync( dir ) ? fs.readdirSync( dir ).filter( ( f ) => f.endsWith( '.dc.html' ) ).sort().map( ( f ) => fs.readFileSync( path.join( dir, f ), 'utf8' ) ).join( '\n' ) : '';
}

// The body of the method `name` in the component source, by brace matching from its declaration; '' when it is not declared.
function bodyOf( source, name ) {
	const start = new RegExp( `(?:^|\\n)\\s*${ name }\\s*(?:\\([^)]*\\)\\s*\\{|=\\s*\\([^)]*\\)\\s*=>\\s*\\{?)` ).exec( source );
	if ( ! start ) {
		return '';
	}
	const from = start.index + start[ 0 ].length;
	if ( ! /\{$/.test( start[ 0 ] ) ) {
		return source.slice( from, source.indexOf( '\n', from ) );
	}
	let depth = 1;
	let i = from;
	for ( ; i < source.length && depth > 0; i++ ) {
		depth += '{' === source[ i ] ? 1 : '}' === source[ i ] ? -1 : 0;
	}
	return source.slice( from, i );
}

// The milliseconds the draft waits between the pointer entering a menu button and its panel opening: { ms, via } or null when the
// draft names no such handler. A button's enter and focus run one handler (`onMouseEnter` and `onFocus` of the same element).
export function openDelayOf( source ) {
	const handler = /onMouseEnter="\{\{\s*([\w.]+)\s*\}\}"[^>]*onFocus="\{\{\s*\1\s*\}\}"/.exec( String( source ?? '' ) )?.[ 1 ];
	const prop = handler?.split( '.' ).pop();
	const call = prop && new RegExp( `${ prop }\\s*:\\s*\\([^)]*\\)\\s*=>\\s*(?:this\\.)?(\\w+)\\(` ).exec( source )?.[ 1 ];
	if ( ! call ) {
		return null;
	}
	const body = bodyOf( source, call );
	if ( ! body ) {
		return null;
	}
	const timer = /setTimeout\([\s\S]*?,\s*(\d+)\s*\)/.exec( body );
	return { ms: timer ? Number( timer[ 1 ] ) : 0, via: call };
}

// The header menu's intent delay as the draft opens its panels.
export function menuIntent( { target, block, saved, clientData, db } ) {
	const open = openDelayOf( clientData?.draftSource );
	if ( ! open ) {
		return [];
	}
	if ( ! declaredAttr( block, 'submenuIntentDelay', db ) ) {
		return [ { status: 'no-setting', prop: 'submenuIntentDelay', why: `${ block } declares no submenuIntentDelay for the draft's ${ open.ms }ms open delay` } ];
	}
	return [ settle( { prop: 'submenuIntentDelay', why: `${ target.tpl } the draft opens a panel ${ 0 === open.ms ? 'on enter, with no delay' : `${ open.ms }ms after enter` } (${ open.via })`, saved, writes: [ { attr: 'submenuIntentDelay', value: open.ms } ] } ) ];
}

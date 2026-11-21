// rules.backToTop by what a control does: a click handler that scrolls the page to its top and writes no state is a
// back-to-top control whatever it is called (lib/skeleton-scroll-top.mjs::handlerScrollsTop); a handler that navigates and
// then scrolls is not. Fixed to the viewport, the control is the Floating UI panel's back-to-top (a handover, no block);
// in the page flow it is the block with its link source set to top. Tests marked MUST FAIL fail before the change.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { handlerScrollsTop } from '../lib/skeleton-scroll-top.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();

// A temp folder holding the draft `Root.dc.html` whose renderVals are `vals`; returns { folder, record }.
function draft( vals, members = '' ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'stt-' ) );
	const text = `<x-dc name="Root"><div></div></x-dc>\n<script data-dc-script>\nclass Component {\n\tstate = { view: 'home' };\n${ members }\n\trenderVals() {\n\t\treturn { ${ vals } };\n\t}\n}\n</script>\n`;
	fs.writeFileSync( path.join( dir, 'Root.dc.html' ), text );
	return { folder: dir, record: { sources: { files: { 'Root.dc.html': crypto.createHash( 'sha256' ).update( text ).digest( 'hex' ) } } } };
}
const at = ( d, handler ) => handlerScrollsTop( { ...d, component: 'Root', handler } );

test( 'MUST FAIL: a handler that scrolls the page to its top and writes no state scrolls to the top, whatever its name', () => {
	const d = draft( "up: () => window.scrollTo( 0, 0 ), lift: () => { try { window.scrollTo( { top: 0, behavior: 'smooth' } ); } catch ( e ) { window.scrollTo( 0, 0 ); } }, rise: this.rise, root: () => document.documentElement.scrollTo( { top: 0 } )", "\trise = () => window.scroll( { top: 0, left: 0 } );" );
	assert.equal( at( d, 'up' ), true );
	assert.equal( at( d, 'lift' ), true );
	assert.equal( at( d, 'rise' ), true, 'a this.<name> member naming the function' );
	assert.equal( at( d, 'root' ), true );
} );

test( 'negative controls: a navigation that scrolls, a scroll elsewhere, a panel scroll, no handler', () => {
	const d = draft( "go: () => { this.setState( { view: 'shop' } ); window.scrollTo( 0, 0 ); }, down: () => window.scrollTo( 0, 600 ), panel: () => this.panel.scrollTo( { top: 0 } ), left: () => window.scrollTo( { left: 0 } ), nothing: () => null" );
	assert.equal( at( d, 'go' ), false, 'navigating to another view is not back to top' );
	assert.equal( at( d, 'down' ), false );
	assert.equal( at( d, 'panel' ), false, 'scrolling a panel is not the page' );
	assert.equal( at( d, 'left' ), false );
	assert.equal( at( d, 'nothing' ), false );
	assert.equal( at( d, 'missing' ), false );
	assert.equal( at( d, '' ), false );
} );

// A page whose footer row holds a "Back to top" control (Root/5#0) placed by `position`.
const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const el = ( key, parentKey, tag, words = '', x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.attrs || {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: { 375: { x: 0, y: 100, w: 120, h: 40 }, 768: { x: 0, y: 100, w: 120, h: 40 }, 1440: { x: 0, y: 100, w: 120, h: 40 } }, visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {}, ...( x.position ? { position: x.position } : {} ) } );
const inv = ( position ) => ( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements: [
	el( 'Root/1#0', null, 'div', '', { depth: 0 } ),
	el( 'Root/2#0', 'Root/1#0', 'section', '', { depth: 1 } ),
	el( 'Root/3#0', 'Root/2#0', 'h2', 'Our story', { depth: 2 } ),
	el( 'Root/4#0', 'Root/2#0', 'p', 'Three generations of family baking, done by hand every morning.', { depth: 2 } ),
	el( 'Root/5#0', 'Root/2#0', 'button', 'Back to top', { depth: 2, position } ),
] } );
const run = ( position ) => proposeSkeleton( { inventory: inv( position ), facts: loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } ), surface: 'test', db } );

test( 'MUST FAIL: a back-to-top control fixed to the viewport is the Floating UI panel\'s back-to-top, a handover and no block', () => {
	const { skeleton, proposal } = run( { 375: 'fixed', 768: 'fixed', 1440: 'fixed' } );
	const row = proposal.rows.find( ( r ) => 'Root/5#0' === r.key );
	assert.equal( row.rule, 'backToTop' );
	assert.equal( row.action, 'remove' );
	assert.match( JSON.stringify( row.handover ?? skeleton ), /Floating UI/ );
} );

test( 'in the page flow it is the button with its link source set to top', () => {
	const { proposal } = run( undefined );
	const row = proposal.rows.find( ( r ) => 'Root/5#0' === r.key );
	assert.equal( row.rule, 'backToTop' );
	assert.equal( row.block ?? row.candidates?.[ 0 ]?.block, 'sgs/button' );
} );

// A footer whose control (Root/3) runs `click`: its fact record names the draft above, so the rule reads the handler.
function footer( click ) {
	const d = draft( "lift: () => window.scrollTo( { top: 0, behavior: 'smooth' } ), go: () => { this.setState( { view: 'shop' } ); window.scrollTo( 0, 0 ); }" );
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'stt-repo-' ) );
	const dir = path.join( repo, 'sites', 'fixture-client', 'handoff' );
	fs.mkdirSync( dir, { recursive: true } );
	fs.copyFileSync( path.join( d.folder, 'Root.dc.html' ), path.join( dir, 'Root.dc.html' ) );
	const list = [ [ 1, null, 'footer', '' ], [ 2, 1, 'p', 'Made by hand in a small kitchen, every single day of the week.' ], [ 3, 1, 'button', 'Return', click ] ];
	const rec = ( n, parent, tag, c ) => ( { template: { key: `Root/${ n }`, component: 'Root', n: String( n ), tag, realTag: tag, attrs: c ? { onClick: `{{ ${ c } }}` } : {}, style: { static: [], holes: [] }, pseudo: {}, holes: [], parent: parent ? `Root/${ parent }` : null, realParent: parent ? `Root/${ parent }` : null, parentChain: parent ? [ `Root/${ parent }` ] : [], membership: { scIf: [], scFor: [], dcImport: [] }, own: {}, inHelmet: false, inFor: false, ref: null, hooks: {}, events: [], words: '', srcLine: n }, logic: { holes: {} }, surfaces: [], instances: [], fingerprint: {} } );
	const factRecord = { schema: '1', client: 'fixture-client', elements: Object.fromEntries( list.map( ( [ n, p, tag, , c ] ) => [ `Root/${ n }`, rec( n, p, tag, c ) ] ) ), surfaces: {}, sources: d.record.sources };
	const elements = list.map( ( [ n, p, tag, words, c ] ) => ( { ...el( `Root/${ n }#0`, p ? `Root/${ p }#0` : null, tag, words, { depth: p ? 1 : 0 } ), snippet: `<${ tag } data-dc-tpl="${ n }"${ c ? ` sc-camel-on-click="{{ ${ c } }}"` : '' }>${ words }</${ tag }>` } ) );
	const f = { ...loadFacts( { db, client: 'fixture-client', repo: REPO } ), repo };
	return proposeSkeleton( { inventory: { generated: 'test', source: 'test', root: 'footer', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements }, facts: f, surface: 'footer', surfaceKind: 'footer', surfaceName: 'Footer', db, factRecord } );
}

test( 'MUST FAIL: a control whose handler scrolls the page to its top is the back-to-top button, whatever its words and name', () => {
	const row = footer( 'lift' ).proposal.rows.find( ( r ) => 'Root/3#0' === r.key );
	assert.equal( row.rule, 'backToTop' );
	assert.notEqual( footer( 'go' ).proposal.rows.find( ( r ) => 'Root/3#0' === r.key ).rule, 'backToTop', 'a navigation that scrolls is not back to top' );
} );

// Spec 48 FR-48-85's done-when for the draft reading wave's CSS: a planted draft using the CSS functions, the fr unit
// and the structural pseudo-classes the coverage map now covers raises no seen-but-unsupported row (FR-48-34), and with
// any one entry's coverage removed the same draft raises that row again. The draft is read through the real usage read
// (lib/intake-usage.mjs::draftUsage) and judged against the real coverage map (data/clone-coverage.json) by intake's
// missing-features rule (lib/intake-missing.mjs::coverageMissing). tests/css-functions.test.mjs proves the writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { allEntries, readInventoryFile } from '../lib/capabilities.mjs';
import { draftUsage } from '../lib/intake-usage.mjs';
import { coverageMissing } from '../lib/intake-missing.mjs';
import { loadCoverage } from '../lib/clone-coverage.mjs';

const KNOWN = new Set( allEntries( readInventoryFile() ).map( ( e ) => e.id ) );
const CSS = [
	'.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}',
	'.panel{background-image:linear-gradient(90deg,#1f7a7a,#145050),radial-gradient(circle at 30% 20%,#f59e0b,transparent 60%)}',
	'.note{background-image:repeating-linear-gradient(transparent 0 23px,#e6dcc8 24px)}',
	'.reveal{filter:blur(4px) grayscale(.35);clip-path:inset(10%)}',
	':root{color:#222}',
	'li:first-child,li:last-child,li:only-child,li:nth-child(2n),li:nth-last-child(2){margin:0}',
	'p:first-of-type,p:last-of-type,p:only-of-type,p:nth-of-type(3),p:nth-last-of-type(1){margin:0}',
	':is(h2,h3):not(.x),:where(.card) > p,.card:has(img),:heading,:dir(ltr),:lang(en),:scope{margin:0}',
].join( '\n' );
const DRAFT = [ { component: 'Page', stamped: { elements: [ { n: '1', tag: 'style', attrs: [], body: CSS }, { n: '2', tag: 'section', attrs: [] } ] } } ];
const WAVE = [
	'css-function:repeat', 'css-function:minmax', 'css-unit:fr', 'css-function:linear-gradient', 'css-function:radial-gradient', 'css-function:repeating-linear-gradient', 'css-function:blur', 'css-function:grayscale', 'css-function:inset',
	...[ 'root', 'first-child', 'last-child', 'only-child', 'nth-child', 'nth-last-child', 'first-of-type', 'last-of-type', 'only-of-type', 'nth-of-type', 'nth-last-of-type', 'is', 'not', 'where', 'has', 'heading', 'dir', 'lang', 'scope' ].map( ( n ) => `css-pseudo-class:${ n }` ),
];
const rowsFor = ( coverage ) => coverageMissing( { census: { rows: [] }, coverage, usage: draftUsage( { sources: DRAFT, known: KNOWN } ).usage } );

test( 'the planted draft uses each of the wave capabilities it is meant to', () => {
	const usage = draftUsage( { sources: DRAFT, known: KNOWN } ).usage;
	for ( const id of WAVE ) {
		assert.ok( usage.has( id ), `${ id } is read from the draft` );
	}
} );

test( 'MUST FAIL: the draft raises no seen-but-unsupported row for a covered capability, and raises it again with the entry removed', () => {
	const coverage = loadCoverage();
	const raised = new Set( rowsFor( coverage ).map( ( r ) => r.construct ) );
	for ( const id of WAVE ) {
		assert.ok( coverage.entries[ id ]?.write, `${ id } has a write reference` );
		assert.ok( ! raised.has( id ), `${ id } raises no row while it is covered` );
		const removed = { ...coverage, entries: { ...coverage.entries, [ id ]: { recognise: null, write: null, check: null, wave: 'draft reading' } } };
		const row = rowsFor( removed ).find( ( r ) => r.construct === id );
		assert.ok( row, `${ id } raises its row again with its coverage removed` );
		assert.match( row.why, /no clone path yet \(has nothing; wave draft reading\)/ );
	}
} );

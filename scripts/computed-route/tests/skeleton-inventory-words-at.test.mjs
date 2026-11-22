// lib/skeleton-inventory.mjs::summarise keeps `wordsAt` (the element's own words at 375, 768 and 1440) on an element whose
// words differ by width (a script value that is shorter on a phone), and nowhere else. Synthetic per-width reads in the
// shape collect() returns. Tests marked MUST FAIL fail before the change; each carries its negative control.
import test from 'node:test';
import assert from 'node:assert/strict';
import { summarise, INVENTORY_WIDTHS } from '../lib/skeleton-inventory.mjs';

const rec = ( key, words ) => ( { i: 0, key, tpl: 1, template: 'Root', tag: 'span', srcTag: 'span', words, allText: words, attrs: {}, box: { x: 0, y: 0, w: 50, h: 10 }, visible: true, display: 'block', position: 'static', resolved: {} } );
const runs = ( words ) => Object.fromEntries( INVENTORY_WIDTHS.map( ( w ) => [ w, { records: [ rec( 'Root/1#0', words[ w ] ) ], rootName: 'Root', rootKey: 'Root/1#0', unstamped: [] } ] ) );
const run = ( words ) => summarise( { runs: runs( words ), shots: {}, skipped: [], url: 'x', root: 'Root' } ).elements[ 0 ];

test( 'MUST FAIL: words that differ by width are kept per width', () => {
	const e = run( { 375: 'Secure', 768: 'Secure checkout', 1440: 'Secure checkout' } );
	assert.deepEqual( e.wordsAt, { 375: 'Secure', 768: 'Secure checkout', 1440: 'Secure checkout' } );
} );

test( 'NEGATIVE: the same words at every width keep no per-width record, and an element drawn at one width only keeps none', () => {
	assert.equal( 'wordsAt' in run( { 375: 'Free', 768: 'Free', 1440: 'Free' } ), false );
	const only = ( w ) => Object.fromEntries( INVENTORY_WIDTHS.map( ( x ) => [ x, { records: x === w ? [ rec( 'Root/1#0', 'Phone only' ) ] : [], rootName: 'Root', rootKey: 'Root/1#0', unstamped: [] } ] ) );
	const e = summarise( { runs: only( 375 ), shots: {}, skipped: [], url: 'x', root: 'Root' } ).elements[ 0 ];
	assert.equal( 'wordsAt' in e, false );
} );

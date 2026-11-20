// A block's own glyph is absent when the draft's element holds no inline svg (lib/fill-resolve.mjs::glyphEvidence): Indus's
// footer contact cards draw the phone and email icons as discs beside the lines, and each line is a bare link, but
// sgs/business-info kept its own icon (showIcon default), so every card showed its icon twice (2026-11-19).
import test from 'node:test';
import assert from 'node:assert/strict';
import { glyphEvidence } from '../lib/fill-resolve.mjs';
import { presenceDecisions } from '../lib/fill-presence.mjs';

const ICON = '.sgs-business-info > .sgs-business-info__link > .sgs-business-info__icon';
const cal = { presence: { showIcon: { shows: [], hides: [ ICON, `${ ICON } > svg`, `${ ICON } > svg > path` ] } }, elements: { [ ICON ]: {} } };
const schema = { showIcon: { type: 'boolean', default: true } };
const root = { id: '0:', slot: '' };
const reads = ( glyphs ) => ( t, w ) => ( '0:' === t.id ? { glyphs, words: '0121 771 4330', w } : null );

test( 'MUST FAIL: a business line whose draft element holds no glyph hides the block\'s own icon', () => {
	const evidence = glyphEvidence( { cal, targets: [ root ], readAt: reads( 0 ) } );
	assert.deepEqual( evidence, { [ ICON ]: false, [ `${ ICON } > svg` ]: false, [ `${ ICON } > svg > path` ]: false } );
	assert.deepEqual( presenceDecisions( { calibration: cal, schema, evidence } ).writes, [ { attr: 'showIcon', value: false, merge: 'replace' } ] );
} );

test( 'negative control: a draft element holding a glyph, a read without the count, and a path a target names give no evidence', () => {
	assert.deepEqual( glyphEvidence( { cal, targets: [ root ], readAt: reads( 1 ) } ), {} );
	assert.deepEqual( glyphEvidence( { cal, targets: [ root ], readAt: reads( undefined ) } ), {} );
	assert.equal( glyphEvidence( { cal, targets: [ root, { id: '0:i', slot: ICON } ], readAt: reads( 0 ) } )[ ICON ], undefined );
	assert.deepEqual( glyphEvidence( { cal: { presence: { showLabel: { hides: [ '.sgs-x__label' ] } } }, targets: [ root ], readAt: reads( 0 ) } ), {}, 'a part that is no glyph' );
} );

test( 'MUST FAIL: the page read counts glyphs and Fill adds their evidence to the presence evidence', async () => {
	const fs = await import( 'fs' );
	const src = ( f ) => fs.readFileSync( new URL( `../${ f }`, import.meta.url ), 'utf8' );
	assert.match( src( 'lib/fill-read-collect.mjs' ), /snap\.glyphs = svgs\.length;/ );
	assert.match( src( 'lib/fill-resolve.mjs' ), /Object\.assign\( drawn, glyphEvidence\( \{ cal, targets: rec\.targets,/ );
} );

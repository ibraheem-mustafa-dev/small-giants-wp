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

// A menu half read at the group that also holds the phone, account and bag blocks (the right half of a split header menu,
// whose root is the group's element): the group's three glyphs are those blocks', so the half's own caret is absent.
const CARET = '.sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle';
const navCal = { presence: { submenuCaret: { shows: [], hides: [ CARET, `${ CARET } > svg` ] } }, elements: {} };
const GROUP = { tpl: 'Root/31#0' };
const half = { id: '9:', slot: '', finder: GROUP };
const box = ( x, w ) => ( { x, y: 60, w, h: 40 } );
const groupReads = ( extra = {} ) => ( t, w ) => ( {
	'9:': { glyphs: 3, rect: box( 900, 500 ), w },
	'8:': { glyphs: 3, rect: box( 900, 500 ) },
	'10:': { glyphs: 1, rect: box( 900, 100 ) },
	'11:': { glyphs: 1, rect: box( 1250, 40 ) },
	'12:': { glyphs: 1, rect: box( 1320, 80 ) },
	'13:': { glyphs: 1, rect: box( 1330, 20 ) },
	...extra,
}[ t.id ] ?? null );
const others = [ { id: '8:', slot: '', finder: GROUP }, { id: '10:', slot: '', finder: { tpl: 'Root/33#0' } }, { id: '11:', slot: '', finder: { tpl: 'Root/38#0' } }, { id: '12:', slot: '', finder: { tpl: 'Root/44#0' } }, { id: '13:', slot: '', finder: { tpl: 'Root/45#0' } } ];

test( 'MUST FAIL: a root shared with other blocks counts only its own glyphs: the menu half\'s caret is absent', () => {
	assert.deepEqual( glyphEvidence( { cal: navCal, targets: [ half ], readAt: groupReads(), others } ), { [ CARET ]: false, [ `${ CARET } > svg` ]: false } );
} );

test( 'negative control: a glyph the other blocks do not hold, the same element, and no others give no evidence', () => {
	assert.deepEqual( glyphEvidence( { cal: navCal, targets: [ half ], readAt: groupReads( { '9:': { glyphs: 4, rect: box( 900, 500 ) } } ), others } ), {}, 'a fourth svg is the half\'s own' );
	assert.deepEqual( glyphEvidence( { cal: navCal, targets: [ half ], readAt: groupReads(), others: [ others[ 0 ] ] } ), {}, 'the container on the same element is not subtracted' );
	assert.deepEqual( glyphEvidence( { cal: navCal, targets: [ half ], readAt: groupReads() } ), {} );
	assert.deepEqual( glyphEvidence( { cal: navCal, targets: [ half ], readAt: groupReads( { '10:': { glyphs: 1, rect: box( 100, 100 ) } } ), others } ), {}, 'a block outside the root is not subtracted' );
} );

test( 'MUST FAIL: the page read counts glyphs and Fill adds their evidence to the presence evidence', async () => {
	const fs = await import( 'fs' );
	const src = ( f ) => fs.readFileSync( new URL( `../${ f }`, import.meta.url ), 'utf8' );
	assert.match( src( 'lib/fill-read-collect.mjs' ), /snap\.glyphs = svgs\.length;/ );
	assert.match( src( 'lib/fill-resolve.mjs' ), /Object\.assign\( drawn, glyphEvidence\( \{ cal, targets: rec\.targets,/ );
	assert.match( src( 'lib/fill-resolve.mjs' ), /others: st\.nodes\.filter\( \( r \) => r !== rec \)\.map\( \( r \) => r\.targets\.find\( \( t \) => '' === t\.slot \) \)/ );
} );

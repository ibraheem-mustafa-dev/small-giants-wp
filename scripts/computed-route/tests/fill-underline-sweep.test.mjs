// The three underline looks (Spec 48 FR-48-81): a wrapper's keyword (`textDecoration`), a link's plain underline (`linkUnderline`
// always or hover: lib/resolve-enum.mjs and lib/fill-choice-state.mjs, tests/enum-readings.test.mjs) and the animated sweep read
// here (lib/fill-underline-sweep.mjs): a link with no line of its own whose gradient or ::before/::after line grows on hover.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { sweepAt, sweepLook, sweepResult, sweepSetting, sizeZero, scaleX } from '../lib/fill-underline-sweep.mjs';
import { TIE_PROPS } from '../lib/fill-read.mjs';

const db = openDb();
const LINE = 'linear-gradient(currentcolor, currentcolor)';
const rest = { 'text-decoration-line': 'none', 'background-image': LINE, 'background-size': '0% 2px', 'transition-property': 'background-size', 'transition-duration': '0.3s' };

test( 'the missing draft reads are in Fill\'s tie reads: the transition property beside the background size', () => {
	assert.ok( TIE_PROPS.includes( 'transition-property' ) && TIE_PROPS.includes( 'background-size' ) );
} );

test( 'a gradient line that grows on hover under a transition on its size is a sweep', () => {
	assert.equal( sweepAt( { rest, hover: { 'background-size': '100% 2px' } } ), 'background' );
} );

test( 'NEGATIVE CONTROL: the same gradient with no hover growth, no transition or a line already drawn is no sweep', () => {
	assert.equal( sweepAt( { rest, hover: {} } ), null, 'no hover growth' );
	assert.equal( sweepAt( { rest: { ...rest, 'transition-property': 'color' }, hover: { 'background-size': '100% 2px' } } ), null, 'a transition on another property' );
	assert.equal( sweepAt( { rest: { ...rest, 'transition-duration': '0s' }, hover: { 'background-size': '100% 2px' } } ), null, 'a transition that lasts no time' );
	assert.equal( sweepAt( { rest: { ...rest, 'text-decoration-line': 'underline' }, hover: { 'background-size': '100% 2px' } } ), null, 'the link already underlines' );
	assert.equal( sweepAt( { rest: { ...rest, 'background-size': '100% 2px' }, hover: { 'background-size': '100% 2px' } } ), null, 'a static line' );
} );

test( 'a ::after line whose width or scale grows on hover is a sweep', () => {
	const wide = { rest: { 'text-decoration-line': 'none', 'transition-property': 'width', 'transition-duration': '0.2s' }, hover: {}, layers: { '::after': { rest: { content: '""', width: '0px' }, hover: { width: '80px' } } } };
	assert.equal( sweepAt( wide ), 'layer' );
	const scaled = { rest: { 'text-decoration-line': 'none', 'transition-property': 'transform', 'transition-duration': '0.2s' }, hover: {}, layers: { '::before': { rest: { content: '""', transform: 'matrix(0, 0, 0, 1, 0, 0)' }, hover: { transform: 'matrix(1, 0, 0, 1, 0, 0)' } } } };
	assert.equal( sweepAt( scaled ), 'layer' );
	assert.equal( sweepAt( { ...wide, layers: { '::after': { rest: { content: 'none', width: '0px' }, hover: { width: '80px' } } } } ), null, 'a layer that draws nothing' );
	assert.equal( sweepAt( { ...wide, rest: { ...wide.rest, 'transition-property': 'color' } } ), null );
} );

test( 'size and scale readers', () => {
	assert.deepEqual( [ '0', '0px', '0% 2px', '100% 2px', 'auto' ].map( sizeZero ), [ true, true, true, false, false ] );
	assert.equal( scaleX( 'none' ), 1 );
	assert.equal( scaleX( 'matrix(0.5, 0, 0, 1, 0, 0)' ), 0.5 );
	assert.equal( scaleX( 'weird' ), null );
} );

const hoverLooks = ( prop, perWidth, pseudo = '' ) => new Map( [ [ `hover|${ pseudo }|${ prop }`, { state: 'hover', prop, pseudo, perWidth } ] ] );
const snapsOf = ( styles, widths = [ 375, 768, 1440 ] ) => Object.fromEntries( widths.map( ( w ) => [ w, { styles, pseudo: {} } ] ) );
const grown = { 375: '100% 2px', 768: '100% 2px', 1440: '100% 2px' };

test( 'the look is read at every width the element was read at, and one width without it is no sweep', () => {
	assert.deepEqual( sweepLook( snapsOf( rest ), hoverLooks( 'background-size', grown ) ).widths, [ 375, 768, 1440 ] );
	assert.equal( sweepLook( snapsOf( rest ), hoverLooks( 'background-size', { 375: '100% 2px', 1440: '100% 2px' } ) ), null, 'no hover size read at 768' );
} );

// sgs/button's real settings: linkUnderline holds sweep and paints the button root.
const cal = { settings: { linkUnderline: { slot: '', slots: [ '' ], property: 'text-decoration' }, textDecoration: { slot: '', slots: [ '' ], property: 'text-decoration' } } };

test( 'MUST FAIL WITHOUT THE RULE: a sweeping button link is written linkUnderline "sweep", the one setting whose list holds it', () => {
	assert.deepEqual( sweepSetting( { db, cal, block: 'sgs/button', slot: '' } ), { attr: 'linkUnderline', slot: '' } );
	const reads = { states: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { looks: { t1: [ { states: [ 'hover' ], declared: { 'background-size': 'x' }, rendered: { 'background-size': grown[ w ] }, read: 'entered' } ] } } ] ) ) };
	const r = sweepResult( { db, cal, block: 'sgs/button', slot: '', snaps: snapsOf( rest ), reads, id: 't1' } );
	assert.deepEqual( r.writes, [ { attr: 'linkUnderline', value: 'sweep', merge: 'replace' } ] );
	assert.equal( r.status, 'written' );
} );

test( 'NEGATIVE CONTROL: a block with no setting that holds a sweep on the element writes nothing', () => {
	assert.equal( sweepSetting( { db, cal: { settings: { textDecoration: cal.settings.textDecoration } }, block: 'sgs/button', slot: '' } ), null );
	assert.equal( sweepSetting( { db, cal, block: 'sgs/button', slot: ' .elsewhere' } ), null );
} );

// Fill's state pass, theme-token and surface rules (Spec 48 FR-48-81) against the real framework DB: a focus look unlike hover,
// a press look and a :visited look on a content link become keys of the theme-snapshot patch, a surface hidden at rest takes
// its open look as its resting look, and a look read from the stylesheet is written with read 'code'.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { fillStates, stateDrafts, hiddenAtRest } from '../lib/fill-state.mjs';
import { targetSnap } from '../lib/fill-state.mjs';
import { createPatch, tokenRoute, conflictRow } from '../lib/fill-state-tokens.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const setting = ( property, extra = {} ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state: null, forms: [], transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0 ], ...extra } );
const WIDTHS = [ 375, 768, 1440 ];
const look = ( states, declared, extra = {} ) => ( { states, declared, rendered: declared, ...extra } );
// reads: each width holds the target 't' looks; `snap` is the target's resting snapshot per width (absent: no resting read).
const readsOf = ( looks, snap = null ) => ( {
	states: Object.fromEntries( WIDTHS.map( ( w ) => [ w, { looks: { t: looks } } ] ) ),
	...( snap ? { widths: Object.fromEntries( WIDTHS.map( ( w ) => [ w, { t: snap } ] ) ) } : {} ),
} );
const run = ( block, cal, looks, { snap = null, attributes = {} } = {} ) => {
	const tree = [ { name: block, attributes: { className: 'cr-ref-x-0', ...attributes }, innerBlocks: [] } ];
	const result = fillStates( { tree, nodes: [ { index: 0, name: block, targets: [ { id: 't', slot: '' } ] } ], reads: readsOf( looks, snap ), calFor: () => cal, db, snapshot } );
	return { ...result, attrs: tree[ 0 ].attributes };
};
const buttonCal = { elements: { '': {} }, settings: { colourTextHover: setting( 'color', { state: 'hover' } ), colourText: setting( 'color' ) } };
const plainCal = { elements: { '': {} }, settings: { textColour: setting( 'color' ) } };
const modalCal = { elements: { '': {} }, settings: { modalBackground: setting( 'background-color' ) } };
const RING = { 'outline-width': '3px', 'outline-style': 'solid', 'outline-color': 'rgb(255, 0, 128)', 'outline-offset': '2px' };

test( 'MUST FAIL WITHOUT THE FOCUS WRITER: a focus look unlike hover lands in settings.custom.focus with source "draft"', () => {
	const r = run( 'sgs/button', buttonCal, [ look( [ 'hover' ], { color: 'rgb(200, 0, 0)' } ), look( [ 'focus' ], RING ) ], { snap: { tag: 'button' } } );
	assert.equal( r.patch.settings.custom.focus.width, '3px' );
	assert.equal( r.patch.settings.custom.focus.ring, '#ff0080' );
	assert.equal( r.patch.settings.custom.focus.offset, '2px' );
	assert.equal( r.patch.settings.custom.focus.source, 'draft' );
	assert.ok( r.patchEntries.some( ( e ) => 'settings.custom.focus.ring' === e.path && 'focus' === e.state ) );
	assert.ok( ! r.unmapped.some( ( u ) => /^focus-differs/.test( u.reason ) ), 'the outline look is no longer a gap' );
} );

test( 'MUST FAIL: a focus look on an element no read width identifies feeds no ring; a tag at a wider width is found', () => {
	const looks = [ look( [ 'hover' ], { color: 'rgb(200, 0, 0)' } ), look( [ 'focus' ], RING ) ];
	const none = run( 'sgs/button', buttonCal, looks );
	assert.equal( none.patch.settings, undefined, 'no tag and no role: the site ring is not written' );
	assert.equal( tokenRoute( { state: 'focus', prop: 'outline-color', held: new Set(), block: 'sgs/text', node: {} } ), null );
	const reads = { widths: { 375: { t: { href: null } }, 768: { t: { tag: 'a' } }, 1440: { t: { tag: 'a' } } } };
	assert.equal( targetSnap( reads, { id: 't' } ).tag, 'a', 'the narrowest snapshot without a tag is skipped' );
	assert.deepEqual( targetSnap( { widths: {} }, { id: 't' } ), {} );
} );

test( 'a focus colour with no ring property keeps its focus-differs gap, and focus equal to hover stays held', () => {
	const colour = run( 'sgs/button', buttonCal, [ look( [ 'hover' ], { color: 'rgb(1, 1, 1)' } ), look( [ 'focus' ], { color: 'rgb(2, 2, 2)' } ) ] );
	assert.deepEqual( colour.patch, {} );
	assert.match( colour.unmapped[ 0 ].reason, /^focus-differs/ );
	const same = run( 'sgs/button', buttonCal, [ look( [ 'hover' ], { color: 'rgb(1, 1, 1)' } ), look( [ 'focus' ], { color: 'rgb(1, 1, 1)' } ) ] );
	assert.deepEqual( same.patch, {} );
	assert.equal( same.held.length, 1 );
} );

test( 'MUST FAIL WITHOUT THE PRESS WRITER: a press look on a button lands in buttonPresets.<variant>.active-transform', () => {
	const r = run( 'sgs/button', buttonCal, [ look( [ 'active' ], { transform: 'matrix(0.98, 0, 0, 0.98, 0, 0)', 'box-shadow': 'none', 'background-color': 'rgb(9, 9, 9)' } ) ], { attributes: { inheritStyle: 'secondary' } } );
	assert.equal( r.patch.settings.custom.buttonPresets.secondary[ 'active-transform' ], 'matrix(0.98, 0, 0, 0.98, 0, 0)' );
	assert.equal( r.patch.settings.custom.buttonPresets.secondary[ 'active-shadow' ], 'none' );
	assert.ok( r.unmapped.some( ( u ) => 'background-color' === u.property && 'active' === u.state ), 'a pressed colour has no key: a named gap' );
	const rest = run( 'sgs/button', buttonCal, [ look( [ 'active' ], { transform: 'matrix(0.9, 0, 0, 0.9, 0, 0)' } ) ] );
	assert.ok( rest.patch.settings.custom.buttonPresets.primary, 'no inheritStyle: the primary preset' );
} );

test( 'a press look on a block that does not read buttonPresets stays the press gap', () => {
	const r = run( 'sgs/text', plainCal, [ look( [ 'active' ], { transform: 'matrix(0.9, 0, 0, 0.9, 0, 0)' } ) ] );
	assert.deepEqual( r.patch, {} );
	assert.match( r.unmapped[ 0 ].reason, /^press/ );
} );

test( 'MUST FAIL WITHOUT THE LINK WRITER: a :visited look on a content link lands in styles.elements.link[:visited]; a link a block setting owns does not', () => {
	const snap = { tag: 'a', href: '/x' };
	const code = look( [ 'visited' ], { color: 'rgb(85, 26, 139)' }, { rendered: null, read: 'code' } );
	const r = run( 'sgs/text', plainCal, [ code ], { snap } );
	assert.deepEqual( r.patch.styles.elements.link[ ':visited' ], { color: { text: '#551a8b' } } );
	const owned = run( 'sgs/text', buttonCal, [ code ], { snap } );
	assert.deepEqual( owned.patch, {} );
	assert.match( owned.unmapped[ 0 ].reason, /a block setting owns this link look/ );
	const noHref = run( 'sgs/text', plainCal, [ code ], { snap: { tag: 'a', href: null } } );
	assert.deepEqual( noHref.patch, {} );
} );

test( 'MUST FAIL WITHOUT THE SURFACE RULE: an open look on a surface hidden at rest writes the surface\'s resting setting', () => {
	const open = look( [ 'open' ], { 'background-color': 'rgb(1, 2, 3)' } );
	const r = run( 'sgs/modal', modalCal, [ open ], { snap: { missing: true } } );
	assert.equal( r.writes.length, 1 );
	assert.equal( r.writes[ 0 ].attr, 'modalBackground' );
	assert.equal( r.writes[ 0 ].state, 'open', 'the write is tagged with the look it came from, so the resting confirm skips it' );
	assert.ok( r.attrs.modalBackground );
	// Shown at rest, or never read at rest: the open look keeps the state-setting path (a named gap here).
	const shown = run( 'sgs/modal', modalCal, [ open ], { snap: { tag: 'div' } } );
	assert.equal( shown.writes.length, 0 );
	assert.match( shown.unmapped[ 0 ].reason, /^no-state-setting/ );
	const unread = run( 'sgs/modal', modalCal, [ open ] );
	assert.equal( unread.writes.length, 0 );
	// Not a surface block: hidden or not, the rule does not apply.
	const other = run( 'sgs/text', plainCal, [ open ], { snap: { missing: true } } );
	assert.equal( other.writes.length, 0 );
	assert.equal( hiddenAtRest( readsOf( [], { missing: true } ), 't' ), true );
	assert.equal( hiddenAtRest( readsOf( [] ), 't' ), false );
} );

test( 'MUST FAIL WITHOUT CODE LOOKS: a look read from the stylesheet is written with read "code"; an entered look wins over it', () => {
	const code = look( [ 'hover' ], { color: 'rgb(9, 8, 7)' }, { rendered: null, read: 'code' } );
	const r = run( 'sgs/button', buttonCal, [ code ] );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.read ] ), [ [ 'colourTextHover', 'code' ] ] );
	const entered = run( 'sgs/button', buttonCal, [ code, look( [ 'hover' ], { color: 'rgb(1, 2, 3)' }, { read: 'entered' } ) ] );
	assert.equal( entered.writes[ 0 ].read, undefined, 'an entered value is not marked code' );
	const enteredFirst = stateDrafts( readsOf( [ look( [ 'hover' ], { color: 'rgb(1, 2, 3)' }, { read: 'entered' } ), code ] ), 't' ).get( 'hover||color' );
	assert.deepEqual( [ enteredFirst.perWidth[ 1440 ], enteredFirst.read ], [ 'rgb(1, 2, 3)', 'entered' ], 'a code look never replaces an entered one' );
	const d = stateDrafts( readsOf( [ code ] ), 't' ).get( 'hover||color' );
	assert.equal( d.read, 'code' );
	assert.equal( d.perWidth[ 1440 ], 'rgb(9, 8, 7)' );
} );

test( 'two targets that set one key differently keep the first and report the conflict', () => {
	const sink = createPatch();
	sink.set( [ 'settings', 'custom', 'focus', 'ring' ], '#111111', { node: 'a', block: 'b', slot: '' } );
	sink.set( [ 'settings', 'custom', 'focus', 'ring' ], '#111111', { node: 'c', block: 'b', slot: '' } );
	sink.set( [ 'settings', 'custom', 'focus', 'ring' ], '#222222', { node: 'd', block: 'b', slot: '' } );
	assert.equal( sink.patch.settings.custom.focus.ring, '#111111' );
	assert.deepEqual( sink.conflicts.map( ( c ) => [ c.kept, c.dropped, c.from.node ] ), [ [ '#111111', '#222222', 'd' ] ] );
	assert.equal( sink.entries.length, 1 );
} );

test( 'MUST FAIL: a :visited look on a button-styled link, or on the root link of a button block, never reaches styles.elements.link', () => {
	const visited = [ look( [ 'visited' ], { color: 'rgb(1, 2, 3)' } ) ];
	const plain = run( 'sgs/text', plainCal, visited, { snap: { tag: 'a', href: '/x', className: 'text-link' } } );
	assert.equal( plain.patch.styles.elements.link[ ':visited' ].color.text, '#010203', 'a plain content link is the theme link' );
	const btn = run( 'sgs/text', plainCal, visited, { snap: { tag: 'a', href: '/x', className: 'btn btn-primary' } } );
	assert.equal( btn.patch.styles, undefined );
	assert.equal( btn.unmapped.length, 1 );
	assert.match( btn.unmapped[ 0 ].reason, /^element/ );
	const role = run( 'sgs/text', plainCal, visited, { snap: { tag: 'a', href: '/x', role: 'button', className: '' } } );
	assert.equal( role.patch.styles, undefined );
	const root = run( 'sgs/button', plainCal, visited, { snap: { tag: 'a', href: '/x', className: 'sgs-cta' } } );
	assert.equal( root.patch.styles, undefined, 'the root of a button block takes the presets' );
} );

test( 'MUST FAIL: a pressed look from a descendant is not the whole button\'s press token', () => {
	const route = ( slot ) => tokenRoute( { state: 'active', prop: 'transform', held: new Set(), block: 'sgs/button', node: { attributes: {} }, slot } );
	assert.equal( route( 'icon' ), null );
	assert.equal( route( '' ), 'press' );
} );

test( 'MUST FAIL: a focus look on a form control stays out of the site-wide ring; a link, a button and an outline-only look feed it', () => {
	const route = ( extra ) => tokenRoute( { state: 'focus', prop: 'box-shadow', held: new Set( [ 'hover' ] ), block: 'sgs/form-field', node: {}, ...extra } );
	assert.equal( route( { tag: 'input' } ), null );
	assert.equal( route( { tag: 'textarea' } ), null );
	assert.equal( route( { tag: 'a' } ), 'focus' );
	assert.equal( route( { tag: 'div', role: 'tab' } ), 'focus' );
	assert.equal( route( { tag: 'div' } ), null );
	assert.equal( tokenRoute( { state: 'focus', prop: 'outline-color', held: new Set(), block: 'sgs/text', node: {}, tag: 'div' } ), 'focus' );
	assert.equal( tokenRoute( { state: 'focus', prop: 'outline-color', held: new Set(), block: 'sgs/form-field', node: {}, tag: 'input' } ), null );
} );

test( 'a focus conflict names both targets', () => {
	const sink = createPatch();
	sink.set( [ 'settings', 'custom', 'focus', 'width' ], '3px', { node: 'r0', slot: '' } );
	sink.set( [ 'settings', 'custom', 'focus', 'width' ], '5px', { node: 'r4', slot: 'icon', block: 'sgs/x' } );
	const row = conflictRow( sink.conflicts[ 0 ] );
	assert.match( row.reason, /r0 root/ );
	assert.match( row.reason, /r4 icon/ );
} );

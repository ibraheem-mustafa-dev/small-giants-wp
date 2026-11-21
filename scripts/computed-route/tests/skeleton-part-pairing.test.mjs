// The general pairing of paint conservation (lib/skeleton-part-pairing.mjs): an absorbed draft element is paired with the
// block's measured part by what the part is (kind, repetition, containment, out of flow), and read at that part's calibrated
// slots, only where exactly one part fits. The calibration below is a trimmed copy of a tiles field's default paint and
// settings (cache/form-field-tiles.json, cache/mamas-test/form-field-tiles.paint.json), whose markup the draft does not share.
import test from 'node:test';
import assert from 'node:assert/strict';
import { partModel, draftKind, pairAbsorbed, pairingNotes, glyphy } from '../lib/skeleton-part-pairing.mjs';
import { absorbedSlots } from '../lib/skeleton-conserve-slots.mjs';
import { calPartsFor } from '../lib/skeleton-context.mjs';
import fs from 'fs';
import os from 'os';
import path from 'path';

const G = '.group > .grid';
const TILE = ( k ) => `${ G } > .tile:nth-of-type(${ k })`;
const at = ( tag, width, extra = {} ) => ( { 1440: { _tag: tag, _position: 'static', width: `${ width }px`, 'background-color': 'rgba(0, 0, 0, 0)', 'border-top-width': '0px', ...extra } } );
const ELEMENTS = {
	'': at( 'div', 1240 ),
	'.group': at( 'fieldset', 1240 ),
	'.group > .legend': at( 'legend', 69 ),
	[ G ]: at( 'div', 1240 ),
	...Object.fromEntries( [ 1, 2 ].flatMap( ( k ) => [
		[ TILE( k ), at( 'label', 1240, { _position: 'relative', 'border-top-width': '2px' } ) ],
		[ `${ TILE( k ) } > .input`, at( 'input', 13, { _position: 'absolute' } ) ],
		[ `${ TILE( k ) } > .icon`, at( 'span', 24 ) ],
		[ `${ TILE( k ) } > .icon > svg`, at( 'svg', 24 ) ],
		[ `${ TILE( k ) } > .label`, at( 'span', 20 ) ],
		[ `${ TILE( k ) } > .check`, at( 'span', 20, { _position: 'absolute', 'background-color': 'rgb(58, 42, 34)' } ) ],
		[ `${ TILE( k ) } > .check::after`, { 1440: { width: '5px' } } ],
	] ) ),
};
const SETTINGS = {
	tileBackground: { slot: TILE( 1 ), slots: [ TILE( 1 ), TILE( 2 ) ], property: 'background-color' },
	tileRadius: { slot: TILE( 1 ), slots: [ TILE( 1 ), TILE( 2 ) ], property: 'border-radius' },
	tileLabelSize: { slot: `${ TILE( 1 ) } > .label`, property: 'font-size' },
	tileLabelPaddingHover: { slot: `${ TILE( 1 ) } > .label`, property: 'padding', state: 'hover' },
	checkBackground: { slot: `${ TILE( 1 ) } > .check`, slots: [ `${ TILE( 1 ) } > .check`, `${ TILE( 2 ) } > .check` ], property: 'background-color' },
	checkTick: { slot: `${ TILE( 1 ) } > .check::after`, property: 'border-color' },
	iconStroke: { slot: `${ TILE( 1 ) } > .icon > svg`, property: 'stroke' },
	gap: { slot: G, property: 'gap' },
};
const CAL = { elements: ELEMENTS, settings: SETTINGS, text: { legend: { path: '.group > .legend' } } };

// A draft element: key, tag, children, and its box and words.
const el = ( key, tag, kids = [], extra = {} ) => ( { key, tag, kids, visible: { 1440: true }, box: { 1440: { w: extra.w ?? 100, h: extra.h ?? 40 } }, position: { 1440: extra.position ?? 'static' }, words: extra.words ?? '', attrs: extra.attrs ?? {} } );
const kids = ( e ) => e.kids;
const finder = ( e ) => ( { tpl: e.key } );
// Two hand-written choice tiles (distinct templates, the same width), each a button holding a selection mark, a two-line label
// stack and a price: the draft's markup is not the block's (no fieldset, no grid, no label round an input).
const tiles = () => {
	const make = ( n ) => {
		const mark = el( `Root/${ n + 1 }#0`, 'span', [], { w: 22, h: 22 } );
		const stack = el( `Root/${ n + 2 }#0`, 'span', [ el( `Root/${ n + 3 }#0`, 'b', [], { words: 'Tracked 48' } ), el( `Root/${ n + 4 }#0`, 'span', [], { words: 'Arrives in 2 days' } ) ] );
		return { button: el( `Root/${ n }#0`, 'button', [ mark, stack, el( `Root/${ n + 5 }#0`, 'b', [], { words: '£3.95' } ) ], { w: 587, h: 66 } ), mark, stack };
	};
	const a = make( 10 );
	const b = make( 20 );
	return { host: el( 'Root/9#0', 'div', [ a.button, b.button ], { w: 587, h: 142 } ), a, b };
};

test( 'partModel: a part and its sole visible child of the same width are one box; a 1px out-of-flow control is hidden; kinds from tag, children and paint', () => {
	const pill = partModel( {
		'': at( 'fieldset', 1240 ),
		'.options': at( 'div', 1240 ),
		'.options > .option:nth-of-type(1)': at( 'label', 71 ),
		'.options > .option:nth-of-type(1) > .focus': at( 'input', 1, { _position: 'absolute' } ),
		'.options > .option:nth-of-type(1) > .pill': at( 'span', 71 ),
		'.options > .option:nth-of-type(1) > .pill::before': { 1440: { width: '6px' } },
		'.options > .option:nth-of-type(1) > .pill > .text': at( 'span', 35 ),
	} );
	const head = pill.headOf.get( '.options > .option:nth-of-type(n) > .pill' );
	assert.equal( head, '.options > .option:nth-of-type(n)', 'the pill is one box with the label drawn round it' );
	assert.deepEqual( [ pill.groups.get( head ).kind, pill.groups.get( head ).level ], [ 'control', 1 ] );
	assert.ok( pill.parts.get( '.options > .option:nth-of-type(n) > .focus' ).hidden );
	assert.equal( pill.parts.get( '.options > .option:nth-of-type(n) > .pill::before' ).kind, 'mark' );
	assert.equal( pill.parts.get( '.options > .option:nth-of-type(n) > .pill > .text' ).kind, 'words' );
	const m = partModel( ELEMENTS, [ '.group > .legend' ] );
	assert.equal( m.parts.get( `${ G } > .tile:nth-of-type(n) > .check` ).kind, 'mark', 'a painted leaf with no text field is a mark' );
	assert.equal( m.parts.get( '.group > .legend' ).kind, 'words' );
	assert.equal( m.groups.get( `${ G } > .tile:nth-of-type(n) > .icon` ).kind, 'glyph', 'an icon box merged with its svg is a glyph' );
} );

test( 'draftKind and glyphy read a draft element as a control, a glyph, a mark, words or a box', () => {
	assert.equal( draftKind( el( 'a', 'button' ), kids ), 'control' );
	assert.equal( draftKind( el( 'a', 'div', [], { attrs: { role: 'radio' } } ), kids ), 'control' );
	assert.equal( draftKind( el( 'a', 'span', [], { words: '✓' } ), kids ), 'glyph' );
	assert.equal( draftKind( el( 'a', 'span', [], { words: '→ →' } ), kids ), 'glyph' );
	assert.equal( draftKind( el( 'a', 'span', [], { words: '5' } ), kids ), 'glyph' );
	assert.equal( draftKind( el( 'a', 'span', [], { words: 'Most popular' } ), kids ), 'words' );
	assert.equal( draftKind( el( 'a', 'span' ), kids ), 'mark' );
	assert.equal( draftKind( el( 'a', 'span', [ el( 'b', 'b' ) ] ), kids ), 'box' );
	assert.deepEqual( [ glyphy( '£3' ), glyphy( '··' ), glyphy( '' ) ], [ false, true, false ] );
} );

test( 'pairAbsorbed reads hand-written choice tiles and their selection marks at the tile part where the slot walk gives up (MUST FAIL on main: no pairing)', () => {
	const { host, a, b } = tiles();
	const absorbed = [ { element: a.button, looks: [ 'background', 'radius' ] }, { element: a.mark, looks: [ 'background', 'radius' ] }, { element: b.button, looks: [ 'background' ] }, { element: b.mark, looks: [ 'background' ] }, { element: a.stack, looks: [ 'layout' ] } ];
	const walk = absorbedSlots( { host, node: {}, absorbed, kids, finder, settings: SETTINGS, block: 'b', checked: 'c' } );
	assert.deepEqual( walk.slots, {}, 'the slot walk lands on nothing: the draft has no fieldset or grid' );
	const made = pairAbsorbed( { host, absorbed, kids, calibration: CAL, finder } );
	assert.deepEqual( made.slots, {
		[ TILE( 1 ) ]: { tpl: 'Root/10#0' }, [ TILE( 2 ) ]: { tpl: 'Root/20#0' },
		[ `${ TILE( 1 ) } > .check` ]: { tpl: 'Root/11#0' }, [ `${ TILE( 2 ) } > .check` ]: { tpl: 'Root/21#0' },
	} );
	assert.deepEqual( made.paired.map( ( p ) => p.key ).sort(), [ 'Root/10#0', 'Root/11#0', 'Root/20#0', 'Root/21#0' ] );
	assert.ok( ! made.paired.some( ( p ) => 'Root/12#0' === p.key ), 'a label stack no part draws stays unpaired' );
	// The tile's label field is read where the label part is the one words part the tile holds.
	const one = tiles();
	one.a.button.kids = [ one.a.mark, el( 'Root/13#0', 'span', [], { words: 'Send to my address' } ) ];
	const label = pairAbsorbed( { host: one.host, absorbed: [ { element: one.a.button.kids[ 1 ], looks: [ 'padding' ] } ], kids, calibration: CAL, finder } );
	assert.deepEqual( label.unpainted, [ { key: 'Root/13#0', part: `${ G } > .tile:nth-of-type(n) > .label`, looks: [ 'padding' ] } ], 'a part no setting of which paints the look is said, not read' );
	// A slot another finder holds is not taken again.
	const held = pairAbsorbed( { host, absorbed: absorbed.slice( 0, 1 ), kids, calibration: CAL, finder, taken: { [ TILE( 1 ) ]: { tpl: 'Root/99#0' } } } );
	assert.deepEqual( held.slots, { [ TILE( 2 ) ]: { tpl: 'Root/20#0' } } );
	assert.deepEqual( held.ambiguous.map( ( x ) => x.key ), [ 'Root/10#0' ] );
} );

test( 'loop copies: every copy is read through the slot of its position or of another copy, and a position the draft lacks reads nothing', () => {
	const chips = [ 0, 1, 2 ].map( ( i ) => el( `Root/5#${ i }`, 'button', [], { words: `Choice ${ i }`, w: 100 + i * 10 } ) );
	const host = el( 'Root/4#0', 'div', chips );
	const made = pairAbsorbed( { host, absorbed: chips.map( ( c ) => ( { element: c, looks: [ 'background' ] } ) ), kids, calibration: CAL, finder } );
	assert.deepEqual( made.slots, { [ TILE( 1 ) ]: { tpl: 'Root/5#0' }, [ TILE( 2 ) ]: { tpl: 'Root/5#1' } } );
	assert.deepEqual( made.paired.map( ( p ) => p.key ), [ 'Root/5#0', 'Root/5#1', 'Root/5#2' ], 'the third copy is read through its loop' );
} );

test( 'negative controls: a non-repeating element never pairs with a repeating part, a worded element never with a glyph part, a mark never with an icon part, an out-of-flow element only with an out-of-flow part', () => {
	const lone = el( 'Root/2#0', 'button', [], { words: 'Send' } );
	const solo = pairAbsorbed( { host: el( 'Root/1#0', 'div', [ lone ] ), absorbed: [ { element: lone, looks: [ 'background' ] } ], kids, calibration: CAL, finder } );
	assert.deepEqual( [ solo.slots, solo.paired, solo.ambiguous ], [ {}, [], [] ], 'one button against the repeating tile' );
	const ICON = { elements: { '': at( 'a', 200 ), '.icon': at( 'span', 24 ), '.icon > svg': at( 'svg', 24 ) }, settings: { iconBg: { slot: '.icon', property: 'background-color' }, iconStroke: { slot: '.icon > svg', property: 'stroke' } } };
	const badge = el( 'Root/3#0', 'span', [], { words: 'Build your own' } );
	const arrow = el( 'Root/4#0', 'span', [], { words: '→' } );
	const dot = el( 'Root/5#0', 'span', [], { w: 20 } );
	const run = ( e ) => pairAbsorbed( { host: el( 'Root/1#0', 'a', [ e ] ), absorbed: [ { element: e, looks: [ 'background' ] } ], kids, calibration: ICON, finder } );
	assert.deepEqual( run( badge ).slots, {}, 'a worded badge is no icon' );
	assert.deepEqual( run( dot ).slots, {}, 'a drawn dot is no icon' );
	assert.deepEqual( run( arrow ).slots, { '.icon': { tpl: 'Root/4#0' } }, 'positive control: an arrow glyph is the icon' );
	const { host, a } = tiles();
	a.mark.position = { 1440: 'absolute' };
	const oof = pairAbsorbed( { host, absorbed: [ { element: a.button, looks: [ 'background' ] }, { element: a.mark, looks: [ 'background' ] } ], kids, calibration: { ...CAL, elements: { ...ELEMENTS, [ `${ TILE( 1 ) } > .check` ]: at( 'span', 20, { 'background-color': 'rgb(1, 1, 1)' } ), [ `${ TILE( 2 ) } > .check` ]: at( 'span', 20, { 'background-color': 'rgb(1, 1, 1)' } ) } }, finder } );
	assert.ok( ! oof.paired.some( ( p ) => 'Root/11#0' === p.key ), 'an absolutely placed mark is no in-flow check' );
} );

test( 'an ambiguous pairing is listed with its candidates and reads nothing; two elements of one item claiming one part are both listed; a pseudo-element part is said', () => {
	const TWO = { elements: { '': at( 'nav', 900 ), '.back': at( 'button', 80 ), '.next': at( 'button', 90 ) }, settings: { backBg: { slot: '.back', property: 'background-color' }, nextBg: { slot: '.next', property: 'background-color' } } };
	const go = el( 'Root/2#0', 'button', [], { words: 'Continue' } );
	const amb = pairAbsorbed( { host: el( 'Root/1#0', 'nav', [ go ] ), absorbed: [ { element: go, looks: [ 'background' ] } ], kids, calibration: TWO, finder } );
	assert.deepEqual( [ amb.slots, amb.ambiguous ], [ {}, [ { key: 'Root/2#0', candidates: [ '.back', '.next' ] } ] ] );
	const notes = pairingNotes( amb, 'sgs/flow' );
	assert.equal( notes.problems.length, 1 );
	assert.match( notes.problems[ 0 ], /Root\/2#0 fits several measured parts of sgs\/flow \(\.back \| \.next\)/ );
	// Two worded spans in one tile both claim the tile's one words part.
	const { host, a } = tiles();
	a.button.kids = [ el( 'Root/13#0', 'span', [], { words: 'Send' } ), el( 'Root/14#0', 'span', [], { words: 'for me' } ) ];
	const both = pairAbsorbed( { host, absorbed: a.button.kids.map( ( k ) => ( { element: k, looks: [ 'text-decoration' ] } ) ), kids, calibration: { ...CAL, settings: { ...SETTINGS, deco: { slot: `${ TILE( 1 ) } > .label`, property: 'text-decoration' } } }, finder } );
	assert.deepEqual( [ both.slots, both.ambiguous.map( ( x ) => x.key ) ], [ {}, [ 'Root/13#0', 'Root/14#0' ] ] );
	// A glyph inside a tile whose only mark is drawn by a pseudo-element.
	const tick = el( 'Root/31#0', 'span', [], { words: '✓' } );
	const PSE = { elements: { '': at( 'div', 500 ), '.opt:nth-of-type(1)': at( 'label', 60 ), '.opt:nth-of-type(1)::before': { 1440: { width: '6px' } } }, settings: { tick: { slot: '.opt:nth-of-type(1)::before', property: 'background-image' } } };
	const chips = [ 0, 1 ].map( ( i ) => el( `Root/30#${ i }`, 'button', i ? [] : [ tick ], { words: 'Vanilla' } ) );
	const ps = pairAbsorbed( { host: el( 'Root/29#0', 'div', chips ), absorbed: [ { element: tick, looks: [ 'background' ] } ], kids, calibration: PSE, finder } );
	assert.deepEqual( [ ps.slots, ps.pseudo ], [ {}, [ { key: 'Root/31#0', part: '.opt:nth-of-type(n)::before' } ] ] );
} );

test( 'calPartsFor reads a block\'s parts from its slot map\'s own site where the surface\'s site has no default paint', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-parts-' ) );
	try {
		fs.writeFileSync( path.join( dir, 'tiles.json' ), JSON.stringify( { block: 'sgs/tiles', site: 'site-a', settings: SETTINGS, text: CAL.text } ) );
		fs.mkdirSync( path.join( dir, 'site-a' ) );
		fs.writeFileSync( path.join( dir, 'site-a', 'tiles.paint.json' ), JSON.stringify( { block: 'sgs/tiles', site: 'site-a', elements: ELEMENTS } ) );
		const b = calPartsFor( 'site-b', dir )( 'tiles' );
		assert.deepEqual( [ Object.keys( b.elements ).length, b.settings, b.text ], [ Object.keys( ELEMENTS ).length, SETTINGS, CAL.text ] );
		fs.mkdirSync( path.join( dir, 'site-b' ) );
		fs.writeFileSync( path.join( dir, 'site-b', 'tiles.paint.json' ), JSON.stringify( { block: 'sgs/tiles', site: 'site-b', elements: { '': at( 'div', 10 ) } } ) );
		assert.deepEqual( Object.keys( calPartsFor( 'site-b', dir )( 'tiles' ).elements ), [ '' ], 'a site\'s own paint is read first' );
		assert.equal( calPartsFor( 'site-b', dir )( 'none' ), null );
	} finally {
		fs.rmSync( dir, { recursive: true, force: true } );
	}
} );

test( 'an exact kind is preferred to a compatible one, and an element inside a paired element pairs only inside that part', () => {
	const OPT = ( k ) => `.opts > .opt:nth-of-type(${ k })`;
	const parts = Object.fromEntries( [ 1, 2 ].flatMap( ( k ) => [
		[ OPT( k ), at( 'label', 120 ) ], [ `${ OPT( k ) } > .ico`, at( 'span', 24 ) ], [ `${ OPT( k ) } > .ico > svg`, at( 'svg', 24 ) ],
		[ `${ OPT( k ) } > .dot`, at( 'span', 10, { 'background-color': 'rgb(1, 1, 1)' } ) ], [ `${ OPT( k ) } > .txt`, at( 'span', 60 ) ],
		[ `${ OPT( k ) } > .wrap`, at( 'span', 80 ) ], [ `${ OPT( k ) } > .wrap > .badge`, at( 'span', 30, { 'background-color': 'rgb(2, 2, 2)' } ) ], [ `${ OPT( k ) } > .wrap > .note`, at( 'span', 40 ) ],
		[ `.dots > .pip:nth-of-type(${ k })`, at( 'span', 8, { 'background-color': 'rgb(3, 3, 3)' } ) ],
	] ) );
	const cal = { elements: { '': at( 'div', 600 ), '.opts': at( 'div', 600 ), '.dots': at( 'div', 40 ), ...parts }, settings: {
		icoBg: { slot: `${ OPT( 1 ) } > .ico`, property: 'background-color' }, dotBg: { slot: `${ OPT( 1 ) } > .dot`, property: 'background-color' },
		badgeBg: { slot: `${ OPT( 1 ) } > .wrap > .badge`, property: 'background-color' }, pipBg: { slot: '.dots > .pip:nth-of-type(1)', property: 'background-color' },
	} };
	const star = el( 'Root/3#0', 'span', [], { words: '★' } );
	const mark = el( 'Root/4#0', 'span', [], { w: 10 } );
	const chips = [ 0, 1 ].map( ( i ) => el( `Root/2#${ i }`, 'button', i ? [] : [ star, mark ], { words: 'Pick' } ) );
	const made = pairAbsorbed( { host: el( 'Root/1#0', 'div', chips ), absorbed: [ { element: star, looks: [ 'background' ] }, { element: mark, looks: [ 'background' ] } ], kids, calibration: cal, finder } );
	assert.deepEqual( made.slots[ `${ OPT( 1 ) } > .ico` ], { tpl: 'Root/3#0' }, 'the star is the icon glyph, not the drawn dot' );
	assert.deepEqual( made.paired.map( ( p ) => [ p.key, p.part ] ), [ [ 'Root/3#0', '.opts > .opt:nth-of-type(n) > .ico' ], [ 'Root/4#0', '.opts > .opt:nth-of-type(n) > .dot' ] ] );
	// A mark straight inside the chip, where the block draws its one mark inside a wrapper: the chip's badge is inside the paired
	// chip, the slider's pip is not.
	const badge = el( 'Root/6#0', 'span', [], { w: 30 } );
	const chips2 = [ 0, 1 ].map( ( i ) => el( `Root/5#${ i }`, 'button', i ? [] : [ badge ], { words: 'Pick' } ) );
	const noDot = { ...cal, elements: Object.fromEntries( Object.entries( cal.elements ).filter( ( [ p ] ) => ! p.endsWith( '> .dot' ) ) ) };
	const inside = pairAbsorbed( { host: el( 'Root/1#0', 'div', chips2 ), absorbed: [ { element: badge, looks: [ 'background' ] } ], kids, calibration: noDot, finder } );
	assert.deepEqual( inside.paired.map( ( p ) => p.part ), [ '.opts > .opt:nth-of-type(n) > .wrap > .badge' ], 'the badge, never the pip outside the chip' );
} );

test( 'an ambiguous wrapper keeps the one part that holds its paired children', () => {
	const PANELS = { elements: { '': at( 'div', 900 ), '.a': at( 'div', 400 ), '.a > .go': at( 'button', 80 ), '.b': at( 'div', 400 ), '.b > .p': at( 'p', 300 ) }, settings: { aBg: { slot: '.a', property: 'background-color' }, goBg: { slot: '.a > .go', property: 'background-color' } } };
	const btn = el( 'Root/3#0', 'button', [], { words: 'Go' } );
	const panel = el( 'Root/2#0', 'div', [ btn, el( 'Root/4#0', 'i', [] ) ] );
	const made = pairAbsorbed( { host: el( 'Root/1#0', 'div', [ panel ] ), absorbed: [ { element: panel, looks: [ 'background' ] } ], kids, calibration: PANELS, finder } );
	assert.deepEqual( made.slots, { '.a': { tpl: 'Root/2#0' } }, 'the panel holding the button is .a, not .b' );
} );

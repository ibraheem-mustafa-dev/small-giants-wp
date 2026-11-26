// The general pairing of paint conservation (lib/skeleton-part-pairing.mjs): an absorbed draft element is paired with the
// block's measured part by what the part is (kind, repetition, containment, out of flow), and read at that part's calibrated
// slots, only where exactly one part fits. The calibration below is a trimmed copy of a tiles field's default paint and
// settings (cache/form-field-tiles.json, cache/mamas-test/form-field-tiles.paint.json), whose markup the draft does not share.
import test from 'node:test';
import assert from 'node:assert/strict';
import { partModel, draftKind, pairAbsorbed, pairingNotes, glyphy, wordsClass, unpairedRecords, drawsChevron, isCaret, isSummaryRow, drawsSummaryPart } from '../lib/skeleton-part-pairing.mjs';
import { checkRecords } from '../lib/skeleton-paint-conservation.mjs';
import { absorbedSlots } from '../lib/skeleton-conserve-slots.mjs';
import { calPartsFor } from '../lib/skeleton-context.mjs';
import { writeRecordFixture } from '../lib/setting-record.mjs';
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
	assert.deepEqual( [ made.paired.map( ( p ) => p.slots.length > 0 ), made.siblings ], [ [ true, true, true ], [] ], 'every copy is read through a slot of the loop, none through the sibling fallback' );
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

test( 'calPartsFor reads a block\'s parts, settings and text from the client\'s record, and none for a block with no record', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-parts-' ) );
	try {
		writeRecordFixture( dir, 'sgs/tiles', { block: 'sgs/tiles', settings: SETTINGS, text: CAL.text, elements: ELEMENTS }, 'client-a' );
		writeRecordFixture( dir, 'sgs/tiles', { block: 'sgs/tiles', settings: SETTINGS, text: CAL.text, elements: { '': at( 'div', 10 ) } }, 'client-b' );
		const a = calPartsFor( 'client-a', dir )( 'tiles' );
		assert.deepEqual( [ Object.keys( a.elements ).length, a.settings, a.text ], [ Object.keys( ELEMENTS ).length, SETTINGS, CAL.text ] );
		assert.deepEqual( Object.keys( calPartsFor( 'client-b', dir )( 'tiles' ).elements ), [ '' ], 'each client\'s own look' );
		assert.equal( calPartsFor( 'client-b', dir )( 'none' ), null );
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
	const made = pairAbsorbed( { host: el( 'Root/1#0', 'div', [ panel ], { w: 900 } ), absorbed: [ { element: panel, looks: [ 'background' ] } ], kids, calibration: PANELS, finder } );
	assert.deepEqual( made.slots, { '.a': { tpl: 'Root/2#0' } }, 'the panel holding the button is .a, not .b' );
} );

// Round 3 piece 2: the parts' own words and boxes the paint file records (`parts`).
const node = ( key, tag, kids2 = [], { words = '', box = null } = {} ) => ( { key, tag, kids: kids2, visible: { 1440: true }, box: { 1440: box ?? { x: 0, y: 0, w: 100, h: 40 } }, position: { 1440: 'static' }, words, attrs: {} } );
const flat = ( tag, extra = {} ) => ( { 1440: { _tag: tag, _position: 'static', width: '100px', 'background-color': 'rgba(0, 0, 0, 0)', 'border-top-width': '0px', ...extra } } );
const BUTTONS = {
	elements: { '': flat( 'div' ), '.foot': flat( 'div' ), '.foot > .next': flat( 'button' ), '.foot > .back': flat( 'button' ) },
	settings: { nextBg: { slot: '.foot > .next', property: 'background-color' }, backBg: { slot: '.foot > .back', property: 'background-color' } },
};
const BUTTON_WORDS = { '': { box: { 1440: [ 0, 0, 800, 100 ] } }, '.foot > .next': { words: 'Continue', box: { 1440: [ 600, 20, 150, 40 ] } }, '.foot > .back': { words: 'Back', box: { 1440: [ 20, 20, 150, 40 ] } } };

test( 'MUST FAIL (no words signal): a worded control pairs with the part printing the same words; other words stay ambiguous (negative control)', () => {
	const run = ( words, parts ) => {
		const go = node( 'Root/3#0', 'button', [], { words } );
		const foot = node( 'Root/2#0', 'div', [ go ] );
		return pairAbsorbed( { host: node( 'Root/1#0', 'div', [ foot ] ), absorbed: [ { element: go, looks: [ 'background' ] } ], kids, calibration: { ...BUTTONS, parts }, finder } );
	};
	assert.deepEqual( run( 'Continue', BUTTON_WORDS ).slots, { '.foot > .next': { tpl: 'Root/3#0' } } );
	assert.equal( run( 'Continue', {} ).ambiguous.length, 1, 'no recorded words: ambiguous as before' );
	assert.equal( run( 'Next step', BUTTON_WORDS ).ambiguous.length, 1, 'words neither part prints: not guessed' );
} );

test( 'MUST FAIL (a count read as a glyph only): a one-digit count pairs with the part printing a number, not the icon beside it', () => {
	const CART = {
		elements: { '': flat( 'button' ), '.icon': flat( 'svg' ), '.badge': flat( 'span', { 'background-color': 'rgb(200, 0, 0)' } ) },
		settings: { iconColour: { slot: '.icon', property: 'color' }, badgeBg: { slot: '.badge', property: 'background-color' } },
	};
	const run = ( parts ) => {
		const count = node( 'Root/3#0', 'span', [], { words: '0' } );
		return pairAbsorbed( { host: node( 'Root/1#0', 'button', [ node( 'Root/2#0', 'svg' ), count ] ), absorbed: [ { element: count, looks: [ 'background' ] } ], kids, calibration: { ...CART, parts }, finder } );
	};
	assert.equal( run( {} ).ambiguous.length, 1 );
	assert.deepEqual( run( { '.badge': { words: '0', box: { 1440: [ 30, 0, 18, 18 ] } } } ).slots, { '.badge': { tpl: 'Root/3#0' } } );
	const repeated = partModel( { '': flat( 'ul' ), '.i:nth-of-type(1)': flat( 'li' ), '.i:nth-of-type(2)': flat( 'li' ) }, [], { '.i:nth-of-type(1)': { words: 'One', box: { 1440: [ 0, 0, 9, 9 ] } } } );
	assert.equal( repeated.parts.get( '.i:nth-of-type(n)' ).words, 'One', 'a repeated part takes its first recorded instance' );
	assert.deepEqual( [ wordsClass( '12' ), wordsClass( '£19' ), wordsClass( '£19.50' ), wordsClass( 'Close' ), wordsClass( ' ' ) ], [ 'number', 'price', 'price', 'words', null ] );
} );

test( 'MUST FAIL (no place signal): a wordless panel pairs with the part whose box sits at the same place in the block; a place between two parts stays ambiguous (negative control)', () => {
	const PANELS2 = {
		elements: { '': flat( 'div' ), '.main': flat( 'div' ), '.main > p': flat( 'p', { width: '50px' } ), '.side': flat( 'aside' ), '.side > p': flat( 'p', { width: '50px' } ) },
		settings: { mainBg: { slot: '.main', property: 'background-color' }, sideBg: { slot: '.side', property: 'background-color' } },
		parts: { '': { box: { 1440: [ 0, 0, 1000, 500 ] } }, '.main': { box: { 1440: [ 0, 0, 700, 500 ] } }, '.side': { box: { 1440: [ 700, 0, 300, 500 ] } } },
	};
	const run = ( x, w, calibration = PANELS2 ) => {
		const panel = node( 'Root/2#0', 'div', [ node( 'Root/3#0', 'p', [], { words: 'Summary text' } ) ], { box: { x, y: 100, w, h: 600 } } );
		return pairAbsorbed( { host: node( 'Root/1#0', 'section', [ panel ], { box: { x: 0, y: 100, w: 1200, h: 600 } } ), absorbed: [ { element: panel, looks: [ 'background' ] } ], kids, calibration, finder } );
	};
	assert.deepEqual( run( 840, 360 ).slots, { '.side': { tpl: 'Root/2#0' } }, 'the right-hand column is the side part' );
	assert.equal( run( 420, 360 ).ambiguous.length, 1, 'a box between the two parts decides nothing' );
	assert.equal( run( 840, 360, { ...PANELS2, parts: {} } ).ambiguous.length, 1, 'no recorded boxes: ambiguous as before' );
} );

// A messaging card: a round badge holding the app's icon beside a text box holding a title over a line. Both are boxes with the
// same paint, so paint alone fits a draft's round disc to either (cache/cart.json's neighbours: whatsapp-cta, trimmed).
const CARD = {
	elements: {
		'': flat( 'a' ), '.badge': flat( 'span', { width: '38px', 'background-color': 'rgb(37, 211, 102)' } ), '.badge > .icon': flat( 'svg', { width: '20px' } ),
		'.text': flat( 'span', { width: '300px', 'background-color': 'rgb(37, 211, 102)' } ), '.text > .title': flat( 'span', { width: '90px' } ), '.text > .line': flat( 'span', { width: '200px' } ),
	},
	settings: { badgeFill: { slot: '.badge', property: 'background-color' }, textFill: { slot: '.text', property: 'background-color' } },
	parts: { '.text > .title': { words: 'Chat to us', box: { 1440: [ 60, 10, 90, 18 ] } }, '.text > .line': { words: 'We reply within the hour', box: { 1440: [ 60, 30, 200, 18 ] } } },
};
test( 'MUST FAIL (no holds signal): a disc holding a picture is the part that holds the icon, a box holding words the part that holds the words; a box holding both stays ambiguous (negative control)', () => {
	const run = ( kidsOf, calibration = CARD ) => {
		const box = node( 'Root/2#0', 'span', kidsOf, { box: { x: 0, y: 0, w: 38, h: 38 } } );
		return pairAbsorbed( { host: node( 'Root/1#0', 'a', [ box ] ), absorbed: [ { element: box, looks: [ 'background' ] } ], kids, calibration, finder } );
	};
	// The same card with one words part under the text box, so its words element is decided there.
	const ONE_LINE = { ...CARD, elements: Object.fromEntries( Object.entries( CARD.elements ).filter( ( [ k ] ) => '.text > .line' !== k ) ) };
	assert.deepEqual( run( [ node( 'Root/3#0', 'img' ) ] ).slots, { '.badge': { tpl: 'Root/2#0' } }, 'the disc that holds the picture is the badge' );
	assert.deepEqual( run( [ node( 'Root/3#0', 'span', [], { words: 'Need advice?' } ) ] ).slots, { '.text': { tpl: 'Root/2#0' } }, 'the box that holds words is the text box' );
	assert.equal( run( [ node( 'Root/3#0', 'svg' ), node( 'Root/4#0', 'span', [], { words: 'Need advice?' } ) ], ONE_LINE ).ambiguous.length, 1, 'a box holding an icon and words fits neither by what it holds, and its contents (the icon in the badge, the words in the text box) belong to different parts' );
	// A picture no part can be, and words that two text parts could print, place nothing yet: the box stays ambiguous, as the words
	// stay until a part is decided for them (the text box is placed only by a content already placed in it).
	assert.equal( run( [ node( 'Root/3#0', 'img' ), node( 'Root/4#0', 'span', [], { words: 'Need advice?' } ) ] ).ambiguous.length, 1, 'no content is placed in a part yet' );
	assert.deepEqual( run( [ node( 'Root/3#0', 'img' ), node( 'Root/4#0', 'span', [], { words: 'Need advice?' } ) ], ONE_LINE ).slots, { '.text': { tpl: 'Root/2#0' } }, 'the words are the one words part of the text box (placed), so the box holding them is that box' );
	// A card body that holds words (with a picture beside them) and a price row that holds words alone are both boxes of words: a draft box
	// holding words is dropped from the icon-only parts only, never narrowed to the words-only part.
	const CARD2 = { ...CARD, elements: { '': flat( 'div' ), '.body': flat( 'div', { width: '300px', 'background-color': 'rgb(37, 211, 102)' } ), '.body > .pic': flat( 'img', { width: '40px' } ), '.body > .name': flat( 'span', { width: '90px' } ), '.price': flat( 'span', { width: '300px', 'background-color': 'rgb(37, 211, 102)' } ), '.price > .amount': flat( 'span', { width: '60px' } ) }, parts: {} };
	const body = node( 'Root/2#0', 'div', [ node( 'Root/3#0', 'span', [], { words: 'Zookie' } ) ], { box: { x: 0, y: 0, w: 300, h: 80 } } );
	assert.equal( pairAbsorbed( { host: node( 'Root/1#0', 'div', [ body ] ), absorbed: [ { element: body, looks: [ 'background' ] } ], kids, calibration: { ...CARD2, settings: { bodyFill: { slot: '.body', property: 'background-color' }, priceFill: { slot: '.price', property: 'background-color' } } }, finder } ).ambiguous.length, 1, 'a box of words is not narrowed to the words-only part' );
} );

// A bag button's count: the block draws its trigger twice (alone, and inside a wrapper) with a badge pinned to the corner;
// the draft's count sits in flow on the desktop and is pinned to the corner only on the phone, and the slot walk already
// gave the trigger part the draft's button (cache/cart.json, cache/eye-care-clone-test/cart.paint.json, trimmed).
const pinned = ( tag, extra = {} ) => ( { 375: { _tag: tag, _position: 'absolute', width: '18px', 'background-color': 'rgba(0, 0, 0, 0)', ...extra }, 1440: { _tag: tag, _position: 'absolute', width: '18px', 'background-color': 'rgba(0, 0, 0, 0)', ...extra } } );
const BAG = {
	elements: {
		'': flat( 'div' ), '.trigger': flat( 'button' ), '.trigger > .icon': flat( 'span', { width: '24px' } ), '.trigger > .icon > svg': flat( 'svg', { width: '24px' } ), '.trigger > .badge': pinned( 'span' ),
		'.trigger > .badge::after': pinned( 'span', { 'background-color': 'rgb(156, 139, 120)' } ), '.trigger > .label': flat( 'span' ),
		'.wrap': flat( 'div' ), '.wrap > .trigger': flat( 'button' ), '.wrap > .trigger > .icon': flat( 'span', { width: '24px' } ), '.wrap > .trigger > .icon > svg': flat( 'svg', { width: '24px' } ), '.wrap > .trigger > .badge': pinned( 'span' ),
	},
	settings: { labelFill: { slot: '.trigger > .label', property: 'background-color' }, iconColour: { slot: '.trigger > .icon > svg', property: 'color' }, badgeText: { slot: '.trigger > .badge', property: 'color' }, badgeFill: { slot: '.trigger > .badge', property: 'background-image' }, triggerBorder: { slot: '.trigger', property: 'border-top-width' } },
	parts: { '.trigger > .label': { words: 'Bag', box: { 1440: [ 14, 12, 29, 19 ] } }, '.trigger > .badge': { words: '0', box: { 1440: [ 24, 2, 18, 18 ] } }, '.wrap > .trigger > .badge': { words: '0', box: { 1440: [ 24, 2, 18, 18 ] } } },
};
const bag = ( positions, taken, words = '0', visible = { 375: true, 1440: true } ) => {
	const count = { ...node( 'Root/3#0', 'span', [], { words } ), position: positions, visible };
	const button = node( 'Root/1#0', 'button', [ node( 'Root/2#0', 'svg' ), count ] );
	return pairAbsorbed( { host: button, absorbed: [ { element: count, looks: [ 'background' ] } ], kids, calibration: BAG, finder, taken } );
};

test( 'MUST FAIL (a count pinned only on the phone, inside a held trigger): it pairs with the held trigger\'s badge', () => {
	const r = bag( { 375: 'absolute', 1440: 'static' }, { '.trigger': { tpl: 'Root/1#0' } } );
	assert.deepEqual( r.slots, { '.trigger > .badge': { tpl: 'Root/3#0' } }, JSON.stringify( r ) );
	assert.deepEqual( bag( { 375: 'static', 1440: 'absolute' }, { '.trigger': { tpl: 'Root/1#0' } } ).slots, { '.trigger > .badge': { tpl: 'Root/3#0' } }, 'pinned on the desktop only' );
	assert.deepEqual( bag( { 375: 'absolute', 1440: 'static' }, { '.trigger': { tpl: 'Root/1#0' } }, 'Bag' ).slots, { '.trigger > .label': { tpl: 'Root/3#0' } }, 'a word pinned on the phone only may still be an in-flow part' );
} );

test( 'negative controls: with no held trigger both badges fit; a count in flow at every width keeps the in-flow parts; a count pinned at every width takes only a pinned part', () => {
	assert.equal( bag( { 375: 'absolute', 1440: 'static' }, {} ).ambiguous.length, 1, 'no held part: the two triggers\' badges both fit' );
	assert.ok( ! Object.keys( bag( { 375: 'static', 1440: 'static' }, { '.trigger': { tpl: 'Root/1#0' } } ).slots ).length, 'a count never pinned is not paired with the pinned badge' );
	assert.deepEqual( bag( { 375: 'absolute', 1440: 'absolute' }, { '.trigger': { tpl: 'Root/1#0' } } ).slots, { '.trigger > .badge': { tpl: 'Root/3#0' } } );
	assert.deepEqual( bag( { 375: 'absolute', 1440: 'static' }, { '.trigger > .badge::after': { tpl: 'Root/1#0' } } ).ambiguous.length, 1, 'a held pseudo-element slot is no part to pair inside' );
	assert.ok( ! Object.keys( bag( { 375: 'absolute', 1440: 'static' }, { '.trigger': { tpl: 'Root/1#0' } }, '0', { 375: false, 1440: true } ).slots ).length, 'a width the count is not drawn at says nothing of its flow' );
} );

test( 'MUST FAIL (a refused pairing leaves no record): each element several parts fit carries an unpaired record the conservation check lists apart', () => {
	const r = bag( { 375: 'absolute', 1440: 'static' }, {} );
	const recs = unpairedRecords( r, 'sgs/x' );
	assert.deepEqual( recs.get( 'Root/3#0' ), { kind: 'unpaired', block: 'sgs/x', candidates: r.ambiguous[ 0 ].candidates } );
	const checked = checkRecords( [ recs.get( 'Root/3#0' ) ], { looks: [ 'background' ], nodes: new Map() } );
	assert.equal( checked.listed?.kind, 'unpaired', JSON.stringify( checked ) );
	assert.equal( checkRecords( [ { kind: 'unpaired', block: 'sgs/x', candidates: [] } ], { looks: [ 'background' ], nodes: new Map() } ).bad.length, 1, 'a record naming no candidates is refused' );
	assert.equal( unpairedRecords( bag( { 375: 'absolute', 1440: 'static' }, { '.trigger': { tpl: 'Root/1#0' } } ), 'sgs/x' ).size, 0, 'a paired element has no record' );
} );

// A menu whose row is a link and, beside it, a disclosure summary that holds the label and the caret (the drawer menu's
// accordion row): the summary is drawn out of flow over the row, so the in-flow link part is the one a draft button would fit.
const ROW = ( k ) => `.bar > .item:nth-of-type(${ k })`;
const MENU = {
	elements: {
		'': flat( 'nav' ), '.bar': flat( 'ul' ),
		...Object.fromEntries( [ 1, 2 ].flatMap( ( k ) => [
			[ ROW( k ), flat( 'li' ) ],
			[ `${ ROW( k ) } > .row`, flat( 'div' ) ],
			[ `${ ROW( k ) } > .row > .link`, flat( 'a' ) ],
			[ `${ ROW( k ) } > .row > .link > .text`, flat( 'span' ) ],
			[ `${ ROW( k ) } > .row > .summary`, flat( 'summary', { _position: 'absolute' } ) ],
			[ `${ ROW( k ) } > .row > .summary > .caret`, flat( 'span', { width: '40px', 'background-color': 'rgb(1, 2, 3)' } ) ],
		] ) ),
	},
	settings: {
		linkColour: { slot: `${ ROW( 1 ) } > .row > .link`, slots: [ `${ ROW( 1 ) } > .row > .link`, `${ ROW( 2 ) } > .row > .link` ], property: 'color' },
		rowGap: { slot: `${ ROW( 1 ) } > .row > .summary`, slots: [ `${ ROW( 1 ) } > .row > .summary`, `${ ROW( 2 ) } > .row > .summary` ], property: 'gap' },
	},
	text: {},
};
const ROTATING = 'display: flex; transform: rotate(0deg); transition: transform 0.45s;';
// The caret the draft draws: a wordless glyph holder that turns, a typed character, or a one-shape three-point svg; or none.
const CARETS = {
	turning: ( n ) => el( `Root/${ n }#0`, 'span', [], { w: 16, h: 16, attrs: { style: ROTATING } } ),
	typed: ( n ) => el( `Root/${ n }#0`, 'span', [], { w: 16, h: 16, words: '▾' } ),
	chevron: ( n ) => ( { ...el( `Root/${ n }#0`, 'svg', [], { w: 16, h: 16 } ), svg: '<svg viewBox="0 0 16 16"><polyline points="4,6 8,10 12,6"/></svg>' } ),
	arrow: ( n ) => ( { ...el( `Root/${ n }#0`, 'svg', [], { w: 16, h: 16 } ), svg: '<svg viewBox="0 0 16 16"><line x1="3" y1="8" x2="12" y2="8"/><polyline points="8.5,4.5 12,8 8.5,11.5"/></svg>' } ),
	none: () => null,
};
// Two draft rows of the same shape: a button holding a number, a label and a circle that holds the caret.
const menuRows = ( caret, tag = 'button', attrs = {} ) => {
	const rows = [ 0, 1 ].map( ( i ) => {
		const c = caret( 7 );
		const circle = el( `Root/6#${ i }`, 'span', c ? [ { ...c, key: `Root/7#${ i }` } ] : [], { w: 40, h: 40 } );
		const control = el( `Root/4#${ i }`, tag, [ el( `Root/5#${ i }`, 'span', [], { words: `Sector ${ i }` } ), circle ], { w: 400, h: 72, attrs } );
		return el( `Root/3#${ i }`, 'div', [ control ], { w: 400, h: 72 } );
	} );
	return { host: el( 'Root/2#0', 'nav', rows ), rows, control: ( i ) => rows[ i ].kids[ 0 ] };
};
const SUMMARY = ( k ) => `${ ROW( k ) } > .row > .summary`;
const LINK = ( k ) => `${ ROW( k ) } > .row > .link`;
const pairRow = ( m, calibration = MENU, summaryRows = true ) => pairAbsorbed( { host: m.host, absorbed: [ { element: m.control( 0 ), looks: null } ], kids, calibration, finder, summaryRows } );

test( 'MUST FAIL (a words-plus-caret toggle fits only the in-flow link part): a draft control holding a label and a caret is the menu\'s summary row, and its gap is read there', () => {
	for ( const [ name, caret ] of [ [ 'a turning glyph holder', CARETS.turning ], [ 'a typed caret character', CARETS.typed ], [ 'a chevron svg', CARETS.chevron ] ] ) {
		const made = pairRow( menuRows( caret ) );
		assert.deepEqual( made.slots, { [ SUMMARY( 1 ) ]: { tpl: 'Root/4#0' }, [ SUMMARY( 2 ) ]: { tpl: 'Root/4#1' } }, `${ name }: ${ JSON.stringify( made ) }` );
		assert.deepEqual( made.paired.map( ( p ) => [ p.key, p.part ] ), [ [ 'Root/4#0', '.bar > .item:nth-of-type(n) > .row > .summary' ] ], name );
	}
	const ordinary = menuRows( CARETS.turning );
	assert.deepEqual( Object.keys( pairRow( ordinary, MENU, false ).slots ), [ LINK( 1 ), LINK( 2 ) ], 'the ordinary pairing is unchanged: the link part' );
	const bySummary = menuRows( CARETS.chevron, 'summary' );
	assert.deepEqual( Object.keys( pairRow( bySummary ).slots ).sort(), [ SUMMARY( 1 ), SUMMARY( 2 ) ], 'a native summary element holding words and a caret' );
} );

test( 'negative controls: a link with a trailing arrow, a toggle with no caret, a caret with no words, and a block with no summary part all keep the link part', () => {
	const linked = ( m ) => ( { [ LINK( 1 ) ]: { tpl: m.control( 0 ).key }, [ LINK( 2 ) ]: { tpl: m.control( 1 ).key } } );
	const arrow = menuRows( CARETS.arrow, 'a' );
	assert.deepEqual( pairRow( arrow ).slots, linked( arrow ), 'a plain link with a trailing arrow icon' );
	const bare = menuRows( CARETS.none );
	assert.deepEqual( pairRow( bare ).slots, linked( bare ), 'a button with a label and an empty circle' );
	const silent = menuRows( CARETS.turning );
	[ 0, 1 ].forEach( ( i ) => ( silent.control( i ).kids = [ silent.control( i ).kids[ 1 ] ] ) );
	assert.ok( ! Object.keys( pairRow( silent ).slots ).includes( SUMMARY( 1 ) ), 'a caret with no words beside it is no row' );
	const noSummary = { ...MENU, elements: Object.fromEntries( Object.entries( MENU.elements ).filter( ( [ p ] ) => ! p.includes( '.summary' ) ) ) };
	const plain = menuRows( CARETS.turning );
	assert.deepEqual( pairRow( plain, noSummary ).slots, linked( plain ), 'a block that draws no summary part keeps the link' );
} );

test( 'MUST FAIL: a plain link with a trailing arrow is never the disclosure summary part, even when the summary is drawn in flow', () => {
	// The summary part drawn in flow (not out of flow) fits the link as well as the link part does, by kind and flow alone.
	const inFlow = { ...MENU, elements: Object.fromEntries( Object.entries( MENU.elements ).map( ( [ p, v ] ) => [ p, p.endsWith( '.summary' ) ? flat( 'summary' ) : v ] ) ) };
	const linked = ( m ) => ( { [ LINK( 1 ) ]: { tpl: m.control( 0 ).key }, [ LINK( 2 ) ]: { tpl: m.control( 1 ).key } } );
	const arrow = menuRows( CARETS.arrow, 'a' );
	const made = pairRow( arrow, inFlow, false );
	assert.deepEqual( made.slots, linked( arrow ), JSON.stringify( made.ambiguous ) );
	assert.deepEqual( made.ambiguous, [] );
	// Negative control: a words-plus-caret row is still the summary row (summaryRows), and in flow it is still ambiguous nowhere.
	const caret = menuRows( CARETS.chevron );
	assert.deepEqual( Object.keys( pairRow( caret, inFlow ).slots ).sort(), [ SUMMARY( 1 ), SUMMARY( 2 ) ] );
} );

test( 'drawsChevron reads one shape of three corners off a line; isCaret and isSummaryRow read a caret and a words-plus-caret control', () => {
	const svg = ( inner ) => `<svg viewBox="0 0 16 16">${ inner }</svg>`;
	assert.ok( drawsChevron( svg( '<polyline points="4,6 8,10 12,6"/>' ) ) );
	assert.ok( drawsChevron( svg( '<path d="M4 6 L8 10 L12 6" fill="none"/>' ) ), 'a path of a move and two lines' );
	assert.ok( drawsChevron( svg( '<path d="m4 6 4 4 4-4"/>' ) ), 'relative lines' );
	assert.ok( ! drawsChevron( svg( '<line x1="3" y1="8" x2="12" y2="8"/><polyline points="8.5,4.5 12,8 8.5,11.5"/>' ) ), 'an arrow is two shapes' );
	assert.ok( ! drawsChevron( svg( '<polyline points="2,8 8,8 14,8"/>' ) ), 'three points on a line' );
	assert.ok( ! drawsChevron( svg( '<path d="M4 6 C6 10 10 10 12 6"/>' ) ), 'a curve is not read' );
	assert.ok( ! drawsChevron( '' ) );
	assert.ok( isCaret( el( 'a', 'span', [], { words: '▾' } ) ) && ! isCaret( el( 'b', 'span', [], { words: '»' } ) ), 'a typed down pointer, not a trailing quote' );
	assert.ok( ! isCaret( el( 'c', 'span', [], { attrs: { style: 'transform: rotate(45deg);' } } ) ), 'a rotation with no transition is no turning caret' );
	const row = menuRows( CARETS.turning );
	assert.ok( isSummaryRow( row.control( 0 ), kids ) );
	assert.ok( ! isSummaryRow( menuRows( CARETS.arrow, 'a' ).control( 0 ), kids ) && ! isSummaryRow( el( 'd', 'div', [ el( 'e', 'span', [], { words: 'Label' } ), CARETS.turning( 9 ) ] ), kids ), 'a trailing arrow, or a box that is no control' );
} );

test( 'MUST FAIL (a loop of rows where only some hold a caret): every copy is a toggle, so the summary slots are read at the copy of their position; the first row may be a plain row', () => {
	const m = menuRows( CARETS.turning );
	m.control( 0 ).kids = [ m.control( 0 ).kids[ 0 ] ];
	const made = pairRow( m );
	assert.deepEqual( made.slots, { [ SUMMARY( 1 ) ]: { tpl: 'Root/4#0' }, [ SUMMARY( 2 ) ]: { tpl: 'Root/4#1' } }, JSON.stringify( made ) );
	const plain = menuRows( CARETS.none );
	assert.ok( ! Object.keys( pairRow( plain ).slots ).includes( SUMMARY( 1 ) ), 'no row holds a caret: the loop stays a link row' );
} );

test( 'drawsSummaryPart: a calibration with a control part that is a summary element', () => {
	assert.ok( drawsSummaryPart( MENU ) );
	assert.ok( ! drawsSummaryPart( BUTTONS ) && ! drawsSummaryPart( {} ) );
} );

// The structure tier: what an element contains and what contains it decide its part before paint does. A control's own words are
// drawn by the plain words part of its part, so a words element beside them is the other words part (an ornament).
const ROWS = ( k ) => `.bar > .item:nth-of-type(${ k }) > .link`;
const ORNAMENTS = {
	elements: {
		'': flat( 'nav' ), '.bar': flat( 'ul' ),
		...Object.fromEntries( [ 1, 2 ].flatMap( ( k ) => [
			[ `.bar > .item:nth-of-type(${ k })`, flat( 'li' ) ],
			[ ROWS( k ), flat( 'a' ) ],
			[ `${ ROWS( k ) } > .orn`, flat( 'span' ) ],
			[ `${ ROWS( k ) } > .orn::before`, { 1440: { width: '6px' } } ],
			[ `${ ROWS( k ) } > .label`, flat( 'span' ) ],
		] ) ),
	},
	settings: {
		ornSize: { slot: `${ ROWS( 1 ) } > .orn`, slots: [ `${ ROWS( 1 ) } > .orn`, `${ ROWS( 2 ) } > .orn` ], property: 'font-size' },
		labelSize: { slot: `${ ROWS( 1 ) } > .label`, property: 'font-size' },
	},
	text: {},
};
const ornamentRows = ( ownWords, second ) => {
	const link = ( i, kid ) => node( `Root/4#${ i }`, 'a', [ kid ], { words: ownWords ? `Row ${ i }` : '' } );
	const pill = node( 'Root/5#0', 'span', [], { words: '3 for £5' } );
	const rows = [ node( 'Root/3#0', 'li', [ link( 0, pill ) ] ), node( 'Root/3#1', 'li', [ link( 1, second ) ] ) ];
	return { host: node( 'Root/2#0', 'ul', rows ), pill };
};

test( 'MUST FAIL (a control holds its own words): a words element beside them is the other words part, and a loop\'s other items read only the same kind of element', () => {
	const arrow = node( 'Root/5#1', 'span', [], { words: '→' } );
	const m = ornamentRows( true, arrow );
	const made = pairAbsorbed( { host: m.host, absorbed: [ { element: m.pill, looks: null } ], kids, calibration: ORNAMENTS, finder } );
	assert.deepEqual( made.ambiguous, [], 'the badge is not ambiguous between the two words parts' );
	assert.deepEqual( made.slots, { [ `${ ROWS( 1 ) } > .orn` ]: { tpl: 'Root/5#0' } }, 'read at the part that is not the control\'s own words, and not at the arrow of the second row' );
	// Negative controls: a control with no words of its own leaves both parts fitting; so does one whose words parts both hold something.
	const bare = ornamentRows( false, arrow );
	assert.equal( pairAbsorbed( { host: bare.host, absorbed: [ { element: bare.pill, looks: null } ], kids, calibration: ORNAMENTS, finder } ).ambiguous.length, 1, 'no own words: both parts fit' );
	const both = { ...ORNAMENTS, elements: { ...ORNAMENTS.elements, ...Object.fromEntries( [ 1, 2 ].map( ( k ) => [ `${ ROWS( k ) } > .label::before`, { 1440: { width: '6px' } } ] ) ) } };
	const worded = ornamentRows( true, arrow );
	assert.equal( pairAbsorbed( { host: worded.host, absorbed: [ { element: worded.pill, looks: null } ], kids, calibration: both, finder } ).ambiguous.length, 1, 'both words parts hold a decoration: no plain one to give the control' );
} );

const HEADS = {
	elements: {
		'': flat( 'div' ),
		'.head': flat( 'div', { width: '300px', 'background-color': 'rgb(1, 2, 3)' } ), '.head > .close': flat( 'button', { width: '40px' } ), '.head > .close > .icon': flat( 'svg', { width: '20px' } ),
		'.foot': flat( 'div', { width: '300px', 'background-color': 'rgb(1, 2, 3)' } ), '.foot > .next': flat( 'button', { width: '80px' } ), '.foot > .label': flat( 'span', { width: '50px' } ),
	},
	settings: { headFill: { slot: '.head', property: 'background-color' }, footFill: { slot: '.foot', property: 'background-color' }, closeFill: { slot: '.head > .close', property: 'background-color' } },
	text: { label: { path: '.foot > .label' } },
};
const headRun = ( inner ) => {
	const glyph = node( 'Root/5#0', 'span', [], { words: '×' } );
	const close = node( 'Root/4#0', 'button', [ glyph ], { words: 'Close' } );
	const wrapper = node( 'Root/3#0', 'div', [ ...( inner ? [ node( 'Root/6#0', 'div', [ close, ...inner ] ) ] : [ close ] ) ] );
	const outer = node( 'Root/2#0', 'div', [ wrapper ] );
	const host = node( 'Root/1#0', 'div', [ outer ], { box: { x: 0, y: 0, w: 900, h: 40 } } );
	const absorbed = [ outer, wrapper, close ].map( ( element ) => ( { element, looks: [ 'background' ] } ) );
	return { made: pairAbsorbed( { host, absorbed, kids, calibration: HEADS, finder } ), outer, wrapper, close };
};

test( 'MUST FAIL (structure: a wrapper holds its contents\' part): the wrapper round a part\'s button is that part, and the wrapper inside it that no part fits is drawn flat', () => {
	const { made, outer, wrapper, close } = headRun( null );
	assert.deepEqual( made.ambiguous, [], JSON.stringify( made.ambiguous ) );
	assert.deepEqual( made.slots, { '.head': { tpl: outer.key }, '.head > .close': { tpl: close.key } }, 'the outermost wrapper is the head, the button its close' );
	assert.deepEqual( made.flat.map( ( f ) => f.key ), [ wrapper.key ], 'the inner wrapper has no part inside the head' );
	assert.ok( made.flat[ 0 ].candidates.length && made.flat[ 0 ].why );
	const rec = unpairedRecords( made, 'sgs/demo' ).get( wrapper.key );
	assert.deepEqual( [ rec.kind, rec.block ], [ 'unpaired', 'sgs/demo' ], 'the flat wrapper carries a record the check lists apart' );
	assert.ok( pairingNotes( made, 'sgs/demo' ).paired.has( wrapper.key ) && ! pairingNotes( made, 'sgs/demo' ).problems.length );
	// Negative control: a wrapper whose contents belong to two parts stays ambiguous.
	const split = node( 'Root/7#0', 'span', [], { words: 'Pay' } );
	const glyph = node( 'Root/5#0', 'span', [], { words: '×' } );
	const outer2 = node( 'Root/2#0', 'div', [ glyph, split ] );
	const two = pairAbsorbed( { host: node( 'Root/1#0', 'div', [ outer2 ], { box: { x: 0, y: 0, w: 900, h: 40 } } ), absorbed: [ { element: outer2, looks: [ 'background' ] } ], kids, calibration: HEADS, finder } );
	assert.equal( two.ambiguous.length, 1, 'one content in the head, one in the foot: neither part holds more' );
	assert.deepEqual( two.flat, [] );
} );

test( 'MUST FAIL (structure: nested elements, wrappers of marks): of two nested elements one part fits, the outer holds it; a wrapper of marks alone is the part of marks, not the card', () => {
	const ONE = {
		elements: { '': flat( 'div' ), '.head': flat( 'div', { width: '300px', 'background-color': 'rgb(1, 2, 3)' } ), '.head > .t': flat( 'span', { width: '50px' } ) },
		settings: { headFill: { slot: '.head', property: 'background-color' } },
		text: {},
	};
	const inner = node( 'Root/3#0', 'div', [ node( 'Root/4#0', 'span', [], { words: 'Total' } ) ] );
	const outer = node( 'Root/2#0', 'div', [ inner ] );
	const nested = pairAbsorbed( { host: node( 'Root/1#0', 'div', [ outer ], { box: { x: 0, y: 0, w: 900, h: 40 } } ), absorbed: [ outer, inner ].map( ( element ) => ( { element, looks: [ 'background' ] } ) ), kids, calibration: ONE, finder } );
	assert.deepEqual( [ nested.slots, nested.ambiguous, nested.flat.map( ( f ) => f.key ) ], [ { '.head': { tpl: outer.key } }, [], [ inner.key ] ], 'the outer element holds the part and the inner is flat' );
	const TRACK = {
		elements: {
			'': flat( 'div' ),
			'.track': flat( 'div', { width: '300px', 'background-color': 'rgb(1, 2, 3)' } ), '.track > .fill': flat( 'span', { width: '40px', 'background-color': 'rgb(4, 5, 6)' } ),
			'.card': flat( 'div', { width: '300px', 'background-color': 'rgb(1, 2, 3)' } ), '.card > .dot': flat( 'span', { width: '10px', 'background-color': 'rgb(4, 5, 6)' } ), '.card > .title': flat( 'span', { width: '50px' } ),
		},
		settings: { trackFill: { slot: '.track', property: 'background-color' }, cardFill: { slot: '.card', property: 'background-color' } },
		text: {},
	};
	const wrap = node( 'Root/2#0', 'div', [ node( 'Root/3#0', 'span' ) ] );
	const run = ( w ) => pairAbsorbed( { host: node( 'Root/1#0', 'div', [ w ], { box: { x: 0, y: 0, w: 900, h: 40 } } ), absorbed: [ { element: w, looks: [ 'background' ] } ], kids, calibration: TRACK, finder } );
	assert.deepEqual( [ run( wrap ).slots, run( wrap ).ambiguous ], [ { '.track': { tpl: wrap.key } }, [] ], 'a wrapper of one mark is the track' );
	// Negative control: a wrapper of a mark and words is not narrowed by that tier.
	const mixed = node( 'Root/2#0', 'div', [ node( 'Root/3#0', 'span' ), node( 'Root/4#0', 'span', [], { words: 'Total' } ) ] );
	assert.deepEqual( run( mixed ).slots, { '.card': { tpl: mixed.key } }, 'it holds a mark and words: only the card has both' );
} );

// Round: the structure step's safeguards (the host's own wrapper, the settled wrapper, the part an element already holds, a loop's
// copies of one sort).
const wide = { x: 0, y: 0, w: 900, h: 40 };

test( 'MUST FAIL (the host\'s own wrapper): a sole box round the whole card is the block\'s root box, drawn flat, and the body inside it is the body part', () => {
	const BODY = {
		elements: { '': flat( 'div', { width: '290px' } ), '.body': flat( 'div', { width: '290px', 'background-color': 'rgb(1, 2, 3)' } ), '.body > .name': flat( 'span', { width: '60px' } ), '.media': flat( 'div', { width: '290px', 'background-color': 'rgb(4, 5, 6)' } ), '.media > .pic': flat( 'img', { width: '290px' } ) },
		settings: { bodyFill: { slot: '.body', property: 'background-color' } },
		text: { name: { path: '.body > .name' } },
	};
	const make = ( wrapWidth ) => {
		const body = node( 'Root/4#0', 'div', [ node( 'Root/5#0', 'span', [], { words: 'Zookie' } ) ], { box: { x: 0, y: 200, w: 290, h: 80 } } );
		const wrap = node( 'Root/3#0', 'div', [ node( 'Root/6#0', 'img' ), body ], { box: { x: 0, y: 0, w: wrapWidth, h: 280 } } );
		const host = node( 'Root/1#0', 'div', [ wrap ], { box: { x: 0, y: 0, w: 290, h: 280 } } );
		return { body, wrap, made: pairAbsorbed( { host, absorbed: [ wrap, body ].map( ( element ) => ( { element, looks: [ 'background' ] } ) ), kids, calibration: BODY, finder } ) };
	};
	const { body, wrap, made } = make( 296 );
	assert.deepEqual( made.slots, { '.body': { tpl: body.key } }, 'the body is read at the body part, not the wrapper round the card' );
	assert.deepEqual( made.flat.map( ( f ) => f.key ), [ wrap.key ] );
	assert.ok( made.flat[ 0 ].candidates.length && made.flat[ 0 ].why, 'the record names a candidate, as the conservation check needs' );
	// Negative control: a wrapper much narrower than the host is no root box; it holds the body part, and the body inside it is flat.
	const narrow = make( 100 );
	assert.deepEqual( narrow.made.slots, { '.body': { tpl: narrow.wrap.key } } );
	assert.deepEqual( narrow.made.flat.map( ( f ) => f.key ), [ narrow.body.key ] );
} );

test( 'MUST FAIL (a wrapper sits in the tightest part that holds its placed contents): a box whose one word is placed in an inner part is that inner part, not the part round it', () => {
	const NEST = {
		elements: { '': flat( 'div', { width: '600px' } ), '.body': flat( 'div', { width: '400px', 'background-color': 'rgb(1, 2, 3)' } ), '.body > .pic': flat( 'img', { width: '40px' } ), '.body > .inner': flat( 'div', { width: '250px', 'background-color': 'rgb(4, 5, 6)' } ), '.body > .inner > .name': flat( 'span', { width: '60px' } ) },
		settings: { bodyFill: { slot: '.body', property: 'background-color' }, innerFill: { slot: '.body > .inner', property: 'background-color' } },
		text: { name: { path: '.body > .inner > .name' } },
	};
	const word = node( 'Root/3#0', 'span', [], { words: 'Zookie' } );
	const box = node( 'Root/2#0', 'div', [ word ] );
	const made = pairAbsorbed( { host: node( 'Root/1#0', 'div', [ box ], { box: wide } ), absorbed: [ { element: box, looks: [ 'background' ] } ], kids, calibration: NEST, finder } );
	assert.deepEqual( [ made.slots, made.ambiguous ], [ { '.body > .inner': { tpl: box.key } }, [] ] );
	// Negative control: with a picture that only the outer part draws, the outer part holds more of the contents and is the wrapper.
	const two = node( 'Root/2#0', 'div', [ word, node( 'Root/4#0', 'img' ) ] );
	const split = pairAbsorbed( { host: node( 'Root/1#0', 'div', [ two ], { box: wide } ), absorbed: [ { element: two, looks: [ 'background' ] } ], kids, calibration: NEST, finder } );
	assert.deepEqual( split.slots, { '.body': { tpl: two.key } }, 'the picture lies in the outer part only' );
} );

test( 'MUST FAIL (the part an element holds): a control the slot walk already gave a part is that part, so the wrapper round it takes the part round that one', () => {
	const NOTES = {
		elements: { '': flat( 'div', { width: '600px' } ), '.a': flat( 'div', { width: '300px', 'background-color': 'rgb(1, 2, 3)' } ), '.a > .note': flat( 'a', { width: '100px' } ), '.b': flat( 'div', { width: '300px', 'background-color': 'rgb(4, 5, 6)' } ), '.b > .note': flat( 'a', { width: '100px' } ) },
		settings: { aFill: { slot: '.a', property: 'background-color' }, bFill: { slot: '.b', property: 'background-color' } },
		text: {},
	};
	const note = node( 'Root/3#0', 'a', [], { words: 'Help' } );
	const box = node( 'Root/2#0', 'div', [ note ] );
	const run = ( taken ) => pairAbsorbed( { host: node( 'Root/1#0', 'div', [ box ], { box: wide } ), absorbed: [ { element: box, looks: [ 'background' ] } ], kids, calibration: NOTES, finder, taken } );
	assert.deepEqual( run( { '.b > .note': { tpl: note.key } } ).slots, { '.b': { tpl: box.key } }, 'the control is the second block\'s note, so the box is the second block' );
	assert.deepEqual( run( {} ).slots, {}, 'negative control: without the held slot both notes fit and the box stays unplaced' );
} );

test( 'MUST FAIL (no flat words): a box with words of its own that no part inside the held part fits is not drawn flat, so the gap stays listed; a wordless box is', () => {
	const MENU = {
		elements: { '': flat( 'div', { width: '600px' } ), '.bar': flat( 'div', { width: '400px', 'background-color': 'rgb(1, 2, 3)' } ), '.bar > .x': flat( 'span', { width: '40px' } ), '.foot': flat( 'div', { width: '400px', 'background-color': 'rgb(4, 5, 6)' } ), '.foot > .y': flat( 'span', { width: '40px' } ) },
		settings: { barFill: { slot: '.bar', property: 'background-color' }, footFill: { slot: '.foot', property: 'background-color' } },
		text: {},
	};
	const run = ( item ) => {
		const host = node( 'Root/1#0', 'div', [ item, node( 'Root/9#0', 'div' ) ], { box: wide } );
		return pairAbsorbed( { host, absorbed: [ { element: item, looks: [ 'background' ] } ], kids, calibration: MENU, finder, taken: { '.bar': finder( host ) } } );
	};
	const worded = run( node( 'Root/2#0', 'span', [ node( 'Root/3#0', 'span', [], { words: 'SOON' } ) ], { words: 'Glasses' } ) );
	assert.deepEqual( worded.flat, [], 'words with no part to be are a gap the proposal lists, not a flat box' );
	const wordless = run( node( 'Root/2#0', 'span', [ node( 'Root/3#0', 'img' ) ] ) );
	assert.deepEqual( wordless.flat.map( ( f ) => f.key ), [ 'Root/2#0' ] );
} );

test( 'MUST FAIL (a loop\'s copies of one sort): the words of a row are read at every row whether or not a caret follows them; a typed arrow is never read as another row\'s words', () => {
	const ROWS = {
		elements: { '': flat( 'div', { width: '300px' } ), '.row:nth-of-type(1)': flat( 'a', { width: '300px' } ), '.row:nth-of-type(2)': flat( 'a', { width: '300px' } ), '.row:nth-of-type(1) > .label': flat( 'span', { width: '80px' } ), '.row:nth-of-type(2) > .label': flat( 'span', { width: '80px' } ) },
		settings: { rowLabel: { slot: '.row:nth-of-type(1) > .label', slots: [ '.row:nth-of-type(1) > .label', '.row:nth-of-type(2) > .label' ], property: 'background-color' } },
		text: { label: { path: '.row:nth-of-type(1) > .label' } },
	};
	const row = ( n, label ) => node( `Root/${ n }#0`, 'a', [ label ], { box: { x: 0, y: n * 40, w: 300, h: 40 } } );
	const plain = node( 'Root/3#0', 'span', [], { words: 'Home' } );
	const caretRow = node( 'Root/6#0', 'span', [ node( 'Root/7#0', 'span' ) ], { words: 'About' } );
	const arrow = node( 'Root/9#0', 'span', [], { words: '→' } );
	const run = ( first, second ) => pairAbsorbed( { host: node( 'Root/1#0', 'nav', [ row( 2, first ), row( 5, second ) ], { box: { x: 0, y: 0, w: 300, h: 200 } } ), absorbed: [ { element: first, looks: [ 'background' ] } ], kids, calibration: ROWS, finder } );
	const both = run( plain, caretRow );
	assert.deepEqual( Object.values( both.slots ).map( ( f ) => f.tpl ).sort(), [ plain.key, caretRow.key ].sort(), 'both rows are read' );
	assert.deepEqual( Object.values( run( plain, arrow ).slots ).map( ( f ) => f.tpl ), [ plain.key ], 'negative control: the second row holds an arrow, which is not its words' );
} );

test( 'MUST FAIL (a part switch): a disc round a trailing icon pairs to a part no setting of which paints it, and is read at the switch\'s look element with the switch returned', () => {
	const T = ( k ) => `.bar > .item:nth-of-type(${ k })`;
	const MENU = {
		elements: {
			'': flat( 'nav', { width: '300px' } ), '.bar': flat( 'div', { width: '300px' } ),
			[ T( 1 ) ]: flat( 'div', { width: '300px' } ), [ `${ T( 1 ) } > .link` ]: flat( 'a', { width: '200px' } ), [ `${ T( 1 ) } > .link > .trail` ]: flat( 'span', { width: '16px' } ), [ `${ T( 1 ) } > .link > .trail > svg` ]: flat( 'svg', { width: '16px' } ),
			[ T( 2 ) ]: flat( 'div', { width: '300px' } ), [ `${ T( 2 ) } > .link` ]: flat( 'a', { width: '200px' } ), [ `${ T( 2 ) } > .link > .trail` ]: flat( 'span', { width: '16px' } ), [ `${ T( 2 ) } > .link > .trail > svg` ]: flat( 'svg', { width: '16px' } ),
			[ `${ T( 1 ) } > .caret` ]: flat( 'span', { width: '40px', 'background-color': 'rgb(1, 2, 3)' } ), [ `${ T( 2 ) } > .caret` ]: flat( 'span', { width: '40px', 'background-color': 'rgb(1, 2, 3)' } ),
		},
		settings: {
			trailPadding: { slot: `${ T( 1 ) } > .link > .trail`, slots: [ `${ T( 1 ) } > .link > .trail` ], property: 'padding' },
			circleBg: { slot: `${ T( 1 ) } > .caret`, slots: [ `${ T( 1 ) } > .caret`, `${ T( 2 ) } > .caret` ], property: 'background-color' },
			circleSize: { slot: `${ T( 1 ) } > .caret`, slots: [ `${ T( 1 ) } > .caret`, `${ T( 2 ) } > .caret` ], property: 'width' },
		},
		text: {},
	};
	const SWITCH = [ { block: 'sgs/x', switch: 'circleOnTrailingIcon', value: true, lookElement: 'circle', lookSelector: '.caret', targetSelector: '.trail' } ];
	const disc = ( n ) => node( `Root/${ n }#0`, 'span', [], { words: '→', box: { x: 250, y: n * 20, w: 32, h: 32 } } );
	const discs = [ disc( 12 ), disc( 22 ), disc( 32 ) ];
	const item = ( n, d ) => node( `Root/${ n }#0`, 'a', [ node( `Root/${ n + 1 }#0`, 'span', [], { words: `Row ${ n }`, box: { x: 0, y: n * 20, w: 150, h: 20 } } ), d ], { box: { x: 0, y: n * 20, w: 300, h: 40 } } );
	const styled = ( d, style ) => Object.assign( d, { attrs: { style } } );
	const STYLE = 'width: 32px; height: 32px; border-radius: 999px; background: rgb(255, 250, 240)';
	discs.forEach( ( d ) => styled( d, STYLE ) );
	const host = node( 'Root/1#0', 'nav', [ item( 10, discs[ 0 ] ), item( 20, discs[ 1 ] ), item( 30, discs[ 2 ] ) ], { box: { x: 0, y: 0, w: 300, h: 200 } } );
	const run = ( list, switches, at = host ) => pairAbsorbed( { host: at, absorbed: list.map( ( element ) => ( { element, looks: [ 'background', 'border', 'width' ] } ) ), kids, calibration: MENU, finder, switches } );
	const withSwitch = run( discs, SWITCH );
	assert.deepEqual( withSwitch.switches.map( ( s ) => [ s.key, s.switch, s.value ] ), discs.map( ( d ) => [ d.key, 'circleOnTrailingIcon', true ] ), 'every disc names the switch' );
	assert.deepEqual( withSwitch.slots, { [ `${ T( 1 ) } > .caret` ]: { tpl: 'Root/12#0' }, [ `${ T( 2 ) } > .caret` ]: { tpl: 'Root/22#0' } }, 'the first two discs are read at the circle slots of their own item' );
	assert.deepEqual( withSwitch.siblings.map( ( s ) => [ s.key, s.slot, s.readBy ] ), [ [ 'Root/32#0', `${ T( 1 ) } > .caret`, 'Root/12#0' ] ], 'a disc painted like the first is read there, by the first' );
	assert.deepEqual( [ withSwitch.unpainted, withSwitch.ambiguous ], [ [], [] ] );
	// Negative controls: a block with no such switch keeps the disc listed as unpainted and sets nothing; a disc painted otherwise than the one read stays listed.
	const without = run( discs, [] );
	assert.deepEqual( [ without.switches, Object.keys( without.slots ), without.unpainted.length ], [ [], [], 3 ] );
	const odd = styled( disc( 32 ), 'width: 20px' );
	const oddHost = node( 'Root/1#0', 'nav', [ item( 10, discs[ 0 ] ), item( 20, discs[ 1 ] ), item( 30, odd ) ], { box: { x: 0, y: 0, w: 300, h: 200 } } );
	const other = run( [ discs[ 0 ], discs[ 1 ], odd ], SWITCH, oddHost );
	assert.deepEqual( [ other.switches.length, other.unpainted.map( ( u ) => u.key ) ], [ 2, [ 'Root/32#0' ] ], 'a disc painted differently is not covered by the read of another' );
	// A trailing icon that paints only what its own part's settings paint (padding) is read at the icon part and no switch comes back.
	const plainIcon = pairAbsorbed( { host, absorbed: [ { element: discs[ 0 ], looks: [ 'padding' ] } ], kids, calibration: MENU, finder, switches: SWITCH } );
	assert.deepEqual( [ plainIcon.switches, plainIcon.paired.length ], [ [], 1 ], 'a trailing icon with no disc keeps the switch off' );
} );

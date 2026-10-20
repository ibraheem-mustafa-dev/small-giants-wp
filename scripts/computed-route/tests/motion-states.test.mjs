// State and open entrances, state transitions and the SVG <set> (Spec 38A §5.2, §9; Spec 48 FR-48-78, FR-48-81; the states
// wave): an animation the draft starts on a state change is an `open` or named-`state` entrance on a block that publishes
// that state, a transition on a published state is a state layer holding its poses and timing, an SVG <set> that switches
// opacity once after load is a held entrance, and a layer equal to a framework preset names it. The fixture DB's motion
// fields are the schema's own (lib/motion-schema.mjs::enumerateFields), so no test needs Bean's DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema, enumerateFields } from '../lib/motion-schema.mjs';
import { motionWrites } from '../lib/fill-motion.mjs';
import { stateTrigger, openWords } from '../lib/motion-states.mjs';
import { setRecord } from '../lib/motion-set.mjs';
import { presetFor, intensityPresetFor } from '../lib/motion-tokens.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const schema = loadMotionSchema();
const FIELDS = enumerateFields( schema ).filter( ( f ) => 'entrance.base' === f.layer ).map( ( f ) => ( {
	def_name: f.node, field: f.path.split( '.' ).pop(), panel: f.layer.split( '.' )[ 0 ], layer: f.layer, effect: f.effect,
	field_path: `elements.<target>.${ f.layer }.${ f.path.replace( '[]', '' ) }`, field_type: f.fieldType, css_property: f.cssProperty, state: f.state, per_device: f.perDevice ? 1 : 0,
} ) );
const preset = ( slug, kind, trigger, values, intensity = null ) => ( { slug, panel: 'entrance', family: intensity ? 'nav-panel-item' : slug, kind, ...( intensity ? { intensity } : {} ), label: slug, values_json: JSON.stringify( values ), trigger, target_level: 'part', source: 'test' } );
const target = ( block, name, css, support ) => ( { block_slug: block, target: name, css_element: css, kind: 'root' === name ? 'root' : 'part', ...( support ? { motion_support: JSON.stringify( support ) } : {} ) } );
const NAV = { opens: [ 'panel', 'subitem' ], states: [ 'menu-open' ] };
const DB = fixtureDb( {
	motion_targets: [
		target( 'sgs/form', 'root', 'root', { states: [ 'invalid', 'step-changed', 'success' ] } ),
		target( 'sgs/nav-bar-menu', 'root', 'root', NAV ), target( 'sgs/nav-bar-menu', 'panel', 'panel', NAV ), target( 'sgs/nav-bar-menu', 'burger', 'burger', NAV ),
		target( 'sgs/accordion', 'root', 'root', { states: [ 'expanded' ] } ), target( 'sgs/accordion', 'turning-icon', 'turning-icon', { states: [ 'expanded' ] } ),
		target( 'sgs/card', 'root', 'root' ), target( 'sgs/cart', 'root', 'root', { states: [ 'count-changed', 'count-loaded' ] } ),
	],
	motion_fields: FIELDS,
	motion_presets: [
		preset( 'state-shake', 'keyframe', 'state', { keyframes: [ { offset: 0, translateX: 0 }, { offset: 33, translateX: -8 }, { offset: 66, translateX: 8 }, { offset: 100, translateX: 0 } ], duration: 320, easing: 'linear' } ),
		preset( 'state-icon-turn', 'preset', 'state', { to: { rotate: 45 }, duration: 'token:duration.medium', easing: 'token:easing.default' } ),
		preset( 'state-burger-morph', 'preset', 'state', { duration: 'token:duration.fast', easing: 'token:easing.default' } ),
		preset( 'state-count-pop', 'keyframe', 'state', { keyframes: [ { offset: 0, opacity: 0, scale: 0.6 }, { offset: 60, opacity: 1, scale: 1.15 }, { offset: 100, opacity: 1, scale: 1 } ], duration: 500, easing: 'token:easing.default' } ),
		preset( 'state-step-slide', 'preset', 'state', { from: { translateX: 36 }, to: { translateX: 0 }, duration: 480, easing: 'cubic-bezier(0.16, 0.84, 0.32, 1)' } ),
		preset( 'state-result-scale-in', 'preset', 'state', { from: { opacity: 0, scale: 0.9 }, to: { opacity: 1, scale: 1 }, duration: 'token:entrance.duration', easing: 'token:entrance.easing' } ),
		preset( 'nav-panel-item-standard', 'intensity', 'open', { from: { translateY: 'token:distance.lg' } }, 'standard' ),
		preset( 'nav-panel-item-bold', 'intensity', 'open', { from: { translateY: 'token:distance.xl' } }, 'bold' ),
	],
} );
const mdb = motionDb( openDb( DB ) );
const SNAPSHOT = { settings: { custom: {
	duration: { fast: '200ms', medium: '350ms' }, easing: { default: 'ease' }, distance: { lg: '24px', xl: '40px' }, entrance: { duration: '420ms', easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
} } };
// The `states` rows the open words come from (the shape of plugins/sgs-blocks/scripts/data/states.json).
const VOCAB = [
	{ state: 'open', kind: 'attribute', token: '[aria-expanded="true"]' }, { state: 'open', kind: 'attribute', token: '[open]' },
	{ state: 'open', kind: 'class', token: 'is-open' }, { state: 'open', kind: 'pseudo-class', token: ':modal' },
	{ state: 'open', kind: 'class', token: 'is-overlay-active' }, { state: 'active', kind: 'pseudo-class', token: ':active' }, { state: 'hover', kind: 'pseudo-class', token: ':hover' },
];

const rec = ( id, over ) => ( { id, mechanism: 'waapi', status: 'active', element: { dc: 'Site', template_tpl_id: '10' }, trigger: { type: 'state', detail: 'componentDidUpdate', state_keys: [] }, properties: [], duration_ms: 400, delay_ms: 0, easing: 'ease', iterations: 1, direction: 'normal', ...over } );
const node = ( index, name, tpl, slots = {} ) => ( { index, name, targets: [ { id: `${ index }:`, slot: '', finder: { tpl: `Site/${ tpl }#0` } }, ...Object.entries( slots ).map( ( [ slot, finder ] ) => ( { id: `${ index }:${ slot }`, slot, finder } ) ) ] } );
const run = ( nodes, records, sampled = {}, loops = {} ) => {
	const flat = nodes.map( ( n ) => ( { name: n.name, attributes: {}, ref: `r${ n.index }` } ) );
	return { flat, out: motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records, sampled, loops, mdb, schema, rawSnapshot: SNAPSHOT, stateVocab: VOCAB } ) };
};
const PANEL = '.sgs-nav-bar-menu__panel';
const BURGER = '.sgs-nav-bar-menu__burger';
const at = ( flat, part ) => flat[ 0 ].attributes.sgsMotion?.elements?.[ part ];

test( 'MUST FAIL: the words a state change is made of name a published motion state; the longest name wins and an unnamed state names none', () => {
	const offers = { names: [ 'open', 'menu-open', 'open-all', 'invalid', 'step-changed' ], opens: [], openWords: new Set( [ 'open' ] ) };
	const of = ( keys, detail = '' ) => stateTrigger( rec( 'a', { trigger: { type: 'state', detail, state_keys: keys } } ), offers );
	assert.deepEqual( of( [ 'invalid' ] ), { trigger: 'state', state: 'invalid' } );
	assert.deepEqual( of( [ 'stepChanged' ] ), { trigger: 'state', state: 'step-changed' }, 'camel case is hyphen words' );
	assert.deepEqual( of( [], 'componentDidUpdate when menuOpen changes' ), { trigger: 'state', state: 'menu-open' } );
	assert.equal( of( [ 'openAll' ] ).state, 'open-all', 'the longest name its words spell' );
	assert.equal( of( [ 'loading' ] ), null, 'a state this block does not publish' );
	assert.equal( stateTrigger( rec( 'a', { trigger: { type: 'hover', state_keys: [ 'invalid' ] } } ), offers ), null, 'only a state trigger' );
	assert.equal( of( [ 'menuToggle' ] ), null, 'one word of a two-word name is not the name' );
	assert.equal( of( [ 'invalid' ] ).state, 'invalid' );
	assert.equal( stateTrigger( rec( 'a', { trigger: { type: 'state', state_keys: [ 'inv' ] } } ), { ...offers, names: [ 'invalid' ] } ), null, 'a part of a word is not the word' );
} );

test( 'MUST FAIL: an open word is an open trigger only on a part the block opens; elsewhere it is the one published state that ends in an open word', () => {
	const offers = { names: [ 'menu-open' ], opens: [ 'panel' ], openWords: () => openWords( VOCAB ) };
	const r = rec( 'a', { trigger: { type: 'state', detail: 'toggle', state_keys: [ 'isExpanded' ] } } );
	assert.deepEqual( stateTrigger( r, offers, 'panel' ), { trigger: 'open' } );
	assert.deepEqual( stateTrigger( r, offers, 'burger' ), { trigger: 'state', state: 'menu-open' } );
	assert.equal( stateTrigger( r, { ...offers, names: [ 'menu-open', 'search-open' ] }, 'burger' ), null, 'two candidates is no answer' );
	assert.equal( stateTrigger( r, { ...offers, names: [], opens: [] }, 'burger' ), null );
	assert.equal( stateTrigger( rec( 'a', { trigger: { type: 'state', state_keys: [ 'count' ] } } ), offers, 'panel' ), null, 'no open word' );
} );

test( 'the open words are the vocabulary\'s open tokens less any word that names another state', () => {
	const words = openWords( VOCAB );
	assert.ok( [ 'open', 'expanded' ].every( ( w ) => words.has( w ) ) );
	assert.ok( ! words.has( 'active' ), 'active is the press state\'s word' );
	assert.ok( ! words.has( 'modal' ), 'a pseudo-class is not read for a word' );
	assert.ok( openWords( [ ...VOCAB, { state: 'press', kind: 'class', token: 'is-open' } ] ).has( 'open' ), 'open stays the state word whatever else lists it' );
} );

test( 'MUST FAIL (FR-38A-53): an animation the draft starts on a named state is a state entrance naming the state and its preset', () => {
	const shake = rec( 'A-1', {
		trigger: { type: 'state', detail: 'componentDidUpdate when invalid changes', state_keys: [ 'invalid' ] }, duration_ms: 320, easing: 'linear',
		properties: [ { property: 'transform', from: 'translateX(0)', to: 'translateX(0)', keyframes: [ { offset: 0, value: 'translateX(0)' }, { offset: 0.33, value: 'translateX(-8px)' }, { offset: 0.66, value: 'translateX(8px)' }, { offset: 1, value: 'translateX(0)' } ] } ],
	} );
	const { flat, out } = run( [ node( 0, 'sgs/form', '10' ) ], [ shake ] );
	assert.equal( out.writes.length, 1, JSON.stringify( out.unmapped ) );
	const layer = at( flat, 'root' ).entrance.base;
	assert.equal( layer.trigger, 'state' );
	assert.equal( layer.state, 'invalid' );
	assert.equal( layer.preset, 'state-shake' );
	assert.equal( layer.values.duration, 320 );
	const dead = run( [ node( 0, 'sgs/form', '10' ) ], [ { ...shake, status: 'dead-code' } ] );
	assert.equal( dead.out.writes.length, 0, 'an animation the draft never runs is no entrance' );
	const slower = run( [ node( 0, 'sgs/form', '10' ) ], [ { ...shake, duration_ms: 340 } ] );
	assert.equal( at( slower.flat, 'root' ).entrance.base.preset, undefined, 'negative control: one value off names no preset' );
	const unnamed = run( [ node( 0, 'sgs/form', '10' ) ], [ { ...shake, trigger: { type: 'state', detail: 'componentDidUpdate when loading changes', state_keys: [ 'loading' ] } } ] );
	assert.equal( unnamed.out.writes.length, 0 );
	assert.match( unnamed.out.unmapped[ 0 ].reason, /FR-48-80/, 'a state this block does not publish stays with the behaviour wave' );
	const load = run( [ node( 0, 'sgs/form', '10' ) ], [ shake ], { '0:': { 375: null, 768: null, 1440: null } } );
	assert.equal( load.out.writes.length, 1, 'the render at rest shows no state entrance, so it never refutes one' );
} );

test( 'MUST FAIL (FR-38A-33): a travel the draft starts when a panel opens is an open entrance, naming the nav panel item intensity whose travel it holds', () => {
	const slide = ( y ) => rec( 'A-2', { element: { dc: 'Site', template_tpl_id: '11' }, trigger: { type: 'state', detail: 'toggle', state_keys: [ 'menuOpen' ] }, properties: [ { property: 'transform', from: `translateY(${ y }px)`, to: 'none' }, { property: 'opacity', from: 0, to: 1 } ] } );
	const nodes = [ node( 0, 'sgs/nav-bar-menu', '10', { [ PANEL ]: { tpl: 'Site/11#0' } } ) ];
	const { flat, out } = run( nodes, [ slide( 24 ) ] );
	assert.equal( out.writes.length, 1, JSON.stringify( out.unmapped ) );
	const layer = at( flat, 'panel' ).entrance.base;
	assert.equal( layer.trigger, 'open' );
	assert.equal( layer.state, undefined, 'an open entrance names no state' );
	assert.equal( layer.preset, 'nav-panel-item-standard' );
	assert.equal( layer.values.from.translateY, 'token:distance.lg' );
	const off = run( nodes, [ slide( 25 ) ] );
	assert.equal( at( off.flat, 'panel' ).entrance.base.preset, undefined, 'negative control: a travel no intensity stamps' );
	assert.equal( intensityPresetFor( { trigger: 'scroll', values: layer.values }, mdb.presets( 'entrance' ) ), null, 'other triggers name only an exact preset' );
	const stamp = ( trigger ) => [ { slug: 's', kind: 'intensity', trigger, values: { from: { translateY: 24 } } } ];
	const held = { values: { from: { translateY: 24 }, to: { translateY: 0 }, duration: 300 } };
	assert.equal( intensityPresetFor( { ...held, trigger: 'open' }, stamp( 'open' ) ), 's' );
	assert.equal( intensityPresetFor( { ...held, trigger: 'scroll' }, stamp( 'scroll' ) ), null, 'a scroll layer names only an exact preset' );
	assert.equal( intensityPresetFor( { ...held, trigger: 'state' }, stamp( 'open' ) ), null, 'an open preset is not a state preset' );
	const burger = { trigger: 'state', values: { duration: 'token:duration.fast', easing: 'token:easing.default', delay: 50 } };
	assert.equal( intensityPresetFor( burger, mdb.presets( 'entrance' ) ), null, 'a full preset is named only by equal values, never by a superset' );
} );

test( 'MUST FAIL (FR-38A-53): the cart count pop, the step slide and the result scale-in each name their state and preset', () => {
	const state = ( key, over ) => rec( 'A', { trigger: { type: 'state', detail: 'componentDidUpdate', state_keys: [ key ] }, ...over } );
	const pop = state( 'countChanged', { duration_ms: 500, easing: 'ease', properties: [
		{ property: 'opacity', from: 0, to: 1, keyframes: [ { offset: 0, value: 0 }, { offset: 0.6, value: 1 }, { offset: 1, value: 1 } ] },
		{ property: 'transform', from: 'scale(0.6)', to: 'scale(1)', keyframes: [ { offset: 0, value: 'scale(0.6)' }, { offset: 0.6, value: 'scale(1.15)' }, { offset: 1, value: 'scale(1)' } ] },
	] } );
	const slide = state( 'stepChanged', { duration_ms: 480, easing: 'cubic-bezier(0.16, 0.84, 0.32, 1)', properties: [ { property: 'transform', from: 'translateX(36px)', to: 'none' } ] } );
	const scale = state( 'success', { duration_ms: 420, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', properties: [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'scale(0.9)', to: 'scale(1)' } ] } );
	for ( const [ block, record, name, slug ] of [ [ 'sgs/cart', pop, 'count-changed', 'state-count-pop' ], [ 'sgs/form', slide, 'step-changed', 'state-step-slide' ], [ 'sgs/form', scale, 'success', 'state-result-scale-in' ] ] ) {
		const { flat, out } = run( [ node( 0, block, '10' ) ], [ record ] );
		assert.equal( out.writes.length, 1, `${ slug }: ${ JSON.stringify( out.unmapped ) }` );
		const layer = at( flat, 'root' ).entrance.base;
		assert.deepEqual( [ layer.trigger, layer.state, layer.preset ], [ 'state', name, slug ] );
	}
} );

test( 'MUST FAIL: a transition on a published state is a state layer holding its poses and timing, named by its preset; on an open part it stays with its owner', () => {
	const burger = rec( 'TR-1', { mechanism: 'css-transition', element: { dc: 'Site', template_tpl_id: '12' }, trigger: { type: 'state', detail: 'stylesheet rule .sgs-nav-bar-menu__burger[aria-expanded="true"] span' }, properties: [ { property: 'transform', from: null, to: null } ], duration_ms: 200 } );
	const nodes = [ node( 0, 'sgs/nav-bar-menu', '10', { [ BURGER ]: { tpl: 'Site/12#0' } } ) ];
	const { flat, out } = run( nodes, [ burger ] );
	assert.equal( out.writes.length, 1, JSON.stringify( out.unmapped ) );
	assert.deepEqual( at( flat, 'burger' ).entrance.base, { trigger: 'state', state: 'menu-open', values: { duration: 'token:duration.fast', easing: 'token:easing.default' }, preset: 'state-burger-morph' } );
	const turn = rec( 'TR-2', { mechanism: 'css-transition', element: { dc: 'Site', template_tpl_id: '13' }, trigger: { type: 'state', detail: 'toggle', state_keys: [ 'expanded' ] }, properties: [ { property: 'transform', from: 'rotate(0deg)', to: 'rotate(45deg)' } ], duration_ms: 350 } );
	const icon = run( [ node( 0, 'sgs/accordion', '10', { '.sgs-accordion__turning-icon': { tpl: 'Site/13#0' } } ) ], [ turn ] );
	assert.deepEqual( at( icon.flat, 'turning-icon' ).entrance.base, { trigger: 'state', state: 'expanded', values: { from: { rotate: 0 }, to: { rotate: 45 }, duration: 'token:duration.medium', easing: 'token:easing.default' }, preset: 'state-icon-turn' } );
	const opening = run( [ node( 0, 'sgs/nav-bar-menu', '10', { [ PANEL ]: { tpl: 'Site/12#0' } } ) ], [ burger ] );
	assert.equal( opening.out.writes.length, 0 );
	assert.match( opening.out.unmapped[ 0 ].reason, /state transition/, 'a transition on an open part is a timing for the block\'s own setting' );
	const delayed = run( nodes, [ { ...burger, delay_ms: 100 } ] );
	assert.equal( at( delayed.flat, 'burger' ).entrance.base.values.delay, 100, 'the delay of the transition is kept' );
	assert.equal( at( delayed.flat, 'burger' ).entrance.base.preset, undefined, 'and a delay is no longer the preset' );
	const perProperty = run( nodes, [ { ...burger, duration_ms: 'per property' } ] );
	assert.match( perProperty.out.unmapped[ 0 ].reason, /times each property separately/ );
} );

test( 'a layer equal to a preset up to channels at identity names it; a different channel does not', () => {
	const presets = [ { slug: 'p', trigger: 'state', values: { to: { rotate: 45 }, duration: 100 } } ];
	assert.equal( presetFor( { trigger: 'state', values: { from: { rotate: 0, opacity: 1 }, to: { rotate: 45 }, duration: 100 } }, presets ), 'p' );
	assert.equal( presetFor( { trigger: 'state', values: { from: { rotate: 10 }, to: { rotate: 45 }, duration: 100 } }, presets ), null );
	assert.equal( presetFor( { trigger: 'state', values: { to: { rotate: 46 }, duration: 100 } }, presets ), null );
} );

test( 'MUST FAIL: an SVG <set> that switches opacity once after load is a held entrance; any other <set> is reported with its reason', () => {
	const set = ( over ) => ( { tag: 'set', attributeName: 'opacity', to: '1', begin: '2s', end: null, dur: null, fill: null, base: '0', ...over } );
	const ok = setRecord( set(), 0 ).record;
	assert.deepEqual( [ ok.properties, ok.duration_ms, ok.delay_ms, ok.trigger.type ], [ [ { property: 'opacity', from: 0, to: 1 } ], 0, 2000, 'load' ] );
	assert.equal( setRecord( set( { begin: '500ms' } ) ).record.delay_ms, 500 );
	assert.equal( setRecord( set( { begin: null } ) ).record.delay_ms, 0, 'no begin is at the start' );
	assert.equal( setRecord( set( { attributeName: 'visibility', to: 'visible', base: 'hidden' } ) ).record.properties[ 0 ].to, 1 );
	assert.equal( setRecord( set( { attributeName: 'visibility', to: 'hidden', base: null } ) ).record.properties[ 0 ].to, 0 );
	assert.match( setRecord( set( { begin: 'click' } ) ).reason, /event or another element/ );
	assert.match( setRecord( set( { begin: 'a.end' } ) ).reason, /event or another element/ );
	assert.match( setRecord( set( { dur: '1s' } ) ).reason, /reverts/ );
	assert.ok( setRecord( set( { dur: '1s', fill: 'freeze' } ) ).record, 'a frozen set keeps its value' );
	assert.match( setRecord( set( { attributeName: 'fill', to: 'red' } ) ).reason, /no entrance channel holds/ );
	assert.match( setRecord( set( { to: '0' } ) ).reason, /already has/ );
	const loops = { '0:': { 1440: { loops: [], box: null, marquee: null, smil: [ set() ] } } };
	const { flat, out } = run( [ node( 0, 'sgs/card', '10' ) ], [], { '0:': { 375: null, 768: null, 1440: null } }, loops );
	assert.equal( out.writes.length, 1, JSON.stringify( out.unmapped ) );
	assert.deepEqual( at( flat, 'root' ).entrance.base, { trigger: 'load', values: { from: { opacity: 0 }, to: { opacity: 1 }, duration: 0, delay: 2000, easing: 'linear' } } );
	const click = run( [ node( 0, 'sgs/card', '10' ) ], [], {}, { '0:': { 1440: { loops: [], box: null, marquee: null, smil: [ set( { begin: 'click' } ) ] } } } );
	assert.equal( click.out.writes.length, 0 );
	assert.match( click.out.unmapped.find( ( u ) => '<set>' === u.value ).reason, /event or another element/ );
} );

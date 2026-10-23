// One writer per property (lane R2, FR-48-51): a preset variant that holds `hover-transform` is the one writer of the hover lift,
// so the instance's sgsMotion hover state loses its transform channels and keeps everything else. Run against the real framework DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import { presetWrites, dropPresetMotion, PRESET_KEYS, TRANSFORM_CHANNELS } from '../lib/fill-preset.mjs';
import { MOTION_STATE_PROPS } from '../lib/fill-state-motion.mjs';
import { parseColour } from '../lib/normalise.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const FULL = { background: '#0a7ea8', text: '#ffffff', border: '#0a7ea8', 'border-width': '2px', 'border-radius': '999px', padding: '12px 22px 12px 22px', 'font-size': '17px', 'font-weight': '600', 'min-height': '48px', 'hover-background': '#0a7ea8', 'hover-text': '#ffffff', 'hover-border': '#0a7ea8', 'hover-transform': 'matrix(1.05, 0, 0, 1.05, 0, -2.1)' };
const snapshot = { palette: [ { slug: 'primary', colour: parseColour( '#0a7ea8' ) } ], spacing: [], fontSizes: [] };
const BLUE = 'rgb(10, 126, 168)';
const WHITE = 'rgb(255, 255, 255)';
const STYLES = { 'background-color': BLUE, color: WHITE, 'border-top-color': BLUE, 'border-top-width': '2px', 'border-top-left-radius': '999px', 'padding-top': '12px', 'padding-right': '22px', 'padding-bottom': '12px', 'padding-left': '22px', 'font-size': '17px', 'font-weight': '600', 'min-height': '48px' };
const HOVER = { rendered: { 'background-color': BLUE, color: WHITE, 'border-top-color': BLUE, transform: 'matrix(1.05, 0, 0, 1.05, 0, -2.1)' } };
const reads = {
	widths: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:': { styles: STYLES } } ] ) ),
	states: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { looks: { '0:': [ { states: [ 'hover' ], declared: {}, ...HOVER } ] } } ] ) ),
};
const MOTION = () => ( { v: 1, elements: { root: { hover: { state: { preset: 'hover-lift', values: { scale: 1.05, translateY: -2.1, translateX: 3, rotate: -8, duration: 200, easing: 'token:easing.ease' }, devices: { tablet: { scale: 1 }, mobile: { scale: 1.02, duration: 100 } } }, effects: [ { id: 'magnet-1', effect: 'magnet', trigger: 'hover', values: { engage: 'over' } } ] } } } } );

// A button written as the preset variant, its motion in the tree and the motion write in the list, then the motion drop.
function run( { presets, motion = MOTION(), before = null, reads: given = reads } ) {
	const flat = [ { name: 'sgs/button', attributes: { sgsMotion: motion }, ref: 'r0' } ];
	const nodes = [ { index: 0, name: 'sgs/button', targets: [ { id: '0:', slot: '' } ] } ];
	const motionWrite = { node: 'r0', block: 'sgs/button', slot: '', prop: 'motion root', attr: 'sgsMotion', before, after: motion, widths: [], how: 'motion' };
	const p = presetWrites( { nodes, flat, refOf: ( n ) => n.ref, reads: given, rawSnapshot: { settings: { custom: { buttonPresets: presets } } }, snapshot, writes: [ motionWrite ], db } );
	return { flat, motionWrite, p, drop: dropPresetMotion( { lifted: p.lifted, flat, writes: p.writes } ) };
}

test( 'MUST FAIL WITHOUT THE DROP: a preset that holds the hover transform leaves no transform channel in the instance motion, so one writer paints the lift', () => {
	const r = run( { presets: { secondary: FULL } } );
	assert.deepEqual( r.p.lifted, [ { node: 'r0', index: 0 } ] );
	const hover = r.flat[ 0 ].attributes.sgsMotion.elements.root.hover;
	assert.deepEqual( hover.state.values, { duration: 200, easing: 'token:easing.ease' }, 'timing stays; scale, translate and rotate go' );
	assert.equal( hover.state.preset, undefined, 'a preset name stamps the channels that are gone' );
	assert.deepEqual( hover.state.devices, { mobile: { duration: 100 } }, 'a per-device transform goes, a per-device timing stays; an emptied tier is gone' );
	assert.equal( hover.effects[ 0 ].effect, 'magnet', 'a hover effect is not a transform' );
	assert.equal( r.drop.writes.find( ( w ) => 'sgsMotion' === w.attr ).after, r.flat[ 0 ].attributes.sgsMotion, 'the write records what the tree holds' );
	assert.match( r.drop.notes[ 0 ], /scale, translateY, translateX, rotate/ );
	for ( const k of TRANSFORM_CHANNELS ) {
		assert.equal( JSON.stringify( r.flat[ 0 ].attributes.sgsMotion ).includes( `"${ k }"` ), false, `${ k } is not left` );
	}
} );

test( 'every transform channel the schema splits a transform into is dropped, one per run', () => {
	assert.deepEqual( [ ...TRANSFORM_CHANNELS ].sort(), [ 'rotate', 'rotateX', 'rotateY', 'scale', 'scaleX', 'scaleY', 'translateX', 'translateY' ] );
	for ( const k of TRANSFORM_CHANNELS ) {
		const r = run( { presets: { secondary: FULL }, motion: { v: 1, elements: { root: { hover: { state: { values: { [ k ]: 1, duration: 200 } } } } } } } );
		assert.deepEqual( r.flat[ 0 ].attributes.sgsMotion.elements.root.hover.state.values, { duration: 200 }, k );
	}
} );

test( 'a motion that held only the lift is not written at all, and the attribute goes back to what the skeleton held', () => {
	const only = () => ( { v: 1, elements: { root: { hover: { state: { values: { scale: 1.05, translateY: -2.1 } } } } } } );
	const r = run( { presets: { secondary: FULL }, motion: only() } );
	assert.equal( r.flat[ 0 ].attributes.sgsMotion, undefined );
	assert.equal( r.drop.writes.some( ( w ) => 'sgsMotion' === w.attr ), false );
	const held = run( { presets: { secondary: FULL }, motion: only(), before: { v: 1, elements: {} } } );
	assert.deepEqual( held.flat[ 0 ].attributes.sgsMotion, { v: 1, elements: {} } );
} );

test( 'one writer per property: across every preset key, only a variant holding a hover transform takes the motion channels, and no other motion is touched', () => {
	let held = 0;
	for ( const [ key, props, state ] of PRESET_KEYS ) {
		const r = run( { presets: { secondary: { [ key ]: FULL[ key ] } } } );
		const takes = 'hover' === state && props.some( ( p ) => MOTION_STATE_PROPS.includes( p ) );
		takes && held++;
		assert.equal( r.p.lifted.length, takes ? 1 : 0, key );
		const left = JSON.stringify( r.flat[ 0 ].attributes.sgsMotion );
		assert.equal( [ ...TRANSFORM_CHANNELS ].some( ( c ) => left.includes( `"${ c }"` ) ), ! takes, `${ key }: the motion keeps its channels exactly when the preset does not hold the transform` );
		takes || assert.deepEqual( r.flat[ 0 ].attributes.sgsMotion, MOTION(), `${ key }: motion untouched` );
	}
	assert.equal( held, 1, 'hover-transform is the one preset key a motion channel paints' );
} );

test( 'a hover state whose per-device values were all transform leaves no devices object, and another node keeps its own motion write', () => {
	const doc = () => ( { v: 1, elements: { root: { hover: { state: { values: { scale: 1.05, duration: 200 }, devices: { tablet: { scale: 1 } } } } } } } );
	const r = run( { presets: { secondary: FULL }, motion: doc() } );
	assert.equal( 'devices' in r.flat[ 0 ].attributes.sgsMotion.elements.root.hover.state, false );
	const other = { node: 'r1', block: 'sgs/button', slot: '', prop: 'motion root', attr: 'sgsMotion', before: null, after: doc(), widths: [], how: 'motion' };
	const flat = [ { attributes: { sgsMotion: doc() } }, { attributes: { sgsMotion: other.after } } ];
	const d = dropPresetMotion( { lifted: [ { node: 'r0', index: 0 } ], flat, writes: [ other, { ...r.motionWrite, after: flat[ 0 ].attributes.sgsMotion } ] } );
	assert.deepEqual( flat[ 1 ].attributes.sgsMotion, doc(), 'the other node is not edited' );
	assert.deepEqual( d.writes.find( ( w ) => 'r1' === w.node ).after, doc(), 'and its write still records its own motion' );
	assert.equal( d.writes.find( ( w ) => 'r0' === w.node ).after, flat[ 0 ].attributes.sgsMotion );
	assert.equal( flat[ 0 ].attributes.sgsMotion.elements.root.hover.state.values.scale, undefined );
} );

test( 'MUST FAIL WITHOUT THE DEFAULT VARIANT: a button that matches no variant still paints the block default variant\'s lift, so its motion loses the same lift', () => {
	const odd = { ...FULL, 'font-size': '30px' };
	const r = run( { presets: { primary: odd, secondary: odd } } );
	assert.equal( r.flat[ 0 ].attributes.inheritStyle, undefined, 'no variant matches, none is written' );
	assert.deepEqual( r.p.lifted, [ { node: 'r0', index: 0 } ], 'the default variant is primary, which holds the lift the draft has' );
	assert.equal( r.flat[ 0 ].attributes.sgsMotion.elements.root.hover.state.values.scale, undefined );
	const held = run( { presets: { primary: { ...odd, 'hover-transform': 'none' }, secondary: odd } } );
	assert.equal( held.p.lifted.length, 0, 'a default variant with no lift leaves the motion lift as the one writer' );
	assert.deepEqual( held.p.notes, [], 'a variant that paints no lift clashes with nothing' );
	const fallback = run( { presets: { primary: { ...odd, 'hover-transform': undefined }, default: { 'font-size': '30px', 'hover-transform': FULL[ 'hover-transform' ] } } } );
	assert.equal( fallback.p.lifted.length, 1, 'the default look\'s lift is what the stylesheet falls back to' );
	const hidden = structuredClone( reads );
	hidden.widths[ 375 ][ '0:' ] = { missing: true };
	assert.equal( run( { presets: { primary: odd }, reads: hidden } ).p.lifted.length, 1, 'a button hidden at a width paints no lift there, so that width is not compared' );
	const never = structuredClone( reads );
	[ 375, 768, 1440 ].forEach( ( w ) => ( never.widths[ w ][ '0:' ] = { missing: true } ) );
	assert.equal( run( { presets: { primary: odd }, reads: never } ).p.lifted.length, 0, 'a button read at no width has no lift to match' );
	const unread = structuredClone( reads );
	unread.states[ 768 ].looks[ '0:' ] = [];
	assert.equal( run( { presets: { primary: odd }, reads: unread } ).p.lifted.length, 0, 'a width where the button is present and its hover transform differs fails closed' );
} );

test( 'a preset lift that differs from the draft\'s is named, and the motion keeps its own', () => {
	const r = run( { presets: { primary: { ...FULL, 'font-size': '30px', 'hover-transform': 'matrix(1.1, 0, 0, 1.1, 0, -4)' } } } );
	assert.equal( r.p.lifted.length, 0 );
	assert.equal( r.flat[ 0 ].attributes.sgsMotion.elements.root.hover.state.values.scale, 1.05 );
	assert.match( r.p.notes.join( ' ' ), /primary preset paints the hover transform matrix\(1\.1.*the draft's is matrix\(1\.05/ );
} );

test( 'a variant with no hover transform (the outline look) and a node with no motion write leave the motion as written', () => {
	const { 'hover-transform': _t, ...flatLook } = FULL;
	const r = run( { presets: { secondary: flatLook } } );
	assert.equal( r.p.lifted.length, 0 );
	assert.deepEqual( r.flat[ 0 ].attributes.sgsMotion, MOTION() );
	assert.deepEqual( dropPresetMotion( { lifted: [], flat: r.flat, writes: [ r.motionWrite ] } ).writes, [ r.motionWrite ] );
	assert.deepEqual( dropPresetMotion( { lifted: [ { node: 'r0', index: 0 } ], flat: r.flat, writes: [] } ).notes, [], 'no motion write, nothing to drop' );
} );

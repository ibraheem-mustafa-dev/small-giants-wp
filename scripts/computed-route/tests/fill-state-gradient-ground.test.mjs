// A ground painted by a gradient is the ground of the hold pair (Spec 48 FR-48-81, lib/fill-state.mjs::holdDefaults,
// lib/fill-state.mjs::groundOf). The real case: the footer's Instagram icon rests with a white glyph on a radial-gradient
// ground and declares only a transform and a shadow on hover; sgs/icon's own hover turns the glyph and the ground colour
// and drops the gradient. Fill held the glyph at white alone, so the block's white hover ground showed under a white glyph.
// Inputs: the draft's resting read of that element (its inline `background` and `color`, as the browser computes them) and
// the slot map Fill read (a slice of cache/icon.json, tests/fixtures/fill-state-gradient-ground/icon-cal.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openDb } from '../lib/db.mjs';
import { holdDefaults, groundOf } from '../lib/fill-state.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const W = [ 375, 768, 1440 ];
const cal = JSON.parse( readFileSync( new URL( './fixtures/fill-state-gradient-ground/icon-cal.json', import.meta.url ), 'utf8' ) );
const GRADIENT = 'radial-gradient(circle at 30% 107%, rgb(253, 244, 151) 0%, rgb(253, 89, 73) 45%, rgb(214, 36, 159) 60%, rgb(40, 90, 235) 90%)';
const BASE = { color: 'rgb(255, 255, 255)', 'border-top-width': '0px', 'border-top-color': 'rgb(255, 255, 255)', 'box-shadow': 'none', transform: 'none', 'outline-style': 'none', 'outline-color': 'rgb(255, 255, 255)', 'text-decoration-line': 'none' };
const INSTAGRAM = { ...BASE, 'background-color': 'rgba(0, 0, 0, 0)', 'background-image': GRADIENT };
const FLAT = { ...BASE, 'background-color': 'rgb(44, 62, 80)', 'background-image': 'none' };
// The draft's hover declares a transform and a shadow (the motion and shadow passes write them).
const HOVER = [ 'transform', 'box-shadow' ];
const drafts = ( props ) => new Map( props.map( ( prop ) => [ `hover||${ prop }`, { state: 'hover', prop, pseudo: '' } ] ) );
const run = ( { styles = INSTAGRAM, attributes = { backgroundColourGradient: GRADIENT }, hover = HOVER, slotMap = cal } = {} ) => {
	const node = { name: 'sgs/icon', attributes: { iconSource: 'brand', brandName: 'instagram', className: 'cr-ref-x-0', iconColour: 'primary-text', ...attributes }, innerBlocks: [] };
	const reads = { widths: Object.fromEntries( W.map( ( w ) => [ w, { t: { tag: 'a', styles } } ] ) ) };
	const out = holdDefaults( { node, ref: 'cr-ref-x-0', rec: { index: 0, name: 'sgs/icon' }, target: { id: 't', slot: '' }, cal: slotMap, db, snapshot, reads, drafts: drafts( hover ), held: new Set( [ 'hover' ] ), interaction: new Set( [ 'hover' ] ) } );
	return { ...out, attrs: node.attributes, holds: out.writes.map( ( w ) => w.attr ).sort() };
};

test( 'MUST FAIL: the Instagram icon\'s gradient ground is held on hover with its white glyph', () => {
	const r = run();
	assert.deepEqual( r.holds, [ 'backgroundColourHoverGradient', 'iconColourHover' ] );
	assert.equal( r.attrs.backgroundColourHoverGradient, GRADIENT, 'the ground is held at the draft\'s resting gradient' );
	assert.ok( r.writes.every( ( w ) => 'fill-state-hold' === w.how && 'hover' === w.state ) );
	assert.deepEqual( r.unmapped, [] );
} );

test( 'MUST FAIL: a gradient ground that cannot be held keeps its glyph colour from being held alone', () => {
	const settings = Object.fromEntries( Object.entries( cal.settings ).filter( ( [ attr ] ) => 'backgroundColourHoverGradient' !== attr ) );
	const r = run( { slotMap: { ...cal, settings } } );
	assert.deepEqual( r.holds, [] );
	assert.ok( r.unmapped.some( ( u ) => 'color' === u.property && /held with background-image/.test( u.reason ) ), 'the glyph colour is a default-state gap held with its ground' );
	assert.ok( r.unmapped.some( ( u ) => 'background-image' === u.property && /^default-state/.test( u.reason ) ) );
} );

test( 'a flat ground is held as the background colour, never as a gradient (negative control)', () => {
	const r = run( { styles: FLAT, attributes: { backgroundColour: 'rgb(44, 62, 80)' } } );
	assert.ok( r.holds.includes( 'iconColourHover' ) );
	assert.ok( r.holds.includes( 'backgroundColourHover' ), 'the background colour is the ground in the pair' );
	assert.equal( r.attrs.backgroundColourHoverGradient, undefined );
} );

test( 'a gradient ground the draft\'s own hover declares is the draft\'s, never held (negative control)', () => {
	const r = run( { hover: [ ...HOVER, 'background' ] } );
	assert.equal( r.attrs.backgroundColourHoverGradient, undefined );
	assert.ok( r.holds.includes( 'iconColourHover' ) );
} );

test( 'groundOf: the ground is the background image only where the draft rests on a gradient at every width it is drawn', () => {
	assert.equal( groundOf( { 'background-image': { 375: GRADIENT, 1440: GRADIENT } } ), 'background-image' );
	assert.equal( groundOf( { 'background-image': { 375: GRADIENT, 1440: 'none' } } ), 'background-color' );
	assert.equal( groundOf( { 'background-image': { 1440: 'url("a.png")' } } ), 'background-color' );
	assert.equal( groundOf( {} ), 'background-color' );
} );

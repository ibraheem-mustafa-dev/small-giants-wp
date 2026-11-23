// Same box for a root and its only child part where the sizes are declared (lib/fill-same-box.mjs::calSameBox,
// declaredOneChild; Spec 48 FR-48-8): the site look keeps `auto` and `100%` as written, so the measured comparison calibration
// answered cannot be made. An icon's root wraps its shape with nothing between them: calibration measured both 32px, and the
// draft's one circle is both, so its border, radius and background go to the shape's settings (lib/fill-resolve-state.mjs::
// alternateSlots), not to Custom CSS. CSS's own sizing rules decide: an `auto` height wraps the only child; an inline box
// shrink-wraps it; a block box's filling child is its width whatever its siblings. A declared `100%` is no measurement.
import test from 'node:test';
import assert from 'node:assert/strict';
import { calSameBox } from '../lib/fill-same-box.mjs';

const SHAPE = '.sgs-ic__shape';
const per = ( v ) => ( { 375: v, 768: v, 1440: v } );
const flat = { 'padding-top': '0px', 'padding-bottom': '0px', 'padding-left': '0px', 'padding-right': '0px', 'border-top-width': '0px', 'border-bottom-width': '0px', 'border-left-width': '0px', 'border-right-width': '0px', 'min-height': '0px', 'min-width': 'auto' };
const noMargin = { 'margin-top': '0px', 'margin-bottom': '0px', 'margin-left': '0px', 'margin-right': '0px' };
const root = ( extra = {} ) => per( { display: 'inline-flex', position: 'static', width: 'auto', height: 'auto', ...flat, ...extra } );
const part = ( extra = {} ) => per( { display: 'flex', position: 'static', width: 'auto', height: 'auto', 'max-width': 'none', ...noMargin, ...extra } );
const look = ( { r = root(), p = part(), more = {} } = {} ) => ( { elements: { '': r, [ SHAPE ]: p, ...more } } );

test( 'MUST FAIL: an inline root and its only child part are one box when the sizes are declared', () => {
	assert.equal( calSameBox( look(), '', SHAPE ), true );
	assert.equal( calSameBox( look(), SHAPE, '' ), true, 'either order' );
} );

test( 'MUST FAIL: a variant that wraps the part in a link is an alternative, not a second child', () => {
	const more = { '.sgs-ic__link': part(), [ `.sgs-ic__link > ${ SHAPE }` ]: part() };
	assert.equal( calSameBox( look( { more } ), '', SHAPE ), true );
} );

test( 'MUST FAIL: in a block box a filling part is the root\'s width whatever its siblings (they stack)', () => {
	const r = root( { display: 'block', width: '100%' } );
	const more = { '.sgs-ic__labels': part( { display: 'block' } ) };
	assert.equal( calSameBox( look( { r, p: part( { display: 'block', width: '100%' } ), more } ), '', SHAPE, [ 'w' ] ), true );
	assert.equal( calSameBox( look( { r, p: part( { display: 'block' } ), more } ), '', SHAPE, [ 'w' ] ), true, 'a block-level part of auto width fills too' );
	assert.equal( calSameBox( look( { r, p: part( { display: 'block' } ), more } ), '', SHAPE, [ 'h' ] ), false, 'the sibling adds to the root\'s height' );
} );

test( 'MUST FAIL: a declared 100% on both is no measurement: a root that pads its part in is two boxes', () => {
	const r = root( { display: 'block', width: '100%', 'padding-left': '24px', 'padding-right': '24px' } );
	assert.equal( calSameBox( look( { r, p: part( { width: '100%' } ) } ), '', SHAPE, [ 'w' ] ), false );
} );

test( 'negative controls: two boxes stay two', () => {
	assert.equal( calSameBox( look( { r: root( { 'border-top-width': '2px' } ) } ), '', SHAPE, [ 'h' ] ), false, 'a border between them' );
	assert.equal( calSameBox( look( { r: root( { 'min-height': '180px' } ) } ), '', SHAPE, [ 'h' ] ), false, 'the root has a floor of its own' );
	assert.equal( calSameBox( look( { p: part( { 'margin-left': '8px' } ) } ), '', SHAPE, [ 'w' ] ), false, 'the part has a margin' );
	assert.equal( calSameBox( look( { more: { '.sgs-ic__label': part() } } ), '', SHAPE ), false, 'a label beside the shape' );
	assert.equal( calSameBox( look( { more: { '.sgs-ic__toggle': part( { display: 'none' } ) } } ), '', SHAPE, [ 'h' ] ), false, 'a sibling the offline render hides still counts (a script may show it)' );
	assert.equal( calSameBox( look( { r: root( { display: 'block' } ), p: part( { display: 'block', 'max-width': '434px' } ) } ), '', SHAPE, [ 'w' ] ), false, 'a capped part does not fill' );
	assert.equal( calSameBox( look( { r: root( { display: 'flex' } ) } ), '', SHAPE, [ 'w' ] ), false, 'a flex row root does not hand its width to an auto part' );
	assert.equal( calSameBox( look( { p: part( { position: 'absolute' } ) } ), '', SHAPE ), false, 'an out-of-flow part' );
	assert.equal( calSameBox( look( { more: { '.sgs-ic__x': part() } } ), '.sgs-ic__x', SHAPE ), false, 'two parts, neither the root' );
	assert.equal( calSameBox( { elements: { '': root(), [ SHAPE ]: part(), [ `${ SHAPE } > .sgs-ic__glyph` ]: part() } }, '', `${ SHAPE } > .sgs-ic__glyph` ), false, 'a grandchild is not judged' );
} );

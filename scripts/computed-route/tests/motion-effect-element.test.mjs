// R9: the sheen's band width and the ripple's size, peak opacity and colour come from the record's keyframes and the
// declarations the script gives the element it creates (lib/motion-effect-element.mjs, read by
// lib/motion-behaviours.mjs::recogniseBehaviour through ctx.records), never only from free-text notes. The planted
// records are shaped like the re-derived inventory's (lib/intake-inventory-anim.mjs): a Web Animation per call path of a
// shared helper, with its call path in its notes, and a JS style-write record on the code-created element.
import test from 'node:test';
import assert from 'node:assert/strict';
import { recogniseBehaviour } from '../lib/motion-behaviours.mjs';
import { effectElementStyle, cssTextDeclarations, colourOf, largerSideFactor, callPathOf } from '../lib/motion-effect-element.mjs';

const EASE = 'cubic-bezier(.16,.84,.32,1)';
const CREATED_IN = "an element created in code (document.createElement('span')) and inserted into e.target.closest('[data-pull]')";
const anim = ( id, over ) => ( {
	id, name: `Web Animation in fx on sp inserted into e.target.closest('[data-pull]')`, mechanism: 'waapi', status: 'active',
	element: { dc: 'Site', template_tpl_id: null, selector: "sp inserted into e.target.closest('[data-pull]')", selection_rule: CREATED_IN },
	source: { file: 'Site.dc.html', function: 'fx', line: 90, code: "sp.animate(kf, { duration: dur, easing: '…' })" },
	duration_ms: 600, delay_ms: 0, easing: EASE, iterations: 1, direction: 'normal', fill: 'auto', ...over,
} );
const style = ( id, fn, line, trigger, properties ) => ( {
	id, name: `JS write ${ id }`, mechanism: 'js-style-write', status: 'active',
	element: { dc: 'Site', template_tpl_id: null, selector: "document.createElement('span')", selection_rule: 'an element created in code' },
	source: { file: 'Site.dc.html', function: fn, line }, trigger: { type: trigger, detail: '' }, properties,
} );

// The sheen: the shine helper creates a 60% band and passes its keyframes to fx; nothing in the notes states a width.
const SHEEN = anim( 'A-31', { trigger: { type: 'pointer-move', detail: 'pointermove listener on document' }, duration_ms: 750,
	properties: [ { property: 'transform', from: 'translateX(-120%) skewX(-18deg)', to: 'translateX(260%) skewX(-18deg)' } ],
	notes: "called from shine (line 95): this.fx(m, sp, [{ transform: 'translateX(-120%) skewX(-18deg)' }, { transform: 'translateX(260%) skewX(-18deg)' }], 750); from bindMotion (line 74): this.shine(m)" } );
const SHEEN_STYLE = style( 'J-58', 'shine', 94, 'pointer-move', [ { property: 'position', from: null, to: 'absolute' }, { property: 'width', from: null, to: '60%' }, { property: 'background', from: null, to: 'linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent)' } ] );

// The ripple: the press handler sizes a circle at 2.2 times the host's larger side, paints it white at .35 and grows it.
const RIPPLE = anim( 'A-30', { trigger: { type: 'press', detail: 'pointerdown listener on document' }, duration_ms: 650,
	properties: [ { property: 'transform', from: 'scale(0)', to: 'scale(1)' }, { property: 'opacity', from: 1, to: 0 } ],
	notes: "called from bindMotion (line 82): this.fx(m, sp, [{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }], 650)" } );
const CSS = ( size ) => `'position:absolute;left:' + (e.clientX - r.left - ${ size } / 2) + 'px;top:' + (e.clientY - r.top - ${ size } / 2) + 'px;width:' + ${ size } + 'px;height:' + ${ size } + 'px;border-radius:50%;background:rgba(255,255,255,.35);pointer-events:none;'`;
const RIPPLE_STYLE = ( size, over = {} ) => style( 'J-51', 'bindMotion', 81, 'press', [ { property: 'css-text', from: null, to: null, formula: CSS( size ), ...over } ] );
const MAX = 'Math.max(r.width, r.height) * 2.2';

const effect = ( r, records ) => recogniseBehaviour( r, { records } ).effects[ 0 ];

test( 'MUST FAIL: the sheen band\'s width is the width the script declares on the band it creates', () => {
	const e = effect( SHEEN, [ RIPPLE, SHEEN, SHEEN_STYLE ] );
	assert.equal( e.effect, 'sheen' );
	assert.deepEqual( e.values, { angle: -18, bandWidth: 60, colour: '#ffffff', opacity: 0.45, duration: 750, easing: EASE } );
	// A band declared in pixels is not a share of its host: no width is written.
	assert.equal( effect( SHEEN, [ SHEEN, style( 'J-58', 'shine', 94, 'pointer-move', [ { property: 'width', from: null, to: '40px' } ] ) ] ).values.bandWidth, undefined );
} );

test( 'MUST FAIL: the ripple\'s size, peak opacity and colour come from its keyframes and its circle\'s declarations', () => {
	assert.deepEqual( effect( RIPPLE, [ RIPPLE, SHEEN, RIPPLE_STYLE( `(${ MAX })` ), SHEEN_STYLE ] ).values, { duration: 650, easing: EASE, sizeFactor: 2.2, peakOpacity: 0.35, colour: '#ffffff' } );
	// The scale the circle grows to multiplies its declared size; the first keyframe's opacity multiplies its colour's alpha.
	const grown = { ...RIPPLE, properties: [ { property: 'transform', from: 'scale(0)', to: 'scale(1.5)' }, { property: 'opacity', from: 0.5, to: 0 } ] };
	assert.deepEqual( effect( grown, [ grown, RIPPLE_STYLE( `(2 * Math.max(r.height, r.width))` ) ] ).values, { duration: 650, easing: EASE, sizeFactor: 3, peakOpacity: 0.175, colour: '#ffffff' } );
	// One property per declaration, written from its own formula, reads the same.
	const split = style( 'J-51', 'bindMotion', 81, 'press', [ { property: 'width', from: null, to: null, formula: `${ MAX } + 'px'` }, { property: 'background', from: null, to: 'rgb(0, 51, 255)' } ] );
	assert.deepEqual( effect( RIPPLE, [ RIPPLE, split ] ).values, { duration: 650, easing: EASE, sizeFactor: 2.2, peakOpacity: 1, colour: '#0033ff' } );
} );

test( 'a circle sized by a name the record does not resolve, or a clipped formula, writes no size: never a guess', () => {
	// `d` alone does not say what the size is a multiple of; the colour is still declared.
	assert.deepEqual( effect( RIPPLE, [ RIPPLE, RIPPLE_STYLE( 'd' ) ] ).values, { duration: 650, easing: EASE, peakOpacity: 0.35, colour: '#ffffff' } );
	assert.equal( largerSideFactor( { value: '{0}px', holes: [ 'r.width * 2.2' ] } ), null, 'the width alone is not the larger side' );
	// The inventory clips a long formula: it does not parse, so nothing is read from it.
	const clipped = RIPPLE_STYLE( `(${ MAX })`, { formula: `${ CSS( `(${ MAX })` ).slice( 0, 160 ) }…` } );
	assert.deepEqual( effect( RIPPLE, [ RIPPLE, clipped ] ).values, { duration: 650, easing: EASE } );
	// Clipped inside its last string, the formula still does not parse: what it would have said is not read.
	const full = CSS( `(${ MAX })` );
	const cut = RIPPLE_STYLE( `(${ MAX })`, { formula: `${ full.slice( 0, full.indexOf( 'border-radius' ) + 6 ) }…` } );
	assert.deepEqual( effect( RIPPLE, [ RIPPLE, cut ] ).values, { duration: 650, easing: EASE } );
	// A size with a unit other than px, or with more than one hole, is not a multiple of the larger side.
	assert.equal( largerSideFactor( { value: '{0}em', holes: [ MAX ] } ), null );
	assert.equal( largerSideFactor( { value: '{0}{1}px', holes: [ MAX, '1' ] } ), null );
} );

test( 'MUST FAIL: the circle is the style record of the call path\'s innermost function, at the nearest line before the call, on the same trigger', () => {
	const later = style( 'J-90', 'bindMotion', 83, 'press', [ { property: 'background', from: null, to: 'rgba(0,0,0,.9)' } ] );
	const elsewhere = style( 'J-91', 'other', 80, 'press', [ { property: 'background', from: null, to: 'rgba(0,0,0,.9)' } ] );
	const otherTrigger = style( 'J-92', 'bindMotion', 81, 'pointer-move', [ { property: 'background', from: null, to: 'rgba(0,0,0,.9)' } ] );
	const farther = style( 'J-93', 'bindMotion', 40, 'press', [ { property: 'background', from: null, to: 'rgba(0,0,0,.9)' } ] );
	assert.equal( effect( RIPPLE, [ RIPPLE, later, elsewhere, otherTrigger, farther, RIPPLE_STYLE( `(${ MAX })` ) ] ).values.colour, '#ffffff' );
	assert.equal( effectElementStyle( RIPPLE, [ RIPPLE, later, elsewhere, otherTrigger ] ), null );
	// The sheen's own band is in shine, the innermost function, though bindMotion holds a nearer created element too.
	const outer = style( 'J-57', 'bindMotion', 73, 'pointer-move', [ { property: 'width', from: null, to: '10%' } ] );
	assert.equal( effect( SHEEN, [ SHEEN, outer, SHEEN_STYLE ] ).values.bandWidth, 60 );
	assert.deepEqual( callPathOf( SHEEN ), [ { fn: 'shine', line: 95 }, { fn: 'bindMotion', line: 74 } ] );
	// An animation on a template element has no created element to read.
	assert.equal( effectElementStyle( { ...SHEEN, element: { dc: 'Site', template_tpl_id: '12', selector: 'ref x' } }, [ SHEEN_STYLE ] ), null );
} );

test( 'MUST FAIL: the notes are never read for a value: what the keyframes and declarations do not state is not written', () => {
	const noted = { ...SHEEN, notes: 'Span: absolute, width 45%' };
	assert.equal( effect( noted, [ noted ] ).values.bandWidth, undefined );
	assert.equal( effect( { ...noted, notes: `${ SHEEN.notes }; width 45%` }, [ noted, SHEEN_STYLE ] ).values.bandWidth, 60, 'the declared width, whatever the notes say' );
	const rippleNoted = { ...RIPPLE, notes: 'Span diameter = 1.8 × max(width, height), background rgba(255,255,255,.5)' };
	assert.deepEqual( effect( rippleNoted, [ rippleNoted ] ).values, { duration: 650, easing: EASE } );
	const both = { ...RIPPLE, notes: `${ RIPPLE.notes }; ${ rippleNoted.notes }` };
	assert.deepEqual( effect( both, [ both, RIPPLE_STYLE( `(${ MAX })` ) ] ).values, { duration: 650, easing: EASE, sizeFactor: 2.2, peakOpacity: 0.35, colour: '#ffffff' }, 'the declarations, whatever the notes say' );
} );

test( 'the declaration readers', () => {
	assert.deepEqual( cssTextDeclarations( "'width:' + d + 'px;border-radius:50%'" ), { width: { value: '{0}px', holes: [ 'd' ] }, 'border-radius': { value: '50%', holes: [] } } );
	assert.deepEqual( cssTextDeclarations( "'a:' + (" ), {} );
	assert.deepEqual( colourOf( 'rgba(255,255,255,.35)' ), { hex: '#ffffff', alpha: 0.35 } );
	assert.deepEqual( colourOf( '#FfF' ), { hex: '#ffffff', alpha: 1 } );
	assert.equal( colourOf( 'linear-gradient(red, blue)' ), null );
	assert.equal( largerSideFactor( { value: '{0}px', holes: [ MAX ] } ), 2.2 );
	assert.equal( largerSideFactor( { value: '{0}px', holes: [ `(${ MAX })` ] } ), 2.2 );
} );

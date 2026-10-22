// Spec 48 FR-48-77, delivery unit U13: the effect recogniser (lib/motion-behaviours.mjs) and its writer
// (lib/fill-behaviour.mjs, called by lib/fill-motion.mjs::motionWrites). Each case plants a draft record with the
// mechanism of one script-driven effect (a pointer handler writing a translate toward the pointer, a stripe sliding on
// pointer entry, ...) and asserts the stored values of the layer written through lib/motion-effects.mjs::writeEffect
// into a document the motion schema accepts. The records are shaped like the animation inventory's (animations.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { motionWrites } from '../lib/fill-motion.mjs';
import { recogniseBehaviour, effectRows } from '../lib/motion-behaviours.mjs';
import { motionFixtureDb } from './fixtures/motion-fixture-db.mjs';

const schema = loadMotionSchema();
const mdb = motionDb( openDb( motionFixtureDb( { 'sgs/container': [], 'sgs/brand-strip': [], 'sgs/nav-bar-menu': [] } ) ) );
const SNAPSHOT = { settings: { custom: {} } };
const EASE = 'cubic-bezier(.16,.84,.32,1)';
const MINUS = '−';
const TIMES = '×';

const rec = ( id, over ) => ( { id, name: id, mechanism: 'waapi', status: 'active', element: { dc: 'Site', template_tpl_id: null, selector: '' }, trigger: { type: 'mount', detail: '' }, properties: [], duration_ms: 600, delay_ms: 0, easing: 'ease', iterations: 1, direction: 'normal', ...over } );
const node = ( index, name, tpl ) => ( { index, name, targets: [ { id: `${ index }:`, slot: '', finder: { tpl: `Site/${ tpl }#0` } } ] } );
const hostTemplate = ( ...hooks ) => ( { elements: Object.fromEntries( hooks.map( ( [ tpl, hook ] ) => [ `Site/${ tpl }`, { attrs: { [ hook ]: '' } } ] ) ) } );
const run = ( nodes, records, over = {} ) => {
	const flat = nodes.map( ( n ) => ( { name: n.name, attributes: {}, ref: `r${ n.index }` } ) );
	const out = motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records, mdb, schema, rawSnapshot: SNAPSHOT, ...over } );
	return { flat, out, doc: out.writes.find( ( w ) => 'sgsMotion' === w.attr )?.after ?? null };
};
const reasons = ( out ) => out.unmapped.map( ( u ) => `${ u.value }: ${ u.reason }` );

// A pointer handler: the draft finds its element by a data hook, writes a translate toward the pointer.
const MAGNET = rec( 'P-1', { mechanism: 'js-style-write', element: { dc: 'Site', template_tpl_id: null, selector: 'document pointermove → e.target.closest(\'[data-pull]\')' }, trigger: { type: 'pointer-move', detail: 'document pointermove over a [data-pull] element' }, duration_ms: 250, easing: EASE,
	properties: [ { property: 'translate', from: '0 0', to: null, formula: `((x ${ MINUS } 0.5) ${ TIMES } 10)px ((y ${ MINUS } 0.5) ${ TIMES } 8)px, x,y = pointer position in element (0..1)` } ] } );
const SHEEN = rec( 'P-2', { trigger: { type: 'pointer-move', detail: 'first move onto a new [data-pull] element' }, element: { dc: 'Site', template_tpl_id: null, selector: 'span appended to the [data-pull] element' }, duration_ms: 750, easing: EASE,
	properties: [ { property: 'transform', from: 'translateX(-120%) skewX(-18deg)', to: 'translateX(260%) skewX(-18deg)' } ], notes: 'Span: absolute, width 60%, background linear-gradient' } );
const RIPPLE = rec( 'P-3', { trigger: { type: 'press', detail: 'pointerdown on or inside a [data-pull] element' }, element: { dc: 'Site', template_tpl_id: null, selector: 'span appended to the [data-pull] element on pointerdown' }, duration_ms: 650, easing: EASE,
	properties: [ { property: 'transform', from: 'scale(0)', to: 'scale(1)' }, { property: 'opacity', from: 1, to: 0 } ], notes: `Span diameter = 2.2 ${ TIMES } max(width, height), background rgba(255,255,255,.35)` } );
const TILT = rec( 'P-4', { mechanism: 'js-style-write', element: { dc: 'Site', template_tpl_id: null, selector: 'document pointermove → e.target.closest(\'[data-lean]\')' }, trigger: { type: 'pointer-move', detail: 'document pointermove over a [data-lean] element' },
	properties: [ { property: 'rotate', from: '0 0 1 0deg', to: null, formula: `x,y = pointer position in card (0..1); rotate = '(0.5${ MINUS }y) (x${ MINUS }0.5) 0 ' + hypot(x${ MINUS }0.5, y${ MINUS }0.5)${ TIMES }16 + 'deg' (max ${ '≈' } 11.3deg at a corner)` }, { property: '--gx', from: '50%', to: null, formula: `x ${ TIMES } 100%` }, { property: '--gy', from: '0%', to: null, formula: `y ${ TIMES } 100%` } ] } );
const TILT_RESET = rec( 'P-5', { trigger: { type: 'pointer-leave', detail: 'pointermove outside the tilted card' }, element: { dc: 'Site', template_tpl_id: null, selector: '[data-lean]' }, duration_ms: 600, easing: 'cubic-bezier(.34,1.56,.64,1)', properties: [ { property: 'rotate', from: 'current inline rotate', to: '0 0 1 0deg' } ] } );
const PEEK_CSS = '<div data-look style="position:relative;transition:transform .3s"><div data-look-layer style="clip-path:circle(var(--pr,0px) at var(--mx,50%) var(--my,50%));transition:clip-path .4s cubic-bezier(.16,.84,.32,1);"></div></div> .card:hover{--pr:90px}';
const PEEK = rec( 'P-6', { mechanism: 'js-style-write', element: { dc: 'Site', template_tpl_id: null, selector: '[data-look]' }, trigger: { type: 'pointer-move', detail: 'document pointermove, closest(\'[data-look]\'), not touch' },
	properties: [ { property: '--mx / --my', from: null, to: 'pointer position inside the card (px)', formula: 'clientX - rect.left, clientY - rect.top' } ], notes: 'Card :hover sets --pr:90px. The look layer and ring (z-index 1) sit behind the text.' } );
const PEEK_DROP = rec( 'P-7', { mechanism: 'js-style-write', element: { dc: 'Site', template_tpl_id: null, selector: '[data-look]' }, trigger: { type: 'state', detail: 'document dragenter over a card: --pr 150%' }, properties: [ { property: '--pr', from: '0px', to: '150%' } ], source: { code: 'pk.style.setProperty(\'--pr\', \'150%\')' } } );
const PARALLAX = rec( 'P-8', { mechanism: 'js-style-write', element: { dc: 'Site', template_tpl_id: '20', selector: 'main.querySelector(\'[data-top-img]\')' }, trigger: { type: 'scroll-position', detail: 'window scroll' },
	properties: [ { property: 'translate', from: '0 0px', to: null, formula: `'0 ' + round(scrollY * -0.06) + 'px'` } ] } );
const PROGRESS = rec( 'P-9', { mechanism: 'js-style-write', element: { dc: 'Site', template_tpl_id: '21', selector: 'ref setBarEl' }, trigger: { type: 'scroll-position', detail: 'window scroll' },
	properties: [ { property: 'transform', from: 'scaleX(0)', to: 'scaleX(1)', formula: 'scaleX(min(1, scrollY / (scrollHeight - innerHeight)))' } ] } );
const LABEL_MAGNET = rec( 'P-10', { mechanism: 'js-style-write', element: { dc: 'Site', template_tpl_id: '30', selector: 'nav button onMouseMove → currentTarget.querySelector(\'[data-label]\')' }, trigger: { type: 'pointer-move', detail: 'onMouseMove on the nav button' }, duration_ms: 200, easing: 'ease-out',
	properties: [ { property: 'transform', from: 'none', to: null, formula: `translateX((clientX ${ MINUS } buttonCentreX) ${ TIMES } 0.14 px)` } ] } );
const FADE = rec( 'P-11', { trigger: { type: 'route', detail: 'componentDidUpdate when the page changes' }, element: { dc: 'Site', template_tpl_id: null, selector: 'ref setMainEl (main)', description: 'Whole main element' }, duration_ms: 380, easing: 'ease-out', properties: [ { property: 'opacity', from: 0, to: 1 } ] } );
const SCROLL_TOP = rec( 'P-12', { mechanism: 'js-scroll', trigger: { type: 'route', detail: 'page changes' }, element: { dc: 'Site', template_tpl_id: null, selector: 'window' }, properties: [ { property: 'scrollY', from: 'any', to: 0 } ], duration_ms: 0 } );
const MARQUEE_LOOP = rec( 'P-13', { element: { dc: 'Site', template_tpl_id: '40', selector: 'ref setTrackEl' }, trigger: { type: 'mount', detail: '' }, duration_ms: 'dist / 0.045', easing: 'linear', iterations: 'infinite',
	properties: [ { property: 'transform', from: 'translateX(0)', to: 'translateX(-{dist}px)', formula: 'dist = children[n].offsetLeft' } ] } );
const MARQUEE_SLOW = rec( 'P-14', { mechanism: 'waapi-control', element: { dc: 'Site', template_tpl_id: null, selector: 'onMouseEnter pauseMarquee on the wrapper' }, trigger: { type: 'hover', detail: 'onMouseEnter' }, properties: [ { property: 'playbackRate (of P-13)', from: 1, to: 0.15 } ] } );
const MEASURED_MARQUEE = { 1440: { loops: [ { css: false, frames: [ { transform: 'translateX(0px)' }, { transform: 'translateX(-1800px)' } ], duration: 40000, direction: 'normal', easing: 'linear' } ], box: { width: 1800, height: 80 } } };

const hosted = ( tpl, hook ) => ( { template: hostTemplate( [ tpl, hook ] ) } );
const layerOf = ( doc, panel = 'effects', effect = null, at = 'root' ) => ( 'hover.effects' === panel ? doc.elements[ at ].hover.effects : doc.elements[ at ].effects ).find( ( l ) => ! effect || l.effect === effect );

test( 'MUST FAIL: a pointer handler writing a translate toward the pointer is a magnet; its normalised pull, travel and return are stored', () => {
	const { out, doc } = run( [ node( 0, 'sgs/container', '10' ) ], [ MAGNET ], hosted( '10', 'data-pull' ) );
	assert.deepEqual( reasons( out ), [] );
	const l = layerOf( doc, 'hover.effects', 'magnet' );
	assert.deepEqual( l.values, { engage: 'over', pullModel: 'normalised', maxPullX: 10, maxPullY: 8, returnDuration: 250, returnEasing: EASE } );
	assert.equal( l.trigger, 'hover' );
} );

test( 'MUST FAIL: the same host also gets the sheen (slanted stripe, skewX recorded) and the ripple (pointerdown) the draft adds to it', () => {
	const { out, doc } = run( [ node( 0, 'sgs/container', '10' ) ], [ MAGNET, SHEEN, RIPPLE ], hosted( '10', 'data-pull' ) );
	assert.deepEqual( reasons( out ), [] );
	assert.deepEqual( layerOf( doc, 'hover.effects', 'sheen' ).values, { angle: -18, bandWidth: 60, duration: 750, easing: EASE } );
	const ripple = layerOf( doc, 'effects', 'ripple' );
	assert.equal( ripple.trigger, 'pointerdown' );
	assert.deepEqual( ripple.values, { duration: 650, easing: EASE, sizeFactor: 2.2, peakOpacity: 0.35, colour: '#ffffff' } );
	assert.deepEqual( recogniseBehaviour( SHEEN ).coverage, [ 'css-function:skewx' ] );
} );

test( 'MUST FAIL: a pointer handler writing rotate from the pointer is a tilt (follow-pointer with its angle and spring back) with a glare for the highlight it writes', () => {
	const { out, doc } = run( [ node( 0, 'sgs/container', '10' ) ], [ TILT, TILT_RESET ], hosted( '10', 'data-lean' ) );
	assert.deepEqual( reasons( out ), [] );
	assert.deepEqual( doc.elements.root.hover.state.values, { followPointer: true, maxAngle: 11.3, resetDuration: 600, resetEasing: 'cubic-bezier(.34,1.56,.64,1)' } );
	assert.equal( layerOf( doc, 'hover.effects', 'glare' ).effect, 'glare' );
} );

test( 'MUST FAIL: pointer-written custom properties that a clip-path circle consumes are the cursor field\'s image reveal (circle() recorded); the drop opening is held by it', () => {
	const css = { draftCss: [ PEEK_CSS ] };
	const { out, doc } = run( [ node( 0, 'sgs/container', '10' ) ], [ PEEK, PEEK_DROP ], { ...hosted( '10', 'data-look' ), ...css } );
	assert.deepEqual( reasons( out ), [] );
	assert.deepEqual( layerOf( doc, 'effects', 'cursor-field' ).values, { field: 'image-reveal', radius: 0, hoverRadius: 90, radiusDuration: 400, radiusEasing: 'cubic-bezier(.16,.84,.32,1)', ring: true } );
	assert.deepEqual( recogniseBehaviour( PEEK, css.draftCss && { css: css.draftCss } ).coverage, [ 'css-function:circle' ] );
	assert.equal( recogniseBehaviour( PEEK_DROP ).kind, 'covered' );
	assert.match( out.notes.map( ( n ) => n.text ).join( '\n' ), /P-7: the whole-image reveal is what the cursor field gives on keyboard focus and tap/ );
} );

test( 'MUST FAIL: the same custom properties with no circle clip or mask consuming them are not a reveal, so nothing is written', () => {
	assert.equal( recogniseBehaviour( PEEK, { css: [ '.card{background:red}' ] } ), null );
	const { doc } = run( [ node( 0, 'sgs/container', '10' ) ], [ PEEK ], { ...hosted( '10', 'data-look' ), draftCss: [ '.card{background:red}' ] } );
	assert.equal( doc, null );
} );

test( 'MUST FAIL: a scroll handler writing a translate by scrollY times a factor is a page-basis parallax with the signed ratio; one writing a scale of the scroll fraction is a scroll progress bar', () => {
	const { out, doc } = run( [ node( 0, 'sgs/container', '20' ), node( 1, 'sgs/container', '21' ) ], [ PARALLAX, PROGRESS ] );
	assert.deepEqual( reasons( out ), [] );
	const nodes = out.writes.filter( ( w ) => 'sgsMotion' === w.attr );
	assert.deepEqual( nodes[ 0 ].after.elements.root.effects[ 0 ], { id: 'parallax-1', effect: 'parallax', trigger: 'scroll', values: { axis: 'y', basis: 'page', speedRatio: -0.06 } } );
	assert.deepEqual( nodes[ 1 ].after.elements.root.effects[ 0 ].values, { source: 'page', output: 'bar-x' } );
	assert.equal( doc, nodes[ 0 ].after );
} );

test( 'MUST FAIL: a label magnet (one axis, an offset from the centre times a factor) on a block that declares the item magnet settings writes the settings; on a block that does not it is a magnet layer', () => {
	const settings = run( [ node( 0, 'sgs/nav-bar-menu', '30' ) ], [ LABEL_MAGNET ], { hasAttr: ( block, attr ) => 'sgs/nav-bar-menu' === block && /^itemMagnet/.test( attr ) } );
	assert.deepEqual( settings.out.writes.map( ( w ) => [ w.attr, w.after ] ), [ [ 'itemMagnetEnabled', true ], [ 'itemMagnetStrength', 0.14 ] ] );
	assert.equal( settings.flat[ 0 ].attributes.itemMagnetStrength, 0.14 );
	assert.equal( settings.doc, null, 'no layer when the settings express it' );
	const layer = run( [ node( 0, 'sgs/container', '30' ) ], [ LABEL_MAGNET ], { hasAttr: () => false } );
	assert.deepEqual( layerOf( layer.doc, 'hover.effects', 'magnet' ).values, { engage: 'over', pullModel: 'distance', axis: 'x', factor: 0.14, returnDuration: 200, returnEasing: 'ease-out' } );
} );

test( 'MUST FAIL: the marquee\'s hover slow-down is a control of the marquee layer: its hover rate is stored on the layer of the record it names', () => {
	const { out, doc } = run( [ node( 0, 'sgs/brand-strip', '40' ) ], [ MARQUEE_LOOP, MARQUEE_SLOW ], { loops: { '0:': MEASURED_MARQUEE } } );
	assert.deepEqual( reasons( out ), [] );
	const l = layerOf( doc, 'effects', 'marquee' );
	assert.deepEqual( l.values, { speed: 45, direction: 'left', hoverRate: 0.15 } );
	const lonely = run( [ node( 0, 'sgs/container', '41' ) ], [ MARQUEE_SLOW ], hosted( '41', 'data-none' ) );
	assert.equal( recogniseBehaviour( MARQUEE_SLOW ).kind, 'control' );
	assert.match( reasons( lonely.out ).join( '\n' ), /P-14: P-13 is not written as a marquee layer, so its control has nothing to set/ );
} );

test( 'MUST FAIL: a fade of the main element on a route change is the page transition option, and a scroll reset on a route change is native; neither is a block layer', () => {
	const { out, doc } = run( [ node( 0, 'sgs/container', '10' ) ], [ FADE, SCROLL_TOP ], hosted( '10', 'data-x' ) );
	assert.equal( doc, null );
	assert.deepEqual( recogniseBehaviour( FADE ).value, { style: 'fade', durationMs: 380, easing: 'ease-out' } );
	assert.equal( recogniseBehaviour( SCROLL_TOP ).kind, 'native' );
	assert.deepEqual( out.unmapped, [] );
} );

test( 'MUST FAIL: rings that drift by random amounts per element store the values sampled on each element (ambient float, both axes); the scale breathing is named, not kept', () => {
	const ring = rec( 'P-15', { element: { dc: 'Site', template_tpl_id: '50', selector: '[data-ring]' }, trigger: { type: 'loop', detail: 'bound after mount' }, duration_ms: '7000 + random * 6000', easing: 'ease-in-out', iterations: 'infinite', direction: 'alternate',
		properties: [ { property: 'translate', from: '0 0', to: '{dx}px {dy}px', formula: 'dx, dy = random in +-18px' }, { property: 'scale', from: '1', to: '{s}', formula: 's = 1.05 + Math.random() * 0.07' } ] } );
	const measured = { 1440: { loops: [ { css: false, frames: [ { translate: '0px 0px', scale: '1' }, { translate: '12px -9px', scale: '1.08' } ], duration: 9000, direction: 'alternate', easing: 'ease-in-out' } ], box: { width: 300, height: 300 } } };
	const { out, doc } = run( [ node( 0, 'sgs/container', '50' ) ], [ ring ], { loops: { '0:': measured } } );
	const l = layerOf( doc, 'effects', 'ambient-float' );
	assert.deepEqual( l.values, { axis: 'both', travel: 12, travelY: -9, period: 9000, direction: 'alternate', easing: 'ease-in-out' } );
	assert.match( out.notes.map( ( n ) => n.text ).join( '\n' ), /values sampled on this element are stored/ );
	assert.match( out.notes.map( ( n ) => n.text ).join( '\n' ), /moving scale is not held by ambient-float/ );
	const none = run( [ node( 0, 'sgs/container', '50' ) ], [ { ...ring, trigger: { type: 'mount' } } ], {} );
	assert.match( reasons( none.out ).join( '\n' ), /render showed no matching endless animation on this element to sample/ );
} );

test( 'a handler whose formula is neither a position times a size nor an offset times a factor is reported as a gap, not guessed; a block that does not offer the effect refuses it by name', () => {
	const odd = { ...MAGNET, id: 'P-16', properties: [ { property: 'translate', formula: 'pointer position in element with easing curve f(x)' } ] };
	const r1 = run( [ node( 0, 'sgs/container', '10' ) ], [ odd ], hosted( '10', 'data-pull' ) );
	assert.match( reasons( r1.out ).join( '\n' ), /P-16: .*neither a position in the element times a size nor an offset from its centre times a factor/ );
	const r2 = run( [ node( 0, 'sgs/nav-bar-menu', '10' ) ], [ MAGNET ], hosted( '10', 'data-pull' ) );
	assert.match( reasons( r2.out ).join( '\n' ), /P-1: magnet: sgs\/nav-bar-menu does not offer magnet/ );
} );

test( 'records the existing writers handle are written, not rebuilt: a scroll entrance, a load entrance with a delay, a scale-down entrance and a float loop', () => {
	const e = ( id, tpl, props, over ) => rec( id, { element: { dc: 'Site', template_tpl_id: tpl }, trigger: { type: 'scroll-into-view' }, easing: EASE, ...over, properties: props } );
	const records = [
		e( 'P-20', '60', [ { property: 'transform', from: 'scaleX(0)', to: 'scaleX(1)' } ], { duration_ms: 1400, delay_ms: 200 } ),
		e( 'P-21', '61', [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'translateY(22px)', to: 'none' }, { property: 'filter', from: 'blur(6px)', to: 'blur(0)' } ], { duration_ms: 850 } ),
		e( 'P-22', '62', [ { property: 'transform', from: 'scale(1.18)', to: 'scale(1)' } ], { trigger: { type: 'load' }, duration_ms: 1600, delay_ms: 200 } ),
		e( 'P-23', '63', [ { property: 'transform', from: 'translateY(0)', to: 'translateY(-12px)' } ], { trigger: { type: 'loop' }, duration_ms: 4200, easing: 'ease-in-out', iterations: 'infinite', direction: 'alternate' } ),
	];
	const float = { 1440: { loops: [ { css: false, frames: [ { transform: 'translateY(0px)' }, { transform: 'translateY(-12px)' } ], duration: 4200, direction: 'alternate', easing: 'ease-in-out' } ], box: { width: 300, height: 300 } } };
	const { out } = run( [ 60, 61, 62, 63 ].map( ( t, i ) => node( i, 'sgs/container', String( t ) ) ), records, { loops: { '3:': float } } );
	assert.deepEqual( reasons( out ), [] );
	const docs = out.writes.filter( ( w ) => 'sgsMotion' === w.attr ).map( ( w ) => w.after.elements.root );
	assert.deepEqual( docs[ 0 ].entrance.base.values.to, { scaleX: 1 } );
	assert.equal( docs[ 1 ].entrance.base.values.duration, 850 );
	assert.deepEqual( docs[ 2 ].entrance.base.values.from, { scale: 1.18 } );
	assert.equal( docs[ 3 ].effects[ 0 ].effect, 'ambient-float' );
	assert.equal( docs[ 3 ].effects[ 0 ].values.period, 4200 );
} );

test( 'the effect review rows: one per recognised effect and one per script effect no SGS effect expresses; a native or held record raises none', () => {
	const rows = effectRows( [ MAGNET, SHEEN, { ...MAGNET, id: 'P-16', properties: [ { property: 'translate', formula: 'pointer position in element with an easing curve' } ] }, SCROLL_TOP, PEEK_DROP, FADE ] );
	assert.deepEqual( rows.map( ( r ) => [ r.rowId, r.kind ] ), [ [ 'effect:P-1', 'effect' ], [ 'effect:P-2', 'effect' ], [ 'effect:P-16', 'unmapped' ], [ 'effect:P-11', 'site' ] ] );
	assert.equal( rows[ 0 ].effect, 'magnet' );
	assert.ok( rows[ 2 ].unmapped );
} );

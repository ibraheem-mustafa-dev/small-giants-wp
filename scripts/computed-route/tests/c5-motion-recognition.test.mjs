// Spec 48 FR-48-77, register row C5 (recognition): the effect recogniser (lib/motion-behaviours.mjs::recogniseBehaviour)
// reads a scroll value the handler passes in as a parameter as a parallax; a scroll track a timer steps, with pointer drag
// and arrow controls, as the testimonial slider's settings; the pinned timeline's settings carry the orientation they depend
// on; and a script reveal (an opacity and a rise written by one tween) is one scroll entrance whose hiding writes are held
// by it (lib/motion-reveal.mjs). Records are shaped like the re-derived inventory's (intake.json inventory.animations).
import test from 'node:test';
import assert from 'node:assert/strict';
import { recogniseBehaviour } from '../lib/motion-behaviours.mjs';
import { normaliseReveals, hiddenStartOf, EASING_CSS } from '../lib/motion-reveal.mjs';

const J = ( id, over ) => ( {
	id, name: id, mechanism: 'js-style-write', status: 'active', element: { dc: 'App', template_tpl_id: null, selector: 'el' },
	source: { file: 'App.dc.html', function: 'f', code: '' }, trigger: { type: 'state', detail: '' }, properties: [], duration_ms: 0, delay_ms: 0, stagger: null, easing: null, iterations: 1, ...over,
} );

// ---- the parallax whose scroll value is a parameter (item 4) ----
const PARALLAX = J( 'J-15', {
	element: { dc: 'App', template_tpl_id: '113', selector: 'this.heroRef.current' },
	source: { file: 'App.dc.html', function: 'parallax', code: "el.style.transform = 'translate3d(0,' + y * 0.18 + 'px,0)'" },
	trigger: { type: 'scroll-position', detail: 'scroll listener on window (this._onWin) via parallax' },
	properties: [ { property: 'transform', from: null, to: null, formula: "'translate3d(0,' + y * 0.18 + 'px,0)'" } ],
} );

test( 'MUST FAIL (C5 recognition 4): a scroll value passed in as a parameter times a factor in a translate is a parallax', () => {
	const b = recogniseBehaviour( PARALLAX );
	assert.equal( b?.kind, 'effect', JSON.stringify( b ) );
	assert.deepEqual( b.effects[ 0 ], { effect: 'parallax', panel: 'effects', trigger: 'scroll', values: { axis: 'y', basis: 'page', speedRatio: 0.18 } } );
} );

test( 'negative control (C5 recognition 4): the same formula on a trigger that is not a scroll, or with no translate, is not a parallax; scrollY still is', () => {
	assert.equal( recogniseBehaviour( { ...PARALLAX, trigger: { type: 'mount', detail: 'componentDidMount' } } ), null );
	assert.equal( recogniseBehaviour( { ...PARALLAX, properties: [ { property: 'transform', formula: "'scale(' + y * 0.18 + ')'" } ] } ), null );
	assert.equal( recogniseBehaviour( { ...PARALLAX, trigger: { type: 'scroll-position', detail: 'IntersectionObserver callback via parallax' } } ), null, 'a scroll-position record whose trigger does not name the scroll' );
	assert.equal( recogniseBehaviour( { ...PARALLAX, properties: [ { property: 'transform', formula: "'translateY(' + innerHeight * 0.5 + 'px)'" } ] } ), null, 'the viewport height is not the scroll position' );
	const y = recogniseBehaviour( { ...PARALLAX, properties: [ { property: 'transform', formula: "'translateY(' + window.scrollY * 0.3 + 'px)'" } ] } );
	assert.equal( y.effects[ 0 ].values.speedRatio, 0.3 );
	const named = recogniseBehaviour( { ...PARALLAX, properties: [ { property: 'transform', formula: "'translateY(' + $off * -0.25 + 'px)'" } ] } );
	assert.equal( named.effects[ 0 ].values.speedRatio, -0.25, 'a name with a $ is read whole' );
} );

// ---- the pinned timeline carries its orientation (item 10) ----
test( 'MUST FAIL (C5 recognition 10): the pinned horizontal timeline is written with the horizontal orientation it depends on', () => {
	const PIN = 'window scroll (rAF-throttled) -> updatePins(). p = clamp((stickyTop - pin.top) / (pin.offsetHeight - sticky.offsetHeight), 0, 1)';
	const track = J( 'S-5', { trigger: { type: 'scroll-position', detail: PIN }, element: { dc: 'Site', template_tpl_id: '10', selector: '[data-pin] -> [data-pin-x]' }, properties: [ { property: 'transform', formula: 'dist = max(0, track.scrollWidth - innerWidth); translate3d(−p × dist px, 0, 0)' } ] } );
	const b = recogniseBehaviour( track );
	assert.deepEqual( b.blocks[ 'sgs/timeline' ].slice( 0, 2 ), [ { attr: 'scrollEffect', value: 'pinned-horizontal' }, { attr: 'orientation', value: 'horizontal' } ] );
} );

// ---- a script reveal is one scroll entrance (item 3) ----
const TWEEN = { duration_ms: 460, easing: 'easeOutCubic', stagger: { ms: 70, cap_ms: 490, base_ms: 0, basis: 'item index (i), capped at 7' } };
const opacity = ( id, trigger, over = {} ) => J( id, { source: { file: 'App.dc.html', function: 'show', code: 'el.style.opacity = String(e)' }, trigger: { type: trigger, detail: `via show (${ trigger })` }, properties: [ { property: 'opacity', from: null, to: null, formula: 'String(e)' } ], ...TWEEN, ...over } );
const rise = ( id, trigger, over = {} ) => J( id, { source: { file: 'App.dc.html', function: 'show', code: "el.style.transform = 'translateY(' + (26 * (1 - e)).toFixed(2) + 'px)'" }, trigger: { type: trigger, detail: `via show (${ trigger })` }, properties: [ { property: 'transform', from: null, to: null, formula: "'translateY(' + (26 * (1 - e)).toFixed(2) + 'px)'" } ], ...TWEEN, ...over } );
const FOUR = [ 'scroll-into-view', 'mount', 'press', 'state' ];
const REVEAL_RECORDS = [ ...FOUR.map( ( t, i ) => opacity( `J-0${ i + 1 }`, t ) ), ...FOUR.map( ( t, i ) => rise( `J-0${ i + 5 }`, t ) ) ];

test( 'MUST FAIL (C5 recognition 3): the opacity and the rise one tween writes are one scroll entrance with the tween\'s timing, once per caller', () => {
	const out = normaliseReveals( REVEAL_RECORDS );
	assert.equal( out.length, 4, 'eight writes are four entrances' );
	const scroll = out.find( ( r ) => 'scroll-into-view' === r.trigger.type );
	assert.equal( scroll.id, 'J-01' );
	assert.equal( scroll.mechanism, 'waapi' );
	assert.deepEqual( scroll.mergedFrom, [ 'J-01', 'J-05' ] );
	assert.deepEqual( scroll.properties, [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'translateY(26px)', to: 'none' } ] );
	assert.equal( scroll.duration_ms, 460 );
	assert.equal( scroll.easing, EASING_CSS.easeOutCubic );
	assert.equal( scroll.delay_ms, 'i * 70' );
	assert.deepEqual( scroll.reveal, { axis: 'Y', px: 26 } );
} );

test( 'negative control (C5 recognition 3): a curve the inventory could not name, a tween with no opacity, an inactive write and a non-style write are left as they were', () => {
	const odd = [ opacity( 'A', 'state', { easing: 'Math.sin(p)' } ), rise( 'B', 'state', { easing: 'Math.sin(p)' } ) ];
	assert.deepEqual( normaliseReveals( odd ), odd );
	const riseOnly = [ rise( 'C', 'state' ) ];
	assert.deepEqual( normaliseReveals( riseOnly ), riseOnly );
	const dead = [ opacity( 'D', 'state', { status: 'dead-code' } ), rise( 'E', 'state', { status: 'dead-code' } ) ];
	assert.deepEqual( normaliseReveals( dead ), dead );
	const other = [ opacity( 'F', 'state', { mechanism: 'js-text-write' } ) ];
	assert.deepEqual( normaliseReveals( other ), other );
	const flat = [ opacity( 'G', 'state', { duration_ms: 0 } ) ];
	assert.deepEqual( normaliseReveals( flat ), flat, 'no duration is no tween' );
	assert.deepEqual( normaliseReveals( null ), [] );
	const constant = [ opacity( 'K', 'state', { properties: [ { property: 'opacity', formula: '0.5' } ] } ) ];
	assert.deepEqual( normaliseReveals( constant ), constant, 'an opacity that is not the eased value is not a reveal' );
	const margin = [ opacity( 'L', 'state' ), rise( 'M', 'state', { properties: [ { property: 'margin-top', formula: "'translateY(' + (26 * (1 - e)).toFixed(2) + 'px)'" } ] } ) ];
	assert.deepEqual( normaliseReveals( margin ).find( ( r ) => 'L' === r.id ).properties.length, 1, 'only a transform is a rise' );
	const alone = normaliseReveals( [ opacity( 'H', 'mount', { stagger: null } ) ] );
	assert.equal( alone[ 0 ].properties.length, 1, 'an opacity-only reveal has no rise' );
	assert.equal( alone[ 0 ].delay_ms, 0, 'no stagger leaves the delay as recorded' );
	assert.deepEqual( alone[ 0 ].reveal, { axis: null, px: 0 } );
} );

test( 'negative control (C5 recognition 3): tweens of different functions, durations or triggers are not merged with each other', () => {
	const mixed = [ opacity( 'A', 'state' ), rise( 'B', 'state', { duration_ms: 300 } ), rise( 'C', 'mount' ), rise( 'D', 'state', { source: { file: 'App.dc.html', function: 'hide', code: '' } } ) ];
	assert.equal( normaliseReveals( mixed ).length, 4 );
} );

test( 'MUST FAIL (C5 recognition 3): the writes that hide an element until its reveal are held by the reveal, only when the poses agree', () => {
	const reveals = normaliseReveals( REVEAL_RECORDS );
	const hide = ( id, property, to ) => J( id, { element: { dc: 'App', template_tpl_id: [ '131', '138' ], selector: '[data-reveal]' }, source: { file: 'App.dc.html', function: 'reveals', code: '' }, trigger: { type: 'mount', detail: 'componentDidMount via reveals' }, properties: [ { property, from: null, to } ] } );
	const b = recogniseBehaviour( hide( 'J-09', 'opacity', '0' ), { records: reveals } );
	assert.equal( b.kind, 'covered' );
	assert.equal( b.by, 'entrance' );
	assert.match( b.reason, /scroll reveal J-01/ );
	assert.equal( recogniseBehaviour( hide( 'J-12', 'transform', 'translateY(26px)' ), { records: reveals } ).kind, 'covered' );
	assert.equal( hiddenStartOf( hide( 'J-12', 'transform', 'translateY(30px)' ), reveals ), null, 'a different rise is another write' );
	assert.equal( hiddenStartOf( hide( 'J-09', 'opacity', '0' ), [] ), null, 'with no reveal in the draft nothing is held' );
	assert.equal( hiddenStartOf( hide( 'J-09', 'opacity', '0.5' ), reveals ), null );
	assert.equal( hiddenStartOf( hide( 'J-09', 'color', 'red' ), reveals ), null );
	assert.equal( hiddenStartOf( { ...hide( 'J-09', 'opacity', '0' ), element: { dc: 'Other', template_tpl_id: '1' } }, reveals ), null, 'a reveal of another component does not hold it' );
	assert.equal( hiddenStartOf( { ...hide( 'J-09', 'opacity', '0' ), element: { dc: 'App', template_tpl_id: null } }, reveals ), null, 'a write with no template element is not a hide of one' );
	assert.equal( hiddenStartOf( { ...hide( 'J-09', 'opacity', '0' ), mechanism: 'waapi' }, reveals ), null );
	assert.equal( hiddenStartOf( { ...hide( 'J-09', 'opacity', '0' ), properties: [] }, reveals ), null );
} );

// ---- the carousel (item 5) ----
const TRACK = { dc: 'Home', template_tpl_id: '150', selector: '(ref || this.trackRef).current' };
const step = ( id, trigger, detail, code ) => J( id, { mechanism: 'js-scroll', element: TRACK, source: { file: 'Home.dc.html', function: 'step', code }, trigger: { type: trigger, detail }, properties: [ { property: 'scroll-position', formula: code } ] } );
const drag = ( id, mechanism, property, code ) => J( id, { mechanism, element: { ...TRACK, template_tpl_id: null }, source: { file: 'Home.dc.html', function: 'drag', code }, trigger: { type: 'state', detail: 'a value renderVals passes to the template as rd (→ drag)' }, properties: [ { property, to: 'none' } ] } );
const TIMER = 'setInterval every 6000ms via step';
const CAROUSEL = [
	step( 'J-07', 'interval', TIMER, 't.scrollTo({ left: 0 })' ), step( 'J-09', 'interval', TIMER, 't.scrollTo({ left: i * w })' ),
	step( 'J-08', 'state', 'a value renderVals passes to the template as prev (→ step) (and 1 more: next)', 't.scrollTo({ left: 0 })' ),
	drag( 'J-01', 'js-style-write', 'scroll-snap-type', "t.style.scrollSnapType = 'none'" ), drag( 'J-03', 'js-scroll', 'scroll-left', 't.scrollLeft = d.sl - dx' ),
];

test( 'MUST FAIL (C5 recognition 5): a track a timer steps, with pointer drag and arrow controls, is the testimonial slider\'s autoplay, drag to scroll and arrows', () => {
	const b = recogniseBehaviour( CAROUSEL[ 0 ], { records: CAROUSEL } );
	assert.equal( b.kind, 'settings', JSON.stringify( b ) );
	assert.deepEqual( b.blocks, { 'sgs/testimonial-slider': [ { attr: 'autoplay', value: true }, { attr: 'autoplaySpeed', value: 6000 }, { attr: 'dragToScroll', value: true }, { attr: 'showArrows', value: true } ] } );
	assert.match( b.notes.join( ' ' ), /showDots is left/ );
	for ( const id of [ 'J-09', 'J-08', 'J-01', 'J-03' ] ) {
		const c = recogniseBehaviour( CAROUSEL.find( ( r ) => id === r.id ), { records: CAROUSEL } );
		assert.equal( c.kind, 'covered', `${ id }: ${ JSON.stringify( c ) }` );
		assert.equal( c.by, 'testimonial-slider' );
	}
} );

test( 'negative control (C5 recognition 5): with no drag the setting is not written, with no timer nothing is a carousel, another component\'s track is not joined', () => {
	const noDrag = CAROUSEL.filter( ( r ) => ! /^J-0[13]$/.test( r.id ) && 'J-01' !== r.id );
	const b = recogniseBehaviour( noDrag[ 0 ], { records: noDrag } );
	assert.deepEqual( b.blocks[ 'sgs/testimonial-slider' ].map( ( s ) => s.attr ), [ 'autoplay', 'autoplaySpeed', 'showArrows' ] );
	const noArrows = CAROUSEL.filter( ( r ) => 'J-08' !== r.id );
	assert.deepEqual( recogniseBehaviour( noArrows[ 0 ], { records: noArrows } ).blocks[ 'sgs/testimonial-slider' ].map( ( s ) => s.attr ), [ 'autoplay', 'autoplaySpeed', 'dragToScroll' ] );
	const noTimer = CAROUSEL.filter( ( r ) => 'interval' !== r.trigger.type );
	assert.equal( recogniseBehaviour( noTimer[ 0 ], { records: noTimer } ), null, 'arrows alone are not a carousel' );
	assert.equal( recogniseBehaviour( CAROUSEL[ 0 ], {} ), null, 'with no inventory there is no evidence' );
	const other = CAROUSEL.map( ( r ) => ( { ...r, element: { ...r.element, dc: 'Other' } } ) );
	assert.equal( recogniseBehaviour( CAROUSEL[ 2 ], { records: other } ), null, 'records of another component are not this track\'s' );
	const dead = CAROUSEL.map( ( r ) => ( 'interval' === r.trigger.type ? { ...r, status: 'dead-code' } : r ) );
	assert.equal( recogniseBehaviour( dead[ 2 ], { records: dead } ), null, 'a timer the draft never runs is not an autoplay' );
	const slow = CAROUSEL.map( ( r ) => ( 'J-07' === r.id ? { ...r, trigger: { type: 'interval', detail: 'setInterval every 4500ms via step' } } : r ) );
	assert.equal( recogniseBehaviour( slow[ 0 ], { records: slow } ).blocks[ 'sgs/testimonial-slider' ][ 1 ].value, 4500 );
	const unrelated = J( 'J-20', { mechanism: 'js-scroll', element: TRACK, source: { file: 'Home.dc.html', function: 'jump', code: 'window.scrollTo({ left: 0 })' }, trigger: { type: 'press', detail: 'onClick' } } );
	assert.equal( recogniseBehaviour( unrelated, { records: [ ...CAROUSEL, unrelated ] } ), null, "another function of the component is not the track's" );
	const aside = [ ...noArrows, unrelated ];
	assert.ok( ! recogniseBehaviour( aside[ 0 ], { records: aside } ).blocks[ 'sgs/testimonial-slider' ].some( ( s ) => 'showArrows' === s.attr ), 'a step of another function is not an arrow of this track' );
	const wrongDrag = CAROUSEL.map( ( r ) => ( 'J-01' === r.id ? { ...r, source: { ...r.source, function: 'init' } } : r ) );
	assert.ok( ! recogniseBehaviour( wrongDrag[ 0 ], { records: wrongDrag } ).blocks[ 'sgs/testimonial-slider' ].some( ( s ) => 'dragToScroll' === s.attr ), 'a snap write outside the drag handlers is not the drag' );
	const deadDrag = CAROUSEL.map( ( r ) => ( 'J-01' === r.id ? { ...r, status: 'dead-code' } : r ) );
	assert.ok( ! recogniseBehaviour( deadDrag[ 0 ], { records: deadDrag } ).blocks[ 'sgs/testimonial-slider' ].some( ( s ) => 'dragToScroll' === s.attr ), 'a drag handler the draft never runs is not the drag' );
	const styleTimer = CAROUSEL.map( ( r ) => ( 'J-07' === r.id || 'J-09' === r.id ? { ...r, mechanism: 'js-style-write' } : r ) );
	assert.equal( recogniseBehaviour( styleTimer[ 2 ], { records: styleTimer } ), null, 'a style write is not a step of the track' );
	const onlyDragStyle = CAROUSEL.filter( ( r ) => 'J-03' !== r.id );
	assert.ok( ! recogniseBehaviour( onlyDragStyle[ 0 ], { records: onlyDragStyle } ).blocks[ 'sgs/testimonial-slider' ].some( ( s ) => 'dragToScroll' === s.attr ), 'the drag needs both its snap suspension and its scroll write' );
} );

// Spec 48 FR-48-77, register row C5 (recognition): the effect recogniser (lib/motion-behaviours.mjs::recogniseBehaviour)
// reads a scroll value the handler passes in as a parameter as a parallax; the pinned timeline's settings leave its
// orientation to the skeleton rule; and a script reveal (an opacity and a rise written by one tween) is one scroll entrance whose hiding writes are held
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
	assert.equal( recogniseBehaviour( { ...PARALLAX, properties: [ { property: 'transform', formula: "'translate3d(0,' + y.toFixed(1) + 'px,0) rotate(' + (rot + sy * 0.035 * depth).toFixed(1) + 'deg)'" } ] } ), null, 'a transform that also rotates is not a plain travel' );
	const y = recogniseBehaviour( { ...PARALLAX, properties: [ { property: 'transform', formula: "'translateY(' + window.scrollY * 0.3 + 'px)'" } ] } );
	assert.equal( y.effects[ 0 ].values.speedRatio, 0.3 );
	const named = recogniseBehaviour( { ...PARALLAX, properties: [ { property: 'transform', formula: "'translateY(' + $off * -0.25 + 'px)'" } ] } );
	assert.equal( named.effects[ 0 ].values.speedRatio, -0.25, 'a name with a $ is read whole' );
} );

// ---- the pinned timeline's orientation has one owner: the skeleton's list arrangement (item 10) ----
test( 'MUST FAIL (C5 recognition 10): the pinned horizontal timeline writes its scroll effect and leaves the orientation to the skeleton rule', () => {
	const PIN = 'window scroll (rAF-throttled) -> move(). p = clamp((stickyTop - stage.top) / (stage.offsetHeight - sticky.offsetHeight), 0, 1)';
	const track = J( 'S-5', { trigger: { type: 'scroll-position', detail: PIN }, element: { dc: 'Site', template_tpl_id: '10', selector: '[data-x]' }, properties: [ { property: 'transform', formula: "'translate3d(' + (-p * dist).toFixed(1) + 'px,0,0)'" } ] } );
	const template = { elements: { 'Site/9': { style: { static: [ [ 'position', 'sticky' ] ] }, parentChain: [] }, 'Site/10': { style: { static: [] }, realParent: 'Site/9', parentChain: [ 'Site/9' ] } } };
	const b = recogniseBehaviour( track, { template } );
	assert.deepEqual( b.blocks[ 'sgs/timeline' ], [ { attr: 'scrollEffect', value: 'pinned-horizontal' } ], 'data/skeleton-decisions.json listArrangement writes orientation when the units sit in one row' );
} );

// ---- a script reveal is one scroll entrance (item 3) ----
const TWEEN = { duration_ms: 460, easing: 'easeOutCubic', stagger: { ms: 70, cap_ms: 490, base_ms: 0, basis: 'item index (i), capped at 7' } };
const opacity = ( id, trigger, over = {} ) => J( id, { source: { file: 'App.dc.html', function: 'show', code: 'el.style.opacity = String(e)' }, trigger: { type: trigger, detail: `${ trigger } via reveals via show` }, properties: [ { property: 'opacity', from: null, to: null, formula: 'String(e)' } ], ...TWEEN, ...over } );
const rise = ( id, trigger, over = {} ) => J( id, { source: { file: 'App.dc.html', function: 'show', code: "el.style.transform = 'translateY(' + (26 * (1 - e)).toFixed(2) + 'px)'" }, trigger: { type: trigger, detail: `${ trigger } via reveals via show` }, properties: [ { property: 'transform', from: null, to: null, formula: "'translateY(' + (26 * (1 - e)).toFixed(2) + 'px)'" } ], ...TWEEN, ...over } );
const FOUR = [ 'scroll-into-view', 'mount', 'press', 'state' ];
const REVEAL_RECORDS = [ ...FOUR.map( ( t, i ) => opacity( `J-0${ i + 1 }`, t ) ), ...FOUR.map( ( t, i ) => rise( `J-0${ i + 5 }`, t ) ) ];

test( 'MUST FAIL (C5 recognition 3): the opacity and the rise one tween writes are one scroll entrance with the tween\'s timing, from every caller', () => {
	const out = normaliseReveals( REVEAL_RECORDS );
	assert.equal( out.length, 1, 'eight writes, two per caller, are one entrance' );
	const [ scroll ] = out;
	assert.equal( scroll.id, 'J-01' );
	assert.equal( scroll.trigger.type, 'scroll-into-view', 'the scroll-started record leads' );
	assert.equal( scroll.mechanism, 'waapi' );
	assert.deepEqual( scroll.mergedFrom, [ 'J-01', 'J-02', 'J-03', 'J-04', 'J-05', 'J-06', 'J-07', 'J-08' ] );
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

test( 'negative control (C5 recognition 3): tweens of different functions or durations are not merged with each other; the callers of one are', () => {
	const mixed = [ opacity( 'A', 'state' ), rise( 'B', 'state', { duration_ms: 300 } ), rise( 'C', 'mount' ), rise( 'D', 'state', { source: { file: 'App.dc.html', function: 'hide', code: '' } } ) ];
	const out = normaliseReveals( mixed );
	assert.deepEqual( out.map( ( r ) => r.id ), [ 'A', 'B', 'D' ] );
	assert.deepEqual( out[ 0 ].mergedFrom, [ 'A', 'C' ], 'the mount rise joins the state opacity' );
	const lead = normaliseReveals( [ rise( 'M', 'mount', { properties: [ { property: 'transform', formula: "'translateY(' + (30 * (1 - e)).toFixed(2) + 'px)'" } ] } ), opacity( 'S', 'scroll-into-view' ), rise( 'R', 'scroll-into-view' ) ] );
	assert.equal( lead[ 0 ].properties[ 1 ].from, 'translateY(26px)', 'the rise of the scroll caller leads' );
	const noScroll = normaliseReveals( [ opacity( 'E', 'mount' ), opacity( 'F', 'state' ) ] );
	assert.deepEqual( noScroll.map( ( r ) => [ r.id, r.trigger.type ] ), [ [ 'E', 'mount' ] ], 'with no scroll caller the first leads' );
	const lateScroll = normaliseReveals( [ opacity( 'G', 'mount' ), opacity( 'H', 'scroll-into-view' ) ] );
	assert.deepEqual( lateScroll.map( ( r ) => r.id ), [ 'H' ], 'the scroll caller leads wherever it sits' );
	assert.deepEqual( lateScroll[ 0 ].mergedFrom, [ 'G', 'H' ] );
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

test( 'negative control (C5 recognition 3): a fade-out on a press, or a hide on an element no reveal targets, is not held by a reveal', () => {
	const reveal = { ...normaliseReveals( REVEAL_RECORDS )[ 0 ], element: { dc: 'App', template_tpl_id: '5', selector: '[data-reveal]' } };
	const write = ( tpl, trigger ) => J( 'J-40', { element: { dc: 'App', template_tpl_id: tpl, selector: 'this.menu' }, source: { file: 'App.dc.html', function: 'closeMenu', code: '' }, trigger: { type: trigger, detail: '' }, properties: [ { property: 'opacity', from: null, to: '0' } ] } );
	assert.equal( hiddenStartOf( write( '40', 'press' ), [ reveal ] ), null, 'the menu close is its own behaviour' );
	assert.equal( hiddenStartOf( write( '5', 'press' ), [ reveal ] ), null, 'a press never sets up a reveal' );
	assert.equal( hiddenStartOf( write( '40', 'mount' ), [ reveal ] ), null, 'an element the reveal does not target' );
	assert.equal( hiddenStartOf( write( '5', 'mount' ), [ reveal ] ), reveal.id, 'the element the reveal targets, hidden at set-up' );
	assert.notEqual( recogniseBehaviour( write( '40', 'press' ), { records: [ reveal ] } )?.kind, 'covered' );
} );

test( 'negative control (C5 recognition 3): a reveal that names no elements holds only a set-up hide made in its own callers or found by its hook', () => {
	const reveal = normaliseReveals( REVEAL_RECORDS )[ 0 ];
	assert.equal( reveal.element.template_tpl_id, null, 'the tween reaches its element as a parameter' );
	const write = ( fn, selector ) => J( 'J-50', { element: { dc: 'App', template_tpl_id: '77', selector }, source: { file: 'App.dc.html', function: fn, code: '' }, trigger: { type: 'mount', detail: 'componentDidMount' }, properties: [ { property: 'opacity', from: null, to: '0' } ] } );
	assert.equal( hiddenStartOf( write( 'initTop', 'this.topBtn' ), [ reveal ] ), null, 'a back-to-top button hidden on mount is not part of the reveal' );
	assert.equal( hiddenStartOf( write( 'reveals', 'el' ), [ reveal ] ), reveal.id, 'a hide made in a function the reveal runs through' );
	const hooked = { ...reveal, callers: [], element: { ...reveal.element, selector: '[data-reveal]' } };
	assert.equal( hiddenStartOf( write( 'initTop', '[data-reveal]:not([data-rv])' ), [ hooked ] ), hooked.id, 'a hide that finds its element by the hook of the reveal' );
	assert.equal( hiddenStartOf( write( 'initTop', '[data-toast]' ), [ hooked ] ), null, 'another hook is another element' );
} );

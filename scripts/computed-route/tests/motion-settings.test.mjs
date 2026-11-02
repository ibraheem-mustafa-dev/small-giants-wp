// Spec 48 FR-48-80, delivery units U14 and U13a: the script-driven behaviours that become block settings or an exit layer
// (lib/motion-behaviours.mjs recognises them, lib/fill-behaviour.mjs::applySettings / ::applyStrip / ::applyBehaviours
// write them, lib/fill-motion.mjs::motionWrites calls them). Each case plants a record shaped like the animation
// inventory's (animations.json) and asserts the stored attribute values on the tree node, so a recogniser or writer
// mutation turns a case red. The settings are checked against the blocks' own block.json files.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { motionWrites, sameTriggerResolved } from '../lib/fill-motion.mjs';
import { recogniseBehaviour, withEnds } from '../lib/motion-behaviours.mjs';
import { motionFixtureDb } from './fixtures/motion-fixture-db.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const BLOCKS = path.join( HERE, '..', '..', '..', 'plugins', 'sgs-blocks', 'src', 'blocks' );
const declared = ( block, attr ) => !! JSON.parse( fs.readFileSync( path.join( BLOCKS, block.split( '/' )[ 1 ], 'block.json' ), 'utf8' ) ).attributes?.[ attr ];
const EFFECT_SETTINGS = JSON.parse( fs.readFileSync( path.join( HERE, '..', 'data', 'effect-settings.json' ), 'utf8' ) );

const schema = loadMotionSchema();
const OPENS = '{"opens":["root"]}';
const mdb = motionDb( openDb( motionFixtureDb( { 'sgs/site-header': [], 'sgs/site-header-row': [], 'sgs/business-info': [], 'sgs/nav-drawer-menu': [], 'sgs/accordion': [], 'sgs/testimonial-slider': [], 'sgs/timeline': [], 'sgs/nav-drawer': [ { target: 'root', motion_support: OPENS } ] } ) ) );
const VOCAB = [ { state: 'open', kind: 'attribute', token: '[open]' }, { state: 'open', kind: 'aria', token: '[aria-expanded="true"]' } ];
const EASE = 'cubic-bezier(.16,.84,.32,1)';

const rec = ( id, over ) => ( { id, name: id, mechanism: 'waapi', status: 'active', element: { dc: 'Site', template_tpl_id: '10', selector: '', description: '' }, trigger: { type: 'state', detail: '', state_keys: [] }, properties: [], duration_ms: 600, delay_ms: 0, easing: 'ease', iterations: 1, direction: 'normal', ...over } );
const run = ( blocks, records, over = {} ) => {
	const nodes = blocks.map( ( [ name, tpl ], index ) => ( { index, name, targets: [ { id: `${ index }:`, slot: '', finder: { tpl: `Site/${ tpl }#0` } } ] } ) );
	const flat = nodes.map( ( n ) => ( { name: n.name, attributes: {}, ref: `r${ n.index }` } ) );
	const out = motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records, mdb, schema, rawSnapshot: { settings: { custom: {}, color: { palette: [ { slug: 'accent', color: '#D8CA50' } ] } } }, stateVocab: VOCAB, hasAttr: declared, ...over } );
	return { flat, out, attrs: ( i = 0 ) => flat[ i ].attributes, doc: ( i = 0 ) => out.writes.find( ( w ) => 'sgsMotion' === w.attr && w.node === `r${ i }` )?.after ?? null };
};
const reasons = ( out ) => out.unmapped.map( ( u ) => `${ u.value }: ${ u.reason }` );
const style = ( ...pairs ) => ( { style: { static: pairs, holes: [] } } );

const HEADER = rec( 'S-1', { mechanism: 'js-style-write', element: { dc: 'Site', template_tpl_id: '10', selector: 'ref setHeaderEl', description: 'Header bar' }, trigger: { type: 'scroll-position', detail: 'window scroll: scrollY > 8' }, source: { code: 'this._headerEl.style.boxShadow = window.scrollY > 8 ?' },
	properties: [ { property: 'box-shadow', from: 'none', to: '0 10px 30px -18px rgba(20,40,60,.35)' } ], duration_ms: 300 } );
const TEMPLATE = { elements: {
	'Site/5': { realParent: 'Site/1', srcLine: 5, ...style( [ 'display', 'flex' ] ), parentChain: [ 'Site/1' ] },
	'Site/6': { realParent: 'Site/5', srcLine: 6, ...style(), parentChain: [ 'Site/5', 'Site/1' ] },
	'Site/7': { realParent: 'Site/1', srcLine: 7, ...style( [ 'position', 'fixed' ] ), parentChain: [ 'Site/1' ] },
	'Site/10': { realParent: 'Site/1', srcLine: 10, ...style( [ 'position', 'sticky' ], [ 'top', '0' ] ), parentChain: [ 'Site/1' ] },
	'Site/12': { realParent: 'Site/1', srcLine: 12, ...style(), parentChain: [ 'Site/1' ] },
	'Site/3': { realParent: 'Site/2', srcLine: 3, ...style(), parentChain: [ 'Site/2' ] },
} };

test( 'MUST FAIL: a scroll-position box-shadow write is the header\'s scrolled shadow: threshold, shape and colour, with the colour kept as 8-digit hex', () => {
	const { attrs, out } = run( [ [ 'sgs/site-header', '10' ] ], [ HEADER ], { template: TEMPLATE } );
	assert.deepEqual( reasons( out ), [] );
	assert.deepEqual( attrs(), { scrolledOffset: 8, shadowScrolled: '0px 10px 30px -18px', shadowScrolledColour: '#14283C59', headerSticky: { desktop: 'on' } } );
} );

test( 'MUST FAIL: the header is pinned only when its own template element is sticky or fixed (or its description says so)', () => {
	const unpinned = { elements: { ...TEMPLATE.elements, 'Site/10': { ...TEMPLATE.elements[ 'Site/10' ], ...style( [ 'top', '0' ] ) } } };
	const { attrs } = run( [ [ 'sgs/site-header', '10' ] ], [ HEADER ], { template: unpinned } );
	assert.equal( attrs().headerSticky, undefined );
	assert.equal( attrs().scrolledOffset, 8 );
	assert.equal( run( [ [ 'sgs/site-header', '10' ] ], [ { ...HEADER, element: { ...HEADER.element, description: 'Sticky header' } } ], { template: unpinned } ).attrs().headerSticky.desktop, 'on' );
} );

test( 'MUST FAIL: a strip above the pinned header scrolls away: its row hides on scroll; a pinned, later or unrelated element does not', () => {
	const nodes = [ [ 'sgs/site-header', '10' ], [ 'sgs/site-header-row', '5' ], [ 'sgs/site-header-row', '6' ], [ 'sgs/site-header-row', '7' ], [ 'sgs/site-header-row', '12' ], [ 'sgs/container', '5' ], [ 'sgs/site-header-row', '3' ] ];
	const { attrs } = run( nodes, [ HEADER ], { template: TEMPLATE, hasAttr: () => true } );
	assert.deepEqual( attrs( 6 ), {}, 'an element earlier in the file but in another parent is no strip' );
	assert.deepEqual( attrs( 1 ), { rowHideOnScroll: { desktop: 'on' } }, 'the strip' );
	assert.deepEqual( attrs( 2 ), { rowHideOnScroll: { desktop: 'on' } }, 'a descendant of the strip' );
	assert.deepEqual( attrs( 3 ), {}, 'a fixed element stays' );
	assert.deepEqual( attrs( 4 ), {}, 'an element after the header' );
	assert.deepEqual( attrs( 5 ), {}, 'only a header row has the setting' );
	assert.deepEqual( attrs( 0 ).headerSticky, { desktop: 'on' } );
} );

test( 'MUST FAIL: a settings behaviour on a block that is not the one it maps to is reported, not written', () => {
	const { attrs, out } = run( [ [ 'sgs/container', '10' ] ], [ HEADER ], { template: TEMPLATE } );
	assert.deepEqual( attrs(), {} );
	assert.match( reasons( out ).join( '\n' ), /S-1: S-1 maps onto settings of sgs\/site-header; this element is sgs\/container/ );
	const none = run( [ [ 'sgs/site-header', '10' ] ], [ HEADER ], { template: TEMPLATE, hasAttr: () => false } );
	assert.match( reasons( none.out ).join( '\n' ), /sgs\/site-header declares no scrolledOffset, shadowScrolled, shadowScrolledColour, headerSticky setting/ );
} );

test( 'MUST FAIL: an endless ring growing from a status dot is the open-status dot pulse with the record\'s duration', () => {
	const DOT = rec( 'S-2', { trigger: { type: 'mount', detail: '' }, iterations: 'infinite', duration_ms: 1600, easing: 'linear', element: { dc: 'Site', template_tpl_id: '10', selector: 'ref setPulseEl', description: 'Status dot in the footer opening hours badge' },
		properties: [ { property: 'box-shadow', from: '0 0 0 0 currentColor', to: '0 0 0 8px transparent' } ] } );
	const { attrs, out } = run( [ [ 'sgs/business-info', '10' ] ], [ DOT ] );
	assert.deepEqual( reasons( out ), [] );
	assert.deepEqual( attrs(), { openStatusDotPulse: true, openStatusDotPulseDuration: 1600 } );
	const other = rec( 'S-2b', { ...DOT, element: { ...DOT.element, description: 'Glow behind the card' }, name: 'Glow' } );
	assert.equal( recogniseBehaviour( other ), null, 'a ring that is not on a dot is not the pulse' );
} );

test( 'MUST FAIL: a script that scrolls the container to the accordion row it opened is the scroll-to-opened settings, the gap taken from the code', () => {
	const SCROLL = rec( 'S-3', { mechanism: 'js-scroll', trigger: { type: 'state', detail: '560ms after state.acc opens', state_keys: [ 'acc' ] }, source: { function: 'animateAcc', code: 'sc.scrollTo({ top, behavior: this.rm ? \'auto\' : \'smooth\' })' }, delay_ms: 560, properties: [ { property: 'scrollTop', from: null, to: 'row.offsetTop - 6' } ] } );
	assert.deepEqual( run( [ [ 'sgs/nav-drawer-menu', '10' ] ], [ SCROLL ] ).attrs(), { accordionScrollIntoView: true } );
	assert.deepEqual( run( [ [ 'sgs/accordion', '10' ] ], [ SCROLL ] ).attrs(), { scrollToOpened: true, scrollToOpenedGap: '6px' } );
} );

test( 'MUST FAIL: a state-driven card entrance with an interval is the testimonial slider\'s autoplay: one card, the interval in ms, the change duration; the slide-change differences are accepted', () => {
	const CARD = rec( 'S-4', { trigger: { type: 'state', detail: 'state.tIdx changes: prev/next, dots, or the 6.5s setInterval in componentDidMount', state_keys: [ 'tIdx' ] }, duration_ms: 520, easing: EASE, element: { dc: 'Site', template_tpl_id: '10', selector: 'ref setTCard', description: 'Gold testimonial card' },
		properties: [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'translateX(26px)', to: 'none' } ] } );
	const { attrs, out } = run( [ [ 'sgs/testimonial-slider', '10' ] ], [ CARD ] );
	assert.deepEqual( attrs(), { autoplay: true, autoplaySpeed: 6500, slidesVisible: 1, transitionDuration: '520' } );
	assert.equal( attrs().pauseButton, undefined, 'the draft has no pause button, so the setting stays off' );
	assert.match( out.notes.map( ( n ) => n.text ).join( '\n' ), /accepted difference: the slide change/ );
	const plain = { ...CARD, trigger: { ...CARD.trigger, detail: 'state.tIdx changes' } };
	assert.equal( recogniseBehaviour( plain ), null, 'a card entrance with no interval is not the autoplay' );
} );

const PIN = 'window scroll (rAF-throttled) -> updatePins(). p = clamp((stickyTop - pin.top) / (pin.offsetHeight - sticky.offsetHeight), 0, 1)';
const pinned = ( id, over ) => rec( id, { mechanism: 'js-style-write', trigger: { type: 'scroll-position', detail: PIN }, element: { dc: 'Site', template_tpl_id: '10', selector: '[data-pin] -> [data-pin-x]' }, breakpoints: [ 'desktop' ], ...over } );
const TRACK = pinned( 'S-5', { trigger: { type: 'scroll-position', detail: `${ PIN }. Tablet and mobile get a native horizontal scroller with no JS.` }, properties: [ { property: 'transform', from: 'translate3d(0px,0,0)', to: 'translate3d(-dist px,0,0)', formula: 'dist = max(0, track.scrollWidth - innerWidth); translate3d(−p × dist px, 0, 0)' } ] } );
const FOCUS = pinned( 'S-6', { properties: [ { property: 'opacity', from: 0.55, to: 1, formula: 'k = min(1, |cardCentre - innerWidth/2| / (innerWidth × 0.7)); opacity = 1 - 0.45k' }, { property: 'scale', from: 0.94, to: 1, formula: 'scale = 1 - 0.06k' } ] } );
const YEAR = pinned( 'S-7', { properties: [ { property: 'color', from: 'transparent', to: '#D8CA50' }, { property: '-webkit-text-stroke-color', from: '#0A7EA8', to: '#D8CA50' } ] } );
const COUNT = pinned( 'S-8', { mechanism: 'js-text-write', source: { code: 'cnt.textContent = String(best + 1).padStart(2, \'0\')' }, properties: [ { property: 'textContent', from: '01 / NN', to: 'NN / NN', formula: 'index of card nearest centre, zero-padded / total' } ] } );

test( 'MUST FAIL: the pinned timeline\'s track, proximity focus, active year and counter are the sgs/timeline settings; the switch point is an accepted difference', () => {
	const { attrs, out } = run( [ [ 'sgs/timeline', '10' ] ], [ TRACK, FOCUS, YEAR, COUNT ] );
	assert.deepEqual( reasons( out ), [] );
	assert.deepEqual( attrs(), {
		scrollEffect: 'pinned-horizontal', mobileLayout: 'carousel',
		panelProximityFocus: true, panelEdgeOpacity: 0.55, panelFocusOpacity: 1, panelEdgeScale: 0.94, panelFocusScale: 1,
		dateActiveColour: 'accent', dateActiveTextStrokeColour: 'accent',
		panelCounter: true, panelCounterFormat: 'padded-index-of-total',
	} );
	assert.match( out.notes.map( ( n ) => n.text ).join( '\n' ), /S-5: accepted difference: the draft switches to its touch-only strip at 1024px/ );
} );

test( 'MUST FAIL: the pinned timeline\'s progress bar stays a scroll-progress effect fed by the pin, and a pinned-style record outside a pin is not the timeline', () => {
	const BAR = pinned( 'S-9', { properties: [ { property: 'transform', from: 'scaleX(0)', to: 'scaleX(1)', formula: 'scaleX(p)' } ] } );
	const { doc } = run( [ [ 'sgs/site-header', '10' ] ], [ BAR ] );
	assert.deepEqual( doc().elements.root.effects[ 0 ].values, { source: 'pin', output: 'bar-x' } );
	assert.equal( recogniseBehaviour( { ...BAR, trigger: { type: 'scroll-position', detail: 'window scroll' }, element: { dc: 'Site', selector: 'ref setBar' } } ), null, 'a scaleX(p) write with no pin is not a scroll progress' );
	assert.equal( recogniseBehaviour( { ...YEAR, trigger: { type: 'scroll-position', detail: 'window scroll' }, element: { dc: 'Site', selector: 'h2' } } ), null );
} );

test( 'MUST FAIL: a close animation held at its end is the exit of the same element\'s open entrance (distance, duration, curve), and is reported when the element has no open entrance', () => {
	const OPEN = rec( 'S-10', { trigger: { type: 'state', detail: 'mobileOpen false -> true', state_keys: [ 'mobileOpen' ] }, duration_ms: 560, easing: EASE, properties: [ { property: 'transform', from: 'translateX(100%)', to: 'none' } ] } );
	const CLOSE = rec( 'S-11', { trigger: { type: 'press', detail: 'Every drawer close calls closeMobile', state_keys: [ 'mobileOpen' ] }, source: { function: 'closeMobile' }, fill: 'forwards', duration_ms: 340, easing: 'cubic-bezier(.7,0,.84,0)', properties: [ { property: 'transform', from: 'none', to: 'translateX(100%)' } ] } );
	const { doc, out } = run( [ [ 'sgs/nav-drawer', '10' ] ], [ OPEN, CLOSE ] );
	assert.deepEqual( reasons( out ), [] );
	assert.deepEqual( doc().elements.root.entrance.base.close, { to: { translateX: '100%' }, closeDuration: 340, closeEasing: 'cubic-bezier(.7,0,.84,0)' } );
	assert.equal( recogniseBehaviour( { ...CLOSE, fill: 'none' } ), null, 'a close-named animation that does not hold its end is not the exit' );
	assert.equal( recogniseBehaviour( { ...CLOSE, source: { function: 'openMobile' }, trigger: { type: 'press', detail: 'burger' }, name: 'Slide' } ), null, 'an animation that is not a close is not the exit' );
	const alone = run( [ [ 'sgs/nav-drawer', '10' ] ], [ CLOSE ] );
	assert.match( reasons( alone.out ).join( '\n' ), /S-11: the exit of an open entrance, but this element has no open entrance to close/ );
} );

test( 'MUST FAIL: a record that only says "Same as A-12" takes that record\'s trigger, so a panel entrance opens with the panel', () => {
	const ref = rec( 'S-12', { element: { dc: 'Site', template_tpl_id: '99', selector: '' }, trigger: { type: 'state', detail: 'state.active changes to a non-null index on desktop', state_keys: [ 'active' ] } } );
	const same = rec( 'S-13', { trigger: { type: 'state', detail: 'Same as S-12', state_keys: [ 'active' ] }, properties: [ { property: 'opacity', from: 0, to: 1 } ], duration_ms: 340 } );
	assert.match( sameTriggerResolved( [ ref, same ] )[ 1 ].trigger.detail, /non-null index/ );
	const panelDb = motionDb( openDb( motionFixtureDb( { 'sgs/mega-panel': [ { target: 'root', motion_support: OPENS } ] } ) ) );
	const { doc } = run( [ [ 'sgs/mega-panel', '10' ] ], [ ref, same ], { mdb: panelDb } );
	assert.equal( doc().elements.root.entrance.base.trigger, 'open' );
} );

test( 'MUST FAIL: the route fade is the site\'s page transition with the record\'s duration and easing as the custom values; the scroll reset and the back-to-top and scroll-lock writes are native', () => {
	const FADE = rec( 'S-14', { trigger: { type: 'route', detail: 'page changes' }, element: { dc: 'Site', template_tpl_id: null, selector: 'ref setMainEl (main)', description: 'Whole main element' }, duration_ms: 380, easing: 'ease-out', properties: [ { property: 'opacity', from: 0, to: 1 } ] } );
	const site = recogniseBehaviour( FADE );
	assert.equal( 'site', site.kind );
	assert.deepEqual( site.value.settings, { page_transitions: true, page_transition_style: 'fade', page_transition_duration: 380, page_transition_easing: 'ease-out' } );
	const { out } = run( [ [ 'sgs/container', '10' ] ], [ FADE ] );
	assert.equal( out.site[ 0 ].settings.page_transition_duration, 380 );
	const TOP = rec( 'S-15', { mechanism: 'js-scroll', trigger: { type: 'press', detail: 'click' }, element: { dc: 'Site', template_tpl_id: null, selector: 'onClick toTop' }, properties: [ { property: 'scrollY', from: 'any', to: 0 } ] } );
	const LOCK = rec( 'S-16', { mechanism: 'js-style-write', trigger: { type: 'state', detail: 'mobileOpen toggles' }, element: { dc: 'Site', template_tpl_id: null, selector: 'document.body' }, properties: [ { property: 'overflow', from: '', to: 'hidden' } ] } );
	assert.equal( recogniseBehaviour( TOP ).kind, 'native' );
	assert.equal( recogniseBehaviour( LOCK ).kind, 'native' );
} );

test( 'MUST FAIL: every setting this lane writes is listed in data/clone effect-settings.json, and every listed setting is a block.json attribute', () => {
	const listed = new Set( EFFECT_SETTINGS.map( ( e ) => `${ e.block }.${ e.attr }` ) );
	const all = run( [ [ 'sgs/site-header', '10' ], [ 'sgs/site-header-row', '5' ], [ 'sgs/business-info', '10' ], [ 'sgs/nav-drawer-menu', '10' ], [ 'sgs/accordion', '10' ], [ 'sgs/testimonial-slider', '10' ], [ 'sgs/timeline', '10' ] ], [], {} );
	assert.deepEqual( all.out.writes, [] );
	for ( const [ block, records ] of [ [ 'sgs/site-header', [ HEADER ] ], [ 'sgs/timeline', [ TRACK, FOCUS, YEAR, COUNT ] ] ] ) {
		const { out } = run( [ [ block, '10' ] ], records, { template: TEMPLATE } );
		for ( const w of out.writes ) {
			assert.ok( listed.has( `${ w.block }.${ w.attr }` ), `${ w.block }.${ w.attr } is in effect-settings.json` );
		}
	}
	for ( const e of EFFECT_SETTINGS ) {
		assert.ok( declared( e.block, e.attr ), `${ e.block } declares ${ e.attr }` );
	}
} );

test( 'MUST FAIL: a record that states its values only in its formula (intake\'s re-derived shape, `cond ? a : b`) is read as from and to, so the scrolled header is written', () => {
	const r = { id: 'X-1', mechanism: 'js-style-write', status: 'active', trigger: { type: 'scroll-position', detail: 'scroll listener on window' }, source: { code: "el.style.boxShadow = window.scrollY > 8 ? '0 10px 30px -18px rgba(20,40,60,.35)' : 'none'" }, properties: [ { property: 'box-shadow', from: null, to: null, formula: "window.scrollY > 8 ? '0 10px 30px -18px rgba(20,40,60,.35)' : 'none'" } ] };
	const out = recogniseBehaviour( r, {} );
	assert.equal( out?.kind, 'settings' );
	assert.deepEqual( out.blocks[ 'sgs/site-header' ].map( ( x ) => [ x.attr, x.value ] ).slice( 0, 2 ), [ [ 'scrolledOffset', 8 ], [ 'shadowScrolled', '0px 10px 30px -18px' ] ] );
	assert.deepEqual( withEnds( { properties: [ { property: 'x', to: 'a', from: 'b', formula: "c ? 'y' : 'z'" } ] } ).properties[ 0 ], { property: 'x', to: 'a', from: 'b', formula: "c ? 'y' : 'z'" }, 'stated ends are kept' );
} );

// Proves FR-47-1 / R-47-3: one engine maps a measured property on a calibrated slot to a write in the block's
// storage shape, or returns a gap. Covers §3.1's done line: heading line-height as a tier object with its unit,
// container padding as a box inside a tier object, a flat_sibling background image, and an unknown property.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve, resolveDiscovered, resolveViaAncestor, blockContext, splitProperty, tiersOf, timeToMs } from '../lib/resolve.mjs';
import { parseColour } from '../lib/normalise.mjs';

const db = openDb();
const snapshot = { palette: [ { slug: 'text-label', colour: parseColour( '#8A8278' ) } ], spacing: [], fontSizes: [] };
const cal = ( settings ) => ( { settings } );

test( 'heading line-height: a tier object in the unit companion (em), from measured px', () => {
	const r = resolve( { block: 'sgs/heading', slot: '', prop: 'line-height', perWidth: { 375: '21px', 768: '21px', 1440: '27px', 1920: '27px' }, fontPx: { 375: 14, 768: 14, 1440: 18 } },
		{ db, snapshot, calibration: cal( { lineHeight: { slot: '', property: 'line-height' } } ) } );
	assert.deepEqual( r.writes, [ { attr: 'lineHeight', value: { mobile: 1.5, tablet: 1.5, desktop: 1.5 }, merge: 'deep' } ] );
} );

test( 'container padding-top: one side of a box inside a tier object', () => {
	const r = resolve( { block: 'sgs/container', slot: '.sgs-container__inner', prop: 'padding-top', perWidth: { 375: '56px', 1440: '104px' } },
		{ db, snapshot, calibration: cal( { padding: { slot: '.sgs-container__inner', property: 'padding' } } ) } );
	assert.deepEqual( r.writes, [ { attr: 'padding', value: { mobile: { top: '56px' }, desktop: { top: '104px' } }, merge: 'deep' } ] );
} );

test( 'container background image: one flat_sibling attribute per tier', () => {
	const r = resolve( { block: 'sgs/container', slot: '', prop: 'background-image', perWidth: { 1440: 'url("https://x.test/a.jpg")', 375: 'url("https://x.test/b.jpg")' } },
		{ db, snapshot, calibration: cal( { backgroundImage: { slot: '', property: 'background-image' }, backgroundImageTablet: { slot: '', property: 'background-image' }, backgroundImageMobile: { slot: '', property: 'background-image' } } ) } );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.value.url ] ).sort(), [ [ 'backgroundImage', 'https://x.test/a.jpg' ], [ 'backgroundImageMobile', 'https://x.test/b.jpg' ] ] );
} );

test( 'a colour snaps to the palette slug', () => {
	const r = resolve( { block: 'sgs/heading', slot: '', prop: 'color', perWidth: { 1440: 'rgb(138, 130, 120)', 375: 'rgb(138, 130, 120)' } },
		{ db, snapshot, calibration: cal( { textColour: { slot: '', property: 'color' } } ) } );
	assert.deepEqual( r.writes, [ { attr: 'textColour', value: 'text-label', merge: 'replace' } ] );
} );

test( 'gaps: uncalibrated, wrong slot, shape (desktop differs at 1920), one-value setting differing by width', () => {
	const base = { block: 'sgs/heading', slot: '', prop: 'line-height', perWidth: { 1440: '27px' }, fontPx: { 1440: 18 } };
	assert.equal( resolve( base, { db, snapshot, calibration: null } ).gap, 'uncalibrated' );
	assert.equal( resolve( { ...base, slot: '.sgs-heading__inner' }, { db, snapshot, calibration: cal( { lineHeight: { slot: '' } } ) } ).gap, 'no-setting' );
	assert.equal( resolve( { ...base, perWidth: { 1440: '27px', 1920: '30px' } }, { db, snapshot, calibration: cal( { lineHeight: { slot: '' } } ) } ).gap, 'shape' );
	assert.equal( resolve( { block: 'sgs/heading', slot: '', prop: 'text-transform', perWidth: { 1440: 'uppercase', 375: 'none' } }, { db, snapshot, calibration: cal( { textTransform: { slot: '' } } ) } ).gap, 'shape' );
} );

test( 'a state setting with no calibration entry is uncalibrated, not a missing setting', () => {
	const row = db.prepare( "SELECT block_slug, css_property FROM block_attributes WHERE source='sgs' AND css_state='scrolled' AND css_property NOT LIKE '%,%' LIMIT 1" ).get();
	const r = resolve( { block: row.block_slug, slot: '', prop: row.css_property, state: 'scrolled', perWidth: { 1440: '1px' } }, { db, snapshot, calibration: cal( {} ) } );
	assert.equal( r.gap, 'uncalibrated' );
} );

test( 'MUST FAIL TO WRITE: an unknown property returns no-setting and no write', () => {
	const r = resolve( { block: 'sgs/heading', slot: '', prop: 'mask-composite', perWidth: { 1440: 'add' } }, { db, snapshot, calibration: cal( {} ) } );
	assert.equal( r.gap, 'no-setting' );
	assert.equal( r.writes, undefined );
} );

test( 'longhands map to the database shorthand and a side', () => {
	assert.deepEqual( splitProperty( 'margin-left' ), { short: 'margin', side: 'left' } );
	assert.deepEqual( splitProperty( 'border-top-color' ), { short: 'border-color', side: 'top' } );
	assert.deepEqual( tiersOf( { 375: '1px', 1440: '2px' }, 'x' ).tiers, { mobile: '1px', desktop: '2px' } );
} );

// A layout mode with no css_property, as calibration discovers it: flex and stack both give display flex on the inner
// element; only stack gives a column. The draft's other properties of that element decide.
const discovered = { discovered: { layout: {
	display: { slots: [ '.sgs-container__inner' ], values: { flex: { 375: 'flex', 768: 'flex', 1440: 'flex' }, stack: { 375: 'flex', 768: 'flex', 1440: 'flex' }, grid: { 375: 'grid', 768: 'grid', 1440: 'grid' } } },
	'flex-direction': { slots: [ '.sgs-container__inner' ], values: { stack: { 375: 'column', 768: 'column', 1440: 'column' } } },
} } };

test( 'a discovered layout setting: the value whose effects match the draft, ties broken by sibling properties', () => {
	const r = resolveDiscovered( { slot: '.sgs-container__inner', prop: 'display', perWidth: { 375: 'flex', 1440: 'flex', 1920: 'flex' }, siblings: { 'flex-direction': { 375: 'column', 1440: 'column' } } }, discovered );
	assert.deepEqual( r.writes, [ { attr: 'layout', value: 'stack', merge: 'replace' } ] );
	assert.equal( resolveDiscovered( { slot: '.sgs-container__inner', prop: 'display', perWidth: { 1440: 'block' } }, discovered ), null );
} );

test( 'MUST FAIL TO WRITE: two values with the same effect and no deciding sibling stay ambiguous', () => {
	const r = resolveDiscovered( { slot: '.sgs-container__inner', prop: 'display', perWidth: { 1440: 'flex' } }, discovered );
	assert.equal( r.gap, 'ambiguous' );
	assert.equal( r.writes, undefined );
} );

// A box with some sides set prints 0 for the rest (helpers-box.php::sgs_box_object_shorthand): the first side written
// into an empty box brings the others at their calibrated default paint, so only the measured side changes.
const padCal = { settings: { padding: { slot: '.sgs-container__inner', property: 'padding' } }, elements: { '.sgs-container__inner': {
	375: { 'padding-top': '12px', 'padding-right': '24px', 'padding-bottom': '12px', 'padding-left': '24px' },
	1440: { 'padding-top': '16px', 'padding-right': '24px', 'padding-bottom': '16px', 'padding-left': '24px' } } } };

test( 'MUST FAIL TO ZERO: one side into an empty box keeps the other sides at their default paint', () => {
	const r = resolve( { block: 'sgs/container', slot: '.sgs-container__inner', prop: 'padding-top', perWidth: { 375: '0px', 1440: '0px' } }, { db, snapshot, calibration: padCal } );
	assert.deepEqual( r.writes[ 0 ].value, { mobile: { top: '0px', right: '24px', bottom: '12px', left: '24px' }, desktop: { top: '0px', right: '24px', bottom: '16px', left: '24px' } } );
} );

test( 'a box that already holds sides is merged, never re-seeded', () => {
	const r = resolve( { block: 'sgs/container', slot: '.sgs-container__inner', prop: 'padding-top', perWidth: { 1440: '0px' }, current: { padding: { desktop: { bottom: '8px' } } } }, { db, snapshot, calibration: padCal } );
	assert.deepEqual( r.writes[ 0 ].value, { desktop: { top: '0px' } } );
} );

// An empty phone tier shows the node's desktop sides, so it is seeded from them, never from the default paint
// (Lenses "Choose a frame", 2026-10-03: desktop held 26px sides, the phone tier was seeded 28px from the default and
// the button widened).
test( 'MUST FAIL TO OVERRIDE: an empty phone tier is seeded from the node\'s own desktop sides', () => {
	const r = resolve( { block: 'sgs/container', slot: '.sgs-container__inner', prop: 'padding-top', perWidth: { 375: '0px', 1440: '0px' }, current: { padding: { desktop: { left: '26px', right: '26px' } } } }, { db, snapshot, calibration: padCal } );
	assert.deepEqual( r.writes[ 0 ].value, { mobile: { top: '0px', right: '26px', bottom: '0px', left: '26px' }, desktop: { top: '0px' } } );
} );

// A border-radius box stores corners per device (helpers-box.php::sgs_border_radius_tiers reads only topLeft,
// topRight, bottomLeft, bottomRight); side keys would be ignored on render.
import { radiusCorners } from '../lib/resolve.mjs';

test( 'quote border-radius: corners inside a tier object, from the computed shorthand', () => {
	const r = resolve( { block: 'sgs/quote', slot: '', prop: 'border-radius', perWidth: { 375: '4px', 1440: '8px 4px' } },
		{ db, snapshot, calibration: cal( { borderRadius: { slot: '', property: 'border-radius' } } ) } );
	assert.deepEqual( r.writes, [ { attr: 'borderRadius', merge: 'deep', value: {
		mobile: { topLeft: '4px', topRight: '4px', bottomRight: '4px', bottomLeft: '4px' },
		desktop: { topLeft: '8px', topRight: '4px', bottomRight: '8px', bottomLeft: '4px' },
	} } ] );
	assert.deepEqual( radiusCorners( '1px 2px 3px' ), { topLeft: '1px', topRight: '2px', bottomRight: '3px', bottomLeft: '2px' } );
	assert.equal( radiusCorners( '8px / 4px' ), null );
} );

test( 'MUST FAIL TO WRITE: a border-radius write never carries side keys', () => {
	const r = resolve( { block: 'sgs/quote', slot: '', prop: 'border-radius', perWidth: { 1440: '8px' } },
		{ db, snapshot, calibration: cal( { borderRadius: { slot: '', property: 'border-radius' } } ) } );
	for ( const tier of Object.values( r.writes[ 0 ].value ) ) {
		assert.ok( ! [ 'top', 'right', 'bottom', 'left' ].some( ( k ) => k in tier ) );
	}
} );

test( 'MUST FAIL (CR16): measured px grid tracks write as fr proportions; 1440 and 1920 agree when their proportions do', () => {
	const r = resolve( { block: 'sgs/container', slot: '.sgs-container__inner', prop: 'grid-template-columns', perWidth: { 1440: '496.562px 451.438px', 1920: '628.562px 571.438px' } },
		{ db, snapshot, calibration: cal( { gridTemplateColumns: { slot: '.sgs-container__inner', property: 'grid-template-columns' } } ) } );
	assert.deepEqual( r.writes, [ { attr: 'gridTemplateColumns', value: { desktop: 'minmax(0, 1.1fr) minmax(0, 1fr)' }, merge: 'deep' } ] );
	const kw = resolve( { block: 'sgs/container', slot: '.sgs-container__inner', prop: 'grid-template-columns', perWidth: { 1440: 'none' } },
		{ db, snapshot, calibration: cal( { gridTemplateColumns: { slot: '.sgs-container__inner', property: 'grid-template-columns' } } ) } );
	assert.equal( kw.gap, 'shape' );
	const equal = resolve( { block: 'sgs/container', slot: '.sgs-container__inner', prop: 'grid-template-columns', perWidth: { 768: '205.328px 205.328px 205.328px' } },
		{ db, snapshot, calibration: cal( { gridTemplateColumns: { slot: '.sgs-container__inner', property: 'grid-template-columns' } } ) } );
	assert.deepEqual( equal.writes[ 0 ].value, { tablet: 'repeat(3, minmax(0, 1fr))' } );
} );

test( 'MUST FAIL: an inherited setting writes a descendant row its value reaches; a setting painting the slot itself wins', () => {
	const row = { block: 'sgs/business-info', slot: '.sgs-business-info__link > .sgs-business-info__label', prop: 'color', state: 'hover', perWidth: { 768: 'rgb(111, 97, 82)', 1440: 'rgb(111, 97, 82)' } };
	const reach = { textColourHover: { slot: '', slots: [ '' ], reaches: [ '', row.slot ], property: 'color', state: 'hover' } };
	assert.deepEqual( resolve( row, { db, snapshot, calibration: cal( reach ) } ).writes.map( ( w ) => w.attr ), [ 'textColourHover' ] );
	const both = { ...reach, labelColourHover: { slot: row.slot, slots: [ row.slot ], property: 'color', state: 'hover' } };
	assert.deepEqual( resolve( row, { db, snapshot, calibration: cal( both ) } ).writes.map( ( w ) => w.attr ), [ 'labelColourHover' ] );
	assert.equal( resolve( { ...row, slot: '.sgs-business-hours__day' }, { db, snapshot, calibration: cal( reach ) } ).gap, 'no-setting' );
} );

test( 'MUST FAIL: a per-device discovered setting writes the value fitting each tier, smaller tiers only where they differ', () => {
	const calibration = { discovered: { sgsChildSizing: { 'flex-grow': { slots: [ '' ], tier: 'tier_object', values: { fill: { 375: '1', 768: '1', 1440: '1' }, fixed: { 375: '0', 768: '0', 1440: '0' } } } } } };
	const all = resolveDiscovered( { slot: '', prop: 'flex-grow', perWidth: { 375: '1', 768: '1', 1440: '1', 1920: '1' } }, calibration );
	assert.deepEqual( all.writes, [ { attr: 'sgsChildSizing', value: { desktop: 'fill' }, merge: 'deep' } ] );
	const wideOnly = resolveDiscovered( { slot: '', prop: 'flex-grow', perWidth: { 375: '2', 768: '1', 1440: '1' } }, calibration );
	assert.deepEqual( wideOnly.writes[ 0 ].value, { desktop: 'fill', mobile: '' } );
	assert.equal( resolveDiscovered( { slot: '.x', prop: 'flex-grow', perWidth: { 1440: '1' } }, calibration ), null );
} );

// A visibility toggle (an extension yes/no setting painting display) never takes a measured keyword: a keyword is held
// only by a text setting (formatValue).
test( 'a yes/no setting is never written from a measured display value', () => {
	const r = resolve( { block: 'sgs/container', slot: '', prop: 'display', perWidth: { 1440: 'flex', 1920: 'flex' } },
		{ db, snapshot, calibration: cal( { sgsHideOnDesktop: { slot: '', property: 'display' } } ) } );
	assert.equal( r.gap, 'shape' );
	assert.equal( r.writes, undefined );
} );

// L1.2's keyword guard. sgs/card-grid::sgsAnimationDuration carries css_property 'anim:duration' and is reachable now
// that the namespace is understood, but block.json declares it `{ type: 'string', default: 'medium' }` with no enum
// while includes/animation-timing-clamp.php clamps it to instant / fast / medium / slow / extra-slow. Writing the
// measured "0.3s" would be coerced back to the default on render, silently.
test( 'MUST FAIL TO WRITE: a measured duration is never written into a keyword setting', () => {
	const calibration = cal( { sgsAnimationDuration: { slot: '', slots: [ '' ], property: 'animation-duration' } } );
	const r = resolve( { block: 'sgs/card-grid', slot: '', prop: 'animation-duration', perWidth: { 375: '0.3s', 768: '0.3s', 1440: '0.3s' } }, { db, snapshot, calibration } );
	assert.equal( r.gap, 'shape' );
	assert.equal( r.writes, undefined );
	assert.match( r.detail, /animation-timing-clamp\.php/ );
} );

// L1.3: slots compare under the same loose rule as every other path comparison, so a setting discovered on the
// fixture's second repetition is found on a client's first; and a state-qualified row consults discovery, matching the
// state discovery recorded. No cache file records a state on a discovered entry today (94 files, 0 entries with a
// state), so the state half opens the path without moving a row: a resting measurement must never answer an open row.
const indexedDiscovery = { discovered: { sgsChildSizing: { 'flex-grow': {
	slots: [ '.sgs-mega-panel__content > .sgs-mega-group:nth-of-type(2)' ],
	values: { fill: { 375: '1', 768: '1', 1440: '1' } },
} } } };

test( 'MUST FAIL: a discovered slot matches a client path under anyIndex, and a state-qualified row reaches discovery', () => {
	const at = ( over ) => resolveDiscovered( { slot: '.sgs-mega-panel__content > .sgs-mega-group:nth-of-type(1)', prop: 'flex-grow', perWidth: { 1440: '1' }, ...over }, indexedDiscovery );
	assert.equal( at( {} ), null, 'without anyIndex the indices must still differ' );
	assert.deepEqual( at( { anyIndex: true } ).writes, [ { attr: 'sgsChildSizing', value: 'fill', merge: 'replace' } ] );
	// A hover row consults discovery, and an entry recording no state answers rest rows only.
	assert.equal( at( { anyIndex: true, state: 'hover' } ), null );
	const stated = { discovered: { sgsHoverDuration: { 'transition-duration': { slots: [ '' ], state: 'hover', values: { fast: { 1440: '0.15s' } } } } } };
	assert.deepEqual( resolveDiscovered( { slot: '', prop: 'transition-duration', perWidth: { 1440: '0.15s' }, state: 'hover' }, stated ).writes,
		[ { attr: 'sgsHoverDuration', value: 'fast', merge: 'replace' } ] );
	assert.equal( resolveDiscovered( { slot: '', prop: 'transition-duration', perWidth: { 1440: '0.15s' } }, stated ), null, 'a hover discovery never answers a rest row' );
} );

// ── FR-47-8 / R-47-12, the canvas-awareness hop (L1.4) ───────────────────────────────────────────────────────────────
// Every fixture below is a REAL draft node, named with the surface and ref it was measured on. No cache/ read: the
// calibration is inlined from what cache/<block>.json records for that setting.

// The mega-lenses mega-group padding row: sites/eye-care-ward-end/build/qa/solve/mega-lenses (2026-10-05), surface
// mega-lenses (canvas: true, states { "mega-lenses": null }), row cr-ref-mega-lenses-1, block sgs/mega-group, path "",
// padding-top 26px against 0px at 1440 and 1920. sgs/mega-group declares NO padding setting at all, and its nearest
// owner cr-ref-mega-lenses-0 is sgs/mega-panel at the path below. cache/mega-panel.json records panelPadding on the
// panel root alone, so nothing proves it paints the group: the hop cites it and refuses to write.
const MEGA_GROUP = { block: 'sgs/mega-group', slot: '', prop: 'padding-top', state: null, perWidth: { 1440: '26px', 1920: '26px' } };
const MEGA_PANEL = {
	ref: 'cr-ref-mega-lenses-0',
	block: 'sgs/mega-panel',
	path: '.sgs-mega-panel__content > .sgs-mega-group:nth-of-type(1)',
	tag: 'a',
	attributes: {},
	calibration: { settings: { panelPadding: { property: 'padding', slot: '', slots: [ '' ] }, brandsEyebrowPadding: { property: 'padding', slot: '.sgs-mega-panel__eyebrow', slots: [ '.sgs-mega-panel__eyebrow' ] } } },
};

test( 'MUST FAIL: the real mega-group padding row is canvas-settable, citing sgs/mega-panel::panelPadding, with no write', () => {
	const r = resolveViaAncestor( MEGA_GROUP, { db, snapshot, canvas: true, ancestors: [ MEGA_PANEL ], measuredSlots: [ MEGA_PANEL.path ] } );
	assert.equal( r.gap, 'canvas-settable' );
	assert.equal( r.writes, undefined );
	assert.equal( r.cite.block, 'sgs/mega-panel' );
	assert.equal( r.cite.setting, 'panelPadding' );
	assert.equal( r.cite.via, 'declared', 'the panel declares padding; nothing proves it paints the group' );
} );

test( 'the negative control: off a canvas the same row keeps its class and only gains the citation as evidence', () => {
	const r = resolveViaAncestor( MEGA_GROUP, { db, snapshot, canvas: false, ancestors: [ MEGA_PANEL ], measuredSlots: [ MEGA_PANEL.path ] } );
	assert.equal( r.gap, undefined );
	assert.equal( r.writes, undefined );
	assert.equal( r.cite.setting, 'panelPadding' );
} );

// The real accordion-item header-padding node: sites/eye-care-ward-end/build/qa/solve/help (2026-10-05), surface help
// (not a canvas), rows cr-ref-help-17 (pair faq-question-1, rest) and cr-ref-help-19 (pair faq-question-2, walker
// state faq-item2-open → setting state "open"), both on path ".sgs-accordion-item__header". Their owner
// cr-ref-help-16 is sgs/accordion. accordion-item/render.php reads the value from block context, and cache/
// accordion.json records headerPadding painting BOTH items' headers.
const ACCORDION = {
	ref: 'cr-ref-help-16',
	block: 'sgs/accordion',
	path: '.sgs-container:nth-of-type(2) > .sgs-accordion-item__header',
	tag: 'summary',
	attributes: {},
	calibration: { settings: { headerPadding: { property: 'padding', state: null, slot: '.sgs-container:nth-of-type(1) > .sgs-accordion-item__header',
		slots: [ '.sgs-container:nth-of-type(1) > .sgs-accordion-item__header', '.sgs-container:nth-of-type(2) > .sgs-accordion-item__header' ] } } },
};
const ITEM_HEADERS = [ '.sgs-container:nth-of-type(1) > .sgs-accordion-item__header', '.sgs-container:nth-of-type(2) > .sgs-accordion-item__header' ];

test( 'MUST FAIL: the block-context channel explains the real accordion header padding, citing sgs/accordion::headerPadding', () => {
	const row = { block: 'sgs/accordion-item', slot: '.sgs-accordion-item__header', prop: 'padding-top', state: null, perWidth: { 375: '20px', 768: '20px', 1440: '20px' } };
	const r = resolveViaAncestor( row, { db, snapshot, canvas: false, ancestors: [ ACCORDION ], measuredSlots: ITEM_HEADERS } );
	assert.equal( r.cite.block, 'sgs/accordion' );
	assert.equal( r.cite.setting, 'headerPadding' );
	assert.equal( r.cite.via, 'calibration' );
	// R-47-5: headerPadding paints both measured item headers, so the write belongs on the child, never on the parent.
	assert.deepEqual( r.cite.measuredDescendants.sort(), [ ...ITEM_HEADERS ].sort() );
	assert.equal( r.writes, undefined );
	// block.json's channel is read, not guessed: the item uses the key the accordion provides for that attribute.
	assert.equal( blockContext( 'sgs/accordion' ).provides[ 'sgs/accordionHeaderPadding' ], 'headerPadding' );
	assert.ok( blockContext( 'sgs/accordion-item' ).uses.includes( 'sgs/accordionHeaderPadding' ) );
} );

test( 'MUST REFUSE THE CITATION: the real open-state accordion row cites nothing, because no open-state setting exists', () => {
	// cr-ref-help-19 was measured in walker state faq-item2-open, which help maps to the setting state "open".
	// sgs/accordion declares padding at rest only, so citing headerPadding here would be the false positive this hop
	// exists to avoid: the row stays exactly as it is classed today.
	const row = { block: 'sgs/accordion-item', slot: '.sgs-accordion-item__header', prop: 'padding-top', state: 'open', perWidth: { 375: '20px', 1440: '20px' } };
	assert.equal( resolveViaAncestor( row, { db, snapshot, canvas: true, ancestors: [ ACCORDION ], measuredSlots: ITEM_HEADERS } ), null );
} );

test( 'MUST FAIL TO WRITE: a container ancestor whose typography reaches several measured descendants is never written', () => {
	const paths = [ '.sgs-container__inner > h3', '.sgs-container__inner > p', '.sgs-container__inner > .sgs-icon-list > .sgs-icon-list__item' ];
	const container = { ref: 'cr-ref-header-3', block: 'sgs/container', path: paths[ 0 ], tag: 'h3', attributes: {},
		calibration: { settings: { textColour: { property: 'color', slot: '', slots: [ '' ], reaches: [ '', ...paths ] } } } };
	const row = { block: 'sgs/heading', slot: '', prop: 'color', state: null, perWidth: { 1440: 'rgb(138, 130, 120)' } };
	const r = resolveViaAncestor( row, { db, snapshot, canvas: true, ancestors: [ container ], measuredSlots: paths } );
	assert.equal( r.gap, 'canvas-settable' );
	assert.equal( r.writes, undefined );
	assert.equal( r.cite.measuredDescendants.length, 3 );
	// One measured descendant and the write is proven, so the guard is a real gate and not a blanket refusal.
	const one = resolveViaAncestor( row, { db, snapshot, canvas: true, ancestors: [ container ], measuredSlots: [ paths[ 0 ] ] } );
	assert.deepEqual( one.writes.map( ( w ) => w.attr ), [ 'textColour' ] );
	assert.equal( one.on.block, 'sgs/container' );
} );

test( 'nothing in the chain declaring the property returns null, so the caller keeps its own gap', () => {
	const row = { block: 'sgs/mega-group', slot: '', prop: 'mask-composite', state: null, perWidth: { 1440: 'add' } };
	assert.equal( resolveViaAncestor( row, { db, snapshot, canvas: true, ancestors: [ MEGA_PANEL ], measuredSlots: [ MEGA_PANEL.path ] } ), null );
	assert.equal( resolveViaAncestor( MEGA_GROUP, { db, snapshot, canvas: true, ancestors: [] } ), null );
} );

// A time setting holds whole milliseconds (sgs/hero declares transitionDuration as a string, default "300").
const timeWrite = ( raw ) => resolve( { block: 'sgs/hero', slot: '', prop: 'transition-duration', perWidth: { 1440: raw, 375: raw } },
	{ db, snapshot, calibration: cal( { transitionDuration: { slot: '', property: 'transition-duration' } } ) } );

test( 'transition-duration: seconds become integer milliseconds (0.25s is 250, 1s is 1000), never a decimal or a unit', () => {
	assert.equal( timeToMs( '0.25s' ), 250 );
	assert.equal( timeToMs( '1s' ), 1000 );
	assert.equal( timeToMs( '0.3s' ), 300 );
	assert.equal( timeToMs( '0.0005s' ), 1 );
	const w = timeWrite( '0.25s' );
	assert.deepEqual( w.writes?.map( ( x ) => x.value ), [ '250' ], JSON.stringify( w ) );
	assert.equal( timeWrite( '1s' ).writes?.[ 0 ]?.value, '1000' );
} );

test( 'transition-duration: not over-suppressing, milliseconds and a real zero survive; a non-time is refused', () => {
	assert.equal( timeToMs( '250ms' ), 250 );
	assert.equal( timeToMs( '0s' ), 0 );
	assert.equal( timeToMs( '0ms' ), 0 );
	assert.equal( timeWrite( '250ms' ).writes?.[ 0 ]?.value, '250' );
	assert.equal( timeWrite( '0s' ).writes?.[ 0 ]?.value, '0' );
	assert.equal( timeToMs( '-1s' ), null );
	assert.equal( timeToMs( '0.2s, 0.3s' ), null );
	assert.equal( timeToMs( 'ease' ), null );
	assert.equal( timeWrite( 'ease' ).writes, undefined );
} );

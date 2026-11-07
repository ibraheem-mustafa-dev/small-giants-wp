// The chrome family and the skeleton pairing. Run: node --test tests/apply-chrome.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { chrome } from '../lib/apply-family-chrome.mjs';
import { idsOf, flatten, skeletonTargets, positionMatch, overlap, panelIds } from '../lib/apply-skeleton.mjs';
import { pairsOf } from '../lib/apply-targets.mjs';
import { recordIndex } from '../lib/apply-records.mjs';

const at = ( f ) => ( { 1440: f, 768: f, 375: f } );
const rec = ( id, tpl, type, props, detail = ':hover rule (style-hover)' ) => ( { id, element: { dc: 'D', template_tpl_id: String( tpl ) }, trigger: { type, detail }, properties: props } );
const records = [
	rec( 'TR-025', 127, 'hover', [ { property: 'transform', from: 'translateX(var(--lx,0px))', to: 'translateX(5px)' } ] ),
	rec( 'TR-026', 128, 'hover', [ { property: 'box-shadow', from: null, to: '0 0 0 6px rgba(231,215,104,.22)' } ] ),
	rec( 'TR-101', 706, 'hover', [ { property: 'gap', from: '10px', to: '16px' } ] ),
];
const recordsIndex = recordIndex( records, 'D' );
const ctx = ( o ) => ( { saved: {}, draft: at( null ), live: at( null ), aux: {}, recordsIndex, clientData: {}, ...o, target: { ref: 'cr-ref-x-1', key: 'cr-ref-x-1', tpl: 'Root/1#0', owns: [], ...o.target } } );

test( 'skeleton ids: a list, a range with a dash, an alternative', () => {
	assert.deepEqual( idsOf( '9+39' ), [ 9, 39 ] );
	assert.deepEqual( idsOf( '671–674' ), [ 671, 672, 673, 674 ] );
	assert.deepEqual( idsOf( '54/58' ), [ 54, 58 ] );
	assert.deepEqual( idsOf( undefined ), [] );
} );

const nodes = flatten( [ { b: 'sgs/a', t: '1', c: [ { b: 'sgs/row', t: '2' }, { b: 'sgs/logo', t: '4' }, { b: 'sgs/row', t: '6' }, { slot: 'burger', t: '8' } ] } ] );
const saved = { 'cr-ref-x-0': { block: 'sgs/a' }, 'cr-ref-x-1': { block: 'sgs/row' }, 'cr-ref-x-2': { block: 'sgs/logo' }, 'cr-ref-x-3': { block: 'sgs/row' } };

test( 'skeleton pairing: an unpaired block takes the unclaimed ref between its neighbours; a wrapper aliases its paired descendant; a slot carries its parent', () => {
	const pairs = [ { ref: 'cr-ref-x-0', tpl: 'Root/1#0' }, { ref: 'cr-ref-x-2', tpl: 'Root/5#0' }, { ref: 'cr-ref-x-3', tpl: 'Root/6#0' } ];
	const out = skeletonTargets( { nodes, pairs, saved } );
	const row = out.targets.find( ( t ) => 'Root/2#0' === t.tpl );
	assert.equal( row.ref, 'cr-ref-x-1' );
	assert.equal( row.nearest_tpl, 'Root/1#0' );
	assert.equal( out.aliases[ 4 ], 'cr-ref-x-2' );
	const slot = out.targets.find( ( t ) => 'burger' === t.slot );
	assert.equal( slot.ref, 'cr-ref-x-0' );
	assert.equal( out.notes.length, 0 );
} );

test( 'skeleton pairing: no skeleton, no change; an unmatched node is reported, never guessed', () => {
	assert.deepEqual( flatten( [] ), [] );
	const out = skeletonTargets( { nodes, pairs: [ { ref: 'cr-ref-x-0', tpl: 'Root/1#0' } ], saved: { 'cr-ref-x-0': { block: 'sgs/a' } } } );
	assert.ok( out.notes.some( ( n ) => 'sgs/row' === n.block ) );
	assert.equal( out.targets.filter( ( t ) => 'sgs/row' === t.block ).length, 0 );
	assert.deepEqual( pairsOf( { pairs: [ { live: '.cr-ref-a-1', draft: { tpl: 'Root/3#0' } } ] }, {} ), [ { key: 'cr-ref-a-1', ref: 'cr-ref-a-1', tpl: 'Root/3#0', via: 'pair' } ] );
} );

test( 'position match needs 0.6 overlap, the same block and a shared word', () => {
	const box = { x: 0, y: 0, w: 100, h: 40 };
	assert.equal( overlap( box, { x: 50, y: 0, w: 100, h: 40 } ), 0.5 );
	assert.ok( positionMatch( { draft: { box, text: 'Call us today' }, live: { box: { x: 5, y: 0, w: 100, h: 40 }, text: 'call', block: 'sgs/a' }, block: 'sgs/a' } ) );
	assert.ok( ! positionMatch( { draft: { box, text: 'Call' }, live: { box: { x: 5, y: 0, w: 100, h: 40 }, text: 'Email', block: 'sgs/a' }, block: 'sgs/a' } ) );
	assert.ok( ! positionMatch( { draft: { box, text: '' }, live: { box: { x: 70, y: 0, w: 100, h: 40 }, text: '', block: 'sgs/a' }, block: 'sgs/a' } ) );
	assert.ok( ! positionMatch( { draft: { box, text: '' }, live: { box, text: '', block: 'sgs/b' }, block: 'sgs/a' } ) );
} );

test( 'chrome logo: the client data goes to the block, the drawer takes the chromeLogo names; no data is no-setting', () => {
	const data = { inlineSvg: true, svgParts: [ { target: 'x' } ], svgPartsTrigger: 'visible', svgPartsHoverCooldown: 1400 };
	const [ op ] = chrome.decide( ctx( { block: 'sgs/responsive-logo', clientData: { logo: data } } ) );
	assert.equal( op.status, 'op' );
	assert.deepEqual( op.writes.map( ( w ) => w.attr ).sort(), [ 'inlineSvg', 'svgParts', 'svgPartsHoverCooldown', 'svgPartsTrigger' ] );
	const [ d ] = chrome.decide( ctx( { block: 'sgs/nav-drawer', clientData: { logo: data } } ) );
	assert.ok( d.writes.some( ( w ) => 'chromeLogoSvgPartsTrigger' === w.attr && 'every-visible' === w.value ) );
	assert.equal( chrome.decide( ctx( { block: 'sgs/responsive-logo', saved: data, clientData: { logo: data } } ) )[ 0 ].status, 'equal' );
	assert.equal( chrome.decide( ctx( { block: 'sgs/responsive-logo' } ) )[ 0 ].status, 'no-setting' );
} );

test( 'chrome hover: record values land on the drawer menu and the footer list; no record, no item', () => {
	const items = chrome.decide( ctx( { block: 'sgs/nav-drawer-menu', target: { owns: [ 127, 128 ] } } ) );
	assert.deepEqual( items.flatMap( ( i ) => i.writes ), [ { attr: 'itemPaddingShiftHover', value: '5px' }, { attr: 'caretBoxShadowHover', value: '0 0 0 6px' }, { attr: 'caretBoxShadowColourHover', value: 'rgba(231,215,104,.22)' } ] );
	assert.deepEqual( chrome.decide( ctx( { block: 'sgs/icon-list', target: { owns: [ 706 ] } } ) )[ 0 ].writes, [ { attr: 'itemTextShiftHover', value: 6 } ] );
	assert.deepEqual( chrome.decide( ctx( { block: 'sgs/nav-drawer-menu', target: { owns: [ 999 ] } } ) ), [] );
	assert.equal( chrome.decide( ctx( { block: 'sgs/icon-list', saved: { itemTextShiftHover: 6 }, target: { owns: [ 706 ] } } ) )[ 0 ].status, 'equal' );
} );

test( 'chrome header row: a displayed, non-sticky top strip scrolls away and replaces hide-on-scroll; a sticky one is left alone', () => {
	const strip = ( position ) => ( { box: { x: 0, y: 0, w: 1440, h: 46 }, styles: { display: 'flex', position } } );
	const [ op ] = chrome.decide( ctx( { block: 'sgs/site-header-row', saved: { rowSlot: 'top', rowHideOnScroll: { desktop: 'on' } }, draft: at( strip( 'static' ) ) } ) );
	assert.deepEqual( op.writes, [ { attr: 'rowScrollAway', value: { desktop: 'on', tablet: 'on', mobile: 'on' } }, { attr: 'rowHideOnScroll', unset: true } ] );
	assert.deepEqual( chrome.decide( ctx( { block: 'sgs/site-header-row', saved: { rowSlot: 'top' }, draft: at( strip( 'sticky' ) ) } ) ), [] );
	assert.deepEqual( chrome.decide( ctx( { block: 'sgs/site-header-row', saved: { rowSlot: 'middle' }, draft: at( strip( 'static' ) ) } ) ), [] );
} );

test( 'chrome open status and burger: the closed-clock read gives dot, pulse and line order; the burger reads the draft bar', () => {
	const closed = {
		draft: { 'cr-ref-x-1': { text: 'Opens tomorrow at 9:30am', styles: {} }, 'cr-ref-x-1~9': { styles: { display: 'block', 'background-color': 'rgb(232, 161, 58)' } } },
		animate: [ { key: 'cr-ref-x-1~9', frames: [ { boxShadow: '0 0 0 0 currentColor' } ] } ],
	};
	const saved = { displayType: 'open-status', openStatusOpenDot: '#6EE07A', openStatusDotPulse: true };
	const [ op ] = chrome.decide( ctx( { block: 'sgs/business-info', saved, closed } ) );
	assert.deepEqual( op.writes, [ { attr: 'openStatusClosedDot', value: '#E8A13A' }, { attr: 'openStatusDotPulseWhen', value: 'always' }, { attr: 'openStatusOpensPattern', value: '{lead} {when} at {time}' }, { attr: 'openStatusOpensLabel', value: 'Opens' } ] );
	assert.deepEqual( chrome.decide( ctx( { block: 'sgs/business-info', saved: { displayType: 'hours' }, closed } ) ), [] );
	assert.equal( chrome.decide( ctx( { block: 'sgs/business-info', saved } ) )[ 0 ].status, 'no-setting' );
	assert.ok( chrome.closedClock( { saved: { a: { block: 'sgs/business-info', attrs: saved } } } ) );
	const bar = { 1440: { box: { w: 0, h: 0 }, styles: { display: 'none', height: '0px' } }, 768: { box: { w: 18, h: 2.5 }, styles: { display: 'block', height: '2.5px' } }, 375: { box: { w: 18, h: 2.5 }, styles: { display: 'block', height: '2.5px' } } };
	const [ burger ] = chrome.decide( ctx( { block: 'sgs/nav-bar-menu', aux: { 'Root/61#0': bar } } ) );
	assert.deepEqual( burger.writes, [ { attr: 'burgerBarThickness', value: { tablet: '2.5px', mobile: '2.5px' } } ] );
} );

test( 'chrome slots: the drawer menu row border becomes the separators row colour; the touch circle follows a hover circle record', () => {
	const row = { box: { w: 300, h: 50 }, styles: { display: 'block', 'border-bottom-width': '1px', 'border-bottom-style': 'solid', 'border-bottom-color': 'rgb(216, 202, 80)' } };
	const all = { blocks: { 'cr-ref-x-1': { block: 'sgs/nav-drawer-menu', attrs: {} } } };
	const [ op ] = chrome.decide( ctx( { block: 'sgs/nav-drawer-menu', all, target: { slot: 'row 01 Home' }, draft: { 1440: null, 768: row, 375: row } } ) );
	assert.deepEqual( op.writes[ 0 ].value.row, { style: 'solid', colour: '#D8CA50', width: { tablet: '1px', mobile: '1px' } } );
	assert.deepEqual( chrome.decide( ctx( { block: 'sgs/nav-drawer-menu', all, target: { slot: 'row 01 Home' }, draft: at( null ) } ) ), [] );
	const motion = { elements: { root: { effects: [ { effect: 'cursor-field', values: { field: 'image-reveal' } } ] } } };
	const circle = rec( 'TR-078', 495, 'hover', [ { property: 'clip-path', from: 'circle(var(--pr,0px))', to: 'circle(90px at 50% 50%)' } ], ':hover parent-driven: --pr set by :hover on tpl 481' );
	const [ touch ] = chrome.decide( ctx( { block: 'sgs/container', saved: { sgsMotion: motion }, recordsIndex: recordIndex( [ circle ], 'D' ), target: { tpl: 'Root/481#0' } } ) );
	assert.equal( touch.writes[ 0 ].value.elements.root.effects[ 0 ].values.touchMode, 'circle' );
	assert.deepEqual( chrome.decide( ctx( { block: 'sgs/container', saved: { sgsMotion: motion }, target: { tpl: 'Root/481#0' } } ) ), [] );
} );

test( 'chrome mega panel: the drawer skeleton names the aside and group records; a panel with an aside reads the aside', () => {
	const skeleton = [ { id: 'drawer', nodes: flatten( [ { b: 'sgs/nav-drawer', t: '108', c: [ { b: 'sgs/mega-panel', t: '134', c: [ { b: 'sgs/mega-aside', t: '139' }, { b: 'sgs/mega-group', t: '149' } ] }, { b: 'sgs/x', t: '178' } ] } ] ) } ];
	const recs = [
		{ ...rec( 'R-lift', 139, 'hover', [ { property: 'transform', from: null, to: 'translateY(-3px)' } ] ), element: { dc: 'D', template_tpl_id: '139', description: 'div' } },
		{ ...rec( 'R-arrow', 148, 'hover', [ { property: 'transform', from: null, to: 'translateX(4px)' } ] ), element: { dc: 'D', template_tpl_id: '148', description: 'span {{ arrowIcon }}' } },
		{ ...rec( 'R-text', 153, 'hover', [ { property: 'transform', from: null, to: 'translateX(4px)' } ] ), element: { dc: 'D', template_tpl_id: '153', description: 'span {{ link.label }}' } },
	];
	const withAside = chrome.decide( ctx( { block: 'sgs/mega-panel', skeleton, recordsIndex: recordIndex( recs, 'D' ), all: { blocks: { a: { block: 'sgs/mega-aside' } } } } ) );
	assert.deepEqual( withAside.flatMap( ( i ) => i.writes ), [ { attr: 'drawerLinkTextShiftHover', value: 4 }, { attr: 'drawerCardHoverLift', value: 3 }, { attr: 'drawerCardLinkShiftHover', value: 4 } ] );
	assert.deepEqual( chrome.decide( ctx( { block: 'sgs/mega-panel', skeleton: [], recordsIndex: recordIndex( recs, 'D' ) } ) ), [] );
} );

test( 'chrome process steps: the drawn line becomes the connector settings and its custom rule goes; own-hover badge sets the trigger', () => {
	const line = { box: { x: 100, y: 130, w: 691, h: 2 }, styles: { display: 'block', height: '2px', 'background-color': 'rgb(10, 126, 168)' } };
	const own = { box: { x: 0, y: 100, w: 1000, h: 300 }, styles: {} };
	const [ op ] = chrome.decide( ctx( { block: 'sgs/process-steps', saved: { sgsCustomCss: '& .x::before { height: 2px; } & .y { color: red; }' }, draft: { 1440: own }, aux: { 'Root/257#0': { 1440: line } } } ) );
	const w = Object.fromEntries( op.writes.map( ( x ) => [ x.attr, x.value ] ) );
	assert.equal( w.connectorColour, '#0A7EA8' );
	assert.equal( w.connectorOffset, '31px' );
	assert.equal( w.sgsCustomCss, '& .y { color: red; }' );
	const own2 = [ rec( 'TR-055', 261, 'hover', [ { property: 'transform', from: null, to: 'scale(1.12)' } ] ) ];
	const items = chrome.decide( ctx( { block: 'sgs/process-steps', recordsIndex: recordIndex( own2, 'D' ), target: { reach: [ 261 ] } } ) );
	assert.equal( items[ 0 ].writes[ 0 ].value, 'number' );
	const parentDriven = [ ...own2, rec( 'TR-x', 262, 'hover', [ { property: 'opacity', from: '0', to: '1' } ], ':hover parent-driven: --a set by :hover on tpl 260' ) ];
	assert.deepEqual( chrome.decide( ctx( { block: 'sgs/process-steps', recordsIndex: recordIndex( parentDriven, 'D' ), target: { reach: [ 261, 262 ] } } ) ), [] );
} );

test( 'chrome: an unrelated block gets nothing', () => {
	assert.deepEqual( chrome.decide( ctx( { block: 'sgs/container' } ) ), [] );
} );

test( 'skeleton panels: a menu reaches the mega panels other surfaces draw, never the drawer surface', () => {
	const skeleton = [
		{ id: 'header', nodes: flatten( [ { b: 'sgs/nav-bar-menu', t: '45' } ] ) },
		{ id: 'mega-a', nodes: flatten( [ { b: 'sgs/mega-panel', t: '65' } ] ) },
		{ id: 'drawer', nodes: flatten( [ { b: 'sgs/nav-drawer', t: '108', c: [ { b: 'sgs/mega-panel', t: '134' } ] } ] ) },
	];
	assert.deepEqual( panelIds( skeleton, 'header' ), [ 65 ] );
	assert.deepEqual( panelIds( [], 'header' ), [] );
} );

const GRAD = 'radial-gradient(circle at 30% 107%, red 0%, blue 90%)';
const anchorRec = ( id, tpl, props ) => ( { ...rec( id, tpl, 'hover', props ), element: { dc: 'D', template_tpl_id: String( tpl ), description: 'a' } } );
const iconBlocks = ( extra = {} ) => ( {
	'cr-ref-d-5': { block: 'sgs/social-icons', attrs: {} },
	'cr-ref-d-6': { block: 'sgs/icon', attrs: { backgroundColour: '#0A66C2' } },
	'cr-ref-d-7': { block: 'sgs/icon', attrs: { backgroundColourGradient: GRAD, ...extra } },
	'cr-ref-d-8': { block: 'sgs/button', attrs: {} },
} );
const hoverProps = [ { property: 'transform', from: null, to: 'scale(1.15)' }, { property: 'box-shadow', from: null, to: '0 10px 20px -6px red' } ];

test( 'chrome icons: child icons whose hover record names no background keep their ground on hover, paired in order with the records', () => {
	const recordsIndex = recordIndex( [ anchorRec( 'R1', 181, hoverProps ), anchorRec( 'R2', 193, hoverProps ) ], 'D' );
	const items = chrome.decide( ctx( { block: 'sgs/social-icons', recordsIndex, target: { ref: 'cr-ref-d-5', tpl: 'Root/180#0', reach: [ 180, 181, 193 ] }, all: { blocks: iconBlocks() } } ) );
	const ops = items.filter( ( i ) => 'op' === i.status );
	assert.deepEqual( ops.map( ( o ) => [ o.ref, o.block, o.writes ] ), [
		[ 'cr-ref-d-6', 'sgs/icon', [ { attr: 'backgroundColourHover', value: '#0A66C2' } ] ],
		[ 'cr-ref-d-7', 'sgs/icon', [ { attr: 'backgroundColourHoverGradient', value: GRAD } ] ],
	] );
	// Negative controls: already saved is equal; a record that names a background leaves the icon alone; a count mismatch is a no-setting row.
	const saved = chrome.decide( ctx( { block: 'sgs/social-icons', recordsIndex, target: { ref: 'cr-ref-d-5', tpl: 'Root/180#0', reach: [ 180, 181, 193 ] }, all: { blocks: iconBlocks( { backgroundColourHoverGradient: GRAD } ) } } ) );
	assert.equal( saved.find( ( i ) => 'cr-ref-d-7' === i.ref ).status, 'equal' );
	const named = recordIndex( [ anchorRec( 'R1', 181, hoverProps ), anchorRec( 'R2', 193, [ ...hoverProps, { property: 'background-color', from: null, to: '#fff' } ] ) ], 'D' );
	const none = chrome.decide( ctx( { block: 'sgs/social-icons', recordsIndex: named, target: { ref: 'cr-ref-d-5', tpl: 'Root/180#0', reach: [ 180, 181, 193 ] }, all: { blocks: iconBlocks() } } ) );
	assert.ok( ! none.some( ( i ) => 'cr-ref-d-7' === i.ref ) );
	const short = recordIndex( [ anchorRec( 'R1', 181, hoverProps ) ], 'D' );
	const mismatch = chrome.decide( ctx( { block: 'sgs/social-icons', recordsIndex: short, target: { ref: 'cr-ref-d-5', tpl: 'Root/180#0', reach: [ 180, 181 ] }, all: { blocks: iconBlocks() } } ) );
	assert.deepEqual( mismatch.map( ( i ) => i.status ), [ 'no-setting' ] );
	assert.deepEqual( chrome.decide( ctx( { block: 'sgs/social-icons', recordsIndex, target: { ref: 'cr-ref-d-5', tpl: 'Root/180#0', reach: [ 180, 181, 193 ], slot: 'x' }, all: { blocks: iconBlocks() } } ) ), [] );
} );

test( 'chrome mega rows: the drawer text shift switches the row indent off for the tablet tier; no shift, no change; already off is equal; the arrow keeps its own colour', () => {
	const skeleton = [ { id: 'drawer', nodes: flatten( [ { b: 'sgs/nav-drawer', t: '108', c: [ { b: 'sgs/mega-panel', t: '134', c: [ { b: 'sgs/mega-group', t: '149' } ] }, { b: 'sgs/x', t: '178' } ] } ] ) } ];
	const rowRec = ( id, tpl, desc, props ) => ( { ...rec( id, tpl, 'hover', props ), element: { dc: 'D', template_tpl_id: String( tpl ), description: desc } } );
	const recs = [
		rowRec( 'R-text', 153, 'span {{ link.label }}', [ { property: 'transform', from: null, to: 'translateX(4px)' } ] ),
		rowRec( 'R-fade', 156, 'span {{ arrowIcon }}', [ { property: 'opacity', from: '0.4', to: '1' } ] ),
	];
	const row = ( devices ) => ( { block: 'sgs/container', attrs: { sgsMotion: { v: 1, elements: { root: { hover: { state: { values: { indent: 6 }, ...( devices ? { devices } : {} ) } } } } } } } );
	const run = ( blocks, saved = {}, recordsIndex = recordIndex( recs, 'D' ) ) => chrome.decide( ctx( { block: 'sgs/mega-panel', skeleton, recordsIndex, saved, all: { blocks } } ) );
	const [ off ] = run( { 'cr-ref-m-2': row(), 'cr-ref-m-3': { block: 'sgs/container', attrs: {} } } ).filter( ( i ) => 'cr-ref-m-2' === i.ref );
	assert.equal( 'op', off.status );
	assert.deepEqual( off.writes[ 0 ].value.elements.root.hover.state.devices, { tablet: { indent: 0 } } );
	assert.equal( 'deep', off.writes[ 0 ].merge );
	assert.ok( ! run( { 'cr-ref-m-3': { block: 'sgs/container', attrs: {} } } ).some( ( i ) => 'cr-ref-m-3' === i.ref ) );
	assert.equal( run( { 'cr-ref-m-2': row( { tablet: { indent: 0 } } ) } ).find( ( i ) => 'cr-ref-m-2' === i.ref ).status, 'equal' );
	const noShift = recordIndex( recs.slice( 1 ), 'D' );
	assert.ok( ! run( { 'cr-ref-m-2': row() }, {}, noShift ).some( ( i ) => 'cr-ref-m-2' === i.ref ) );
	const arrow = run( {}, { drawerLinkTrailingIcon: 'arrow', drawerLinkLabelColour: '#2C3E50' } ).find( ( i ) => 'drawerLinkTrailingColourHover' === i.prop );
	assert.deepEqual( arrow.writes, [ { attr: 'drawerLinkTrailingColourHover', value: '#2C3E50' } ] );
	assert.equal( run( {}, {} ).find( ( i ) => 'drawerLinkTrailingColourHover' === i.prop ).status, 'no-setting' );
} );

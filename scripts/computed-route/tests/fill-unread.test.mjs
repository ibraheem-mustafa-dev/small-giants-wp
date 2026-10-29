// FR-47-4 step 5: nothing Fill leaves unjudged on a measured node is dropped silently. The 2026-10-09 footer Fill
// (.claude/reports/2026-10-09-skeleton-writer-test/evidence/fill-report.md) dropped five sgs/business-info settings with
// no row: addressLink and showIcon (presence; addressLink never calibrated, showIcon's icon element never read),
// hoursLayout (a layout enum calibration reads no presence for), hoursRowJustify and labelColour (their elements never
// named by a draftSlots finder). Calibration is shaped as the real cache/business-info.json (gitignored, copied here);
// the database is the real one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { unreadOf } from '../lib/fill-unread.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { contentRowsFor } from '../lib/calibrate-content.mjs';

const db = openDb();
const THREE = [ 375, 768, 1440 ];
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const ROW = '.sgs-business-info > .sgs-business-hours__row';
const DAY = `${ ROW } > .sgs-business-hours__day`;
const ICON = '.sgs-business-info > .sgs-business-info__link > .sgs-business-info__icon';
const PAINT = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '13px' };
const tiers = () => Object.fromEntries( THREE.map( ( w ) => [ w, { ...PAINT } ] ) );
const setting = ( slot, property ) => ( { slot, slots: [ slot ], reaches: [ slot ], property, state: null, forms: [], transform: null, reachedAt: THREE, effects: [], variants: [ 0 ] } );
const CAL = {
	block: 'sgs/business-info',
	elements: { '': tiers(), [ ROW ]: tiers(), [ DAY ]: tiers(), [ ICON ]: tiers() },
	settings: { textColour: setting( '', 'color' ), hoursRowJustify: setting( ROW, 'justify-content' ), labelColour: setting( DAY, 'color' ) },
	presence: { showIcon: { shows: [], hides: [ ICON ] } },
	text: { textBefore: {}, textAfter: {} },
	discovered: {},
};

const reads = ( ids ) => ( { widths: Object.fromEntries( FIVE.map( ( w ) => [ w, Object.fromEntries( ids.map( ( id ) => [ id, { styles: { ...PAINT }, pseudo: {}, rect: { x: 0, y: 0, w: 200, h: 20 }, inFlow: true, words: 'Mon to Sat 9.00 to 17.30', href: null } ] ) ) ] ) ), declared: {}, sweep: {}, sweepWidths: [], origin: 'http://127.0.0.1:1' } );

function run( node ) {
	const skeleton = [ node ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const nodes = skeletonNodes( skeleton );
	const ids = nodes.flatMap( ( n ) => n.targets.map( ( t ) => t.id ) );
	return fillTree( { tree, nodes, reads: reads( ids ), db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: () => CAL, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
}
const settingsOf = ( out ) => out.unread.flatMap( ( u ) => u.settings );

test( 'MUST FAIL (2026-10-09 footer: five business-info settings dropped with no row): a draftRef-only node lists each unjudged setting with its reason', () => {
	const out = run( { name: 'sgs/business-info', draftRef: 'footer address', attributes: { displayType: 'hours' } } );
	assert.ok( Array.isArray( out.unread ), 'fillTree returns an unread list' );
	for ( const attr of [ 'addressLink', 'hoursLayout', 'showIcon', 'hoursRowJustify', 'labelColour' ] ) {
		assert.ok( settingsOf( out ).includes( attr ), `${ attr } is listed` );
	}
	const why = ( a ) => out.unread.find( ( u ) => u.settings.includes( a ) ).reason;
	assert.match( why( 'hoursRowJustify' ), /draftSlots/ );
	assert.match( why( 'addressLink' ), /no presence reading/ );
	assert.match( why( 'hoursLayout' ), /no presence reading for its values/ );
	assert.match( why( 'showIcon' ), /draftSlots/ );
} );

test( 'negative control: a setting the skeleton sets, a slot it names and a setting Fill wrote are never listed', () => {
	const out = run( { name: 'sgs/business-info', draftRef: 'footer address', draftSlots: { [ ROW ]: 'footer address .row', [ DAY ]: 'footer address .day', [ ICON ]: 'footer address .icon' }, attributes: { displayType: 'hours', hoursLayout: 'condensed', addressLink: true } } );
	const listed = settingsOf( out );
	for ( const attr of [ 'hoursLayout', 'addressLink', 'hoursRowJustify', 'labelColour', 'showIcon', 'displayType', 'textColour' ] ) {
		assert.ok( ! listed.includes( attr ), `${ attr } is not listed` );
	}
} );

test( 'unreadOf: the content settings come from the database roles, never a list of names', () => {
	const rows = contentRowsFor( db, 'sgs/business-info' );
	assert.ok( rows.presence.some( ( r ) => 'addressLink' === r.attr_name ) );
	const out = unreadOf( { db, block: 'sgs/business-info', cal: { ...CAL, presence: { ...CAL.presence, addressLink: { shows: [], hides: [] } } }, attributes: {}, slots: [ '' ], written: new Set() } );
	assert.ok( ! out.some( ( u ) => u.settings.includes( 'addressLink' ) && /no presence reading/.test( u.reason ) ) );
} );

// A block built on the shared container wrapper draws one draft element as its root and its content band
// (`.sgs-container__inner`): reading the root reads the band's layout settings, so they are not "never read".
const BAND = '.sgs-container__inner';
const ITEM = `${ BAND } > p:nth-of-type(1)`;
// The root and the band measure the same default layout paint (as the real container calibration does), so they are one box.
const layoutTiers = () => Object.fromEntries( THREE.map( ( w ) => [ w, { ...PAINT, 'grid-auto-rows': 'auto', 'justify-items': 'normal', 'align-content': 'normal' } ] ) );
const CONTAINER_CAL = {
	block: 'sgs/container',
	elements: { '': layoutTiers(), [ BAND ]: layoutTiers(), [ ITEM ]: tiers() },
	settings: { contentWidth: setting( BAND, 'max-width' ), gridAutoRows: setting( BAND, 'grid-auto-rows' ), justifyItems: setting( BAND, 'justify-items' ), gridItemPadding: setting( ITEM, 'padding' ), minHeight: setting( '', 'min-height' ) },
	presence: {}, text: {}, discovered: {},
};
const listedOf = ( args ) => unreadOf( { db, block: 'sgs/container', cal: CONTAINER_CAL, attributes: {}, written: new Set(), ...args } ).flatMap( ( u ) => u.settings );

test( 'MUST FAIL: the band the draft root is also read as is not listed unread; the children\'s settings still are', () => {
	assert.ok( listedOf( { slots: [ '' ] } ).includes( 'gridAutoRows' ), 'without the band slot the layout settings are listed (the old accounting)' );
	const listed = listedOf( { slots: [ '' ], band: { slot: BAND, attr: 'contentWidth' } } );
	for ( const attr of [ 'gridAutoRows', 'justifyItems' ] ) {
		assert.ok( ! listed.includes( attr ), `${ attr } is judged with the root` );
	}
	assert.ok( listed.includes( 'contentWidth' ), 'the band width keeps its own evidence rule (lib/fill-band.mjs), so it stays unread without it' );
	assert.ok( listed.includes( 'gridItemPadding' ), 'a setting of the band\'s children is another element, still unread' );
} );

test( 'negative control: a node whose root no finder read keeps its band settings listed, and a block with no band lists as before', () => {
	assert.ok( listedOf( { slots: [ ITEM ], band: { slot: BAND, attr: 'contentWidth' } } ).includes( 'gridAutoRows' ), 'the band is the root\'s only when the root was read' );
	assert.ok( listedOf( { slots: [], band: { slot: BAND, attr: 'contentWidth' } } ).includes( 'gridAutoRows' ) );
	assert.ok( listedOf( { slots: [ '' ], band: null } ).includes( 'gridAutoRows' ), 'no band setting, no shared element' );
} );

// The draft's grid rows, item alignment and content alignment are read on the one draft element and written to the band's
// settings (lib/fill-prop.mjs::CARRIED, tried by lib/fill-resolve-state.mjs::alternateSlots).
function fillContainer( styles, bandPaint = {} ) {
	const skeleton = [ { name: 'sgs/container', draftRef: 'section', attributes: {} } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const nodes = skeletonNodes( skeleton );
	const ids = nodes.flatMap( ( n ) => n.targets.map( ( t ) => t.id ) );
	const r = reads( ids );
	for ( const w of FIVE ) {
		Object.values( r.widths[ w ] ).forEach( ( s ) => Object.assign( s.styles, styles ) );
	}
	// The properties the code declares beyond Fill's own list are read as declared values too (FR-48-8).
	r.declared = Object.fromEntries( THREE.map( ( w ) => [ w, Object.fromEntries( ids.map( ( id ) => [ id, { ...styles } ] ) ) ] ) );
	const cal = { ...CONTAINER_CAL, elements: { ...CONTAINER_CAL.elements, [ BAND ]: Object.fromEntries( THREE.map( ( w ) => [ w, { ...CONTAINER_CAL.elements[ BAND ][ w ], ...bandPaint } ] ) ) }, settings: { ...CONTAINER_CAL.settings, alignContent: setting( BAND, 'align-content' ), flexWrap: setting( BAND, 'flex-wrap' ) } };
	return fillTree( { tree, nodes, reads: r, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: () => cal, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
}

test( 'MUST FAIL: a draft root\'s grid-auto-rows, justify-items and align-content are written to the band\'s settings', () => {
	const out = fillContainer( { 'grid-auto-rows': '120px', 'justify-items': 'center', 'align-content': 'space-between' } );
	assert.deepEqual( out.writes.map( ( w ) => `${ w.attr }@${ w.slot }` ).sort(), [ `alignContent@${ BAND }`, `gridAutoRows@${ BAND }`, `justifyItems@${ BAND }` ] );
	assert.deepEqual( out.unmapped.filter( ( u ) => /grid-auto-rows|justify-items|align-content/.test( u.property ) ), [] );
	assert.ok( ! settingsOf( out ).includes( 'flexWrap' ), 'a band setting the draft element states nothing for is judged with the root, not listed unread' );
	assert.ok( settingsOf( out ).includes( 'gridItemPadding' ), 'the children of the band are another element' );
} );

test( 'negative control: a band whose default layout differs from that of the root is another box, so the root value is never written to it', () => {
	const out = fillContainer( { 'grid-auto-rows': '120px' }, { 'grid-auto-rows': '50px' } );
	assert.deepEqual( out.writes.map( ( w ) => w.attr ), [] );
	assert.ok( out.unmapped.some( ( u ) => 'grid-auto-rows' === u.property && /^unpaired-part/.test( u.reason ) ) );
} );

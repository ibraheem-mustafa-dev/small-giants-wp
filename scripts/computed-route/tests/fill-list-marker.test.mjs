// A list item's own marker reaches the item, and the list's marker type follows the draft (re-applies 567d088d2's rule on
// today's code, with 59587eea2's marker-slot rule): each item copy's marker part is read with the icon reader
// (lib/fill-icon.mjs::iconDecisions, requireSvg false for item settings that hold no `iconSvg`) and written to that item's icon
// settings; the marker type is chosen from what every item draws and written only where the framework DB lists the value.
// Run on the real framework DB, plus one fillTree run proving the decisions are wired into Fill.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { listMarkerDecisions, markerPart, markerSlotAt, markerSlots } from '../lib/fill-list-marker.mjs';
import { iconDecisions } from '../lib/fill-icon.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';

const db = openDb();
const ITEM = ( k ) => `.sgs-icon-list > .sgs-icon-list__item:nth-of-type(${ k })`;
const MARK = ( k ) => `${ ITEM( k ) } > .sgs-icon-list__icon`;
const cal = {
	block: 'sgs/icon-list',
	settings: {
		iconColour: { slot: MARK( 1 ), slots: [ MARK( 1 ) ] },
		iconColourGradient: { slot: `${ MARK( 1 ) } > svg`, slots: [ `${ MARK( 1 ) } > svg` ] },
		itemFontSize: { slot: ITEM( 1 ), slots: [ ITEM( 1 ) ] },
		gap: { slot: '.sgs-icon-list' },
		markerColour: { slot: `${ ITEM( 1 ) }::marker`, slots: [ `${ ITEM( 1 ) }::marker`, `${ ITEM( 1 ) }::marker > svg` ] },
	},
};
const LUCIDE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const items = [ { text: 'Certifications', url: '/certifications/' }, { text: 'Careers', url: '/careers/' } ];
const marker = ( reads, block = 'sgs/icon-list', c = cal, attributes = { items } ) => listMarkerDecisions( { db, block, cal: c, attributes, reads } );

test( 'MUST FAIL: the marker part is the slot under the repeated item step that holds the svg, and copy k is that slot at k', () => {
	assert.equal( markerPart( cal.settings ), MARK( 1 ) );
	assert.equal( markerSlotAt( MARK( 1 ), 3 ), MARK( 3 ) );
	assert.equal( markerSlotAt( '.a:nth-of-type(1) > .b:nth-of-type(1) > .c', 3 ), '.a:nth-of-type(1) > .b:nth-of-type(3) > .c', 'the last repeated step is the copy' );
	assert.deepEqual( markerSlots( { cal, slots: [ '', ITEM( 1 ), MARK( 1 ), MARK( 2 ), `${ MARK( 2 ) } > svg` ] } ), { 1: MARK( 1 ), 2: MARK( 2 ) } );
	assert.equal( markerPart( { itemFontSize: { slot: ITEM( 1 ) } } ), null, 'a calibration with no part holding the svg has no marker part' );
} );

test( 'MUST FAIL: an svg marker at each item\'s marker part is read by the icon reader and written to that item', () => {
	const r = marker( { [ MARK( 1 ) ]: { svg: { markup: LUCIDE } }, [ MARK( 2 ) ]: { svg: { markup: LUCIDE } } } );
	const w = r.writes.find( ( x ) => 'items' === x.attr );
	assert.deepEqual( w.value.map( ( i ) => [ i.iconSource, i.iconName, i.text, i.url ] ), [ [ 'lucide', 'check', 'Certifications', '/certifications/' ], [ 'lucide', 'check', 'Careers', '/careers/' ] ] );
	assert.deepEqual( r.writes.find( ( x ) => 'markerType' === x.attr ), { attr: 'markerType', value: 'icon', merge: 'replace' } );
	assert.deepEqual( r.decided, { markerType: 'icon' } );
} );

test( 'MUST FAIL: the icon reader reads a mark for item settings that hold no iconSvg; a custom mark is a named row', () => {
	const schema = { iconSource: {}, iconName: {} };
	assert.deepEqual( iconDecisions( { svg: { markup: LUCIDE }, schema } ).writes, [], 'a block with no iconSvg is no icon block' );
	assert.deepEqual( iconDecisions( { svg: { markup: LUCIDE }, schema, requireSvg: false } ).writes.map( ( w ) => [ w.attr, w.value ] ), [ [ 'iconSource', 'lucide' ], [ 'iconName', 'check' ] ] );
	const own = iconDecisions( { svg: { markup: '<svg viewBox="0 0 24 24"><path d="M2 2h9v9H2z" fill="currentColor"/></svg>' }, schema, requireSvg: false } );
	assert.ok( own.unmapped.some( ( u ) => /iconSvg/.test( u.reason ) ), JSON.stringify( own.unmapped ) );
} );

test( 'MUST FAIL: no marker element at any item is the marker type none, written only where the DB lists it', () => {
	const r = marker( {} );
	assert.deepEqual( r.writes, [ { attr: 'markerType', value: 'none', merge: 'replace' } ] );
	assert.equal( marker( {}, 'sgs/icon-list', cal, { items, markerType: 'none' } ).writes.length, 0, 'a value the node already holds is not written again' );
} );

test( 'MUST FAIL: a painted mark with no content at every item is a bullet and digits counting up from 1 are numbered', () => {
	assert.equal( marker( { [ MARK( 1 ) ]: { words: '' }, [ MARK( 2 ) ]: { words: '' } } ).writes.find( ( x ) => 'markerType' === x.attr )?.value, 'bullet' );
	assert.equal( marker( { [ MARK( 1 ) ]: { words: '1' }, [ MARK( 2 ) ]: { words: '2.' } } ).writes.find( ( x ) => 'markerType' === x.attr )?.value, 'numbered' );
	assert.match( marker( { [ MARK( 1 ) ]: { words: '2' }, [ MARK( 2 ) ]: { words: '3' } } ).notes.join(), /differ/, 'numbers that do not start at 1 choose nothing' );
} );

test( 'negative control: items whose markers differ choose no marker type; a block with no marker part or no icon item keeps its settings', () => {
	assert.match( marker( { [ MARK( 1 ) ]: { svg: { markup: LUCIDE } }, [ MARK( 2 ) ]: { words: '' } } ).notes.join(), /differ/ );
	assert.deepEqual( marker( {}, 'sgs/heading' ), { writes: [], unmapped: [], notes: [] } );
	assert.deepEqual( marker( { [ MARK( 1 ) ]: { svg: { markup: LUCIDE } } }, 'sgs/icon-list', { settings: { itemFontSize: { slot: ITEM( 1 ) } } } ), { writes: [], unmapped: [], notes: [] } );
} );

test( 'MUST FAIL: Fill writes the item markers it reads at the marker parts', () => {
	const THREE = [ 375, 768, 1440 ];
	const FIVE = [ 375, 768, 1024, 1440, 1920 ];
	const BASE = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'background-color': 'rgba(0, 0, 0, 0)' };
	const read = ( extra = {} ) => ( { styles: { ...BASE }, pseudo: {}, rect: { x: 0, y: 0, w: 24, h: 24 }, inFlow: true, words: '', href: null, ...extra } );
	const skeleton = [ { name: 'sgs/icon-list', draftRef: 'main', draftSlots: { [ MARK( 1 ) ]: 'svg', [ MARK( 2 ) ]: 'svg' }, attributes: { items: items.map( ( i ) => ( { ...i } ) ) } } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'il' );
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': read(), [ `0:${ MARK( 1 ) }` ]: read( { svg: { markup: LUCIDE, position: 'only' } } ), [ `0:${ MARK( 2 ) }` ]: read( { svg: { markup: LUCIDE, position: 'only' } } ) } ] ) );
	const reads = { widths, declared: Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': {}, [ `0:${ MARK( 1 ) }` ]: {}, [ `0:${ MARK( 2 ) }` ]: {} } ] ) ), sweep: {}, origin: 'http://127.0.0.1:1' };
	const calFor = ( b ) => ( 'sgs/icon-list' === b ? { ...cal, elements: { '': Object.fromEntries( THREE.map( ( w ) => [ w, { ...BASE } ] ) ) }, discovered: {} } : null );
	fillTree( { tree, nodes: skeletonNodes( skeleton ), reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	assert.deepEqual( tree[ 0 ].attributes.items.map( ( i ) => [ i.iconSource, i.iconName ] ), [ [ 'lucide', 'check' ], [ 'lucide', 'check' ] ] );
	assert.equal( tree[ 0 ].attributes.markerType, 'icon' );
} );

// A setting can list the marker part as measured from another anchor (a hover reading, `.x__item:nth-of-type(1) > .x__icon`,
// without the block's root step) beside the block's own form; the marker slots follow the node's measured slots, not the shortest.
const SHORT = ( k ) => `.sgs-icon-list__item:nth-of-type(${ k }) > .sgs-icon-list__icon`;
const twoForms = { block: 'sgs/icon-list', settings: { ...cal.settings, iconColourHover: { slot: MARK( 1 ), slots: [ MARK( 1 ), SHORT( 1 ) ] }, iconSvgHover: { slot: `${ SHORT( 1 ) } > svg`, slots: [ `${ SHORT( 1 ) } > svg` ] } } };

test( 'MUST FAIL: a marker part also listed from another anchor does not hide the node\'s measured marker slots', () => {
	assert.equal( markerPart( twoForms.settings ), SHORT( 1 ), 'the shortest form is the other anchor\'s' );
	assert.deepEqual( markerSlots( { cal: twoForms, slots: [ '', MARK( 1 ), MARK( 2 ), MARK( 3 ) ] } ), { 1: MARK( 1 ), 2: MARK( 2 ), 3: MARK( 3 ) } );
	const r = marker( { [ MARK( 1 ) ]: { words: '✦' }, [ MARK( 2 ) ]: { words: '→' } }, 'sgs/icon-list', twoForms );
	assert.deepEqual( r.writes.find( ( w ) => 'items' === w.attr ).value.map( ( i ) => [ i.iconSource, i.iconName ] ), [ [ 'emoji', '✦' ], [ 'emoji', '→' ] ] );
	assert.equal( r.writes.find( ( w ) => 'markerType' === w.attr ).value, 'emoji' );
} );

test( 'negative control: slots measured from the other anchor pair with that form, and a calibration with one form is unchanged', () => {
	assert.deepEqual( markerSlots( { cal: twoForms, slots: [ SHORT( 1 ), SHORT( 2 ) ] } ), { 1: SHORT( 1 ), 2: SHORT( 2 ) } );
	assert.deepEqual( markerSlots( { cal, slots: [ MARK( 1 ), MARK( 2 ) ] } ), { 1: MARK( 1 ), 2: MARK( 2 ) } );
	assert.deepEqual( markerSlots( { cal: twoForms, slots: [ '', ITEM( 1 ) ] } ), {} );
} );

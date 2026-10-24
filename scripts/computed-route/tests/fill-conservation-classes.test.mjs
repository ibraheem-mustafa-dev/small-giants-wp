// No silent drops (register row R7, FR-48-8): each class of declared read the header run dropped ends written, held or
// unwritten in the run's outcomes. A settled read answers at its own widths; a value read on one element and written on
// another stays answered at the element it was read on; the widths the resolver leaves out as already shown are settled
// as equal; a row lift's icon keeps its settled, row-held and raised rows; a row a later pass takes out of UNMAPPED is a
// settled row naming the pass; a declared property the collector reads only in some layouts is read anyway.
import test from 'node:test';
import assert from 'node:assert/strict';
import { conservation } from '../lib/census-conservation.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { passSettled, SETTLED } from '../lib/fill-report.mjs';
import { unreadDeclared } from '../lib/fill-declared.mjs';
import { unreadProperties } from '../lib/intake-missing.mjs';
import { expandSiteInfoRows, skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs, refOf, walk } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const THREE = [ 375, 768, 1440 ];
const tiers = ( paint ) => Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) );
const setting = ( property, extra = {} ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state: null, forms: [], transform: null, reachedAt: THREE, effects: [], variants: [ 0 ], ...extra } );
const DEFAULT = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'line-height': '24px', 'row-gap': '0px', 'column-gap': '0px', 'box-sizing': 'content-box' };
const snap = ( styles, words = '' ) => ( { styles: { ...DEFAULT, ...styles }, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words, href: null } );

// The read set of a fillTree run: one row per declared property, width and target (lib/census-reads.mjs::readSetFile's shape).
function readSet( out, tree, nodes, declared ) {
	const refs = [];
	walk( tree, ( n, i ) => ( refs[ i ] = refOf( n ) ) );
	const rows = [];
	for ( const [ w, byId ] of Object.entries( declared ) ) {
		for ( const [ id, props ] of Object.entries( byId ) ) {
			const index = Number( id.split( ':' )[ 0 ] );
			for ( const [ property, value ] of Object.entries( props ) ) {
				rows.push( { draft: id, node: refs[ index ], block: nodes[ index ].name, slot: id.slice( id.indexOf( ':' ) + 1 ), property, width: Number( w ), value } );
			}
		}
	}
	return rows;
}
const verdict = ( out, tree, nodes, declared ) => conservation( { reads: readSet( out, tree, nodes, declared ), report: { writes: out.writes, confirm: [], alreadyHeld: out.alreadyHeld, ledger: [], settled: out.settled || [] }, unmapped: out.unmapped } );

function run( skeleton, spec, declared, cal ) {
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, {} ] ) );
	for ( const [ id, s ] of Object.entries( spec ) ) {
		FIVE.forEach( ( w ) => ( widths[ w ][ id ] = 'function' === typeof s ? s( w ) : s ) );
	}
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const nodes = skeletonNodes( skeleton );
	const out = fillTree( { tree, nodes, reads: { widths, declared, sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot, calFor: ( b ) => cal[ b ] ?? null, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { out, tree, nodes, v: verdict( out, tree, nodes, declared ) };
}
const atAll = ( decl ) => Object.fromEntries( THREE.map( ( w ) => [ w, decl ] ) );

test( 'MUST FAIL: a declared value the element already shows (the block default) is settled as equal with its widths, and that settled row conserves the read', () => {
	const cal = { 'sgs/text': { block: 'sgs/text', elements: { '': tiers( DEFAULT ) }, settings: { textColour: setting( 'color', { forms: [ 'hex', 'slug' ] } ) }, discovered: {} } };
	const { out, v } = run( [ { name: 'sgs/text', draftRef: '.a', attributes: { text: 'A' } } ], { '0:': snap( {}, 'A' ) }, atAll( { '0:': { color: 'rgb(20, 20, 20)' } } ), cal );
	const row = out.settled.find( ( s ) => 'color' === s.property );
	assert.equal( row?.reason, 'equal' );
	assert.deepEqual( row.widths, THREE, 'the settled row names the widths it answers' );
	assert.deepEqual( v.failures, [], 'no declared read is dropped' );
} );

test( 'MUST FAIL: a settled row answers its own widths only', () => {
	const read = ( width ) => ( { draft: 'x', node: 'n', block: 'b', slot: '', property: 'color', width, value: 'red' } );
	const out = conservation( { reads: [ read( 375 ), read( 1440 ) ], report: { writes: [], confirm: [], alreadyHeld: [], ledger: [], settled: [ { node: 'n', slot: '', property: 'color', widths: [ 375 ], reason: 'equal' } ] }, unmapped: [] } );
	assert.deepEqual( out.failures.map( ( f ) => f.width ), [ 1440 ] );
} );

test( 'MUST FAIL: a write answers every read width it leaves showing the draft value, beyond the tiers it changes', () => {
	const cal = { 'sgs/text': { block: 'sgs/text', elements: { '': tiers( DEFAULT ) }, settings: { fontSize: setting( 'font-size' ) }, discovered: {} } };
	const size = ( w ) => snap( { 'font-size': 1440 <= w ? '20px' : '16px' }, 'A' );
	const declared = Object.fromEntries( THREE.map( ( w ) => [ w, { '0:': { 'font-size': 1440 <= w ? '20px' : '16px' } } ] ) );
	const { out, v } = run( [ { name: 'sgs/text', draftRef: '.a', attributes: { text: 'A' } } ], { '0:': size }, declared, cal );
	const write = out.writes.find( ( w ) => 'font-size' === w.prop );
	assert.ok( write, 'font-size is written' );
	assert.ok( THREE.some( ( w ) => ! write.widths.includes( w ) ), `the write's widths are the tiers it changes (${ write.widths })` );
	assert.deepEqual( write.answers, THREE, 'it answers every read width' );
	assert.equal( out.settled.filter( ( s ) => 'font-size' === s.property ).length, 0, 'no width is claimed as already shown' );
	assert.deepEqual( v.failures, [] );
} );

test( 'MUST FAIL: a value read on the root and written on the inner element that holds its setting stays answered on the root (readSlot)', () => {
	const INNER = '.sgs-container__inner';
	const cal = { 'sgs/container': { block: 'sgs/container', elements: { '': tiers( DEFAULT ), [ INNER ]: tiers( { ...DEFAULT, display: 'flex' } ) }, settings: { gap: setting( 'gap', { slot: INNER, slots: [ INNER ], reaches: [ INNER ] } ) }, discovered: {} } };
	const flex = snap( { display: 'flex', 'row-gap': '12px', 'column-gap': '12px' } );
	flex.layoutChildren = 2;
	const { out, v } = run( [ { name: 'sgs/container', draftRef: 'main', attributes: {} } ], { '0:': flex }, atAll( { '0:': { 'row-gap': '12px' } } ), cal );
	const hit = [ ...out.writes.filter( ( w ) => 'row-gap' === w.prop ), ...( out.settled || [] ).filter( ( s ) => 'row-gap' === s.property ) ].find( ( r ) => INNER === r.slot );
	assert.ok( hit, `row-gap lands on the inner element (writes ${ JSON.stringify( out.writes.map( ( w ) => [ w.prop, w.slot ] ) ) })` );
	assert.equal( hit.readSlot, '', 'the row names the root it was read on' );
	assert.deepEqual( v.failures.filter( ( f ) => 'row-gap' === f.property ), [] );
} );

test( 'MUST FAIL: a scoped rule\'s write names the property and element it answers (covers, readSlot)', () => {
	const read = { draft: 'x', node: 'n', block: 'b', slot: '.burger', property: 'align-items', width: 375, value: 'flex-end' };
	const label = { node: 'n', slot: '', prop: 'width ladder (align-items): scoped @media rule', attr: 'sgsCustomCss', widths: [ 375 ], how: 'width-gate' };
	const without = conservation( { reads: [ read ], report: { writes: [ label ] }, unmapped: [] } );
	assert.equal( without.failures.length, 1, 'a label prop answers nothing' );
	const withIt = conservation( { reads: [ read ], report: { writes: [ { ...label, covers: 'align-items', readSlot: '.burger' } ] }, unmapped: [] } );
	assert.deepEqual( withIt.failures, [] );
} );

test( 'MUST FAIL: an UNMAPPED row raised once for several icons answers each icon it names', () => {
	const read = ( node ) => ( { draft: 'x', node, block: 'sgs/icon', slot: '', property: 'height', width: 768, value: '34px' } );
	const out = conservation( { reads: [ read( 'a' ), read( 'b' ) ], report: {}, unmapped: [ { node: 'b', nodes: [ 'a', 'b' ], slot: '', property: 'height', reason: 'no-setting: x' } ] } );
	assert.deepEqual( out.failures, [] );
} );

test( 'MUST FAIL: a row a later pass answered is a settled row naming the pass, one per node it answered; a kept, re-raised or unanswered row is not', () => {
	const a = { node: 'n1', slot: '', property: 'height', value: '46px', reason: 'no-setting: x' };
	const b = { node: 'n3', nodes: [ 'n2', 'n3' ], slot: '.i', property: 'height', value: '17px', reason: 'no-setting: y' };
	const c = { node: 'n4', slot: '', property: 'width', value: '9px', reason: 'no-setting: z' };
	const answered = [ { ...a, widths: [ 375, 768 ] }, { ...b, node: 'n2', widths: [ 768 ] }, { ...b, widths: [ 768 ] } ];
	const rows = passSettled( [ a, b, c ], [ { ...c, reason: `${ c.reason }; dimension: no` }, { ...b, nodes: undefined } ], 'dimension', answered );
	assert.deepEqual( rows.map( ( r ) => [ r.node, r.slot, r.property, r.reason, r.widths ] ), [ [ 'n1', '', 'height', 'dimension', [ 375, 768 ] ], [ 'n2', '.i', 'height', 'dimension', [ 768 ] ] ], 'n3 the pass left, and c it re-raised, are not settled' );
	assert.ok( [ 'logo-size', 'width-ladder', 'dimension', 'row-held' ].every( ( r ) => SETTLED.includes( r ) ) );
} );

test( 'MUST FAIL: a declared property of Fill\'s list the snapshot holds no value for (a sticky top) is read beside it; one it holds is not', () => {
	const declared = { position: 'sticky', top: '0px', 'z-index': '200' };
	const styles = { position: 'sticky', 'z-index': '200' };
	assert.deepEqual( Object.keys( unreadDeclared( declared, styles, [ 'position', 'top', 'z-index' ] ) ), [ 'top' ] );
} );

// The Site Info row lift: three generated icons whose shared look the row holds.
const SHAPE = '.sgs-icon:nth-of-type(1) > .sgs-icon__link > .sgs-icon__shape';
const GLYPH = `${ SHAPE } > .sgs-icon__svg`;
const REST = { display: 'flex', 'background-color': 'rgba(0, 0, 0, 0)', 'border-top-width': '0px', 'border-right-width': '0px', 'border-bottom-width': '0px', 'border-left-width': '0px', 'transition-duration': '0s', width: '32px', 'box-shadow': 'none', 'box-sizing': 'content-box', 'align-items': 'normal' };
const at = ( slot, property, forms = [] ) => ( { slot, slots: [ slot ], property, state: null, forms, transform: null, reachedAt: THREE, effects: [], variants: [ 0, 1 ] } );
const ROW_CAL = { block: 'sgs/social-icons', elements: { '': tiers( { display: 'flex' } ), [ SHAPE ]: tiers( REST ), [ GLYPH ]: tiers( { width: '32px' } ) }, settings: { childIconBackground: at( SHAPE, 'background-color', [ 'hex', 'slug' ] ), childIconShapeSize: at( SHAPE, 'width' ), childIconSize: at( GLYPH, 'width' ) }, discovered: {} };
const ICON_CAL = { block: 'sgs/icon', elements: { '': tiers( REST ), '.sgs-icon__shape': tiers( REST ), '.sgs-icon__shape > .sgs-icon__svg': tiers( { width: '32px' } ) }, settings: { iconSize: at( '.sgs-icon__shape > .sgs-icon__svg', 'width' ), backgroundColour: at( '.sgs-icon__shape', 'background-color', [ 'hex' ] ) }, discovered: {}, link: { linkUrl: { path: '', attr: 'href' } } };

function rowRun( { iconCal = ICON_CAL, linkExtra = {} } = {} ) {
	const skeleton = expandSiteInfoRows( [ { name: 'sgs/social-icons', attributes: {}, draftRef: '.row', siteInfoRow: [ 'instagram', 'google', 'whatsapp' ], childRefs: { instagram: 'a.ig', google: 'a.gg', whatsapp: 'a.wa' } } ] );
	const nodes = skeletonNodes( skeleton );
	const tree = cleanTree( skeleton );
	addRefs( tree, 'footer' );
	const glyph = ( i ) => nodes[ i ].targets.find( ( t ) => '' !== t.slot ).id;
	const link = { ...REST, 'background-color': 'rgb(255, 255, 255)', width: '40px', height: '40px', 'box-sizing': 'border-box', 'align-items': 'center', fill: 'rgb(1, 2, 3)', 'border-top-left-radius': '50%', 'border-top-right-radius': '50%', 'border-bottom-right-radius': '50%', 'border-bottom-left-radius': '50%', ...linkExtra };
	const box = ( styles, w ) => ( { styles, pseudo: {}, rect: { x: 0, y: 0, w, h: w }, inFlow: true, words: '', href: null } );
	const byWidth = () => ( { '0:': box( { display: 'flex' }, 300 ), ...Object.fromEntries( [ 1, 2, 3 ].flatMap( ( i ) => [ [ `${ i }:`, box( link, 40 ) ], [ glyph( i ), box( { width: '18px', 'box-sizing': 'content-box', fill: 'rgb(1, 2, 3)' }, 18 ) ] ] ) ) } );
	// What the draft's code declares on each icon: its size, background and circle (the row holds them), a box sizing and
	// alignment and a glyph fill no icon setting holds.
	const declared = Object.fromEntries( THREE.map( ( w ) => [ w, Object.fromEntries( [ 1, 2, 3 ].flatMap( ( i ) => [ [ `${ i }:`, { width: '40px', height: '40px', 'background-color': 'rgb(255, 255, 255)', 'box-sizing': 'border-box', 'align-items': 'center', 'border-top-left-radius': '50%', 'border-top-right-radius': '50%', 'border-bottom-right-radius': '50%', 'border-bottom-left-radius': '50%', ...linkExtra } ], [ glyph( i ), { width: '18px', 'box-sizing': 'content-box', fill: 'rgb(1, 2, 3)' } ] ] ) ) ] ) );
	const reads = { widths: Object.fromEntries( FIVE.map( ( w ) => [ w, byWidth() ] ) ), declared, sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes, reads, db, snapshot, rawSnapshot: {}, calFor: ( b ) => ( 'sgs/icon' === b ? iconCal : ROW_CAL ), ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { out, tree, nodes, v: verdict( out, tree, nodes, declared ) };
}

test( 'MUST FAIL: every declared read of a row lift\'s icons ends written, held or unwritten', () => {
	const { v } = rowRun();
	assert.deepEqual( v.failures.map( ( f ) => `${ f.node } ${ f.slot || '(root)' } ${ f.property }@${ f.width }` ), [] );
} );

test( 'MUST FAIL: a value the row holds for an icon is a row-held settled row on that icon, and its own reads\' settled rows are carried', () => {
	const { out, tree } = rowRun();
	const icons = [];
	walk( tree, ( n, i ) => i > 0 && icons.push( refOf( n ) ) );
	for ( const ref of icons ) {
		assert.ok( out.settled.some( ( s ) => s.node === ref && 'row-held' === s.reason && 'width' === s.property && '' === s.slot ), `${ ref } names the size the row holds` );
		assert.ok( out.settled.some( ( s ) => s.node === ref && 'row-held' === s.reason && 'border-radius' === s.property && '' === s.slot ), `${ ref } names the circle the row holds` );
		assert.ok( out.settled.some( ( s ) => s.node === ref && 'equal' === s.reason && 'display' === s.property && '' === ( s.readSlot ?? s.slot ) ), `${ ref } keeps its read's equal display, read on the root` );
	}
} );

test( 'MUST FAIL: an icon\'s UNMAPPED row names the element it was read on and every icon that raised it', () => {
	const { out, tree } = rowRun();
	const icons = [];
	walk( tree, ( n, i ) => i > 0 && icons.push( refOf( n ) ) );
	const fill = out.unmapped.filter( ( u ) => 'fill' === u.property && 'sgs/icon' === u.block );
	assert.ok( fill.length >= 1, `the fill no icon setting holds is raised (unmapped ${ JSON.stringify( out.unmapped.map( ( u ) => [ u.property, u.slot ] ) ) })` );
	assert.ok( fill.every( ( u ) => [ '', '.sgs-icon__shape > .sgs-icon__svg' ].includes( u.slot ) ), `on a read slot, not a calibrated path (${ fill.map( ( u ) => u.slot ) })` );
	assert.deepEqual( [ ...new Set( fill.flatMap( ( u ) => u.nodes || [ u.node ] ) ) ].sort(), [ ...icons ].sort() );
} );

test( 'MUST FAIL: a direction or column count in the draft is not reported as read and carried (Fill reads the context properties only to judge others)', () => {
	assert.deepEqual( unreadProperties( [ 'direction', 'column-count', 'column-width', 'color' ] ), [ 'column-count', 'column-width', 'direction' ] );
} );

test( 'MUST FAIL: an icon property one calibrated slot leaves unwritten is not also called equal because another slot\'s default paints it', () => {
	// The shape element sits at two slots (the colour on the root, the background on the shape); the root shrinks (1), the
	// shape does not (0), and the draft link does not shrink: the root's verdict, unwritten, stands for the read.
	const cal = { ...ICON_CAL, elements: { ...ICON_CAL.elements, '': tiers( { ...REST, 'flex-shrink': '1' } ), '.sgs-icon__shape': tiers( { ...REST, 'flex-shrink': '0' } ) }, settings: { ...ICON_CAL.settings, iconColour: at( '', 'color', [ 'hex' ] ) } };
	const { out, v } = rowRun( { iconCal: cal, linkExtra: { 'flex-shrink': '0' } } );
	const shrink = ( rows ) => rows.filter( ( r ) => 'flex-shrink' === r.property && 'sgs/icon' === r.block );
	assert.ok( shrink( out.unmapped ).length >= 1, `the root's verdict is raised (unmapped ${ JSON.stringify( shrink( out.unmapped ) ) })` );
	assert.deepEqual( shrink( out.settled ).filter( ( s ) => 'equal' === s.reason && '' === ( s.readSlot ?? s.slot ) ), [], 'no equal row answers the root read' );
	assert.deepEqual( v.failures.filter( ( f ) => 'flex-shrink' === f.property ), [] );
} );

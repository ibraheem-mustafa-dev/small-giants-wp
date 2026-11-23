// A slot the general pairing writes (lib/skeleton-part-pairing.mjs) is one Fill reads: a choice tile the pairing names at a
// tiles field's calibrated tile slots has its background and corners resolved to the tile settings, from the field's real
// calibration. It is read for mamas-test from the gitignored cache: a worktree whose cache holds no mamas-test paint of
// sgs/form-field-tiles skips these tests and says why, rather than failing on a missing file.
import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { loadCalibration } from '../lib/cache.mjs';
import { FIXTURE_RECORDS } from '../tools/record-fixtures.mjs';

const db = openDb();
// The checked-in record (tests/fixtures/records/mamas-munches-redesign/form-field-tiles.record.json.gz, tools/record-fixtures.mjs).
const CAL = loadCalibration( FIXTURE_RECORDS, 'sgs/form-field-tiles', 'mamas-munches-redesign' );
if ( ! CAL?.elements?.[ '' ] ) {
	throw new Error( 'no fixture record of sgs/form-field-tiles for mamas-munches-redesign: node tools/record-fixtures.mjs --client mamas-munches-redesign --blocks sgs/form-field-tiles' );
}
const test = nodeTest;
const W = [ 375, 768, 1024, 1440, 1920 ];
const BOX = { display: 'flex', color: 'rgb(58, 42, 34)', 'font-size': '16px', 'line-height': '24px', 'border-top-style': 'solid', 'border-right-style': 'solid', 'border-bottom-style': 'solid', 'border-left-style': 'solid' };
const tileSlots = () => Object.values( CAL.settings ).find( ( s ) => 'background-color' === s.property && ( s.slots || [] ).length > 1 && /:nth-of-type\(2\)/.test( s.slots.join( ' ' ) ) )?.slots ?? [];

function run( slots ) {
	const sk = [ { name: 'sgs/form-field-tiles', draftRef: '.field', attributes: {}, draftSlots: Object.fromEntries( slots.map( ( s, i ) => [ s, `.t${ i }` ] ) ), innerBlocks: [] } ];
	const tree = cleanTree( sk );
	addRefs( tree, 'fx' );
	const tile = { ...BOX, 'background-color': 'rgb(255, 250, 240)', 'border-top-left-radius': '14px', 'border-top-right-radius': '14px', 'border-bottom-right-radius': '14px', 'border-bottom-left-radius': '14px' };
	const el = ( styles ) => ( { styles, pseudo: {}, rect: { x: 0, y: 0, w: 580, h: 66 }, inFlow: true, words: '', href: null } );
	const widths = Object.fromEntries( W.map( ( w ) => [ w, { '0:': el( { ...BOX, display: 'grid' } ), ...Object.fromEntries( slots.map( ( s ) => [ `0:${ s }`, el( tile ) ] ) ) } ] ) );
	const out = 	fillTree( { tree, nodes: skeletonNodes( sk ), reads: { widths, declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: { settings: {} }, calFor: ( b ) => ( 'sgs/form-field-tiles' === b ? CAL : null ), ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return tree;
}
// Fill writes into the tree it is given.
const written = ( tree ) => JSON.stringify( tree[ 0 ].attributes );

test( 'MUST FAIL without the slots: a tile the pairing names at the tile slots has its background written to the tile setting', () => {
	const slots = tileSlots();
	assert.ok( slots.length >= 2, 'the calibration holds the tile background at two tile positions' );
	const read = run( slots );
	const bg = Object.entries( CAL.settings ).find( ( [ , s ] ) => s.slots === slots || ( s.slots || [] ).join() === slots.join() )?.[ 0 ];
	assert.match( written( read ), new RegExp( `"${ bg }"` ), `the tile setting ${ bg } is written: ${ written( read ) }` );
	assert.doesNotMatch( written( run( [] ) ), new RegExp( `"${ bg }"` ), 'negative control: with no slot the tile background is not written' );
} );

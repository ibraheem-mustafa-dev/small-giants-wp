// Proves the Site Info fallback (icon plan, Bean's ruling): an icon bound to Site Info keeps the draft's address in its
// link setting as the fallback and Fill reports that address as a `site-info` handover entry; an unbound node gets its
// link and no entry.
import test from 'node:test';
import assert from 'node:assert/strict';
import { linkDecisions } from '../lib/fill-presence.mjs';

const CAL = { link: { linkUrl: { path: '', attr: 'href' } } };
const bound = ( key ) => ( { metadata: { bindings: { linkUrl: { source: 'sgs/site-info', args: { key } } } } } );

test( 'a node bound to Site Info keeps the draft address as its link and reports it for Site Info', () => {
	const r = linkDecisions( { calibration: CAL, attributes: bound( 'socials.instagram' ), slots: { '': 'https://instagram.com/eyecare' }, origin: 'http://x' } );
	assert.deepEqual( r.writes, [ { attr: 'linkUrl', value: 'https://instagram.com/eyecare', merge: 'replace' } ] );
	assert.deepEqual( r.handover, [ { attr: 'linkUrl', slot: '', siteInfoKey: 'socials.instagram', address: 'https://instagram.com/eyecare' } ] );
} );

test( 'NEGATIVE: an unbound node gets its link and no handover entry', () => {
	const r = linkDecisions( { calibration: CAL, attributes: {}, slots: { '': 'https://instagram.com/eyecare' }, origin: 'http://x' } );
	assert.equal( r.writes.length, 1 );
	assert.deepEqual( r.handover, [] );
} );

test( 'NEGATIVE: a bound node whose draft has no link gets no entry; a binding to another source is not Site Info', () => {
	assert.deepEqual( linkDecisions( { calibration: CAL, attributes: bound( 'phone' ), slots: { '': '#' }, origin: 'http://x' } ).handover, [] );
	const other = { metadata: { bindings: { linkUrl: { source: 'core/post-meta', args: { key: 'x' } } } } };
	assert.deepEqual( linkDecisions( { calibration: CAL, attributes: other, slots: { '': '/a/' }, origin: 'http://x' } ).handover, [] );
} );

// Through fillTree: the handover entry carries the node ref, the block, the Site Info key and the draft address.
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';

const WIDTHS = [ 375, 768, 1024, 1440, 1920 ];
const STYLES = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'font-weight': '400', 'line-height': '24px', 'letter-spacing': 'normal', 'text-transform': 'none', 'background-color': 'rgba(0, 0, 0, 0)', 'box-shadow': 'none' };
const ICON_CAL = { block: 'sgs/icon', elements: { '': Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, STYLES ] ) ) }, settings: {}, discovered: {}, link: { linkUrl: { path: '', attr: 'href' } } };

function fillIcon( attributes, href ) {
	const skeleton = [ { name: 'sgs/icon', draftRef: 'a', attributes } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const one = { styles: STYLES, pseudo: {}, rect: { x: 0, y: 0, w: 40, h: 40 }, inFlow: true, words: '', href };
	const reads = { widths: Object.fromEntries( WIDTHS.map( ( w ) => [ w, { '0:': one } ] ) ), declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes: skeletonNodes( skeleton ), reads, db: openDb(), snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: () => ICON_CAL, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { tree, ...out };
}

test( 'fillTree: a bound icon gets the draft link and one site-info handover entry; an unbound icon gets the link only', () => {
	const b = fillIcon( { iconSource: 'brand', brandName: 'instagram', ...bound( 'socials.instagram' ) }, 'https://instagram.com/eyecare' );
	assert.equal( b.tree[ 0 ].attributes.linkUrl, 'https://instagram.com/eyecare' );
	assert.equal( b.handover.length, 1 );
	assert.equal( b.handover[ 0 ].owner, 'site-info' );
	assert.equal( b.handover[ 0 ].kind, 'link' );
	assert.equal( b.handover[ 0 ].block, 'sgs/icon' );
	assert.deepEqual( b.handover[ 0 ].evidence, { key: 'linkUrl', draft: 'https://instagram.com/eyecare', width: 1440, siteInfoKey: 'socials.instagram', kind: 'link', ref: b.handover[ 0 ].node, path: '' } );
	const u = fillIcon( { iconName: 'truck' }, '/delivery/' );
	assert.equal( u.tree[ 0 ].attributes.linkUrl, '/delivery/' );
	assert.deepEqual( u.handover, [] );
} );

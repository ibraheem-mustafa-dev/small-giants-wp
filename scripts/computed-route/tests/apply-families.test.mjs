// The applier's pure parts: ops, ledger, and the clip and pin families. Run: node --test tests/apply-families.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { clip } from '../lib/apply-family-clip.mjs';
import { pin, withoutPositionRules } from '../lib/apply-family-pin.mjs';
import { ledgerIndex, ledgerMatch } from '../lib/apply-ledger.mjs';
import { foldOps, matches, patchesOf, restoreOf } from '../lib/apply-ops.mjs';
import { openDb } from '../lib/db.mjs';
import { pairsOf, draftUrl } from '../lib/apply-targets.mjs';

const round = ( o = {} ) => ( { styles: { 'border-top-left-radius': '22px', 'border-top-right-radius': '22px', 'border-bottom-right-radius': '22px', 'border-bottom-left-radius': '22px', 'overflow-x': 'hidden', 'overflow-y': 'hidden', ...o } } );
const square = ( o = {} ) => round( { 'border-top-left-radius': '0px', 'border-top-right-radius': '0px', 'border-bottom-right-radius': '0px', 'border-bottom-left-radius': '0px', ...o } );
const open = { 'overflow-x': 'visible', 'overflow-y': 'visible' };
const at = ( f ) => ( { 1440: f, 768: f, 375: f } );
const db = openDb();
const target = { ref: 'cr-ref-x-1', tpl: 'Root/1#0' };

test( 'clip: a rounded clipping draft box writes the overflow setting the DB names', () => {
	const [ item ] = clip.decide( { target, draft: at( round() ), live: at( round( open ) ), block: 'sgs/container', db } );
	assert.equal( item.status, 'op' );
	assert.deepEqual( item.writes, [ { attr: 'overflow', value: 'hidden' } ] );
	assert.equal( item.checks.length, 3 );
} );

test( 'clip: nothing to do when the draft does not clip, or the box is square', () => {
	assert.deepEqual( clip.decide( { target, draft: at( round( open ) ), live: at( round( open ) ), block: 'sgs/container', db } ), [] );
	assert.deepEqual( clip.decide( { target, draft: at( square() ), live: at( square( open ) ), block: 'sgs/container', db } ), [] );
} );

test( 'clip: already clipping is equal; a block with no overflow setting is reported, not forced', () => {
	assert.equal( clip.decide( { target, draft: at( round() ), live: at( round() ), block: 'sgs/container', db } )[ 0 ].status, 'equal' );
	assert.equal( clip.decide( { target, draft: at( round() ), live: at( round( open ) ), block: 'sgs/heading', db } )[ 0 ].status, 'no-setting' );
} );

test( 'clip: a draft that clips at one width cannot be held by one value', () => {
	const draft = { 1440: round(), 768: round( open ), 375: round( open ) };
	assert.equal( clip.decide( { target, draft, live: at( round( open ) ), block: 'sgs/container', db } )[ 0 ].status, 'no-setting' );
} );

const stuck = { styles: { position: 'sticky', top: '120px' } };
const flow = { styles: { position: 'static', top: 'auto' } };
const widths = { 1440: stuck, 768: flow, 375: flow };

test( 'pin: top 120 under an 84 header pins with a 36 gap on desktop only', () => {
	const [ item ] = pin.decide( { target, draft: widths, live: at( { styles: { position: 'sticky', top: 'auto' } } ), saved: {}, block: 'sgs/container', headers: { 1440: 84, 768: 72, 375: 72 } } );
	const get = ( a ) => item.writes.find( ( w ) => w.attr === a ).value;
	assert.deepEqual( get( 'pinEdge' ), { desktop: 'top', tablet: 'none', mobile: 'none' } );
	assert.deepEqual( get( 'pinBelowHeader' ), { desktop: 'on' } );
	assert.deepEqual( get( 'pinGap' ), { desktop: '36px' } );
} );

test( 'pin: a Custom CSS rule standing in for the pin goes with the write; other CSS stays', () => {
	const css = '@media (max-width: 1023px) { & { position: static; } } @media (min-width: 1024px) { & { position: sticky; } }';
	assert.equal( withoutPositionRules( css ), '' );
	assert.equal( withoutPositionRules( `& { color: red; } ${ css }` ), '& { color: red; }' );
	const [ item ] = pin.decide( { target, draft: widths, live: at( flow ), saved: { sgsCustomCss: css }, block: 'sgs/container', headers: { 1440: 84 } } );
	assert.ok( item.writes.some( ( w ) => 'sgsCustomCss' === w.attr && w.unset ) );
} );

test( 'pin: no draft pin, a live pin, or a block with no pin writes nothing', () => {
	assert.deepEqual( pin.decide( { target, draft: at( flow ), live: at( flow ), saved: {}, block: 'sgs/container', headers: {} } ), [] );
	assert.equal( pin.decide( { target, draft: widths, live: at( stuck ), saved: {}, block: 'sgs/container', headers: { 1440: 84 } } )[ 0 ].status, 'equal' );
	assert.equal( pin.decide( { target, draft: widths, live: at( flow ), saved: {}, block: 'sgs/timeline', headers: { 1440: 84 } } )[ 0 ].status, 'no-setting' );
} );

test( 'ledger: a cr-ref row matches its ref and property; a free-text row matches its surface and property', () => {
	const index = ledgerIndex( [
		{ id: 'D-1', scope: 'footer', node: 'cr-ref-footer-22', state: '*', property: 'layout' },
		{ id: 'D-2', scope: 'home', node: 'testimonial avatar', state: '*', property: 'content' },
		{ id: 'D-3', scope: 'every', node: 'floating button', state: 'hover', property: 'background-color, translate' },
	] );
	assert.equal( ledgerMatch( index, { ref: 'cr-ref-footer-22', surface: 'footer', prop: 'layout' } ), 'D-1' );
	assert.equal( ledgerMatch( index, { ref: 'cr-ref-footer-23', surface: 'footer', prop: 'layout' } ), null );
	assert.equal( ledgerMatch( index, { ref: 'cr-ref-home-1', surface: 'home', prop: 'content' } ), 'D-2' );
	assert.equal( ledgerMatch( index, { ref: 'cr-ref-about-1', surface: 'about', state: 'hover', prop: 'translate' } ), 'D-3' );
	assert.equal( ledgerMatch( index, { ref: 'cr-ref-about-1', surface: 'about', state: 'rest', prop: 'translate' } ), null );
} );

test( 'ops: two ops on one block fold into one patch, a whole attribute at a time; a restore puts them back', () => {
	const blocks = { 90: { blocks: { 'cr-ref-x-1': { attrs: { overflow: 'visible', sgsMotion: { v: 1 }, gone: 1 } } } } };
	const base = { postId: 90, ref: 'cr-ref-x-1', block: 'sgs/container' };
	const ops = [
		{ ...base, writes: [ { attr: 'overflow', value: 'hidden' } ] },
		{ ...base, writes: [ { attr: 'sgsMotion', value: { elements: { root: {} } }, merge: 'deep' }, { attr: 'gone', unset: true } ] },
	];
	const [ [ , list ] ] = [ ...patchesOf( foldOps( ops, blocks ) ) ];
	assert.deepEqual( list, [ { match: 'cr-ref-x-1', block: 'sgs/container', set: { overflow: 'hidden', sgsMotion: { v: 1, elements: { root: {} } } }, unset: [ 'gone' ] } ] );
	assert.deepEqual( restoreOf( ops[ 0 ], blocks ).set, { overflow: 'visible' } );
	assert.equal( patchesOf( foldOps( [ { ...base, writes: [ { attr: 'overflow', value: 'visible' } ] } ], blocks ) ).size, 0, 'a value already saved makes no patch' );
} );

test( 'matches: exact, or a pixel length within half a pixel; never a near colour', () => {
	assert.ok( matches( 'hidden', 'hidden' ) );
	assert.ok( matches( '120.2px', '120px' ) );
	assert.ok( ! matches( '121px', '120px' ) );
	assert.ok( ! matches( 'rgb(1, 2, 3)', 'rgb(1, 2, 4)' ) );
	assert.ok( ! matches( undefined, 'hidden' ) );
} );

test( 'targets: pairs come from the config first, then the origin file; hand pairs without a ref are left out', () => {
	const cfg = { pairs: [ { live: '.cr-ref-a-1', draft: { tpl: 'Root/1#0' } }, { live: '.hand-pair .x', draft: { tpl: 'Root/9#0' } } ] };
	const out = pairsOf( cfg, { 'cr-ref-a-1': { tpl: 'Root/2#0' }, 'cr-ref-a-2': { tpl: 'Root/3#0' } } );
	assert.deepEqual( out.map( ( p ) => [ p.ref, p.tpl, p.via ] ), [ [ 'cr-ref-a-1', 'Root/1#0', 'pair' ], [ 'cr-ref-a-2', 'Root/3#0', 'origin' ] ] );
	assert.equal( draftUrl( 'http://127.0.0.1:57270/#/about', 'http://127.0.0.1:5181/' ), 'http://127.0.0.1:5181/#/about' );
} );

test( 'records: a pair finds its records by draft file and id; a state record gives its look', async () => {
	const { draftId, recordIndex, recordsFor, stateLook } = await import( '../lib/apply-records.mjs' );
	assert.deepEqual( draftId( 'Root>EnquiryForm@468#0/6#0' ), { dc: 'EnquiryForm', id: '6', instance: 0 } );
	assert.deepEqual( draftId( 'Root/231#2' ), { dc: 'Root', id: '231', instance: 2 } );
	const hover = { id: 'TR-1', element: { dc: 'Main', template_tpl_id: '231' }, trigger: { type: 'hover' }, duration_ms: 'per property', properties: [ { property: 'color', from: null, to: '#fff', duration_ms: 200, easing: 'ease' } ] };
	const many = { id: 'A-1', element: { dc: 'Main', template_tpl_id: [ '231', '7' ] }, trigger: { type: 'load' }, properties: [] };
	const form = { id: 'A-2', element: { dc: 'EnquiryForm', template_tpl_id: '6' }, trigger: { type: 'state' }, properties: [] };
	const index = recordIndex( [ hover, many, form ], 'Main' );
	assert.deepEqual( recordsFor( index, 'Root/231#1' ).map( ( r ) => r.id ), [ 'TR-1', 'A-1' ] );
	assert.deepEqual( recordsFor( index, 'Root>EnquiryForm@468#0/6#0' ).map( ( r ) => r.id ), [ 'A-2' ] );
	assert.deepEqual( recordsFor( index, 'Root/999#0' ), [] );
	assert.equal( stateLook( hover ).state, 'hover' );
	assert.equal( stateLook( hover ).looks[ 0 ].to, '#fff' );
	assert.equal( stateLook( many ), null );
} );

test( 'records: a selector hook limits a record to the elements that carry it', async () => {
	const { carriesHook } = await import( '../lib/apply-records.mjs' );
	const peek = { element: { selector: '[data-peek]' } };
	const mag = { element: { selector: "document pointermove → e.target.closest('[data-mag]')" } };
	const inside = { element: { selector: "ref setPanelEl → querySelectorAll('[data-anim]')" } };
	assert.equal( carriesHook( peek, { data: [ 'data-dc-tpl', 'data-peek' ] } ), true );
	assert.equal( carriesHook( peek, { data: [ 'data-dc-tpl' ] } ), false, 'a card of the same template without the hook is out' );
	assert.equal( carriesHook( mag, { data: [ 'data-mag' ] } ), true );
	assert.equal( carriesHook( mag, { data: [] } ), false );
	assert.equal( carriesHook( inside, { data: [] } ), true, 'a hook on something inside the element narrows nothing' );
	assert.equal( carriesHook( peek, null ), true, 'an unread element passes' );
} );

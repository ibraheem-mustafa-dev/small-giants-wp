// compareLinks (lib/links.mjs): a live link that Site Info supplies is a handover note, not an href mismatch; every other
// pair still raises the rows it always did.
import test from 'node:test';
import assert from 'node:assert/strict';
import { compareLinks } from '../lib/links.mjs';

const origins = { draft: 'http://draft.test', live: 'http://live.test' };
const draftLink = ( text, href ) => ( { text, href, url: href } );
const liveLink = ( text, href, extra = {} ) => ( { text, href, url: href, ...extra } );
const run = ( d, l ) => compareLinks( d, l, {}, origins, new Set() );

test( 'a live link marked as Site Info\'s is a handover note when its address differs from the draft', () => {
	const rows = run( [ draftLink( 'instagram', 'https://instagram.com/eyecare' ) ], [ liveLink( 'instagram', 'https://instagram.com/live-account', { siteInfoKey: 'socials.instagram' } ) ] );
	assert.equal( rows.length, 1 );
	assert.equal( rows[ 0 ].key, 'handover "instagram"' );
	assert.match( rows[ 0 ].accepted, /Site Info "socials.instagram"/ );
	assert.equal( rows[ 0 ].draft, 'instagram.com/eyecare' );
	assert.equal( rows[ 0 ].live, 'instagram.com/live-account' );
} );

test( 'NEGATIVE: the same difference on a live link with no Site Info marker is still an href row', () => {
	const rows = run( [ draftLink( 'instagram', 'https://instagram.com/eyecare' ) ], [ liveLink( 'instagram', 'https://instagram.com/live-account' ) ] );
	assert.deepEqual( rows.map( ( r ) => r.key ), [ 'href "instagram"' ] );
	assert.equal( rows[ 0 ].accepted, undefined );
} );

test( 'a marked live link whose address equals the draft raises nothing', () => {
	assert.deepEqual( run( [ draftLink( 'instagram', 'https://instagram.com/eyecare' ) ], [ liveLink( 'instagram', 'https://www.instagram.com/eyecare/', { siteInfoKey: 'socials.instagram' } ) ] ), [] );
} );

test( 'a draft link with no live link of that text still yields the missing row', () => {
	const rows = run( [ draftLink( 'instagram', 'https://instagram.com/eyecare' ) ], [ liveLink( 'facebook', 'https://facebook.com/x', { siteInfoKey: 'socials.facebook' } ) ] );
	assert.deepEqual( rows, [ { kind: 'link', key: 'missing "instagram"', draft: 'instagram.com/eyecare', live: 'no link with this text' } ] );
} );

test( 'a marked and an unmarked live link of the same text: the unmarked one decides', () => {
	const rows = run( [ draftLink( 'call', 'tel:+441214440000' ) ], [ liveLink( 'call', 'tel:+441210000000', { siteInfoKey: 'phone' } ), liveLink( 'call', 'tel:+441219999999' ) ] );
	assert.deepEqual( rows.map( ( r ) => r.key ), [ 'href "call"' ] );
} );

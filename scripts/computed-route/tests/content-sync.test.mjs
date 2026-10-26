// content-sync.mjs's plan (lib/content-sync.mjs): which built posts and template copies a mirror's content is written to,
// and when nothing may be written.
import test from 'node:test';
import assert from 'node:assert/strict';
import { planSync, syncTargets, readPhp, writePhp } from '../lib/content-sync.mjs';

const post = ( type, md5, content = 'Yw==' ) => ( { type, md5, content } );

test( 'MUST FAIL: only a post whose content differs is written, with the mirror\'s content', () => {
	const plan = planSync( { posts: { 5: post( 'page', 'a', 'QQ==' ), 6: post( 'page', 'b' ) }, templates: {} }, { posts: { 5: post( 'page', 'z' ), 6: post( 'page', 'b' ) }, templates: {} } );
	assert.deepEqual( plan.posts, { 5: 'QQ==' } );
	assert.equal( plan.same, 1 );
	assert.deepEqual( plan.problems, [] );
} );

test( 'MUST FAIL: a post of another type on each side means the ids diverged, and is a problem', () => {
	const plan = planSync( { posts: { 7: post( 'page', 'a' ) }, templates: {} }, { posts: { 7: post( 'sgs_footer', 'z' ) }, templates: {} } );
	assert.deepEqual( plan.posts, {} );
	assert.match( plan.problems[ 0 ], /ids have diverged/ );
} );

test( 'MUST FAIL: a post missing on either side is a problem, never a write', () => {
	assert.match( planSync( { posts: { 8: null }, templates: {} }, { posts: { 8: post( 'page', 'z' ) }, templates: {} } ).problems[ 0 ], /not on the mirror/ );
	assert.match( planSync( { posts: { 9: post( 'page', 'a' ) }, templates: {} }, { posts: { 9: null }, templates: {} } ).problems[ 0 ], /not on the target site/ );
} );

test( 'a template copy the target lacks is written; one the mirror lacks is a problem', () => {
	const plan = planSync( { posts: {}, templates: { single: { id: 3, md5: 'a', content: 'VA==' }, page: null } }, { posts: {}, templates: { single: null } } );
	assert.deepEqual( plan.templates, { single: 'VA==' } );
	assert.match( plan.problems[ 0 ], /template page has no copy on the mirror/ );
} );

test( 'syncTargets takes each surface\'s post id and template slug once, limited by --only', () => {
	const surfaces = { a: { target: { postId: 1 } }, b: { target: { postId: 1 } }, c: { target: { template: 'single' } }, d: { target: { postId: 4 } } };
	assert.deepEqual( syncTargets( surfaces ), { ids: [ 1, 4 ], templates: [ 'single' ] } );
	assert.deepEqual( syncTargets( surfaces, [ 'd' ] ), { ids: [ 4 ], templates: [] } );
} );

test( 'the write slashes content and the request rides in the code as base64', () => {
	const php = writePhp( { posts: { 5: 'QQ==' }, templates: {} } );
	assert.match( php, /wp_slash\( base64_decode\( \$c \) \)/ );
	assert.match( readPhp( { ids: [ 5 ], templates: [], withContent: true } ), /base64_decode\( '[A-Za-z0-9+/=]+' \)/ );
} );

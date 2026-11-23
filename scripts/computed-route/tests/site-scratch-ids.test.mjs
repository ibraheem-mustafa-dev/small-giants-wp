// A scratch copy of a mirror (calibration-targets `scratchOf`) holds its source's posts and ids, so it counts as the site it
// copies when the page map's ids are read, by lib/site-build-map.mjs::rowsForSite and lib/site-check-site.mjs::rowsFor. Each MUST FAIL
// test turns red under a mutation in tests/site-scratch-ids.mutations.json
// (node scripts/computed-route/tools/mutate.mjs scripts/computed-route scripts/computed-route/tests/site-scratch-ids.mutations.json tests/site-scratch-ids.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { rowsForSite } from '../lib/site-build-map.mjs';
import { rowsFor } from '../lib/site-check-site.mjs';

const rows = [ { slug: 'home', id: 5 } ];
const targets = {
	'local-a': { mirrorOf: 'site-a' },
	'local-scratch': { mirrorOf: 'site-a', scratchOf: 'local-a' },
	'local-scratch-2': { mirrorOf: 'site-a', scratchOf: 'local-scratch' },
	'local-b': { mirrorOf: 'site-b' },
};

test( 'MUST FAIL: a scratch copy keeps its source\'s ids in rowsForSite', () => {
	assert.equal( rowsForSite( rows, 'local-a', 'local-scratch', targets )[ 0 ].id, 5 );
	assert.equal( rowsForSite( rows, 'local-scratch', 'local-a', targets )[ 0 ].id, 5, 'the source keeps the ids recorded for its copy' );
} );

test( 'MUST FAIL: a scratchOf chain resolves to the first source', () => {
	assert.equal( rowsForSite( rows, 'local-a', 'local-scratch-2', targets )[ 0 ].id, 5 );
} );

test( 'rowsForSite drops the ids of an unrelated site, and is unchanged with no targets', () => {
	assert.equal( rowsForSite( rows, 'local-b', 'local-scratch', targets )[ 0 ].id, null );
	assert.equal( rowsForSite( rows, 'local-a', 'local-scratch' )[ 0 ].id, null );
	assert.equal( rowsForSite( rows, 'local-a', 'local-a', targets )[ 0 ].id, 5 );
	assert.equal( rowsForSite( rows, null, 'local-scratch', targets )[ 0 ].id, 5 );
} );

test( 'MUST FAIL: a scratchOf loop ends', () => {
	const loop = { x: { scratchOf: 'y' }, y: { scratchOf: 'x' } };
	assert.equal( rowsForSite( rows, 'x', 'y', loop )[ 0 ].id, 5, 'two names in one loop are the same site' );
	assert.equal( rowsForSite( rows, 'z', 'y', loop )[ 0 ].id, null );
} );

test( 'MUST FAIL: a scratch copy of a mirror shares ids with the mirror\'s test site in rowsFor', () => {
	assert.equal( rowsFor( rows, 'site-a', { site: 'local-scratch', mirrorOf: 'site-a' }, targets )[ 0 ].id, 5, 'the copy keeps its test site\'s ids' );
	assert.equal( rowsFor( rows, 'local-a', { site: 'local-scratch', mirrorOf: 'site-a' }, targets )[ 0 ].id, 5, 'the copy keeps its source mirror\'s ids' );
	assert.equal( rowsFor( rows, 'local-scratch', { site: 'site-a' }, targets )[ 0 ].id, 5, 'the test site keeps the ids its mirror\'s copy wrote' );
	assert.equal( rowsFor( rows, 'local-b', { site: 'local-scratch', mirrorOf: 'site-a' }, targets )[ 0 ].id, null, 'an unrelated mirror\'s ids are dropped' );
	assert.equal( rowsFor( rows, 'site-b', { site: 'local-scratch', mirrorOf: 'site-a' }, targets )[ 0 ].id, null );
	const named = { ...targets, 'test-b': { mirrorOf: 'local-scratch' }, m: { mirrorOf: 'local-scratch' } };
	assert.equal( rowsFor( rows, 'local-a', { site: 'test-b', mirrorOf: 'local-scratch' }, named )[ 0 ].id, 5, 'a mirrorOf that names a scratch copy resolves to its source' );
	assert.equal( rowsFor( rows, 'm', { site: 'local-a' }, named )[ 0 ].id, 5, 'the ids of a site mirroring a scratch copy are kept by its source' );
} );

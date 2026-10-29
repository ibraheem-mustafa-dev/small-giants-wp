// RC14, R-47-4: the route's lint refuses a skeleton module (lib/skeleton-*.mjs, lib/draft-link.mjs, skeleton.mjs) that reads
// an inventory element's snippet or raw style attribute (lint.mjs::skeletonReadProblems); the review carriers may only copy the
// snippet into a review field. Mutations: tests/lint-skeleton-reads.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { skeletonReadProblems } from '../lint.mjs';

test( 'MUST FAIL (RC14): a skeleton module reading the snippet or the raw style attribute is refused; the review carriers may copy the snippet into a review field', () => {
	assert.equal( skeletonReadProblems( 'lib/skeleton-new.mjs', 'const h = /x/.exec( e.snippet || "" );' ).length, 1 );
	assert.equal( skeletonReadProblems( 'lib/draft-link.mjs', 'const s = e?.snippet;' ).length, 1 );
	assert.equal( skeletonReadProblems( 'skeleton.mjs', 'const st = String( e.attrs?.style || "" );' ).length, 1 );
	assert.equal( skeletonReadProblems( 'lib/skeleton-new.mjs', 'const st = e.attrs[ "style" ];' ).length, 1 );
	assert.equal( skeletonReadProblems( 'lib/skeleton-review.mjs', 'const t = e.snippet.slice( 0, 9 );' ).length, 1, 'a carrier may not read it either' );
	assert.deepEqual( skeletonReadProblems( 'lib/skeleton-review.mjs', '`<pre>${ esc( e.snippet ) }</pre>`; const row = { snippet: e.snippet };' ), [], 'negative control: copied into a review field' );
	assert.deepEqual( skeletonReadProblems( 'lib/fill-new.mjs', 'const s = e.snippet;' ), [], 'negative control: not a skeleton module' );
	assert.deepEqual( skeletonReadProblems( 'lib/skeleton-new.mjs', '// e.snippet in a comment\nconst snippet = read.textLeads( e );' ), [], 'negative control: a comment and a local name' );
} );

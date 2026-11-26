// The one validity contract between the stages that write a skeleton and the stages that read it (Spec 48 section 3.3 and R-47-10,
// the 2026-11-24 proof): a writer's output is checked by the validators its consumers use, so a shape a consumer refuses fails
// here, where it is written, and not at Fill or build. Every writer is held to it: the rule table's handovers in
// data/skeleton-decisions.json, the template pieces' placed nodes (lib/template-pieces-context.mjs::placedLint runs the whole
// skeleton check on what a builder adds), and the source of every writer (no literal of a shape a consumer refuses).
// The writers' own tests (skeleton-review-platform, skeleton-numbered-steps, template-piece-order, template-piece-woo-layout)
// each run their real output through the same validators. Tests marked MUST FAIL fail on the shapes the proof found.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { lintSkeleton } from '../lint.mjs';
import { HANDOVER_KINDS, HANDOVER_OWNERS, handoverProblems } from '../lib/fill-handover.mjs';
import { skeletonProblems } from '../lib/fill-skeleton.mjs';
import { placedLint } from '../lib/template-pieces-context.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const ROUTE = path.resolve( HERE, '..' );
const db = openDb();
const decisions = JSON.parse( fs.readFileSync( path.join( ROUTE, 'data', 'skeleton-decisions.json' ), 'utf8' ) );

// Every `handover` the rule table holds, as { at: 'rules.a.b', value }.
function handoversIn( value, at = '', out = [] ) {
	if ( Array.isArray( value ) ) {
		value.forEach( ( v, i ) => handoversIn( v, `${ at }[${ i }]`, out ) );
	} else if ( value && 'object' === typeof value ) {
		for ( const [ k, v ] of Object.entries( value ) ) {
			'handover' === k ? out.push( { at: `${ at }.${ k }`, value: v } ) : handoversIn( v, `${ at }.${ k }`, out );
		}
	}
	return out;
}

test( 'MUST FAIL: every handover in the rule table is a note the writer wraps (a string) or a { owner, kind, detail } object Fill accepts', () => {
	const found = handoversIn( decisions );
	assert.ok( found.length >= 5, 'the walk finds the table\'s handovers' );
	for ( const { at, value } of found ) {
		if ( 'string' === typeof value ) {
			assert.ok( value.trim(), `${ at } is an empty note` );
		} else {
			assert.deepEqual( handoverProblems( [ value ], at ), [], `${ at } is an object, so it is a skeleton handover as it stands` );
		}
	}
} );

test( 'MUST FAIL: each review platform\'s handover is an object with owner site-info and kind presence, never a bare string', () => {
	for ( const p of decisions.rules.reviewPlatform.platforms ) {
		assert.equal( typeof p.handover, 'object', `${ p.name }'s handover is a string` );
		assert.deepEqual( handoverProblems( [ p.handover ], p.name ), [] );
		assert.equal( p.handover.owner, 'site-info' );
		assert.equal( p.handover.kind, 'presence' );
	}
} );

test( 'the handover owners and kinds a writer may name are the lists Fill and Solve share', () => {
	assert.ok( HANDOVER_OWNERS.includes( 'site-info' ) && HANDOVER_KINDS.includes( 'presence' ) );
	assert.ok( ! HANDOVER_KINDS.includes( 'layout' ), 'layout is no handover kind: a layout the draft sets is a setting, written from the draft' );
} );

test( 'MUST FAIL: the skeleton lint refuses a node whose handover is a string or names a kind no consumer knows', () => {
	const tree = ( handover ) => [ { name: 'sgs/google-reviews', attributes: {}, handover, innerBlocks: [] } ];
	assert.match( lintSkeleton( tree( [ 'set the place ID' ] ), db ).join( '\n' ), /handover owner "undefined"/ );
	assert.match( lintSkeleton( tree( [ { owner: 'content-page', kind: 'layout', detail: 'x' } ] ), db ).join( '\n' ), /kind "layout" is not one of/ );
	assert.deepEqual( lintSkeleton( tree( [ { owner: 'site-info', kind: 'presence', detail: 'set the place ID' } ] ), db ), [] );
} );

test( 'MUST FAIL: a node a template piece adds is held to the whole skeleton check, handover and draft keys as well as style values', () => {
	const before = [ { name: 'sgs/container', attributes: {}, innerBlocks: [] } ];
	const badHandover = [ { name: 'sgs/container', attributes: {}, innerBlocks: [ { name: 'sgs/text', attributes: {}, handover: [ { owner: 'content-page', kind: 'layout', detail: 'x' } ], innerBlocks: [] } ] } ];
	assert.match( placedLint( before, badHandover, db ).join( '\n' ), /kind "layout"/ );
	const badKey = [ { name: 'sgs/container', attributes: {}, innerBlocks: [ { name: 'sgs/text', attributes: {}, draftRef: 42, innerBlocks: [] } ] } ];
	assert.ok( placedLint( before, badKey, db ).some( ( p ) => /draftRef/.test( p ) ), 'a draft key Fill cannot read is a problem at placing' );
	assert.deepEqual( placedLint( before, before, db ), [] );
} );

test( 'MUST FAIL: the lint message for a skeleton attribute with a CSS property points a skeleton-decided value to `decided`', () => {
	const bad = [ { name: 'sgs/process-steps', attributes: { headingLevel: 'h3' }, innerBlocks: [] } ];
	const [ one ] = lintSkeleton( bad, db );
	assert.match( one, /carries style value headingLevel: .*travels in the node's decided/ );
	assert.deepEqual( lintSkeleton( [ { name: 'sgs/process-steps', attributes: { layout: 'list' }, decided: { headingLevel: 'h3' }, innerBlocks: [] } ], db ), [] );
	assert.deepEqual( skeletonProblems( [ { name: 'sgs/process-steps', attributes: {}, decided: { headingLevel: 'h3' }, innerBlocks: [] } ] ), [] );
} );

// The shapes the proof found, searched for in every writer's source: a handover typed as a string or a kind no consumer knows, and a
// heading level typed as a number where the block's enum holds "h1" to "h6". Each search returns nothing.
test( 'MUST FAIL: no writer in lib/ types a string handover, the kind layout or a numeric heading level', () => {
	const found = [];
	for ( const file of fs.readdirSync( path.join( ROUTE, 'lib' ) ).filter( ( f ) => f.endsWith( '.mjs' ) ) ) {
		const lines = fs.readFileSync( path.join( ROUTE, 'lib', file ), 'utf8' ).split( /\r?\n/ );
		lines.forEach( ( line, i ) => {
			const code = line.replace( /\/\/.*$/, '' );
			const hit = [
				[ /\bhandover:\s*['"`]/, 'a string handover' ],
				[ /\bhandover\s*=\s*['"`]/, 'a string handover' ],
				[ /\bkind:\s*'layout'/, 'the handover kind layout' ],
				[ /\blevel:\s*\d/, 'a numeric heading level' ],
			].find( ( [ re ] ) => re.test( code ) );
			// The one numeric `level:` outside a skeleton is the gzip level lib/setting-record.mjs writes its record with.
			hit && ! ( 'setting-record.mjs' === file && /zlib\.gzipSync/.test( code ) ) && found.push( `lib/${ file }:${ i + 1 } ${ hit[ 1 ] }` );
		} );
	}
	assert.deepEqual( found, [] );
} );

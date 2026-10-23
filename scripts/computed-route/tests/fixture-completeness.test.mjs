import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { check, cssRules, emitCondition, proposals, varsOf } from '../tools/fixture-completeness.mjs';

const ROOT = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..' );

const PHP = `<?php
$map = array( 'colourHover' => '--sgs-w-colour-hover', 'ringHover' => '--sgs-w-ring-hover', 'plainHover' => '--sgs-w-plain-hover', 'orphanHover' => '--sgs-w-orphan' );
if ( '' !== (string) ( $attributes['linkUrl'] ?? '' ) ) {
	$html .= '<a class="sgs-w__link">';
}
`;
const CSS = `
/* a comment { with brace } */
@media (min-width: 600px) {
	.sgs-w__link:hover .sgs-w__shape { color: var(--sgs-w-colour-hover); }
}
.sgs-w--ringed .sgs-w__shape:hover { outline-color: var(--sgs-w-ring-hover); }
.sgs-w__shape:hover { background: var(--sgs-w-plain-hover); }
`;

// A source folder and cache with one block `w`; `elements` are the rendered selectors of its default paint.
function build( elements ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fixture-completeness-' ) );
	const src = path.join( dir, 'src', 'w' );
	fs.mkdirSync( src, { recursive: true } );
	fs.writeFileSync( path.join( src, 'render.php' ), PHP );
	fs.writeFileSync( path.join( src, 'style.css' ), CSS );
	const cache = path.join( dir, 'cache' );
	fs.mkdirSync( path.join( cache, 'site' ), { recursive: true } );
	fs.writeFileSync( path.join( cache, 'w.json' ), JSON.stringify( { block: 'sgs/w', dead: [ 'colourHover', 'ringHover', 'plainHover', 'orphanHover', 'labelText' ] } ) );
	fs.writeFileSync( path.join( cache, 'site', 'w.paint.json' ), JSON.stringify( { elements: Object.fromEntries( elements.map( ( e ) => [ e, {} ] ) ) } ) );
	return { src: path.join( dir, 'src' ), cache };
}

const verdicts = ( dirs ) => Object.fromEntries( check( { cacheDir: dirs.cache, srcDir: dirs.src } ).map( ( r ) => [ r.attr, r ] ) );

test( 'MUST FAIL: a hover setting whose link element was never rendered is a fixture-gap naming the class and the render.php condition', () => {
	const v = verdicts( build( [ '', '.sgs-w__shape' ] ) );
	assert.equal( v.colourHover.class, 'fixture-gap' );
	assert.deepEqual( v.colourHover.missing, [ 'sgs-w__link' ] );
	assert.deepEqual( v.colourHover.proposal.setAttributes, [ 'linkUrl' ] );
} );

test( 'MUST FAIL: once the fixture renders the link element the same setting is no longer a fixture-gap', () => {
	const v = verdicts( build( [ '', '.sgs-w__link', '.sgs-w__link > .sgs-w__shape' ] ) );
	assert.equal( v.colourHover.class, 'unexplained' );
	assert.match( v.colourHover.why, /rendered by the fixture/ );
} );

test( 'MUST FAIL: a rule that needs only a modifier class is variant-gated, not a fixture-gap', () => {
	const v = verdicts( build( [ '', '.sgs-w__shape' ] ) );
	assert.equal( v.ringHover.class, 'variant-gated' );
	assert.deepEqual( v.ringHover.missing, [ 'sgs-w--ringed' ] );
} );

test( 'MUST FAIL: a rule whose classes are all rendered, or a setting no rule consumes, is unexplained', () => {
	const v = verdicts( build( [ '', '.sgs-w__shape' ] ) );
	assert.equal( v.plainHover.class, 'unexplained' );
	assert.equal( v.orphanHover.class, 'unexplained' );
	assert.match( v.orphanHover.why, /no style.css rule/ );
	assert.equal( v.labelText, undefined, 'a non-hover dead setting is skipped without --all' );
	assert.equal( check( { cacheDir: build( [ '' ] ).cache, srcDir: build( [ '' ] ).src, all: true } ).some( ( r ) => 'labelText' === r.attr ), true );
} );

test( 'MUST FAIL: proposals group the fixture-gaps per missing class and list what each revives', () => {
	const d = build( [ '', '.sgs-w__shape' ] );
	const p = proposals( check( { cacheDir: d.cache, srcDir: d.src } ) );
	assert.equal( p.length, 1 );
	assert.deepEqual( p[ 0 ].render, [ 'sgs-w__link' ] );
	assert.deepEqual( p[ 0 ].revives, [ 'colourHover' ] );
} );

test( 'MUST FAIL: the stylesheet parser descends into at-rules and ignores comments; the variable map reads render.php', () => {
	const rules = cssRules( CSS );
	assert.equal( rules.length, 3 );
	assert.equal( rules[ 0 ].selector, '.sgs-w__link:hover .sgs-w__shape' );
	assert.deepEqual( varsOf( PHP, 'colourHover' ), [ '--sgs-w-colour-hover' ] );
	assert.deepEqual( emitCondition( PHP, 'sgs-w__link' ).attrs, [ 'linkUrl' ] );
} );

test( 'MUST FAIL: the command prints the table and --json carries rows and proposals', () => {
	const d = build( [ '', '.sgs-w__shape' ] );
	const run = ( ...a ) => spawnSync( process.execPath, [ path.join( ROOT, 'tools', 'fixture-completeness.mjs' ), '--cache', d.cache, '--src', d.src, ...a ], { encoding: 'utf8' } );
	const text = run();
	assert.equal( text.status, 0, text.stderr );
	assert.match( text.stdout, /fixture-gap\s+sgs\/w colourHover/ );
	const json = JSON.parse( run( '--json' ).stdout );
	assert.equal( json.proposals.length, 1 );
	assert.equal( json.rows.length, 4 );
} );

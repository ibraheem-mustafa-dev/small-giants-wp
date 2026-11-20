// lib/fill-icon.mjs::lucideNearest: the Lucide icon a hand-drawn mark copies (the same drawing elements, every number within the
// tolerance, in any order of drawing), on a fixture icon file so the verdicts do not depend on the shipped set.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lucideNearest } from '../lib/fill-icon.mjs';

const entry = ( name, inner ) => `\t\t\t'${ name }' => '<!-- @license fixture --><svg class="lucide" viewBox="0 0 24 24" fill="none"> ${ inner } </svg>',`;
const FILE = path.join( fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-lucide-' ) ), 'lucide-icons.php' );
fs.writeFileSync( FILE, [
	entry( 'search', '<path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" />' ),
	entry( 'target-wide', '<circle cx="12" cy="12" r="10.8" /><circle cx="12" cy="12" r="2" />' ),
	entry( 'target', '<circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="2" />' ),
	entry( 'dot', '<circle cx="12" cy="12" r="1" />' ),
	entry( 'dot-copy', '<circle cx="12" cy="12" r="1" />' ),
	entry( 'minus', '<path d="M5 12h14" />' ),
].join( '\n' ) );
const svg = ( inner ) => `<svg width="20" height="20" viewBox="0 0 24 24">${ inner }</svg>`;
const near = ( inner, tolerance = 1 ) => lucideNearest( svg( inner ), tolerance, FILE );

test( 'lucideNearest: a hand-drawn copy within the tolerance is the icon, whatever order its elements are drawn in; MUST FAIL without the match', () => {
	assert.equal( near( '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path>' ), 'search' );
	assert.equal( near( '<path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle>' ), 'search', 'an exact drawing' );
	assert.equal( near( '<path d="M5 12h14"/>' ), 'minus' );
} );

test( 'lucideNearest: a drawing outside the tolerance, with another element count, other path commands or no drawing is no icon; each case MUST FAIL without its guard', () => {
	assert.equal( near( '<circle cx="11" cy="11" r="6"></circle><path d="m20 20-4-4"></path>' ), null, 'a radius two units off' );
	assert.equal( near( '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path>', 0.5 ), null, 'a tighter tolerance refuses the same drawing' );
	assert.equal( near( '<circle cx="12" cy="12" r="10"></circle>' ), null, 'one element where the icon has two' );
	assert.equal( near( '<path d="M5 12v14"/>' ), null, 'other path commands' );
	assert.equal( near( '<path d="M5 12h14v3"/>' ), null, 'a path that runs on past the icon' );
	assert.equal( near( '<path d="M5 12h"/>' ), null, 'a path that stops short of it' );
	assert.equal( near( '<g></g>' ), null, 'no drawing element' );
	assert.equal( lucideNearest( 'not svg', 1, FILE ), null );
} );

test( 'lucideNearest: two different icons equally close is no answer, a nearer one wins; MUST FAIL without the tie rule', () => {
	assert.equal( near( '<circle cx="12" cy="12" r="1"></circle>' ), null, 'dot and dot-copy draw the same' );
	assert.equal( near( '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="2.5"></circle>' ), 'target' );
} );

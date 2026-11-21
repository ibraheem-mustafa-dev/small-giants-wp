// node --test scripts/render-check/tests/clip.test.mjs
// The round-two probe picture is a crop of the viewport. An element the page cannot scroll to (an open menu or drawer
// locks the scroll) lies outside the viewport; its crop must be skipped, never thrown, or the whole state is reported
// unreached (Mama's product, menu and basket drawer states, render check 2026-11-21).
import test from 'node:test';
import assert from 'node:assert/strict';
import { probeClip } from '../lib/clip.mjs';

const view = { width: 375, height: 800 };

test( 'an element in view is cropped with its padding', () => {
	assert.deepEqual( probeClip( { x: 100, y: 200, width: 44, height: 44 }, view ), { x: 84, y: 184, width: 76, height: 76 } );
} );

test( 'MUST FAIL before lib/clip.mjs: an element below a scroll-locked viewport has no crop', () => {
	assert.equal( probeClip( { x: 254, y: 4122.9, width: 22, height: 22 }, view ), null );
} );

test( 'an element off-canvas to the right has no crop', () => {
	assert.equal( probeClip( { x: 400, y: 100, width: 300, height: 40 }, view ), null );
} );

test( 'a crop straddling the viewport edge is cut to the viewport', () => {
	assert.deepEqual( probeClip( { x: 350, y: 780, width: 44, height: 44 }, view ), { x: 334, y: 764, width: 41, height: 36 } );
} );

test( 'a zero-size element has no crop', () => {
	assert.equal( probeClip( { x: 10, y: 10, width: 0, height: 0 }, view ), null );
} );

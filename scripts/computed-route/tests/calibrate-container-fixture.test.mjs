// The container's default paint is measured on a container with no SVG background (the setting record's fixtures.json `sgs/container`).
// A node with bgSvgContent gets `.sgs-container--has-bg-svg { overflow: hidden }`; a fixture that carried the SVG in its base
// attributes recorded that overflow as the default paint of every container, so Fill settled a draft's `overflow: hidden` as
// "already shown" on a container that paints it visible and wrote nothing (the plate photo's ring then lost its clip). The SVG
// case is a paint state, judged against its own paint (lib/paint-state.mjs): the node that carries the SVG.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planInstances } from '../lib/calibrate.mjs';
import { matchesPaintState } from '../lib/paint-state.mjs';
import { recordFixtures } from '../lib/setting-record.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FX = recordFixtures();
const SNAP = { palette: [], spacing: [], fontSizes: [] };
const plan = ( block ) => planInstances( block, { rows: [], enumRows: [], schema: {}, snapshot: SNAP, fixture: FX[ block ] } ).instances;

test( 'MUST FAIL: no default instance of the container carries the SVG background', () => {
	const defaults = plan( 'sgs/container' ).filter( ( i ) => i.isDefault );
	assert.ok( defaults.length >= 5, 'one default instance per variant' );
	for ( const i of defaults ) {
		assert.equal( 'bgSvgContent' in i.attrs, false, `${ i.key } carries bgSvgContent` );
	}
	assert.equal( 'bgSvgContent' in FX[ 'sgs/container' ].attributes, false );
} );

test( 'MUST FAIL: the SVG container is its own paint state, matched by the setting and by nothing else', () => {
	const state = plan( 'sgs/container' ).find( ( i ) => i.paintState?.name === 'bg-svg' );
	assert.ok( state, 'a bg-svg paint instance is planned' );
	assert.match( state.attrs.bgSvgContent, /^<svg /, 'the instance draws the SVG' );
	assert.equal( state.isDefault, undefined );
	assert.equal( matchesPaintState( state.paintState.when, { attributes: { bgSvgContent: '<svg></svg>' } } ), true );
	assert.equal( matchesPaintState( state.paintState.when, { attributes: {} } ), false );
	assert.equal( matchesPaintState( state.paintState.when, { attributes: { bgSvgContent: '' } } ), false );
} );

test( 'a negative control: the hero keeps its own split state, and the container keeps its variants and children', () => {
	assert.ok( plan( 'sgs/hero' ).some( ( i ) => i.paintState?.name === 'split' ) );
	assert.equal( FX[ 'sgs/container' ].variants.length, 5 );
	assert.equal( FX[ 'sgs/container' ].inner.length, 2 );
} );

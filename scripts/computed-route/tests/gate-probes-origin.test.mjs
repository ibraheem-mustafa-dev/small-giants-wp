// A rule's origin, not its selector text, decides whether the live probes treat it as a framework rule: a rule in a
// block's `sgsCustomCss` residual (the `<style id="sgs-custom-css-<uid>">` element plugins/sgs-blocks/includes/custom-css.php
// appends) is the route's own write. Planted control: the same selector in a framework sheet and in a custom-CSS element
// classes differently in the hardcode probe, G5's reach and G6's missing-setting probe.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { chromium } from 'playwright';
import { createProbes } from '../lib/gate-probes.mjs';

const browser = await chromium.launch();
after( () => browser.close() );

const RULE = '.sgs-button-1234abcd { word-spacing: 3px; }';
const EL = '<a class="cr-ref-o sgs-button sgs-button-1234abcd" href="#">Go</a>';
const FRAMEWORK = `<style id="sgs-blocks-css">${ RULE }</style>${ EL }`;
const CUSTOM = `${ EL }<style id="sgs-custom-css-c1">${ RULE }</style>`;
const openWith = ( html ) => async ( { width } ) => {
	const page = await browser.newPage( { viewport: { width, height: 800 } } );
	await page.setContent( html );
	return page;
};
const db = () => {
	const d = new DatabaseSync( ':memory:' );
	d.exec( `CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, css_property TEXT, css_state TEXT, role TEXT, source TEXT, description TEXT, meaning TEXT, attr_type TEXT, enum_values TEXT );
		INSERT INTO block_attributes ( block_slug, attr_name, css_property, css_state, role, source ) VALUES ( 'sgs/button', 'wordGap', 'word-spacing', NULL, 'spacing-token', 'sgs' );` );
	return d;
};
const row = { ref: 'cr-ref-o', key: 'word-spacing', kind: 'style', state: 'rest', width: 1440, path: '', block: 'sgs/button', ancestors: [] };
const probes = ( html ) => createProbes( { db: db(), states: { rest: null }, openPage: openWith( html ), renderBlock: async () => ( { status: 200, html: '<style>.sgs-button-deadbeef{}</style><a></a>' } ) } );

test( 'MUST FAIL G6 hardcode: a winning rule from the block\'s sgsCustomCss is not the framework rule; the same selector in a framework sheet is', async () => {
	const framework = await probes( FRAMEWORK ).probe( row, 'hardcode' );
	assert.equal( framework.rule, '.sgs-button-1234abcd' );
	const custom = await probes( CUSTOM ).probe( row, 'hardcode' );
	assert.equal( custom.rule, null, 'a custom-CSS rule never stands as the framework rule that wins' );
	assert.match( custom.evidence, /\.sgs-button-1234abcd \(the block's own sgsCustomCss\)/ );
} );

test( 'MUST FAIL G5 and G6 missing setting: a custom-CSS rule is no framework emission or setting rule; the framework rule is', async () => {
	const setting = { block: 'sgs/button', attr: 'wordGap' };
	assert.equal( ( await probes( FRAMEWORK ).measure( row, setting ) ).reaches, true );
	assert.equal( ( await probes( CUSTOM ).measure( row, setting ) ).reaches, false );
	assert.equal( ( await probes( FRAMEWORK ).probe( row, 'missing-setting' ) ).changed, true );
	const custom = await probes( CUSTOM ).probe( row, 'missing-setting' );
	assert.equal( custom.changed, false );
} );

// On the front end the CSS registry lifts the residual into the one consolidated sheet, so its element is gone; the
// scoper's doubled per-instance scope (`.sgs-c-<uid>.sgs-c-<uid>`, custom-css.php::sgs_custom_css_uid) still marks it.
const LIFTED_EL = '<a class="cr-ref-o sgs-button sgs-button-1234abcd sgs-c-ab12 sgs-c-cd34 sgs-c-0a1b2c3d-2" href="#">Go</a>';
const lifted = ( selector ) => `<style id="sgs-blocks-css">${ selector } { word-spacing: 3px; }</style>${ LIFTED_EL }`;

test( 'MUST FAIL: a lifted custom-CSS rule in an ordinary stylesheet is classed by its doubled scope; a single or mixed sgs-c- class stays a framework rule', async () => {
	assert.equal( ( await probes( lifted( '.sgs-c-ab12.sgs-c-ab12' ) ).probe( row, 'hardcode' ) ).rule, null, 'the doubled scope is the route\'s own write' );
	assert.equal( ( await probes( lifted( '.sgs-c-0a1b2c3d-2.sgs-c-0a1b2c3d-2' ) ).probe( row, 'hardcode' ) ).rule, null, 'a hash uid with its occurrence suffix' );
	assert.equal( ( await probes( lifted( '.sgs-c-ab12.sgs-c-ab12.sgs-button-1234abcd' ) ).measure( row, { block: 'sgs/button', attr: 'wordGap' } ) ).reaches, false );
	assert.equal( ( await probes( lifted( '.sgs-c-ab12' ) ).probe( row, 'hardcode' ) ).rule, '.sgs-c-ab12' );
	assert.equal( ( await probes( lifted( '.sgs-c-ab12.sgs-c-cd34' ) ).probe( row, 'hardcode' ) ).rule, '.sgs-c-ab12.sgs-c-cd34' );
} );

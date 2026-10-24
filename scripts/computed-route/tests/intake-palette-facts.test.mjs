// Spec 48 FR-48-31, lib/intake-palette-usage.mjs: the rendered and code facts that tell apart colours a plain count
// confuses. A colour painted on links that open WhatsApp is the whatsapp colour and never the accent; the accent's text
// is its own ink when the accent fill holds no text, and its light tint is the light ground of its hue that carries that
// ink; the border is the line colour that draws the most pixels; muted text is the colour of the most text a clear step
// lighter than the text; success is the green the code gives a status message even when nothing paints it at rest.
// The token names are neutral, so only the facts decide.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { proposePalette, loadPaletteSlugs } from '../lib/intake-palette.mjs';
import { statusUsage } from '../lib/intake-palette-grounds.mjs';
import { paletteUsage } from '../lib/intake-run-collapse.mjs';

const SLUGS = loadPaletteSlugs();
const HEX = [ '#141414', '#FAF8F5', '#FFFFFF', '#9C8B78', '#6F6152', '#EFEAE2', '#F3F0EB', '#25D366', '#E6E1DA', '#D8D2C8', '#5E584F', '#77716A', '#1B7F43' ];
const TOKENS = HEX.map( ( hex, i ) => ( { name: `--t${ i }`, type: 'colour', hex } ) );
const use = ( hex, property, tag, count = 1, extra = {} ) => ( { hex, property, draftId: `d:${ tag }`, count, tag, ...extra } );
const USAGE = [
	use( '#FAF8F5', 'background-color', 'body' ), use( '#141414', 'color', 'body', 1, { ground: '#FAF8F5' } ),
	use( '#141414', 'background-color', 'button', 3 ), use( '#FAF8F5', 'color', 'button', 3, { ground: '#141414', text: true, chars: 30 } ),
	use( '#25D366', 'background-color', 'a', 6, { channel: 'whatsapp' } ), use( '#9C8B78', 'background-color', 'span', 1 ),
	use( '#FFFFFF', 'background-color', 'div', 20 ), use( '#F3F0EB', 'background-color', 'button', 10 ),
	use( '#EFEAE2', 'background-color', 'span', 2 ), use( '#EFEAE2', 'border-right-color', 'a', 30, { length: 900 } ),
	use( '#6F6152', 'color', 'span', 2, { ground: '#EFEAE2', text: true, chars: 30 } ), use( '#6F6152', 'color', 'span', 5, { ground: '#FAF8F5', text: true, chars: 100 } ),
	use( '#E6E1DA', 'border-top-color', 'div', 5, { length: 20000 } ), use( '#D8D2C8', 'border-top-color', 'div', 50, { length: 2000 } ),
	use( '#5E584F', 'color', 'p', 4, { ground: '#FAF8F5', text: true, chars: 400 } ), use( '#77716A', 'color', 'span', 20, { ground: '#FAF8F5', text: true, chars: 100 } ),
	use( '#141414', 'color', 'p', 9, { ground: '#FAF8F5', text: true, chars: 900 } ),
	use( '#1B7F43', 'status-color', 'status', 1 ),
];
const run = ( usage = USAGE ) => proposePalette( { tokens: TOKENS, usage, slugs: SLUGS } );
const holder = ( p, slug ) => [ ...new Set( p.rows.filter( ( r ) => r.roles.includes( slug ) ).map( ( r ) => r.hex ) ) ];

test( 'MUST FAIL: a colour painted on links that open WhatsApp is whatsapp and never the accent', () => {
	const p = run();
	assert.deepEqual( holder( p, 'whatsapp' ), [ '#25D366' ] );
	assert.deepEqual( holder( p, 'accent' ), [ '#9C8B78' ] );
	const plain = USAGE.map( ( u ) => ( u.channel ? { ...u, channel: undefined } : u ) );
	assert.deepEqual( holder( run( plain ), 'accent' ), [ '#25D366' ], 'without the link fact the louder green wins' );
} );

test( 'MUST FAIL: with no text on the accent fill, accent-text is the accent\'s own ink and accent-light the light tint of its hue that carries it', () => {
	const p = run();
	assert.deepEqual( holder( p, 'accent-text' ), [ '#6F6152' ] );
	assert.deepEqual( holder( p, 'accent-light' ), [ '#EFEAE2' ], 'the tint that carries the ink, not the louder control ground' );
	const louder = [ ...TOKENS, { name: '--warm', type: 'colour', hex: '#F5EFE3' }, { name: '--cool', type: 'colour', hex: '#E8F0F8' } ];
	const lines = [ ...USAGE, use( '#F5EFE3', 'border-left-color', 'div', 40, { length: 10 } ), use( '#E8F0F8', 'border-left-color', 'div', 60, { length: 10 } ),
		use( '#6F6152', 'color', 'span', 9, { ground: '#E8F0F8', text: true, chars: 500 } ) ];
	assert.deepEqual( holder( proposePalette( { tokens: louder, usage: lines, slugs: SLUGS } ), 'accent-light' ), [ '#EFEAE2' ], 'a louder tint of the hue without the ink, or another hue with it, is not the accent light' );
	const filled = [ ...USAGE, use( '#FFFFFF', 'color', 'span', 4, { ground: '#9C8B78', text: true, chars: 20 } ) ];
	assert.deepEqual( holder( run( filled ), 'accent-text' ), [ '#FFFFFF' ], 'text on the accent fill comes first' );
} );

test( 'MUST FAIL: the border is the line colour that draws the most, and muted text the most text a step lighter than the text', () => {
	const p = run();
	assert.deepEqual( holder( p, 'border' ), [ '#E6E1DA' ], '20000 px of hairline beat 50 short rings' );
	assert.deepEqual( holder( p, 'text-muted' ), [ '#5E584F' ], '400 characters of body copy beat 20 short labels' );
	const close = [ ...USAGE, use( '#262626', 'color', 'p', 1, { ground: '#FAF8F5', text: true, chars: 5000 } ) ];
	const tokens = [ ...TOKENS, { name: '--near', type: 'colour', hex: '#262626' } ];
	assert.deepEqual( holder( proposePalette( { tokens, usage: close, slugs: SLUGS } ), 'text-muted' ), [ '#5E584F' ], 'a colour under 10 L* lighter than the text is not muted' );
} );

test( 'MUST FAIL: the text on a content ground (section, accent) is the colour of the most text set on it, not the most elements', () => {
	const p = run();
	const section = holder( p, 'section' )[ 0 ];
	const copy = [ ...USAGE, use( '#5E584F', 'color', 'p', 1, { ground: section, text: true, chars: 300 } ), use( '#141414', 'color', 'div', 40, { ground: section } ) ];
	assert.deepEqual( holder( run( copy ), 'section-text' ), [ '#5E584F' ] );
	assert.deepEqual( holder( run( [ ...USAGE, use( '#141414', 'color', 'div', 40, { ground: section } ) ] ), 'section-text' ), [ '#141414' ], 'with no text set on it, the most used colour' );
	const fill = [ ...USAGE, use( '#FFFFFF', 'color', 'p', 1, { ground: '#9C8B78', text: true, chars: 300 } ), use( '#FAF8F5', 'color', 'div', 40, { ground: '#9C8B78' } ) ];
	assert.deepEqual( holder( run( fill ), 'accent-text' ), [ '#FFFFFF' ] );
} );

test( 'MUST FAIL: where the body colour is no token, the colour of the most page text takes text, and a name naming that same value agrees', () => {
	const usage = USAGE.filter( ( u ) => ! ( 'color' === u.property && 'body' === u.tag ) );
	const tokens = TOKENS.map( ( t ) => ( '#141414' === t.hex ? { ...t, name: '--text-body' } : t ) );
	const row = proposePalette( { tokens, usage, slugs: SLUGS } ).rows.find( ( r ) => '#141414' === r.hex );
	assert.equal( row.roles[ 0 ], 'text' );
	assert.equal( row.by, 'usage' );
	assert.match( row.why, /the colour of the most text on the page ground \(900 characters.*the name --text-body agrees/ );
} );

test( 'MUST FAIL: success is the green the code gives a status message, painted at rest or not', () => {
	const p = run();
	assert.deepEqual( holder( p, 'success' ), [ '#1B7F43' ] );
	assert.equal( p.rows.find( ( r ) => '#1B7F43' === r.hex ).used, true );
	assert.deepEqual( holder( run( USAGE.map( ( u ) => ( 'status-color' === u.property ? { ...u, tag: 'alert' } : u ) ) ), 'success' ), [], 'an alert is not a success' );
	assert.deepEqual( holder( run( USAGE.map( ( u ) => ( 'status-color' === u.property ? { ...u, hex: '#9C8B78' } : u ) ) ), 'success' ), [], 'a status message that is not green is not success' );
} );

test( 'statusUsage reads status and alert colours from the draft code', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'palette-status-' ) );
	try {
		fs.writeFileSync( path.join( dir, 'A.dc.html' ), '<span role="status" style="font-size:14px;color:#1B7F43">Saved.</span><p aria-live="assertive" style="color: #A33A2B">Bad</p><span role="status">x</span><div style="color:#123456">plain</div>' );
		assert.deepEqual( statusUsage( dir ), [
			{ hex: '#1B7F43', property: 'status-color', draftId: 'A.dc.html:code', count: 1, tag: 'status' },
			{ hex: '#A33A2B', property: 'status-color', draftId: 'A.dc.html:code', count: 1, tag: 'alert' },
		] );
	} finally {
		fs.rmSync( dir, { recursive: true, force: true } );
	}
} );

test( 'paletteUsage records characters, WhatsApp links, bands and line length', () => {
	const rec = ( p, computed, box ) => ( { surface: 'S', draftId: 'S/1#0', path: p, width: 1440, computed, box } );
	const at = ( p ) => `S\u0000${ p }`;
	const out = paletteUsage( [
		rec( '#dc-root > a:nth-child(1)', { color: 'rgb(0, 0, 0)', 'background-color': 'rgb(37, 211, 102)' }, { w: 100, h: 40 } ),
		rec( '#dc-root > div:nth-child(2)', { color: 'rgb(0, 0, 0)', 'background-color': 'rgb(255, 255, 255)', 'border-top-color': 'rgb(230, 225, 218)', 'border-top-width': '1px', 'border-top-style': 'solid' }, { w: 1400, h: 300 } ),
	], new Map(), new Map( [ [ at( '#dc-root > a:nth-child(1)' ), 9 ] ] ), new Map( [ [ at( '#dc-root > a:nth-child(1)' ), 'whatsapp' ] ] ) );
	const find = ( hex, property ) => out.find( ( u ) => u.hex === hex && u.property === property );
	assert.equal( find( '#000000', 'color' ) && out.filter( ( u ) => 'color' === u.property && u.chars === 9 && 'whatsapp' === u.channel ).length, 1 );
	assert.equal( find( '#25D366', 'background-color' ).channel, 'whatsapp' );
	assert.equal( find( '#25D366', 'background-color' ).band, undefined );
	assert.equal( find( '#FFFFFF', 'background-color' ).band, true );
	assert.equal( find( '#E6E1DA', 'border-top-color' ).length, 1400 );
} );

/**
 * A products-mode grid's template card reaches every product preview in the editor canvas (Spec 38A §11, FR-38A-8). The
 * grid draws its template `sgs/product-card` once per product: the active product as the real template block and every
 * other as a block preview carrying `data-sgs-motion-mirror="<template client id>"`
 * (`card-grid/components/ProductTemplateCanvas.js`). A block preview runs no motion of its own, so the template's canvas
 * motion is scoped to the template and its mirrors (`canvas-dom.js::canvasRootSelector( id, true )`) and Replay plays on
 * every mirror (`mirrors.js::mirrorRoots`, `replay.js`): an entrance on the template card's root and on its parts
 * (title, image, body) plays on every shown preview card, as on the page where every card renders the template.
 * Negative controls: the hidden preview of the active product and a block with no mirrors.
 */
const fs = require( 'fs' );
const path = require( 'path' );

jest.mock( '@wordpress/data', () => ( { dispatch: () => ( { createNotice: () => {} } ) } ) );
jest.mock( '@wordpress/i18n', () => ( { __: ( text ) => text } ) );

import { canvasRootSelector, planCanvas, planElements } from '../../src/blocks/extensions/motion/canvas/canvas-dom';
import { mirrorRoots } from '../../src/blocks/extensions/motion/canvas/mirrors';
import { resolveTarget } from '../../src/blocks/extensions/motion/canvas/resolve-target';
import { registry, replay } from '../../src/blocks/extensions/motion/canvas/replay';

const CARD_SGS = JSON.parse(
	fs.readFileSync( path.resolve( __dirname, '../../src/blocks/product-card/block.json' ), 'utf8' )
).supports.sgs;

const TPL = 'tpl-1';
const PARTS = [ 'title', 'image', 'body' ];
const ROOT = canvasRootSelector( TPL, true );

// One element per part, carrying the classes (and tag) the part resolves to, as the card's server markup does.
const partsMarkup = () =>
	PARTS.map( ( part ) => {
		const resolved = resolveTarget( 'sgs/product-card', CARD_SGS.elements, ROOT, part, {} );
		const tag = ( resolved.tag || 'div' ).toLowerCase();
		return `<${ tag } class="${ resolved.classes.join( ' ' ) }" data-part="${ part }"></${ tag }>`;
	} ).join( '' );

// The grid canvas: the template block for the active product (index 1), a hidden preview for it, and a preview for
// each other product.
function canvas( count = 3, { mirror = true } = {} ) {
	const card = ( id ) =>
		`<div id="block-${ id }" data-block="${ id }" class="wp-block-sgs-product-card"><div class="product-card wp-block-sgs-product-card">${ partsMarkup() }</div></div>`;
	let inner = '';
	for ( let i = 0; i < count; i++ ) {
		if ( 1 === i ) {
			inner += `<div class="sgs-card-grid__template">${ card( TPL ) }</div>`;
		}
		const attr = mirror ? ` data-sgs-motion-mirror="${ TPL }"` : '';
		inner += `<div class="sgs-card-grid__template-preview"${ attr }${ 1 === i ? ' hidden' : '' }>${ card( `${ TPL }-preview-${ i }` ) }</div>`;
	}
	const host = document.createElement( 'div' );
	host.innerHTML = `<div id="block-grid" data-block="grid"><div class="sgs-card-grid">${ inner }</div></div>`;
	document.body.appendChild( host );
	return document.getElementById( `block-${ TPL }` );
}

const fade = { trigger: 'scroll', values: { from: { opacity: 0, translateY: 20 }, to: {}, duration: 300 } };

function mount( tplEl, motion ) {
	const emitted = planCanvas( tplEl, motion, {
		blockName: 'sgs/product-card',
		elements: CARD_SGS.elements,
		animationItems: CARD_SGS.animationItems || '',
		motionItems: CARD_SGS.motionItems,
		root: ROOT,
		delegation: null,
		hasInnerBlocks: false,
	} );
	registry.set( TPL, { emitted, element: () => tplEl, mirrors: () => mirrorRoots( TPL, tplEl ) } );
	return emitted;
}

afterEach( () => {
	document.body.innerHTML = '';
	registry.clear();
} );

describe( 'the template card reaches its product previews in the canvas', () => {
	test( 'the mirror roots are the shown previews\' block elements', () => {
		const tplEl = canvas( 3 );
		expect( mirrorRoots( TPL, tplEl ).map( ( el ) => el.id ) ).toEqual( [ `block-${ TPL }-preview-0`, `block-${ TPL }-preview-2` ] );
		expect( ROOT ).toBe( `:is([id="block-${ TPL }"],:where([data-sgs-motion-mirror="${ TPL }"]) [data-block])` );
	} );

	test( 'the template\'s scoped CSS reaches each preview card', () => {
		const tplEl = canvas( 3 );
		const out = mount( tplEl, { v: 1, elements: { title: { entrance: { base: fade } } } } );
		expect( out.css ).toContain( `${ ROOT } ` );
		const [ preview ] = mirrorRoots( TPL, tplEl );
		const rule = out.css.slice( 0, out.css.indexOf( '{' ) );
		const title = resolveTarget( 'sgs/product-card', CARD_SGS.elements, ROOT, 'title', {} ).selector;
		expect( rule ).toBe( title );
		// jsdom has no :is()/:where(); the selector's mirror branch, written out, matches the preview's title.
		const mirrorBranch = title.replace( ROOT, `[data-sgs-motion-mirror="${ TPL }"] [data-block]` );
		expect( preview.querySelector( '[data-part="title"]' ).matches( mirrorBranch ) ).toBe( true );
		expect( tplEl.querySelector( '[data-part="title"]' ).matches( title.replace( ROOT, `[id="block-${ TPL }"]` ) ) ).toBe( true );
	} );

	test.each( PARTS )( 'an entrance on the template card\'s %s part plays on every shown preview card', async ( part ) => {
		const tplEl = canvas( 3 );
		mount( tplEl, { v: 1, elements: { [ part ]: { entrance: { base: fade } } } } );
		const playing = replay( TPL, part );
		const els = [ tplEl, ...mirrorRoots( TPL, tplEl ) ].map( ( root ) => root.querySelector( `[data-part="${ part }"]` ) );
		expect( els.map( ( el ) => el.getAttribute( 'data-sgs-in' ) ) ).toEqual( [ '', '', '' ] );
		expect( els.map( ( el ) => el.getAttribute( 'data-sgs-me' ) ) ).toEqual( Array( 3 ).fill( 'scroll translate opacity' ) );
		expect( document.querySelector( '[hidden] [data-sgs-in]' ) ).toBeNull();
		expect( ( await playing ).played ).toBe( true );
		expect( els.map( ( el ) => el.getAttribute( 'data-sgs-in' ) ) ).toEqual( [ null, null, null ] );
	} );

	test( 'an entrance on the template card\'s root plays on every shown preview card root', async () => {
		const tplEl = canvas( 4 );
		mount( tplEl, { v: 1, elements: { root: { entrance: { base: fade } } } } );
		const roots = [ tplEl, ...mirrorRoots( TPL, tplEl ) ];
		expect( roots ).toHaveLength( 4 );
		const playing = replay( TPL, 'root' );
		expect( roots.map( ( el ) => el.getAttribute( 'data-sgs-in' ) ) ).toEqual( Array( 4 ).fill( '' ) );
		await playing;
	} );

	test( 'negative control: without mirrors only the template card plays', async () => {
		const tplEl = canvas( 3, { mirror: false } );
		mount( tplEl, { v: 1, elements: { title: { entrance: { base: fade } } } } );
		expect( mirrorRoots( TPL, tplEl ) ).toEqual( [] );
		const playing = replay( TPL, 'title' );
		expect( document.querySelectorAll( '[data-sgs-in]' ) ).toHaveLength( 1 );
		await playing;
	} );
} );

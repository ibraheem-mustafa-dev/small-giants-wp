// The fixture builder the widget and inline-heading skeleton tests share (tests/skeleton-widgets.test.mjs,
// tests/skeleton-inline-heading.test.mjs): an inventory, its fact record and the draft file a fixture tree stands for, and
// the proposal it gets. Pure functions and a temporary folder only.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openDb } from '../../../lib/db.mjs';
import { loadFacts } from '../../../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../../../lib/skeleton-propose.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const REPO = path.resolve( HERE, '../../../../..' );
export const db = openDb();
export const facts = ( repo, off = [] ) => {
	const f = loadFacts( { db, client: 'fixture-client', repo: REPO } );
	f.decisions = structuredClone( f.decisions );
	off.forEach( ( id ) => ( id.startsWith( 'structural.' ) ? delete f.decisions.structural[ id.slice( 11 ) ] : delete f.decisions.rules[ id ] ) );
	return { ...f, repo };
};

// N( tag, o, kids ): o { words, attrs, style, display (the computed display, when the style does not give it), loop: { list, as, copies }, ifOn ('{{ f.open }}'), shownIn ([copy]),
// click ('f.toggle'), ref ('trackRef'), text ('f.a': the element prints that field), events ([[name, expr]]), parts (the
// template source in order: strings and child indexes) }.
export const N = ( tag, o = {}, kids = [] ) => ( { tag, o, kids } );

// An element's declared inline style, and its computed display as a browser gives it: `o.display`, else the declared display, else
// block for an absolutely or fixed positioned element, inline for a phrasing tag, block for any other.
const decl = ( node ) => Object.fromEntries( String( node.o.style || '' ).split( ';' ).map( ( x ) => x.split( ':' ).map( ( y ) => y.trim() ) ).filter( ( [ k, v ] ) => k && v ) );
const INLINE = new Set( [ 'a', 'b', 'em', 'i', 'img', 'small', 'span', 'strong', 'sub', 'sup' ] );
function displayOf( node ) {
	const d = decl( node );
	if ( node.o.display || d.display ) {
		return node.o.display || d.display;
	}
	if ( [ 'absolute', 'fixed' ].includes( d.position ) ) {
		return 'block';
	}
	return INLINE.has( node.tag ) ? 'inline' : 'block';
}

// The inventory (copies of a loop stamped, an sc-if child only in the copies it shows in), its fact record and the template
// HTML whose n-th start tag is template n (a pad tag holds place 0).
export function build( root ) {
	let n = 0;
	const number = ( node ) => {
		node.id = ++n;
		node.kids.forEach( number );
	};
	number( root );
	const elements = [];
	const recs = {};
	const html = [];
	const style = ( node ) => node.o.style || '';
	const tplHtml = ( node ) => {
		const attrs = Object.entries( node.o.attrs || {} ).map( ( [ k, v ] ) => ` ${ k }="${ v }"` ).join( '' ) + ( style( node ) ? ` style="${ style( node ) }"` : '' );
		const words = node.o.text ? `{{ ${ node.o.text } }}` : node.o.words || '';
		if ( 'img' === node.tag ) {
			return `<img${ attrs }>`;
		}
		const inner = node.o.parts ? node.o.parts.map( ( q ) => ( 'number' === typeof q ? tplHtml( node.kids[ q ] ) : q ) ).join( '' ) : `${ node.kids.map( tplHtml ).join( '' ) }${ words }`;
		return `<${ node.tag }${ attrs }>${ inner }</${ node.tag }>`;
	};
	html.push( tplHtml( root ) );
	const record = ( node, ctx ) => {
		const tk = `Root/${ node.id }`;
		const scFor = [ ...ctx.scFor, ...( node.o.loop ? [ { key: `Root/f${ node.id }`, list: `{{ ${ node.o.loop.list } }}`, as: node.o.loop.as } ] : [] ) ];
		const scIf = [ ...ctx.scIf, ...( node.o.ifOn ? [ { key: `Root/i${ node.id }`, value: node.o.ifOn } ] : [] ) ];
		const wrappers = [ ...( node.o.ifOn ? [ `Root/i${ node.id }` ] : [] ), ...( node.o.loop ? [ `Root/f${ node.id }` ] : [] ) ];
		const parent = wrappers[ 0 ] ?? ctx.parent;
		const chain = [ ...wrappers, ...ctx.chain ];
		node.o.loop && ( recs[ `Root/f${ node.id }` ] = entry( `Root/f${ node.id }`, 'sc-for', {}, ctx.parent, ctx.chain, { scIf: ctx.scIf, scFor: ctx.scFor } ) );
		node.o.ifOn && ( recs[ `Root/i${ node.id }` ] = entry( `Root/i${ node.id }`, 'sc-if', { value: node.o.ifOn }, node.o.loop ? `Root/f${ node.id }` : ctx.parent, node.o.loop ? [ `Root/f${ node.id }`, ...ctx.chain ] : ctx.chain, { scIf: ctx.scIf, scFor } ) );
		const events = [ ...( node.o.click ? [ { name: 'onClick', expr: node.o.click } ] : [] ), ...( node.o.events || [] ).map( ( [ name, expr ] ) => ( { name, expr } ) ) ];
		const holes = node.o.text ? [ { id: 'text#0', where: 'text', expr: node.o.text, path: node.o.text, whole: false } ] : [];
		recs[ tk ] = entry( tk, node.tag, { ...( node.o.attrs || {} ), ...( node.o.ref ? { ref: `{{ ${ node.o.ref } }}` } : {} ), ...( node.o.click ? { onClick: `{{ ${ node.o.click } }}` } : {} ) }, parent, chain, { scIf, scFor }, { events, holes, n: String( node.id ) } );
		node.kids.forEach( ( k ) => record( k, { scFor, scIf, parent: tk, chain: [ tk, ...chain ] } ) );
	};
	record( root, { scFor: [], scIf: [], parent: null, chain: [] } );
	let y = 0;
	const walk = ( node, parentKey, depth, copy, mem ) => {
		const copies = node.o.loop ? node.o.loop.copies : 1;
		for ( let c = 0; c < copies; c++ ) {
			const at = node.o.loop ? c : copy;
			if ( node.o.shownIn && ! node.o.shownIn.includes( at ) ) {
				continue;
			}
			const key = `Root/${ node.id }#${ at }`;
			const words = 'function' === typeof node.o.words ? node.o.words( at ) : node.o.words || '';
			const m2 = [ ...mem, ...( node.o.loop ? [ { kind: 'sc-for', list: `{{ ${ node.o.loop.list } }}`, as: node.o.loop.as, tpl: `f${ node.id }` } ] : [] ), ...( node.o.ifOn ? [ { kind: 'sc-if', value: node.o.ifOn, tpl: `i${ node.id }` } ] : [] ) ];
			const el = { key, parentKey, depth, tag: node.tag, template: 'Root', tpl: node.id, attrs: { ...( node.o.attrs || {} ), ...( style( node ) ? { style: style( node ) } : {} ) }, words, allText: words, membership: m2, srcTag: node.tag, srcOwnText: words, snippet: `<${ node.tag } data-dc-tpl="${ node.id }">${ words }</${ node.tag }>`,
				box: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { x: 0, y: ( y += 30 ), w: 100, h: 20 } ] ) ), visible: { 375: true, 768: true, 1440: true }, display: displayOf( node ), position: decl( node ).position || 'static', flexDirection: 'row', screenshots: {} };
			elements.push( el );
			const kidTexts = node.kids.map( ( k ) => walk( k, key, depth + 1, at, m2 ) );
			const texts = kidTexts.flat();
			// A node whose source order is given (`parts` with no binding) reads its text in that order, as textContent does.
			const ordered = node.o.parts && ! node.o.parts.some( ( q ) => 'string' === typeof q && /\{\{/.test( q ) );
			el.allText = 'img' === node.tag ? '' : ordered ? node.o.parts.map( ( q ) => ( 'number' === typeof q ? kidTexts[ q ].join( ' ' ) : q ) ).join( '' ).replace( /\s+/g, ' ' ).trim() : [ words, ...texts ].filter( Boolean ).join( ' ' );
		}
		return elements.filter( ( e ) => e.parentKey === parentKey && e.tpl === node.id ).map( ( e ) => e.allText );
	};
	walk( root, null, 0, 0, [] );
	return { inventory: { checks: {}, source: 'fixture', root: root.tag, generated: 'fixture', elements }, recs, html: `<i></i>${ html.join( '' ) }` };
}
function entry( key, realTag, attrs, parent, chain, membership, extra = {} ) {
	return {
		template: { key, component: 'Root', n: extra.n ?? key.split( '/' ).pop(), tag: realTag, realTag, attrs, style: { static: [], holes: [] }, pseudo: {}, holes: extra.holes || [], parent, realParent: parent, parentChain: chain,
			membership: { scIf: membership.scIf, scFor: membership.scFor, dcImport: [] }, own: {}, inHelmet: false, inFor: !! membership.scFor.length, ref: null, hooks: {}, events: extra.events || [], words: '', srcLine: 1 },
		logic: { holes: {} }, surfaces: [], instances: [], fingerprint: {},
	};
}

// A temp repo holding the client's draft `Root.dc.html` (the template HTML and the logic); returns { repo, hash }.
export function draftRepo( html, logic ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'widgets-' ) );
	const dir = path.join( repo, 'sites', 'fixture-client', 'handoff' );
	fs.mkdirSync( dir, { recursive: true } );
	const text = `<x-dc name="Root">${ html }</x-dc>\n<script data-dc-script>\n${ logic }\n</script>\n`;
	fs.writeFileSync( path.join( dir, 'Root.dc.html' ), text );
	return { repo, hash: crypto.createHash( 'sha256' ).update( text ).digest( 'hex' ) };
}
export const run = ( root, logic, o = {} ) => {
	const b = build( root );
	const draft = draftRepo( b.html, logic );
	const rec = { schema: '1', client: 'fixture-client', elements: b.recs, surfaces: o.surfaces || {}, sources: { files: { 'Root.dc.html': draft.hash } } };
	return proposeSkeleton( { inventory: b.inventory, facts: facts( draft.repo, o.off || [] ), surface: 'fixture', surfaceKind: o.kind || 'page', surfaceName: 'Fixture', motion: new Set(), db, factRecord: rec, openers: {}, carried: o.carried ?? null, ...( o.calSettings ? { calSettings: o.calSettings } : {} ) } );
};
export const row = ( r, key ) => r.proposal.rows.find( ( x ) => x.key === key );
export const find = ( nodes, f, out = [] ) => {
	for ( const n of nodes || [] ) {
		f( n ) && out.push( n );
		find( n.innerBlocks, f, out );
	}
	return out;
};


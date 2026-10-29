// The facts a fixture inventory stands for, in the shapes the skeleton rules read them through lib/element-facts.mjs: a fact
// record (lib/fact-record.mjs) built from each fixture element, and the inventory's per-width browser read (`resolved`).
// A fixture writes its draft element as the markup the draft holds (`snippet`, `attrs.style`); these helpers turn that
// markup into what the route reads, so the code under test never reads the markup itself.
//   fixtureRecord( inventory, base = null ) -> a record keyed `<template>/<tpl>`: the template's attributes (the rendered ones
//     and the opening tag's, a runtime-written `sc-camel-<kebab>` as its camel-cased property, `sc-camel-on-click` as
//     `onClick`), its event bindings, its declared longhands, its text holes, real parent and loops. `base` (a record a test
//     wrote) keeps its own entries, surfaces and sources; the fixture adds the elements it lacks. A served inventory's `Root`
//     host is keyed under `rootComponent` when given, as the record names it.
//   fixtureResolved( inventory ) -> the inventory with each element's `resolved` values per width (its declared value, a rem
//     or em length in px over a 16px root, the inherited text properties from its nearest declaring ancestor, else the
//     browser's initial value), when it declares a px width and height a box of that size, and the rendered text read
//     (`textLeads`, `textBreaks`) its markup implies.
//   fixtureView( inventory, base, o ) / fixtureModel( inventory, base, o ) -> the record view and the inventory model over it
//     (the inventory read through fixtureResolved).
//   proposeFixture( o ) -> lib/skeleton-propose.mjs::proposeSkeleton( o ) over the fixture's resolved inventory and its record
//     (`o.factRecord` the base).
import { recordView } from '../../lib/skeleton-record.mjs';
import { inventoryModel } from '../../lib/skeleton-model.mjs';
import { elementFacts } from '../../lib/element-facts.mjs';
import { RESOLVED } from '../../lib/skeleton-inventory.mjs';
import { proposeSkeleton } from '../../lib/skeleton-propose.mjs';

const WIDTHS = [ 375, 768, 1440 ];
const SIDES = [ 'top', 'right', 'bottom', 'left' ];
const CORNERS = [ 'top-left', 'top-right', 'bottom-right', 'bottom-left' ];
const INHERITED = { 'font-size': '16px', 'font-weight': '400', 'letter-spacing': 'normal', 'text-transform': 'none', 'line-height': 'normal' };
const camel = ( kebab ) => kebab.replace( /-([a-z])/g, ( _, c ) => c.toUpperCase() );

// The four values of a one-to-four value box shorthand (top, right, bottom, left).
const box4 = ( v ) => {
	const p = String( v ).trim().split( /\s+/ );
	return [ p[ 0 ], p[ 1 ] ?? p[ 0 ], p[ 2 ] ?? p[ 0 ], p[ 3 ] ?? p[ 1 ] ?? p[ 0 ] ];
};
// A declaration list as the record keeps it: longhands for the box shorthands, the rest as written.
export function longhands( style ) {
	const out = [];
	for ( const part of String( style || '' ).split( ';' ) ) {
		const at = part.indexOf( ':' );
		if ( at <= 0 ) {
			continue;
		}
		const name = part.slice( 0, at ).trim().toLowerCase();
		const value = part.slice( at + 1 ).trim();
		if ( 'padding' === name || 'margin' === name ) {
			box4( value ).forEach( ( v, i ) => out.push( [ `${ name }-${ SIDES[ i ] }`, v ] ) );
		} else if ( 'border-radius' === name ) {
			box4( value ).forEach( ( v, i ) => out.push( [ `border-${ CORNERS[ i ] }-radius`, v ] ) );
		} else if ( 'border' === name || 'border-width' === name ) {
			const width = /(^|\s)(-?[\d.]+(?:px|rem|em)?|thin|medium|thick)(\s|$)/.exec( value )?.[ 2 ];
			const style = /\b(none|hidden|solid|dashed|dotted|double|groove|ridge|inset|outset)\b/.exec( value )?.[ 1 ];
			SIDES.forEach( ( s ) => {
				width && out.push( [ `border-${ s }-width`, /^\d+(?:\.\d+)?$/.test( width ) ? `${ width }px` : width ] );
				'border' === name && style && out.push( [ `border-${ s }-style`, style ] );
			} );
		} else {
			out.push( [ name, value ] );
		}
	}
	return out;
}

// The attributes of a markup opening tag, as [ name, value ].
const tagAttrs = ( snippet ) => [ ...( /^<[^>\s]+([^>]*)>/.exec( snippet || '' )?.[ 1 ] ?? '' ).matchAll( /\s([\w:-]+)(?:="([^"]*)")?/g ) ].map( ( m ) => [ m[ 1 ], m[ 2 ] ?? '' ] );
// The text a markup string holds before its first child tag.
const ownText = ( snippet ) => String( snippet || '' ).replace( /^<[^>]*>/, '' ).split( '<' )[ 0 ];

export function fixtureRecord( inventory, base = null, { rootComponent = null } = {} ) {
	const elements = { ...( base?.elements ?? {} ) };
	const host = ( e ) => ( rootComponent && 'Root' === e.template ? rootComponent : e.template );
	const keyOf = ( e ) => `${ host( e ) }/${ e.tpl }`;
	const byKey = Object.fromEntries( inventory.elements.map( ( e ) => [ e.key, e ] ) );
	for ( const e of inventory.elements ) {
		const k = keyOf( e );
		const opening = Object.fromEntries( tagAttrs( e.snippet ).filter( ( [ n ] ) => 'style' !== n && 'data-dc-tpl' !== n ).map( ( [ n, v ] ) => [ n.startsWith( 'sc-camel-' ) ? camel( n.slice( 9 ) ) : n, v ] ) );
		const expr = ( v ) => /^\s*\{\{\s*([\s\S]*?)\s*\}\}\s*$/.exec( String( v ) )?.[ 1 ] ?? null;
		const eventsOf = ( attrs ) => Object.entries( attrs ).filter( ( [ n ] ) => /^on[A-Z]/.test( n ) ).map( ( [ name, v ] ) => ( { name, expr: expr( v ) } ) );
		if ( elements[ k ] ) {
			// A test's own entry keeps everything it states and gains the bindings its markup holds (a real record lists every
			// `on<Event>` attribute among its events).
			const t = elements[ k ].template;
			const attrs = { ...opening, ...t.attrs };
			elements[ k ] = { ...elements[ k ], template: { ...t, attrs, events: t.events?.length ? t.events : eventsOf( attrs ) } };
			continue;
		}
		const attrs = { ...opening, ...Object.fromEntries( Object.entries( e.attrs || {} ).filter( ( [ n ] ) => ! [ 'style', 'srcBasename' ].includes( n ) ) ) };
		const text = ownText( e.snippet );
		const textHoles = [ ...text.matchAll( /\{\{\s*([^}]+?)\s*\}\}/g ) ].map( ( m, i ) => ( { id: `text#${ i }`, where: 'text', expr: m[ 1 ], path: m[ 1 ], whole: false } ) );
		const attrHoles = Object.entries( attrs ).filter( ( [ , v ] ) => null != expr( v ) ).map( ( [ n, v ] ) => ( { id: `attr:${ n }#0`, where: `attr:${ n }`, expr: expr( v ), path: expr( v ), whole: true } ) );
		const chain = [];
		for ( let p = byKey[ e.parentKey ]; p; p = byKey[ p.parentKey ] ) {
			chain.push( keyOf( p ) );
		}
		const declared = longhands( e.attrs?.style );
		e.display && 'block' !== e.display && ! declared.some( ( [ n ] ) => 'display' === n ) && declared.push( [ 'display', e.display ] );
		elements[ k ] = {
			template: {
				key: k, component: host( e ), n: String( e.tpl ), tag: e.srcTag || e.tag, realTag: e.tag, attrs,
				style: { static: declared, holes: [] }, holes: [ ...attrHoles, ...textHoles ], parent: chain[ 0 ] ?? null, realParent: chain[ 0 ] ?? null, parentChain: chain,
				membership: { scIf: [], scFor: ( e.membership || [] ).filter( ( x ) => 'sc-for' === x.kind ).map( ( x ) => ( { key: `${ host( e ) }/${ x.tpl }`, list: x.list ?? x.value ?? null, as: x.as || 'item' } ) ), dcImport: [] },
				own: {}, events: eventsOf( attrs ),
				words: textHoles.length && ! text.replace( /\{\{[^}]*\}\}/g, '' ).trim() ? text.trim() : e.words || '',
			},
			logic: { holes: {} }, surfaces: [],
		};
	}
	return { ...( base ?? {} ), surfaces: base?.surfaces ?? {}, sources: base?.sources ?? null, elements };
}

export function fixtureResolved( inventory ) {
	const byKey = Object.fromEntries( inventory.elements.map( ( e ) => [ e.key, e ] ) );
	const own = ( e ) => Object.fromEntries( longhands( e?.attrs?.style ) );
	const px = ( v ) => {
		const n = /^(-?[\d.]+)(px|rem|em)$/.exec( String( v ?? '' ).trim() );
		return n ? `${ 'px' === n[ 2 ] ? Number( n[ 1 ] ) : Number( n[ 1 ] ) * 16 }px` : v;
	};
	const value = ( e, prop ) => {
		if ( undefined !== own( e )[ prop ] ) {
			return px( own( e )[ prop ] );
		}
		if ( ! ( prop in INHERITED ) ) {
			return 'width' === prop || 'height' === prop ? 'auto' : '0px';
		}
		for ( let p = byKey[ e.parentKey ]; p; p = byKey[ p.parentKey ] ) {
			if ( undefined !== own( p )[ prop ] ) {
				return px( own( p )[ prop ] );
			}
		}
		return INHERITED[ prop ];
	};
	return {
		...inventory,
		elements: inventory.elements.map( ( e ) => {
			const resolved = e.resolved ?? Object.fromEntries( WIDTHS.map( ( w ) => [ w, Object.fromEntries( RESOLVED.map( ( p ) => [ p, value( e, p ) ] ) ) ] ) );
			const [ w, h ] = [ 'width', 'height' ].map( ( p ) => /^[\d.]+(?:px|rem|em)$/.test( own( e )[ p ] ?? '' ) ? parseFloat( px( own( e )[ p ] ) ) : null );
			const box = null != w && null != h && e.box ? Object.fromEntries( Object.entries( e.box ).map( ( [ k, b ] ) => [ k, b ? { ...b, w, h } : b ] ) ) : e.box;
			// The rendered text read: whether its words open its content, and its text with line breaks when it holds one.
			const leads = e.words && undefined === e.textLeads && e.snippet ? { textLeads: !! ownText( e.snippet ).trim() } : {};
			const breaks = undefined === e.textBreaks && /<brb/i.test( e.snippet || '' ) ? { textBreaks: String( e.snippet ).replace( /^<[^>]*>/, '' ).replace( /<\/[a-z0-9-]+>\s*$/i, '' ).replace( /<br[^>]*>/gi, '<br>' ).replace( /<(?!br>)[^>]+>/g, '' ).replace( /\s+/g, ' ' ).trim() } : {};
			return { ...e, resolved, box, ...leads, ...breaks };
		} ),
	};
}

export const fixtureView = ( inventory, base = null, o = {} ) => recordView( fixtureRecord( inventory, base, o ), o );
export const fixtureModel = ( inventory, base = null, o = {} ) => {
	const inv = fixtureResolved( inventory );
	return inventoryModel( inv, elementFacts( fixtureView( inv, base, o ) ) );
};
export const proposeFixture = ( o ) => {
	const inventory = fixtureResolved( o.inventory );
	return proposeSkeleton( { ...o, inventory, factRecord: fixtureRecord( inventory, o.factRecord ?? null, { rootComponent: o.rootComponent ?? null } ) } );
};

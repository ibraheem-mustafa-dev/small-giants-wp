// A hover whose effect spans several elements. A draft element's `style-hover` can set its own colour and custom properties its
// children paint with (`color:#D8CA50; --tb:#D8CA50; --tbg:rgba(216,202,80,.12)`): the text goes gold, the ring's border goes gold and
// the ring takes a tint. Each element's hover is its own block's setting, so every one is written: the element's text colour on its own
// block, and each child that a parent-driven record names (`--tbg set by :hover on tpl N`) on the child's block, through the resolver.
import { candidates } from './db.mjs';
import { recordsFor, stateLook } from './apply-records.mjs';
import { colourValue } from './apply-probe-items.mjs';
import { parseColour } from './normalise.mjs';
import { idOfTpl } from './apply-owned.mjs';

// The declarations of a record's `style-hover="..."` text: { color: '#D8CA50', '--tb': '#D8CA50' }.
export function hoverDeclarations( record ) {
	const text = /style-hover="([^"]*)"/.exec( String( record.source?.code ?? '' ) )?.[ 1 ] ?? '';
	return Object.fromEntries( text.split( ';' ).map( ( d ) => d.split( /:(.*)/s ).map( ( x ) => x?.trim() ) ).filter( ( [ k, v ] ) => k && v ) );
}

const refsVar = ( look, name ) => [ look.from, look.to ].some( ( v ) => String( v ?? '' ).includes( `var(${ name },` ) || String( v ?? '' ).includes( `var(${ name })` ) );

// The parent-driven records that name this element's tpl as the one that sets their custom properties.
function drivenBy( recordsIndex, id ) {
	const out = new Map();
	for ( const list of recordsIndex.values() ) {
		for ( const r of list ) {
			new RegExp( `set by :hover on tpl ${ id }(?!\\d)` ).test( r.trigger?.detail ?? '' ) && out.set( r.id, r );
		}
	}
	return [ ...out.values() ];
}

// Items for the elements a hover record reaches beyond the element's own pair. Each item can carry `ref` and `block` of a child pair.
export function spanItems( ctx ) {
	const { target, block, saved, surface, recordsIndex, db } = ctx;
	const items = [];
	const own = recordsFor( recordsIndex, target.tpl ).filter( ( r ) => 'hover' === r.trigger?.type );
	for ( const rec of own ) {
		const decl = hoverDeclarations( rec );
		const colour = stateLook( rec )?.looks.find( ( l ) => 'color' === l.property )?.to ?? decl.color;
		const kids = drivenBy( recordsIndex, idOfTpl( target.tpl ) );
		if ( ! colour || ! kids.length ) {
			continue;
		}
		// The element's own text colour: its block's hover colour of the wrapper, when none is stored.
		const text = candidates( db, block, 'color', 'hover' ).find( ( r ) => 'wrapper' === r.css_element );
		const value = colourValue( colour, ctx.snapshot );
		if ( text && value && ! saved[ text.attr_name ] ) {
			items.push( { status: 'op', prop: text.attr_name, state: 'hover', why: `${ target.tpl } text turns ${ value } on hover (${ rec.id }); the container's own colour does not reach a text that holds a colour of its own`, writes: [ { attr: text.attr_name, value } ], checks: [], record: rec.id } );
		}
		for ( const kid of kids ) {
			const id = [].concat( kid.element?.template_tpl_id ?? [] )[ 0 ];
			const pair = ( surface?.pairs || [] ).find( ( p ) => String( idOfTpl( p.tpl ) ) === String( id ) );
			const held = pair && ctx.all?.blocks?.[ pair.ref ];
			if ( ! held ) {
				continue;
			}
			const looks = stateLook( kid )?.looks ?? [];
			// A custom property the parent sets that no look of the child names is the child's border colour, when exactly one colour
			// property of the child has no value in its record.
			const named = Object.keys( decl ).filter( ( k ) => k.startsWith( '--' ) && looks.some( ( l ) => refsVar( l, k ) ) );
			const spare = Object.entries( decl ).filter( ( [ k, v ] ) => k.startsWith( '--' ) && ! named.includes( k ) && colourValue( v, null ) );
			const empty = ( kid.properties || [] ).filter( ( l ) => /^border(-top)?-color$/.test( l.property ) && ! l.to );
			const wanted = [ ...looks.filter( ( l ) => 'background' === l.property && l.to && colourValue( l.to, null ) ).map( ( l ) => [ 'background-color', l.to ] ), ...( 1 === spare.length && 1 === empty.length ? [ [ 'border-top-color', spare[ 0 ][ 1 ] ] ] : [] ) ];
			for ( const [ prop, raw ] of wanted ) {
				// The child's own hover setting for the property (its calibration is the shape part the setting names): a translucent
				// colour keeps its alpha as written, an opaque one is a palette slug or hex.
				const row = candidates( db, held.block, prop, 'hover' )[ 0 ];
				const clear = ( parseColour( raw )?.a ?? 1 ) < 1;
				const value = clear ? String( raw ).replace( /\s+/g, '' ) : colourValue( raw, ctx.snapshot );
				if ( ! row || ! value ) {
					items.push( { status: 'no-setting', prop, state: 'hover', ref: pair.ref, block: held.block, record: kid.id, why: `${ held.block } has no hover setting for ${ prop } to hold ${ raw }` } );
				} else if ( String( held.attrs?.[ row.attr_name ] ?? '' ) === value ) {
					items.push( { status: 'equal', prop: row.attr_name, state: 'hover', ref: pair.ref, block: held.block, why: `${ row.attr_name } already holds ${ value }` } );
				} else {
					items.push( { status: 'op', prop: row.attr_name, state: 'hover', ref: pair.ref, block: held.block, record: kid.id, why: `${ pair.tpl } ${ prop } ${ value } on hover (${ kid.id }, set by ${ rec.id })`, writes: [ { attr: row.attr_name, value } ], checks: [] } );
				}
			}
		}
	}
	return items;
}

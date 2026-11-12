// Motion rules that write block settings beside the sgsMotion document (the motion family calls them):
//   - the hero's inline SVG part animation (`backgroundSvgParts`, `backgroundSvgPartsTrigger`): the client's `build/hero-svg-parts.json` holds the
//     per-id values the draft's setHeroSvgEl script plays; they go on the hero that holds the SVG (the Background Source's inline SVG markup) the records
//     name. A client without the file, or a hero whose SVG lacks a named id, gets a no-setting row.
//   - the testimonial slider's change animation (`changeTransition`, `changeDistance`, `changeDuration`, `changeEasing`): the
//     state record that plays when the slide changes (opacity and translateX in).
import fs from 'node:fs';
import { attrRow } from './db.mjs';
import { draftId, recordsFor } from './apply-records.mjs';
import { recordsOf } from './apply-motion-calls.mjs';
import { settle } from './apply-chrome-records.mjs';
import { animatedBackground, inlineBackground } from './apply-svg-file.mjs';

const EASING_SRC = new URL( '../../../plugins/sgs-blocks/includes/helpers-motion-easing.php', import.meta.url );
const norm = ( s ) => String( s ?? '' ).replace( /\s+/g, '' ).replace( /(^|[(,])0?\./g, '$10.' ).toLowerCase();

// The named easings a block's enum can hold, read from the PHP that resolves them: { name: css function }.
export function namedEasings( src = fs.readFileSync( EASING_SRC, 'utf8' ) ) {
	const out = {};
	for ( const m of src.matchAll( /'([a-z-]+)'\s*=>\s*'((?:cubic-bezier\([^)]*\))|ease|ease-in-out|linear)'/g ) ) {
		out[ m[ 1 ] ] = m[ 2 ];
	}
	return out;
}

// The enum value of `block`.`attr` whose function is `css`, else null.
export function easingName( { db, block, attr, css, named = namedEasings() } ) {
	const allowed = JSON.parse( attrRow( db, block, attr )?.enum_values || '[]' );
	return allowed.find( ( n ) => named[ n ] && norm( named[ n ] ) === norm( css ) ) ?? null;
}

// The block's declared defaults for `attrs`: an attribute the post does not store holds its default.
const defaultsOf = ( db, block, attrs ) => Object.fromEntries( attrs.map( ( a ) => [ a, JSON.parse( attrRow( db, block, a )?.default_value ?? 'null' ) ] ) );

const ids = ( svg ) => new Set( [ ...String( svg ).matchAll( /\sid="([^"]+)"/g ) ].map( ( m ) => m[ 1 ] ) );
const svgIdOf = ( r ) => /inlined SVG\s*\S+\s*\[id="([^"]+)"\]/.exec( r.element?.selector ?? '' )?.[ 1 ] ?? null;

// The template ids a target stands for: its own, those its skeleton node owns and those it reaches, and those of the draft elements
// whose animate calls land inside it (an inlined SVG's parts run their calls under the template element that holds the SVG).
export const idsOfTarget = ( target, animate ) => new Set( [
	draftId( target.tpl )?.id,
	...( target.owns || [] ),
	...( target.reach || [] ),
	...Object.values( animate || {} ).flatMap( ( list ) => ( list || [] ).filter( ( c ) => c.key === ( target.key ?? target.ref ) && ! c.own ).map( ( c ) => c.tpl ) ),
].filter( ( id ) => undefined !== id && null !== id ).map( String ) );

// The draft's records of inlined SVG elements inside a target (their ids are SVG ids, not template ids).
export const svgRecordsOf = ( target, records, animate ) => {
	const own = idsOfTarget( target, animate );
	return ( records || [] ).filter( ( r ) => svgIdOf( r ) && own.has( String( r.element?.nearest_tpl_id ) ) );
};

export function heroSvgParts( { target, block, saved, records, clientData, animate, readSvg } ) {
	if ( 'sgs/hero' !== block ) {
		return [];
	}
	const named = svgRecordsOf( target, records, animate );
	if ( ! named.length ) {
		return [];
	}
	// A hero whose background image is an SVG file that animates itself already plays that motion: nothing inline to animate.
	const markup = inlineBackground( saved );
	const file = markup ? null : animatedBackground( saved, readSvg );
	if ( file ) {
		return [ { status: 'equal', prop: 'backgroundSvgParts', why: `${ target.tpl } draws an inline SVG part animation (${ named[ 0 ].id } to ${ named[ named.length - 1 ].id }); the hero's background is the animated SVG file ${ file[ 0 ].split( '/' ).pop() }, which plays it` } ];
	}
	if ( ! markup ) {
		return [ { status: 'no-setting', prop: 'backgroundSvgParts', why: `${ target.tpl } draws an inline SVG part animation (${ named[ 0 ].id } to ${ named[ named.length - 1 ].id }) and the hero's Background Source holds no inline SVG to animate` } ];
	}
	const data = clientData?.hero;
	if ( ! data?.backgroundSvgParts?.length ) {
		return [ { status: 'no-setting', prop: 'backgroundSvgParts', why: `${ target.tpl } draws an inline SVG part animation (${ named.map( ( r ) => r.id ).join( ', ' ) }) and the client has no build/hero-svg-parts.json` } ];
	}
	const have = ids( markup );
	const wanted = data.backgroundSvgParts.flatMap( ( p ) => [ p.target, p.copyShapeFrom ] ).filter( Boolean );
	const missing = [ ...new Set( wanted ) ].filter( ( id ) => ! have.has( id ) );
	if ( missing.length ) {
		return [ { status: 'no-setting', prop: 'backgroundSvgParts', why: `the hero's saved SVG has no element with id ${ missing.join( ', ' ) }, which hero-svg-parts.json animates` } ];
	}
	return [ settle( {
		prop: 'backgroundSvgParts',
		why: `${ target.tpl } plays ${ data.backgroundSvgParts.length } SVG part animations (${ named[ 0 ].id } to ${ named[ named.length - 1 ].id })`,
		saved,
		writes: [ { attr: 'backgroundSvgParts', value: data.backgroundSvgParts }, ...( data.backgroundSvgPartsTrigger ? [ { attr: 'backgroundSvgPartsTrigger', value: data.backgroundSvgPartsTrigger } ] : [] ) ],
		record: named[ 0 ].id,
	} ) ];
}

export function changeAnimation( { target, block, saved, recordsIndex, db } ) {
	if ( 'sgs/testimonial-slider' !== block ) {
		return [];
	}
	const reach = [ ...idsOfTarget( target ) ].flatMap( ( id ) => recordsFor( recordsIndex, `Root/${ id }#0` ) );
	const rec = [ ...recordsOf( recordsIndex, target ), ...reach ].find( ( r ) => 'state' === r.trigger?.type && ( r.properties || [] ).some( ( p ) => 'opacity' === p.property ) );
	const move = rec?.properties.find( ( p ) => 'transform' === p.property );
	const dx = /^translateX\((-?[\d.]+)px\)$/.exec( String( move?.from ?? '' ).trim() );
	if ( ! rec || ! dx ) {
		return [];
	}
	const writes = [ { attr: 'changeTransition', value: 'fade-up' }, { attr: 'changeDistance', value: Number( dx[ 1 ] ) }, { attr: 'changeDuration', value: rec.duration_ms } ];
	const out = [];
	const easing = easingName( { db, block, attr: 'changeEasing', css: rec.easing } );
	if ( easing ) {
		writes.push( { attr: 'changeEasing', value: easing } );
	} else {
		out.push( { status: 'no-setting', prop: 'changeEasing', why: `${ rec.id } eases with ${ rec.easing }, which no named easing of changeEasing gives` } );
	}
	return [ settle( { prop: 'change animation', why: `${ target.tpl } fades the new card in over ${ rec.duration_ms }ms, ${ dx[ 1 ] }px from the side (${ rec.id })`, saved: { ...defaultsOf( db, block, writes.map( ( w ) => w.attr ) ), ...saved }, writes, record: rec.id } ), ...out ];
}

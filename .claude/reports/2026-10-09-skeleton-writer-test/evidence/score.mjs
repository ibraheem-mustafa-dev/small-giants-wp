// Adapted from the About proof's score.mjs (session d85527e4): same leaf rule, same equality, same CONTENT/MOTION split;
// pairing is by tree path, and only where both trees hold the same block type at the same path.
import fs from 'fs';
import { blockSchema } from 'file:///C:/Users/Bean/Projects/small-giants-wp/scripts/computed-route/lib/resolve.mjs';
const ROOT = 'C:/Users/Bean/Projects/small-giants-wp';
const SP = 'C:/Users/Bean/AppData/Local/Temp/claude/c--Users-Bean-Projects-small-giants-wp/a312603f-36e7-40a1-8bd1-5977270c6bfc/scratchpad/fill';
const key = JSON.parse( fs.readFileSync( `${ ROOT }/sites/eye-care-ward-end/build/footer.tree.json`, 'utf8' ) );
const fill = JSON.parse( fs.readFileSync( `${ SP }/filled.tree.json`, 'utf8' ) );
const byPath = ( t ) => { const m = new Map(); const go = ( ns, p ) => ns.forEach( ( n, i ) => { const q = ( p ? `${ p }.` : '' ) + ( 'sgs/icon' === n.name && n.attributes?.brandName ? `icon:${ n.attributes.brandName }` : `${ i }` ); m.set( q, n ); go( n.innerBlocks || [], q ); } ); go( t, '' ); return m; };
const KM = byPath( key ), FM = byPath( fill );
function leaves( attrs, block ) {
	const out = {};
	const schema = blockSchema( block ) || {};
	const unitOf = ( k ) => attrs[ `${ k }Unit` ] ?? schema[ `${ k }Unit` ]?.default;
	const walk = ( v, p ) => { if ( v && 'object' === typeof v && ! Array.isArray( v ) ) { Object.entries( v ).forEach( ( [ k, x ] ) => walk( x, p ? `${ p }.${ k }` : k ) ); } else { out[ p ] = v; } };
	for ( const [ k, v ] of Object.entries( attrs ) ) {
		if ( 'className' === k || /Unit$/.test( k ) ) continue;
		const unit = unitOf( k );
		walk( 'number' === typeof v && unit && 'unitless' !== unit ? `${ v }${ unit }` : v, k );
		if ( v && 'object' === typeof v && unit ) for ( const lk of Object.keys( out ).filter( ( x ) => x.startsWith( `${ k }.` ) ) ) if ( 'number' === typeof out[ lk ] && 'unitless' !== unit ) out[ lk ] = `${ out[ lk ] }${ unit }`;
	}
	for ( const k of Object.keys( out ) ) if ( 'number' === typeof out[ k ] ) out[ k ] = String( out[ k ] );
	for ( const k of Object.keys( out ) ) {
		const m = /^(.*?)\.(desktop|tablet|mobile)(\..*)?$/.exec( k ); if ( ! m ) continue;
		const [ , base, , rest = '' ] = m;
		for ( const t of [ 'tablet', 'mobile' ] ) { const kk = `${ base }.${ t }${ rest }`; if ( ! ( kk in out ) ) { const from = ( 'tablet' === t ? [ 'desktop' ] : [ 'tablet', 'desktop' ] ).map( ( x ) => `${ base }.${ x }${ rest }` ).find( ( x ) => x in out ); if ( from ) out[ kk ] = out[ from ]; } }
	}
	return out;
}
const norm = ( v ) => String( v ).replace( /\s+/g, '' ).toLowerCase();
const num = ( v ) => parseFloat( String( v ).replace( /px$/, '' ) );
const same = ( a, b ) => norm( a ) === norm( b ) || ( ! isNaN( num( a ) ) && ! isNaN( num( b ) ) && /^-?[\d.]+(px)?$/.test( String( a ) ) && /^-?[\d.]+(px)?$/.test( String( b ) ) && Math.abs( num( a ) - num( b ) ) <= 0.5 );
const MOTION = /^sgsAnim/;
const CONTENT = [ 'text', 'content', 'label', 'url', 'message', 'level', 'tagName', 'anchor', 'metadata' ];
const tot = { exact: 0, different: 0, keyOnly: 0, fillOnly: 0 }, motion = { exact: 0, different: 0, keyOnly: 0, fillOnly: 0 };
const excluded = [], keyUnmatched = [], fillUnmatched = [], per = [];
let wordsOk = 0, words = 0; const wordMiss = [];
for ( const [ p, k ] of KM ) {
	const f = FM.get( p );
	if ( ! f ) { keyUnmatched.push( `${ p } ${ k.name }` ); continue; }
	if ( f.name !== k.name ) { excluded.push( `${ p } key ${ k.name } / fill ${ f.name }` ); continue; }
	const kl = leaves( k.attributes || {}, k.name ), fl = leaves( f.attributes || {}, f.name );
	const row = { p, name: k.name, exact: [], different: [], keyOnly: [], fillOnly: [] };
	for ( const [ q, v ] of Object.entries( kl ) ) {
		const root = q.split( '.' )[ 0 ]; if ( CONTENT.includes( root ) ) continue;
		const b = MOTION.test( root ) ? motion : tot;
		if ( ! ( q in fl ) ) { row.keyOnly.push( `${ q }=${ JSON.stringify( v ) }` ); b.keyOnly++; }
		else if ( same( v, fl[ q ] ) ) { row.exact.push( q ); b.exact++; }
		else { row.different.push( `${ q }: key ${ JSON.stringify( v ) } | fill ${ JSON.stringify( fl[ q ] ) }` ); b.different++; }
	}
	for ( const [ q, v ] of Object.entries( fl ) ) { const root = q.split( '.' )[ 0 ]; if ( ! ( q in kl ) && ! CONTENT.includes( root ) ) { row.fillOnly.push( `${ q }=${ JSON.stringify( v ) }` ); ( MOTION.test( root ) ? motion : tot ).fillOnly++; } }
	per.push( row );
	for ( const [ a, v ] of Object.entries( k.attributes || {} ) ) if ( [ 'text', 'content', 'label', 'url', 'message', 'level', 'tagName', 'anchor' ].includes( a ) ) { words++; if ( JSON.stringify( f.attributes?.[ a ] ) === JSON.stringify( v ) ) wordsOk++; else wordMiss.push( `${ p }.${ a }: key ${ JSON.stringify( v ) } | fill ${ JSON.stringify( f.attributes?.[ a ] ) }` ); }
}
for ( const [ p, f ] of FM ) if ( ! KM.has( p ) ) fillUnmatched.push( `${ p } ${ f.name }` );
const pct = ( o ) => `${ o.exact } exact of ${ o.exact + o.different + o.keyOnly } key leaves (${ Math.round( 100 * o.exact / Math.max( 1, o.exact + o.different + o.keyOnly ) ) }%); ${ o.different } differ, ${ o.keyOnly } missed by Fill, ${ o.fillOnly } extra in Fill`;
console.log( 'PAIRED NODES  ', per.length, per.map( ( r ) => `${ r.p }:${ r.name.replace( 'sgs/', '' ) }` ).join( ' ' ) );
console.log( 'EXCLUDED (type differs)', excluded.length ); excluded.forEach( ( x ) => console.log( '   ', x ) );
console.log( 'KEY-ONLY NODES', keyUnmatched.length, keyUnmatched.join( '; ' ) );
console.log( 'FILL-ONLY NODES', fillUnmatched.length, fillUnmatched.join( '; ' ) );
console.log( 'STYLE LEAVES  ', pct( tot ) );
console.log( 'MOTION LEAVES ', pct( motion ) );
console.log( `CONTENT LEAVES ${ wordsOk } of ${ words } identical (paired nodes)` ); wordMiss.forEach( ( x ) => console.log( '   ', x ) );
if ( process.argv.includes( '--detail' ) ) for ( const r of per ) {
	console.log( `\n#${ r.p } ${ r.name }: ${ r.exact.length } exact: ${ r.exact.join( ', ' ) }` );
	r.different.forEach( ( x ) => console.log( '  DIFF  ', x ) ); r.keyOnly.forEach( ( x ) => console.log( '  MISSED', x ) ); r.fillOnly.forEach( ( x ) => console.log( '  EXTRA ', x ) );
}

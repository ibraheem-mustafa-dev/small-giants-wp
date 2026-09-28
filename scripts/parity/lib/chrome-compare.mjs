// Full-check comparisons for draft-live-walk.mjs (GAP-CHECKLIST.md section 11): painted
// ground and text inset, a root's inventory (text, order, media, glyphs, spill), the motion
// timeline after the state's action, and what a hover visibly does.
import { sameValue } from './compare.mjs';


// Text inset is compared only on pairs that carry text (a container's first text is whatever sits in it).
export function compareExtras( d, l, tol, withText = true ) {
	const out = [];
	if ( ! d || ! l ) {
		return out;
	}
	if ( d.ground !== l.ground && ! sameValue( 'background-color', d.ground, l.ground, 0 ) ) {
		out.push( { kind: 'style', key: 'painted-ground', draft: d.ground, live: l.ground } );
	}
	for ( const k of withText ? [ 'textX', 'textY' ] : [] ) {
		if ( null !== d[ k ] && null !== l[ k ] && Math.abs( d[ k ] - l[ k ] ) > tol.box ) {
			out.push( { kind: 'box', key: 'textX' === k ? 'text-inset-x' : 'text-inset-y', draft: d[ k ], live: l[ k ] } );
		}
	}
	return out;
}

const countBy = ( list ) => list.reduce( ( m, x ) => m.set( x, ( m.get( x ) || 0 ) + 1 ), new Map() );
const minus = ( a, b ) => {
	const mb = countBy( b );
	return a.filter( ( x ) => ( mb.get( x ) > 0 ? ( mb.set( x, mb.get( x ) - 1 ), false ) : true ) );
};

// `ignore` (a pair's inventoryIgnore regex source) drops text that changes by itself (a rotating
// message) and removes it from the row names media are filed under.
export function compareInventory( dRaw, lRaw, ignore ) {
	const out = [];
	if ( ! dRaw || ! lRaw ) {
		return out;
	}
	const re = ignore ? new RegExp( ignore, 'gi' ) : null;
	const clean = ( inv ) => ( re ? {
		texts: inv.texts.filter( ( t ) => t.replace( re, '' ).trim() ),
		media: inv.media.map( ( m ) => ( { ...m, host: m.host.replace( re, '' ).replace( /\s+/g, ' ' ).trim() } ) ),
	} : inv );
	const d = clean( dRaw );
	const l = clean( lRaw );
	const missing = minus( d.texts, l.texts );
	const extra = minus( l.texts, d.texts );
	if ( missing.length ) {
		out.push( { kind: 'inventory', key: 'text-missing', draft: missing.join( ' | ' ), live: '(absent)' } );
	}
	if ( extra.length ) {
		out.push( { kind: 'inventory', key: 'text-extra', draft: '(absent)', live: extra.join( ' | ' ) } );
	}
	// Order of the text both sides share: the first place the sequences part.
	const shared = ( a, b ) => {
		const pool = countBy( b );
		return a.filter( ( x ) => ( pool.get( x ) > 0 ? ( pool.set( x, pool.get( x ) - 1 ), true ) : false ) );
	};
	const ds = shared( d.texts, l.texts );
	const ls = shared( l.texts, d.texts );
	const at = ds.findIndex( ( x, i ) => x !== ls[ i ] );
	if ( at > -1 ) {
		out.push( { kind: 'inventory', key: 'order', draft: ds.slice( at, at + 5 ).join( ' > ' ), live: ls.slice( at, at + 5 ).join( ' > ' ) } );
	}
	// Media by the row it sits in: a glyph missing, a different glyph (kind and part count), or media on one side only.
	const byHost = ( m ) => m.reduce( ( acc, x ) => ( ( acc[ x.host ] = acc[ x.host ] || [] ).push( `${ x.kind }/${ x.parts }` ), acc ), {} );
	const dh = byHost( d.media );
	const lh = byHost( l.media );
	for ( const host of new Set( [ ...Object.keys( dh ), ...Object.keys( lh ) ] ) ) {
		const a = ( dh[ host ] || [] ).sort().join( ', ' );
		const b = ( lh[ host ] || [] ).sort().join( ', ' );
		if ( a !== b ) {
			out.push( { kind: 'inventory', key: `media "${ host.slice( 0, 30 ) }"`, draft: a || '(none)', live: b || '(none)' } );
		}
	}
	const spills = ( m ) => m.filter( ( x ) => x.spill > 2 ).map( ( x ) => `${ x.host || x.kind } ${ x.spill }px` );
	if ( spills( l.media ).length > spills( d.media ).length ) {
		out.push( { kind: 'inventory', key: 'media-spill', draft: spills( d.media ).join( ', ' ) || 'none', live: spills( l.media ).join( ', ' ) } );
	}
	return out;
}

// Samples at 30/120/250/450ms after the state's last action. One diff per aspect, at the first
// time the two sides part: growth of the box, opacity, the root moving, children moving or
// clipped (a staggered rise), and whether the running animations are staggered.
export function compareTimeline( name, dt, lt ) {
	const out = [];
	if ( ! dt?.length || ! lt?.length ) {
		return out;
	}
	const final = ( t ) => t[ t.length - 1 ].data[ name ];
	const df = final( dt );
	const lf = final( lt );
	if ( ! df || ! lf ) {
		return out;
	}
	const aspects = {
		growth: ( s, f ) => ( f.h ? Math.round( ( s.h / f.h ) * 100 ) / 100 : 1 ),
		opacity: ( s ) => s.op,
		// In motion = not yet at the settled pose (a static centring transform is not motion).
		moving: ( s, f ) => s.tf !== f.tf,
		// Only leaves visible once settled: a text layer kept at opacity 0 (a scramble's twin) is not motion.
		children: ( s, f ) => s.leaves.some( ( x, i ) => f.leaves[ i ]?.op > 0.5 && ( x.tf !== f.leaves[ i ].tf || x.clip !== f.leaves[ i ].clip || Math.abs( x.op - f.leaves[ i ].op ) > 0.05 ) ),
	};
	for ( const [ aspect, fn ] of Object.entries( aspects ) ) {
		for ( let i = 0; i < Math.min( dt.length, lt.length ); i++ ) {
			const a = dt[ i ].data[ name ];
			const b = lt[ i ].data[ name ];
			if ( ! a || ! b ) {
				continue;
			}
			const va = fn( a, df );
			const vb = fn( b, lf );
			const differs = 'number' === typeof va ? Math.abs( va - vb ) > 0.15 : va !== vb;
			if ( differs ) {
				out.push( { kind: 'motion', key: `timeline@${ dt[ i ].t }ms:${ aspect }`, draft: String( va ), live: String( vb ) } );
				break;
			}
		}
	}
	const stagger = ( t ) => new Set( t[ 0 ].data[ name ]?.delays.filter( ( x ) => x > 0 ) || [] ).size >= 2;
	if ( stagger( dt ) !== stagger( lt ) ) {
		out.push( { kind: 'motion', key: 'stagger', draft: String( stagger( dt ) ), live: String( stagger( lt ) ) } );
	}
	return out;
}

// What a hover visibly does, as a set of effects: a ground or a small left marker fading in, an
// inner part scaling, the element lifting, indenting or fading, and text changing mid-hover.
export function hoverEffects( rest, end, mids ) {
	const fx = new Set();
	if ( ! rest || ! end ) {
		return fx;
	}
	if ( mids.some( ( m ) => m && m.text !== rest.text && m.text !== end.text ) ) {
		fx.add( 'text changes mid-hover' );
	}
	const clear = ( c ) => /rgba\([^)]*,\s*0\)$/.test( c );
	for ( const e of end.parts ) {
		const r = rest.parts.find( ( x ) => x.id === e.id );
		if ( ! r || ! e.vis ) {
			continue;
		}
		const appears = ( r.op < 0.1 && e.op > 0.5 ) || ( clear( r.bg ) && ! clear( e.bg ) && e.op > 0.5 );
		if ( e.cover && appears ) {
			fx.add( 'ground appears' );
		}
		if ( e.small && e.left && r.op < 0.1 && e.op > 0.5 ) {
			fx.add( 'marker appears' );
		}
		if ( '0' !== e.id && r.tf !== e.tf && /matrix\((0\.9|1\.0?[1-9])/.test( e.tf ) ) {
			fx.add( 'inner part scales' );
		}
		if ( '0' === e.id ) {
			if ( r.tf !== e.tf ) {
				fx.add( /matrix\(1, 0, 0, 1, 0, -/.test( e.tf ) ? 'lifts' : 'moves' );
			}
			if ( r.pl !== e.pl ) {
				fx.add( 'indents' );
			}
			if ( r.op - e.op > 0.1 ) {
				fx.add( 'fades' );
			}
		}
	}
	return fx;
}

export function compareHover( d, l ) {
	if ( ! d || ! l ) {
		return [];
	}
	const a = [ ...d ].sort().join( ', ' ) || 'none';
	const b = [ ...l ].sort().join( ', ' ) || 'none';
	return a === b ? [] : [ { kind: 'hover', key: 'hover-effects', draft: a, live: b } ];
}

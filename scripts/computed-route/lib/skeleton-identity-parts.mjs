// The kinds of value and the named parts a draft element shows, for identification by elimination (Spec 48 §3.4, FR-48-6;
// plan F1, the identity matcher's follow-ups). Each reader proves its fact from the draft's own evidence, never from a class
// name or a block name, and names it in the framework DB's own vocabulary:
//   - `accepts-kind` (`block_identity_facts`, `*=icon:<kind>`): an emoji or a single symbol glyph standing as an element of
//     its own beside text (`icon:emoji`), an inline svg drawn by strokes on a 24-unit grid (`icon:lucide`, the icon library's
//     drawing), read for the kinds the DB holds rows for; an icon inside a control is the control's own drawing, no value;
//   - `shows-part` (a `motion_targets` part name): stars (a run of three or more identical symbol glyphs, or identical svgs,
//     with a number beside or in its label) are `star` and `aggregate-star`; a number from 0 to 10 beside stars or inside a
//     link to a platform is `average` and `score`; digits followed within three words by a plural noun or the platform's name
//     ("15 reviews", "8 on Trustpilot") are `count`; a link to a platform's host is `see-all` and `write-review`; a control
//     whose handler scrolls a track, or whose words are one arrow glyph, is `arrow`; a run of two or more small wordless
//     sibling controls is `dot`. Parts only widen a placed block over what it draws (R2), never place one.
const SYMBOL = /^(?:\p{Extended_Pictographic}|\p{So})(?:️|‍(?:\p{Extended_Pictographic}|\p{So}))*$/u;
const ARROWS = new Set( [ '←', '→', '‹', '›', '«', '»', '<', '>', '⟵', '⟶', '↑', '↓', '❮', '❯' ] );
const squash = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
const graphemes = ( s ) => [ ...new Intl.Segmenter( undefined, { granularity: 'grapheme' } ).segment( s ) ].map( ( x ) => x.segment );
const NUMBER = /^\d{1,2}(?:[.,]\d{1,2})?$/;

// o: { m, read, platformsIn( e ), scrollsTrack( e ), kinds (Set of the DB's `*=icon:<kind>` values) }. Returns
// { kindsOf( e ) → [ value ], partsOf( e ) → [ part name ] }.
export function makePartReaders( { m, read, platformsIn, scrollsTrack, kinds = new Set() } ) {
	const kidMap = new Map();
	m.els.forEach( ( c ) => ( kidMap.get( c.parentKey ) ?? kidMap.set( c.parentKey, [] ).get( c.parentKey ) ).push( c ) );
	const kidsOf = ( e ) => ( kidMap.get( e.key ) || [] ).filter( ( k ) => Object.values( k.visible || {} ).some( Boolean ) );
	const ownWords = ( e ) => squash( m.words( e ) );
	const isControl = ( e ) => 'button' === e.tag || ( 'a' === e.tag && null != read.attr( e, 'href' ) ) || !! read.handler( e );
	const sameSvgs = ( e ) => {
		const svgs = kidsOf( e ).filter( ( k ) => 'svg' === k.tag );
		return svgs.length >= 3 && svgs.length === kidsOf( e ).length && new Set( svgs.map( ( s ) => read.attr( s, 'viewBox' ) ) ).size === 1;
	};
	const glyphRun = ( e ) => {
		const g = graphemes( ownWords( e ).replace( /\s/g, '' ) );
		return g.length >= 3 && SYMBOL.test( g[ 0 ] ) && g.every( ( x ) => x === g[ 0 ] );
	};
	const numberIn = ( s ) => /\d/.test( String( s ?? '' ) );
	const isNumber = ( e ) => NUMBER.test( ownWords( e ) ) && Number( ownWords( e ).replace( ',', '.' ) ) <= 10 && ! m.blockKids( e ).length;
	const siblings = ( e ) => ( m.byKey[ e.parentKey ] ? m.blockKids( m.byKey[ e.parentKey ] ) : [] ).filter( ( k ) => k !== e );
	const isStars = ( e ) => ( glyphRun( e ) || sameSvgs( e ) ) && ( numberIn( read.attr( e, 'aria-label' ) ) || numberIn( read.attr( m.byKey[ e.parentKey ] ?? {}, 'aria-label' ) ) || siblings( e ).some( isNumber ) );
	const starsNear = ( e ) => siblings( e ).some( ( s ) => isStars( s ) || m.blockKids( s ).some( isStars ) );
	const platformLinkAbove = ( e ) => {
		for ( let p = m.byKey[ e.parentKey ], i = 0; p && i < 3; p = m.byKey[ p.parentKey ], i++ ) {
			if ( isControl( p ) && platformsIn( p ).length ) {
				return true;
			}
		}
		return false;
	};
	const counts = ( e ) => {
		const w = ownWords( e );
		const platform = platformsIn( e ).length > 0;
		return /\d/.test( w ) && ( /\d[\d,.]*\s+(?:[\p{L}'’]+\s+){0,3}?[\p{L}'’]*\p{L}s\b/u.test( w ) || ( platform && /\d[\d,.]*\s+(?:[\p{L}'’]+\s+){0,3}/u.test( `${ w } ` ) ) ) && ! m.blockKids( e ).length;
	};
	const dotRun = ( e ) => {
		const p = m.byKey[ e.parentKey ];
		const run = p ? m.blockKids( p ) : [];
		const small = ( x ) => {
			const b = x.box?.[ 1440 ] || x.box?.[ 375 ];
			return ! b || ( b.h <= 24 && b.w <= 48 );
		};
		return run.length >= 2 && run.every( ( x ) => x.tag === e.tag && isControl( x ) && ! ownWords( x ) && ! m.blockKids( x ).length && small( x ) );
	};
	const partsOf = ( e ) => {
		const out = [];
		if ( isStars( e ) ) {
			out.push( 'star', 'aggregate-star' );
		}
		if ( isNumber( e ) && ( starsNear( e ) || platformLinkAbove( e ) ) ) {
			out.push( 'average', 'score' );
		}
		if ( counts( e ) ) {
			out.push( 'count' );
		}
		if ( isControl( e ) && null != read.attr( e, 'href' ) && platformsIn( e ).length ) {
			out.push( 'see-all', 'write-review' );
		}
		if ( isControl( e ) && ( scrollsTrack( e ) || ARROWS.has( ownWords( e ) ) ) ) {
			out.push( 'arrow' );
		}
		if ( isControl( e ) && dotRun( e ) ) {
			out.push( 'dot' );
		}
		return out;
	};
	// An icon inside a control (a button's arrow, a link's glyph) is the control's own drawing, never a value a field holds.
	const inControl = ( e ) => {
		for ( let p = m.byKey[ e.parentKey ]; p; p = m.byKey[ p.parentKey ] ) {
			if ( isControl( p ) ) {
				return true;
			}
		}
		return false;
	};
	const kindsOf = ( e ) => {
		const out = [];
		if ( inControl( e ) || isControl( e ) ) {
			return out;
		}
		const w = ownWords( e );
		const g = graphemes( w );
		const beside = siblings( e ).some( ( s ) => ownWords( s ) || squash( s.allText ) );
		if ( 1 === g.length && SYMBOL.test( g[ 0 ] ) && ! m.blockKids( e ).length && beside ) {
			out.push( '*=icon:emoji' );
		}
		const stroke = read.attr( e, 'stroke' ) ?? read.attr( e, 'strokeWidth' ) ?? read.attr( e, 'stroke-width' );
		if ( 'svg' === e.tag && '0 0 24 24' === String( read.attr( e, 'viewBox' ) ?? '' ).trim() && null != stroke && 'none' === String( read.attr( e, 'fill' ) ?? '' ).trim() ) {
			out.push( '*=icon:lucide' );
		}
		return out.filter( ( k ) => kinds.has( k ) );
	};
	return { partsOf, kindsOf };
}

// The draft's head (Spec 48 FR-48-84): the <title>, <meta> and <link> elements of each draft's helmet and its font
// loads, read from the census's stamped templates (lib/intake-census-template.mjs::draftSources, one record per
// element). Each item is handled where the site takes it, or unhandled and raised as its own missing-features row, so
// covering a head tag never hides a use of it the route does not clone (FP-9):
//   a font stylesheet, @import or @font-face   → the snapshot's self-hosted font families (lib/head-check.mjs::fontCheck)
//   a preconnect or dns-prefetch to a font host → nothing: the faces are served from the site itself
//   <meta charset>, <meta name=viewport>       → WordPress prints both (wp-includes/template-canvas.php)
//   <title>                                    → the site title and tagline (lib/intake-siteinfo.mjs::titleCandidates)
// A description meta, a font host whose families are not read, and a <title>, <link> or <meta> outside the helmet (an
// inline SVG's <title>, page microdata) are raised.
import { FONT_HOSTS, isFontUrl } from './intake-census-template.mjs';

export const HEAD_WAVE = 'site and surfaces';
const attr = ( e, name ) => e.attrs.find( ( [ n ] ) => n.toLowerCase() === name )?.[ 1 ] ?? null;
const hostOf = ( u ) => {
	try {
		return new URL( u ).hostname.toLowerCase();
	} catch {
		return null;
	}
};

// The families and weights a Google Fonts URL loads (css2 `family=Name:ital,wght@0,400;1,700` or `wght@500;600`, css v1
// `family=Name:400,700i|Other`): [ { family, weights: [number], italic } ]. A URL from another host gives [].
export function fontUrlFamilies( href ) {
	let url;
	try {
		url = new URL( String( href ).replace( /&amp;/g, '&' ) );
	} catch {
		return [];
	}
	if ( 'fonts.googleapis.com' !== url.hostname ) {
		return [];
	}
	const css2 = url.pathname.startsWith( '/css2' );
	const specs = css2 ? url.searchParams.getAll( 'family' ) : ( url.searchParams.get( 'family' ) || '' ).split( '|' );
	return specs.filter( Boolean ).map( ( spec ) => {
		const [ name, axes = '' ] = spec.split( ':' );
		const family = name.replace( /\+/g, ' ' ).trim();
		const weights = new Set();
		let italic = false;
		if ( css2 ) {
			const [ keys, values = '' ] = axes.split( '@' );
			const names = keys ? keys.split( ',' ) : [];
			for ( const tuple of values.split( ';' ).filter( Boolean ) ) {
				const parts = tuple.split( ',' );
				const at = ( k ) => parts[ names.indexOf( k ) ];
				if ( names.includes( 'wght' ) ) {
					at( 'wght' ).split( '..' ).forEach( ( w ) => weights.add( Number( w ) ) );
				}
				italic = italic || '1' === at( 'ital' );
			}
		} else {
			for ( const v of axes.split( ',' ).filter( Boolean ) ) {
				weights.add( Number( v.replace( /\D/g, '' ) ) || 400 );
				italic = italic || /i(talic)?$/.test( v );
			}
		}
		return { family, weights: weights.size ? [ ...weights ].sort( ( a, b ) => a - b ) : [ 400 ], italic };
	} );
}

// The head of every draft in a census ({ sources }): { fonts, preconnects, metas, titles, unhandled }. Each entry
// carries its draft ID (`<component>:<data-dc-tpl>`).
export function readHead( census ) {
	const head = { fonts: [], preconnects: [], metas: [], titles: [], unhandled: [] };
	const raise = ( what, draftId, line ) => head.unhandled.push( { what, draftId, line } );
	for ( const s of census?.sources || [] ) {
		for ( const e of s.stamped?.elements || [] ) {
			const draftId = `${ s.component }:${ e.n }`;
			// Only the helmet's tags are the document head: an inline SVG's <title> is its accessible name, and a <link>
			// or <meta> in the page markup (microdata, a stray stylesheet) is page content; each is raised, never read
			// as the head's.
			const where = e.svg ? 'svg' : e.inHelmet ? null : 'body';
			if ( where && [ 'title', 'meta', 'link' ].includes( e.tag ) ) {
				raise( `${ e.tag }:${ where }`, draftId, `a <${ e.tag }> ${ 'svg' === where ? 'inside an inline SVG (its accessible name)' : 'in the page markup, outside the head' } has no clone path` );
			} else if ( 'title' === e.tag ) {
				head.titles.push( { component: s.component, file: s.file, text: String( e.body ?? '' ).replace( /\s+/g, ' ' ).trim(), draftId } );
			} else if ( 'meta' === e.tag ) {
				const name = ( attr( e, 'name' ) || '' ).toLowerCase();
				if ( null !== attr( e, 'charset' ) ) {
					head.metas.push( { kind: 'charset', value: attr( e, 'charset' ), draftId } );
				} else if ( 'viewport' === name ) {
					head.metas.push( { kind: name, value: attr( e, 'content' ), draftId } );
				} else {
					const key = name || ( attr( e, 'property' ) || attr( e, 'http-equiv' ) || 'unnamed' ).toLowerCase();
					raise( `meta:${ key }`, draftId, `<meta ${ name ? 'name' : attr( e, 'property' ) ? 'property' : 'http-equiv' }="${ key }"> has no clone path (charset and viewport are cloned${ 'description' === key ? '; nothing writes a description to a page excerpt yet' : '' })` );
				}
			} else if ( 'link' === e.tag ) {
				const rel = ( attr( e, 'rel' ) || '' ).toLowerCase().trim();
				const href = attr( e, 'href' ) || '';
				if ( /\bstylesheet\b/.test( rel ) && isFontUrl( href ) && ! fontUrlFamilies( href ).length ) {
					raise( `font:${ hostOf( href ) || 'file' }`, draftId, `font stylesheet ${ href }: its families are not read (Google Fonts addresses are), so the snapshot cannot self-host them` );
				} else if ( /\bstylesheet\b/.test( rel ) && isFontUrl( href ) ) {
					head.fonts.push( { via: 'stylesheet', href, families: fontUrlFamilies( href ), draftId } );
				} else if ( /^(?:preconnect|dns-prefetch)$/.test( rel ) && FONT_HOSTS.includes( hostOf( href ) ) ) {
					head.preconnects.push( { host: hostOf( href ), draftId } );
				} else {
					raise( `link:${ rel || 'no-rel' }`, draftId, `<link rel="${ rel }" href="${ href }"> has no clone path (font stylesheets and font-host preconnects are cloned)` );
				}
			}
			for ( const r of e.css || [] ) {
				if ( 'font-face' === r.type ) {
					head.fonts.push( { via: '@font-face', family: String( r.name || '' ).replace( /^['"]|['"]$/g, '' ), families: [], draftId } );
				} else if ( 'import' === r.type && isFontUrl( r.name ) && ! fontUrlFamilies( r.name ).length ) {
					raise( `font:${ hostOf( r.name ) || 'file' }`, draftId, `font @import ${ r.name }: its families are not read (Google Fonts addresses are), so the snapshot cannot self-host them` );
				} else if ( 'import' === r.type && isFontUrl( r.name ) ) {
					head.fonts.push( { via: '@import', href: r.name, families: fontUrlFamilies( r.name ), draftId } );
				}
			}
		}
	}
	return head;
}

// The missing-features rows for the head items the route does not clone: one row per kind of item (`meta:theme-color`,
// `link:icon`), with its first draft ID and how often the draft uses it.
export function headMissing( census ) {
	const byWhat = new Map();
	for ( const u of readHead( census ).unhandled ) {
		const row = byWhat.get( u.what ) || { rowId: `missing:head:${ u.what }`, draftId: u.draftId, construct: `head ${ u.what }`, from: 'head', line: u.line, mainFlow: null, count: 0, wave: HEAD_WAVE, why: `${ u.line }; wave ${ HEAD_WAVE }` };
		row.count++;
		byWhat.set( u.what, row );
	}
	return [ ...byWhat.values() ];
}

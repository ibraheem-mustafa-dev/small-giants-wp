// Where a site check (site-check.mjs) points: the site's address from its secrets file, the page-map rows it loads, and
// the client the scripted flows belong to. Only the site's address is read from a secrets file; nothing here prints one.
import fs from 'fs';
import path from 'path';
import { candidateRoots, parseEnv } from '../../parity/flows/lib/browser.mjs';
import { flowsOutRoot } from '../../parity/flows/lib/flow.mjs';
import { hasPost, rowKey, readIdsSite, readPageMap, rowsForSite } from './site-build-map.mjs';

// The calibration target of `site` (calibration-targets.json: envFile, envKey, mirrorOf, pluginDir), else the plain
// `.claude/secrets/<site>.env` convention (the key is the site name upper-cased without punctuation). null when neither.
export function targetOf( site, targets, roots ) {
	if ( targets[ site ]?.envFile && targets[ site ]?.envKey ) {
		return { ...targets[ site ], site };
	}
	const envFile = `.claude/secrets/${ site }.env`;
	return roots.some( ( r ) => fs.existsSync( path.join( r, envFile ) ) ) ? { site, envFile, envKey: site.toUpperCase().replace( /[^A-Z0-9]/g, '' ) } : null;
}

// The site's address (WP_URL_<key>) from the first root holding the secrets file: the repo, then, inside a worktree,
// the main checkout (a worktree has no gitignored secrets). Throws naming the file and key, never a value.
export function siteBase( target, roots ) {
	for ( const r of roots ) {
		const file = path.join( r, target.envFile );
		if ( fs.existsSync( file ) ) {
			const url = parseEnv( fs.readFileSync( file, 'utf8' ) )[ `WP_URL_${ target.envKey }` ];
			if ( ! url ) {
				throw new Error( `${ target.envFile } has no WP_URL_${ target.envKey }` );
			}
			return url.replace( /\/+$/, '' );
		}
	}
	throw new Error( `no ${ target.envFile } in ${ roots.join( ' or ' ) }` );
}

export { candidateRoots };

// The post types a visitor opens as a page of their own.
const PAGE_TYPES = { page: 'page_id', shop: 'page_id', post: 'p' };
// WooCommerce rows with no post of their own, opened through one example the Store API lists.
export const STORE_EXAMPLES = { product: '/wp-json/wc/store/v1/products?per_page=1', product_cat: '/wp-json/wc/store/v1/products/categories?per_page=1' };

// The page map's ids belong to the site its `page-map.site` names; a mirror (calibration-targets.json `mirrorOf`) shares
// that site's ids. Any other site's ids are dropped (lib/site-build-map.mjs::rowsForSite).
export function rowsFor( rows, idsSite, target ) {
	return rowsForSite( rows, idsSite, idsSite && target.mirrorOf === idsSite ? idsSite : target.site );
}

// The rows the page check loads: { pages: [{ key, slug, title, url, menus }], examples: [{ key, slug, kind, url }],
// skipped: [{ key, reason }] }. A page row opens at `?page_id=<id>` (WordPress redirects it to the permalink), a post
// row at `?p=<id>`; a product or category row opens one example the Store API lists; a template row and a layout or
// saved-part post (header, form, choice flow) are not pages a visitor opens.
export function pageTargets( rows, base ) {
	const out = { pages: [], examples: [], skipped: [] };
	for ( const r of rows ) {
		const key = rowKey( r );
		if ( PAGE_TYPES[ r.postType ] ) {
			if ( null == r.id ) {
				out.skipped.push( { key, reason: 'no id in the page map (not built on this site)' } );
			} else {
				out.pages.push( { key, slug: r.slug, title: r.title, url: `${ base }/?${ PAGE_TYPES[ r.postType ] }=${ r.id }`, menus: r.menus || [], template: r.template, row: r } );
			}
		} else if ( STORE_EXAMPLES[ r.postType ] ) {
			out.examples.push( { key, slug: r.slug, title: r.title, kind: r.postType, url: `${ base }${ STORE_EXAMPLES[ r.postType ] }`, menus: r.menus || [], row: r } );
		} else {
			out.skipped.push( { key, reason: hasPost( r ) ? `a ${ r.postType } post, not a page a visitor opens` : 'a template with no page of its own' } );
		}
	}
	return out;
}

// The page map and its ids for `target`: { rows, idsSite }.
export function readRows( repo, client, target ) {
	const file = path.join( repo, 'sites', client, 'build', 'page-map.json' );
	const idsSite = readIdsSite( file );
	return { rows: rowsFor( readPageMap( file ), idsSite, target ), idsSite };
}

// The client whose functional flows live in scripts/parity/flows: the `sites/<client>` folder their own results go to
// (lib/flow.mjs::flowsOutRoot), so the flows' owner is read from the flows, never named here.
export function flowsClient( outRoot = flowsOutRoot( {} ) ) {
	const parts = path.normalize( outRoot ).split( path.sep );
	const at = parts.lastIndexOf( 'sites' );
	return at >= 0 ? parts[ at + 1 ] ?? null : null;
}

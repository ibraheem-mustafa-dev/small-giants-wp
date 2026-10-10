// Try before write, the page side (Spec 47 route-accuracy R6; the judgement is lib/trial.mjs). A logged-in admin page
// renders blocks through core's /wp/v2/block-renderer; a live page receives a trial's CSS (added rules injected after
// the page's own sheets, removed rules deleted where they sit) and gives it back exactly. Every in-page function here
// is self-contained, so it can be passed to page.evaluate.
import fs from 'fs';

// The env file's KEY=value lines.
export const readEnv = ( file ) => Object.fromEntries( fs.readFileSync( file, 'utf8' ).split( /\r?\n/ ).filter( ( l ) => /^[A-Z0-9_]+=/.test( l ) ).map( ( l ) => [ l.slice( 0, l.indexOf( '=' ) ), l.slice( l.indexOf( '=' ) + 1 ).trim().replace( /^["']|["']$/g, '' ) ] ) );

// Logs in on a new page of ctx and returns { api( path, init ) -> { status, body }, close }. env: readEnv's map; key:
// the site key (WP_URL_<key>, WP_USER_<key>, WP_PWD_<key>).
export async function adminSession( ctx, env, key ) {
	const base = env[ `WP_URL_${ key }` ].replace( /\/+$/, '' );
	const page = await ctx.newPage();
	await page.goto( `${ base }/wp-login.php`, { waitUntil: 'domcontentloaded' } );
	await page.fill( '#user_login', env[ `WP_USER_${ key }` ] );
	await page.fill( '#user_pass', env[ `WP_PWD_${ key }` ] );
	await Promise.all( [ page.waitForURL( /wp-admin/, { timeout: 60000 } ), page.click( '#wp-submit' ) ] );
	await page.goto( `${ base }/wp-admin/profile.php`, { waitUntil: 'domcontentloaded' } );
	await page.waitForFunction( () => window.wpApiSettings?.nonce || window.wp?.apiFetch?.nonceMiddleware?.nonce, null, { timeout: 60000 } );
	const nonce = await page.evaluate( () => window.wpApiSettings?.nonce || window.wp.apiFetch.nonceMiddleware.nonce );
	const api = ( p, init = {} ) => page.evaluate( async ( [ u, n, i ] ) => {
		const r = await fetch( u, { ...i, headers: { 'X-WP-Nonce': n, 'Content-Type': 'application/json' } } );
		return { status: r.status, body: await r.text() };
	}, [ base + p, nonce, init ] );
	return { base, api, close: () => page.close() };
}

// One block's server render: { status, html }.
export async function renderBlock( session, block, attributes ) {
	const r = await session.api( `/wp-json/wp/v2/block-renderer/${ block }?context=edit`, { method: 'POST', body: JSON.stringify( { attributes } ) } );
	let html = r.body;
	try {
		html = JSON.parse( r.body ).rendered ?? r.body;
	} catch {}
	return { status: r.status, html };
}

// The <style> text of a render and its root element's class list.
export const styleOf = ( html ) => [ ...html.matchAll( /<style\b[^>]*>([\s\S]*?)<\/style>/g ) ].map( ( m ) => m[ 1 ] ).join( '\n' );
export const rootClassOf = ( html ) => /<[a-z0-9]+\b[^>]*?class="([^"]*)"/.exec( html.replace( /<style\b[\s\S]*?<\/style>/g, '' ) )?.[ 1 ] || '';

// In-page: every rule whose selector names a token, as `<at-rule chain> :: <cssText>`.
export function rulesInPage( token ) {
	const out = [];
	const walk = ( list, wrap ) => {
		for ( const r of list ) {
			if ( r.cssRules && ! r.selectorText ) {
				walk( r.cssRules, wrap.concat( r.cssText.slice( 0, r.cssText.indexOf( '{' ) ).trim() ) );
			} else if ( r.selectorText && r.selectorText.includes( token ) ) {
				out.push( `${ wrap.join( ' >> ' ) } :: ${ r.cssText }` );
			}
		}
	};
	for ( const s of document.styleSheets ) {
		try {
			walk( s.cssRules, [] );
		} catch {}
	}
	return out;
}

// In-page: a CSS text parsed by the page's own engine, in rulesInPage's form.
export function parseInPage( text ) {
	const sheet = new CSSStyleSheet();
	sheet.replaceSync( text );
	const out = [];
	const walk = ( list, wrap ) => {
		for ( const r of list ) {
			r.cssRules && ! r.selectorText ? walk( r.cssRules, wrap.concat( r.cssText.slice( 0, r.cssText.indexOf( '{' ) ).trim() ) ) : out.push( `${ wrap.join( ' >> ' ) } :: ${ r.cssText }` );
		}
	};
	walk( sheet.cssRules, [] );
	return out;
}

// A rule in rulesInPage's form back to CSS text (its at-rules wrapped around it, outermost first).
export function cssOf( rule ) {
	const [ wrap, text ] = rule.split( ' :: ' );
	return wrap ? wrap.split( ' >> ' ).reverse().reduce( ( acc, w ) => `${ w }{${ acc }}`, text ) : text;
}

// In-page: applies { css, remove } (css: text to add after the page's sheets; remove: rules in rulesInPage's form to
// delete) and returns a handle id; undoTrialInPage restores the page exactly.
export function applyTrialInPage( [ css, remove ] ) {
	const want = new Set( remove );
	const deleted = [];
	const walk = ( owner, list, wrap, at ) => {
		for ( let i = list.length - 1; i >= 0; i-- ) {
			const r = list[ i ];
			if ( r.cssRules && ! r.selectorText ) {
				walk( r, r.cssRules, wrap.concat( r.cssText.slice( 0, r.cssText.indexOf( '{' ) ).trim() ), at.concat( i ) );
			} else if ( want.has( `${ wrap.join( ' >> ' ) } :: ${ r.cssText }` ) ) {
				deleted.push( { text: r.cssText, at: at.concat( i ) } );
				owner.deleteRule( i );
			}
		}
	};
	[ ...document.styleSheets ].forEach( ( s, si ) => {
		try {
			walk( s, s.cssRules, [], [ si ] );
		} catch {}
	} );
	const tag = document.createElement( 'style' );
	tag.dataset.sgsTrial = '1';
	tag.textContent = css;
	document.head.appendChild( tag );
	window.__sgsTrial = { deleted, tag };
	return deleted.length;
}

export function undoTrialInPage() {
	const t = window.__sgsTrial;
	if ( ! t ) {
		return false;
	}
	t.tag.remove();
	for ( const d of [ ...t.deleted ].reverse() ) {
		let owner = document.styleSheets[ d.at[ 0 ] ];
		for ( const j of d.at.slice( 1, -1 ) ) {
			owner = owner.cssRules[ j ];
		}
		owner.insertRule( d.text, d.at[ d.at.length - 1 ] );
	}
	window.__sgsTrial = null;
	return true;
}

// In-page: { [pair]: { box } } for the given { name: finder } and the block element's left edge: [ resolveSrc,
// finders, blockSel ].
export function measureInPage( [ resolveSrc, finders, blockSel ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc })` )();
	const box = ( e ) => {
		const r = e.getBoundingClientRect();
		return { x: r.x, y: r.y + window.scrollY, w: r.width, h: r.height };
	};
	const block = document.querySelector( blockSel );
	const pairs = {};
	for ( const [ name, f ] of Object.entries( finders ) ) {
		const e = resolve( f );
		e && ( pairs[ name ] = { box: box( e ) } );
	}
	return { pairs, blockX: block ? block.getBoundingClientRect().x : null };
}

// In-page: the pair names (of { name: finder }) whose element is the block element or inside it, or after it in its
// parent: what a write on the block can move. [ resolveSrc, finders, blockSel ].
export function scopeInPage( [ resolveSrc, finders, blockSel ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc })` )();
	const block = document.querySelector( blockSel );
	if ( ! block ) {
		return [];
	}
	return Object.entries( finders ).filter( ( [ , f ] ) => {
		const e = resolve( f );
		return e && ( block.contains( e ) || ( block.parentElement?.contains( e ) && block.compareDocumentPosition( e ) & Node.DOCUMENT_POSITION_FOLLOWING ) );
	} ).map( ( [ n ] ) => n );
}

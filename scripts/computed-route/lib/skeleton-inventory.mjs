// Skeleton writer step 1 (Spec 47 §3.4): the inventory of a draft surface. Every element the draft runtime stamped
// (data-dc-tpl) under the surface root, read in a real browser at 1440, 375 and 768 through the page bridges
// `window.__dcAnnotatedTemplate` and `window.__dcRootName`. The draft's code supplies identity and structure only (R-47-4):
// the key, the parent, the source tag, the loop and condition membership. Every value is measured later by Fill.
import fs from 'fs';
import path from 'path';
import { tplKeyOf } from '../../parity/lib/collect.mjs';
import { loadChromium } from './fill-read.mjs';

export const INVENTORY_WIDTHS = [ 1440, 375, 768 ];
// The attributes kept per element: what a block needs to know (link, name, label, image source) and the style attribute
// (the fingerprint Fill's origin map keeps).
const ATTRS = [ 'href', 'aria-label', 'alt', 'role', 'type', 'title', 'target', 'aria-hidden', 'viewBox', 'class', 'style' ];

// In-page. in: [ rootSelector, tplKeyOfSource, attrs ]. Returns { records } or { error }.
function collect( [ rootSelector, keySrc, attrNames ] ) {
	// eslint-disable-next-line no-new-func
	const keyOf = new Function( `return (${ keySrc });` )();
	const root = document.querySelector( rootSelector );
	if ( ! root ) {
		return { error: `no element matches ${ rootSelector }` };
	}
	const els = [ root, ...root.querySelectorAll( '*' ) ];
	const parsed = {};
	const srcDoc = ( name ) => {
		if ( ! parsed[ name ] ) {
			const t = document.createElement( 'template' );
			t.innerHTML = window.__dcAnnotatedTemplate( name ) || '';
			parsed[ name ] = t.content;
		}
		return parsed[ name ];
	};
	const ws = ( s ) => ( s || '' ).replace( /\s+/g, ' ' ).trim();
	const hostOf = ( e ) => ( e.parentElement ? e.parentElement.closest( '.sc-host' ) : null );
	const out = [];
	const unstamped = [];
	els.forEach( ( e ) => {
		if ( ! e.hasAttribute( 'data-dc-tpl' ) ) {
			unstamped.push( { tag: e.tagName.toLowerCase(), cls: String( e.className?.baseVal ?? e.className ), text: ws( e.textContent ).slice( 0, 60 ) } );
			return;
		}
		e.setAttribute( 'data-inv-i', String( out.length ) );
		const n = e.dataset.dcTpl;
		const tname = hostOf( e ).dataset.scName;
		let p = e.parentElement;
		while ( p && ! p.hasAttribute( 'data-dc-tpl' ) ) {
			p = p.parentElement;
		}
		let depth = 0;
		for ( let a = e; a !== root; ) {
			a = a.parentElement;
			if ( a.hasAttribute( 'data-dc-tpl' ) ) {
				depth++;
			}
		}
		let own = '';
		for ( const c of e.childNodes ) {
			if ( 3 === c.nodeType ) {
				own += `${ c.nodeValue } `;
			} else if ( 1 === c.nodeType && ! c.hasAttribute( 'data-dc-tpl' ) ) {
				own += `${ c.textContent } `;
			}
		}
		const attrs = {};
		for ( const a of attrNames ) {
			const v = e.getAttribute( a );
			if ( null != v && '' !== v ) {
				attrs[ a ] = v;
			}
		}
		if ( 'IMG' === e.tagName ) {
			const s = e.currentSrc || e.getAttribute( 'src' ) || '';
			attrs.srcBasename = s.startsWith( 'data:' ) ? `data:${ s.slice( 5, 30 ) }...` : s.split( '?' )[ 0 ].split( '/' ).pop();
		}
		const s = srcDoc( tname ).querySelector( `[data-dc-tpl="${ n }"]` );
		const membership = [];
		let srcTag = null;
		let snippet = null;
		let srcOwn = null;
		if ( s ) {
			srcTag = s.localName;
			snippet = ws( s.outerHTML ).slice( 0, 400 );
			srcOwn = ws( [ ...s.childNodes ].filter( ( c ) => 3 === c.nodeType ).map( ( c ) => c.nodeValue ).join( ' ' ) );
			for ( let a = s.parentElement; a; a = a.parentElement ) {
				const t = a.localName;
				if ( 'sc-for' === t ) {
					membership.unshift( { kind: 'sc-for', list: a.getAttribute( 'list' ), as: a.getAttribute( 'as' ) || 'item', tpl: a.dataset.dcTpl } );
				} else if ( 'sc-if' === t ) {
					membership.unshift( { kind: 'sc-if', value: a.getAttribute( 'value' ), tpl: a.dataset.dcTpl } );
				} else if ( 'sc-else' === t ) {
					membership.unshift( { kind: 'sc-else', tpl: a.dataset.dcTpl } );
				} else if ( 'dc-import' === t ) {
					membership.unshift( { kind: 'dc-import', name: a.getAttribute( 'name' ) || a.getAttribute( 'component' ), tpl: a.dataset.dcTpl } );
				}
			}
		}
		if ( tname !== window.__dcRootName() ) {
			membership.unshift( { kind: 'inside-import', template: tname } );
		}
		const r = e.getBoundingClientRect();
		const box = e.getClientRects().length ? { x: +( r.left + scrollX ).toFixed( 1 ), y: +( r.top + scrollY ).toFixed( 1 ), w: +r.width.toFixed( 1 ), h: +r.height.toFixed( 1 ) } : null;
		out.push( {
			i: out.length, key: keyOf( e ), parentKey: p ? keyOf( p ) : null, depth, tag: e.tagName.toLowerCase(), template: tname, tpl: Number( n ), attrs, words: ws( own ), allText: ws( e.textContent ).slice( 0, 120 ),
			membership, srcTag, srcOwnText: srcOwn, snippet, box, visible: !! box && box.w > 0 && box.h > 0 && e.checkVisibility( { opacityProperty: true, visibilityProperty: true } ), display: getComputedStyle( e ).display, flexDirection: getComputedStyle( e ).flexDirection,
		} );
	} );
	return { records: out, unstamped, rootKey: out[ 0 ]?.key ?? null, rootName: window.__dcRootName() };
}

const safe = ( k ) => k.replace( /[^A-Za-z0-9]+/g, '_' ).replace( /^_|_$/g, '' );

// Scrolls the whole page so scroll-triggered entrances fire, then rests on the root.
async function settle( page, rootSelector ) {
	await page.waitForTimeout( 2500 );
	await page.evaluate( async ( sel ) => {
		for ( let y = 0; y < document.body.scrollHeight; y += 600 ) {
			scrollTo( 0, y );
			await new Promise( ( r ) => setTimeout( r, 60 ) );
		}
		document.querySelector( sel )?.scrollIntoView();
	}, rootSelector );
	await page.waitForTimeout( 1500 );
}

// Reads the draft at every width and returns { generated, source, root, keyFormat, checks, elements }. Screenshots go to
// `shotsDir` (1440 for every shown element, 375 only where an element's size or place inside its parent changed).
export async function readInventory( { url, root, shotsDir, log = () => {} } ) {
	const { chromium } = await loadChromium();
	const browser = await chromium.launch( { headless: true } );
	const runs = {};
	const shots = {};
	const skipped = [];
	fs.mkdirSync( shotsDir, { recursive: true } );
	try {
		for ( const w of INVENTORY_WIDTHS ) {
			const ctx = await browser.newContext( { viewport: { width: w, height: 900 } } );
			const page = await ctx.newPage();
			await page.goto( url, { waitUntil: 'networkidle', timeout: 90000 } );
			await settle( page, root );
			const res = await page.evaluate( collect, [ root, tplKeyOf.toString(), ATTRS ] );
			if ( res.error ) {
				throw new Error( `${ res.error } at ${ w }px` );
			}
			runs[ w ] = res;
			log( `inventory ${ w }px: ${ res.records.length } elements` );
			if ( 1440 === w || 375 === w ) {
				// Hide fixed and sticky overlays outside the root so crops show only the element (boxes were measured before this).
				await page.evaluate( ( sel ) => {
					const r = document.querySelector( sel );
					for ( const e of document.body.querySelectorAll( '*' ) ) {
						if ( ! r.contains( e ) && ! e.contains( r ) && [ 'fixed', 'sticky' ].includes( getComputedStyle( e ).position ) ) {
							e.style.setProperty( 'visibility', 'hidden', 'important' );
						}
					}
				}, root );
				for ( const r of res.records ) {
					if ( ! r.visible ) {
						skipped.push( { w, key: r.key, why: r.box ? `not visible (box ${ r.box.w }x${ r.box.h })` : 'not rendered (no layout box)' } );
						continue;
					}
					if ( 375 === w ) {
						const d = runs[ 1440 ].records.find( ( x ) => x.key === r.key );
						const pd = d && runs[ 1440 ].records.find( ( x ) => x.key === d.parentKey );
						const pm = res.records.find( ( x ) => x.key === r.parentKey );
						const rel = ( a, pa ) => ( a?.box && pa?.box ? [ a.box.x - pa.box.x, a.box.y - pa.box.y ] : [ 0, 0 ] );
						const [ dx, dy ] = rel( d, pd );
						const [ mx, my ] = rel( r, pm );
						r.layoutChanged = ! d?.box || Math.abs( d.box.w - r.box.w ) > 1 || Math.abs( d.box.h - r.box.h ) > 1 || Math.abs( dx - mx ) > 1 || Math.abs( dy - my ) > 1;
						if ( ! r.layoutChanged ) {
							continue;
						}
					}
					const file = `${ safe( r.key ) }@${ w }.png`;
					try {
						await page.locator( `[data-inv-i="${ r.i }"]` ).screenshot( { path: path.join( shotsDir, file ), animations: 'disabled', timeout: 15000 } );
						( shots[ r.key ] ||= {} )[ w ] = `shots/${ file }`;
					} catch ( e ) {
						skipped.push( { w, key: r.key, why: `screenshot failed: ${ e.message.split( '\n' )[ 0 ] }` } );
					}
				}
			}
			await ctx.close();
		}
	} finally {
		await browser.close();
	}
	const base = runs[ 1440 ];
	const at = ( w, key ) => runs[ w ].records.find( ( x ) => x.key === key );
	const elements = base.records.map( ( r ) => {
		const { i, ...rest } = r;
		return { ...rest, box: { 375: at( 375, r.key )?.box ?? null, 768: at( 768, r.key )?.box ?? null, 1440: r.box }, visible: { 375: at( 375, r.key )?.visible ?? false, 768: at( 768, r.key )?.visible ?? false, 1440: r.visible }, layoutChanged375: at( 375, r.key )?.layoutChanged ?? null, screenshots: shots[ r.key ] || {} };
	} );
	const tagOk = ( r ) => !! r.srcTag && r.srcTag.replace( /^sc-raw-/, '' ).toLowerCase() === r.tag;
	const checks = {
		rootName: base.rootName, rootKey: base.rootKey, unstamped: base.unstamped, duplicateKeys: elements.length - new Set( elements.map( ( r ) => r.key ) ).size,
		perWidthCounts: Object.fromEntries( INVENTORY_WIDTHS.map( ( w ) => [ w, runs[ w ].records.length ] ) ), tagAgree: elements.filter( tagOk ).length, tagDisagree: elements.filter( ( r ) => ! tagOk( r ) ).map( ( r ) => [ r.key, r.srcTag, r.tag ] ),
		keysMissingAt: Object.fromEntries( INVENTORY_WIDTHS.map( ( w ) => [ w, elements.filter( ( r ) => ! at( w, r.key ) ).map( ( r ) => r.key ) ] ) ), screenshotSkips: skipped,
	};
	return { generated: new Date().toISOString(), source: url, root, keyFormat: 'importChain/tplNumber#copyIndex (parity/lib/collect.mjs::tplKeyOf)', checks, elements };
}

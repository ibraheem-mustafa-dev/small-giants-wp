// The verify pass of the part-look command (template-rework Task 4, follow-up): after the writes, open the scratch copy's own page in
// the same state (a filled basket), find each paired part on the live page, read the looks the draft was read for and compare.
//   - a property that differs and that a setting of the part holds is written (the draft's value, even when it is the CSS initial),
//     the page is read again, and a write that changed nothing is taken back and listed;
//   - a property that differs with no setting of the part joins the "no setting" rows with the live value beside the draft's;
//   - a property that already matches is dropped from "no setting";
//   - the rest is the "still differs" table: part, property, draft, live, why.
// The pure parts (selectors, comparison, planning) take their reads as arguments; `readLiveSurface` is the browser effect.
import fs from 'node:fs';
import path from 'node:path';
import { loadChromium } from './fill-read.mjs';
import { COVERS, LOOKS, WIDTHS, buildLook, primitive, readPart, samePrimitive } from './fill-part-look.mjs';
import { sameSetting } from './part-look-compare.mjs';

// A part's live selector. WooCommerce blocks: the look table's selector for the part's row (the part named for the row's id, or the
// row `map.parts` names for a part older than the table). The block's own parts: `supports.sgs.elements[part].selector`, else the
// block's BEM class for an element of that name. Returns { selectors: { part: selector }, none: { part: reason } }.
export function liveSelectorsFor( { parts, blockKey, table, map, elements, short } ) {
	const selectors = {};
	const none = {};
	for ( const part of parts ) {
		if ( blockKey ) {
			const rowId = map?.parts?.[ part ] || part.replace( /-/g, '_' );
			const sel = table.rows?.[ rowId ]?.[ blockKey ];
			if ( ! table.rows?.[ rowId ] ) {
				none[ part ] = 'the look table has no row for this part';
			} else if ( ! sel || '&' === sel ) {
				none[ part ] = `the look table's row ${ rowId } has no ${ blockKey } selector`;
			} else if ( sel.includes( '::' ) ) {
				none[ part ] = 'the part is a pseudo-element the page cannot be read for';
			} else {
				selectors[ part ] = sel;
			}
		} else if ( elements?.[ part ] ) {
			selectors[ part ] = elements[ part ].selector || ( [ 'wrapper', 'box' ].includes( part ) ? `.sgs-${ short }` : `.sgs-${ short }__${ part }` );
		} else {
			none[ part ] = 'the block\'s block.json names no element of this part';
		}
	}
	return { selectors, none };
}

// The block's own elements from block.json (supports.sgs.elements), or {}.
export function blockElementsOf( repo, short ) {
	const file = path.join( repo, 'plugins', 'sgs-blocks', 'src', 'blocks', short, 'block.json' );
	return fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ).supports?.sgs?.elements || {} : {};
}

// The properties of a live read a draft value is compared with, per part and width. `draftReads`/`liveReads`: { part: { width: [ {key, text, styles} ] } }.
// Returns { differs: [ { part, property, draft: { width }, live: { width } } ], matched: Set of 'part|property', compared: Set }.
export function compareParts( { draftReads, liveReads, properties = LOOKS.map( ( [ p ] ) => p ), policy = null } ) {
	const out = { differs: [], matched: new Set(), compared: new Set() };
	for ( const part of Object.keys( liveReads ) ) {
		if ( ! draftReads[ part ] ) {
			continue;
		}
		for ( const property of properties ) {
			const draft = {};
			const live = {};
			let differs = false;
			let compared = false;
			for ( const w of WIDTHS ) {
				const dv = readPart( property, { [ w ]: draftReads[ part ][ w ] || [] }, { css_property: property }, true, policy ).perWidth[ w ];
				const d = undefined === dv ? [] : [ dv ];
				const l = ( liveReads[ part ][ w ] || [] ).map( ( i ) => primitive( property, i.styles, { css_property: property }, true ) );
				if ( ! d.length || ! l.length || l.some( ( v ) => undefined === v ) ) {
					continue;
				}
				compared = true;
				// A draft line height of normal is the font's own (about 1.1 to 1.25 of the size): a live ratio in that range is the same look.
				const same = ( v ) => samePrimitive( v, d[ 0 ] ) || ( 'line-height' === property && 'normal' === d[ 0 ] && 'number' === typeof v && v <= 1.25 );
				const bad = l.find( ( v ) => ! same( v ) );
				if ( undefined !== bad ) {
					differs = true;
					draft[ w ] = d[ 0 ];
					live[ w ] = bad;
				}
			}
			if ( differs ) {
				out.differs.push( { part, property, draft, live } );
			} else if ( compared ) {
				out.matched.add( `${ part }|${ property }` );
			}
			compared && out.compared.add( `${ part }|${ property }` );
		}
	}
	return out;
}

// The rest-state, non-switch settings of a part that hold a CSS property (a border setting covers the border look, and so on).
export function rowsHolding( rows, part, property ) {
	return rows.filter( ( r ) => r.css_element === part && r.css_property && ! r.css_state && 'boolean' !== r.attr_type && ( COVERS[ property ] || [ property ] ).includes( r.css_property ) );
}

// The planning and checking of one surface. `buildInputs` are buildLook's arguments (without `force`); `built` its result for the
// state written; `readLive()` returns { reads, shown } for the page now; `patch( { set, unset } )` writes to the scratch copy;
// `readSaved()` returns the block's saved attributes.
export async function verifySurface( { buildInputs, built, readLive, patch, readSaved, selectorsNone = {}, selectors = {}, log = () => {} } ) {
	const { rows } = buildInputs;
	const first = await readLive();
	const cmp0 = compareParts( { draftReads: buildInputs.reads, liveReads: first.reads, policy: buildInputs.policy } );
	// Switches: a part the draft does not draw must not show on the page.
	const showing = ( w ) => ( 'display' === w.property ? ( first.shown[ w.part ] || 0 ) > 0 : ( first.reads[ w.part ]?.[ 1440 ] || [] ).some( ( i ) => parseFloat( i.styles[ w.property ] ) > 0 ) );
	const stillShown = built.writes.filter( ( w ) => w.visibility && showing( w ) ).map( ( w ) => ( { part: w.part, property: w.property, draft: { 1440: 'not drawn' }, live: { 1440: 'display' === w.property ? `${ first.shown[ w.part ] } element(s) shown` : 'drawn' }, why: `the switch ${ w.attr } is written and the part still shows` } ) );
	const forceAttrs = new Set();
	const candidates = [];
	for ( const d of cmp0.differs ) {
		for ( const r of rowsHolding( rows, d.part, d.property ) ) {
			forceAttrs.add( r.attr_name );
			candidates.push( { ...d, attr: r.attr_name } );
		}
	}
	const saved0 = forceAttrs.size ? await readSaved() : {};
	const forced = forceAttrs.size ? buildLook( { ...buildInputs, force: forceAttrs } ) : { writes: [], settings: {} };
	const set = {};
	const noEffect = [];
	for ( const w of forced.writes ) {
		if ( ! forceAttrs.has( w.attr ) && ! forceAttrs.has( w.companionOf ) ) {
			continue;
		}
		if ( undefined !== saved0[ w.attr ] && sameSetting( w.value, saved0[ w.attr ] ) ) {
			noEffect.push( w.attr );
		} else {
			set[ w.attr ] = w.value;
		}
	}
	let cmp1 = cmp0;
	const kept = [];
	const takenBack = [];
	if ( Object.keys( set ).length ) {
		log( `verify: writing ${ Object.keys( set ).length } settings the live page showed a difference for` );
		await patch( { set, unset: [] } );
		const second = await readLive();
		cmp1 = compareParts( { draftReads: buildInputs.reads, liveReads: second.reads, policy: buildInputs.policy } );
		const stillDiffers = new Set( cmp1.differs.map( ( d ) => `${ d.part }|${ d.property }` ) );
		const revertSet = {};
		const revertUnset = [];
		for ( const attr of Object.keys( set ) ) {
			const row = rows.find( ( r ) => r.attr_name === attr );
			if ( ! row ) {
				kept.push( attr );
				continue;
			}
			const cand = candidates.find( ( c ) => c.attr === attr );
			if ( cand && stillDiffers.has( `${ cand.part }|${ cand.property }` ) ) {
				takenBack.push( { attr, part: cand.part, property: cand.property, value: set[ attr ] } );
				undefined === saved0[ attr ] ? revertUnset.push( attr ) : ( revertSet[ attr ] = saved0[ attr ] );
			} else {
				kept.push( attr );
			}
		}
		for ( const t of takenBack ) {
			// a companion written with the setting (its unit) goes back with it
			const companion = Object.keys( set ).filter( ( a ) => a.startsWith( t.attr ) && a !== t.attr );
			companion.forEach( ( a ) => ( undefined === saved0[ a ] ? revertUnset.push( a ) : ( revertSet[ a ] = saved0[ a ] ) ) );
		}
		if ( Object.keys( revertSet ).length || revertUnset.length ) {
			log( `verify: taking back ${ takenBack.length } writes that changed nothing` );
			await patch( { set: revertSet, unset: revertUnset } );
		}
	}
	// The table of what still differs, with the reason.
	const rowsFor = ( part, property ) => rowsHolding( rows, part, property );
	const stillDiffers = [ ...stillShown ];
	for ( const d of cmp1.differs ) {
		const holders = rowsFor( d.part, d.property );
		const back = takenBack.find( ( t ) => t.part === d.part && t.property === d.property );
		let why;
		if ( ! holders.length ) {
			why = 'no setting of the part holds this look';
		} else if ( back ) {
			why = `${ back.attr } was written with the draft's value and the page did not change (taken back)`;
		} else if ( holders.some( ( h ) => noEffect.includes( h.attr_name ) ) ) {
			const h = holders.find( ( x ) => noEffect.includes( x.attr_name ) );
			why = `${ h.attr_name } already holds the draft's value and the page shows another${ buildInputs.faultOf?.( h.attr_name ) ? ` (known: ${ buildInputs.faultOf( h.attr_name ) })` : '' }`;
		} else {
			const h = holders[ 0 ];
			why = `${ h.attr_name } was not written: ${ forced.settings?.[ h.attr_name ]?.reason || built.settings?.[ h.attr_name ]?.reason || 'unknown' }`;
		}
		// Two parts that one live selector finds (a part the look table names twice) are one row.
		const same = stillDiffers.find( ( x ) => x.selector && x.selector === selectors[ d.part ] && x.property === d.property );
		if ( same ) {
			same.part = `${ same.part } / ${ d.part }`;
		} else {
			stillDiffers.push( { part: d.part, property: d.property, selector: selectors[ d.part ] ?? null, draft: d.draft, live: d.live, why } );
		}
	}
	// "No setting" rows: drop what matches, add the live value to the rest.
	const diffMap = new Map( cmp1.differs.map( ( d ) => [ `${ d.part }|${ d.property }`, d ] ) );
	const noSetting = [];
	let dropped = 0;
	for ( const n of built.noSetting ) {
		const key = `${ n.part }|${ n.property }`;
		if ( cmp1.matched.has( key ) ) {
			dropped++;
		} else if ( diffMap.has( key ) ) {
			noSetting.push( { ...n, live: diffMap.get( key ).live } );
		} else {
			noSetting.push( { ...n, live: null, liveRead: false } );
		}
	}
	return { stillDiffers, kept, takenBack, noEffect, noSetting, droppedNoSetting: dropped, counts: { compared: cmp1.compared.size, matched: cmp1.matched.size, differs: cmp1.differs.length, written: kept.length, takenBack: takenBack.length, stillShown: stillShown.length, noSettingBefore: built.noSetting.length, noSettingAfter: noSetting.filter( ( n ) => false !== n.liveRead ).length }, notVerified: selectorsNone };
}

// ---- the browser effect -------------------------------------------------------------------------------------------------

// In-page: for each part's selector, the matched elements that show, with their computed styles.
export function readLiveInPage( { selectors, props } ) {
	const out = {};
	const pathOf = ( el ) => {
		const parts = [];
		for ( let e = el; e && e !== document.body; e = e.parentElement ) {
			parts.unshift( `${ e.tagName.toLowerCase() }:${ [ ...e.parentElement.children ].indexOf( e ) }` );
		}
		return parts.join( '>' );
	};
	for ( const [ part, sel ] of Object.entries( selectors ) ) {
		let els = [];
		try {
			els = [ ...document.querySelectorAll( sel ) ];
		} catch ( e ) {
			out[ part ] = { matched: 0, instances: [], error: String( e.message ).slice( 0, 80 ) };
			continue;
		}
		const shown = els.filter( ( el ) => {
			const r = el.getBoundingClientRect();
			return r.width > 0 && r.height > 0 && 'none' !== getComputedStyle( el ).display;
		} );
		out[ part ] = {
			matched: els.length,
			instances: shown.map( ( el ) => {
				const s = getComputedStyle( el );
				return { key: pathOf( el ), tag: el.tagName.toLowerCase(), text: ( el.textContent || '' ).replace( /\s+/g, ' ' ).trim().slice( 0, 60 ), styles: Object.fromEntries( props.map( ( p ) => [ p, s.getPropertyValue( p ) ] ) ) };
			} ),
		};
	}
	return out;
}

// The product the render check's seed says the shop accepts: the last JSON line of seed.php's output.
export function seedOf( text ) {
	const line = String( text ).split( '\n' ).map( ( l ) => l.trim() ).filter( ( l ) => l.startsWith( '{' ) ).pop();
	const seed = line ? JSON.parse( line ) : null;
	if ( ! seed?.product?.path || ! seed.product.addFields ) {
		throw new Error( 'the seed file has no product path and add fields (the output of scripts/render-check/seed.php)' );
	}
	return seed.product;
}

// Reads the live page at each width: { reads: { part: { width: [ instance ] } }, shown: { part: count at 1440 } }. The page is opened
// as a visitor with the seed's product in the basket; `openDrawer` clicks the basket button first (the header's basket panel).
export async function readLiveSurface( { base, pagePath, selectors, props, product = null, openDrawer = false, headed = false } ) {
	const { chromium } = await loadChromium();
	const browser = await chromium.launch( { headless: ! headed, args: [ '--hide-scrollbars' ] } );
	const reads = {};
	const shown = {};
	try {
		for ( const width of WIDTHS ) {
			const ctx = await browser.newContext( { viewport: { width, height: 900 }, reducedMotion: 'reduce' } );
			try {
				const page = await ctx.newPage();
				await page.goto( `${ base }/`, { waitUntil: 'load', timeout: 60000 } );
				if ( product ) {
					const added = await page.evaluate( async ( { where, fields } ) => {
						const r = await fetch( where, { method: 'POST', credentials: 'same-origin', body: new URLSearchParams( fields ) } );
						const cart = await ( await fetch( '/wp-json/wc/store/v1/cart', { credentials: 'same-origin' } ) ).json();
						return { status: r.status, items: cart.items_count };
					}, { where: product.path, fields: product.addFields } );
					if ( ! added.items ) {
						throw new Error( `the seed's product did not reach the basket on ${ base } (status ${ added.status })` );
					}
				}
				await page.goto( `${ base }${ pagePath }`, { waitUntil: 'load', timeout: 60000 } );
				await page.waitForLoadState( 'networkidle', { timeout: 30000 } ).catch( () => {} );
				await page.waitForSelector( '.wc-block-components-product-name, .sgs-cart__item', { state: 'attached', timeout: 20000 } ).catch( () => {} );
				await page.evaluate( () => document.fonts && document.fonts.ready ).catch( () => {} );
				if ( openDrawer ) {
					await page.locator( '.sgs-cart__trigger' ).first().click( { timeout: 5000 } ).catch( () => {} );
				}
				await page.waitForTimeout( 1500 );
				const found = await page.evaluate( readLiveInPage, { selectors, props } );
				for ( const [ part, r ] of Object.entries( found ) ) {
					if ( r.instances.length ) {
						( reads[ part ] ??= {} )[ width ] = r.instances;
					}
					1440 === width && ( shown[ part ] = r.instances.length );
				}
			} finally {
				await ctx.close();
			}
		}
	} finally {
		await browser.close();
	}
	return { reads, shown };
}

// A full-page picture of the live page at 1440, as a visitor (with the seed's product in the basket when `product` is given).
export async function shootLiveSurface( { base, pagePath, product = null, file } ) {
	const { chromium } = await loadChromium();
	const browser = await chromium.launch( { headless: true, args: [ '--hide-scrollbars' ] } );
	try {
		const ctx = await browser.newContext( { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' } );
		const page = await ctx.newPage();
		await page.goto( `${ base }/`, { waitUntil: 'load', timeout: 60000 } );
		if ( product ) {
			await page.evaluate( async ( { where, fields } ) => {
				await fetch( where, { method: 'POST', credentials: 'same-origin', body: new URLSearchParams( fields ) } );
			}, { where: product.path, fields: product.addFields } );
		}
		await page.goto( `${ base }${ pagePath }`, { waitUntil: 'load', timeout: 60000 } );
		await page.waitForLoadState( 'networkidle', { timeout: 30000 } ).catch( () => {} );
		await page.evaluate( async () => {
			for ( let y = 0; y < document.documentElement.scrollHeight; y += 600 ) {
				window.scrollTo( 0, y );
				await new Promise( ( r ) => setTimeout( r, 100 ) );
			}
			window.scrollTo( 0, 0 );
		} ).catch( () => {} );
		await page.waitForTimeout( 1200 );
		await page.screenshot( { path: file, fullPage: true } );
	} finally {
		await browser.close();
	}
	return file;
}

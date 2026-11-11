// The drift probe for the Cart and Checkout look settings (Spec 27 FR-30-18). The settings paint WooCommerce's own
// markup through one selector table, plugins/sgs-blocks/includes/woocommerce/commerce-look/selectors.json (the same file
// the PHP writer reads). A WooCommerce update can move that markup; this probe loads the cart and checkout in each
// row's stated state (basket, width, one interaction) and checks every selector of the row still matches.
//
// It WARNS, it never fails the run: a row that no longer matches comes back as an `n-a` item whose detail starts with
// "WARNING" and names the row, the block and the WooCommerce version the row was read on, and is printed to the console.
// It only looks at a page whose block carries the settings (the writer's `.sgs-commerce-look` class is on the block).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { addOneLine } from './site-check-parts.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const SELECTOR_TABLE = path.resolve( HERE, '..', '..', '..', 'plugins', 'sgs-blocks', 'includes', 'woocommerce', 'commerce-look', 'selectors.json' );
const SCOPE = '.sgs-commerce-look';
const WIDTH = { wide: 1440, narrow: 375 };
const LOAD = { waitUntil: 'load', timeout: 45000 };

// What to press so a row's element exists (the coupon field and the order-note field only mount on a click).
const ACTIONS = {
	'open-coupon-on-cart': async ( page, block ) => {
		if ( 'cart' === block ) {
			await page.locator( '.wc-block-components-totals-coupon .wc-block-components-panel__button' ).first().click( { timeout: 4000 } ).catch( () => {} );
		}
	},
	'tick-order-note': async ( page ) => {
		await page.locator( '.wc-block-checkout__add-note .wc-block-components-checkbox__input' ).first().check( { timeout: 4000, force: true } ).catch( () => {} );
	},
};

// The table's rows that apply to one block: { id, selectors, wcVersion, state, needs }.
export function rowsFor( block, file = SELECTOR_TABLE ) {
	const rows = JSON.parse( fs.readFileSync( file, 'utf8' ) ).rows || {};
	return Object.entries( rows )
		.filter( ( [ , r ] ) => r[ block ] && false !== r.probe )
		.map( ( [ id, r ] ) => ( { id, selectors: r[ block ].split( ',' ).map( ( s ) => s.trim() ), wcVersion: r.wc_version, state: r.state, needs: r.needs || {} } ) );
}

// In-page: how many elements each selector matches under the settings' scope class.
export function countInPage( [ scope, selectors ] ) {
	return selectors.map( ( s ) => document.querySelectorAll( `${ scope } ${ s }` ).length );
}

// One group of rows that share a width and an interaction, on a fresh page with one line in the basket.
async function probeGroup( rows, { block, url, base, newPage, width, action } ) {
	const { page, context } = await newPage( width );
	try {
		await page.goto( base, LOAD );
		const added = await addOneLine( page, base );
		await page.goto( url, LOAD );
		const carries = await page.waitForSelector( SCOPE, { state: 'attached', timeout: 8000 } ).then( () => true, () => false );
		if ( ! carries ) {
			return null;
		}
		await page.waitForSelector( '.wc-block-components-sidebar-layout', { state: 'visible', timeout: 8000 } ).catch( () => {} );
		// The line items and totals mount after the layout does.
		await page.waitForSelector( '.wc-block-components-product-name', { state: 'attached', timeout: 20000 } ).catch( () => {} );
		await page.waitForTimeout( 1500 );
		if ( ACTIONS[ action ] ) {
			await ACTIONS[ action ]( page, block );
		}
		const items = [];
		for ( const row of rows ) {
			const counts = await page.evaluate( countInPage, [ SCOPE, row.selectors ] );
			const missing = row.selectors.filter( ( s, i ) => 0 === counts[ i ] );
			const where = `${ block } row ${ row.id } (read on WooCommerce ${ row.wcVersion }; needs ${ JSON.stringify( row.needs ) })`;
			const optional = 'optional' === row.needs.action;
			if ( 0 === missing.length ) {
				items.push( { status: 'pass', subject: `commerce-look ${ block } ${ row.id }`, url, detail: `matches in the stated state (${ row.state })` } );
			} else {
				const warn = `WARNING selector drift: ${ where } matched nothing for ${ missing.join( ', ' ) }${ added.ok ? '' : `; the basket line was not added (${ added.detail })` }`;
				items.push( { status: 'n-a', subject: `commerce-look ${ block } ${ row.id }`, url, detail: optional ? `not showing in this run (${ row.state })` : warn } );
				if ( ! optional ) {
					console.warn( warn );
				}
			}
		}
		return items;
	} finally {
		await context.close();
	}
}

// All rows for one block's page. `newPage( width )` is site-check's page factory. Returns [] when the page does not
// carry the settings.
export async function commerceLookDrift( { block, url, base, newPage } ) {
	const groups = new Map();
	for ( const row of rowsFor( block ) ) {
		const width = WIDTH[ row.needs.viewport ] || WIDTH.wide;
		const key = `${ width }|${ row.needs.action || 'none' }`;
		groups.set( key, { width, action: row.needs.action || 'none', rows: [ ...( groups.get( key )?.rows || [] ), row ] } );
	}
	const items = [];
	for ( const g of groups.values() ) {
		const got = await probeGroup( g.rows, { block, url, base, newPage, width: g.width, action: g.action } );
		if ( null === got ) {
			return [];
		}
		items.push( ...got );
	}
	return items;
}

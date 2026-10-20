// Live CSSOM pass of the states exhaustiveness gate (check-state-exhaustiveness.py --live).
//
// Usage: node state-cssom-scan.mjs <url> <vocab.json>
// vocab.json: [{ source, state, family }] -- the regex sources of the framework `states` vocabulary.
// Loads the page (read only), walks every rule of document.styleSheets (nested grouping rules and nested style rules
// included, so selectors PHP assembles at request time appear) and prints a JSON array of
// { sheet, selector, body } for each style rule whose selector carries a vocabulary token. Nothing is clicked or written.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname( fileURLToPath( import.meta.url ) );
const require = createRequire( path.resolve( here, '../../../../scripts/computed-route/package.json' ) );
const { chromium } = require( 'playwright' );

const [ url, vocabFile ] = process.argv.slice( 2 );
if ( ! url || ! vocabFile ) {
	console.error( 'usage: node state-cssom-scan.mjs <url> <vocab.json>' );
	process.exit( 2 );
}
const sources = JSON.parse( readFileSync( vocabFile, 'utf8' ) ).map( ( v ) => v.source );

const browser = await chromium.launch( { headless: true } );
try {
	const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	await page.goto( url, { waitUntil: 'networkidle', timeout: 60000 } );
	const rules = await page.evaluate( ( patterns ) => {
		const regexes = patterns.map( ( s ) => new RegExp( s ) );
		const out = [];
		const walk = ( list, sheet ) => {
			for ( const rule of Array.from( list ) ) {
				if ( rule.selectorText !== undefined ) {
					const sel = rule.selectorText.toLowerCase();
					if ( regexes.some( ( r ) => r.test( sel ) ) ) {
						out.push( { sheet, selector: rule.selectorText, body: rule.style.cssText } );
					}
				}
				if ( rule.cssRules ) {
					walk( rule.cssRules, sheet );
				}
			}
		};
		for ( const sheet of Array.from( document.styleSheets ) ) {
			let list;
			try {
				list = sheet.cssRules;
			} catch ( e ) {
				continue; // a cross-origin sheet: its rules are not readable
			}
			walk( list, sheet.href || 'inline' );
		}
		return out;
	}, sources );
	process.stdout.write( JSON.stringify( rules ) );
} finally {
	await browser.close();
}

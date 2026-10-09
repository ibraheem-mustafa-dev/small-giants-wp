// The footer social-icon targets of the two Claude Design drafts (tests/fixtures/social-icon-drafts.json) and of the SGS
// QA page that reproduces them. Draft: the link IS the painted circle. SGS: the link wraps `.sgs-icon__shape` (the circle)
// and `.sgs-icon__svg svg`.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const DRAFTS = JSON.parse( fs.readFileSync( path.resolve( HERE, '../../../tests/fixtures/social-icon-drafts.json' ), 'utf8' ) ).drafts;

export const draftTargets = ( key ) =>
	DRAFTS[ key ].icons.map( ( name ) => ( { name, root: 'footer', linkSel: `a[aria-label="${ name }"]`, paintSel: '', glyphSel: 'svg' } ) );

// Each QA row carries an anchor; the icons sit in the order of the draft's `icons`.
export const liveTargets = ( key ) =>
	DRAFTS[ key ].icons.map( ( name, i ) => ( {
		name,
		root: `#${ DRAFTS[ key ].row }`,
		linkSel: `div.sgs-icon:nth-of-type(${ i + 1 }) .sgs-icon__link`,
		paintSel: '.sgs-icon__shape',
		glyphSel: '.sgs-icon__svg svg',
	} ) );

/** Opens a draft at a width; the Design Component runtime races its first render now and then, so reload until the footer renders. */
export async function openDraft( browser, key, width ) {
	const page = await browser.newPage( { viewport: { width, height: 900 } } );
	for ( let attempt = 0; attempt < 4; attempt++ ) {
		await page.goto( DRAFTS[ key ].url, { waitUntil: 'load' } );
		await page.waitForTimeout( 2500 );
		if ( await page.evaluate( () => ! document.querySelector( '.sc-has-error' ) && document.querySelector( 'footer' ) ) ) {
			return page;
		}
	}
	throw new Error( `${ DRAFTS[ key ].url } did not render a footer` );
}

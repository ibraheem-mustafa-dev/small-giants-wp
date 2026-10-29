// Spec 48 FR-48-55 part 3: a menu entry's label is the draft link's own text. A static link (`<a href="Gifts.dc.html">Gifts</a>`)
// gives its text for the route its href opens, in the surfaces that hold it; the page title only stands in when the draft has no link
// text. A link whose words or address are draft bindings, and two texts for one route, give nothing (the latter is reported).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { readLinkTextReport } from '../lib/site-build-labels.mjs';

const link = ( id, href, words, kinds, extra = {} ) => [ `C/${ id }`, { template: { realTag: 'a', attrs: { href }, words, inFor: false, holes: [], ...extra }, surfaces: kinds.map( ( kind ) => ( { kind } ) ) } ];
function report( elements ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'labels-' ) );
	fs.mkdirSync( path.join( repo, 'sites', 'acme', 'build', 'intake' ), { recursive: true } );
	fs.mkdirSync( path.join( repo, 'sites', 'acme', 'handoff' ), { recursive: true } );
	fs.writeFileSync( path.join( repo, 'sites', 'acme', 'build', 'intake', 'facts.json' ), JSON.stringify( { elements: Object.fromEntries( elements ) } ) );
	try {
		return readLinkTextReport( { repo, client: 'acme' } );
	} finally {
		fs.rmSync( repo, { recursive: true, force: true } );
	}
}

test( 'MUST FAIL: a static header link gives its own text for its route, not the page title (negative control: a binding gives none)', () => {
	const r = report( [ link( 1, 'Gifts.dc.html', 'Gifts', [ 'header' ] ), link( 2, 'Shop.dc.html', '{{ shopWord }}', [ 'header' ] ), link( 3, '{{ to }}', 'Other', [ 'header' ] ), link( 4, 'Shop.dc.html', 'Shop now', [ 'header' ], { realTag: 'button' } ) ] );
	assert.deepEqual( r.text, { header: { 'Gifts.dc.html': 'Gifts' } } );
	assert.deepEqual( r.conflicts, [] );
} );

test( 'MUST FAIL: the same text in two surfaces is read for each; two texts for one route in a surface are reported and carry no entry', () => {
	const r = report( [ link( 1, 'Help.dc.html#faq', 'Help', [ 'header', 'footer' ] ), link( 2, 'Contact.dc.html', 'Contact', [ 'header' ] ), link( 3, 'Contact.dc.html', 'Get in touch', [ 'header' ] ) ] );
	assert.deepEqual( r.text, { header: { 'Help.dc.html': 'Help' }, footer: { 'Help.dc.html': 'Help' } } );
	assert.equal( r.conflicts.length, 1 );
	assert.match( r.conflicts[ 0 ], /Contact\.dc\.html.*"Contact" and "Get in touch"/ );
} );

test( 'a link without text and an external link give nothing', () => {
	assert.deepEqual( report( [ link( 1, 'Gifts.dc.html', '', [ 'header' ] ), link( 2, 'https://example.org/', 'Elsewhere', [ 'header' ] ) ] ).text, {} );
} );

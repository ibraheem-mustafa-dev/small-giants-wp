// Spec 48 FR-48-31 (Bean, 2026-10-27): a colour token named for a brand in plugins/sgs-blocks/includes/data/brand-registry.json
// (its slug, Site Info name, label words or aliases, as a whole word of the token name) is that brand's colour, which the
// brand-aware blocks paint themselves, so the palette proposal gives it no slot and never a custom token. A brand that
// already has a palette slot through a rendered fact or a name rule keeps it. WhatsApp has no slot of its own: it follows the same rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import { proposePalette, loadPaletteSlugs } from '../lib/intake-palette.mjs';
import { brandOfToken, brandNames, brandRegistry } from '../lib/brand-registry.mjs';

const slugOf = ( name ) => brandOfToken( name )?.slug ?? null;

test( 'MUST FAIL: a token named for a registry brand, by any of its names, is that brand', () => {
	assert.equal( slugOf( '--social-facebook' ), 'facebook' );
	assert.equal( slugOf( '--fb-blue' ), 'facebook' );
	assert.equal( slugOf( '--brand-youtube' ), 'youtube' );
	assert.equal( slugOf( '--insta-pink' ), 'instagram' );
	assert.equal( slugOf( '--twitter_blue' ), 'x' );
	assert.equal( slugOf( '--linkedin' ), 'linkedin' );
	assert.equal( slugOf( '--google-blue' ), 'google' );
} );

test( 'negative control: no brand for a one-letter slug, a contact entry with no colour, or a word inside another word', () => {
	assert.equal( slugOf( '--box-x' ), null, 'x is one letter, so only twitter names X' );
	assert.equal( slugOf( '--phone-bg' ), null, 'phone carries no colour' );
	assert.equal( slugOf( '--text-link' ), null );
	assert.equal( slugOf( '--fbx' ), null, 'fb only as a whole word' );
	assert.ok( brandNames( brandRegistry().find( ( b ) => 'x' === b.slug ) ).includes( 'twitter' ) );
} );

const SLUGS = loadPaletteSlugs();
const TOKENS = [
	{ name: '--ink', type: 'colour', hex: '#141414' }, { name: '--paper', type: 'colour', hex: '#FAF8F5' },
	{ name: '--social-facebook', type: 'colour', hex: '#1877F2' }, { name: '--mystery', type: 'colour', hex: '#7A3E9D' },
];
const use = ( hex, property, tag, count = 1, extra = {} ) => ( { hex, property, draftId: `d:${ tag }`, count, tag, ...extra } );
const USAGE = [
	use( '#FAF8F5', 'background-color', 'body' ), use( '#141414', 'color', 'body', 1, { ground: '#FAF8F5' } ),
	use( '#141414', 'color', 'p', 9, { ground: '#FAF8F5', text: true, chars: 900 } ),
	use( '#1877F2', 'fill', 'svg', 1 ), use( '#7A3E9D', 'fill', 'svg', 1 ),
];

test( 'MUST FAIL: the proposal gives a brand-named token no slot and no custom token, and names the brand', () => {
	const row = proposePalette( { tokens: TOKENS, usage: USAGE, slugs: SLUGS } ).rows.find( ( r ) => '--social-facebook' === r.token );
	assert.equal( row.role, null );
	assert.deepEqual( row.roles, [] );
	assert.equal( row.brand, 'facebook' );
	assert.match( row.why, /brand colour: Facebook/ );
} );

test( 'MUST FAIL: WhatsApp follows the brand-token rule: --wa and every --wa-* token, used or not, get no slot and name the brand', () => {
	const tokens = [ ...TOKENS, { name: '--wa', type: 'colour', hex: '#25D366' }, { name: '--wa-hover', type: 'colour', hex: '#1EBE5A' }, { name: '--wa-soft', type: 'colour', hex: '#E9F9EF' } ];
	const usage = [ ...USAGE, use( '#25D366', 'background-color', 'a', 6, { channel: 'whatsapp' } ) ];
	const rows = proposePalette( { tokens, usage, slugs: SLUGS } ).rows;
	for ( const name of [ '--wa', '--wa-hover', '--wa-soft' ] ) {
		const row = rows.find( ( r ) => name === r.token );
		assert.equal( row.role, null, name );
		assert.deepEqual( row.roles, [], name );
		assert.equal( row.brand, 'whatsapp', name );
		assert.match( row.why, /brand colour: WhatsApp/, name );
	}
	assert.ok( ! rows.some( ( r ) => r.roles.includes( 'whatsapp' ) ), 'no row holds a whatsapp slug' );
} );

test( 'negative control: a brand-named token whose value a rendered fact gives a slot keeps that slot', () => {
	const tokens = [ ...TOKENS, { name: '--facebook-ink', type: 'colour', hex: '#141414' } ];
	const row = proposePalette( { tokens, usage: USAGE, slugs: SLUGS } ).rows.find( ( r ) => '--facebook-ink' === r.token );
	assert.ok( row.roles.includes( 'text' ), row.why );
	assert.equal( row.brand, undefined );
} );

test( 'negative control: an unnamed colour with no role still becomes a custom token', () => {
	const row = proposePalette( { tokens: TOKENS, usage: USAGE, slugs: SLUGS } ).rows.find( ( r ) => '--mystery' === r.token );
	assert.equal( row.role, 'custom-mystery' );
	assert.equal( row.brand, undefined );
} );

test( 'MUST FAIL: a review-platform block in the framework DB names a brand the registry lacks (sgs/<brand>-reviews)', async () => {
	const { paletteBrands } = await import( '../lib/brand-registry.mjs' );
	const brands = paletteBrands( brandRegistry(), [ 'sgs/google-reviews', 'sgs/trustpilot-reviews', 'sgs/acme-reviews' ] );
	assert.equal( brandOfToken( '--trustpilot-green', brands )?.reviewBlock, 'sgs/trustpilot-reviews' );
	assert.equal( brandOfToken( '--acme', brands )?.slug, 'acme' );
	assert.equal( brands.filter( ( b ) => 'google' === b.slug ).length, 1, 'a block brand the registry already holds is not added twice' );
	assert.equal( brandOfToken( '--trustpilot-green', brandRegistry() ), null, 'negative control: the registry alone has no Trustpilot' );
} );

test( 'the live framework DB names Trustpilot through its reviews block', () => {
	assert.equal( brandOfToken( '--trustpilot-green' )?.slug, 'trustpilot' );
} );

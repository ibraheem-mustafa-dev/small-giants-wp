/**
 * sgs/icon-list Site Info items, editor twins of includes/helpers-site-info-items.php::sgs_site_info_item():
 * the address prints one line per <br> (not a comma line), an invalid email is hidden like a blank one (is_email), and
 * switching an item to phone or email drops a stale newTab (a tel: or mailto: link never opens a tab).
 *
 * Negative control: each assertion fails against the pre-fix module (comma-joined address, invalid email shown,
 * newTab kept), proved by running this file before the change.
 */

import { siteInfoItemPreview, contentSourcePatch } from '../../src/blocks/icon-list/site-info-items';

const info = (patch = {}) => ( {
	phone: { value: '0121 729 8233' },
	email: { value: 'hello@example.test' },
	address: { value: '644 Washwood Heath Rd<br>Birmingham B8 2HQ', link: 'https://maps.example/x' },
	...patch,
} );

describe( 'siteInfoItemPreview', () => {
	it( 'prints the address one line per break, as the site does', () => {
		const out = siteInfoItemPreview( { siteInfoSource: 'address' }, info(), {} );
		expect( out.lines ).toEqual( [ '644 Washwood Heath Rd', 'Birmingham B8 2HQ' ] );
		expect( out.text ).toBe( '644 Washwood Heath Rd\nBirmingham B8 2HQ' );
		expect( out.text ).not.toContain( ',' );
		expect( out.hidden ).toBe( false );
	} );

	it( 'accepts <br/>, <BR> and drops empty lines', () => {
		const out = siteInfoItemPreview( { siteInfoSource: 'address' }, info( { address: { value: 'A<br/>  <BR >B<br>' } } ), {} );
		expect( out.lines ).toEqual( [ 'A', 'B' ] );
	} );

	it( 'hides an invalid email the way the site does, and says why', () => {
		for ( const bad of [ 'not-an-email', 'a@b', 'two words@x.test', '@x.test' ] ) {
			const out = siteInfoItemPreview( { siteInfoSource: 'email' }, info( { email: { value: bad } } ), {} );
			expect( out.hidden ).toBe( true );
			expect( out.invalid ).toBe( true );
			expect( out.url ).toBe( '' );
		}
	} );

	it( 'a blank email is hidden but not marked invalid; a valid one shows and links', () => {
		const blank = siteInfoItemPreview( { siteInfoSource: 'email' }, info( { email: { value: '' } } ), {} );
		expect( blank.hidden ).toBe( true );
		expect( blank.invalid ).toBeFalsy();
		const ok = siteInfoItemPreview( { siteInfoSource: 'email' }, info(), {} );
		expect( ok ).toMatchObject( { text: 'hello@example.test', url: 'mailto:hello@example.test', hidden: false } );
	} );
} );

describe( 'contentSourcePatch', () => {
	const typedPast = { text: 'Call us', url: 'https://example.test', newTab: true };

	it( 'clears a stale newTab when switching to phone or email', () => {
		expect( contentSourcePatch( typedPast, 'phone' ).newTab ).toBeUndefined();
		expect( contentSourcePatch( typedPast, 'email' ).newTab ).toBeUndefined();
	} );

	it( 'keeps newTab for address, hours and typed text', () => {
		for ( const val of [ 'address', 'hours', '' ] ) {
			expect( contentSourcePatch( typedPast, val ).newTab ).toBe( true );
		}
	} );

	it( 'keeps the link-by-default rule and the rest of the item', () => {
		expect( contentSourcePatch( typedPast, 'address' ) ).toMatchObject( { siteInfoSource: 'address', siteInfoLink: true, text: 'Call us' } );
		expect( contentSourcePatch( typedPast, 'phone' ).siteInfoLink ).toBeUndefined();
	} );
} );

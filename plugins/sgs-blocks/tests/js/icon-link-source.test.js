/**
 * sgs/icon link source (editor twin of render.php's sgs_icon_resolve_bound_link): a Site Info bound icon links to
 * Site Info first and to its own typed link as the fallback; `linkSource: 'custom'` always takes the typed link. The
 * "hidden on your site" notice shows only when neither source gives a link.
 *
 * Negative controls: 'the typed link rescues a blank key' fails if hidden ignores the typed link, and 'a hostile typed
 * link is no fallback' fails if the typed link is not screened (proved by planting each break and running this file).
 */

import { linkFallbackState, siteInfoLinkState } from '../../src/blocks/icon/icon-state';

const SITE_INFO = {
	phone: { value: '0121 729 8233', link: 'tel:01217298233', filled: true },
	'socials.tiktok': { value: '', link: '', filled: false },
};
const blank = siteInfoLinkState( 'socials.tiktok', SITE_INFO );
const filled = siteInfoLinkState( 'phone', SITE_INFO );

describe( 'link fallback state', () => {
	it( 'a blank key with no typed link is hidden', () => {
		expect( linkFallbackState( blank, { linkUrl: '', linkSource: 'site-info' } ).hidden ).toBe( true );
		expect( linkFallbackState( blank, { linkUrl: '   ' } ).hidden ).toBe( true );
	} );

	it( 'the typed link rescues a blank key', () => {
		const state = linkFallbackState( blank, { linkUrl: 'https://example.test/own', linkSource: 'site-info' } );
		expect( state.hidden ).toBe( false );
		expect( state.fromSite ).toBe( false );
		expect( state.url ).toBe( 'https://example.test/own' );
	} );

	it( 'a filled key is the Site Info link and is not hidden', () => {
		const state = linkFallbackState( filled, { linkUrl: 'https://example.test/own' } );
		expect( state.hidden ).toBe( false );
		expect( state.fromSite ).toBe( true );
		expect( state.source ).toBe( 'site-info' );
	} );

	it( 'custom takes the typed link even when the key is filled, and hides without one', () => {
		const withTyped = linkFallbackState( filled, { linkUrl: 'https://example.test/own', linkSource: 'custom' } );
		expect( withTyped ).toMatchObject( { source: 'custom', hidden: false, fromSite: false, url: 'https://example.test/own' } );
		expect( linkFallbackState( filled, { linkUrl: '', linkSource: 'custom' } ).hidden ).toBe( true );
	} );

	it( 'an unknown linkSource behaves as site-info', () => {
		expect( linkFallbackState( filled, { linkUrl: 'https://example.test/own', linkSource: 'nonsense' } ).source ).toBe( 'site-info' );
	} );

	it( 'a hostile typed link is no fallback', () => {
		expect( linkFallbackState( blank, { linkUrl: 'javascript:alert(1)' } ).hidden ).toBe( true );
		expect( linkFallbackState( blank, { linkUrl: ' JaVaScRiPt:alert(1)' } ).url ).toBe( '' );
		expect( linkFallbackState( blank, { linkUrl: 'tel:+441217298233' } ).hidden ).toBe( false );
	} );

	it( 'an unbound icon is never hidden by this state', () => {
		const unbound = siteInfoLinkState( '', SITE_INFO );
		expect( linkFallbackState( unbound, { linkUrl: '' } ).hidden ).toBe( false );
	} );

	it( 'a key the editor has no data for is not hidden unless custom has no link', () => {
		const unknown = siteInfoLinkState( 'opening_hours.mon', SITE_INFO );
		expect( linkFallbackState( unknown, { linkUrl: '' } ).hidden ).toBe( false );
		expect( linkFallbackState( unknown, { linkUrl: '', linkSource: 'custom' } ).hidden ).toBe( true );
	} );
} );

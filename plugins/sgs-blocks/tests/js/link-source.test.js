/**
 * The shared link source's editor twin (src/utils/link-source.js) and the link popover's picker
 * helpers (src/components/LinkSourcePicker.js). The server owner is includes/helpers-link-source.php,
 * proved by tests/php/run-link-source-shared-standalone.php; this file proves the editor shows the same
 * hrefs from the same rules, and that the two sides name the same Site Info keys.
 *
 * Negative controls: 'a refused scheme never previews' fails if isSafeLinkUrl() is bypassed, and the
 * parity test fails if a source is added to one side only.
 */
import fs from 'fs';
import path from 'path';
import {
	LINK_SOURCE_SITE_INFO_KEYS,
	linkSourcePostId,
	isSafeLinkUrl,
	resolveLinkSource,
} from '../../src/utils/link-source';
import { linkSourceMode, isSiteInfoMode, linkSourceRowText } from '../../src/components/LinkSourcePicker';
import {
	LINK_SOURCES_ALL,
	LINK_SOURCES_WEB,
	LINK_SOURCES_PAGES,
	LINK_SOURCES_NO_TOP,
	LINK_SOURCE_OPTIONS,
	LINK_SOURCE_HELP,
} from '../../src/shared/link-source-options';

// The shape Sgs_Site_Info_Binding::editor_site_info() publishes on window.sgsBlocksData.siteInfo.
const SITE_INFO = {
	phone: { value: '0121 729 8233', link: 'tel:01217298233', filled: true },
	email: { value: 'hello@example.test', link: 'mailto:hello@example.test', filled: true },
	address: { value: '1 High Street', link: 'https://maps.google.com/?cid=123456', filled: true },
	'socials.whatsapp': { value: '441217298233', link: 'https://wa.me/441217298233', filled: true },
	'socials.google': { value: 'https://g.page/r/acme', link: 'https://g.page/r/acme', filled: true },
	'socials.facebook': { value: 'https://www.facebook.com/acme', link: 'https://www.facebook.com/acme', filled: true },
	'socials.instagram': { value: '@acme', link: 'https://www.instagram.com/acme', filled: true },
	'socials.twitter': { value: 'acme', link: 'https://x.com/acme', filled: true },
	'socials.linkedin': { value: '', link: '', filled: false },
	'socials.youtube': { value: '', link: 'javascript:alert(1)', filled: true },
	'socials.tiktok': { value: 'acme', link: 'https://www.tiktok.com/@acme', filled: true },
};
const TYPED = 'https://typed.example/fallback';
const href = ( source, typed = TYPED, context = { siteInfo: SITE_INFO } ) => resolveLinkSource( source, typed, context ).url;

describe( 'resolveLinkSource (twin of sgs_resolve_link_source)', () => {
	it( 'a typed URL is untouched', () => {
		expect( href( '' ) ).toBe( TYPED );
		expect( href( 'url' ) ).toBe( TYPED );
		expect( href( undefined ) ).toBe( TYPED );
		expect( href( 'nonsense' ) ).toBe( TYPED );
		expect( href( '', '' ) ).toBe( '' );
	} );

	it( 'every Site Info source previews the link Site Info makes', () => {
		expect( href( 'phone' ) ).toBe( 'tel:01217298233' );
		expect( href( 'email' ) ).toBe( 'mailto:hello@example.test' );
		expect( href( 'whatsapp' ) ).toBe( 'https://wa.me/441217298233' );
		expect( href( 'directions' ) ).toBe( 'https://maps.google.com/?cid=123456' );
		expect( href( 'google' ) ).toBe( 'https://g.page/r/acme' );
		expect( href( 'facebook' ) ).toBe( 'https://www.facebook.com/acme' );
		expect( href( 'instagram' ) ).toBe( 'https://www.instagram.com/acme' );
		expect( href( 'twitter' ) ).toBe( 'https://x.com/acme' );
		expect( href( 'tiktok' ) ).toBe( 'https://www.tiktok.com/@acme' );
	} );

	it( 'an empty Site Info field falls back to the typed URL, else no link', () => {
		expect( href( 'linkedin' ) ).toBe( TYPED );
		expect( href( 'linkedin', '' ) ).toBe( '' );
		expect( href( 'phone', TYPED, { siteInfo: {} } ) ).toBe( TYPED );
		expect( href( 'phone', '', { siteInfo: {} } ) ).toBe( '' );
	} );

	it( 'a refused scheme never previews', () => {
		expect( href( 'youtube' ) ).toBe( TYPED );
		expect( href( 'post:12', TYPED, { permalink: 'javascript:alert(1)' } ) ).toBe( TYPED );
	} );

	it( 'a page follows its permalink when known, else the stored URL (deleted or not loaded)', () => {
		expect( href( 'post:12', 'https://example.test/old/', { permalink: 'https://example.test/new/' } ) ).toBe( 'https://example.test/new/' );
		expect( href( 'post:12', 'https://example.test/old/', {} ) ).toBe( 'https://example.test/old/' );
		expect( href( 'post:12', '', {} ) ).toBe( '' );
	} );

	it( 'back to top is #top with its data attribute', () => {
		expect( resolveLinkSource( 'top', TYPED ) ).toEqual( { url: '#top', attrs: { 'data-sgs-link-source': 'top' } } );
		expect( resolveLinkSource( 'phone', TYPED, { siteInfo: SITE_INFO } ).attrs ).toEqual( {} );
	} );

	it( 'reads window.sgsBlocksData.siteInfo when no store is passed', () => {
		window.sgsBlocksData = { siteInfo: SITE_INFO };
		expect( resolveLinkSource( 'google', '' ).url ).toBe( 'https://g.page/r/acme' );
		delete window.sgsBlocksData;
		expect( resolveLinkSource( 'google', TYPED ).url ).toBe( TYPED );
	} );
} );

describe( 'helpers', () => {
	it( 'post ids and schemes', () => {
		expect( linkSourcePostId( 'post:42' ) ).toBe( 42 );
		expect( [ 'post:0', 'post:', 'post:4x', 'phone', undefined ].map( linkSourcePostId ) ).toEqual( [ 0, 0, 0, 0, 0 ] );
		expect( [ 'http://a', 'https://a', 'mailto:a@b', 'tel:+44', '/p/', '#top' ].every( isSafeLinkUrl ) ).toBe( true );
		expect( [ 'javascript:x', 'JAVASCRIPT:x', 'data:x', 'vbscript:x', '', 'https://a/\nb' ].some( isSafeLinkUrl ) ).toBe( false );
	} );

	it( 'picker modes and the link row text', () => {
		expect( linkSourceMode( '' ) ).toBe( '' );
		expect( linkSourceMode( 'url' ) ).toBe( '' );
		expect( linkSourceMode( 'post:7' ) ).toBe( 'post' );
		expect( linkSourceMode( '', true ) ).toBe( 'post' );
		expect( linkSourceMode( 'phone' ) ).toBe( 'phone' );
		expect( isSiteInfoMode( 'directions' ) ).toBe( true );
		expect( isSiteInfoMode( 'top' ) ).toBe( false );
		expect( isSiteInfoMode( 'post' ) ).toBe( false );
		window.sgsBlocksData = { siteInfo: SITE_INFO };
		expect( linkSourceRowText( 'phone', '' ) ).toBe( 'Phone (Site Info): tel:01217298233' );
		expect( linkSourceRowText( 'linkedin', '' ) ).toBe( 'LinkedIn (Site Info): not set' );
		expect( linkSourceRowText( '', 'https://a.test/' ) ).toBe( 'https://a.test/' );
		expect( linkSourceRowText( 'post:3', 'https://a.test/page/' ) ).toBe( 'https://a.test/page/' );
		delete window.sgsBlocksData;
	} );
} );

describe( 'option sets', () => {
	it( 'every offered source has a help line and the sets nest as documented', () => {
		[ ...LINK_SOURCES_ALL, ...LINK_SOURCE_OPTIONS.map( ( o ) => o.value ).filter( ( v ) => 'url' !== v ) ].forEach( ( source ) => {
			expect( LINK_SOURCE_HELP[ source ] ).toEqual( expect.any( String ) );
		} );
		expect( LINK_SOURCES_PAGES ).toEqual( [ 'post' ] );
		expect( LINK_SOURCES_WEB.every( ( s ) => LINK_SOURCES_ALL.includes( s ) ) ).toBe( true );
		expect( LINK_SOURCES_NO_TOP ).toEqual( LINK_SOURCES_ALL.filter( ( s ) => 'top' !== s ) );
		// sgs/button's select offers every Site Info source the shared picker does.
		const buttonValues = LINK_SOURCE_OPTIONS.map( ( o ) => o.value );
		LINK_SOURCES_ALL.filter( ( s ) => 'post' !== s ).forEach( ( s ) => expect( buttonValues ).toContain( s ) );
	} );

	it( "sgs/button's block.json enum holds exactly its select's values", () => {
		const blockJson = JSON.parse( fs.readFileSync( path.join( __dirname, '../../src/blocks/button/block.json' ), 'utf8' ) );
		expect( [ ...blockJson.attributes.linkSource.enum ].sort() ).toEqual( LINK_SOURCE_OPTIONS.map( ( o ) => o.value ).sort() );
	} );
} );

describe( 'PHP / JS parity', () => {
	it( 'both sides map the same sources to the same Site Info keys', () => {
		const php = fs.readFileSync( path.join( __dirname, '../../includes/helpers-link-source.php' ), 'utf8' );
		const body = php.slice( php.indexOf( 'function sgs_link_source_site_info_keys' ) );
		const block = body.slice( body.indexOf( 'array(' ), body.indexOf( ');' ) );
		const phpMap = {};
		for ( const m of block.matchAll( /'([a-z]+)'\s*=>\s*'([a-z.]+)'/g ) ) {
			phpMap[ m[ 1 ] ] = m[ 2 ];
		}
		// phone, email and whatsapp keep sgs/button's own resolution in PHP and are not in the map.
		const jsMap = { ...LINK_SOURCE_SITE_INFO_KEYS };
		delete jsMap.phone;
		delete jsMap.email;
		delete jsMap.whatsapp;
		expect( Object.keys( phpMap ).length ).toBeGreaterThan( 0 );
		expect( phpMap ).toEqual( jsMap );
	} );
} );

/**
 * sgs/icon editor state (icon plan Phase A steps 8-10): the bound Site Info link, the hidden-when-empty notice,
 * the Unlink metadata, the brand the canvas paints, the accessible name and the length allowlist; plus the editor
 * canvas mounting with the notice.
 *
 * Negative control: 'a filled key is not hidden' and 'the notice is absent for a filled key' fail if the hidden
 * rule ignores `filled` (proved by planting that break and running this file).
 */

const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );

import {
	boundLinkKey,
	metadataWithoutLinkBinding,
	siteInfoLinkState,
	resolveBrand,
	accessibleName,
	iconLengthValue,
	SITE_INFO_ADMIN_URL,
} from '../../src/blocks/icon/icon-state';
import { BRANDS, brandBySlug } from '../../src/utils/brand-registry';

const SITE_INFO = {
	phone: { value: '0121 729 8233', link: 'tel:01217298233', filled: true },
	'socials.whatsapp': { value: '07700 900123', link: 'https://wa.me/07700900123', filled: true },
	'socials.tiktok': { value: '', link: '', filled: false },
};

const bound = ( key, extra = {} ) => ( {
	metadata: { bindings: { linkUrl: { source: 'sgs/site-info', args: { key } } }, name: 'x' },
	...extra,
} );

describe( 'bound link state', () => {
	it( 'reads the key only from an sgs/site-info binding on linkUrl', () => {
		expect( boundLinkKey( bound( 'phone' ) ) ).toBe( 'phone' );
		expect( boundLinkKey( { metadata: { bindings: { linkUrl: { source: 'core/post-meta', args: { key: 'phone' } } } } } ) ).toBe( '' );
		expect( boundLinkKey( {} ) ).toBe( '' );
	} );

	it( 'a blank key is hidden and names its field', () => {
		expect( siteInfoLinkState( 'socials.tiktok', SITE_INFO ) ).toEqual( { bound: true, hidden: true, label: 'TikTok', link: '' } );
	} );

	it( 'a filled key is not hidden', () => {
		const state = siteInfoLinkState( 'socials.whatsapp', SITE_INFO );
		expect( state.hidden ).toBe( false );
		expect( state.link ).toBe( 'https://wa.me/07700900123' );
	} );

	it( 'a key the editor has no data for is never hidden (the server decides)', () => {
		expect( siteInfoLinkState( 'opening_hours.mon', SITE_INFO ).hidden ).toBe( false );
		expect( siteInfoLinkState( '', SITE_INFO ).bound ).toBe( false );
	} );

	it( 'Unlink removes only the linkUrl binding', () => {
		expect( metadataWithoutLinkBinding( bound( 'phone' ).metadata ) ).toEqual( { name: 'x' } );
		const two = { bindings: { linkUrl: {}, ariaLabel: {} } };
		expect( metadataWithoutLinkBinding( two ) ).toEqual( { bindings: { ariaLabel: {} } } );
		expect( metadataWithoutLinkBinding( { bindings: { linkUrl: {} } } ) ).toBeUndefined();
	} );
} );

describe( 'brand and name', () => {
	it( 'the registry import is the shared JSON list', () => {
		expect( BRANDS.map( ( b ) => b.slug ) ).toContain( 'whatsapp' );
		expect( brandBySlug( 'whatsapp' ).siteInfoKey ).toBe( 'socials.whatsapp' );
	} );

	it( 'brand colours apply for a bound brand key unless the mode is theme', () => {
		const on = resolveBrand( { iconSource: 'lucide', iconName: 'star' }, 'socials.whatsapp' );
		expect( on.brandOn ).toBe( true );
		expect( on.paint.glyph ).toBe( '#1E1E1E' );
		expect( resolveBrand( { colourMode: 'theme' }, 'socials.whatsapp' ).brandOn ).toBe( false );
		expect( resolveBrand( { iconSource: 'lucide', iconName: 'phone' }, 'phone' ).brandOn ).toBe( false );
	} );

	it( 'draws the fixed Google mark only for the Google brand glyph', () => {
		expect( resolveBrand( { iconSource: 'brand', brandName: 'google' }, '' ).drawFixed ).toBe( true );
		expect( resolveBrand( { iconSource: 'brand', brandName: 'google', colourMode: 'theme' }, '' ).drawFixed ).toBe( false );
	} );

	it( 'name chain: own, key, glyph, scheme, host, none', () => {
		const instagram = brandBySlug( 'instagram' );
		expect( accessibleName( { ariaLabel: ' Mine ', boundKey: 'phone' } ) ).toEqual( { name: 'Mine', from: 'own' } );
		expect( accessibleName( { boundKey: 'phone', url: 'tel:1' } ).name ).toBe( 'Call us' );
		expect( accessibleName( { glyphBrand: instagram, url: 'https://x.test' } ).name ).toBe( 'Follow us on Instagram' );
		expect( accessibleName( { url: 'mailto:a@b.test' } ) ).toEqual( { name: 'Email', from: 'scheme' } );
		expect( accessibleName( { url: 'https://www.example.test/a' } ) ).toEqual( { name: 'example.test', from: 'host' } );
		expect( accessibleName( { url: '/contact' } ) ).toEqual( { name: '', from: '' } );
	} );

	it( 'length allowlist', () => {
		expect( iconLengthValue( '40px;}body{', 512 ) ).toBe( '' );
		expect( iconLengthValue( '9999px', 512 ) ).toBe( '512px' );
		expect( iconLengthValue( '50', 512, [ '50' ] ) ).toBe( 'var(--wp--preset--spacing--50)' );
		expect( iconLengthValue( 24, 512 ) ).toBe( '24px' );
	} );
} );

describe( 'editor canvas', () => {
	let container;
	let root;

	beforeEach( () => {
		window.sgsBlocksData = { siteInfo: SITE_INFO };
		container = document.createElement( 'div' );
		document.body.appendChild( container );
		root = createRoot( container );
	} );

	afterEach( () => {
		act( () => root.unmount() );
		container.remove();
	} );

	const mount = ( attributes ) => {
		const Edit = require( '../../src/blocks/icon/edit' ).default;
		act( () => {
			root.render( React.createElement( Edit, { attributes: { iconSource: 'lucide', iconName: 'star', ...attributes }, setAttributes: jest.fn(), clientId: 'c1' } ) );
		} );
	};

	it( 'shows the permanent notice and the Site Info link for a blank bound key', () => {
		mount( bound( 'socials.tiktok' ) );
		const notice = container.querySelector( '.sgs-icon__notice' );
		expect( notice ).not.toBeNull();
		expect( notice.textContent ).toContain( 'Hidden on your site: TikTok is empty in Site Info.' );
		expect( notice.querySelector( 'a' ).getAttribute( 'href' ) ).toBe( SITE_INFO_ADMIN_URL );
		expect( container.querySelector( '.sgs-icon--hidden-empty' ) ).not.toBeNull();
	} );

	it( 'the notice is absent for a filled key', () => {
		mount( bound( 'socials.whatsapp' ) );
		expect( container.querySelector( '.sgs-icon__notice' ) ).toBeNull();
		expect( container.querySelector( '.sgs-icon--brand' ) ).not.toBeNull();
	} );
} );

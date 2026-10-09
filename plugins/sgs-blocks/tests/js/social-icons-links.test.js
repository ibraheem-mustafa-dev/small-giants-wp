/**
 * sgs/social-icons editor logic (icon plan Phase B step 2): the children a new row starts with, the Links checklist
 * rows, ticking and unticking a key, and the sgs/icon group-context twin (iconGroupContext / attributesInGroup).
 *
 * Negative control: 'a new row starts with only the filled keys, in registry order' and 'unticking keeps the child'
 * fail if templateFromSiteInfo ignores `filled` or toggleLink appends on untick (proved by planting each break and
 * running this file).
 */

import { LINK_KEYS, childAttributesForKey, templateFromSiteInfo, checklistRows, toggleLink } from '../../src/blocks/social-icons/links';
import { iconGroupContext, attributesInGroup } from '../../src/blocks/icon/icon-state';
import { BRANDS } from '../../src/utils/brand-registry';

const SITE_INFO = {
	phone: { value: '0121 729 8233', link: 'tel:01217298233', filled: true },
	'socials.whatsapp': { value: '07700 900123', link: 'https://wa.me/447700900123', filled: true },
	'socials.instagram': { value: '@shop', link: 'https://instagram.com/shop', filled: true },
	'socials.tiktok': { value: '', link: '', filled: false },
};

const child = ( key ) => ( { clientId: key, name: 'sgs/icon', attributes: childAttributesForKey( key ) } );

describe( 'LINK_KEYS', () => {
	it( 'is every registry Site Info key in registry order', () => {
		expect( LINK_KEYS.map( ( k ) => k.key ) ).toEqual( BRANDS.map( ( b ) => b.siteInfoKey ).filter( Boolean ) );
		expect( LINK_KEYS[ 0 ].key ).toBe( 'phone' );
	} );
} );

describe( 'childAttributesForKey', () => {
	it( 'binds linkUrl to the key and draws the registry glyph', () => {
		expect( childAttributesForKey( 'socials.whatsapp' ) ).toEqual( {
			iconSource: 'brand',
			brandName: 'whatsapp',
			metadata: { bindings: { linkUrl: { source: 'sgs/site-info', args: { key: 'socials.whatsapp' } } } },
		} );
	} );
	it( 'refuses a key the registry lacks', () => {
		expect( childAttributesForKey( 'socials.bluesky' ) ).toBeNull();
	} );
} );

describe( 'templateFromSiteInfo', () => {
	it( 'a new row starts with only the filled keys, in registry order', () => {
		const keys = templateFromSiteInfo( SITE_INFO ).map( ( [ name, attrs ] ) => {
			expect( name ).toBe( 'sgs/icon' );
			return attrs.metadata.bindings.linkUrl.args.key;
		} );
		expect( keys ).toEqual( [ 'phone', 'socials.whatsapp', 'socials.instagram' ] );
	} );
	it( 'with nothing filled (or no editor data) every key gets an icon', () => {
		expect( templateFromSiteInfo( {} ) ).toHaveLength( LINK_KEYS.length );
		expect( templateFromSiteInfo( undefined ) ).toHaveLength( LINK_KEYS.length );
	} );
} );

describe( 'checklistRows', () => {
	const rows = checklistRows( [ child( 'phone' ), child( 'socials.whatsapp' ), child( 'socials.tiktok' ) ], [ 'socials.whatsapp' ], SITE_INFO );
	const row = ( key ) => rows.find( ( r ) => r.key === key );

	it( 'has one row per key', () => {
		expect( rows ).toHaveLength( LINK_KEYS.length );
	} );
	it( 'ticks a shown child, not a hidden one', () => {
		expect( row( 'phone' ).checked ).toBe( true );
		expect( row( 'socials.whatsapp' ).checked ).toBe( false );
		expect( row( 'socials.whatsapp' ).hasChild ).toBe( true );
	} );
	it( 'labels an empty key as hidden on the site', () => {
		expect( row( 'socials.tiktok' ).label ).toBe( 'TikTok (empty — hidden on your site)' );
		expect( row( 'phone' ).label ).toBe( 'Phone' );
	} );
	it( 'flags a filled key with no child', () => {
		expect( row( 'socials.instagram' ).missing ).toBe( true );
		expect( row( 'socials.tiktok' ).missing ).toBe( false );
		expect( row( 'phone' ).missing ).toBe( false );
	} );
} );

describe( 'toggleLink', () => {
	const children = [ child( 'phone' ), child( 'socials.whatsapp' ) ];
	it( 'unticking keeps the child and hides it', () => {
		expect( toggleLink( 'phone', false, children, [] ) ).toEqual( { hiddenLinks: [ 'phone' ], append: null } );
	} );
	it( 're-ticking restores a hidden child without adding one', () => {
		expect( toggleLink( 'phone', true, children, [ 'phone', 'socials.whatsapp' ] ) ).toEqual( { hiddenLinks: [ 'socials.whatsapp' ], append: null } );
	} );
	it( 'ticking a key with no child appends one', () => {
		const next = toggleLink( 'socials.instagram', true, children, [] );
		expect( next.hiddenLinks ).toEqual( [] );
		expect( next.append ).toEqual( childAttributesForKey( 'socials.instagram' ) );
	} );
} );

describe( 'sgs/icon group context twin', () => {
	it( 'outside a row nothing changes', () => {
		const group = iconGroupContext( {} );
		expect( group.inGroup ).toBe( false );
		const attrs = { colourMode: 'inherit', shape: 'square' };
		expect( attributesInGroup( attrs, group ) ).toBe( attrs );
	} );
	it( "inside a row: automatic takes the row's mode, the square takes the row's shape, the row turns the background on", () => {
		const group = iconGroupContext( {
			'sgs/socialIconsColourMode': 'theme',
			'sgs/socialIconsShape': 'circle',
			'sgs/socialIconsShowBackground': true,
			'sgs/socialIconsBorderWidth': { top: '1px' },
			'sgs/socialIconsBorderStyle': '',
			'sgs/socialIconsHiddenLinks': [ 'phone' ],
		} );
		expect( group ).toEqual( {
			inGroup: true,
			colourMode: 'theme',
			hidden: [ 'phone' ],
			shape: 'circle',
			showBg: true,
			border: true,
			borderWidth: { top: '1px' },
			borderStyle: '',
			showLabel: false,
			labelPosition: '',
			brandHover: 'swap',
		} );
		expect( attributesInGroup( { colourMode: 'inherit', shape: 'square' }, group ) ).toMatchObject( { colourMode: 'theme', shape: 'circle', showBackground: true } );
		// Brand colours on hover: an icon on Inherit follows its row; its own choice wins.
		expect( iconGroupContext( { 'sgs/socialIconsColourMode': 'brand', 'sgs/socialIconsBrandHover': 'hold' } ).brandHover ).toBe( 'hold' );
		expect( attributesInGroup( { brandHover: 'inherit' }, iconGroupContext( { 'sgs/socialIconsColourMode': 'brand', 'sgs/socialIconsBrandHover': 'hold' } ) ).brandHover ).toBe( 'hold' );
		expect( attributesInGroup( { brandHover: 'swap' }, iconGroupContext( { 'sgs/socialIconsColourMode': 'brand', 'sgs/socialIconsBrandHover': 'hold' } ) ).brandHover ).toBe( 'swap' );
		expect( attributesInGroup( { colourMode: 'brand', shape: 'pill' }, group ) ).toMatchObject( { colourMode: 'brand', shape: 'pill' } );
	} );
	it( 'a border style of none is no group border', () => {
		expect( iconGroupContext( { 'sgs/socialIconsColourMode': 'inherit', 'sgs/socialIconsBorderWidth': { top: '1px' }, 'sgs/socialIconsBorderStyle': 'none' } ).border ).toBe( false );
	} );
} );

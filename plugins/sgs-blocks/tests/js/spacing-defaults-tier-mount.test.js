/**
 * Tier-aware declared spacing defaults, at the mount.
 *
 * The real `SgsBoxControl` renders into jsdom with the defaults a mount passes it: `spacingDefaultsFor( name, attr,
 * { attributes, tier } )` read from the shipped block.json files, so the control's "Default (…)" label follows the
 * device being edited and the block's settings. The three shipped mounts are also checked to pass that context.
 *
 * Negative control: a mount that resolves with no context (the pre-tier call) shows the desktop label on Mobile.
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );

const h = React.createElement;
const SRC = path.join( __dirname, '..', '..', 'src' );
const blockJson = ( dir ) => JSON.parse( fs.readFileSync( path.join( SRC, 'blocks', dir, 'block.json' ), 'utf8' ) );

const SIZES = [
	{ slug: '30', name: 'S', size: '1rem' },
	{ slug: '40', name: 'M', size: '1.5rem' },
	{ slug: '60', name: 'XL', size: '3rem' },
];

jest.mock( '@wordpress/blocks', () => ( { getBlockType: jest.fn() } ) );

jest.mock( '@wordpress/block-editor', () => ( {
	useSettings: jest.fn( () => [ SIZES ] ),
} ) );

jest.mock( '@wordpress/icons', () => {
	const names = [
		'link',
		'linkOff',
		'sidesAll',
		'sidesTop',
		'sidesRight',
		'sidesBottom',
		'sidesLeft',
		'sidesAxial',
		'sidesVertical',
		'sidesHorizontal',
		'cornerAll',
		'cornerTopLeft',
		'cornerTopRight',
		'cornerBottomRight',
		'cornerBottomLeft',
	];
	const icons = Object.fromEntries( names.map( ( n ) => [ n, { iconName: n } ] ) );
	icons.Icon = ( { icon } ) => require( 'react' ).createElement( 'span', { 'data-icon': icon.iconName } );
	return icons;
} );

jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	const box =
		( name ) =>
		( { children, className } ) =>
			R.createElement( 'div', { 'data-testid': name, className }, children );
	const BaseControl = box( 'BaseControl' );
	BaseControl.VisualLabel = ( { children, id } ) => R.createElement( 'span', { id, 'data-testid': 'label' }, children );
	return {
		BaseControl,
		Flex: box( 'Flex' ),
		FlexItem: box( 'FlexItem' ),
		FlexBlock: box( 'FlexBlock' ),
		__experimentalVStack: box( 'VStack' ),
		Button: ( { label, onClick } ) => R.createElement( 'button', { 'aria-label': label, onClick } ),
		SelectControl: ( { label, value, options, onChange } ) =>
			R.createElement(
				'select',
				{ 'aria-label': label, value, onChange: ( e ) => onChange( e.target.value ) },
				options.map( ( o ) => R.createElement( 'option', { key: o.value, value: o.value }, o.label ) )
			),
		__experimentalUnitControl: ( { label, value, placeholder, onChange } ) =>
			R.createElement( 'input', {
				'data-testid': 'value-box',
				'aria-label': label,
				value,
				placeholder,
				onChange: ( e ) => onChange( e.target.value ),
			} ),
		RangeControl: () => R.createElement( 'input', { type: 'range' } ),
	};
} );

const { getBlockType } = require( '@wordpress/blocks' );
const SgsBoxControl = require( '../../src/components/SgsBoxControl' ).default;
const { spacingDefaultsFor } = require( '../../src/utils/spacing-defaults' );

let container;
let root;
beforeEach( () => {
	container = document.createElement( 'div' );
	document.body.appendChild( container );
	root = createRoot( container );
} );
afterEach( () => {
	act( () => root.unmount() );
	container.remove();
	getBlockType.mockReset();
} );

/** Mounts a control the way a block's inspector does and returns the first option label of each side's select. */
function labelsFor( dir, attr, context ) {
	const json = blockJson( dir );
	getBlockType.mockReturnValue( json );
	act( () =>
		root.render(
			h( SgsBoxControl, {
				label: 'Padding',
				presets: true,
				values: {},
				defaults: spacingDefaultsFor( json.name, attr, context ),
				onChange: () => {},
			} )
		)
	);
	return [ ...container.querySelectorAll( 'select' ) ].map( ( s ) => s.options[ 0 ].textContent );
}

describe( 'the control label follows the previewed device', () => {
	it( 'sgs/cta-section padding reads Default (XL) / (M) on desktop and Default (M) / (S) on mobile', () => {
		expect( labelsFor( 'cta-section', 'padding', { tier: 'desktop' } ) ).toEqual( [
			'Default (XL)',
			'Default (M)',
			'Default (XL)',
			'Default (M)',
		] );
		act( () => root.unmount() );
		root = createRoot( container );
		expect( labelsFor( 'cta-section', 'padding', { tier: 'mobile' } ) ).toEqual( [
			'Default (M)',
			'Default (S)',
			'Default (M)',
			'Default (S)',
		] );
	} );

	it( 'negative control: a mount that resolves with no context shows the desktop label on mobile', () => {
		expect( labelsFor( 'cta-section', 'padding' ) ).toEqual( [
			'Default (XL)',
			'Default (M)',
			'Default (XL)',
			'Default (M)',
		] );
	} );

	it( 'sgs/tabs tabPadding reads Default (0.875rem) / (1rem) on mobile for stacked horizontal tabs only', () => {
		const stacked = { orientation: 'horizontal', mobileLayout: 'stack' };
		// The unlinked box lists one row per side; the stylesheet paints 1rem as a literal, so it is declared as one.
		expect( labelsFor( 'tabs', 'tabPadding', { attributes: stacked, tier: 'mobile' } ) ).toEqual( [
			'Default (0.875rem)',
			'Default (1rem)',
			'Default (0.875rem)',
			'Default (1rem)',
		] );
	} );

	it( 'sgs/tabs tabPadding keeps the 12px / 20px default on mobile when the tab row is kept', () => {
		expect(
			labelsFor( 'tabs', 'tabPadding', { attributes: { orientation: 'horizontal', mobileLayout: 'row' }, tier: 'mobile' } )
		).toEqual( [ 'Default (12px)', 'Default (20px)', 'Default (12px)', 'Default (20px)' ] );
	} );

	it( 'sgs/google-reviews cardPadding reads Default (28px) for the Boxed look and one row for the plain look', () => {
		expect( labelsFor( 'google-reviews', 'cardPadding', { attributes: { cardStyle: 'boxed' }, tier: 'desktop' } ) ).toEqual( [
			'Default (28px)',
		] );
		act( () => root.unmount() );
		root = createRoot( container );
		expect(
			labelsFor( 'google-reviews', 'cardPadding', { attributes: { cardStyle: 'google-card' }, tier: 'desktop' } )
		).toEqual( [ 'Default (20px)' ] );
	} );
} );

describe( 'the shipped mounts pass the device and the settings', () => {
	const source = ( ...parts ) => fs.readFileSync( path.join( SRC, ...parts ), 'utf8' ).replace( /\s+/g, ' ' );

	it( 'sgs/cta-section hands the ResponsiveOverride tier to its padding control', () => {
		const edit = source( 'blocks', 'cta-section', 'edit.js' );
		expect( edit ).toMatch( /\{ tier, ownValue, setOwnValue \} \) => \( <SgsBoxControl label=\{ __\( 'Padding'/ );
		expect( edit ).toContain( "defaults={ spacingDefaultsFor( name, 'padding', { attributes, tier } ) }" );
	} );

	it( 'sgs/tabs hands the previewed tier and the attributes to its tab padding control', () => {
		const edit = source( 'blocks', 'tabs', 'edit.js' );
		expect( edit ).toContain( "defaults={ spacingDefaultsFor( name, 'tabPadding', { attributes, tier: previewTier } ) }" );
		expect( edit ).toMatch( /const previewTier = usePreviewTier\(\)/ );
	} );

	it( 'sgs/google-reviews names its block to the card padding TierBox, which resolves per tier and look', () => {
		expect( source( 'blocks', 'google-reviews', 'components', 'CardPanel.js' ) ).toContain(
			'attr="cardPadding" blockName={ name }'
		);
		expect( source( 'blocks', 'google-reviews', 'edit.js' ) ).toContain( '<CardPanel name={ name }' );
		expect( source( 'blocks', 'google-reviews', 'components', 'panel-fields.js' ) ).toContain(
			'spacingDefaultsFor( blockName, attr, { attributes, tier } )'
		);
	} );
} );

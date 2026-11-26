/**
 * components/element-switcher: which parts a family's switcher lists (Bean, 2026-11-25) and how the component draws them.
 *
 * A part is listed when it has a setting in the family and the block draws it now; a part holding a value that is not drawn
 * stays listed, marked "not shown here". The rules run against the real card-grid `block.json` (a delegating source mode,
 * a wrapper and a card part with borders) and against small declared parts for the media kind.
 *
 * Guards (each was proven able to fail by breaking the rule in turn):
 *   1 a part with no setting in the family is listed        -> "lists only parts with settings in the family"
 *   2 the source mode is not read                            -> "a delegating mode leaves the card parts out"
 *   3 a held value is dropped with its undrawn part          -> "a part that holds a value stays, marked"
 *   4 a block default counts as a held value                 -> "a block's own default is not a held value"
 *   5 one part still draws the switcher                      -> "one listed part draws no switcher"
 */
'use strict';

const React = require( 'react' );
const { act } = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { getBlockType } = require( '@wordpress/blocks' );

import cardGrid from '../../src/blocks/card-grid/block.json';
import {
	FAMILIES,
	familyAttributes,
	switcherOptions,
	switcherParts,
} from '../../src/components/element-switcher/parts';
import ElementSwitcher from '../../src/components/element-switcher/ElementSwitcher';

// The choice atom is replaced by a stand-in that prints its options, so the test reads what the switcher offers.
jest.mock( '../../src/components/motion/ChoiceAtom', () => ( {
	__esModule: true,
	default: ( { options, value, onChange } ) =>
		require( 'react' ).createElement(
			'select',
			{ 'data-switcher': 'true', value, onChange: ( e ) => onChange( e.target.value ) },
			options.map( ( option ) =>
				require( 'react' ).createElement( 'option', { key: option.value, value: option.value }, option.label )
			)
		),
} ) );

global.IS_REACT_ACT_ENVIRONMENT = true;

const supportsSgs = cardGrid.supports.sgs;
const elements = supportsSgs.elements;
const values = ( parts ) => parts.map( ( part ) => part.value );

describe( 'switcherParts', () => {
	test( 'lists only parts with settings in the family', () => {
		const shadow = switcherParts( {
			elements,
			family: 'shadow',
			attributes: { source: 'manual' },
			supportsSgs,
		} );
		const border = switcherParts( {
			elements,
			family: 'border',
			attributes: { source: 'manual' },
			supportsSgs,
		} );
		expect( values( shadow ) ).toEqual( [ 'item' ] );
		expect( values( border ).sort() ).toEqual( [ 'grid', 'item' ] );
		for ( const part of shadow ) {
			expect(
				familyAttributes( elements[ part.value ], 'shadow' ).length
			).toBeGreaterThan( 0 );
		}
		expect( Object.keys( FAMILIES ) ).toEqual( [ 'shadow', 'border', 'typography' ] );
	} );

	test( 'a delegating mode leaves the card parts out', () => {
		const parts = switcherParts( {
			elements,
			family: 'border',
			attributes: { source: 'wc-product' },
			supportsSgs,
		} );
		expect( values( parts ) ).toEqual( [ 'grid' ] );
	} );

	test( 'a part that holds a value stays, marked "not shown here"', () => {
		const attributes = { source: 'wc-product', cardBorderWidth: { top: '2px' } };
		const parts = switcherParts( {
			elements,
			family: 'border',
			attributes,
			supportsSgs,
		} );
		expect( parts.find( ( part ) => 'item' === part.value ) ).toMatchObject( {
			held: true,
			shown: false,
		} );
		const labels = switcherOptions( parts );
		const item = labels.find( ( option ) => 'item' === option.value );
		expect( item.label ).toMatch( /not shown here/ );
		expect( item.label.endsWith( '•' ) ).toBe( true );
	} );

	test( "a block's own default is not a held value", () => {
		const attributes = { source: 'manual', borderStyle: 'solid', borderWidth: [] };
		const parts = switcherParts( {
			elements,
			family: 'border',
			attributes,
			supportsSgs,
			defaults: { borderStyle: 'solid' },
		} );
		expect( parts.find( ( part ) => 'grid' === part.value ).held ).toBe( false );
		const set = switcherParts( {
			elements,
			family: 'border',
			attributes: { ...attributes, borderStyle: 'dashed' },
			supportsSgs,
			defaults: { borderStyle: 'solid' },
		} );
		expect( set.find( ( part ) => 'grid' === part.value ).held ).toBe( true );
	} );

	test( 'a media part is listed only while a device shows a kind it is for', () => {
		const media = {
			svg: {
				label: 'SVG layer',
				order: 1,
				attrMap: { 'css:box-shadow': 'svgShadow' },
				availableWhen: { slot: 'background', kinds: [ 'svg' ] },
			},
			image: {
				label: 'Photo',
				order: 2,
				attrMap: { 'css:box-shadow': 'imageShadow' },
				availableWhen: { slot: 'background', kinds: [ 'image' ] },
			},
		};
		const kindsOf = () => ( { desktop: 'image', tablet: 'image', mobile: 'image' } );
		expect(
			values(
				switcherParts( {
					elements: media,
					family: 'shadow',
					attributes: {},
					kindsOf,
				} )
			)
		).toEqual( [ 'image' ] );
		expect(
			values(
				switcherParts( {
					elements: media,
					family: 'shadow',
					attributes: { svgShadow: 'lifted' },
					kindsOf,
				} )
			)
		).toEqual( [ 'svg', 'image' ] );
	} );

	test( 'a hover-state setting counts toward the family', () => {
		const part = {
			attrMap: { 'css:color': 'nameColour' },
			states: { hover: { attrMap: { 'css:box-shadow': 'nameShadowHover' } } },
		};
		expect( familyAttributes( part, 'shadow' ) ).toEqual( [ 'nameShadowHover' ] );
		expect( familyAttributes( part, 'border' ) ).toEqual( [] );
	} );
} );

describe( 'ElementSwitcher', () => {
	let root;
	let container;
	const mount = ( element ) => {
		container = document.createElement( 'div' );
		document.body.appendChild( container );
		root = createRoot( container );
		act( () => root.render( element ) );
		return container;
	};
	afterEach( () => {
		act( () => root.unmount() );
		container.remove();
	} );

	const declare = ( sgs, attributes = {} ) =>
		getBlockType.mockImplementation( () => ( {
			supports: { sgs },
			attributes,
		} ) );

	test( 'one listed part draws no switcher, only its controls', () => {
		declare( { elements: { box: elements.grid } } );
		const out = mount(
			<ElementSwitcher blockName="sgs/x" clientId="c" family="border" attributes={ {} }>
				{ ( part ) => <p data-part={ part }>controls</p> }
			</ElementSwitcher>
		);
		expect( out.querySelector( '[data-part="box"]' ) ).not.toBeNull();
		expect( out.querySelector( '[data-switcher]' ) ).toBeNull();
	} );

	test( 'two parts draw a switcher and the chosen part controls follow it', () => {
		declare( supportsSgs );
		const out = mount(
			<ElementSwitcher
				blockName="sgs/card-grid"
				clientId="c"
				family="border"
				attributes={ { source: 'manual' } }
			>
				{ ( part ) => <p data-part={ part }>controls</p> }
			</ElementSwitcher>
		);
		const select = out.querySelector( '[data-switcher]' );
		expect( [ ...select.options ].map( ( option ) => option.value ) ).toEqual( [ 'grid', 'item' ] );
		expect( out.querySelector( '[data-part]' ).getAttribute( 'data-part' ) ).toBe( 'grid' );
		act( () => {
			select.value = 'item';
			select.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		} );
		expect( out.querySelector( '[data-part]' ).getAttribute( 'data-part' ) ).toBe( 'item' );
	} );

	test( 'a block with no part in the family draws nothing', () => {
		declare( { elements: { a: { label: 'A', attrMap: { 'css:color': 'c' } } } } );
		const out = mount(
			<ElementSwitcher blockName="sgs/x" clientId="c" family="shadow" attributes={ {} }>
				{ () => <p>controls</p> }
			</ElementSwitcher>
		);
		expect( out.innerHTML ).toBe( '' );
	} );
} );

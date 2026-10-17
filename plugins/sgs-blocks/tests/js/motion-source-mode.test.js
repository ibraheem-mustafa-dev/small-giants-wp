/**
 * Source modes in the editor's motion panels (Spec 38A §6.2): `src/blocks/extensions/motion/source-mode.js` against the
 * real card-grid `block.json`. In the wc-product and cpt-collection modes the grid prints each result as its template
 * `sgs/product-card`, so it offers only its wrapper part: every card part is a target of the template card's own Effects
 * panel. In manual and query modes every part is offered. A part left out that still holds a stored layer stays
 * listed, marked as not reaching the page in that mode, so the layer can be found and removed.
 */

const fs = require( 'fs' );
const path = require( 'path' );

import cardGrid from '../../src/blocks/card-grid/block.json';
import {
	activeDelegation,
	delegateConfig,
	elementsForSourceMode,
	heldTargets,
} from '../../src/blocks/extensions/motion/source-mode';
import { targetRowOptions } from '../../src/blocks/extensions/motion/layers/TargetRow';

const sgs = cardGrid.supports.sgs;
const wrapperParts = Object.entries( sgs.elements )
	.filter( ( [ , spec ] ) => spec?.isWrapper === true )
	.map( ( [ key ] ) => key );

describe( 'source-mode', () => {
	test( 'card-grid declares which modes print its results as the template card, and no part map', () => {
		const config = delegateConfig( sgs );
		expect( config ).toEqual( {
			attribute: 'source',
			values: [ 'wc-product', 'cpt-collection' ],
			block: 'sgs/product-card',
		} );
		expect( sgs.motionDelegate ).not.toHaveProperty( 'parts' );
		expect( activeDelegation( sgs, { source: 'wc-product' } ) ).toEqual( { block: 'sgs/product-card' } );
	} );

	test( 'the part-routing module is gone', () => {
		expect(
			fs.existsSync( path.resolve( __dirname, '../../src/blocks/extensions/motion/delegate-parts.js' ) )
		).toBe( false );
	} );

	test.each( [ 'wc-product', 'cpt-collection' ] )(
		'%s offers only the wrapper part',
		( source ) => {
			const offered = Object.keys( elementsForSourceMode( sgs, { source } ) );
			expect( wrapperParts.length ).toBeGreaterThan( 0 );
			expect( offered.sort() ).toEqual( [ ...wrapperParts ].sort() );
			[ 'item', 'title', 'image', 'body', 'noImageLabel' ].forEach( ( part ) =>
				expect( offered ).not.toContain( part )
			);
		}
	);

	test.each( [ 'manual', 'query', undefined ] )(
		'%s offers every part (negative control)',
		( source ) => {
			expect( elementsForSourceMode( sgs, { source } ) ).toBe( sgs.elements );
			expect( activeDelegation( sgs, { source } ) ).toBeNull();
		}
	);

	test( 'a part not printed in products mode that holds a layer stays listed, marked, so its layer can be removed', () => {
		const motion = {
			v: 1,
			elements: {
				title: { hover: { state: { values: { scale: 1.05 } } } },
			},
		};
		const held = heldTargets( motion );
		expect( held ).toEqual( [ 'title' ] );
		const offered = elementsForSourceMode( sgs, { source: 'wc-product' }, held );
		expect( offered.title.notInMode ).toBe( true );
		expect( Object.keys( offered ) ).not.toContain( 'image' );
		const row = targetRowOptions( offered, motion, 'hover' );
		expect( row.find( ( option ) => option.value === 'title' ).label ).toMatch( /not shown in this mode/ );
	} );

	test( 'negative control: with no layer on a part, products mode still leaves it out', () => {
		const offered = elementsForSourceMode( sgs, { source: 'wc-product' }, heldTargets( { v: 1, elements: { subtitle: {} } } ) );
		expect( Object.keys( offered ) ).not.toContain( 'subtitle' );
		expect( heldTargets( undefined ) ).toEqual( [] );
	} );

	test( 'a block with no delegation is left alone', () => {
		const elements = { title: {} };
		expect( elementsForSourceMode( { elements }, { source: 'wc-product' } ) ).toBe( elements );
		expect( delegateConfig( { motionDelegate: { attribute: 'source', values: [ 'x' ] } } ) ).toBeNull();
	} );
} );

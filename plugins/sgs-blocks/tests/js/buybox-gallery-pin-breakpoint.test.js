/**
 * The gallery pin follows the layout: sticky wherever the buy box is two columns (from 768px by default, from 1024px
 * when `stackBelow` is "tablet"), never while the columns are stacked.
 */
import fs from 'fs';
import path from 'path';

const css = fs.readFileSync( path.join( __dirname, '../../src/blocks/buybox/style.css' ), 'utf8' );
const block = ( query, selector ) => {
	let from = 0;
	let found = '';
	while ( -1 !== ( from = css.indexOf( query, from ) ) ) {
		const open = css.indexOf( '{', from );
		let depth = 1;
		let i = open + 1;
		while ( depth && i < css.length ) {
			depth += '{' === css[ i ] ? 1 : '}' === css[ i ] ? -1 : 0;
			i++;
		}
		const body = css.slice( open + 1, i - 1 );
		if ( body.includes( selector ) ) {
			found += body;
		}
		from = open + 1;
	}
	return found;
};

describe( 'buybox gallery pin breakpoint', () => {
	test( 'the pin starts at the two-column breakpoint (768px), not at 1024px', () => {
		expect( block( '@media (min-width: 768px)', '.sgs-buybox__gallery-col' ) ).toMatch( /position:\s*sticky/ );
		expect( block( '@media (min-width: 1024px)', '.sgs-buybox__gallery-col' ) ).toBe( '' );
	} );

	test( 'a block that stacks below 1024px keeps the gallery unpinned from 768 to 1023', () => {
		const body = block( '@media (min-width: 768px) and (max-width: 1023.98px)', '.sgs-buybox--stack-tablet .sgs-buybox__gallery-col' );
		expect( body ).toMatch( /position:\s*static/ );
	} );
} );

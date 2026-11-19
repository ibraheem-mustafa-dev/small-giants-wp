// A slider's slides read their parts' look at the draft's own elements (lib/skeleton-child-slots.mjs::slideSlots, rules.slider.slideSlots).
// Eye Care Home's review rail is a scrolled track of review cards: each slide is a sgs/testimonial read only at its card, so the
// block's quote and reviewer name were never paired with the card's text and name elements (Fill listed "unpaired-part: quoteFontSize
// paints the quote part ... font-size 17px was read from an element the draft does not pair"), and the block's default quote colour
// (white) stood on a white card. Each slide now names the element that prints each matched field at the part's calibrated path.
import test from 'node:test';
import assert from 'node:assert/strict';
import { N, run, find } from './fixtures/skeleton-widgets/build.mjs';

const LOGIC = `class Component {
	state = { rev: 0 };
	trackRef = React.createRef();
	componentDidMount() { this.auto = setInterval( () => this.step( 1 ), 6000 ); }
	step( dir ) { const t = this.trackRef.current; if ( ! t ) return; t.scrollTo( { left: t.scrollLeft + dir * 300 } ); }
	renderVals() {
		return {
			trackRef: this.trackRef,
			reviews: [ { text: 'Lovely cookies.', name: 'Ann' }, { text: 'Soft and filling.', name: 'Bo' }, { text: 'A kind gift.', name: 'Cy' } ],
			prev: () => this.step( -1 ),
			next: () => this.step( 1 ),
		};
	}
}`;
const slides = N( 'article', { loop: { list: 'reviews', as: 'r', copies: 3 } }, [ N( 'p', { words: ( c ) => `text ${ c }`, text: 'r.text' } ), N( 'b', { words: ( c ) => `name ${ c }`, text: 'r.name' } ) ] );
const page = () => N( 'section', {}, [
	N( 'div', { style: 'display:flex' }, [ N( 'button', { click: 'prev', attrs: { 'aria-label': 'Previous' }, words: '←' } ), N( 'button', { click: 'next', attrs: { 'aria-label': 'Next' }, words: '→' } ) ] ),
	N( 'div', { ref: 'trackRef' }, [ slides ] ),
] );
const CAL = { quoteFontSize: { slot: '.sgs-testimonial__quote' }, nameFontWeight: { slot: '.n > .name' }, quoteColour: { slot: '.sgs-testimonial__quote' } };
const slidesOf = ( r ) => find( r.skeleton, ( x ) => 'sgs/testimonial-slider' === x.name )[ 0 ]?.innerBlocks ?? [];

test( 'MUST FAIL: each slide names the draft elements that print its quote and its reviewer name at the calibrated parts', () => {
	const r = run( page(), LOGIC, { calSettings: ( slug ) => ( 'sgs/testimonial' === slug ? CAL : {} ) } );
	const s = slidesOf( r );
	assert.equal( s.length, 3 );
	s.forEach( ( slide, c ) => {
		const slots = slide.draftSlots;
		assert.deepEqual( Object.keys( slots ).sort(), [ '.n > .name', '.sgs-testimonial__quote' ], `slide ${ c } names its two parts` );
		assert.ok( Object.values( slots ).every( ( f ) => f.tpl.endsWith( `#${ c }` ) ), `slide ${ c } reads its own copy, not the first slide's` );
	} );
	assert.notEqual( s[ 0 ].draftSlots[ '.sgs-testimonial__quote' ].tpl, s[ 0 ].draftSlots[ '.n > .name' ].tpl, 'the quote and the name are different elements' );
} );

test( 'negative control: with no calibration, or no slideSlots entry, a slide has no slots', () => {
	assert.equal( slidesOf( run( page(), LOGIC ) ).filter( ( s ) => s.draftSlots ).length, 0, 'no calibrated slot, no draftSlots' );
	const off = run( page(), LOGIC, { calSettings: ( slug ) => ( 'sgs/testimonial' === slug ? CAL : {} ), off: [ 'slider.slideSlots' ] } );
	assert.equal( slidesOf( off ).filter( ( s ) => s.draftSlots ).length, 0, 'MUST FAIL: without the decisions entry nothing is paired' );
} );

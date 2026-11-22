// The widget standing rules (Spec 48 FR-48-6, lib/skeleton-widgets.mjs): an accordion, a slider and tabs recognised by what
// the draft's code does (the fact record's events, loops and conditions, and the logic's state writes and scrolls). Each
// rule MUST FAIL with its decisions entry removed; each refusal has a negative fixture. Pure functions only: no command is
// spawned and no site is contacted. Mutation list: tests/fixtures/skeleton-widgets/mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { decisionsProblems } from '../lib/skeleton-facts.mjs';
import { skeletonMissing } from '../lib/intake-missing.mjs';
import { handoverProblems } from '../lib/fill-handover.mjs';
import { parseLogic, resolveName } from '../lib/intake-ast.mjs';
import { propRefs, elementsOf, oneString } from '../lib/intake-ast-eval.mjs';
import { rootData } from '../lib/fill-list-items.mjs';
import { facts, N, run, row, find, REPO } from './fixtures/skeleton-widgets/build.mjs';

// ---- accordion fixtures ----
const FAQ_LOGIC = ( o = {} ) => `class Component {
	state = { faq: 0, open: {} };
	renderVals() {
		const S = this.state;
		return {
			faqs: [ [ 'Ordering', 'When will it arrive?', 'In three days.' ], [ 'Allergens', 'What is in them?', 'Oats and milk.' ], [ 'Gifts', 'Can I send one?', 'Yes, with a note.' ] ].map( ( [ c, qq, a ], i ) => {
				const open = ${ o.open ?? 'S.faq === i' };
				return { cat: c, q: qq, a, open, toggle: () => this.setState( ${ o.write ?? '{ faq: open ? -1 : i }' } ) };
			} ),
			drawerOpen: S.drawer,
			openDrawer: () => this.setState( { drawer: ! S.drawer } ),
		};
	}
}`;
const unit = ( o = {} ) => N( 'div', { loop: { list: 'faqs', as: 'f', copies: o.copies ?? 3 } }, [
	N( 'button', { click: 'f.toggle' }, [
		N( 'span', { style: 'font-size:12px', words: ( c ) => [ 'Ordering', 'Allergens', 'Gifts' ][ c ], text: 'f.cat' } ),
		N( 'span', { style: 'font-size:19px', words: ( c ) => [ 'When will it arrive?', 'What is in them?', 'Can I send one?' ][ c ], text: 'f.q' } ),
		o.ring ?? N( 'span', { attrs: { 'aria-hidden': 'true' }, words: '+' } ),
	] ),
	o.panel ?? N( 'p', { ifOn: '{{ f.open }}', shownIn: o.shownIn ?? [ 0 ], words: ( c ) => [ 'In three days.', 'Oats and milk.', 'Yes, with a note.' ][ c ], text: 'f.a' } ),
] );
const faqPage = ( o = {} ) => N( 'section', {}, [ N( 'div', { style: 'display:flex;flex-direction:column' }, [ ...( o.before || [] ), unit( o ) ] ) ] );

test( 'accordion: a run of units, each a control whose handler writes the key its own panel\'s condition reads, is sgs/accordion with one item per unit; MUST FAIL without the entry', () => {
	const r = run( faqPage(), FAQ_LOGIC() );
	const host = row( r, 'Root/2#0' );
	assert.deepEqual( [ host.block, host.rule ], [ 'sgs/accordion', 'accordion' ] );
	assert.equal( host.attributes.defaultOpen, 0, 'the item shown open at rest is open by default' );
	assert.equal( host.attributes.allowMultiple, undefined, 'an index key opens one at a time' );
	assert.deepEqual( [ 0, 1, 2 ].map( ( c ) => row( r, `Root/3#${ c }` ).block ), [ 'sgs/accordion-item', 'sgs/accordion-item', 'sgs/accordion-item' ] );
	assert.deepEqual( row( r, 'Root/3#1' ).attributes, { title: 'What is in them?', category: 'Allergens', showCategoryEyebrow: true }, 'the largest text is the title, the other the category, shown over the title' );
	assert.equal( host.attributes.categoryEyebrowAlways, true, 'MUST FAIL: the accordion prints its items\' category lines with no filter' );
	assert.ok( [ 0, 1, 2 ].every( ( c ) => 'absorbed' === row( r, `Root/4#${ c }` ).action && `Root/3#${ c }` === row( r, `Root/4#${ c }` ).into ), 'each control (and its glyph) is absorbed into its item' );
	const acc = find( r.skeleton, ( x ) => 'sgs/accordion' === x.name )[ 0 ];
	assert.deepEqual( acc.innerBlocks.map( ( x ) => x.innerBlocks.map( ( k ) => k.attributes.text ) ), [ [ 'In three days.' ], [ 'Oats and milk.' ], [ 'Yes, with a note.' ] ], 'MUST FAIL: every item holds its panel content, the closed ones read from the loop data' );
	assert.deepEqual( acc.innerBlocks[ 2 ].innerBlocks[ 0 ].draftRef, { tpl: 'Root/8#0' }, 'a closed item\'s panel reads the shown panel\'s look' );
	const off = run( faqPage(), FAQ_LOGIC(), { off: [ 'accordion' ] } );
	assert.notEqual( row( off, 'Root/2#0' ).block, 'sgs/accordion' );
	assert.ok( ! off.proposal.rows.some( ( x ) => 'accordion' === x.rule ) );
} );

test( 'accordion: the host reads a closed unit\'s row and header and the open unit\'s row and answer at the calibrated children\'s paths (rules.accordion.childSlots); MUST FAIL without the units on the verdict', () => {
	const ONE = '.c:nth-of-type(1)';
	const TWO = '.c:nth-of-type(2)';
	const cal = {
		headerFontWeight: { slot: `${ TWO } > .h` },
		itemBackgroundOpen: { slot: ONE, slots: [ ONE ] },
		itemShadow: { slot: ONE, slots: [ ONE, TWO ] },
		headerPadding: { slot: `${ ONE } > .h`, slots: [ `${ ONE } > .h`, `${ TWO } > .h` ] },
		iconCircleBorderWidth: { slot: `${ ONE } > .h > .i`, slots: [ `${ ONE } > .h > .i`, `${ TWO } > .h > .i` ] },
		contentPadding: { slot: `${ ONE } > .a`, slots: [ `${ ONE } > .a`, `${ TWO } > .a` ] },
		itemTitleFontFamily: { slot: `${ ONE } > .h > .t`, slots: [ `${ ONE } > .h > .t`, `${ TWO } > .h > .t` ] },
		categoryEyebrowColour: { slot: `${ ONE } > .h > .e`, slots: [ `${ ONE } > .h > .e`, `${ TWO } > .h > .e` ] },
	};
	const r = run( faqPage(), FAQ_LOGIC(), { calSettings: ( slug ) => ( 'sgs/accordion' === slug ? cal : {} ) } );
	const acc = find( r.skeleton, ( x ) => 'sgs/accordion' === x.name )[ 0 ];
	assert.deepEqual( acc.draftSlots, { [ TWO ]: { tpl: 'Root/3#1' }, [ `${ TWO } > .h` ]: { tpl: 'Root/4#1' }, [ ONE ]: { tpl: 'Root/3#0' }, [ `${ ONE } > .a` ]: { tpl: 'Root/8#0' }, [ `${ ONE } > .h > .t` ]: { tpl: 'Root/6#0' }, [ `${ ONE } > .h > .e` ]: { tpl: 'Root/5#0' } }, 'MUST FAIL: the open unit\'s question and category texts are its title and category parts' );
	assert.deepEqual( acc.draftSlotStates, { [ ONE ]: 'open', [ `${ ONE } > .a` ]: 'open', [ `${ ONE } > .h > .t` ]: 'open', [ `${ ONE } > .h > .e` ]: 'open' }, 'MUST FAIL: the open unit\'s paths are read in the open state (childSlots.currentState)' );
	assert.match( row( r, 'Root/2#0' ).slotNotes.join( ' ' ), /closed unit holds no icon element/, 'the fixture\'s glyph is not square, so no ring slot, and it is said' );
	const bare = run( faqPage(), FAQ_LOGIC() );
	assert.equal( undefined, find( bare.skeleton, ( x ) => 'sgs/accordion' === x.name )[ 0 ].draftSlots, 'negative: with no calibration there is no slot' );
} );

// The toggle glyph: a typed glyph in a square ring, turned by a declared rotate in the open copy (the draft's FAQ: a plus in
// a ring that turns 45 degrees into a cross when open).
const ring = ( o = {} ) => N( 'span', { attrs: { 'aria-hidden': 'true' }, box: [ 36, 36 ], words: o.words ?? '+', style: o.style ?? ( ( c ) => `width:36px;height:36px;transform:rotate(${ 0 === c ? 45 : 0 }deg)` ) } );
const hostOf = ( o ) => row( run( faqPage( { ring: ring( o ) } ), FAQ_LOGIC() ), 'Root/2#0' );

test( 'accordion: the closed unit\'s ring glyph is the open icon, and the shape the open unit\'s further turn ends on is the close icon (rules.accordion.toggle); MUST FAIL without the toggle read', () => {
	const host = hostOf();
	assert.equal( host.attributes.openIcon, 'plus', 'MUST FAIL: the typed plus is the Lucide plus' );
	assert.equal( host.attributes.closeIcon, 'x', 'MUST FAIL: a plus turned 45 degrees is a cross' );
	assert.equal( host.attributes.iconRotation, undefined, 'the turn is a style value no skeleton carries (R-47-10)' );
	const odd = hostOf( { style: ( c ) => `width:36px;height:36px;transform:rotate(${ 0 === c ? 30 : 0 }deg)` } );
	assert.deepEqual( [ odd.attributes.openIcon, odd.attributes.closeIcon ], [ 'plus', undefined ], 'a turn the list does not name keeps the close icon' );
	assert.match( odd.reason, /turns "\+" by 30 degrees, which rules\.accordion\.toggle\.turns names no icon for/ );
} );

test( 'accordion: a different glyph in the open ring is the close icon; the same glyph unturned stays the same icon', () => {
	const swap = hostOf( { words: ( c ) => ( 0 === c ? '−' : '+' ), style: 'width:36px;height:36px' } );
	assert.deepEqual( [ swap.attributes.openIcon, swap.attributes.closeIcon, swap.attributes.iconRotation ], [ 'plus', 'minus', undefined ] );
	const still = hostOf( { style: 'width:36px;height:36px' } );
	assert.deepEqual( [ still.attributes.openIcon, still.attributes.closeIcon, still.attributes.iconRotation ], [ 'plus', 'plus', undefined ] );
} );

test( 'NEGATIVE accordion toggle: a glyph the list names no icon for, and a control with no square ring, write no icon and say so', () => {
	const odd = hostOf( { words: '?' } );
	assert.equal( odd.attributes.openIcon, undefined );
	assert.match( odd.reason, /draws "\?", which rules\.accordion\.toggle\.glyphs names no icon for/ );
	const plain = row( run( faqPage(), FAQ_LOGIC() ), 'Root/2#0' );
	assert.equal( plain.attributes.openIcon, undefined, 'the 100x20 glyph span is no ring' );
	assert.match( plain.reason, /no closed unit draws an icon ring/ );
} );

test( 'accordion: a panel whose condition also reads a key the control never writes is still read by the key the control toggles', () => {
	const r = run( faqPage(), FAQ_LOGIC( { open: "S.lang !== 'cy' && S.faq === i" } ) );
	assert.equal( row( r, 'Root/2#0' ).block, 'sgs/accordion' );
} );

test( 'accordion: a keyed map of open items lets several open, and each item open at rest is marked open', () => {
	const r = run( faqPage( { shownIn: [ 0, 2 ] } ), FAQ_LOGIC( { open: '!! S.open[ i ]', write: '{ open: { ...S.open, [ i ]: ! S.open[ i ] } }' } ) );
	assert.equal( row( r, 'Root/2#0' ).attributes.allowMultiple, true );
	assert.equal( row( r, 'Root/2#0' ).attributes.defaultOpen, undefined );
	assert.deepEqual( [ 0, 1, 2 ].map( ( c ) => row( r, `Root/3#${ c }` ).attributes.isOpen ?? false ), [ true, false, true ] );
} );

test( 'accordion: units beside other content in their parent are one accordion with no element of its own and the parent box as its draft element; the parent keeps its block', () => {
	const r = run( faqPage( { before: [ N( 'div', { words: '3 answers' } ) ] } ), FAQ_LOGIC() );
	assert.notEqual( row( r, 'Root/2#0' ).block, 'sgs/accordion' );
	const acc = find( r.skeleton, ( x ) => 'sgs/accordion' === x.name );
	assert.equal( acc.length, 1 );
	assert.equal( acc[ 0 ].draftRef.tpl, 'Root/2#0', 'a bare parent is the box the items sit in: the accordion reads it (tests/skeleton-accordion-run.test.mjs)' );
	assert.deepEqual( [ acc[ 0 ].attributes.defaultOpen, acc[ 0 ].innerBlocks.length ], [ 0, 3 ] );
	const parent = find( r.skeleton, ( x ) => ( x.innerBlocks || [] ).some( ( k ) => 'sgs/accordion' === k.name ) )[ 0 ];
	assert.deepEqual( parent.innerBlocks.map( ( x ) => x.name ), [ 'sgs/text', 'sgs/accordion' ], 'the count line stays beside the accordion' );
	assert.equal( parent.draftRef, undefined, 'the accordion owns the box: the container made from the same parent reads none of it' );
} );

test( 'accordion: the handoff record is a cross-check: agreement is named, a record with no mechanism is a proposal problem', () => {
	const rec = { id: 'S-9', kind: 'accordion', name: 'FAQ', roots: [ 'Root/3' ], states: [] };
	const r = run( faqPage(), FAQ_LOGIC(), { surfaces: { 'S-9': rec } } );
	assert.match( row( r, 'Root/2#0' ).reason, /agrees with handoff record S-9/ );
	assert.match( run( faqPage(), FAQ_LOGIC() ).proposal.rows.find( ( x ) => 'Root/2#0' === x.key ).reason, /no handoff record of kind accordion/ );
	const none = run( faqPage(), FAQ_LOGIC( { write: '{ other: i }' } ), { surfaces: { 'S-9': rec } } );
	assert.ok( none.problems.some( ( p ) => /handoff record S-9 .*no accordion mechanism/.test( p ) ), 'MUST FAIL: the record names units no mechanism opens' );
	assert.ok( ! none.proposal.rows.some( ( x ) => 'accordion' === x.rule ), 'a record alone is never a recognition' );
} );

test( 'NEGATIVE accordion: a single toggle, a drawer opener, a show-more opening something outside its unit, a link-only disclosure, a run inside a nav and chips with no panel', () => {
	const any = ( r ) => r.proposal.rows.some( ( x ) => 'accordion' === x.rule );
	assert.equal( any( run( faqPage( { copies: 1 } ), FAQ_LOGIC() ) ), false, 'one unit is a single toggle' );
	const drawer = N( 'section', {}, [ N( 'div', {}, [ N( 'div', { loop: { list: 'faqs', as: 'f', copies: 2 } }, [ N( 'button', { click: 'openDrawer', words: 'Menu' } ) ] ) ] ), N( 'aside', { ifOn: '{{ drawerOpen }}', words: 'Drawer' } ) ] );
	assert.equal( any( run( drawer, FAQ_LOGIC() ) ), false, 'a control whose panel is outside its unit (a drawer, a show-more) opens nothing of its own' );
	const outside = N( 'section', {}, [ N( 'div', {}, [ N( 'div', { loop: { list: 'faqs', as: 'f', copies: 3 } }, [ N( 'button', { click: 'f.toggle', words: 'More' } ) ] ) ] ), N( 'p', { ifOn: '{{ f.open }}', words: 'More text' } ) ] );
	assert.equal( any( run( outside, FAQ_LOGIC() ) ), false, 'show more: the panel is not in the unit' );
	const links = faqPage( { panel: N( 'div', { ifOn: '{{ f.open }}', shownIn: [ 0 ] }, [ N( 'a', { attrs: { href: '/a' }, words: 'Link A' } ), N( 'a', { attrs: { href: '/b' }, words: 'Link B' } ) ] ) } );
	assert.equal( any( run( links, FAQ_LOGIC() ) ), false, 'panels of links are a navigation disclosure' );
	assert.equal( any( run( N( 'nav', {}, [ N( 'div', {}, [ unit() ] ) ] ), FAQ_LOGIC() ) ), false, 'a run inside a nav' );
	const chips = N( 'section', {}, [ N( 'div', {}, [ N( 'button', { loop: { list: 'faqs', as: 'f', copies: 3 }, click: 'f.toggle', attrs: { 'aria-pressed': 'false' }, words: 'Chip' } ) ] ) ] );
	const twoControls = faqPage( { panel: N( 'div', {}, [ N( 'button', { click: 'f.toggle', attrs: { 'aria-label': 'Edit' } } ), N( 'p', { ifOn: '{{ f.open }}', shownIn: [ 0 ], words: 'Answer', text: 'f.a' } ) ] ) } );
	assert.equal( any( run( twoControls, FAQ_LOGIC() ) ), false, 'a unit holding two controls is no disclosure unit' );
	assert.equal( any( run( chips, FAQ_LOGIC() ) ), false, 'chips with no panel are an option picker' );
} );

// ---- slider fixtures ----
const SLIDER_LOGIC = ( o = {} ) => `class Component {
	state = { rev: 0, other: 0 };
	trackRef = React.createRef();
	componentDidMount() { ${ o.timer ?? 'this.auto = setInterval( () => this.step( 1 ), 6000 );' } }
	step( dir, ref ) { const t = ( ref || this.trackRef ).current; if ( ! t ) return; t.scrollTo( { left: t.scrollLeft + dir * 300 } ); }
	renderVals() {
		const S = this.state;
		return {
			trackRef: this.trackRef,
			reviews: [ { text: 'Lovely cookies, would buy again.', name: 'Ann' }, { text: 'Soft and filling.', name: 'Bo' }, { text: 'A kind gift.', name: 'Cy' } ],
			tiles: [ { line: 'Gift box', price: '£20', href: '/a' }, { line: 'Card', price: '£10', href: '/b' } ],
			prev: () => ${ o.prev ?? 'this.step( -1 )' },
			next: () => this.step( 1 ),
			dots: [ 0, 1, 2 ].map( ( i ) => ( { go: () => { const tr = this.trackRef.current; tr && tr.scrollTo( { left: i * 300 } ); } } ) ),
			noop: () => this.setState( { other: 1 } ),
		};
	}
}`;
const slides = ( list = 'reviews', as = 'r', fields = [ 'text', 'name' ] ) => N( 'article', { loop: { list, as, copies: 3 } }, fields.map( ( f, i ) => N( 0 === i ? 'p' : 'b', { words: ( c ) => `${ f } ${ c }`, text: `${ as }.${ f }` } ) ) );
const sliderPage = ( o = {} ) => N( 'section', {}, [
	N( 'div', { style: 'display:flex' }, [ N( 'h2', { words: 'Loved by mums' } ), N( 'div', { style: 'display:flex' }, [ N( 'button', { click: o.prevClick ?? 'prev', attrs: { 'aria-label': 'Previous' }, words: '←' } ), N( 'button', { click: 'next', attrs: { 'aria-label': 'Next' }, words: '→' } ) ] ) ] ),
	N( 'div', { ref: o.ref === undefined ? 'trackRef' : o.ref, events: [ [ 'onPointerDown', 'x' ], [ 'onPointerMove', 'y' ] ] }, [ o.slides ?? slides() ] ),
	N( 'div', { style: 'display:flex' }, [ N( 'button', { loop: { list: 'dots', as: 'd', copies: 3 }, click: 'd.go', attrs: { 'aria-label': 'Go to slide' } } ) ] ),
] );

test( 'slider: a ref\'d track of loop copies that controls scroll is sgs/testimonial-slider when its slides hold a quote and an author; arrows, dots and their wrappers are absorbed; MUST FAIL without the entry', () => {
	const r = run( sliderPage(), SLIDER_LOGIC() );
	const track = row( r, 'Root/7#0' );
	assert.deepEqual( [ track.block, track.rule ], [ 'sgs/testimonial-slider', 'slider' ] );
	assert.deepEqual( track.attributes, { showArrows: true, showDots: true, autoplay: true, autoplaySpeed: 6000 }, 'arrows, dots and the timer\'s delay read from the code' );
	assert.equal( row( r, 'Root/4#0' ).action, 'absorbed', 'the arrows\' wrapper holds only controls' );
	assert.equal( row( r, 'Root/4#0' ).into, 'Root/7#0' );
	assert.equal( row( r, 'Root/3#0' ).action, null, 'the heading beside the arrows stays' );
	assert.equal( row( r, 'Root/11#0' ).action, 'absorbed', 'the dots\' wrapper' );
	assert.ok( [ 0, 1, 2 ].every( ( c ) => 'absorbed' === row( r, `Root/8#${ c }` ).action ), 'the slides are drawn by the slider (Fill writes them from the loop)' );
	const slider = find( r.skeleton, ( x ) => 'sgs/testimonial-slider' === x.name )[ 0 ];
	assert.deepEqual( slider.innerBlocks.map( ( k ) => [ k.name, k.draftRef ] ), [ 0, 1, 2 ].map( ( c ) => [ 'sgs/testimonial', { tpl: `Root/8#${ c }` } ] ), 'MUST FAIL: each slide is one child read at its own card, so the card\'s look is not lost' );
	assert.equal( find( r.skeleton, ( x ) => 'sgs/button' === x.name ).length, 0, 'MUST FAIL: no wordless control becomes a button' );
	const off = run( sliderPage(), SLIDER_LOGIC(), { off: [ 'slider' ] } );
	assert.notEqual( row( off, 'Root/7#0' ).block, 'sgs/testimonial-slider' );
	assert.equal( run( sliderPage(), SLIDER_LOGIC( { timer: '' } ) ).proposal.rows.find( ( x ) => 'Root/7#0' === x.key ).attributes.autoplay, false, 'no timer, no autoplay' );
} );

test( 'slider: slides no listed block takes keep their proposal; the track\'s row is a missing-features row and a proposal problem', () => {
	const r = run( sliderPage( { slides: N( 'a', { loop: { list: 'tiles', as: 't', copies: 3 }, attrs: { href: '#' } }, [ N( 'span', { words: ( c ) => `Tile ${ c }`, text: 't.line' } ), N( 'span', { words: '£20', text: 't.price' } ) ] ) } ), SLIDER_LOGIC() );
	const track = row( r, 'Root/7#0' );
	assert.notEqual( track.rule, 'slider' );
	assert.match( track.missingFeature, /no listed slider block takes/ );
	assert.ok( r.problems.some( ( p ) => /^Root\/7#0: a slider of 3 slides/.test( p ) ) );
	assert.equal( skeletonMissing( [ { ...track, candidates: track.candidates } ] ).length, 1, 'MUST FAIL: the missing-features list takes the row though it keeps a block' );
	assert.equal( row( r, 'Root/5#0' ).rule === 'slider', false, 'its controls are left as proposed' );
} );

test( 'NEGATIVE slider: controls that scroll nothing, and a track bound to no ref, are no slider', () => {
	const any = ( r ) => r.proposal.rows.some( ( x ) => 'slider' === x.rule );
	assert.equal( any( run( sliderPage(), SLIDER_LOGIC( { prev: "this.setState( { other: 2 } )", timer: '' } ).replace( 'next: () => this.step( 1 ),', 'next: () => this.setState( { other: 3 } ),' ).replace( 'tr && tr.scrollTo( { left: i * 300 } );', 'tr;' ) ) ), false, 'no control scrolls the track' );
	assert.equal( any( run( sliderPage( { ref: null } ), SLIDER_LOGIC() ) ), false, 'no ref' );
	const statics = sliderPage( { slides: N( 'div', {}, [ N( 'p', { words: 'One' } ) ] ) } );
	statics.kids[ 1 ].kids.push( N( 'figure', { words: 'Two' } ) );
	assert.equal( any( run( statics, SLIDER_LOGIC() ) ), false, 'children that are not copies of one loop hold no items to draw' );
} );

// A rail whose arrows find it by its class with a document query (Eye Care's review rail: revPrev / revNext run
// document.querySelector('.rev-rail').scrollBy), with no ref bound and no dots.
const RAIL_LOGIC = ( sel = '.rev-rail' ) => `class Component {
	state = { other: 0 };
	renderVals() {
		return {
			reviews: [ { text: 'Lovely cookies, would buy again.', name: 'Ann' }, { text: 'Soft and filling.', name: 'Bo' }, { text: 'A kind gift.', name: 'Cy' } ],
			prev: () => { const r = document.querySelector('${ sel }'); if (r) r.scrollBy({left: -712}); },
			next: () => { const r = document.querySelector('${ sel }'); if (r) r.scrollBy({left: 712}); },
		};
	}
}`;
const railPage = () => N( 'section', {}, [
	N( 'div', { attrs: { class: 'rev-rail' }, style: 'display:flex;overflow-x:auto' }, [ slides() ] ),
	N( 'div', { style: 'display:flex' }, [ N( 'button', { click: 'prev', attrs: { 'aria-label': 'Previous reviews' } } ), N( 'button', { click: 'next', attrs: { 'aria-label': 'More reviews' } } ) ] ),
] );

test( 'slider classTrack: a rail its arrows find by class with a document query and scroll is the slider; MUST FAIL without the entry', () => {
	const r = run( railPage(), RAIL_LOGIC() );
	const track = r.proposal.rows.find( ( x ) => 'slider' === x.rule && 'div' === x.tag );
	assert.ok( track, 'the rail is the slider' );
	assert.equal( track.block, 'sgs/testimonial-slider' );
	assert.equal( track.attributes.showArrows, true );
	assert.equal( run( railPage(), RAIL_LOGIC(), { off: [ 'slider.classTrack' ] } ).proposal.rows.some( ( x ) => 'slider' === x.rule ), false, 'without the entry a class track is no slider' );
} );

test( 'NEGATIVE slider classTrack: arrows that query and scroll another class leave the rail alone', () => {
	assert.equal( run( railPage(), RAIL_LOGIC( '.other-rail' ) ).proposal.rows.some( ( x ) => 'slider' === x.rule ), false );
} );

// ---- tabs fixtures ----
const TABS_LOGIC = ( o = {} ) => `class Component {
	state = { tab: 'a' };
	renderVals() {
		const S = this.state;
		return {
			pickA: () => this.setState( { tab: ${ o.a ?? "'a'" } } ),
			pickB: () => this.setState( { tab: 'b' } ),
			pickC: () => this.setState( { tab: 'c' } ),
			isA: S.tab === 'a',
		};
	}
}`;
const tabsPage = ( o = {} ) => N( 'section', {}, [ N( 'div', {}, [
	N( 'div', { style: 'display:flex' }, [ 'A', 'B', 'C' ].map( ( w ) => N( o.tag || 'button', { click: `pick${ w }`, words: `Tab ${ w }`, attrs: o.attrs || {} } ) ) ),
	N( 'div', { ifOn: '{{ isA }}' }, [ N( 'p', { words: 'Panel A' } ) ] ),
] ) ] );

test( 'tabs: sibling controls that each write one key to its own value, with a panel shown when the key has one of them, are sgs/tabs with a tab per control; MUST FAIL without the entry', () => {
	const r = run( tabsPage(), TABS_LOGIC() );
	assert.deepEqual( [ row( r, 'Root/2#0' ).block, row( r, 'Root/2#0' ).rule ], [ 'sgs/tabs', 'tabs' ] );
	assert.deepEqual( [ row( r, 'Root/3#0' ).action, row( r, 'Root/3#0' ).into ], [ 'absorbed', 'Root/2#0' ] );
	assert.deepEqual( [ row( r, 'Root/7#0' ).block, row( r, 'Root/7#0' ).attributes.label ], [ 'sgs/tab', 'Tab A' ] );
	const tabs = find( r.skeleton, ( x ) => 'sgs/tabs' === x.name )[ 0 ];
	assert.deepEqual( tabs.innerBlocks.map( ( x ) => [ x.name, x.attributes.label, x.innerBlocks.length ] ), [ [ 'sgs/tab', 'Tab A', 1 ], [ 'sgs/tab', 'Tab B', 0 ], [ 'sgs/tab', 'Tab C', 0 ] ], 'MUST FAIL: one tab per control, the shown panel in its own' );
	assert.deepEqual( handoverProblems( tabs.innerBlocks[ 1 ].handover, 'tab' ), [] );
	assert.equal( run( tabsPage(), TABS_LOGIC(), { off: [ 'tabs' ] } ).proposal.rows.some( ( x ) => 'tabs' === x.rule ), false );
} );

test( 'NEGATIVE tabs: a header surface, links with an address, and a toggle that reads its own key are not tabs', () => {
	const any = ( r ) => r.proposal.rows.some( ( x ) => 'tabs' === x.rule );
	assert.equal( any( run( tabsPage(), TABS_LOGIC(), { kind: 'header' } ) ), false, 'mega-menu panels and header controls have their own rules' );
	assert.equal( any( run( tabsPage( { tag: 'a', attrs: { href: '/route' } } ), TABS_LOGIC() ) ), false, 'route navigation' );
	assert.equal( any( run( tabsPage(), TABS_LOGIC( { a: "S.tab === 'a' ? null : 'a'" } ) ) ), false, 'a control that reads the key it writes is a toggle' );
	const loopTabs = ( write ) => run( N( 'section', {}, [ N( 'div', {}, [ N( 'div', {}, [ N( 'button', { loop: { list: 'picks', as: 'p', copies: 3 }, click: 'p.pick', words: ( c ) => `Tab ${ c }` } ) ] ), N( 'div', { ifOn: '{{ isFirst }}' }, [ N( 'p', { words: 'Panel 0' } ) ] ) ] ) ] ),
		`class Component { state = { tab: 0 }; renderVals() { const S = this.state; return { picks: [ 0, 1, 2 ].map( ( i ) => ( { pick: () => this.setState( { tab: ${ write } } ) } ) ), isFirst: S.tab === 0 }; } }` );
	assert.equal( any( loopTabs( 'i' ) ), true, 'a loop of controls each writing its own index is tabs' );
	assert.equal( any( loopTabs( 'S.tab === i ? -1 : i' ) ), false, 'a loop of toggles (each reads the key it writes) is not' );
} );

test( 'the decisions data names known blocks and settings they have for the widget rules', () => {
	const f = facts( REPO );
	assert.deepEqual( decisionsProblems( f ), [] );
	f.decisions.rules.accordion = { ...f.decisions.rules.accordion, settings: { ...f.decisions.rules.accordion.settings, title: 'nope' } };
	assert.ok( decisionsProblems( f ).some( ( p ) => /rules\.accordion\.settings\.title names nope/.test( p ) ), 'MUST FAIL: a setting the block lacks is refused' );
	const g = facts( REPO );
	const cs = g.decisions.rules.accordion.childSlots;
	g.decisions.rules.accordion = { ...g.decisions.rules.accordion, childSlots: { ...cs, resting: 'nope', parts: [ ...cs.parts, { part: 'lid', child: 'resting', setting: cs.parts[ 0 ].setting } ] } };
	const said = decisionsProblems( g ).join( '\n' );
	assert.match( said, /rules\.accordion\.childSlots\.resting names nope/, 'MUST FAIL: a child slot setting the accordion lacks is refused' );
	assert.match( said, /must name a part of row, header, icon, answer/, 'a part unitSlots cannot read is refused' );
} );

test( 'the logic reader resolves a field destructured from an array row (`([ cat, q, a ], i) => …`), so a closed item\'s answer is read from the data', () => {
	const idx = parseLogic( 'class C { renderVals() { return { faqs: [ [ "c1", "q1", "a1" ], [ "c2", "q2", "a2" ] ].map( ( [ c, qq, a ], i ) => ( { cat: c, a } ) ) }; } }' );
	const list = propRefs( idx, rootData( idx ), 'faqs' )[ 0 ];
	const items = elementsOf( idx, list );
	assert.deepEqual( items.map( ( it ) => propRefs( idx, [ it ], 'a' ).map( ( x ) => oneString( idx, x.node, x.env ) )[ 0 ] ), [ 'a1', 'a2' ], 'MUST FAIL: an array pattern\'s element is its position' );
	const id = idx.all.find( ( n ) => 'Identifier' === n.type && 'qq' === n.name && 'ArrayPattern' === idx.parent.get( n )?.type );
	assert.equal( resolveName( idx, id )?.key, '1' );
} );

test( 'listUnclaimed: an accordion-kind record whose roots lie inside rows absorbed into a block that draws its own summary part is not listed; one outside such a host still is; MUST FAIL on the old listing', async () => {
	const { listUnclaimed } = await import( '../lib/skeleton-widgets.mjs' );
	const byKey = { a: { key: 'a', parentKey: null }, b: { key: 'b', parentKey: 'a' }, c: { key: 'c', parentKey: 'b' }, z: { key: 'z', parentKey: null } };
	const rows = [ { key: 'a', action: null }, { key: 'b', action: 'absorbed', into: 'nav' }, { key: 'z', action: 'absorbed', into: 'plain' } ];
	const drawsDisclosure = ( k ) => 'nav' === k;
	const u = ( id, elements ) => ( { id, elements, line: `record ${ id }` } );
	// c has no row of its own (a panel closed at rest): its nearest ancestor with a row is b, absorbed into the navigation block.
	assert.deepEqual( listUnclaimed( { unclaimed: [ u( 'S-1', [ 'c' ] ), u( 'S-2', [ 'b', 'c' ] ) ], rows, byKey, drawsDisclosure } ), [] );
	// outside a navigation host: not absorbed (a), absorbed into a block with no summary part (z), no element at all, or one root
	// of two outside the host
	assert.deepEqual( listUnclaimed( { unclaimed: [ u( 'S-3', [ 'a' ] ), u( 'S-4', [ 'z' ] ), u( 'S-5', [] ), u( 'S-6', [ 'c', 'a' ] ) ], rows, byKey, drawsDisclosure } ), [ 'record S-3', 'record S-4', 'record S-5', 'record S-6' ] );
} );

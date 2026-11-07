// Refreshes a surface's pairs from what is saved and what the draft shows now, with no clone route: each saved block is paired with
// the draft element that has its block type's shape and its text, in document order, one block to one element. A block with no
// such element gets a named reason (the applier reports it as a coverage row), never a guess. Client-agnostic: block types are
// matched by family (heading, text, field), never by name or surface.
//   blocks:   [ { ref, block, attrs, parent } ] in the saved post's document order (scripts/local-wp/read-block-attrs.py; `parent` is
//             the nearest enclosing block's ref)
//   boxes:    { ref: { 1440: { x, w, h }, 375: ... } } the live blocks' boxes (lib/live-boxes.mjs), for the wrapper pass
//   elements: the draft inventory's elements in document order ( { key, parentKey, depth, tag, words, reveal? } ); an element
//             with `reveal` is shown only in that draft state (lib/skeleton-reveal.mjs), and its pair carries the same `reveal`
// Returns { pairs: { ref: { tpl, how, reveal?, part? } }, unpaired: { ref: reason }, structural: { ref: reason } }. A pair with
// `part: 'text'` shares its element with the wrapper block that holds it (lib/pair-wrappers.mjs); a `structural` block is one the
// draft draws no element for.
import { recId, revealId } from './reveal-merge.mjs';
import { norm, textOf } from './pair-text.mjs';
import { pairWrappers, confirmedByBox, liveBox, sameBox } from './pair-wrappers.mjs';

const CONTROL = new Set( [ 'input', 'select', 'textarea' ] );
const TEXTUAL = new Set( [ 'p', 'span', 'div', 'li', 'a', 'strong', 'em' ] );
const FIELD = /^sgs\/form-field-/;
const TITLE = new Set( [ 'button', 'summary', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div', 'a', 'strong' ] );

export { norm, textOf };

export function refreshPairs( { blocks, elements, old = {}, boxes = {} } ) {
	const pairs = {};
	const unpaired = {};
	const claimed = new Map();
	const index = new Map( elements.map( ( e, i ) => [ recId( e ), i ] ) );
	// A block that takes an element its wrapper block already holds shares it as a part (lib/pair-wrappers.mjs).
	const claim = ( ref, el, how ) => {
		const shared = claimed.has( recId( el ) );
		shared || claimed.set( recId( el ), ref );
		pairs[ ref ] = { tpl: el.key, how, ...( el.reveal ? { reveal: el.reveal } : {} ), ...( shared ? { part: 'text' } : {} ) };
	};
	const free = ( el ) => ! claimed.has( recId( el ) );
	const parentOf = new Map( blocks.map( ( b ) => [ b.ref, b.parent ] ) );
	const boxOf = new Map( blocks.map( ( b ) => [ b.ref, liveBox( boxes, b.ref ) ] ) );
	// An element an ancestor block holds is open to this text block when the block is a deeper node of it: its own box is not the
	// element's (a bare text node of a row), or it has none to compare.
	const sharedWith = ( el, ref ) => {
		const holder = claimed.get( recId( el ) );
		const lb = boxOf.get( ref );
		let a = parentOf.get( ref );
		for ( let n = 0; a && n < 60 && a !== holder; n++ ) {
			a = parentOf.get( a );
		}
		return !! holder && a === holder && ! ( lb && sameBox( el, lb ) );
	};
	let current = null;
	const openTo = ( el ) => free( el ) || sharedWith( el, current );
	// Whether two elements are shown in the same draft state (a key can name different elements in two states).
	const together = ( a, b ) => revealId( a.reveal ) === revealId( b.reveal );
	const last = {};
	// The first unclaimed element after the family's last match that `test` accepts (document order keeps repeated text in step).
	// When none follows (a layout that shows the same text a second time at another width or in a state lists it earlier), the first
	// unclaimed element anywhere that `test` accepts.
	const next = ( family, test, share = false ) => {
		const open = share ? openTo : free;
		return elements.find( ( e, i ) => i > ( last[ family ] ?? -1 ) && open( e ) && test( e ) ) ?? elements.find( ( e ) => open( e ) && test( e ) );
	};
	// A block whose old pair has the block's own box, or its own text and a near box, keeps it before any rule runs.
	const settled = confirmedByBox( { blocks, elements, old, boxes } );
	for ( const [ ref, el ] of Object.entries( settled ) ) {
		claim( ref, el, 'kept from the previous pairs: the draft element has its own box' );
	}
	for ( const { ref, block, attrs, parent } of blocks ) {
		if ( settled[ ref ] ) {
			continue;
		}
		const text = textOf( attrs );
		current = ref;
		if ( 'sgs/form' === block ) {
			// A form that tops its post is the surface's draft root; one inside a page is the draft's form element, or, when the draft
			// draws a plain wrapper (no form tag), the one the wrapper pass finds.
			const root = elements.find( ( e ) => 0 === e.depth ) ?? elements[ 0 ];
			const form = parent ? next( 'form', ( e ) => 'form' === e.tag ) : root;
			form ? claim( ref, form, parent ? 'the draft form element' : 'the draft root' ) : ( unpaired[ ref ] = 'sgs/form has no draft element of its own to pair by type and text' );
			continue;
		}
		let family = null;
		let hit = null;
		if ( 'sgs/heading' === block ) {
			family = 'heading';
			// A heading the draft draws as a styled div or span is paired when no heading element shows its text.
			hit = text && ( next( family, ( e ) => /^h[1-6]$/.test( e.tag ) && norm( e.words ) === text, true ) ?? next( family, ( e ) => TEXTUAL.has( e.tag ) && norm( e.words ) === text, true ) );
		} else if ( 'sgs/text' === block ) {
			family = 'text';
			hit = text && next( family, ( e ) => TEXTUAL.has( e.tag ) && norm( e.words ) === text, true );
		} else if ( 'sgs/accordion-item' === block ) {
			// The item is the draft's wrapper of the control that carries its title.
			family = 'item';
			hit = text && next( family, ( e ) => elements.some( ( c ) => c.parentKey === e.key && together( c, e ) && TITLE.has( c.tag ) && norm( c.words ) === text ) );
		} else if ( FIELD.test( block ) ) {
			family = 'field';
			const label = text && next( 'label', ( e ) => 'label' === e.tag && norm( e.words ) === text );
			if ( label ) {
				// The control sits in the label's own wrapper (before it for a floating label, after it otherwise), else follows it.
				const from = index.get( recId( label ) );
				const after = elements.slice( from + 1 );
				const stop = after.findIndex( ( e ) => 'label' === e.tag );
				const span = stop < 0 ? after : after.slice( 0, stop );
				hit = elements.find( ( e ) => e.parentKey === label.parentKey && together( e, label ) && free( e ) && CONTROL.has( e.tag ) ) ?? span.find( ( e ) => free( e ) && CONTROL.has( e.tag ) ) ?? elements.find( ( e ) => e.parentKey === label.parentKey && together( e, label ) && index.get( recId( e ) ) > from && free( e ) && 'label' !== e.tag );
				last.label = from;
			} else if ( text ) {
				// A group (tiles, a file drop) is titled by a plain text element, which is then its draft element.
				hit = next( 'group', ( e ) => TEXTUAL.has( e.tag ) && norm( e.words ) === text );
				hit && ( last.group = index.get( recId( hit ) ) );
			}
		}
		if ( ! family ) {
			unpaired[ ref ] = `${ block } has no draft element of its own to pair by type and text`;
		} else if ( ! text ) {
			unpaired[ ref ] = `${ block } has no text to pair by`;
		} else if ( hit ) {
			claim( ref, hit, `${ family } "${ text.slice( 0, 40 ) }"` );
			'field' !== family && ( last[ family ] = index.get( recId( hit ) ) );
		} else {
			unpaired[ ref ] = `no unclaimed draft ${ family } shows "${ text.slice( 0, 50 ) }" in any state the draft shows (or it is already paired)`;
		}
	}
	// A block the types cannot judge is given the element it draws by the text of its blocks and its box (lib/pair-wrappers.mjs).
	const todo = new Set( Object.keys( unpaired ).filter( ( ref ) => /has no draft element of its own/.test( unpaired[ ref ] ) ) );
	const found = pairWrappers( { blocks, elements, pairs, claimed: new Map( [ ...claimed ].map( ( [ id, ref ] ) => [ id, ref ] ) ), todo, boxes, old } );
	const structural = found.structural;
	for ( const [ ref, el ] of Object.entries( found.confirmed ) ) {
		claimed.set( recId( el ), ref );
		pairs[ ref ] = { tpl: el.key, how: 'kept from the previous pairs: the draft element has its own box' };
		delete unpaired[ ref ];
	}
	for ( const [ ref, { el, how } ] of Object.entries( found.take ) ) {
		claimed.set( recId( el ), ref );
		pairs[ ref ] = { tpl: el.key, how, ...( el.reveal ? { reveal: el.reveal } : {} ) };
		delete unpaired[ ref ];
	}
	found.part.forEach( ( ref ) => ( pairs[ ref ].part = 'text' ) );
	for ( const ref of Object.keys( structural ) ) {
		delete unpaired[ ref ];
	}
	for ( const [ ref, why ] of Object.entries( found.unresolved ) ) {
		unpaired[ ref ] = why;
	}
	// A block neither pass could judge keeps the pair it had, unless the element is now another block's: the draft element an old
	// pair names is evidence the box and text rules cannot outweigh, so a structural verdict stands only for a block with no old pair.
	// A block that names a text no unclaimed draft element shows loses its old pair: that pair was a guess (several blocks on one
	// element).
	for ( const [ ref, why ] of Object.entries( { ...structural, ...unpaired } ) ) {
		const was = old[ ref ];
		if ( was && ! /^no unclaimed draft/.test( why ) && ! claimed.has( was ) ) {
			claimed.set( was, ref );
			pairs[ ref ] = { tpl: was, how: 'kept from the previous pairs: the block has no text to pair by type' };
			delete unpaired[ ref ];
			delete structural[ ref ];
		}
	}
	return { pairs, unpaired, structural };
}

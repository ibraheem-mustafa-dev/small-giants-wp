// Refreshes a surface's pairs from what is saved and what the draft shows now, with no clone route: each saved block is paired with
// the draft element that has its block type's shape and its text, in document order, one block to one element. A block with no
// such element gets a named reason (the applier reports it as a coverage row), never a guess. Client-agnostic: block types are
// matched by family (heading, text, field), never by name or surface.
//   blocks:   [ { ref, block, attrs } ] in the saved post's document order (scripts/local-wp/read-block-attrs.py)
//   elements: the draft inventory's elements in document order ( { key, parentKey, depth, tag, words } )
// Returns { pairs: { ref: { tpl, how } }, unpaired: { ref: reason } }.

const CONTROL = new Set( [ 'input', 'select', 'textarea' ] );
const TEXTUAL = new Set( [ 'p', 'span', 'div', 'li', 'a', 'strong', 'em' ] );
const FIELD = /^sgs\/form-field-/;

export const norm = ( s ) => String( s ?? '' ).replace( /<[^>]*>/g, ' ' ).replace( /&amp;/g, '&' ).replace( /&#0?39;|&apos;/g, "'" ).replace( /[‘’]/g, "'" ).replace( /[“”]/g, '"' ).replace( /\s+/g, ' ' ).trim().toLowerCase();

// The text a saved block shows: the first of its text-bearing attributes that holds any.
export const textOf = ( attrs ) => {
	for ( const k of [ 'content', 'text', 'label', 'heading', 'title' ] ) {
		if ( 'string' === typeof attrs?.[ k ] && norm( attrs[ k ] ) ) {
			return norm( attrs[ k ] );
		}
	}
	return '';
};

export function refreshPairs( { blocks, elements, old = {} } ) {
	const pairs = {};
	const unpaired = {};
	const claimed = new Map();
	const index = new Map( elements.map( ( e, i ) => [ e.key, i ] ) );
	const claim = ( ref, el, how ) => {
		claimed.set( el.key, ref );
		pairs[ ref ] = { tpl: el.key, how };
	};
	const free = ( el ) => ! claimed.has( el.key );
	const last = {};
	// The first unclaimed element after the family's last match that `test` accepts (document order keeps repeated text in step).
	const next = ( family, test ) => elements.find( ( e, i ) => i > ( last[ family ] ?? -1 ) && free( e ) && test( e ) );
	for ( const { ref, block, attrs } of blocks ) {
		const text = textOf( attrs );
		if ( 'sgs/form' === block ) {
			const root = elements.find( ( e ) => 0 === e.depth ) ?? elements[ 0 ];
			root ? claim( ref, root, 'the draft root' ) : ( unpaired[ ref ] = 'the draft has no elements' );
			continue;
		}
		let family = null;
		let hit = null;
		if ( 'sgs/heading' === block ) {
			family = 'heading';
			hit = text && next( family, ( e ) => /^h[1-6]$/.test( e.tag ) && norm( e.words ) === text );
		} else if ( 'sgs/text' === block ) {
			family = 'text';
			hit = text && next( family, ( e ) => TEXTUAL.has( e.tag ) && norm( e.words ) === text );
		} else if ( FIELD.test( block ) ) {
			family = 'field';
			const label = text && next( 'label', ( e ) => 'label' === e.tag && norm( e.words ) === text );
			if ( label ) {
				// The control sits in the label's own wrapper (before it for a floating label, after it otherwise), else follows it.
				const from = index.get( label.key );
				const after = elements.slice( from + 1 );
				const stop = after.findIndex( ( e ) => 'label' === e.tag );
				const span = stop < 0 ? after : after.slice( 0, stop );
				hit = elements.find( ( e ) => e.parentKey === label.parentKey && free( e ) && CONTROL.has( e.tag ) ) ?? span.find( ( e ) => free( e ) && CONTROL.has( e.tag ) ) ?? elements.find( ( e ) => e.parentKey === label.parentKey && index.get( e.key ) > from && free( e ) && 'label' !== e.tag );
				last.label = from;
			} else if ( text ) {
				// A group (tiles, a file drop) is titled by a plain text element, which is then its draft element.
				hit = next( 'group', ( e ) => TEXTUAL.has( e.tag ) && norm( e.words ) === text );
				hit && ( last.group = index.get( hit.key ) );
			}
		}
		if ( ! family ) {
			unpaired[ ref ] = `${ block } has no draft element of its own to pair by type and text`;
		} else if ( ! text ) {
			unpaired[ ref ] = `${ block } has no text to pair by`;
		} else if ( hit ) {
			claim( ref, hit, `${ family } "${ text.slice( 0, 40 ) }"` );
			'field' !== family && ( last[ family ] = index.get( hit.key ) );
		} else {
			unpaired[ ref ] = `no unclaimed draft ${ family } shows "${ text.slice( 0, 50 ) }" at rest (a state the draft does not render, or it is already paired)`;
		}
	}
	// A block the types cannot judge keeps the pair it had, unless the element is now another block's. A block that names a text no
	// unclaimed draft element shows loses its old pair: that pair was a guess (several blocks on one element).
	for ( const [ ref, why ] of Object.entries( unpaired ) ) {
		const was = old[ ref ];
		if ( was && ! /^no unclaimed draft/.test( why ) && ! claimed.has( was ) ) {
			claimed.set( was, ref );
			pairs[ ref ] = { tpl: was, how: 'kept from the previous pairs: the block has no text to pair by type' };
			delete unpaired[ ref ];
		}
	}
	return { pairs, unpaired };
}

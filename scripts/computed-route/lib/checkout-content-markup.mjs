// The checkout page's saved block markup, read and written without losing a byte (Spec 48 FR-48-55, the checkout content step
// lib/site-build-checkout-content.mjs). WooCommerce's Checkout block keeps its words, steps and extra blocks in the page's own
// content, as nested block comments around the inner blocks' saved HTML. The step changes a few settings and moves a few
// blocks, so the markup is held as WordPress's own parser holds it: each block its opening comment, its parsed settings and its
// `inner` list (the HTML strings between its children, and the children), so every block the step does not touch is written
// back exactly as it was read, and a block whose settings change gets its opening comment written as WordPress's
// serialize_block_attributes writes it.
// Pure: text in, text out.

const OPENER = /<!--\s+(\/)?wp:([a-z][a-z0-9_-]*(?:\/[a-z][a-z0-9_-]*)?)\s+(\{(?:[^}]|\}+(?=\})|\}(?!\s+\/?-->))*\}\s+)?(\/)?-->/g;
const fullName = ( name ) => ( name.includes( '/' ) ? name : `core/${ name }` );

// Markup to { inner: [ string | block ] }, a block being { name, attrs, raw (its opening comment as read), close (its closing
// comment, '' for a self-closing block), inner, changed (false) }. Throws on markup whose comments do not nest.
export function parseContent( text ) {
	const root = { inner: [] };
	const stack = [ root ];
	let last = 0;
	const src = String( text ?? '' );
	for ( const m of src.matchAll( OPENER ) ) {
		const top = stack[ stack.length - 1 ];
		m.index > last && top.inner.push( src.slice( last, m.index ) );
		last = m.index + m[ 0 ].length;
		const name = fullName( m[ 2 ] );
		if ( m[ 1 ] ) {
			if ( stack.length < 2 || top.name !== name ) {
				throw new Error( `block markup closes ${ name } where ${ top.name || 'nothing' } is open` );
			}
			top.close = m[ 0 ];
			stack.pop();
			continue;
		}
		const block = { name, attrs: m[ 3 ] ? JSON.parse( m[ 3 ].trim() ) : {}, raw: m[ 0 ], close: '', inner: [], changed: false };
		top.inner.push( block );
		m[ 4 ] || stack.push( block );
	}
	if ( stack.length > 1 ) {
		throw new Error( `block markup leaves ${ stack[ stack.length - 1 ].name } open` );
	}
	last < src.length && root.inner.push( src.slice( last ) );
	return root;
}

// WordPress's serialize_block_attributes: JSON with slashes and unicode unescaped, then `--`, `<`, `>`, `&` and an escaped
// quote written as unicode escapes, so the settings can never close the comment.
export const serializeAttrs = ( attrs ) => JSON.stringify( attrs ).replace( /--/g, '\\u002d\\u002d' ).replace( /</g, '\\u003c' ).replace( />/g, '\\u003e' ).replace( /&/g, '\\u0026' ).replace( /\\"/g, '\\u0022' );

const shortName = ( name ) => ( name.startsWith( 'core/' ) ? name.slice( 5 ) : name );

// A block's opening comment for its current settings (WordPress's get_comment_delimited_block_content).
function opener( b, selfClosing ) {
	const json = Object.keys( b.attrs ).length ? `${ serializeAttrs( b.attrs ) } ` : '';
	return `<!-- wp:${ shortName( b.name ) } ${ json }${ selfClosing ? '/-->' : '-->' }`;
}

// The tree back to markup: an untouched block exactly as read, a changed or new one with its opening comment rebuilt.
export function serializeContent( tree ) {
	const out = ( list ) => list.map( ( x ) => ( 'string' === typeof x ? x : block( x ) ) ).join( '' );
	const block = ( b ) => {
		const selfClosing = ! b.close && ! b.inner.length;
		const head = b.changed || ! b.raw ? opener( b, selfClosing ) : b.raw;
		return selfClosing ? head : `${ head }${ out( b.inner ) }${ b.close || `<!-- /wp:${ shortName( b.name ) } -->` }`;
	};
	return out( tree.inner );
}

// Every block of the tree, depth-first, each with its parent: [ { block, parent } ].
export function blocksOf( tree ) {
	const out = [];
	const go = ( node ) => node.inner.forEach( ( x ) => {
		if ( 'string' !== typeof x ) {
			out.push( { block: x, parent: node } );
			go( x );
		}
	} );
	go( tree );
	return out;
}

// The first block named `name` under `node` (itself excluded), or null.
export const findBlock = ( node, name ) => blocksOf( node ).find( ( x ) => x.block.name === name ) || null;

// A new self-closing block (a dynamic block whose markup is its comment alone).
export const newBlock = ( name, attrs = {} ) => ( { name, attrs: { ...attrs }, raw: '', close: '', inner: [], changed: true } );

// Puts `block` into `parent.inner` beside the child `anchor` (after it, or before it when `before`), or last when no anchor,
// separated by a blank line as WordPress's editor writes sibling blocks.
export function insertBlock( parent, block, { anchor = null, before = false } = {} ) {
	const blocks = parent.inner.filter( ( x ) => 'string' !== typeof x );
	if ( anchor && parent.inner.includes( anchor ) ) {
		const at = parent.inner.indexOf( anchor );
		parent.inner.splice( before ? at : at + 1, 0, ...( before ? [ block, '\n\n' ] : [ '\n\n', block ] ) );
		return;
	}
	const lastBlock = blocks[ blocks.length - 1 ];
	if ( lastBlock ) {
		parent.inner.splice( parent.inner.indexOf( lastBlock ) + 1, 0, '\n\n', block );
	} else {
		// An empty container: the block goes between its opening and closing HTML.
		const at = parent.inner.length ? 1 : 0;
		parent.inner.splice( at, 0, block );
	}
}

// Takes `block` out of `parent.inner` with the blank line that separated it from a sibling.
export function removeBlock( parent, block ) {
	const at = parent.inner.indexOf( block );
	if ( at < 0 ) {
		return;
	}
	const blank = ( i ) => 'string' === typeof parent.inner[ i ] && ! parent.inner[ i ].trim();
	if ( blank( at - 1 ) && 'string' !== typeof parent.inner[ at - 2 ] && undefined !== parent.inner[ at - 2 ] ) {
		parent.inner.splice( at - 1, 2 );
	} else if ( blank( at + 1 ) ) {
		parent.inner.splice( at, 2 );
	} else {
		parent.inner.splice( at, 1 );
	}
}

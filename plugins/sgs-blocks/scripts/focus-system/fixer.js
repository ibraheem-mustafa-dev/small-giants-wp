'use strict';

/**
 * The --fix transform for check-focus-system.js. Deletes `bespoke`, `suppress` and
 * `radius-on-focus` declarations from CSS and SCSS, then drops any rule or at-rule the deletion
 * left empty (a rule that was already empty is left alone). A comment directly above a dropped
 * node is never deleted: it is reported so the implementer deletes it by hand. A `hover-outline`
 * declaration is never deleted either (that would delete the hover effect): it is returned in
 * `handEdits` for the implementer to split by hand.
 *
 * Edits are byte ranges cut from the original text (each node's source offsets plus the
 * whitespace before it), never a re-stringified AST, so every untouched byte is preserved
 * (postcss's stringifier rewrites some comment text, e.g. `<style>` inside a comment).
 *
 * Pure function of the text: running it on its own output changes nothing.
 *
 * @package SGS\Blocks
 */

const { analyseCss, FIXABLE } = require( './classify-css.js' );
const { norm } = require( './selector.js' );

function describe( node ) {
	if ( 'rule' === node.type ) {
		return norm( node.selector );
	}
	if ( 'atrule' === node.type ) {
		return norm( `@${ node.name } ${ node.params }` );
	}
	return node.type;
}

/** The node's byte range in the original text: the whitespace before it through its end. */
function rangeOf( node ) {
	const before = ( node.raws && 'string' === typeof node.raws.before ) ? node.raws.before.length : 0;
	return [ node.source.start.offset - before, node.source.end.offset ];
}

/** Drop `node` and walk upward while each parent is left empty; collect the dropped nodes. */
function dropEmpty( node, rel, dropped, notes ) {
	let cur = node;
	while ( cur && cur.parent && ( 'rule' === cur.type || 'atrule' === cur.type ) && cur.nodes && 0 === cur.nodes.length ) {
		const parent = cur.parent;
		const prev = cur.prev();
		if ( prev && 'comment' === prev.type ) {
			notes.push( { path: rel, comment: norm( prev.text ).slice( 0, 120 ), above: describe( cur ) } );
		}
		dropped.push( cur );
		cur.remove();
		cur = parent;
	}
}

/** Keep the outermost of nested ranges and cut them from the text, last first. */
function cut( text, ranges ) {
	const sorted = ranges.slice().sort( ( a, b ) => a[ 0 ] - b[ 0 ] || b[ 1 ] - a[ 1 ] );
	const outer = [];
	for ( const r of sorted ) {
		const last = outer[ outer.length - 1 ];
		if ( last && r[ 0 ] >= last[ 0 ] && r[ 1 ] <= last[ 1 ] ) {
			continue;
		}
		outer.push( r );
	}
	let out = text;
	for ( let i = outer.length - 1; i >= 0; i-- ) {
		out = out.slice( 0, outer[ i ][ 0 ] ) + out.slice( outer[ i ][ 1 ] );
	}
	return out;
}

/**
 * @param {string} text
 * @param {string} rel
 * @param {{ allow?: Array, filter?: (finding: Object) => boolean }} opts
 * @returns {{ text: string, removed: number, orphanComments: Array<{path:string,comment:string,above:string}>, handEdits: Array<{path:string,selector:string,prop:string}> }}
 */
function fixText( text, rel, opts ) {
	if ( ! /\.s?css$/.test( rel ) ) {
		return { text, removed: 0, orphanComments: [], handEdits: [] };
	}
	const { findings } = analyseCss( text, rel, opts || {} );
	const filter = ( opts && opts.filter ) || ( () => true );
	const handEdits = findings.filter( ( f ) => 'hover-outline' === f.category && filter( f ) ).map( ( f ) => ( { path: rel, selector: f.selector, prop: f.prop } ) );
	const targets = findings.filter( ( f ) => FIXABLE.has( f.category ) && f.node && filter( f ) );
	if ( 0 === targets.length ) {
		return { text, removed: 0, orphanComments: [], handEdits };
	}
	const ranges = targets.map( ( f ) => rangeOf( f.node ) );
	const touched = new Set();
	for ( const f of targets ) {
		touched.add( f.node.parent );
		f.node.remove();
	}
	const dropped = [];
	const notes = [];
	for ( const parent of touched ) {
		dropEmpty( parent, rel, dropped, notes );
	}
	ranges.push( ...dropped.map( rangeOf ) );
	return { text: cut( text, ranges ), removed: targets.length, orphanComments: notes, handEdits };
}

module.exports = { fixText };

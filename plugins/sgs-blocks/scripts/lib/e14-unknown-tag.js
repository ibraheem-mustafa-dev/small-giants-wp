'use strict';

/**
 * E14: a bare tag in a declaring selector (`.x figcaption`) against an element
 * whose tag name the markup builds at run time (`<%1$s class="x__cap">`).
 *
 * The markup model reads such an element as tag `*` with its class. A bare
 * `figcaption` can be that element only when the block's own PHP offers
 * `figcaption` as a value the tag can take, so the evidence is a quoted
 * literal, in a value position, in the file that built the element. A tag the
 * PHP never offers stays unresolved.
 */

const escapeRe = ( s ) => s.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );

/**
 * Does `src` offer `tag` as a value a variable can take? That is a whole quoted
 * string inside an array literal (`array( 'figcaption', 'div' )`, `[ 'h2' ]`) or
 * as the branch of a ternary or `??` (`? $raw : 'figcaption'`). A plain
 * assignment (`$wrap = 'div'`), a comparison or a call argument is not evidence:
 * it names the tag for some other element.
 */
function namesTagAsValue( tag, src ) {
	const quoted   = String.raw`(['"])${ escapeRe( tag.toLowerCase() ) }\1`;
	const asBranch = new RegExp( String.raw`(?:\?\?|\?|:)\s*${ quoted }(?!\s*=>)`, 'i' );
	if ( asBranch.test( src.replace( /::/g, ' ' ) ) ) {
		return true;
	}
	const inArray = new RegExp( quoted, 'i' );
	for ( const m of src.matchAll( /\barray\s*\(([^()]*)\)|\[([^[\]]*)\]/g ) ) {
		if ( inArray.test( m[ 1 ] || m[ 2 ] || '' ) ) {
			return true;
		}
	}
	return false;
}

/**
 * @param {string}      tag  The bare tag of the declaring compound.
 * @param {Object}      inst A markup instance ({ tag, fileIdx }).
 * @param {Object[]}    files The block's PHP files ({ src }), indexed by `inst.fileIdx`.
 * @return {boolean}
 */
function bareTagMatchesUnknownTag( tag, inst, files ) {
	if ( ! tag || '*' !== inst.tag ) {
		return false;
	}
	const file = files[ inst.fileIdx ];
	return !! file && namesTagAsValue( tag, file.src );
}

module.exports = { bareTagMatchesUnknownTag, namesTagAsValue };

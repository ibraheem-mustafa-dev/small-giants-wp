'use strict';

/**
 * E14: a bare tag in a declaring selector (`.x figcaption`) against an element
 * whose tag name the markup builds at run time (`<%1$s class="x__cap">`).
 *
 * The markup model reads such an element as tag `*` with its class. A bare
 * `figcaption` can be that element only when the block's own PHP names
 * `figcaption` as a quoted value (an allow-list array, a ternary branch, a
 * default), so the evidence is a quoted literal in the file that built the
 * element. A tag the PHP never names stays unresolved.
 */

/** Does `src` hold `tag` as a whole quoted PHP string literal? */
function namesTagAsValue( tag, src ) {
	const name = tag.toLowerCase();
	return new RegExp( `(['"])${ name.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) }\\1`, 'i' ).test( src );
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

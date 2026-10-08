'use strict';

/**
 * E14: a control whose element no PHP markup emits because front-end JS builds
 * it (`const time = el( 'span', 'sgs-x__time', '0:00' );`).
 *
 * The gate cannot place such an element, so it cannot say whether a PHP-built
 * element sits inside it. A leaf element can hold nothing: the class is given
 * to the element in a creation call and the script never adds a child to the
 * variable that holds it. Then no PHP element is its descendant, and it is
 * nobody's ancestor.
 */

const escapeRe = ( s ) => s.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );

/** A call that gives the new element its class: `el( 'tag', 'a b c'`. */
const CREATE_RE = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*el\(\s*'[a-z][\w-]*'\s*,\s*'([^']*)'/g;

/** A way for a variable's element to gain children. */
const addsChildren = ( name ) => new RegExp(
	`\\b${ escapeRe( name ) }\\s*\\.\\s*(?:append|appendChild|prepend|insertBefore|replaceChildren|replaceWith|innerHTML|outerHTML|insertAdjacent\\w*)\\b`
);

/**
 * @param {string}   cls        A class name.
 * @param {string[]} jsSources  The block's front-end JS sources (not edit.js, not tests).
 * @return {boolean} True when some source creates an element with `cls` and never gives it a child.
 */
function isJsLeafClass( cls, jsSources ) {
	let created = false;
	for ( const src of jsSources ) {
		for ( const m of src.matchAll( CREATE_RE ) ) {
			if ( ! m[ 2 ].split( /\s+/ ).includes( cls ) ) {
				continue;
			}
			if ( addsChildren( m[ 1 ] ).test( src ) ) {
				return false;
			}
			created = true;
		}
	}
	return created;
}

module.exports = { isJsLeafClass };

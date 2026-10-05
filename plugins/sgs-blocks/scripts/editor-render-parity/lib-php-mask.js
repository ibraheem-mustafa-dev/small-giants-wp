/**
 * PHP source masks (strings, comments) and bracket matching.
 */

'use strict';

// ---------------------------------------------------------------------------
// Exemption signal shared plumbing — string-aware brace/paren matching
// ---------------------------------------------------------------------------

/**
 * Build a same-length boolean mask marking every position inside a PHP
 * single- or double-quoted string literal. render.php builds CSS via PHP
 * string concatenation, and that CSS text has its OWN `{`/`}` — a naive
 * brace counter over the raw source would get corrupted by those. Masked
 * positions are skipped by findMatchingParen()/findMatchingBrace() so only
 * REAL PHP control-flow braces/parens are counted. Heredoc/nowdoc is not
 * masked (grepped 2026-08-13 — zero render.php in this tree uses `<<<`).
 *
 * @param {string} src PHP source.
 * @return {Array<boolean>} inString[i] === true when position i is inside a quoted PHP string.
 */
function buildStringMask( src ) {
	const inStr = new Array( src.length ).fill( false );
	let state = 'code';
	for ( let i = 0; i < src.length; i++ ) {
		const c = src[ i ];
		if ( state === 'code' ) {
			if ( c === "'" ) {
				inStr[ i ] = true;
				state = 'squote';
			} else if ( c === '"' ) {
				inStr[ i ] = true;
				state = 'dquote';
			} else if ( c === '/' && src[ i + 1 ] === '/' ) {
				// `//` line comment — an apostrophe in prose ("ACCORDION'S OWN")
				// must NOT be mistaken for the start of a real PHP string, or
				// every subsequent quote/brace in the file desyncs. Mask the
				// whole comment (through end of line) as non-code, same as a
				// real string — it must never contribute a real brace/paren.
				while ( i < src.length && src[ i ] !== '\n' ) {
					inStr[ i ] = true;
					i++;
				}
			} else if ( c === '#' && src[ i + 1 ] !== '[' ) {
				// `#` line comment (not a PHP 8 `#[Attribute]`, which this
				// codebase doesn't use in render.php but is excluded defensively).
				while ( i < src.length && src[ i ] !== '\n' ) {
					inStr[ i ] = true;
					i++;
				}
			} else if ( c === '/' && src[ i + 1 ] === '*' ) {
				// `/* ... */` block/doc comment — same reasoning as `//` above.
				inStr[ i ] = true;
				inStr[ i + 1 ] = true;
				i += 2;
				while ( i < src.length && ! ( src[ i ] === '*' && src[ i + 1 ] === '/' ) ) {
					inStr[ i ] = true;
					i++;
				}
				if ( i < src.length ) {
					inStr[ i ] = true;
					if ( i + 1 < src.length ) {
						inStr[ i + 1 ] = true;
					}
					i++;
				}
			}
			continue;
		}
		inStr[ i ] = true;
		if ( c === '\\' && i + 1 < src.length ) {
			inStr[ i + 1 ] = true;
			i++;
			continue;
		}
		if ( state === 'squote' && c === "'" ) {
			state = 'code';
		} else if ( state === 'dquote' && c === '"' ) {
			state = 'code';
		}
	}
	return inStr;
}

/**
 * Build a same-length boolean mask marking ONLY comment spans (`//`, `#`,
 * `/* *&#47;`) — deliberately NOT quoted-string content, unlike
 * buildStringMask() above (which masks strings AND comments together for
 * its own brace-counting purpose). A bare `\$var\b` regex scan for usage
 * offsets (collectAttrUsageOffsets()) needs to exclude a variable NAME
 * merely MENTIONED in a comment ("`$aria_str` built with esc_attr()") while
 * still counting a variable genuinely INTERPOLATED inside a double-quoted
 * PHP string (`"...{$var}..."` — the very shape classifyCssDeclarationSink()
 * exists to classify) as a real usage site. buildStringMask() masks BOTH
 * cases identically, so it cannot make that distinction — this sibling mask
 * can. Real regression this fixed (2026-08-13, caught by this file's own
 * SIGNAL 1 negative-control self-test): naively using buildStringMask()'s
 * mask to skip "masked" offsets wrongly skipped the negative fixture's real
 * `{$icon_aria_label}` CSS-interpolation paint site along with the intended
 * comment-only exclusion, exempting an attribute that should have stayed
 * flagged.
 *
 * @param {string} src PHP source.
 * @return {Array<boolean>} commentMask[i] === true when position i is inside a `//`/`#`/`/* *&#47;` comment.
 */
function buildCommentMask( src ) {
	const mask = new Array( src.length ).fill( false );
	let inSquote = false;
	let inDquote = false;
	for ( let i = 0; i < src.length; i++ ) {
		const c = src[ i ];
		if ( inSquote ) {
			if ( c === '\\' && i + 1 < src.length ) {
				i++;
				continue;
			}
			if ( c === "'" ) {
				inSquote = false;
			}
			continue;
		}
		if ( inDquote ) {
			if ( c === '\\' && i + 1 < src.length ) {
				i++;
				continue;
			}
			if ( c === '"' ) {
				inDquote = false;
			}
			continue;
		}
		if ( c === "'" ) {
			inSquote = true;
			continue;
		}
		if ( c === '"' ) {
			inDquote = true;
			continue;
		}
		if ( c === '/' && src[ i + 1 ] === '/' ) {
			while ( i < src.length && src[ i ] !== '\n' ) {
				mask[ i ] = true;
				i++;
			}
			continue;
		}
		if ( c === '#' && src[ i + 1 ] !== '[' ) {
			while ( i < src.length && src[ i ] !== '\n' ) {
				mask[ i ] = true;
				i++;
			}
			continue;
		}
		if ( c === '/' && src[ i + 1 ] === '*' ) {
			mask[ i ] = true;
			mask[ i + 1 ] = true;
			i += 2;
			while ( i < src.length && ! ( src[ i ] === '*' && src[ i + 1 ] === '/' ) ) {
				mask[ i ] = true;
				i++;
			}
			if ( i < src.length ) {
				mask[ i ] = true;
				if ( i + 1 < src.length ) {
					mask[ i + 1 ] = true;
				}
				i++;
			}
			continue;
		}
	}
	return mask;
}

/**
 * String-aware forward paren match: given the index of an opening `(`,
 * return the index of its matching `)`, skipping any `(`/`)` inside a
 * masked (quoted-string) position.
 *
 * @param {string}          src    Source text.
 * @param {Array<boolean>}  mask   From buildStringMask().
 * @param {number}          openIdx Index of the opening `(`.
 * @return {number} Index of the matching `)`, or -1.
 */
function findMatchingParen( src, mask, openIdx ) {
	let depth = 0;
	for ( let i = openIdx; i < src.length; i++ ) {
		if ( mask[ i ] ) {
			continue;
		}
		if ( src[ i ] === '(' ) {
			depth++;
		} else if ( src[ i ] === ')' ) {
			depth--;
			if ( depth === 0 ) {
				return i;
			}
		}
	}
	return -1;
}

/**
 * String-aware forward brace match — same shape as findMatchingParen() but
 * for `{`/`}`.
 *
 * @param {string}          src     Source text.
 * @param {Array<boolean>}  mask    From buildStringMask().
 * @param {number}          openIdx Index of the opening `{`.
 * @return {number} Index of the matching `}`, or -1.
 */
function findMatchingBrace( src, mask, openIdx ) {
	let depth = 0;
	for ( let i = openIdx; i < src.length; i++ ) {
		if ( mask[ i ] ) {
			continue;
		}
		if ( src[ i ] === '{' ) {
			depth++;
		} else if ( src[ i ] === '}' ) {
			depth--;
			if ( depth === 0 ) {
				return i;
			}
		}
	}
	return -1;
}

/**
 * Find the start offset of the contiguous quoted-PHP-string region ending
 * immediately before `offset` (i.e. `offset` sits inside a PHP string
 * literal that starts there), or null if `offset` is not inside a string at
 * all. CSS text only ever exists as PHP string CONTENT in this codebase, so
 * every CSS-declaration/selector scan below is clamped to this boundary —
 * without it, a scan can walk backward straight through the string's own
 * opening quote into REAL PHP CODE (a `//`/`/* *&#47; comment with a stray `:`
 * like `// phpcs:enable ...`, a switch `case 'x':`, a ternary `? 'a' : 'b'`)
 * and misread an unrelated colon as a CSS property separator. Real bug hit
 * live 2026-08-13: sgs/accordion's `if ( $faq_schema ...)` sits right after
 * a `// phpcs:enable WordPress...` comment line, and an unclamped scan read
 * that comment's colon as if it were `phpcs:enable-the-property`.
 *
 * @param {Array<boolean>} mask   From buildStringMask().
 * @param {number}         offset Usage-site offset.
 * @return {number|null}
 */
function findEnclosingStringStart( mask, offset ) {
	if ( offset === 0 || ! mask[ offset - 1 ] ) {
		return null;
	}
	let i = offset - 1;
	while ( i > 0 && mask[ i - 1 ] ) {
		i--;
	}
	return i;
}

module.exports = {
	buildCommentMask,
	buildStringMask,
	findEnclosingStringStart,
	findMatchingBrace,
	findMatchingParen,
};

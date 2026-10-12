/**
 * The editor's copy of `includes/class-custom-css-scoper.php::Custom_Css_Scoper` (Spec 32 FR-32-20).
 *
 * Parses a block's `sgsCustomCss` and confines every rule to the block instance: `&selector` (or the
 * CSS-nesting `&`) becomes the scope, any other selector becomes a descendant of it, a bare declaration
 * applies to the block, and `@media` / `@supports` / `@container` / `@layer` are walked. Every other
 * at-rule, a nested rule, a script-capable value and any `<` are refused; malformed input refuses all.
 *
 * Both copies run `tests/shared/custom-css-scope-cases.json`, so the canvas and the page scope a rule
 * identically. Change the two together.
 */

const NESTING_AT_RULES = [ 'media', 'supports', 'container', 'layer' ];
const UNSAFE_BODY =
	/expression\s*\(|javascript\s*:|vbscript\s*:|behavior\s*:|-moz-binding/i;

/**
 * Trim CSS whitespace (the PHP copy's `trim( $s, " \t\n\r\f" )`).
 *
 * @param {string} text Text.
 * @return {string} Trimmed text.
 */
function trimWs( text ) {
	return text.replace( /^[ \t\n\r\f]+|[ \t\n\r\f]+$/g, '' );
}

/**
 * Collapse whitespace runs to one space and trim.
 *
 * @param {string} text Text.
 * @return {string} Squashed text.
 */
function squash( text ) {
	return trimWs( text.replace( /[ \t\n\r\f]+/g, ' ' ) );
}

/**
 * Trim whitespace and trailing semicolons (the PHP copy's `trim_semicolon`).
 *
 * @param {string} text Declarations.
 * @return {string} Trimmed declarations.
 */
function trimSemicolon( text ) {
	return trimWs( trimWs( text ).replace( /[; ]+$/, '' ) );
}

/**
 * Remove comments outside strings.
 *
 * @param {string} css Raw CSS.
 * @return {string|null} CSS without comments, or null for an unterminated comment.
 */
function stripComments( css ) {
	let out = '';
	let quote = '';
	for ( let i = 0; i < css.length; i++ ) {
		const c = css[ i ];
		if ( quote ) {
			out += c;
			if ( c === '\\' && i + 1 < css.length ) {
				out += css[ ++i ];
			} else if ( c === quote ) {
				quote = '';
			}
			continue;
		}
		if ( c === '"' || c === "'" ) {
			quote = c;
			out += c;
			continue;
		}
		if ( c === '/' && css[ i + 1 ] === '*' ) {
			const end = css.indexOf( '*/', i + 2 );
			if ( end === -1 ) {
				return null;
			}
			i = end + 1;
			continue;
		}
		out += c;
	}
	return out;
}

/**
 * Read up to the next `{`, `;` or `}` at bracket depth 0, outside strings.
 *
 * @param {string}        css   CSS without comments.
 * @param {{pos: number}} state Read position, advanced to the stop character.
 * @return {Array|null} [text, stop character or ''], or null for an unterminated string.
 */
function readUntilStop( css, state ) {
	const start = state.pos;
	let depth = 0;
	let quote = '';
	for ( ; state.pos < css.length; state.pos++ ) {
		const c = css[ state.pos ];
		if ( quote ) {
			if ( c === '\\' ) {
				state.pos++;
			} else if ( c === quote ) {
				quote = '';
			}
			continue;
		}
		if ( c === '"' || c === "'" ) {
			quote = c;
		} else if ( c === '(' || c === '[' ) {
			depth++;
		} else if ( ( c === ')' || c === ']' ) && depth > 0 ) {
			depth--;
		} else if ( depth === 0 && ( c === '{' || c === ';' || c === '}' ) ) {
			return [ css.slice( start, state.pos ), c ];
		}
	}
	if ( quote ) {
		return null;
	}
	return [ css.slice( start ), '' ];
}

/**
 * Read a rule body to its closing `}`.
 *
 * @param {string}        css   CSS without comments.
 * @param {{pos: number}} state Position after `{`; advanced past the closing `}`.
 * @return {Array|null} [body, has a nested block], or null when unbalanced.
 */
function readBody( css, state ) {
	const start = state.pos;
	let depth = 1;
	let quote = '';
	let nested = false;
	for ( ; state.pos < css.length; state.pos++ ) {
		const c = css[ state.pos ];
		if ( quote ) {
			if ( c === '\\' ) {
				state.pos++;
			} else if ( c === quote ) {
				quote = '';
			}
			continue;
		}
		if ( c === '"' || c === "'" ) {
			quote = c;
		} else if ( c === '{' ) {
			depth++;
			nested = true;
		} else if ( c === '}' ) {
			depth--;
			if ( depth === 0 ) {
				const body = css.slice( start, state.pos );
				state.pos++;
				return [ body, nested ];
			}
		}
	}
	return null;
}

/**
 * Split on a separator at bracket depth 0, outside strings.
 *
 * @param {string} text Text.
 * @param {string} sep  One-character separator.
 * @return {string[]} Parts.
 */
function splitTopLevel( text, sep ) {
	const parts = [];
	let cur = '';
	let depth = 0;
	let quote = '';
	for ( let i = 0; i < text.length; i++ ) {
		const c = text[ i ];
		if ( quote ) {
			cur += c;
			if ( c === '\\' && i + 1 < text.length ) {
				cur += text[ ++i ];
			} else if ( c === quote ) {
				quote = '';
			}
			continue;
		}
		if ( c === '"' || c === "'" ) {
			quote = c;
		} else if ( c === '(' || c === '[' ) {
			depth++;
		} else if ( ( c === ')' || c === ']' ) && depth > 0 ) {
			depth--;
		} else if ( c === sep && depth === 0 ) {
			parts.push( cur );
			cur = '';
			continue;
		}
		cur += c;
	}
	parts.push( cur );
	return parts;
}

/**
 * Whether the needle occurs outside quoted strings.
 *
 * @param {string} text   Haystack.
 * @param {string} needle Needle.
 * @return {boolean} Found.
 */
function hasOutsideStrings( text, needle ) {
	let quote = '';
	for ( let i = 0; i < text.length; i++ ) {
		const c = text[ i ];
		if ( quote ) {
			if ( c === '\\' ) {
				i++;
			} else if ( c === quote ) {
				quote = '';
			}
			continue;
		}
		if ( c === '"' || c === "'" ) {
			quote = c;
			continue;
		}
		if ( text.startsWith( needle, i ) ) {
			return true;
		}
	}
	return false;
}

/**
 * Replace every needle outside quoted strings.
 *
 * @param {string} text    Text.
 * @param {string} needle  Needle.
 * @param {string} replace Replacement.
 * @return {string} Result.
 */
function replaceOutsideStrings( text, needle, replace ) {
	let out = '';
	let quote = '';
	for ( let i = 0; i < text.length; i++ ) {
		const c = text[ i ];
		if ( quote ) {
			out += c;
			if ( c === '\\' && i + 1 < text.length ) {
				out += text[ ++i ];
			} else if ( c === quote ) {
				quote = '';
			}
			continue;
		}
		if ( c === '"' || c === "'" ) {
			quote = c;
			out += c;
			continue;
		}
		if ( text.startsWith( needle, i ) ) {
			out += replace;
			i += needle.length - 1;
			continue;
		}
		out += c;
	}
	return out;
}

/**
 * Lower-case at-rule name of a prelude starting with `@`.
 *
 * @param {string} prelude Prelude.
 * @return {string} Name.
 */
function atName( prelude ) {
	const m = prelude.match( /^@([A-Za-z-]+)/ );
	return m ? m[ 1 ].toLowerCase() : '';
}

/**
 * Scope each selector in a comma list.
 *
 * @param {string} selectors Selector list.
 * @param {string} scope     Instance selector.
 * @return {string} Scoped list.
 */
function scopeSelectorList( selectors, scope ) {
	const scoped = [];
	for ( const raw of splitTopLevel( selectors, ',' ) ) {
		let selector = squash( raw );
		if ( ! selector ) {
			continue;
		}
		selector = replaceOutsideStrings( selector, '&selector', '&' );
		if ( hasOutsideStrings( selector, '&' ) ) {
			scoped.push( replaceOutsideStrings( selector, '&', scope ) );
		} else {
			scoped.push( `${ scope } ${ selector }` );
		}
	}
	return scoped.join( ',' );
}

/**
 * Parse a run of statements, emitting scoped CSS.
 *
 * @param {string}        css     CSS without comments.
 * @param {{pos: number}} state   Read position.
 * @param {boolean}       inBlock True inside an at-rule block.
 * @param {string}        scope   Instance selector.
 * @param {string[]}      refused Reasons, appended to.
 * @return {string|null} Scoped CSS, or null when malformed.
 */
function parseBlock( css, state, inBlock, scope, refused ) {
	let out = '';
	const decls = [];

	while ( true ) {
		const read = readUntilStop( css, state );
		if ( read === null ) {
			return null;
		}
		const [ text, stop ] = read;
		const prelude = squash( text );

		if ( stop === '' ) {
			if ( inBlock ) {
				return null;
			}
			if ( prelude ) {
				decls.push( prelude );
			}
			break;
		}

		if ( stop === '}' ) {
			if ( ! inBlock ) {
				return null;
			}
			if ( prelude ) {
				decls.push( prelude );
			}
			state.pos++;
			break;
		}

		if ( stop === ';' ) {
			state.pos++;
			if ( ! prelude ) {
				continue;
			}
			if ( prelude[ 0 ] === '@' ) {
				refused.push( `at-rule: ${ atName( prelude ) }` );
				continue;
			}
			decls.push( prelude );
			continue;
		}

		state.pos++;
		if ( prelude && prelude[ 0 ] === '@' ) {
			const name = atName( prelude );
			if ( NESTING_AT_RULES.includes( name ) ) {
				const condition = squash( prelude.slice( name.length + 1 ) );
				const inner = parseBlock( css, state, true, scope, refused );
				if ( inner === null ) {
					return null;
				}
				if ( inner ) {
					out += `@${ name }${
						condition ? ' ' + condition : ''
					}{${ inner }}`;
				}
				continue;
			}
			if ( readBody( css, state ) === null ) {
				return null;
			}
			refused.push( `at-rule: ${ name }` );
			continue;
		}

		const body = readBody( css, state );
		if ( body === null ) {
			return null;
		}
		const [ rawBody, nested ] = body;
		if ( nested ) {
			refused.push( `nested rule: ${ prelude }` );
			continue;
		}
		if ( ! prelude ) {
			refused.push( 'rule without a selector' );
			continue;
		}
		const declarations = squash( rawBody );
		if ( UNSAFE_BODY.test( declarations ) ) {
			refused.push( `unsafe value: ${ prelude }` );
			continue;
		}
		if ( ! declarations ) {
			continue;
		}
		out += `${ scopeSelectorList( prelude, scope ) }{${ trimSemicolon(
			declarations
		) }}`;
	}

	if ( decls.length ) {
		const joined = trimSemicolon( decls.join( ';' ) );
		if ( UNSAFE_BODY.test( joined ) ) {
			refused.push( 'unsafe value: declarations on the block' );
		} else if ( joined ) {
			out = `${ scope }{${ joined }}${ out }`;
		}
	}
	return out;
}

/**
 * Scope `css` to `scope` (a full selector such as `.sgs-c-ed-x.sgs-c-ed-x`).
 *
 * @param {string} css   Raw CSS from the block attribute.
 * @param {string} scope Selector every emitted rule is confined to.
 * @return {{css: string, refused: string[]}} Scoped CSS and a reason per refused part.
 */
export function scopeCustomCss( css, scope ) {
	const source = String( css ?? '' );
	if ( ! trimWs( source ) ) {
		return { css: '', refused: [] };
	}
	if ( source.includes( '<' ) ) {
		return { css: '', refused: [ 'markup: the CSS contains "<"' ] };
	}
	const clean = stripComments( source );
	if ( clean === null ) {
		return { css: '', refused: [ 'syntax: an unterminated comment' ] };
	}
	const refused = [];
	const out = parseBlock( clean, { pos: 0 }, false, scope, refused );
	if ( out === null ) {
		return {
			css: '',
			refused: [ 'syntax: unbalanced braces or an unterminated string' ],
		};
	}
	return { css: out, refused };
}

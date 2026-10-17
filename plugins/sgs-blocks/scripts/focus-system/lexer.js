'use strict';

/**
 * A small PHP / JS lexer for check-focus-system.js: splits source into code, string and comment
 * segments, then groups them into statements (ended by `;`, `{` or `}` in code). Only what the
 * focus scan needs: string contents (PHP '…', "…", heredoc and nowdoc, inline HTML outside
 * `<?php … ?>`; JS '…', "…" and template literals with `${…}` replaced by a placeholder) and
 * comments (`//`, `/* … *\/`, PHP `#` at a token boundary).
 *
 * @package SGS\Blocks
 */

const HOLE = '§';

function lex( text, lang ) {
	const segs = [];
	let i = 0;
	let code = '';
	const flushCode = () => {
		if ( code ) {
			segs.push( { type: 'code', text: code } );
			code = '';
		}
	};
	const push = ( type, body ) => {
		flushCode();
		segs.push( { type, text: body } );
	};

	if ( 'php' === lang ) {
		const open = text.indexOf( '<?php' );
		if ( open > 0 ) {
			push( 'string', text.slice( 0, open ) );
		}
		i = -1 === open ? text.length : open + 5;
		if ( -1 === open ) {
			push( 'string', text );
		}
	}

	while ( i < text.length ) {
		const ch = text[ i ];
		const two = text.slice( i, i + 2 );
		if ( '//' === two || ( 'php' === lang && '#' === ch && '[' !== text[ i + 1 ] ) ) {
			let end = text.indexOf( '\n', i );
			if ( 'php' === lang ) {
				const close = text.indexOf( '?>', i );
				if ( -1 !== close && ( -1 === end || close < end ) ) {
					end = close;
				}
			}
			end = -1 === end ? text.length : end;
			push( 'comment', text.slice( i, end ) );
			i = end;
			continue;
		}
		if ( '/*' === two ) {
			const end = text.indexOf( '*/', i + 2 );
			const stop = -1 === end ? text.length : end + 2;
			push( 'comment', text.slice( i, stop ) );
			i = stop;
			continue;
		}
		if ( 'php' === lang && '?>' === two ) {
			const reopen = text.indexOf( '<?php', i + 2 );
			const stop = -1 === reopen ? text.length : reopen;
			code += ';';
			push( 'string', text.slice( i + 2, stop ) );
			i = -1 === reopen ? text.length : reopen + 5;
			continue;
		}
		if ( 'php' === lang && '<<<' === text.slice( i, i + 3 ) ) {
			const m = /^<<<\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1\r?\n/.exec( text.slice( i ) );
			if ( m ) {
				const bodyStart = i + m[ 0 ].length;
				const endRe = new RegExp( `\\n[ \\t]*${ m[ 2 ] }(?![A-Za-z0-9_])` );
				const em = endRe.exec( text.slice( bodyStart - 1 ) );
				const bodyEnd = em ? bodyStart - 1 + em.index : text.length;
				push( 'string', text.slice( bodyStart, bodyEnd ) );
				i = em ? bodyEnd + em[ 0 ].length : text.length;
				continue;
			}
		}
		if ( "'" === ch || '"' === ch || ( 'js' === lang && '`' === ch ) ) {
			let j = i + 1;
			let body = '';
			while ( j < text.length && text[ j ] !== ch ) {
				if ( '\\' === text[ j ] ) {
					body += text.slice( j, j + 2 );
					j += 2;
					continue;
				}
				if ( '`' === ch && '$' === text[ j ] && '{' === text[ j + 1 ] ) {
					let depth = 1;
					j += 2;
					while ( j < text.length && depth > 0 ) {
						if ( '{' === text[ j ] ) {
							depth++;
						} else if ( '}' === text[ j ] ) {
							depth--;
						}
						j++;
					}
					body += HOLE;
					continue;
				}
				body += text[ j ];
				j++;
			}
			push( 'string', body );
			i = j + 1;
			continue;
		}
		code += ch;
		i++;
	}
	flushCode();
	return segs;
}

/** Group segments into statements. A statement is a list of code and string segments. */
function statements( segs ) {
	const out = [];
	let cur = [];
	const end = () => {
		if ( cur.length ) {
			out.push( cur );
		}
		cur = [];
	};
	for ( const s of segs ) {
		if ( 'comment' === s.type ) {
			continue;
		}
		if ( 'string' === s.type ) {
			cur.push( s );
			continue;
		}
		let buf = '';
		for ( const ch of s.text ) {
			if ( ';' === ch || '{' === ch || '}' === ch ) {
				if ( buf ) {
					cur.push( { type: 'code', text: buf } );
				}
				buf = '';
				end();
				continue;
			}
			buf += ch;
		}
		if ( buf ) {
			cur.push( { type: 'code', text: buf } );
		}
	}
	end();
	return out;
}

/** Rebuild the CSS text a statement assembles: string contents in order, code as a hole. */
function reconstruct( stmt ) {
	let out = '';
	for ( const s of stmt ) {
		if ( 'string' === s.type ) {
			out += s.text;
		} else if ( /[\w$]/.test( s.text ) ) {
			out += HOLE;
		}
	}
	return out;
}

module.exports = { lex, statements, reconstruct, HOLE };

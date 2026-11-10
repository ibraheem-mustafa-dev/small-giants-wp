/**
 * Minimal text-level editing of a `block.json`, so an edit changes only the lines it names.
 *
 * `JSON.stringify` cannot be used: 71 of the 101 block files are not in its output shape, and reformatting a whole file
 * would bury the adoption in noise. These helpers scan the text (string and depth aware), find a member by key, and
 * replace, remove or insert that one member.
 *
 * Used by `scripts/adopt-media-blocks.mjs`.
 */

const WS = /\s/;

const skipSpace = ( text, i ) => {
	while ( i < text.length && WS.test( text[ i ] ) ) {
		i += 1;
	}
	return i;
};

/**
 * Index just past the JSON value that starts at `i`.
 *
 * @param {string} text Source.
 * @param {number} i    Index of the first character of the value.
 * @return {number} Exclusive end index.
 */
export function valueEnd( text, i ) {
	const ch = text[ i ];
	if ( ch === '"' ) {
		let j = i + 1;
		while ( text[ j ] !== '"' ) {
			j += text[ j ] === '\\' ? 2 : 1;
		}
		return j + 1;
	}
	if ( ch === '{' || ch === '[' ) {
		let depth = 0;
		let j = i;
		while ( j < text.length ) {
			const c = text[ j ];
			if ( c === '"' ) {
				j = valueEnd( text, j );
				continue;
			}
			if ( c === '{' || c === '[' ) {
				depth += 1;
			} else if ( c === '}' || c === ']' ) {
				depth -= 1;
				if ( depth === 0 ) {
					return j + 1;
				}
			}
			j += 1;
		}
		throw new Error( 'unterminated JSON value' );
	}
	let j = i;
	while ( j < text.length && ! /[\s,}\]]/.test( text[ j ] ) ) {
		j += 1;
	}
	return j;
}

/**
 * The members of the object whose `{` is at `open`.
 *
 * @param {string} text Source.
 * @param {number} open Index of the opening brace.
 * @return {{members: Array<{key:string,keyStart:number,valStart:number,valEnd:number,comma:number}>, close:number}} Members in order, with the index of the comma after each (-1 for the last) and the closing brace.
 */
export function members( text, open ) {
	if ( text[ open ] !== '{' ) {
		throw new Error( `expected an object at ${ open }` );
	}
	const out = [];
	let i = skipSpace( text, open + 1 );
	while ( text[ i ] !== '}' ) {
		if ( text[ i ] !== '"' ) {
			throw new Error( `expected a key at ${ i }` );
		}
		const keyStart = i;
		const keyEnd = valueEnd( text, i );
		const key = JSON.parse( text.slice( keyStart, keyEnd ) );
		i = skipSpace( text, keyEnd );
		i = skipSpace( text, i + 1 ); // past ':'
		const valStart = i;
		const end = valueEnd( text, i );
		i = skipSpace( text, end );
		let comma = -1;
		if ( text[ i ] === ',' ) {
			comma = i;
			i = skipSpace( text, i + 1 );
		}
		out.push( { key, keyStart, valStart, valEnd: end, comma } );
	}
	return { members: out, close: i };
}

/**
 * One member of an object, by key.
 *
 * @param {string} text Source.
 * @param {number} open Index of the object's opening brace.
 * @param {string} key  Member name.
 * @return {Object|null} The member, or null.
 */
export function member( text, open, key ) {
	return members( text, open ).members.find( ( m ) => m.key === key ) || null;
}

/** The leading whitespace of the line holding `index`. */
export function lineIndent( text, index ) {
	const start = text.lastIndexOf( '\n', index - 1 ) + 1;
	return /^[ \t]*/.exec( text.slice( start ) )[ 0 ];
}

/** Replace the value of one member with already-serialised text. */
export function replaceValue( text, m, valueText ) {
	return text.slice( 0, m.valStart ) + valueText + text.slice( m.valEnd );
}

/**
 * Remove one member (and its comma) from the object whose `{` is at `open`.
 *
 * @param {string} text Source.
 * @param {number} open Index of the object's opening brace.
 * @param {string} key  Member name.
 * @return {string} New source; the same text when the member is absent.
 */
export function removeMember( text, open, key ) {
	const { members: list } = members( text, open );
	const k = list.findIndex( ( m ) => m.key === key );
	if ( k === -1 ) {
		return text;
	}
	const m = list[ k ];
	if ( m.comma === -1 ) {
		// The last member: take the comma that follows the one before it.
		if ( k === 0 ) {
			return text.slice( 0, open + 1 ) + text.slice( members( text, open ).close );
		}
		return text.slice( 0, list[ k - 1 ].valEnd ) + text.slice( m.valEnd );
	}
	let start = m.keyStart;
	while ( start > 0 && ( text[ start - 1 ] === ' ' || text[ start - 1 ] === '\t' ) ) {
		start -= 1;
	}
	const ownLine = start === 0 || text[ start - 1 ] === '\n';
	let end = m.comma + 1;
	if ( ownLine ) {
		while ( text[ end ] === ' ' || text[ end ] === '\t' ) {
			end += 1;
		}
		if ( text[ end ] === '\r' ) {
			end += 1;
		}
		if ( text[ end ] === '\n' ) {
			end += 1;
		}
	} else {
		start = m.keyStart;
		while ( text[ end ] === ' ' || text[ end ] === '\t' ) {
			end += 1;
		}
	}
	return text.slice( 0, start ) + text.slice( end );
}

/**
 * Insert a member as the first one of the object whose `{` is at `open`.
 *
 * @param {string} text      Source.
 * @param {number} open      Index of the object's opening brace.
 * @param {string} key       Member name.
 * @param {string} valueText Serialised value, lines after the first already indented for the member's depth.
 * @return {string} New source.
 */
export function insertFirstMember( text, open, key, valueText ) {
	const eol = text.includes( '\r\n' ) ? '\r\n' : '\n';
	const { members: list, close } = members( text, open );
	const entry = `${ JSON.stringify( key ) }: ${ valueText }`;
	if ( list.length ) {
		const indent = lineIndent( text, list[ 0 ].keyStart );
		return text.slice( 0, open + 1 ) + eol + indent + entry + ',' + text.slice( open + 1 );
	}
	const closeIndent = lineIndent( text, close );
	return text.slice( 0, open + 1 ) + eol + closeIndent + '\t' + entry + eol + closeIndent + text.slice( close );
}

/** Serialise a value as tab-indented JSON for a member whose key sits on a line with `indent`. */
export function serialise( value, indent, eol = '\n' ) {
	return JSON.stringify( value, null, '\t' ).split( '\n' ).join( eol + indent );
}

/**
 * Owned-key derivation for the Starter Look preset control (FR-37-47).
 *
 * "Owned settings" are the attribute names a starter look EXPLICITLY writes in
 * its pattern source. Everything else on the live block is none of the look's
 * business and must never be written — which is why this module reads the raw
 * block comments rather than `@wordpress/blocks`'s `parse()`: that parser fills
 * EVERY declared default, so its `attributes` cannot tell "the look sets this"
 * apart from "the block type happens to default to this", and applying a look
 * would silently wipe unrelated client settings (`ariaLabel`, `drawerRef`,
 * `backgroundImage`…).
 *
 * Deliberately free of WordPress imports so the gate
 * `scripts/tests/test-starter-look-owned-keys.mjs` can run it under plain node.
 *
 * @package SGS\Blocks
 */

// Block-level provenance metadata is never an owned setting — it is stripped,
// not applied (see StarterLookPresetControl's `stripMetadataDeep`).
const NEVER_OWNED = [ 'metadata' ];

const BLOCK_COMMENT =
	/<!--\s+(\/)?wp:([a-z][a-z0-9_-]*(?:\/[a-z][a-z0-9_-]*)?)\s*(\{[\s\S]*?\})?\s*(\/)?-->/g;

/**
 * Structured-clones a value, falling back to a JSON round-trip.
 *
 * @param {*} value Any JSON-serialisable value (or undefined).
 * @return {*} A detached copy.
 */
export function deepClone( value ) {
	if ( value === undefined || value === null || typeof value !== 'object' ) {
		return value;
	}
	if ( typeof structuredClone === 'function' ) {
		return structuredClone( value );
	}
	return JSON.parse( JSON.stringify( value ) );
}

/**
 * Parses serialised block markup into a shallow tree carrying ONLY the
 * attributes each block comment actually declares.
 *
 * @param {string} content Serialised block markup (a pattern's `content`).
 * @return {Array<{name: string, attrs: Object, innerBlocks: Array}>} Top-level blocks.
 */
export function parseExplicitBlocks( content ) {
	if ( typeof content !== 'string' || content === '' ) {
		return [];
	}
	const root = { innerBlocks: [] };
	const stack = [ root ];
	const re = new RegExp( BLOCK_COMMENT.source, 'g' );
	let match = re.exec( content );
	while ( match ) {
		const [ , closer, rawName, rawJson, selfClosing ] = match;
		const name = rawName.includes( '/' ) ? rawName : `core/${ rawName }`;
		if ( closer ) {
			if ( stack.length > 1 ) {
				stack.pop();
			}
		} else {
			let attrs = {};
			if ( rawJson ) {
				try {
					attrs = JSON.parse( rawJson ) || {};
				} catch ( e ) {
					attrs = {};
				}
			}
			const block = { name, attrs, innerBlocks: [] };
			stack[ stack.length - 1 ].innerBlocks.push( block );
			if ( ! selfClosing ) {
				stack.push( block );
			}
		}
		match = re.exec( content );
	}
	return root.innerBlocks;
}

/**
 * Picks the pattern's root block — the first top-level block matching the
 * locked root's registered name, else the first top-level block.
 *
 * @param {Array<Object>} blocks        Result of {@see parseExplicitBlocks}.
 * @param {string}        rootBlockName The locked root block's name.
 * @return {Object|null} The root block, or null when the pattern is empty.
 */
export function findExplicitRoot( blocks, rootBlockName ) {
	if ( ! Array.isArray( blocks ) || blocks.length === 0 ) {
		return null;
	}
	return blocks.find( ( block ) => block.name === rootBlockName ) || blocks[ 0 ];
}

function ownableKeys( attrs ) {
	return Object.keys( attrs || {} ).filter( ( key ) => ! NEVER_OWNED.includes( key ) );
}

/**
 * The union of attribute names explicitly written on the ROOT block across
 * every qualifying look — including looks the `featured` filter hides, so a
 * hidden look's settings are still reset rather than left stranded.
 *
 * @param {Array<{content: string}>} patterns      Qualifying patterns.
 * @param {string}                   rootBlockName The locked root block's name.
 * @return {Array<string>} Sorted owned attribute names.
 */
export function collectOwnedKeys( patterns, rootBlockName ) {
	const keys = new Set();
	( patterns || [] ).forEach( ( pattern ) => {
		const root = findExplicitRoot( parseExplicitBlocks( pattern?.content ), rootBlockName );
		if ( root ) {
			ownableKeys( root.attrs ).forEach( ( key ) => keys.add( key ) );
		}
	} );
	return [ ...keys ].sort();
}

/**
 * The same union, per DIRECT CHILD block name — most drawer looks define
 * themselves on the child `sgs/nav-drawer-menu` (`listColumns`, `itemFontSize`…),
 * not on the root, so "keep my content" must reach those too.
 *
 * @param {Array<{content: string}>} patterns      Qualifying patterns.
 * @param {string}                   rootBlockName The locked root block's name.
 * @return {Object<string, Array<string>>} Block name → sorted owned attribute names.
 */
export function collectChildOwnedKeys( patterns, rootBlockName ) {
	const byName = {};
	( patterns || [] ).forEach( ( pattern ) => {
		const root = findExplicitRoot( parseExplicitBlocks( pattern?.content ), rootBlockName );
		( root?.innerBlocks || [] ).forEach( ( child ) => {
			byName[ child.name ] = byName[ child.name ] || new Set();
			ownableKeys( child.attrs ).forEach( ( key ) => byName[ child.name ].add( key ) );
		} );
	} );
	return Object.keys( byName ).reduce( ( out, name ) => {
		out[ name ] = [ ...byName[ name ] ].sort();
		return out;
	}, {} );
}

/**
 * Builds the attribute patch for one block: every owned key set to the look's
 * explicit value, or — where this look stays silent on a key a SIBLING look
 * owns — back to the block type's declared default. Keys no look owns are
 * absent from the result and therefore never written.
 *
 * @param {Array<string>} ownedKeys          Owned attribute names for this block.
 * @param {Object}        lookExplicitAttrs  This look's explicitly-written attributes.
 * @param {Object}        blockTypeAttributes The block type's `attributes` schema.
 * @return {Object} The attribute patch to dispatch.
 */
export function buildOwnedAttributes( ownedKeys, lookExplicitAttrs, blockTypeAttributes ) {
	const explicit = lookExplicitAttrs || {};
	const schema = blockTypeAttributes || {};
	return ( ownedKeys || [] ).reduce( ( patch, key ) => {
		if ( NEVER_OWNED.includes( key ) ) {
			return patch;
		}
		patch[ key ] = Object.prototype.hasOwnProperty.call( explicit, key )
			? deepClone( explicit[ key ] )
			: deepClone( schema[ key ]?.default );
		return patch;
	}, {} );
}

/**
 * @param {Object} attributes Raw attributes from a parsed pattern block.
 * @return {Object} A copy minus `metadata`. Never mutates the input.
 */
export function stripMetadata( attributes ) {
	if ( ! attributes || ! Object.prototype.hasOwnProperty.call( attributes, 'metadata' ) ) {
		return attributes || {};
	}
	const { metadata, ...rest } = attributes;
	return rest;
}

/**
 * @param {Array<Object>} blocks Parsed blocks (from `@wordpress/blocks`'s `parse()`).
 * @return {Array<Object>} A NEW tree, metadata-free at every depth.
 */
export function stripMetadataDeep( blocks ) {
	if ( ! Array.isArray( blocks ) ) {
		return [];
	}
	return blocks.map( ( block ) => ( {
		...block,
		attributes: stripMetadata( block.attributes ),
		innerBlocks: stripMetadataDeep( block.innerBlocks ),
	} ) );
}

/**
 * Pairs a pattern's direct children with the live block's direct children by
 * block name, each live child consumed by the first unmatched pattern child of
 * that name (never by array position, which would cross-apply settings when the
 * client has reordered or removed a block).
 *
 * @param {Array<string>} patternNames Pattern child block names, in order.
 * @param {Array<string>} liveNames    Live child block names, in order.
 * @return {Array<{patternIndex: number, liveIndex: number}>} Matched index pairs.
 */
export function matchChildrenByName( patternNames, liveNames ) {
	const used = new Set();
	const pairs = [];
	( patternNames || [] ).forEach( ( name, patternIndex ) => {
		const liveIndex = ( liveNames || [] ).findIndex(
			( liveName, index ) => liveName === name && ! used.has( index )
		);
		if ( liveIndex !== -1 ) {
			used.add( liveIndex );
			pairs.push( { patternIndex, liveIndex } );
		}
	} );
	return pairs;
}

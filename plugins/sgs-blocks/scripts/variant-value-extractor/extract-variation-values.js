'use strict';

/**
 * extract-variation-values.js — reads one block's `variations.js` and emits
 * each variation's `attributes` object as PLAIN JSON to stdout.
 *
 * WHY THIS EXISTS (FR — value-aware variant discrimination, 2026-09-05).
 * `variant_slots` (seeded by `sgs-update-v2.py` from `block.json`
 * `supports.sgs.variants`) only ever stored attribute NAMES. That is the
 * correct signal for a CAPABILITY variant (the variant enables a whole
 * different attribute — `sgs/hero` `split` uniquely owns `splitImageUrl`),
 * but it is blind to a PRESET variant, where every variant shares the same
 * attribute vocabulary and differs only in VALUES (`sgs/nav-drawer` — 6 of
 * its 7 variations collapse to an empty name-only discriminator because they
 * all set `drawerAlign`/`drawerBg`/`closeStyle`, just to different values).
 *
 * This script is the extraction half: given a `variations.js` path, parse it
 * with `@babel/parser` (the in-repo AST tool, matching
 * `scripts/colour-codemod/adopt.js` — never regex a JS object literal) and
 * return each variation's `name` + its `attributes` object evaluated to
 * plain JSON values. The Python seeder (`sgs-update-v2.py`) consumes this
 * output and computes the (name, value) set-difference itself — this script
 * does no discrimination logic, only extraction.
 *
 * WHAT COUNTS AS A LITERAL. Only statically-known values are usable as a
 * discriminator — an `Identifier` reference or a `CallExpression` result
 * cannot be compared without evaluating arbitrary JS, which this script does
 * NOT do (that would be a correctness trap of its own). Non-literal
 * attribute values are reported separately under `nonLiteralAttrs` per
 * variant, EXCLUDED from `attributes`, and never invented or approximated —
 * the caller decides what to do with the gap (currently: skip that attr as a
 * value-based discriminator candidate for that variant, exactly like an
 * absent attribute).
 *
 * OUTPUT SHAPE (stdout, single JSON document):
 *   {
 *     "variants": {
 *       "<variant-name>": {
 *         "attributes": { "<attr>": <plain JSON value>, ... },
 *         "nonLiteralAttrs": [ "<attr>", ... ]
 *       },
 *       ...
 *     }
 *   }
 *
 * Refuses (non-zero exit + stderr message, no partial stdout) rather than
 * guessing when:
 *   - the file does not exist or fails to parse
 *   - no `variations` array can be located (see `findVariationsArray`)
 *   - a variation entry's `name` is not a plain string literal
 */

const fs = require( 'fs' );
const path = require( 'path' );
const babelParser = require( '@babel/parser' );
const traverse = require( '@babel/traverse' ).default;

const BABEL_PARSE_OPTS = {
	sourceType: 'module',
	plugins: [ 'jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator' ],
	errorRecovery: false,
};

/**
 * Evaluate an AST node to a plain JS value IF it is a statically-literal
 * expression. Returns `{ ok: true, value }` on success, `{ ok: false }` when
 * the node is not a literal this function understands (identifier
 * reference, call expression, spread, computed key, template with
 * expressions, etc.) — the caller must not guess a value in that case.
 *
 * @param {import('@babel/types').Node} node
 * @return {{ok: boolean, value?: *}}
 */
function evalLiteral( node ) {
	if ( ! node ) {
		return { ok: false };
	}
	switch ( node.type ) {
		case 'StringLiteral':
		case 'NumericLiteral':
		case 'BooleanLiteral':
			return { ok: true, value: node.value };
		case 'NullLiteral':
			return { ok: true, value: null };
		case 'TemplateLiteral':
			// Only a template with ZERO interpolations is a literal (`4px` written
			// as a template for some reason) — one with expressions is not.
			if ( node.expressions.length === 0 && node.quasis.length === 1 ) {
				return { ok: true, value: node.quasis[ 0 ].value.cooked };
			}
			return { ok: false };
		case 'ObjectExpression': {
			const out = {};
			for ( const prop of node.properties ) {
				if ( prop.type !== 'ObjectProperty' || prop.computed ) {
					return { ok: false };
				}
				const key = prop.key.type === 'Identifier'
					? prop.key.name
					: prop.key.type === 'StringLiteral'
						? prop.key.value
						: null;
				if ( key === null ) {
					return { ok: false };
				}
				const val = evalLiteral( prop.value );
				if ( ! val.ok ) {
					return { ok: false };
				}
				out[ key ] = val.value;
			}
			return { ok: true, value: out };
		}
		case 'ArrayExpression': {
			const out = [];
			for ( const el of node.elements ) {
				if ( el === null ) {
					return { ok: false };
				}
				const val = evalLiteral( el );
				if ( ! val.ok ) {
					return { ok: false };
				}
				out.push( val.value );
			}
			return { ok: true, value: out };
		}
		default:
			return { ok: false };
	}
}

/**
 * Locate the array literal holding the variation objects.
 *
 * Preferred path: resolve `export default <identifier>;` to the
 * `const <identifier> = [ ... ];` declaration it refers to (the shape every
 * current SGS `variations.js` file uses). Falls back to the first top-level
 * array literal whose elements are object literals carrying a `name`
 * property, so a differently-shaped file (default export IS the array
 * literal directly) still resolves rather than refusing needlessly.
 *
 * @param {import('@babel/types').File} ast
 * @return {import('@babel/types').ArrayExpression|null}
 */
function findVariationsArray( ast ) {
	let exportedIdentifierName = null;
	let directArray = null;
	const declaredArrays = new Map();

	traverse( ast, {
		ExportDefaultDeclaration( nodePath ) {
			const decl = nodePath.node.declaration;
			if ( decl.type === 'Identifier' ) {
				exportedIdentifierName = decl.name;
			} else if ( decl.type === 'ArrayExpression' ) {
				directArray = decl;
			}
		},
		VariableDeclarator( nodePath ) {
			if (
				nodePath.node.id.type === 'Identifier' &&
				nodePath.node.init &&
				nodePath.node.init.type === 'ArrayExpression'
			) {
				declaredArrays.set( nodePath.node.id.name, nodePath.node.init );
			}
		},
	} );

	if ( exportedIdentifierName && declaredArrays.has( exportedIdentifierName ) ) {
		return declaredArrays.get( exportedIdentifierName );
	}
	if ( directArray ) {
		return directArray;
	}
	// Fallback: first declared array whose elements look like variation objects.
	for ( const arr of declaredArrays.values() ) {
		const looksLikeVariations = arr.elements.every(
			( el ) =>
				el &&
				el.type === 'ObjectExpression' &&
				el.properties.some(
					( p ) =>
						p.type === 'ObjectProperty' &&
						p.key.type === 'Identifier' &&
						p.key.name === 'name'
				)
		);
		if ( looksLikeVariations && arr.elements.length > 0 ) {
			return arr;
		}
	}
	return null;
}

/**
 * Resolve a CallExpression to a local function declaration and extract its
 * return value's first element if it's an ArrayExpression with a StringLiteral.
 *
 * @param {import('@babel/types').CallExpression} callNode
 * @param {import('@babel/types').File} ast
 * @return {{ok: boolean, value?: string}}
 */
function resolveLocalFunctionCallBlock( callNode, ast ) {
	// Must be a call to an Identifier (simple function name, not a property access).
	if ( callNode.callee.type !== 'Identifier' ) {
		return { ok: false };
	}

	const fnName = callNode.callee.name;
	let fnDecl = null;

	// Find the function declaration matching this name.
	// Walk the program body directly to find declarations.
	if ( ast.program && ast.program.body ) {
		for ( const stmt of ast.program.body ) {
			if ( stmt.type === 'FunctionDeclaration' && stmt.id.name === fnName ) {
				fnDecl = stmt;
				break;
			}
			if (
				stmt.type === 'VariableDeclaration' &&
				stmt.declarations[ 0 ] &&
				stmt.declarations[ 0 ].id.type === 'Identifier' &&
				stmt.declarations[ 0 ].id.name === fnName &&
				stmt.declarations[ 0 ].init &&
				(stmt.declarations[ 0 ].init.type === 'FunctionExpression' || stmt.declarations[ 0 ].init.type === 'ArrowFunctionExpression')
			) {
				fnDecl = stmt.declarations[ 0 ].init;
				break;
			}
		}
	}

	if ( ! fnDecl ) {
		return { ok: false };
	}

	// Find all ReturnStatement nodes belonging to THIS function (not to any
	// nested function declared inside it). For a concise-body arrow function,
	// treat the body itself as the return value.
	let returnValue = null;
	let returnCount = 0;

	if ( ! fnDecl.body ) {
		return { ok: false };
	}

	// Case 1: Concise-body arrow function — body IS the return value directly.
	if ( fnDecl.body.type !== 'BlockStatement' ) {
		returnValue = fnDecl.body;
		returnCount = 1;
	} else {
		// Case 2: Block-body function — use @babel/traverse's own generic
		// traversal (the same tool `findVariationsArray` above already uses)
		// scoped to this function's body, rather than a hand-maintained list
		// of "which statement types can contain a return". A generic
		// ReturnStatement visitor walks every node shape automatically —
		// switch cases, labeled statements, loops, try/catch, anything the
		// grammar has — so a control-flow shape nobody has tested yet still
		// gets its return counted correctly instead of silently ignored.
		//
		// The one thing the visitor must do by hand is skip returns that
		// belong to a NESTED function (its own returns belong to IT, not the
		// function under analysis here) — `path.getFunctionParent()` finds
		// the nearest enclosing function for the ReturnStatement; if that
		// isn't `fnDecl` itself, the return is nested and is skipped, and
		// `path.skip()` stops the traversal from ever descending into that
		// nested function's body at all.
		traverse( fnDecl.body, {
			noScope: true,
			Function( nestedPath ) {
				if ( nestedPath.node !== fnDecl ) {
					nestedPath.skip();
				}
			},
			ReturnStatement( returnPath ) {
				const owner = returnPath.getFunctionParent();
				if ( owner && owner.node === fnDecl ) {
					returnValue = returnPath.node.argument;
					returnCount++;
				}
			},
		} );
	}

	// If multiple returns or no return found, fail.
	if ( returnCount !== 1 || ! returnValue || returnValue.type !== 'ArrayExpression' ) {
		return { ok: false };
	}

	// Check if the first element is a StringLiteral (the block slug).
	const firstEl = returnValue.elements[ 0 ];
	if ( ! firstEl || firstEl.type !== 'StringLiteral' ) {
		return { ok: false };
	}

	return { ok: true, value: firstEl.value };
}

/**
 * Extract inner block slugs from an `innerBlocks` array.
 *
 * @param {import('@babel/types').ArrayExpression} innerBlocksNode
 * @param {import('@babel/types').File} ast
 * @return {{innerBlockSlugs: string[], unresolvedInnerBlocks: number}}
 */
function extractInnerBlockSlugs( innerBlocksNode, ast ) {
	const innerBlockSlugs = [];
	let unresolvedInnerBlocks = 0;

	for ( const el of innerBlocksNode.elements ) {
		if ( ! el ) {
			continue;
		}

		// Case 1: ArrayExpression — direct block definition.
		if ( el.type === 'ArrayExpression' ) {
			const firstEl = el.elements[ 0 ];
			if ( firstEl && firstEl.type === 'StringLiteral' ) {
				innerBlockSlugs.push( firstEl.value );
			} else {
				unresolvedInnerBlocks++;
			}
			continue;
		}

		// Case 2: CallExpression — local helper function.
		if ( el.type === 'CallExpression' ) {
			const result = resolveLocalFunctionCallBlock( el, ast );
			if ( result.ok ) {
				innerBlockSlugs.push( result.value );
			} else {
				unresolvedInnerBlocks++;
			}
			continue;
		}

		// Case 3: Any other shape — unresolved.
		unresolvedInnerBlocks++;
	}

	return { innerBlockSlugs, unresolvedInnerBlocks };
}

/**
 * @param {string} filePath Absolute path to a block's `variations.js`.
 * @return {{variants: Record<string, {attributes: Object, nonLiteralAttrs: string[], innerBlockSlugs: string[], unresolvedInnerBlocks: number}>}}
 */
function extract( filePath ) {
	const source = fs.readFileSync( filePath, 'utf8' );
	const ast = babelParser.parse( source, BABEL_PARSE_OPTS );
	const arrayNode = findVariationsArray( ast );
	if ( ! arrayNode ) {
		throw new Error( `no variations array found in ${ filePath }` );
	}

	const variants = {};
	for ( const el of arrayNode.elements ) {
		if ( ! el || el.type !== 'ObjectExpression' ) {
			continue;
		}
		let name = null;
		let attributesNode = null;
		let innerBlocksNode = null;
		for ( const prop of el.properties ) {
			if ( prop.type !== 'ObjectProperty' || prop.key.type !== 'Identifier' ) {
				continue;
			}
			if ( prop.key.name === 'name' ) {
				const val = evalLiteral( prop.value );
				if ( ! val.ok || typeof val.value !== 'string' ) {
					throw new Error(
						`variation entry has a non-string-literal 'name' in ${ filePath }`
					);
				}
				name = val.value;
			}
			if ( prop.key.name === 'attributes' && prop.value.type === 'ObjectExpression' ) {
				attributesNode = prop.value;
			}
			if ( prop.key.name === 'innerBlocks' && prop.value.type === 'ArrayExpression' ) {
				innerBlocksNode = prop.value;
			}
		}
		if ( name === null ) {
			continue; // Not a variation entry (defensive; findVariationsArray already filtered).
		}
		const attributes = {};
		const nonLiteralAttrs = [];
		if ( attributesNode ) {
			for ( const prop of attributesNode.properties ) {
				if ( prop.type !== 'ObjectProperty' || prop.computed ) {
					continue;
				}
				const key = prop.key.type === 'Identifier'
					? prop.key.name
					: prop.key.type === 'StringLiteral'
						? prop.key.value
						: null;
				if ( key === null ) {
					continue;
				}
				const val = evalLiteral( prop.value );
				if ( val.ok ) {
					attributes[ key ] = val.value;
				} else {
					nonLiteralAttrs.push( key );
				}
			}
		}
		let innerBlockSlugs = [];
		let unresolvedInnerBlocks = 0;
		if ( innerBlocksNode ) {
			const result = extractInnerBlockSlugs( innerBlocksNode, ast );
			innerBlockSlugs = result.innerBlockSlugs;
			unresolvedInnerBlocks = result.unresolvedInnerBlocks;
		}
		variants[ name ] = { attributes, nonLiteralAttrs, innerBlockSlugs, unresolvedInnerBlocks };
	}
	return { variants };
}

function main() {
	const filePath = process.argv[ 2 ];
	if ( ! filePath ) {
		process.stderr.write( 'usage: node extract-variation-values.js <path-to-variations.js>\n' );
		process.exit( 2 );
	}
	const resolved = path.resolve( filePath );
	if ( ! fs.existsSync( resolved ) ) {
		process.stderr.write( `extract-variation-values: file not found: ${ resolved }\n` );
		process.exit( 2 );
	}
	try {
		const result = extract( resolved );
		process.stdout.write( JSON.stringify( result ) );
	} catch ( err ) {
		process.stderr.write( `extract-variation-values: ${ err.message }\n` );
		process.exit( 1 );
	}
}

if ( require.main === module ) {
	main();
}

module.exports = { extract, evalLiteral, findVariationsArray };

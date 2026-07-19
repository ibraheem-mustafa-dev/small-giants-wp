/**
 * check-duplicate-controls.js
 *
 * STRUCTURAL GUARD (WARN-ONLY) — finds the "duplicate control" class of bug:
 * the SAME setting exposed to the client through TWO different editor
 * controls, so they see two knobs for one thing (or two that silently fight
 * each other at render time). This is the COMPLEMENT of
 * check-dead-controls.js (control with no render consumption) and
 * check-control-ux.js (responsive-family / unit-select anti-patterns) — read
 * both before touching this file; do not duplicate their checks.
 *
 * THREE CHECKS
 * ------------
 *  CHECK 1 — UNIVERSAL-HOVER-VS-PRIVATE-HOVER (primary target, per block):
 *    src/blocks/extensions/hover-effects.js injects a universal `sgsHover*`
 *    attribute family + "Hover Effects" inspector panel onto EVERY block that
 *    does not declare `supports.sgs.hideExtensions: ["hover", ...]`. Many
 *    blocks ALSO declare their OWN private `*Hover` attrs (e.g. card-grid's
 *    `scaleHover`/`shadowHover`, hero's `backgroundColourHover`) covering the
 *    same semantic ground (scale / shadow / bg-colour / text-colour /
 *    border-colour / image-zoom / grayscale). If the block does not hide the
 *    universal hover extension, the client is looking at TWO systems
 *    nominally responsible for the same visual effect. Two severities:
 *      - 'controlled'   the private attr ALSO has its own edit.js control —
 *                        the client literally sees two knobs for one thing.
 *      - 'shadow'        the private attr is declared + consumed by
 *                        render.php/save.js but has NO editor control of its
 *                        own — it silently sits at its default forever while
 *                        the universal control is the only live one, so the
 *                        private attribute is dead weight that LOOKS load-
 *                        bearing (a hidden duplicate, not a visible one).
 *    Sub-element-scoped private attrs (prefixed cta/tab/link/icon/shape/
 *    overlay/ripple — e.g. hero's `ctaPrimaryHoverBackground`) target a named
 *    CHILD element, not the whole block, so they are NOT the same setting as
 *    the block-wide universal control — reported separately at lower
 *    confidence ('scoped') rather than folded into the primary finding.
 *
 *  CHECK 2 — SAME-ATTR-TWO-CONTROLS (per block, one edit.js):
 *    Two distinct JSX control elements (SelectControl/RangeControl/
 *    ToggleControl/TextControl/ColorPicker/etc., or the house-style
 *    `update('attr', val)` setter) in the SAME block's edit.js both write the
 *    same attribute via setAttributes. AST-parsed (@babel/parser + traverse)
 *    so it is not fooled by nested/duplicated JSX text.
 *
 *  CHECK 3 — PARENT-CHILD-DUPLICATION (per composite block, heuristic):
 *    A composite block's edit.js mounts InnerBlocks with a `template` that
 *    includes a known SGS child block (sgs/heading, sgs/text, sgs/button,
 *    sgs/media, sgs/quote, sgs/icon) AND the composite ALSO declares its own
 *    styling attrs whose name is prefixed with a role keyword matching that
 *    child (e.g. `titleColour` + a template heading in the "title" role).
 *    The child already owns real typography/colour controls for itself — a
 *    same-named parent control is the HC2 "dead-by-specificity" duplicate,
 *    reported here from the DUPLICATE angle (two controls exist; only one is
 *    ever visibly load-bearing depending on CSS specificity). Best-effort
 *    static heuristic — under-reports rather than over-reports by design.
 *
 * BASELINE: scripts/duplicate-controls-baseline.json — same shape/philosophy
 * as the sibling guards. Starts EMPTY. To accept a finding, add it with a
 * reason; to fix one, remove the redundant control (keep the shared/universal
 * one per the `keeper` field) or scope the two controls apart.
 *
 * WARN-ONLY: this script NEVER fails the build. `--check` only changes
 * nothing about the exit code (kept for CLI symmetry with the sibling
 * guards) — exit code is always 0. It is NOT wired into prebuild/prestart;
 * run it manually or from a future opt-in CI step.
 *
 * Usage:
 *   node scripts/check-duplicate-controls.js          # report
 *   node scripts/check-duplicate-controls.js --json    # machine-readable
 *   node scripts/check-duplicate-controls.js --check   # same, exit 0 always
 *
 * @package SGS\Blocks
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const parser = require( '@babel/parser' );
const traverse = require( '@babel/traverse' ).default;

const ROOT = path.join( __dirname, '..' );
const BLOCKS_DIR = path.join( ROOT, 'src', 'blocks' );
const BASELINE_FILE = path.join( __dirname, 'duplicate-controls-baseline.json' );

// ---------------------------------------------------------------------------
// CHECK 1 — universal-hover vs private-hover category table.
// ---------------------------------------------------------------------------

// The universal sgsHover* attrs injected by hover-effects.js, grouped by the
// semantic category they control. Kept in sync with that file's
// `hoverAttributes` object (2026-07-18 shape). Not a DB lookup dict — this is
// a fixed cross-reference between two hand-authored control systems, same
// justification class as check-dead-controls.js's PREFIXED_HELPER_SUFFIXES.
const UNIVERSAL_HOVER_BY_CATEGORY = {
	bgColour: [ 'sgsHoverBgColour' ],
	textColour: [ 'sgsHoverTextColour' ],
	borderColour: [ 'sgsHoverBorderColour' ],
	scale: [ 'sgsHoverScale', 'sgsHoverScalePreset' ],
	shadow: [ 'sgsHoverShadow' ],
	imageZoom: [ 'sgsHoverImageZoom' ],
	grayscale: [ 'sgsHoverGrayscale' ],
	duration: [ 'sgsHoverDuration' ],
	easing: [ 'sgsHoverEasing' ],
	effect: [ 'sgsHoverScale', 'sgsHoverShadow', 'sgsHoverImageZoom' ], // "Hover effect" preset vs the "Hover Effects" panel — naming collision, not 1:1.
};

// Sub-element prefix words that mean a private *Hover attr targets a named
// CHILD part of the block (a CTA button, a tab, an icon...) rather than the
// whole block — NOT the same setting as the block-wide universal control.
// Reported separately at lower confidence.
const SCOPED_SUBJECT_WORDS = new Set( [
	'cta', 'tab', 'link', 'icon', 'shape', 'overlay', 'ripple', 'primary', 'secondary',
] );

/**
 * Classify a declared attribute name that contains "hover" (case-insensitive)
 * into a semantic category + whether it is scoped to a named sub-element.
 * Returns null if the name contains "hover" but matches no known category
 * (e.g. `pauseOnHover`, `autoScrollPauseOnHover`, `hoverStyle` — behavioural
 * toggles with no universal-hover-panel equivalent).
 *
 * @param {string} attrName Declared attribute name.
 * @return {?{category: string, scoped: boolean, subject: ?string}} Classification.
 */
function classifyHoverAttr( attrName ) {
	if ( ! /hover/i.test( attrName ) ) {
		return null;
	}
	// Split camelCase into lowercase word tokens, drop the "hover" token itself.
	const words = attrName
		.replace( /([a-z0-9])([A-Z])/g, '$1 $2' )
		.toLowerCase()
		.split( /[\s_]+/ )
		.filter( ( w ) => w && w !== 'hover' );

	const has = ( w ) => words.includes( w );

	let category = null;
	if ( ( has( 'background' ) || has( 'bg' ) ) && has( 'colour' ) ) {
		category = 'bgColour';
	} else if ( has( 'text' ) && has( 'colour' ) ) {
		category = 'textColour';
	} else if ( has( 'border' ) && has( 'colour' ) && ! has( 'accent' ) ) {
		category = 'borderColour';
	} else if ( has( 'scale' ) ) {
		category = 'scale';
	} else if ( has( 'shadow' ) ) {
		category = 'shadow';
	} else if ( has( 'image' ) && has( 'zoom' ) ) {
		category = 'imageZoom';
	} else if ( has( 'grayscale' ) || has( 'greyscale' ) ) {
		category = 'grayscale';
	} else if ( has( 'duration' ) ) {
		category = 'duration';
	} else if ( has( 'easing' ) ) {
		category = 'easing';
	} else if ( has( 'effect' ) ) {
		category = 'effect';
	} else if ( has( 'colour' ) || has( 'color' ) ) {
		// A bare "<something>Hover" colour with no bg/text/border qualifier
		// (e.g. linkHoverColour). Fall back to textColour — it is the closest
		// universal analogue (colour of the interactive text/element on hover).
		category = 'textColour';
	}

	if ( ! category ) {
		return null;
	}

	const subject = words.find( ( w ) => SCOPED_SUBJECT_WORDS.has( w ) ) || null;
	return { category, scoped: !! subject, subject };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function readIfExists( p ) {
	return fs.existsSync( p ) ? fs.readFileSync( p, 'utf8' ) : '';
}

function stripComments( src ) {
	return src
		.replace( /\/\*[\s\S]*?\*\//g, ' ' )
		.replace( /(^|[^:])\/\/[^\n]*/g, '$1 ' )
		.replace( /^\s*#[^\n]*/gm, ' ' );
}

/**
 * Collect attribute names written via setAttributes(...) or the house-style
 * update('attr', val) setter anywhere in `src`. Regex-based (mirrors
 * check-dead-controls.js) — used as the CHECK 1 "is this private attr
 * actually controlled" test, since it is robust and never throws.
 *
 * @param {string} src JS source (block's own edit.js + block-local components).
 * @return {Set<string>} Attribute names with a live control.
 */
function collectControlledAttrs( src ) {
	const controlled = new Set();
	if ( ! src ) {
		return controlled;
	}
	const setAttrRe = /setAttributes\(\s*\{\s*([^}]*)\}/g;
	let m;
	while ( ( m = setAttrRe.exec( src ) ) !== null ) {
		const body = m[ 1 ];
		const keyRe = /(?:^|[\s,])(?:['"]?)([A-Za-z_$][\w$]*)(?:['"]?)\s*:/g;
		let k;
		while ( ( k = keyRe.exec( body ) ) !== null ) {
			controlled.add( k[ 1 ] );
		}
	}
	const updateRe = /\bupdate\(\s*['"]([A-Za-z_$][\w$]*)['"]/g;
	while ( ( m = updateRe.exec( src ) ) !== null ) {
		controlled.add( m[ 1 ] );
	}
	return controlled;
}

/**
 * Read every .js file directly under a block's own components/ dir (its
 * private control components, NOT shared library components) and concatenate
 * with edit.js. Mirrors the "block's own source" corpus used elsewhere.
 *
 * @param {string} blockDir Absolute path to the block's src directory.
 * @return {string} Concatenated, comment-stripped source.
 */
function loadBlockOwnSrc( blockDir ) {
	let src = readIfExists( path.join( blockDir, 'edit.js' ) );
	const componentsDir = path.join( blockDir, 'components' );
	if ( fs.existsSync( componentsDir ) ) {
		for ( const f of fs.readdirSync( componentsDir ) ) {
			if ( f.endsWith( '.js' ) ) {
				src += '\n' + readIfExists( path.join( componentsDir, f ) );
			}
		}
	}
	return stripComments( src );
}

function readBlockJson( dir ) {
	const p = path.join( dir, 'block.json' );
	if ( ! fs.existsSync( p ) ) {
		return null;
	}
	try {
		return JSON.parse( fs.readFileSync( p, 'utf8' ) );
	} catch ( e ) {
		throw new Error( `Invalid block.json in ${ dir }: ${ e.message }` );
	}
}

// ---------------------------------------------------------------------------
// CHECK 1 — universal hover vs private hover
// ---------------------------------------------------------------------------

function checkHoverDuplication( blockSlug, blockDir, meta ) {
	const findings = [];
	const supportsSgs = meta.supports && meta.supports.sgs ? meta.supports.sgs : {};
	const hideList = Array.isArray( supportsSgs.hideExtensions ) ? supportsSgs.hideExtensions : [];
	if ( hideList.includes( 'hover' ) ) {
		// Block opted out of the universal hover extension entirely — its
		// private *Hover attrs are the ONLY hover system, not a duplicate.
		return findings;
	}
	// className:false blocks never receive the universal extension either
	// (hover-effects.js checks type?.supports?.className === false).
	if ( meta.supports && meta.supports.className === false ) {
		return findings;
	}

	const attrs = meta.attributes || {};
	const ownSrc = loadBlockOwnSrc( blockDir );
	const controlled = collectControlledAttrs( ownSrc );

	for ( const attrName of Object.keys( attrs ) ) {
		if ( /^sgs[A-Z]/.test( attrName ) ) {
			continue; // this IS a universal extension attr, not a private one.
		}
		const classification = classifyHoverAttr( attrName );
		if ( ! classification ) {
			continue;
		}
		const { category, scoped, subject } = classification;
		const universalKeepers = UNIVERSAL_HOVER_BY_CATEGORY[ category ] || [];
		if ( universalKeepers.length === 0 ) {
			continue;
		}
		const hasOwnControl = controlled.has( attrName );

		findings.push( {
			check: 'hover-duplicate',
			block: blockSlug,
			attr: attrName,
			category,
			severity: hasOwnControl ? ( scoped ? 'scoped' : 'controlled' ) : ( scoped ? 'scoped-shadow' : 'shadow' ),
			keeper: universalKeepers.join( ' / ' ),
			sources: hasOwnControl
				? [ `${ blockSlug } edit.js: own control for "${ attrName }"`, `universal Hover Effects panel: "${ universalKeepers.join( '" / "' ) }"` ]
				: [ `${ blockSlug } block.json + render.php: "${ attrName }" declared/consumed but no editor control`, `universal Hover Effects panel: "${ universalKeepers.join( '" / "' ) }" (the only LIVE control for this effect)` ],
			reason: hasOwnControl
				? `Block has its own edit.js control for "${ attrName }" (category: ${ category }) while the universal Hover Effects panel ALSO exposes "${ universalKeepers.join( '" / "' ) }" for the same block — the client sees two controls for one visual effect.${ scoped ? ` Scoped to sub-element "${ subject }" — verify it genuinely targets a different element than the universal (whole-block) control before treating as a hard duplicate.` : '' }`
				: `"${ attrName }" (category: ${ category }) is declared in block.json and consumed in render.php/save.js but has NO editor control of its own — it is permanently stuck at its default while the universal "${ universalKeepers.join( '" / "' ) }" control is the only one the client can actually move. Hidden duplicate: two hover systems nominally cover this property, only one is reachable.${ scoped ? ` Scoped to sub-element "${ subject }".` : '' }`,
		} );
	}

	return findings;
}

// ---------------------------------------------------------------------------
// CHECK 2 — same attr, two controls, one edit.js (AST)
// ---------------------------------------------------------------------------

const CONTROL_JSX_NAME_RE = /(Control|Picker|Palette|Select|Toggle|RangeControl|Slider)$/;

/**
 * Does this JSXElement opening-tag name look like an editor control component
 * (SelectControl, ToggleControl, RangeControl, DesignTokenPicker, ColorPalette,
 * a bespoke *Control, etc.)? Deliberately broad — false positives here just
 * mean we track an extra element, which is harmless; false negatives would
 * silently miss a real duplicate.
 *
 * @param {string} name JSX element tag name.
 * @return {boolean} True if it looks like a control component.
 */
function looksLikeControlComponent( name ) {
	if ( ! name || name[ 0 ] !== name[ 0 ].toUpperCase() ) {
		return false; // lowercase = host element (div/span/...), never a control.
	}
	return CONTROL_JSX_NAME_RE.test( name );
}

const AST_SKIP_KEYS = new Set( [ 'loc', 'start', 'end', 'range', 'leadingComments', 'trailingComments' ] );

/**
 * Generic small-tree walk (handler bodies are a handful of statements at
 * most — no need for a full traverse() Path context).
 *
 * @param {Object}   node    Babel AST node or array of nodes.
 * @param {Function} visitor Called with every object node in the tree.
 */
function walkAst( node, visitor ) {
	if ( ! node || typeof node !== 'object' ) {
		return;
	}
	if ( Array.isArray( node ) ) {
		node.forEach( ( n ) => walkAst( n, visitor ) );
		return;
	}
	visitor( node );
	for ( const key of Object.keys( node ) ) {
		if ( AST_SKIP_KEYS.has( key ) ) {
			continue;
		}
		const val = node[ key ];
		if ( val && typeof val === 'object' ) {
			walkAst( val, visitor );
		}
	}
}

/**
 * Collect every bound parameter NAME from a function's params list, including
 * names nested inside object/array destructuring (`{ source, name }`,
 * `[ a, b ]`, defaults). Used to tell a genuine "pass the new value through"
 * write apart from a hardcoded literal stamp (see resolveWrite below).
 *
 * @param {Array} params Babel function params array.
 * @return {Set<string>} Bound identifier names.
 */
function collectParamNames( params ) {
	const names = new Set();
	const visit = ( node ) => {
		if ( ! node ) {
			return;
		}
		if ( node.type === 'Identifier' ) {
			names.add( node.name );
		} else if ( node.type === 'AssignmentPattern' ) {
			visit( node.left );
		} else if ( node.type === 'ObjectPattern' ) {
			for ( const prop of node.properties ) {
				if ( prop.type === 'ObjectProperty' ) {
					visit( prop.value );
				} else if ( prop.type === 'RestElement' ) {
					visit( prop.argument );
				}
			}
		} else if ( node.type === 'ArrayPattern' ) {
			node.elements.forEach( visit );
		} else if ( node.type === 'RestElement' ) {
			visit( node.argument );
		}
	};
	( params || [] ).forEach( visit );
	return names;
}

/**
 * Does `node` reference any name in `paramNames` anywhere within it? Used to
 * distinguish a DYNAMIC write (`setAttributes({ foo: val })` — genuinely
 * passes the control's new value through) from a STATIC write (`setAttributes
 * ({ foo: '' })` / `{ foo: 'external' }` — a hardcoded literal, typically a
 * "reset" affordance or a side-effect state-consistency stamp riding along
 * with a DIFFERENT attr's real write, e.g. sgs/audio's URL field also
 * stamping `audioSource: 'external'`). Static writes are NOT counted as
 * "this control controls that attribute" — only the control whose value
 * prop the client actually manipulates counts.
 *
 * @param {Object}      node       Value expression AST node.
 * @param {Set<string>} paramNames Bound handler parameter names.
 * @return {boolean} True if the value is derived from a handler parameter.
 */
function referencesParam( node, paramNames ) {
	if ( ! node || paramNames.size === 0 ) {
		return false;
	}
	let found = false;
	walkAst( node, ( n ) => {
		if ( n.type === 'Identifier' && paramNames.has( n.name ) ) {
			found = true;
		}
	} );
	return found;
}

/**
 * Resolve a `setAttributes({ key: value })` write to its effective identity +
 * whether it is dynamic. Handles the pervasive "box-object interface" idiom
 * (Spec 32) where MULTIPLE distinct controls each write ONE named sub-key of
 * a shared object attr via self-spread — e.g.
 *   setAttributes({ style: { ...style, spacing: { ...style?.spacing, padding: next } } })
 *   setAttributes({ style: { ...style, spacing: { ...style?.spacing, margin: next } } })
 * are NOT duplicate controls for "style" — they are ONE control each for
 * "style.spacing.padding" and "style.spacing.margin" respectively. Only when
 * an object literal has exactly ONE non-spread key do we descend; 0 or 2+
 * non-spread keys means "this call sets the whole object" and we stop there.
 *
 * @param {string}      baseKey    The key name so far (dot-joined on recursion).
 * @param {Object}      valueNode  The value expression assigned to baseKey.
 * @param {Set<string>} paramNames Bound handler parameter names.
 * @return {{key: string, dynamic: boolean}} Effective attr identity + dynamism.
 */
function resolveWrite( baseKey, valueNode, paramNames ) {
	if ( valueNode && valueNode.type === 'ObjectExpression' ) {
		const nonSpread = valueNode.properties.filter( ( p ) => p.type === 'ObjectProperty' && ! p.computed );
		if ( nonSpread.length === 1 ) {
			const p = nonSpread[ 0 ];
			const subKey = p.key.type === 'Identifier' ? p.key.name : ( p.key.type === 'StringLiteral' ? p.key.value : null );
			if ( subKey ) {
				return resolveWrite( baseKey + '.' + subKey, p.value, paramNames );
			}
		}
	}
	return { key: baseKey, dynamic: referencesParam( valueNode, paramNames ) };
}

/**
 * Extract effective attribute identities written via setAttributes({...}) or
 * update('x', v) inside a function/arrow-function AST node (an onChange
 * handler body) — DYNAMIC writes only (see resolveWrite / referencesParam).
 *
 * @param {Object} fnNode Babel AST node (ArrowFunctionExpression | FunctionExpression).
 * @return {string[]} Effective attribute identities written by this handler.
 */
function resolveDynamicWrites( fnNode ) {
	const found = [];
	if ( ! fnNode ) {
		return found;
	}
	const paramNames = collectParamNames( fnNode.params );

	walkAst( fnNode.body, ( node ) => {
		if ( node.type !== 'CallExpression' ) {
			return;
		}
		const callee = node.callee;
		const isSetAttributes = callee && callee.type === 'Identifier' && callee.name === 'setAttributes';
		const isUpdate = callee && callee.type === 'Identifier' && callee.name === 'update';

		if ( isSetAttributes && node.arguments[ 0 ] && node.arguments[ 0 ].type === 'ObjectExpression' ) {
			for ( const prop of node.arguments[ 0 ].properties ) {
				if ( prop.type !== 'ObjectProperty' || prop.computed ) {
					continue;
				}
				const keyName = prop.key.type === 'Identifier' ? prop.key.name : ( prop.key.type === 'StringLiteral' ? prop.key.value : null );
				if ( ! keyName ) {
					continue;
				}
				const resolved = resolveWrite( keyName, prop.value, paramNames );
				if ( resolved.dynamic ) {
					found.push( resolved.key );
				}
			}
		}
		if ( isUpdate && node.arguments[ 0 ] && node.arguments[ 0 ].type === 'StringLiteral' ) {
			const keyName = node.arguments[ 0 ].value;
			const dynamic = node.arguments[ 1 ] ? referencesParam( node.arguments[ 1 ], paramNames ) : false;
			if ( dynamic ) {
				found.push( keyName );
			}
		}
	} );

	return [ ...new Set( found ) ];
}

/**
 * Parse a block's edit.js with @babel/parser and find, per attribute name,
 * every DISTINCT control-like JSX element whose onChange handler writes it.
 * Returns findings for attrs written by 2+ distinct JSX control elements.
 *
 * Throws on unparseable source — caller catches and logs to unparseable[].
 *
 * @param {string} blockSlug Block name (e.g. 'sgs/card-grid').
 * @param {string} src       edit.js source (NOT comment-stripped — AST handles comments).
 * @return {Array<Object>} Findings.
 */
function checkSameFileDuplicateAst( blockSlug, src ) {
	const findings = [];
	if ( ! src || ! /setAttributes/.test( src ) ) {
		return findings;
	}

	const ast = parser.parse( src, {
		sourceType: 'module',
		plugins: [
			'jsx',
			'classProperties',
			'objectRestSpread',
			'optionalChaining',
			'nullishCoalescingOperator',
			'dynamicImport',
		],
		errorRecovery: true,
	} );

	// attrName -> Array<{ tag, line, exclusiveGroup }>
	const writers = new Map();

	traverse( ast, {
		JSXOpeningElement( pathNode ) {
			const nameNode = pathNode.node.name;
			const tagName = nameNode && nameNode.type === 'JSXIdentifier' ? nameNode.name : null;
			if ( ! looksLikeControlComponent( tagName ) ) {
				return;
			}
			const onChangeAttr = pathNode.node.attributes.find(
				( a ) => a.type === 'JSXAttribute' && a.name && a.name.name === 'onChange'
			);
			if ( ! onChangeAttr || ! onChangeAttr.value || onChangeAttr.value.type !== 'JSXExpressionContainer' ) {
				return;
			}
			const expr = onChangeAttr.value.expression;
			const fnNode =
				expr.type === 'ArrowFunctionExpression' || expr.type === 'FunctionExpression'
					? expr
					: null;
			if ( ! fnNode ) {
				return; // onChange={ someNamedHandler } — not statically resolvable here.
			}
			const attrNames = resolveDynamicWrites( fnNode );
			if ( attrNames.length === 0 ) {
				return; // no dynamic (user-value-derived) write — e.g. a reset button
				// that stamps a hardcoded literal; not "a control for" that attr.
			}
			const line = pathNode.node.loc ? pathNode.node.loc.start.line : 0;

			// Ternary-exclusivity: `cond ? <A onChange=.../> : <B onChange=.../>`
			// renders exactly ONE of the two branches — a feature-detection
			// fallback (e.g. filter-search's NumberControl-vs-TextControl) is not
			// "two knobs", it is one slot with two implementations. If this
			// element's nearest ConditionalExpression ancestor already has an
			// entry for this attr, treat it as the same slot and don't add a
			// second entry.
			const condAncestorPath = pathNode.findParent( ( p ) => p.isConditionalExpression() );
			const exclusiveGroup = condAncestorPath ? condAncestorPath.node : null;

			for ( const attrName of attrNames ) {
				if ( ! writers.has( attrName ) ) {
					writers.set( attrName, [] );
				}
				const list = writers.get( attrName );
				if ( exclusiveGroup && list.some( ( e ) => e.exclusiveGroup === exclusiveGroup ) ) {
					continue; // alternate branch of a ternary already counted for this attr.
				}
				list.push( { tag: tagName, line, exclusiveGroup } );
			}
		},
	} );

	for ( const [ attrName, list ] of writers.entries() ) {
		if ( list.length < 2 ) {
			continue;
		}
		const sources = list.map( ( e ) => `<${ e.tag }> at line ${ e.line }` );
		findings.push( {
			check: 'same-file-duplicate',
			block: blockSlug,
			attr: attrName,
			severity: 'controlled',
			keeper: sources[ 0 ],
			sources,
			reason: `"${ attrName }" is written (with a value genuinely derived from the control's own input, not a hardcoded stamp) by ${ list.length } distinct JSX controls in the same edit.js that do not share a common conditional branch (${ sources.join( ', ' ) }) — the client is shown two knobs for one attribute (or they silently fight over which write wins on re-render).`,
		} );
	}

	return findings;
}

// ---------------------------------------------------------------------------
// CHECK 3 — parent/child duplication (heuristic, composite blocks)
// ---------------------------------------------------------------------------

// Child block slug -> role keywords a parent's own attr name would use for
// the same semantic element. Kept small + justified — extend as new
// composites are audited, do not blanket-generate from the DB (this is an
// editor-UX heuristic, not a render-consumption fact the DB tracks).
const CHILD_ROLE_KEYWORDS = {
	'sgs/heading': [ 'title', 'heading', 'headline' ],
	'sgs/text': [ 'text', 'body', 'description', 'subtitle', 'copy' ],
	'sgs/button': [ 'button', 'cta' ],
	'sgs/media': [ 'image', 'media', 'photo' ],
	'sgs/quote': [ 'quote' ],
	'sgs/icon': [ 'icon' ],
};

// Style-bearing suffix words that indicate an attr is a genuine styling
// control (not, say, a `titleTag` heading-level select or a `titleField`
// data-binding attr) — only THESE combined with a role keyword count as a
// parent/child duplicate candidate.
const STYLE_SUFFIX_RE = /(Colour|Color|FontSize|FontWeight|FontStyle|TextAlign|Align|LetterSpacing|LineHeight|TextTransform|TextDecoration)$/;

/**
 * Extract SGS child block slugs referenced in an InnerBlocks `template`
 * array literal inside edit.js (regex — good enough for a heuristic).
 *
 * @param {string} src edit.js source.
 * @return {Set<string>} Child block slugs found in the template.
 */
function extractTemplateChildSlugs( src ) {
	const slugs = new Set();
	const templateBlockMatch = src.match( /template\s*=\s*\[([\s\S]*?)\n\s*\]\s*;/ );
	const scanSrc = templateBlockMatch ? templateBlockMatch[ 1 ] : src;
	const slugRe = /['"](sgs\/[a-z0-9-]+)['"]/g;
	let m;
	while ( ( m = slugRe.exec( scanSrc ) ) !== null ) {
		slugs.add( m[ 1 ] );
	}
	return slugs;
}

function checkParentChildDuplication( blockSlug, blockDir, meta ) {
	const findings = [];
	const editJs = readIfExists( path.join( blockDir, 'edit.js' ) );
	if ( ! editJs || ! /InnerBlocks|useInnerBlocksProps/.test( editJs ) ) {
		return findings; // not a composite that nests InnerBlocks.
	}
	const childSlugs = extractTemplateChildSlugs( editJs );
	if ( childSlugs.size === 0 ) {
		return findings;
	}

	const attrs = Object.keys( meta.attributes || {} );

	for ( const childSlug of childSlugs ) {
		const roleWords = CHILD_ROLE_KEYWORDS[ childSlug ];
		if ( ! roleWords ) {
			continue;
		}
		for ( const attrName of attrs ) {
			if ( ! STYLE_SUFFIX_RE.test( attrName ) ) {
				continue;
			}
			const lower = attrName.toLowerCase();
			const matchedRole = roleWords.find( ( w ) => lower.startsWith( w.toLowerCase() ) );
			if ( ! matchedRole ) {
				continue;
			}
			findings.push( {
				check: 'parent-child-duplicate',
				block: blockSlug,
				attr: attrName,
				severity: 'scoped',
				keeper: `child ${ childSlug }'s own typography/colour controls`,
				sources: [
					`${ blockSlug } edit.js: parent-level control for "${ attrName }"`,
					`${ childSlug } (mounted via this block's InnerBlocks template, role "${ matchedRole }"): its own native typography/colour controls`,
				],
				reason: `"${ attrName }" (role "${ matchedRole }") is a parent-level styling attr on ${ blockSlug }, which also mounts a ${ childSlug } InnerBlock for that same role. ${ childSlug } owns real typography/colour controls for itself — whichever wins on CSS specificity, the client is shown two places to set the same visual property. Verify: does the parent attr actually still drive rendered CSS, or is it a dead-by-specificity leftover (check-dead-controls' angle) that should be removed in favour of the child's own controls?`,
			} );
		}
	}

	return findings;
}

// ---------------------------------------------------------------------------
// Baseline
// ---------------------------------------------------------------------------

function loadBaseline() {
	if ( ! fs.existsSync( BASELINE_FILE ) ) {
		return [];
	}
	try {
		const data = JSON.parse( fs.readFileSync( BASELINE_FILE, 'utf8' ) );
		return Array.isArray( data.accepted ) ? data.accepted : [];
	} catch ( e ) {
		throw new Error( `Invalid duplicate-controls-baseline.json: ${ e.message }` );
	}
}

function findingKey( f ) {
	return `${ f.check }:${ f.block }:${ f.attr }`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
	const asJson = process.argv.includes( '--json' );
	// --check kept for CLI symmetry with the sibling guards; this script is
	// WARN-ONLY and never fails the build, so it changes nothing here.

	const blockDirs = fs
		.readdirSync( BLOCKS_DIR, { withFileTypes: true } )
		.filter( ( d ) => d.isDirectory() && d.name !== 'extensions' )
		.map( ( d ) => path.join( BLOCKS_DIR, d.name ) );

	let findings = [];
	const unparseable = [];

	for ( const dir of blockDirs ) {
		let meta;
		try {
			meta = readBlockJson( dir );
		} catch ( e ) {
			unparseable.push( { dir, reason: `block.json: ${ e.message }` } );
			continue;
		}
		if ( ! meta ) {
			continue;
		}
		const blockSlug = meta.name || path.basename( dir );

		try {
			findings = findings.concat( checkHoverDuplication( blockSlug, dir, meta ) );
		} catch ( e ) {
			unparseable.push( { dir: blockSlug, reason: `hover-duplicate check: ${ e.message }` } );
		}

		try {
			findings = findings.concat( checkParentChildDuplication( blockSlug, dir, meta ) );
		} catch ( e ) {
			unparseable.push( { dir: blockSlug, reason: `parent-child check: ${ e.message }` } );
		}

		const editJsPath = path.join( dir, 'edit.js' );
		if ( fs.existsSync( editJsPath ) ) {
			try {
				const src = fs.readFileSync( editJsPath, 'utf8' );
				findings = findings.concat( checkSameFileDuplicateAst( blockSlug, src ) );
			} catch ( e ) {
				unparseable.push( { dir: blockSlug, reason: `same-file-duplicate (AST): ${ e.message }` } );
			}
		}
	}

	// Baseline subtraction.
	const baseline = new Set( loadBaseline().map( findingKey ) );
	const netNew = findings.filter( ( f ) => ! baseline.has( findingKey( f ) ) );
	const accepted = findings.filter( ( f ) => baseline.has( findingKey( f ) ) );

	if ( asJson ) {
		process.stdout.write(
			JSON.stringify(
				{ netNew, accepted, baselineSize: baseline.size, unparseable, blocksScanned: blockDirs.length },
				null,
				2
			) + '\n'
		);
	} else {
		process.stdout.write(
			`[check-duplicate-controls] WARN-ONLY. Scanned ${ blockDirs.length } blocks.\n`
		);
		if ( accepted.length ) {
			process.stdout.write( `${ accepted.length } baselined finding(s) (accepted with reason).\n` );
		}
		if ( unparseable.length ) {
			process.stdout.write(
				`${ unparseable.length } block(s) could not be fully parsed (skipped, logged — not a failure):\n`
			);
			for ( const u of unparseable ) {
				process.stdout.write( `  - ${ u.dir }: ${ u.reason }\n` );
			}
		}
		if ( netNew.length ) {
			process.stdout.write( `\n${ netNew.length } net-new duplicate-control finding(s):\n\n` );
			const byCheck = {};
			for ( const f of netNew ) {
				byCheck[ f.check ] = byCheck[ f.check ] || [];
				byCheck[ f.check ].push( f );
			}
			for ( const [ checkName, list ] of Object.entries( byCheck ) ) {
				process.stdout.write( `--- ${ checkName } (${ list.length }) ---\n` );
				for ( const f of list ) {
					process.stdout.write(
						`  BLOCK:    ${ f.block }\n` +
						`  ATTR:     ${ f.attr }\n` +
						`  SEVERITY: ${ f.severity }\n` +
						`  SOURCES:  ${ f.sources.join( '  <->  ' ) }\n` +
						`  KEEPER:   ${ f.keeper }\n` +
						`  REASON:   ${ f.reason }\n\n`
					);
				}
			}
		} else {
			process.stdout.write( '\nNo net-new duplicate-control findings.\n' );
		}
	}

	// Always exit 0 — WARN-ONLY by design, no --check enforcement.
	process.exit( 0 );
}

main();

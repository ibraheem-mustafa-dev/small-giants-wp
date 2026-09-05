'use strict';

/**
 * migrate-fill-custom-property-gradient.js
 *
 * The narrow, proven codemod the adversarial council asked for instead of a
 * universal auto-fix classifier: ONE shape, hand-verified 5+ times tonight
 * (option-picker, tabs, modal, trust-bar, mega-panel, timeline.connectorColour,
 * audio.accentColour), now scripted the same way this project's own
 * migrate-render-closures.py / migrate-length-sanitiser.py / migrate-tier-
 * object.py already succeed: one script, one shape, survey -> fix -> check.
 *
 * THE SHAPE: `$var = $attributes['ATTR'] ?? DEFAULT;` (optionally re-resolved
 * once through `sgs_colour_value()` into a second var), reaching, with NO
 * OTHER transform in between, exactly one line of the form
 * `'--sgs-x:' . sgs_colour_value( $var )` pushed into an array later joined
 * into a scoped <style> block. No gradient sibling wired.
 *
 * REFUSES (never guesses) three known-different shapes found while scoping
 * this script tonight — each is a real 4th/5th shape, not a variant of this
 * one, and needs its own codemod or hand fix:
 *   - a `sanitize_html_class()`/`sgs_resolve_palette_hex()` detour between the
 *     attribute read and the colour resolution (mega-panel.accentBackground
 *     Image, nav-menu.featuredBg) — a slug-derivation shape, not this one.
 *   - a `foreach ( $map as $prop => $val )` loop building several custom
 *     properties from one associative array (product-search's 5 rows) — a
 *     real 4th shape, needs its own migrate-*-loop-map.js pass.
 *   - anything this script cannot find a SINGLE unambiguous emission line
 *     for, ever — printed with the exact reason, never patched blind.
 *
 * Modes: --survey | --fix [--apply] | --check | --self-test
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { BLOCKS_DIR } = require( './survey.js' );

const TARGET_ROWS = [
	{ block: 'breadcrumbs', attr: 'currentColour' },
	{ block: 'timeline', attr: 'dateColour' },
	{ block: 'timeline', attr: 'connectorFillColour' },
	{ block: 'before-after', attr: 'dividerColour' },
	{ block: 'before-after', attr: 'handleIconColour' },
	{ block: 'business-info', attr: 'linkHoverBackgroundImage' },
	{ block: 'business-info', attr: 'linkHoverTextColour' },
];

// Rows in this exact backlog bucket that DO NOT match this shape — named so
// nobody re-investigates them believing this script should have covered
// them. See the module docblock for why each is excluded.
const KNOWN_DIFFERENT_SHAPE = {
	'mega-panel.accentBackgroundImage': 'slug-derivation via sanitize_html_class() before sgs_colour_value() — not this shape',
	'nav-menu.featuredBg': 'resolves via sgs_resolve_palette_hex(), never reaches sgs_colour_value() — not this shape',
	'product-search.inputBorderColour': 'foreach-over-map emission (5 rows share one array) — a distinct 4th shape, needs its own script',
	'product-search.focusRingColour': 'foreach-over-map emission — see inputBorderColour',
	'product-search.listboxBackgroundColour': 'foreach-over-map emission — see inputBorderColour',
	'product-search.resultHoverBackgroundColour': 'foreach-over-map emission — see inputBorderColour',
	'product-search.matchHighlightColour': 'foreach-over-map emission — see inputBorderColour',
	'audio.spectrumColour': 'canvas fillStyle/strokeStyle consumer, not CSS at all — no CSS fix applies',
};

// ---------------------------------------------------------------------------
// Detection — find the ONE var chain + ONE emission line, refuse on anything
// ambiguous or transformed.
// ---------------------------------------------------------------------------

function findVarAssignment( php, attr ) {
	// `$var = $attributes['attr'] ?? DEFAULT;` OR `$var = (string) ( $attributes['attr'] ?? DEFAULT );`
	const re = new RegExp(
		'\\$([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*(?:\\(string\\)\\s*)?\\(?\\s*\\$attributes\\[\\s*[\'"]' + attr + '[\'"]\\s*\\]\\s*\\?\\?\\s*([^;)\\n]*)\\)?\\s*;',
		'g'
	);
	const matches = [];
	let m;
	while ( ( m = re.exec( php ) ) !== null ) matches.push( { varName: m[ 1 ], stmt: m[ 0 ] } );
	return matches;
}

function findDirectEmission( php, varName ) {
	// `$arr[] = '--sgs-x:' . sgs_colour_value( $var );` — zero-hop.
	const re = new RegExp(
		"\\$(\\w+)\\[\\]\\s*=\\s*'(--sgs-[a-z0-9-]+):'\\s*\\.\\s*sgs_colour_value\\(\\s*\\$" + varName + '\\s*\\)\\s*;',
		'g'
	);
	const matches = [];
	let m;
	while ( ( m = re.exec( php ) ) !== null ) {
		matches.push( { arrayVar: m[ 1 ], cssVar: m[ 2 ], hop: 'direct', fullStmt: m[ 0 ] } );
	}
	return matches;
}

function findPreResolvedEmission( php, varName ) {
	// `$resolved = sgs_colour_value( $var );` then `if ('' !== $resolved) { $arr[] = '--sgs-x:' . $resolved; }`
	const resolveRe = new RegExp( '\\$([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*sgs_colour_value\\(\\s*\\$' + varName + '\\s*\\)\\s*;', 'g' );
	const matches = [];
	let m;
	while ( ( m = resolveRe.exec( php ) ) !== null ) {
		const resolvedVar = m[ 1 ];
		const emitRe = new RegExp(
			"\\$(\\w+)\\[\\]\\s*=\\s*'(--sgs-[a-z0-9-]+):'\\s*\\.\\s*\\$" + resolvedVar + '\\s*;'
		);
		const em = emitRe.exec( php );
		if ( em ) {
			matches.push( { arrayVar: em[ 1 ], cssVar: em[ 2 ], hop: 'pre-resolved', resolvedVar, fullStmt: em[ 0 ], resolveStmt: m[ 0 ] } );
		}
	}
	return matches;
}

function classifyRow( block, attr ) {
	const renderFile = path.join( BLOCKS_DIR, block, 'render.php' );
	if ( ! fs.existsSync( renderFile ) ) return { ok: false, reason: 'no-render-php' };
	const php = fs.readFileSync( renderFile, 'utf8' );

	const varMatches = findVarAssignment( php, attr );
	if ( varMatches.length === 0 ) return { ok: false, reason: 'no-attribute-read-found' };
	if ( varMatches.length > 1 ) return { ok: false, reason: 'multiple-attribute-reads-ambiguous' };
	const { varName } = varMatches[ 0 ];

	const direct = findDirectEmission( php, varName );
	const preResolved = findPreResolvedEmission( php, varName );
	const all = [ ...direct, ...preResolved ];

	if ( all.length === 0 ) return { ok: false, reason: 'no-single-unambiguous-emission-line-found' };
	if ( all.length > 1 ) return { ok: false, reason: 'multiple-emission-sites-ambiguous' };

	return { ok: true, php, renderFile, varName, ...all[ 0 ] };
}

// ---------------------------------------------------------------------------
// Fix generation — block.json + render.php + style.css + edit.js.
// ---------------------------------------------------------------------------

function toPascal( attr ) {
	return attr.charAt( 0 ).toUpperCase() + attr.slice( 1 );
}

function planRow( block, attr ) {
	const cls = classifyRow( block, attr );
	if ( ! cls.ok ) return cls;

	const gradAttr = attr + 'Gradient';
	const cssVarBase = cls.cssVar.replace( /^--/, '' ); // e.g. 'sgs-breadcrumbs-current-colour'

	// --- block.json patch: add gradAttr + attrMap entry -----------------
	const blockJsonPath = path.join( BLOCKS_DIR, block, 'block.json' );
	const blockJsonRaw = fs.readFileSync( blockJsonPath, 'utf8' );
	let blockJson;
	try {
		blockJson = JSON.parse( blockJsonRaw );
	} catch ( e ) {
		return { ok: false, reason: 'block-json-parse-error' };
	}
	if ( blockJson.attributes && blockJson.attributes[ gradAttr ] ) {
		return { ok: false, reason: 'gradient-attribute-already-declared' };
	}
	const attrMapEntry = findAttrMapEntry( blockJson, attr );
	if ( ! attrMapEntry ) {
		return { ok: false, reason: 'no-attrMap-entry-for-base-attribute-found' };
	}

	// --- render.php patch -------------------------------------------------
	const renderPhpEdits = buildRenderPhpEdits( cls, attr, gradAttr );

	// --- style.css patch ---------------------------------------------------
	const styleCssPath = findStyleCssPath( block );
	const styleCssEdits = styleCssPath
		? buildStyleCssEdits( fs.readFileSync( styleCssPath, 'utf8' ), cls.cssVar )
		: { path: null, count: 0, text: null };
	if ( styleCssPath && styleCssEdits.count === 0 ) {
		return { ok: false, reason: 'no-style-css-consumer-found-for-custom-property' };
	}

	// --- edit.js patch ------------------------------------------------------
	const editJsPath = path.join( BLOCKS_DIR, block, 'edit.js' );
	const editJsEdits = fs.existsSync( editJsPath )
		? buildEditJsEdits( fs.readFileSync( editJsPath, 'utf8' ), attr, gradAttr, cssVarBase )
		: null;
	if ( ! editJsEdits || ! editJsEdits.ok ) {
		return { ok: false, reason: 'edit-js-row-pattern-not-recognised:' + ( editJsEdits ? editJsEdits.reason : 'no-edit-js' ) };
	}

	return {
		ok: true,
		block,
		attr,
		gradAttr,
		cssVar: cls.cssVar,
		blockJsonPath,
		blockJsonNewText: applyBlockJsonPatch( blockJsonRaw, blockJson, attr, gradAttr, attrMapEntry ),
		renderPhpPath: cls.renderFile,
		renderPhpNewText: renderPhpEdits.newText,
		styleCssPath,
		styleCssNewText: styleCssEdits.text,
		editJsPath,
		editJsNewText: editJsEdits.newText,
	};
}

function findAttrMapEntry( blockJson, attr ) {
	const elements = blockJson.supports && blockJson.supports.sgs && blockJson.supports.sgs.elements;
	if ( ! elements ) return null;
	for ( const [ elName, el ] of Object.entries( elements ) ) {
		if ( ! el || ! el.attrMap ) continue;
		for ( const [ member, value ] of Object.entries( el.attrMap ) ) {
			if ( value === attr && member.startsWith( 'css:' ) ) {
				return { elementName: elName, cssMember: member };
			}
		}
	}
	return null;
}

function applyBlockJsonPatch( rawText, blockJson, attr, gradAttr, attrMapEntry ) {
	// Insert the new attribute right after the base attribute's own block in
	// "attributes", and add the attrMap sibling entry — both as targeted
	// string edits on the ORIGINAL text (preserves formatting/comments byte-
	// for-byte outside the two touched spots), not a JSON.stringify rewrite.
	let text = rawText;

	// 1) attrMap sibling: "css:background-color": "attr" -> also add
	//    "css:background-image": "gradAttr" on the next line, same indent.
	const attrMapRe = new RegExp(
		'([\\t ]*)"' + attrMapEntry.cssMember.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) + '"\\s*:\\s*"' + attr + '"'
	);
	const attrMapMatch = attrMapRe.exec( text );
	if ( ! attrMapMatch ) return null;
	const indent = attrMapMatch[ 1 ];
	const imageMember = attrMapEntry.cssMember.startsWith( 'css:background' )
		? 'css:background-image'
		: attrMapEntry.cssMember + '-gradient';
	const replacement = attrMapMatch[ 0 ] + ',\n' + indent + '"' + imageMember + '": "' + gradAttr + '"';
	text = text.slice( 0, attrMapMatch.index ) + replacement + text.slice( attrMapMatch.index + attrMapMatch[ 0 ].length );

	// 2) new attribute declaration, right after the base attr's own block.
	const attrDeclRe = new RegExp( '([\\t ]*)"' + attr + '"\\s*:\\s*\\{[^}]*\\}' );
	const attrDeclMatch = attrDeclRe.exec( text );
	if ( ! attrDeclMatch ) return null;
	const declIndent = attrDeclMatch[ 1 ];
	const newAttrBlock =
		attrDeclMatch[ 0 ] +
		',\n' +
		declIndent +
		'"' +
		gradAttr +
		'": {\n' +
		declIndent +
		'\t"type": "string",\n' +
		declIndent +
		'\t"default": "",\n' +
		declIndent +
		'\t"description": "CSS gradient string painting via background-image (helpers-tokens.php sgs_custom_property_gradient_decls). Non-empty wins over ' +
		attr +
		'."\n' +
		declIndent +
		'}';
	text = text.slice( 0, attrDeclMatch.index ) + newAttrBlock + text.slice( attrDeclMatch.index + attrDeclMatch[ 0 ].length );

	return text;
}

function buildRenderPhpEdits( cls, attr, gradAttr ) {
	const { php, varName, arrayVar, cssVar, hop, resolvedVar, fullStmt, resolveStmt } = cls;
	const cssVarName = cssVar.replace( /^--/, '' );
	const gradVarDecl = 'const ' + varName + '_gradient_read'; // unused placeholder to keep lints quiet — replaced below
	const gradientReadLine = '$' + varName + '_gradient = $attributes[\'' + gradAttr + '\'] ?? \'\';\n';

	let newText = php;

	if ( hop === 'direct' ) {
		const replacement =
			gradientReadLine +
			'$' + arrayVar + ' = array_merge( $' + arrayVar + ', sgs_custom_property_gradient_decls( \'' + cssVarName + '\', $' + varName + ', $' + varName + '_gradient ) );';
		newText = newText.replace( fullStmt, replacement );
	} else {
		// pre-resolved: keep the resolve line, add a gradient-read line before
		// it, and replace the emission with the merged helper call — the
		// intermediate $resolvedVar becomes unused but harmless (still used by
		// the resolve statement itself; PHP does not warn on this).
		const replacement =
			gradientReadLine +
			'$' + arrayVar + ' = array_merge( $' + arrayVar + ', sgs_custom_property_gradient_decls( \'' + cssVarName + '\', $' + varName + ', $' + varName + '_gradient ) );';
		newText = newText.replace( fullStmt, replacement );
	}

	return { newText };
}

function findStyleCssPath( block ) {
	for ( const name of [ 'style.css', 'style.scss' ] ) {
		const p = path.join( BLOCKS_DIR, block, name );
		if ( fs.existsSync( p ) ) return p;
	}
	return null;
}

function buildStyleCssEdits( css, cssVar ) {
	// For every rule declaring `background-color: var(--x, ...)` or
	// `background: var(--x, ...)` (as the WHOLE value, not composed inside a
	// larger gradient/shorthand — refuse rather than guess on those), add a
	// sibling `background-image: var(--x-gradient, none);` line right after.
	// The fallback-default group is OPTIONAL — `var(--x)` with no fallback
	// (timeline's 3 real consumers, style.scss:89,875,890) is the same shape
	// as `var(--x, default)`, just without a default. The "whole value on its
	// own line" constraint (anchored `^…$`, property name = background(-color)
	// only) is unchanged, so a composed value like
	// `background-image: linear-gradient(90deg, var(--x, default) 50%, …)`
	// still correctly refuses — its property token is `background-image`,
	// which this group never matches, and its `var(...)` is not the whole
	// value anyway.
	const gradVar = cssVar + '-gradient';
	const lineRe = new RegExp( '^([\\t ]*)(background(?:-color)?)\\s*:\\s*var\\(\\s*' + cssVar + '\\s*(?:,[^)]*)?\\)\\s*;\\s*$', 'gm' );
	let count = 0;
	const newCss = css.replace( lineRe, ( full, indent ) => {
		count++;
		return full + '\n' + indent + 'background-image: var(' + gradVar + ', none);';
	} );
	return { text: newCss, count };
}

/**
 * Scan backward from `idx` for the nearest unmatched `{` that opens the
 * object literal containing position `idx` — a real brace-balance walk,
 * not a regex guess, so it doesn't care what's inside the object (nested
 * braces, i18n calls with their own parens, arrow functions, etc.).
 */
function findEnclosingBraceStart( text, idx ) {
	let depth = 0;
	for ( let i = idx; i >= 0; i-- ) {
		const c = text[ i ];
		if ( c === '}' ) depth++;
		else if ( c === '{' ) {
			if ( depth === 0 ) return i;
			depth--;
		}
	}
	return -1;
}

/** Forward counterpart of findEnclosingBraceStart — the matching `}` for an opening `{` at `start`. */
function findMatchingBraceEnd( text, start ) {
	let depth = 0;
	for ( let i = start; i < text.length; i++ ) {
		const c = text[ i ];
		if ( c === '{' ) depth++;
		else if ( c === '}' ) {
			depth--;
			if ( depth === 0 ) return i;
		}
	}
	return -1;
}

/**
 * Finds the `{ key: 'normal', label: …, value: ATTR, onChange: … }` state
 * object for `attr`, wherever it lives — inside an SgsColourPanel row's
 * `states` array OR a bare `<DesignTokenPicker states={[…]} />` array. Both
 * shapes use the IDENTICAL state-object literal; only what wraps them
 * differs (a plain JS row-descriptor object vs a JSX component prop).
 *
 * Replaces the old `stateRe` regex (`label:[^,]*,`), which silently failed
 * on every real row in this codebase — `label: __( 'Normal', 'sgs-blocks' )`
 * has its OWN internal comma inside the i18n call, so `[^,]*` stopped
 * there and the rest of the pattern never lined up. Proven broken via
 * `node -e` against both before-after.dividerColour and
 * timeline.connectorFillColour before this fix; both are real target rows,
 * not an invented fixture.
 *
 * Finds the object by brace-balancing OUTWARD from a `value: ATTR,` match,
 * rather than trying to parse the whole object left-to-right — so nothing
 * inside `label`'s own value (parens, nested calls, extra commas) can
 * confuse it.
 */
function findStateObjectForAttr( js, attr ) {
	const valueRe = new RegExp( 'value:\\s*' + attr + '\\s*,' );
	let searchFrom = 0;
	for ( ;; ) {
		const rel = valueRe.exec( js.slice( searchFrom ) );
		if ( ! rel ) return null;
		const valueIdx = searchFrom + rel.index;
		searchFrom = valueIdx + rel[ 0 ].length;

		const objStart = findEnclosingBraceStart( js, valueIdx );
		if ( objStart === -1 ) continue;
		const objEnd = findMatchingBraceEnd( js, objStart );
		if ( objEnd === -1 ) continue;

		// Require a sibling `key: '...'` BEFORE `value:` inside this same
		// object — the shape both mechanisms share — so an unrelated
		// `value: attr,` elsewhere (e.g. inside a different helper call)
		// can't be mistaken for a state-object row.
		const before = js.slice( objStart, valueIdx );
		if ( ! /key:\s*['"]\w+['"]/.test( before ) ) continue;

		const rest = js.slice( valueIdx, objEnd + 1 );
		const onChangeRel = /onChange:/.exec( rest );
		if ( ! onChangeRel ) continue;
		const onChangeStart = valueIdx + onChangeRel.index + onChangeRel[ 0 ].length;

		return { objStart, objEnd, onChangeStart };
	}
}

function buildEditJsEdits( js, attr, gradAttr, cssVarBase ) {
	// Refuse rather than guess: require the base attr to already be
	// destructured from `attributes` at least once, and require a
	// recognisable colour-control row to exist. This mirrors every hand-fix
	// done tonight — a row matching neither shape is a different edit.js
	// shape this script does not attempt.
	if ( ! new RegExp( '\\b' + attr + ',' ).test( js ) ) return { ok: false, reason: 'attr-not-destructured' };

	// Shape 1 — SgsColourPanel row: a `{ key:, label:, states: […] }` row
	// descriptor object passed into the panel's `rows` array.
	const rowRe = new RegExp( '(\\{[^{}]*key:\\s*[\'"]\\w+[\'"][^{}]*label:[^{}]*states:\\s*\\[[^\\]]*value:\\s*' + attr + ',[^\\]]*\\])', 's' );
	// Shape 2 — a bare `<DesignTokenPicker … states={[…]} />` (or
	// `<GradientCapableColourControl>`) mount: `label` is a JSX prop of the
	// component itself, not a sibling field inside a row object, so Shape
	// 1's regex structurally cannot match it (no enclosing `{ key:, label:,
	// states: }` object exists). Confirmed common across the wider
	// fill-custom-property-gradient backlog (star-rating, trust-bar,
	// mega-panel, business-info, card-grid, audio, and others). Detected by
	// finding the JSX opening tag whose `states={…}` prop contains a
	// `value: ATTR,` state — deliberately NOT matched by searching for a
	// literal `<DesignTokenPicker` tag inside an SgsColourPanel `rows`
	// array, because that array is plain JS data (row descriptor objects),
	// never a literal JSX element — so the two shapes cannot double-match
	// the same source in this codebase. Verified directly against
	// before-after/edit.js, which mounts BOTH shapes in one file (its
	// SgsColourPanel `rows` array + several bare DesignTokenPicker panels).
	const dtpTagRe = new RegExp(
		'<(DesignTokenPicker|GradientCapableColourControl)\\b[^>]*?\\sstates=\\{[\\s\\S]*?value:\\s*' + attr + ',[\\s\\S]*?\\]\\s*\\}[^>]*?/>',
		'g'
	);
	const isRowShape = rowRe.test( js );
	const isDtpShape = ! isRowShape && dtpTagRe.test( js );
	if ( ! isRowShape && ! isDtpShape ) {
		return { ok: false, reason: 'no-recognisable-colour-control-row-for-attr' };
	}

	let newText = js;
	// 1) destructure the gradient attr next to the base one.
	newText = newText.replace( new RegExp( '(\\b' + attr + ',)' ), '$1\n\t\t' + gradAttr + ',' );

	// 2) mirror into the canvas custom-property object, next to the flat mirror line.
	const mirrorRe = new RegExp( "(rootStyle\\[\\s*'--" + cssVarBase + "'\\s*\\]\\s*=[^\\n]*\\n)" );
	if ( mirrorRe.test( newText ) ) {
		newText = newText.replace(
			mirrorRe,
			'$1\tif ( ' + gradAttr + ' )       rootStyle[ \'--' + cssVarBase + '-gradient\' ]      = ' + gradAttr + ';\n'
		);
	}

	// 3) the state object: add gradientValue/onGradientChange to the
	//    specific state entry whose value is the base attr — works
	//    identically for both shapes, since both wrap the SAME state-object
	//    literal (see findStateObjectForAttr's docblock). Insert after the
	//    END of the onChange arrow function's own statement (its own
	//    trailing comma before the next prop or the closing brace) rather
	//    than a naive [^,}]* class, which breaks on an onChange body like
	//    `( val ) => setAttributes( { attr: val } )` — that body's OWN `}`
	//    terminates the naive class early. findOnChangeStatementEnd() finds
	//    the real end by paren-balancing from `onChange:` onward.
	const found1 = findStateObjectForAttr( newText, attr );
	if ( ! found1 ) return { ok: false, reason: 'state-object-pattern-not-matched-for-edit' };
	const found = findOnChangeStatementEnd( newText, found1.onChangeStart );
	if ( found === null ) return { ok: false, reason: 'could-not-find-end-of-onChange-statement' };
	const newProps = '\n\t\t\t\t\t\t\t\tgradientValue: ' + gradAttr + ',\n\t\t\t\t\t\t\t\tonGradientChange: ( val ) => setAttributes( { ' + gradAttr + ": val ?? '' } ),";
	newText =
		found.delimiter === ','
			? newText.slice( 0, found.index + 1 ) + newProps + newText.slice( found.index + 1 )
			: newText.slice( 0, found.index ) + ',' + newProps + newText.slice( found.index );

	return { ok: true, newText };
}

/**
 * Given the index right after `onChange:` in a JSX object-literal state
 * entry, paren/brace-balance forward through the arrow-function value to
 * find the position of the trailing comma (or closing `}` if it's the last
 * prop) that ends this statement — i.e. a real end, not a regex guess that
 * a nested `}` inside the arrow body could fool.
 */
function findOnChangeStatementEnd( text, start ) {
	let depth = 0;
	let started = false;
	for ( let i = start; i < text.length; i++ ) {
		const c = text[ i ];
		if ( c === '(' || c === '{' || c === '[' ) { depth++; started = true; continue; }
		if ( c === ')' || c === '}' || c === ']' ) { depth--; continue; }
		if ( started && depth === 0 && ( c === ',' || c === '}' ) ) {
			return { index: i, delimiter: c };
		}
	}
	return null;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function runSurvey() {
	console.log( 'migrate-fill-custom-property-gradient — SURVEY\n' );
	for ( const { block, attr } of TARGET_ROWS ) {
		const plan = planRow( block, attr );
		console.log( '  ' + ( plan.ok ? 'FIXABLE ' : 'REFUSED ' ).padEnd( 9 ) + block + '.' + attr + ( plan.ok ? '' : '  — ' + plan.reason ) );
	}
	console.log( '\nKnown different-shape rows in this backlog bucket (not attempted by this script):' );
	for ( const [ key, reason ] of Object.entries( KNOWN_DIFFERENT_SHAPE ) ) {
		console.log( '  ' + key + '  — ' + reason );
	}
}

function runFix( apply ) {
	console.log( 'migrate-fill-custom-property-gradient — FIX' + ( apply ? ' (writing)' : ' (dry run)' ) + '\n' );
	let fixed = 0;
	let refused = 0;
	for ( const { block, attr } of TARGET_ROWS ) {
		const plan = planRow( block, attr );
		if ( ! plan.ok ) {
			console.log( '  REFUSED  ' + block + '.' + attr + '  — ' + plan.reason );
			refused++;
			continue;
		}
		console.log( '  FIXABLE  ' + block + '.' + attr + '  (custom property ' + plan.cssVar + ')' );
		if ( apply ) {
			if ( plan.blockJsonNewText ) fs.writeFileSync( plan.blockJsonPath, plan.blockJsonNewText );
			else { console.log( '    SKIPPED — block.json patch failed to build' ); continue; }
			fs.writeFileSync( plan.renderPhpPath, plan.renderPhpNewText );
			if ( plan.styleCssPath && plan.styleCssNewText ) fs.writeFileSync( plan.styleCssPath, plan.styleCssNewText );
			fs.writeFileSync( plan.editJsPath, plan.editJsNewText );
			fixed++;
		} else {
			fixed++;
		}
	}
	console.log( '\n' + ( apply ? 'Applied' : 'Would apply' ) + ' ' + fixed + ' fix(es), ' + refused + ' refused.' );
}

function runCheck() {
	// Gate: every TARGET_ROW must now classify as already-fixed by
	// survey.js's own independent gradientExtensibility trace (never trust
	// this script's own before/after diff as its own proof).
	const { execFileSync } = require( 'child_process' );
	const out = execFileSync( 'node', [ path.join( __dirname, 'survey.js' ), '--json' ] ).toString();
	const data = JSON.parse( out );
	let bad = 0;
	for ( const { block, attr } of TARGET_ROWS ) {
		const row = data.rows.find( ( r ) => r.block === 'sgs/' + block && r.attr === attr );
		if ( row && row.needsGradient ) {
			console.log( '[check] STILL NEEDS GRADIENT: ' + block + '.' + attr + '  verdict=' + row.verdict );
			bad++;
		}
	}
	if ( bad === 0 ) {
		console.log( '[check] PASS — all targeted rows resolve needsGradient=false per survey.js.' );
	} else {
		console.log( '[check] FAIL — ' + bad + ' row(s) still need gradient.' );
		process.exitCode = 1;
	}
}

function runSelfTest() {
	let failures = 0;
	function assert( cond, msg ) {
		if ( ! cond ) { console.log( '  FAIL: ' + msg ); failures++; }
	}

	// Positive control — a synthetic fixture matching the direct shape.
	const directPhp =
		"$foo_colour = \$attributes['fooColour'] ?? '';\n" +
		"if ( \$foo_colour ) {\n\t\$var_decls[] = '--sgs-foo:' . sgs_colour_value( \$foo_colour );\n}\n";
	const directMatches = findVarAssignment( directPhp, 'fooColour' );
	assert( directMatches.length === 1 && directMatches[ 0 ].varName === 'foo_colour', 'direct var-assignment detection' );
	const directEmit = findDirectEmission( directPhp, 'foo_colour' );
	assert( directEmit.length === 1 && directEmit[ 0 ].cssVar === '--sgs-foo', 'direct emission detection' );

	// Positive control — pre-resolved 2-hop shape.
	const preResolvedPhp =
		"$bar_colour = \$attributes['barColour'] ?? '';\n" +
		"$bar_resolved = sgs_colour_value( \$bar_colour );\n" +
		"if ( '' !== \$bar_resolved ) {\n\t\$decls[] = '--sgs-bar:' . \$bar_resolved;\n}\n";
	const preEmit = findPreResolvedEmission( preResolvedPhp, 'bar_colour' );
	assert( preEmit.length === 1 && preEmit[ 0 ].cssVar === '--sgs-bar', 'pre-resolved emission detection' );

	// Negative control — a sanitize_html_class() detour must NOT match either shape.
	const detourPhp =
		"$baz_slug = sanitize_html_class( (string) (\$attributes['bazColour'] ?? '') );\n" +
		"$baz_resolved = sgs_colour_value( \$baz_slug );\n" +
		"$decls[] = '--sgs-baz:' . \$baz_resolved;\n";
	// The sanitize_html_class() wrapper means the RHS never starts with
	// `$attributes[...]` directly, so findVarAssignment correctly finds ZERO
	// matches — classifyRow refuses with 'no-attribute-read-found'. That IS
	// the correct refusal; asserting a match count of 1 here would be wrong.
	const detourVarMatches = findVarAssignment( detourPhp, 'bazColour' );
	assert( detourVarMatches.length === 0, 'detour shape correctly REFUSED (sanitize_html_class breaks the direct-read trace)' );

	// Negative control — multiple emission sites must refuse, not guess.
	const ambiguousPhp =
		"$qux_colour = \$attributes['quxColour'] ?? '';\n" +
		"\$a[] = '--sgs-qux-1:' . sgs_colour_value( \$qux_colour );\n" +
		"\$b[] = '--sgs-qux-2:' . sgs_colour_value( \$qux_colour );\n";
	const ambigEmit = findDirectEmission( ambiguousPhp, 'qux_colour' );
	assert( ambigEmit.length === 2, 'ambiguous case: both sites found (classifyRow refuses on length>1, checked by caller)' );

	console.log( '\n' + ( failures === 0 ? 'ALL SELF-TESTS PASSED' : failures + ' SELF-TEST(S) FAILED' ) + '\n' );
	return failures === 0;
}

function main() {
	const argv = process.argv.slice( 2 );
	if ( argv.includes( '--self-test' ) ) { process.exit( runSelfTest() ? 0 : 1 ); return; }
	if ( argv.includes( '--survey' ) ) return runSurvey();
	if ( argv.includes( '--fix' ) ) return runFix( argv.includes( '--apply' ) );
	if ( argv.includes( '--check' ) ) return runCheck();
	console.log( 'Usage: node migrate-fill-custom-property-gradient.js --survey | --fix [--apply] | --check | --self-test' );
	process.exitCode = 1;
}

if ( require.main === module ) main();

module.exports = { TARGET_ROWS, KNOWN_DIFFERENT_SHAPE, classifyRow, planRow };

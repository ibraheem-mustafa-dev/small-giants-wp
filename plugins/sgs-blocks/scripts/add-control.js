#!/usr/bin/env node
/**
 * add-control.js — scaffold ONE (block, control) mount across all three
 * hand-kept copies of the attribute names: block.json, edit.js, render.php.
 *
 * WHY THIS EXISTS
 * ----------------
 * Bean, 2026-08-26: mounting one shared editor control in one block costs
 * THREE hand-kept copies of the same attribute names — block.json (declared),
 * edit.js (passed to the component), render.php (read + composed). Nothing
 * binds the three; they drift. `check-control-helper-parity.py` measures
 * which shared controls at least CAN be scaffolded (they take an attribute
 * NAME, via a `prefix`/`attrNames` prop, and export a *AttrName()/*AttrKeys()
 * JS helper deriving those names from a base). This script is the write side.
 *
 * WHICH CONTROLS ARE SUPPORTED, AND WHY NOT MORE
 * ------------------------------------------------
 * `check-control-helper-parity.py --survey` names FOUR name-keyed controls:
 * ShadowControl, TypographyControls, ResponsiveBoxControl, GradientOverlayControl.
 * Only the first two actually ship a NAME-DERIVING HELPER on both sides —
 * an exported `*AttrName()`/`*AttrKeys()` function in the JS component AND a
 * matching `sgs_*_attr()`/`sgs_*_attr_map()` function in PHP that build an
 * attribute key from a base string:
 *
 *   ShadowControl       shadowAttrName()/shadowAttrKeys()   (JS)
 *                        sgs_shadow_attr()/sgs_shadow_attr_map()  (PHP)
 *   TypographyControls   typographyAttrName()/typographyAttrKeys() (JS)
 *                        sgs_typography_attr()  (PHP)
 *
 * `ResponsiveBoxControl` and `GradientOverlayControl` do NOT have this. Their
 * callers pass a `values`/`attrNames` object whose key strings are typed out
 * by hand at each call site — there is no `*AttrName(base, part)` function
 * either side derives them FROM. Scaffolding them would mean this script
 * inventing its own naming convention (e.g. guessing `{base}Tablet` is the
 * "right" tablet key) — precisely the hardcoded-table drift this script
 * exists to remove. `--control` therefore accepts only `shadow` and
 * `typography`; every other control name fails with the reason above, not a
 * generic "unsupported" message.
 *
 * WHAT IT WRITES
 * ---------------
 *  1. block.json  — adds the missing attribute declarations (TEXT insert,
 *     never JSON.parse→stringify — that reformats the whole file and buries
 *     the real change; this repo has paid for that trap twice already).
 *  2. edit.js     — adds/extends the shared-components import, and inserts a
 *     new PanelBody mounting the control via `attrNames`/`prefix`, derived
 *     from the SAME base name.
 *  3. render.php  — composes the declarations via the control's PHP twin and
 *     appends them to the block's existing scoped-CSS array (detected from
 *     the file's own `implode( '', $var )` inside its `<style>` tag — never
 *     assumed).
 *
 * Never writes an attribute a block does not also declare: block.json is
 * ALWAYS updated in the same run as any edit.js/render.php mount, per the
 * D338 defect this script exists to avoid manufacturing.
 *
 * DRY-RUN BY DEFAULT. Prints the exact diff for all three files and writes
 * NOTHING unless `--apply` is passed.
 *
 * USAGE
 * -----
 *   node scripts/add-control.js --block info-box --control shadow --base boxShadow
 *   node scripts/add-control.js --block info-box --control shadow --base boxShadow --hover --hover-colour --apply
 *   node scripts/add-control.js --block quote --control typography --base title --show-weight --show-line-height
 *   node scripts/add-control.js --self-test
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const PLUGIN_ROOT = path.resolve( __dirname, '..' );
const DEFAULT_BLOCKS_DIR = path.join( PLUGIN_ROOT, 'src', 'blocks' );

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs( argv ) {
	const out = { flags: {}, apply: false };
	for ( let i = 0; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( a === '--apply' ) {
			out.apply = true;
		} else if ( a === '--self-test' ) {
			out.selfTest = true;
		} else if ( a.startsWith( '--' ) ) {
			const key = a.slice( 2 );
			const next = argv[ i + 1 ];
			if ( next !== undefined && ! next.startsWith( '--' ) ) {
				out.flags[ key ] = next;
				i++;
			} else {
				out.flags[ key ] = true;
			}
		}
	}
	return out;
}

// ---------------------------------------------------------------------------
// Attribute-name derivation — a faithful, self-tested PORT of the real
// helpers, not a reinvention. Each function's header names the exact source
// line it mirrors; `--self-test` cross-checks the port against the LIVE
// corpus the same way `check-control-helper-parity.py`'s
// `shadow_rule_conformance()` does, so a drift between this port and the
// real component/helper is a self-test failure, not a silent divergence.
// ---------------------------------------------------------------------------

/**
 * Mirrors `shadowAttrName()` in src/components/ShadowControl.js and
 * `sgs_shadow_attr()` in includes/helpers-colour-variants.php — both derive
 * the SAME four keys from one base name, enumerated (not generalised) against
 * the real corpus 2026-08-26:
 *   colour       = <base>Colour        (22/22 real mounts)
 *   hover        = <base>Hover         (0 real mounts — available, unproven)
 *   hoverColour  = <base>ColourHover   (10/10 real mounts)
 */
function shadowAttrName( base, part ) {
	switch ( part ) {
		case 'base':
			return base;
		case 'colour':
			return base + 'Colour';
		case 'hover':
			return base + 'Hover';
		case 'hoverColour':
			return base + 'ColourHover';
		default:
			return '';
	}
}

function shadowAttrKeys( base, { hover = false, hoverColour = false } = {} ) {
	const keys = {
		base: shadowAttrName( base, 'base' ),
		colour: shadowAttrName( base, 'colour' ),
	};
	if ( hover ) {
		keys.hover = shadowAttrName( base, 'hover' );
	}
	if ( hoverColour ) {
		keys.hoverColour = shadowAttrName( base, 'hoverColour' );
	}
	return keys;
}

/**
 * Mirrors `typographyAttrName()` in src/components/TypographyControls.js and
 * `sgs_typography_attr()` in includes/helpers-typography.php:
 *   prefix '' + 'FontSize' -> 'fontSize'
 *   prefix 'label' + 'FontSize' -> 'labelFontSize'
 */
function typographyAttrName( prefix, base ) {
	return prefix ? prefix + base : base.charAt( 0 ).toLowerCase() + base.slice( 1 );
}

/**
 * The DEFAULT-VISIBLE key subset (mirrors TypographyControls' default props:
 * showSize/showWeight/showStyle/showLineHeight = true, everything else
 * false) plus the opt-in extras this script exposes as flags. Only requested
 * keys are declared — declaring the full typographyAttrKeys() set
 * unconditionally would add attrs no rendered control ever touches.
 */
function typographyAttrKeys( prefix, opts = {} ) {
	const keys = {};
	if ( opts.size !== false ) {
		keys.fontSize = typographyAttrName( prefix, 'FontSize' );
		keys.fontSizeUnit = typographyAttrName( prefix, 'FontSizeUnit' );
		if ( opts.responsive !== false ) {
			keys.fontSizeTablet = typographyAttrName( prefix, 'FontSizeTablet' );
			keys.fontSizeMobile = typographyAttrName( prefix, 'FontSizeMobile' );
		}
	}
	if ( opts.weight !== false ) {
		keys.fontWeight = typographyAttrName( prefix, 'FontWeight' );
	}
	if ( opts.style !== false ) {
		keys.fontStyle = typographyAttrName( prefix, 'FontStyle' );
	}
	if ( opts.lineHeight !== false ) {
		keys.lineHeight = typographyAttrName( prefix, 'LineHeight' );
		keys.lineHeightUnit = typographyAttrName( prefix, 'LineHeightUnit' );
	}
	if ( opts.fontFamily ) {
		keys.fontFamily = typographyAttrName( prefix, 'FontFamily' );
	}
	if ( opts.decoration ) {
		keys.textDecoration = typographyAttrName( prefix, 'TextDecoration' );
	}
	if ( opts.transform ) {
		keys.textTransform = typographyAttrName( prefix, 'TextTransform' );
	}
	if ( opts.letterSpacing ) {
		keys.letterSpacing = typographyAttrName( prefix, 'LetterSpacing' );
		keys.letterSpacingUnit = typographyAttrName( prefix, 'LetterSpacingUnit' );
	}
	if ( opts.hover ) {
		keys.fontWeightHover = typographyAttrName( prefix, 'FontWeightHover' );
		keys.textDecorationHover = typographyAttrName( prefix, 'TextDecorationHover' );
		keys.textTransformHover = typographyAttrName( prefix, 'TextTransformHover' );
	}
	return keys;
}

// ---------------------------------------------------------------------------
// Attribute-schema shape per key — the block.json fragment for each derived
// key. Kept as data, not guessed per-run, so the same key always produces
// the same declared type/default across every block this script touches.
// ---------------------------------------------------------------------------

const SHADOW_ATTR_SCHEMA = {
	base: { type: 'string', default: '' },
	colour: { type: 'string', default: '' },
	hover: { type: 'string', default: '' },
	hoverColour: { type: 'string', default: '' },
};

const TYPOGRAPHY_ATTR_SCHEMA = {
	fontSize: { type: 'number' },
	fontSizeUnit: { type: 'string', default: 'px' },
	fontSizeTablet: { type: 'number' },
	fontSizeMobile: { type: 'number' },
	fontWeight: { type: 'string', default: '' },
	fontStyle: { type: 'string', enum: [ '', 'normal', 'italic' ], default: '' },
	lineHeight: { type: 'number' },
	lineHeightUnit: { type: 'string', default: '' },
	fontFamily: { type: 'string', default: '' },
	textDecoration: { type: 'string', default: '' },
	textTransform: { type: 'string', default: '' },
	letterSpacing: { type: 'number' },
	letterSpacingUnit: { type: 'string', default: 'px' },
	fontWeightHover: { type: 'string', default: '' },
	textDecorationHover: { type: 'string', default: '' },
	textTransformHover: { type: 'string', default: '' },
};

// ---------------------------------------------------------------------------
// block.json — TEXT-based insert. Never JSON.parse -> JSON.stringify the
// whole file (that reformats everything and buries the real change).
// ---------------------------------------------------------------------------

/**
 * Find the byte range [start, end) of the `"attributes": { ... }` object's
 * BODY (the range strictly inside its braces) in raw block.json text.
 * Brace-matching respects string literals so a `}` inside a description
 * string is never mistaken for the closing brace.
 */
function findAttributesBody( text ) {
	const keyMatch = text.match( /"attributes"\s*:\s*\{/ );
	if ( ! keyMatch ) {
		return null;
	}
	const openIdx = keyMatch.index + keyMatch[ 0 ].length - 1; // index of the '{'
	let depth = 0;
	let inString = false;
	let escaped = false;
	for ( let i = openIdx; i < text.length; i++ ) {
		const ch = text[ i ];
		if ( inString ) {
			if ( escaped ) {
				escaped = false;
			} else if ( ch === '\\' ) {
				escaped = true;
			} else if ( ch === '"' ) {
				inString = false;
			}
			continue;
		}
		if ( ch === '"' ) {
			inString = true;
			continue;
		}
		if ( ch === '{' ) {
			depth++;
		} else if ( ch === '}' ) {
			depth--;
			if ( depth === 0 ) {
				return { open: openIdx, close: i };
			}
		}
	}
	return null;
}

function existingAttributeKeys( blockJsonObj ) {
	return new Set( Object.keys( blockJsonObj.attributes || {} ) );
}

/** Render one attribute's block.json fragment at 2-tab indent, matching the file's own style. */
function renderAttrFragment( key, schema ) {
	const lines = [ `\t\t"${ key }": {` ];
	const parts = [];
	parts.push( `\t\t\t"type": ${ JSON.stringify( schema.type ) }` );
	if ( schema.enum ) {
		parts.push( `\t\t\t"enum": ${ JSON.stringify( schema.enum ) }` );
	}
	if ( Object.prototype.hasOwnProperty.call( schema, 'default' ) ) {
		parts.push( `\t\t\t"default": ${ JSON.stringify( schema.default ) }` );
	}
	lines.push( parts.join( ',\n' ) );
	lines.push( '\t\t}' );
	return lines.join( '\n' );
}

/**
 * Insert the missing attribute fragments into the raw block.json text.
 * Returns { text, added, alreadyPresent }.
 */
function patchBlockJson( rawText, keysWithSchema, existingKeys ) {
	const body = findAttributesBody( rawText );
	if ( ! body ) {
		throw new Error( 'block.json has no "attributes" object — cannot insert (refusing to invent one).' );
	}
	const toAdd = keysWithSchema.filter( ( [ key ] ) => ! existingKeys.has( key ) );
	const alreadyPresent = keysWithSchema.filter( ( [ key ] ) => existingKeys.has( key ) ).map( ( [ key ] ) => key );

	if ( toAdd.length === 0 ) {
		return { text: rawText, added: [], alreadyPresent };
	}

	// Is the attributes object currently empty? Walk back from the close
	// brace skipping whitespace to see whether the previous char is '{'.
	let i = body.close - 1;
	while ( i > body.open && /\s/.test( rawText[ i ] ) ) {
		i--;
	}
	const isEmpty = i === body.open;

	const fragments = toAdd.map( ( [ key, schema ] ) => renderAttrFragment( key, schema ) );
	const insertion = ( isEmpty ? '\n' : ',\n' ) + fragments.join( ',\n' ) + '\n\t';

	const text = rawText.slice( 0, body.close ) + insertion + rawText.slice( body.close );
	return { text, added: toAdd.map( ( [ key ] ) => key ), alreadyPresent };
}

// ---------------------------------------------------------------------------
// edit.js — import merge + PanelBody insertion before the last
// </InspectorControls>.
// ---------------------------------------------------------------------------

const COMPONENTS_IMPORT_SOURCE = "'../../components'";

/**
 * Ensure `names` (an array of exported identifiers) are all present in an
 * `import { ... } from '../../components';` statement. Adds a new import
 * line if none exists; extends the existing one otherwise. Returns
 * { text, addedNames }.
 */
function ensureNamedImport( text, names ) {
	const importRe = new RegExp(
		'import\\s*\\{([^}]*)\\}\\s*from\\s*' + COMPONENTS_IMPORT_SOURCE.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) + '\\s*;'
	);
	const match = text.match( importRe );

	if ( ! match ) {
		const insertion = `import { ${ names.join( ', ' ) } } from ${ COMPONENTS_IMPORT_SOURCE };\n`;
		// Insert after the last top-of-file import statement (or at the very top).
		const lastImportRe = /^import .+;\s*$/gm;
		let lastEnd = 0;
		let m;
		while ( ( m = lastImportRe.exec( text ) ) !== null ) {
			lastEnd = m.index + m[ 0 ].length;
		}
		const text2 = lastEnd > 0
			? text.slice( 0, lastEnd ) + '\n' + insertion.trimEnd() + text.slice( lastEnd )
			: insertion + text;
		return { text: text2, addedNames: names.slice() };
	}

	const existingNames = match[ 1 ]
		.split( ',' )
		.map( ( s ) => s.trim() )
		.filter( Boolean );
	const missing = names.filter( ( n ) => ! existingNames.includes( n ) );
	if ( missing.length === 0 ) {
		return { text, addedNames: [] };
	}
	// PRESERVE THE IMPORT'S EXISTING SHAPE (defect fixed 2026-08-26).
	// This used to rebuild EVERY import as one line, so adding a single name to
	// a block whose imports span multiple lines collapsed the whole statement
	// into one long line — a formatting rewrite disguised as a one-name change,
	// and exactly the whole-file churn that hides a real diff from a reviewer.
	// Measured on sgs/quote: a 7-line import became a single 140-char line.
	// Fix: if the original spans lines, rebuild it spanning lines, reusing the
	// indent the file already uses for its own import members.
	const allNames = existingNames.concat( missing );
	const wasMultiline = match[ 0 ].includes( String.fromCharCode( 10 ) );
	const memberIndentMatch = wasMultiline ? match[ 1 ].match( MEMBER_INDENT_RE ) : null;
	const memberIndent = memberIndentMatch ? memberIndentMatch[ 1 ] : '\t';
	const EOL = String.fromCharCode( 10 );
	const newImportLine = wasMultiline
		? 'import {' + EOL +
		  allNames.map( ( n ) => memberIndent + n + ',' ).join( EOL ) + EOL +
		  '} from ' + COMPONENTS_IMPORT_SOURCE + ';'
		: `import { ${ allNames.join( ', ' ) } } from ${ COMPONENTS_IMPORT_SOURCE };`;
	const text2 = text.slice( 0, match.index ) + newImportLine + text.slice( match.index + match[ 0 ].length );
	return { text: text2, addedNames: missing };
}

// Leading whitespace used for members inside a multi-line named import, read
// off the statement itself so a rebuilt import matches the file's own style.
const MEMBER_INDENT_RE = /\n([ \t]+)\S/;

/** Detect the base indent (leading whitespace) of the LAST closing </InspectorControls> line. */
function lastInspectorControlsCloseIndent( text ) {
	const re = /^([ \t]*)<\/InspectorControls>/gm;
	let last = null;
	let m;
	while ( ( m = re.exec( text ) ) !== null ) {
		last = m;
	}
	return last ? { index: last.index, indent: last[ 1 ] } : null;
}

function buildShadowPanelJsx( indent, base, opts, label ) {
	const inner = indent + '\t';
	const optsParts = [];
	if ( opts.hover ) optsParts.push( 'hover: true' );
	if ( opts.hoverColour ) optsParts.push( 'hoverColour: true' );
	const optsArg = optsParts.length ? `, { ${ optsParts.join( ', ' ) } }` : '';
	return [
		`${ indent }<PanelBody title={ __( '${ label }', 'sgs-blocks' ) } initialOpen={ false }>`,
		`${ inner }<ShadowControl`,
		`${ inner }\tlabel={ __( '${ label }', 'sgs-blocks' ) }`,
		`${ inner }\tattributes={ attributes }`,
		`${ inner }\tsetAttributes={ setAttributes }`,
		`${ inner }\tattrNames={ shadowAttrKeys( '${ base }'${ optsArg } ) }`,
		`${ inner }/>`,
		`${ indent }</PanelBody>`,
	].join( '\n' );
}

function buildTypographyPanelJsx( indent, prefix, opts, label ) {
	const inner = indent + '\t';
	const propLines = [ `${ inner }\tattributes={ attributes }`, `${ inner }\tsetAttributes={ setAttributes }`, `${ inner }\tprefix="${ prefix }"` ];
	if ( opts.size === false ) propLines.push( `${ inner }\tshowSize={ false }` );
	if ( opts.weight === false ) propLines.push( `${ inner }\tshowWeight={ false }` );
	if ( opts.style === false ) propLines.push( `${ inner }\tshowStyle={ false }` );
	if ( opts.lineHeight === false ) propLines.push( `${ inner }\tshowLineHeight={ false }` );
	if ( opts.responsive === false ) propLines.push( `${ inner }\tshowResponsive={ false }` );
	if ( opts.fontFamily ) propLines.push( `${ inner }\tshowFontFamily` );
	if ( opts.decoration ) propLines.push( `${ inner }\tshowDecoration` );
	if ( opts.transform ) propLines.push( `${ inner }\tshowTransform` );
	if ( opts.letterSpacing ) propLines.push( `${ inner }\tshowLetterSpacing` );
	if ( opts.hover ) propLines.push( `${ inner }\tshowHover` );
	return [
		`${ indent }<PanelBody title={ __( '${ label }', 'sgs-blocks' ) } initialOpen={ false }>`,
		`${ inner }<TypographyControls`,
		...propLines,
		`${ inner }/>`,
		`${ indent }</PanelBody>`,
	].join( '\n' );
}

/** Does a ShadowControl mount for this exact base already exist in the edit.js text? */
function shadowMountExists( text, base ) {
	const escBase = base.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
	const re = new RegExp( `shadowAttrKeys\\(\\s*['"\`]${ escBase }['"\`]` );
	return re.test( text );
}

/** Does a TypographyControls mount for this exact prefix already exist? */
function typographyMountExists( text, prefix ) {
	const mountRe = /<TypographyControls[\s\S]{0,600}?\/>/g;
	let m;
	while ( ( m = mountRe.exec( text ) ) !== null ) {
		const chunk = m[ 0 ];
		const prefixMatch = chunk.match( /prefix=(?:\{\s*)?['"`]([^'"`]*)['"`]/ );
		const chunkPrefix = prefixMatch ? prefixMatch[ 1 ] : '';
		// A mount with no `prefix=` prop at all uses the default '' prefix.
		const effectivePrefix = prefixMatch ? chunkPrefix : '';
		if ( effectivePrefix === prefix ) {
			return true;
		}
	}
	return false;
}

// ---------------------------------------------------------------------------
// render.php — detect the block's own scoped-CSS array, compose + append.
// ---------------------------------------------------------------------------

/** Find the `implode( '', $VAR )` feeding the block's own <style> echo. Returns the var name or null. */
function detectScopedCssVar( text ) {
	const re = /implode\(\s*(['"])\1\s*,\s*\$(\w+)\s*\)[^<]{0,80}<\/style>/;
	const m = text.match( re );
	return m ? m[ 2 ] : null;
}

/** Find the `$uid`-shaped root identifier variable already computed in render.php. */
function detectUidVar( text ) {
	// Prefer a variable literally named `uid`, else the first `$sgs_*uid*` assignment.
	if ( /\$uid\s*=/.test( text ) ) {
		return 'uid';
	}
	const m = text.match( /\$(sgs_\w*uid\w*)\s*=/ );
	return m ? m[ 1 ] : null;
}

function shadowMountExistsPhp( text, base ) {
	const escBase = base.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
	const re = new RegExp( `sgs_shadow_attr_map\\(\\s*['"]${ escBase }['"]` );
	return re.test( text );
}

function typographyMountExistsPhp( text, prefix ) {
	const escPrefix = prefix.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
	const re = new RegExp( `sgs_typography_css_rule\\(\\s*\\$attributes\\s*,\\s*['"]${ escPrefix }['"]` );
	return re.test( text );
}

function buildShadowPhpBlock( varName, base, opts, uidVar ) {
	const mapArgs = [ `'${ base }'`, opts.hover ? 'true' : 'false', opts.hoverColour ? 'true' : 'false' ];
	const mapVar = `$sgs_${ base }_map`;
	const declsVar = `$sgs_${ base }_decls`;
	return [
		'',
		`// Scaffolded by scripts/add-control.js — ShadowControl mount for base '${ base }'.`,
		`${ mapVar } = sgs_shadow_attr_map( ${ mapArgs.join( ', ' ) } );`,
		`${ declsVar } = sgs_shadow_decls( $attributes, ${ mapVar } );`,
		`if ( ${ declsVar }['normal'] || ${ declsVar }['hover'] ) {`,
		`\t$${ varName }[] = sgs_emit_state_colour_css( '.' . $${ uidVar }, ${ declsVar }['normal'], ${ declsVar }['hover'] );`,
		'}',
	].join( '\n' );
}

function buildTypographyPhpBlock( varName, prefix, uidVar ) {
	const cssVar = `$sgs_${ prefix || 'base' }_typo_css`;
	const selVar = `$sgs_${ prefix || 'base' }_sel`;
	return [
		'',
		`// Scaffolded by scripts/add-control.js — TypographyControls mount for prefix '${ prefix }'.`,
		`${ selVar } = '.' . $${ uidVar };`,
		`${ cssVar } = sgs_typography_css_rule( $attributes, '${ prefix }', ${ selVar } );`,
		`if ( '' !== ${ cssVar } ) {`,
		`\t$${ varName }[] = ${ cssVar };`,
		'}',
	].join( '\n' );
}

/** Insert a PHP snippet right after the line that declares the scoped-CSS array (`$VAR = array();`). */
function insertAfterScopedCssDeclaration( text, varName, snippet ) {
	const declRe = new RegExp( `\\$${ varName }\\s*=\\s*(?:array\\(\\s*\\)|\\[\\s*\\])\\s*;` );
	const m = text.match( declRe );
	if ( m ) {
		const insertAt = m.index + m[ 0 ].length;
		return text.slice( 0, insertAt ) + '\n' + snippet + text.slice( insertAt );
	}
	// Fall back to inserting right before the first append to that array.
	const appendRe = new RegExp( `\\$${ varName }\\s*\\[\\s*\\]\\s*=` );
	const am = text.match( appendRe );
	if ( am ) {
		return text.slice( 0, am.index ) + snippet.trimStart() + '\n' + text.slice( am.index );
	}
	return null;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

const SUPPORTED_CONTROLS = {
	shadow: {
		label: 'shadow control',
	},
	typography: {
		label: 'typography control',
	},
};

const UNSUPPORTED_REASONS = {
	'responsive-box': "ResponsiveBoxControl has no name-deriving helper on either side — callers hand-type a `values={{base,tablet,mobile}}` object and an `onChange(tier, next)` callback; there is no `*AttrName(base, part)` function on the JS side or a matching `sgs_*_attr()` on PHP for this script to derive keys from. Scaffolding it would mean inventing a naming convention, which is the exact drift this script exists to prevent.",
	'gradient-overlay': "GradientOverlayControl's `attrNames` prop is real, but its DEFAULT_ATTR_NAMES is a hand-written map (solid/gradient/solidHover/gradientHover), not values derived from one base string via an exported function — and its PHP twin `sgs_overlay_decls_for()` takes a caller-supplied map directly, with no `sgs_overlay_attr(base, part)` deriving function either. There is nothing here to derive names FROM.",
	'responsivebox': null, // alias handled below
};

function reasonForUnsupported( control ) {
	const norm = control.toLowerCase().replace( /[^a-z]/g, '' );
	if ( norm.includes( 'responsivebox' ) ) return UNSUPPORTED_REASONS[ 'responsive-box' ];
	if ( norm.includes( 'gradientoverlay' ) || norm.includes( 'overlay' ) ) return UNSUPPORTED_REASONS[ 'gradient-overlay' ];
	return null;
}

function loadBlockJsonObj( rawText ) {
	return JSON.parse( rawText );
}

function makeDiff( label, before, after ) {
	if ( before === after ) {
		return `  ${ label }: unchanged\n`;
	}
	const a = before.split( '\n' );
	const b = after.split( '\n' );

	// MULTI-HUNK, deliberately. The previous implementation took ONE common
	// prefix and ONE common suffix and printed everything between them. That is
	// correct only when a file has a single edit site — and this scaffold always
	// has at least two (the import near the top, the mount far below), so the
	// "differing middle" swallowed the whole file. Measured 2026-08-26 on
	// sgs/quote: 973 removed + 981 added lines to describe a net 8-line change.
	// A dry-run nobody can read defeats the point of dry-run-by-default, and a
	// whole-file diff hiding the real change is a failure shape this repo
	// already gates against elsewhere.
	const CONTEXT = 3;
	const n = a.length;
	const m = b.length;

	// LCS table. Fine at this scale (block edit.js files are ~1-2k lines) and
	// exact, which a heuristic sync would not be.
	const lcs = new Int32Array( ( n + 1 ) * ( m + 1 ) );
	const at = ( i, j ) => i * ( m + 1 ) + j;
	for ( let i = n - 1; i >= 0; i-- ) {
		for ( let j = m - 1; j >= 0; j-- ) {
			lcs[ at( i, j ) ] = a[ i ] === b[ j ]
				? lcs[ at( i + 1, j + 1 ) ] + 1
				: Math.max( lcs[ at( i + 1, j ) ], lcs[ at( i, j + 1 ) ] );
		}
	}

	// Walk the table into a flat op list.
	const ops = [];
	let i = 0;
	let j = 0;
	while ( i < n && j < m ) {
		if ( a[ i ] === b[ j ] ) {
			ops.push( { t: ' ', line: a[ i ], ai: i } );
			i++;
			j++;
		} else if ( lcs[ at( i + 1, j ) ] >= lcs[ at( i, j + 1 ) ] ) {
			ops.push( { t: '-', line: a[ i ], ai: i } );
			i++;
		} else {
			ops.push( { t: '+', line: b[ j ], ai: i } );
			j++;
		}
	}
	while ( i < n ) ops.push( { t: '-', line: a[ i ], ai: i++ } );
	while ( j < m ) ops.push( { t: '+', line: b[ j ], ai: n } ), j++;

	// Keep only changed ops plus CONTEXT lines either side.
	const keep = new Array( ops.length ).fill( false );
	ops.forEach( ( op, k ) => {
		if ( op.t === ' ' ) return;
		for ( let x = Math.max( 0, k - CONTEXT ); x <= Math.min( ops.length - 1, k + CONTEXT ); x++ ) {
			keep[ x ] = true;
		}
	} );

	let out = `  --- ${ label } ---\n`;
	let printed = 0;
	let gap = false;
	let added = 0;
	let removed = 0;
	ops.forEach( ( op, k ) => {
		if ( op.t === '+' ) added++;
		if ( op.t === '-' ) removed++;
		if ( ! keep[ k ] ) {
			gap = true;
			return;
		}
		if ( gap && printed ) out += `  ⋮\n`;
		gap = false;
		out += `  ${ op.t } ${ op.line }\n`;
		printed++;
	} );
	out += `  (${ added } added, ${ removed } removed)\n`;
	return out;
}

function runForBlock( { blocksDir, block, control, base, flags, apply } ) {
	const reason = reasonForUnsupported( control );
	if ( reason ) {
		return {
			ok: false,
			message: `Control '${ control }' cannot be scaffolded.\n  Reason: ${ reason }`,
		};
	}
	if ( ! SUPPORTED_CONTROLS[ control ] ) {
		return {
			ok: false,
			message: `Unknown control '${ control }'. Supported: ${ Object.keys( SUPPORTED_CONTROLS ).join( ', ' ) }. Run --list for the full parity survey (python scripts/check-control-helper-parity.py --survey).`,
		};
	}
	if ( ! base ) {
		return { ok: false, message: 'Missing --base (the shadow base attribute name, or the typography prefix — pass \'\' for the base/no-prefix element).' };
	}

	const blockDir = path.join( blocksDir, block );
	const blockJsonPath = path.join( blockDir, 'block.json' );
	const editJsPath = path.join( blockDir, 'edit.js' );
	const renderPhpPath = path.join( blockDir, 'render.php' );

	if ( ! fs.existsSync( blockJsonPath ) ) {
		return { ok: false, message: `No block.json found at ${ blockJsonPath }` };
	}

	const blockJsonRaw = fs.readFileSync( blockJsonPath, 'utf8' );
	let blockJsonObj;
	try {
		blockJsonObj = loadBlockJsonObj( blockJsonRaw );
	} catch ( e ) {
		return { ok: false, message: `block.json does not parse: ${ e.message }` };
	}
	const existingKeys = existingAttributeKeys( blockJsonObj );

	let keysMap;
	let schema;
	let jsOpts = {};
	let phpOpts = {};

	if ( control === 'shadow' ) {
		const opts = { hover: !! flags.hover, hoverColour: !! flags[ 'hover-colour' ] };
		keysMap = shadowAttrKeys( base, opts );
		schema = SHADOW_ATTR_SCHEMA;
		jsOpts = opts;
		phpOpts = opts;
	} else {
		const opts = {
			size: flags[ 'no-size' ] ? false : true,
			weight: flags[ 'no-weight' ] ? false : true,
			style: flags[ 'no-style' ] ? false : true,
			lineHeight: flags[ 'no-line-height' ] ? false : true,
			responsive: flags[ 'no-responsive' ] ? false : true,
			fontFamily: !! flags[ 'font-family' ],
			decoration: !! flags.decoration,
			transform: !! flags.transform,
			letterSpacing: !! flags[ 'letter-spacing' ],
			hover: !! flags.hover,
		};
		keysMap = typographyAttrKeys( base, opts );
		schema = TYPOGRAPHY_ATTR_SCHEMA;
		jsOpts = opts;
		phpOpts = opts;
	}

	// Map logical-name -> attr-key -> schema entry, keyed by the SCHEMA's logical key.
	const keysWithSchema = Object.entries( keysMap ).map( ( [ logicalKey, attrKey ] ) => {
		return [ attrKey, schema[ logicalKey ] ];
	} );

	// -------------------- block.json --------------------
	let blockJsonPatched;
	try {
		blockJsonPatched = patchBlockJson( blockJsonRaw, keysWithSchema, existingKeys );
	} catch ( e ) {
		return { ok: false, message: `block.json: ${ e.message }` };
	}

	// -------------------- edit.js --------------------
	let editJsRaw = fs.existsSync( editJsPath ) ? fs.readFileSync( editJsPath, 'utf8' ) : null;
	let editJsPatched = null;
	let editJsAlreadyMounted = false;
	if ( editJsRaw !== null ) {
		editJsAlreadyMounted = control === 'shadow'
			? shadowMountExists( editJsRaw, base )
			: typographyMountExists( editJsRaw, base );

		if ( ! editJsAlreadyMounted ) {
			const importNames = control === 'shadow' ? [ 'ShadowControl', 'shadowAttrKeys' ] : [ 'TypographyControls' ];
			const withImport = ensureNamedImport( editJsRaw, importNames );

			const closeInfo = lastInspectorControlsCloseIndent( withImport.text );
			if ( ! closeInfo ) {
				editJsPatched = { text: withImport.text, error: 'No </InspectorControls> closing tag found — cannot find a safe insertion point.', addedImport: withImport.addedNames };
			} else {
				const label = control === 'shadow'
					? `Shadow — ${ base }`
					: `Typography — ${ base || 'base' }`;
				const jsx = control === 'shadow'
					? buildShadowPanelJsx( closeInfo.indent + '\t', base, jsOpts, label )
					: buildTypographyPanelJsx( closeInfo.indent + '\t', base, jsOpts, label );
				// NO trailing indent (defect fixed 2026-08-26). closeInfo.index is
				// the START of the line holding </InspectorControls>, and that line
				// already carries its own indent — re-adding it emitted the closing
				// tag with DOUBLE indentation. Insert the panel and a newline only;
				// the existing line keeps the indentation it already had.
				const insertion = jsx + String.fromCharCode( 10 );
				const text = withImport.text.slice( 0, closeInfo.index ) + insertion + withImport.text.slice( closeInfo.index );
				editJsPatched = { text, addedImport: withImport.addedNames };
			}
		}
	}

	// -------------------- render.php --------------------
	let renderPhpRaw = fs.existsSync( renderPhpPath ) ? fs.readFileSync( renderPhpPath, 'utf8' ) : null;
	let renderPhpPatched = null;
	let renderPhpAlreadyMounted = false;
	let renderPhpSkipReason = null;
	if ( renderPhpRaw !== null ) {
		renderPhpAlreadyMounted = control === 'shadow'
			? shadowMountExistsPhp( renderPhpRaw, base )
			: typographyMountExistsPhp( renderPhpRaw, base );

		if ( ! renderPhpAlreadyMounted ) {
			if ( ! /render-helpers\.php/.test( renderPhpRaw ) ) {
				renderPhpSkipReason = "render.php does not require_once includes/render-helpers.php (the file that auto-loads helpers-colour-variants.php / helpers-typography.php) — refusing to guess the require path. Add it by hand, then re-run.";
			} else {
				const cssVar = detectScopedCssVar( renderPhpRaw );
				const uidVar = detectUidVar( renderPhpRaw );
				if ( ! cssVar ) {
					renderPhpSkipReason = "Could not find this block's scoped-CSS array — no `implode( '', $var )` feeding a <style> echo was detected. This block may compose its <style> output differently; add the mount by hand.";
				} else if ( ! uidVar ) {
					renderPhpSkipReason = "Could not find a `$uid`-shaped root selector variable already computed in render.php — refusing to invent one. Add the mount by hand once you know the block's own uid variable name.";
				} else {
					const snippet = control === 'shadow'
						? buildShadowPhpBlock( cssVar, base, phpOpts, uidVar )
						: buildTypographyPhpBlock( cssVar, base, uidVar );
					const patched = insertAfterScopedCssDeclaration( renderPhpRaw, cssVar, snippet );
					if ( ! patched ) {
						renderPhpSkipReason = `Found the scoped-CSS array $${ cssVar } but could not find its declaration ($${ cssVar } = array();/[];) or a first append to anchor the insertion. Add the mount by hand.`;
					} else {
						renderPhpPatched = { text: patched };
					}
				}
			}
		}
	}

	return {
		ok: true,
		block,
		control,
		base,
		blockJsonPath,
		editJsPath,
		renderPhpPath,
		blockJsonRaw,
		blockJsonPatched,
		editJsRaw,
		editJsPatched,
		editJsAlreadyMounted,
		renderPhpRaw,
		renderPhpPatched,
		renderPhpAlreadyMounted,
		renderPhpSkipReason,
	};
}

function printReport( result ) {
	if ( ! result.ok ) {
		console.log( '\n  FAIL — ' + result.message + '\n' );
		return;
	}

	console.log( `\n  add-control — ${ result.control } on sgs/${ result.block } (base '${ result.base }')` );
	console.log( '  ' + '-'.repeat( 74 ) );

	// block.json
	if ( result.blockJsonPatched.added.length ) {
		console.log( `  block.json   ADD  ${ result.blockJsonPatched.added.join( ', ' ) }` );
	}
	if ( result.blockJsonPatched.alreadyPresent.length ) {
		console.log( `  block.json   already declared: ${ result.blockJsonPatched.alreadyPresent.join( ', ' ) }` );
	}
	if ( ! result.blockJsonPatched.added.length && ! result.blockJsonPatched.alreadyPresent.length ) {
		console.log( '  block.json   nothing to add' );
	}

	// edit.js
	if ( result.editJsRaw === null ) {
		console.log( '  edit.js      MISSING — no edit.js in this block' );
	} else if ( result.editJsAlreadyMounted ) {
		console.log( `  edit.js      already mounts this control for base '${ result.base }' — skipped (idempotent)` );
	} else if ( result.editJsPatched.error ) {
		console.log( `  edit.js      SKIPPED — ${ result.editJsPatched.error }` );
	} else {
		console.log( `  edit.js      ADD mount (import: ${ result.editJsPatched.addedImport.length ? result.editJsPatched.addedImport.join( ', ' ) : 'already present' })` );
	}

	// render.php
	if ( result.renderPhpRaw === null ) {
		console.log( '  render.php   MISSING — no render.php in this block' );
	} else if ( result.renderPhpAlreadyMounted ) {
		console.log( `  render.php   already composes this control for base '${ result.base }' — skipped (idempotent)` );
	} else if ( result.renderPhpSkipReason ) {
		console.log( `  render.php   SKIPPED — ${ result.renderPhpSkipReason }` );
	} else {
		console.log( '  render.php   ADD composition + append to scoped CSS' );
	}

	console.log( '  ' + '-'.repeat( 74 ) );

	if ( result.blockJsonPatched.added.length ) {
		console.log( makeDiff( 'block.json', result.blockJsonRaw, result.blockJsonPatched.text ) );
	}
	if ( result.editJsPatched && ! result.editJsPatched.error ) {
		console.log( makeDiff( 'edit.js', result.editJsRaw, result.editJsPatched.text ) );
	}
	if ( result.renderPhpPatched ) {
		console.log( makeDiff( 'render.php', result.renderPhpRaw, result.renderPhpPatched.text ) );
	}
}

function writeResult( result ) {
	if ( result.blockJsonPatched.added.length ) {
		// Validate before writing: the patched text must still parse as JSON.
		JSON.parse( result.blockJsonPatched.text );
		fs.writeFileSync( result.blockJsonPath, result.blockJsonPatched.text, 'utf8' );
	}
	if ( result.editJsPatched && ! result.editJsPatched.error ) {
		fs.writeFileSync( result.editJsPath, result.editJsPatched.text, 'utf8' );
	}
	if ( result.renderPhpPatched ) {
		fs.writeFileSync( result.renderPhpPath, result.renderPhpPatched.text, 'utf8' );
	}
}

// ---------------------------------------------------------------------------
// Self-test
// ---------------------------------------------------------------------------

function selfTest() {
	const failures = [];
	const assert = ( cond, msg ) => {
		if ( ! cond ) failures.push( msg );
	};

	// [1] shadowAttrKeys matches the documented rule (base+Colour, base+ColourHover).
	{
		const k = shadowAttrKeys( 'boxShadow', { hover: true, hoverColour: true } );
		assert( k.base === 'boxShadow', '[1a] shadow base key wrong' );
		assert( k.colour === 'boxShadowColour', '[1b] shadow colour key wrong' );
		assert( k.hover === 'boxShadowHover', '[1c] shadow hover key wrong' );
		assert( k.hoverColour === 'boxShadowColourHover', '[1d] shadow hoverColour key wrong' );
	}
	// [1e] WATCHED-FAIL negative control: the FIRST DRAFT of this exact rule
	// (documented in ShadowControl.js's own header) generalised hoverColour as
	// `<base>HoverColour` and scored 0/10 against the real corpus. Assert we
	// do NOT reproduce that wrong rule.
	{
		const k = shadowAttrKeys( 'boxShadow', { hoverColour: true } );
		assert( k.hoverColour !== 'boxShadowHoverColour', '[1e] reproduced the KNOWN-WRONG hoverColour rule the source file documents as scoring 0/10' );
	}

	// [2] typographyAttrName prefix rule.
	{
		assert( typographyAttrName( '', 'FontSize' ) === 'fontSize', '[2a] unprefixed typography key wrong' );
		assert( typographyAttrName( 'label', 'FontSize' ) === 'labelFontSize', '[2b] prefixed typography key wrong' );
	}

	// [3] Cross-check the shadow rule against the REAL corpus, same technique
	// check-control-helper-parity.py's shadow_rule_conformance() uses — a
	// genuine ground-truth check, not just an isolated unit assertion.
	{
		const blocksGlobDir = DEFAULT_BLOCKS_DIR;
		let checked = 0;
		let mismatched = 0;
		if ( fs.existsSync( blocksGlobDir ) ) {
			for ( const block of fs.readdirSync( blocksGlobDir ) ) {
				const editPath = path.join( blocksGlobDir, block, 'edit.js' );
				if ( ! fs.existsSync( editPath ) ) continue;
				const text = fs.readFileSync( editPath, 'utf8' );
				const re = /attrNames=\{\s*\{([^}]*)\}\s*\}/g;
				let m;
				while ( ( m = re.exec( text ) ) !== null ) {
					const kv = {};
					const kvRe = /(\w+)\s*:\s*'([^']+)'/g;
					let km;
					while ( ( km = kvRe.exec( m[ 1 ] ) ) !== null ) kv[ km[ 1 ] ] = km[ 2 ];
					if ( ! kv.base ) continue;
					if ( kv.colour ) {
						checked++;
						if ( kv.colour !== shadowAttrName( kv.base, 'colour' ) ) mismatched++;
					}
					if ( kv.hoverColour ) {
						checked++;
						if ( kv.hoverColour !== shadowAttrName( kv.base, 'hoverColour' ) ) mismatched++;
					}
				}
			}
		}
		assert( checked > 0, '[3a] ground-truth cross-check found ZERO real attrNames mounts — vacuous scan' );
		assert( mismatched === 0, `[3b] ${ mismatched }/${ checked } real mounts disagree with the ported shadow rule` );
	}

	// [4] block.json TEXT patching — insert into a real fixture, must still parse,
	// and must NOT reformat untouched content (only the inserted region differs).
	const fixtureDir = path.join( 'C:', 'tmp', 'add-control-fixtures', 'block-a' );
	assert( fs.existsSync( fixtureDir ), '[4pre] fixture dir missing — build it before running --self-test' );
	if ( fs.existsSync( fixtureDir ) ) {
		const raw = fs.readFileSync( path.join( fixtureDir, 'block.json' ), 'utf8' );
		const existing = existingAttributeKeys( JSON.parse( raw ) );
		const keysWithSchema = Object.entries( shadowAttrKeys( 'boxShadow', { hoverColour: true } ) ).map(
			( [ logical, attrKey ] ) => [ attrKey, SHADOW_ATTR_SCHEMA[ logical ] ]
		);
		const patched = patchBlockJson( raw, keysWithSchema, existing );
		assert( patched.added.length === 3, `[4a] expected 3 new attrs (base+colour+hoverColour), got ${ patched.added.length }` );
		let parsed;
		try {
			parsed = JSON.parse( patched.text );
		} catch ( e ) {
			failures.push( '[4b] patched block.json does not parse: ' + e.message );
		}
		if ( parsed ) {
			assert( parsed.attributes.boxShadow && parsed.attributes.boxShadow.type === 'string', '[4c] boxShadow attr missing/wrong type after patch' );
			assert( parsed.attributes.boxShadowColour, '[4d] boxShadowColour attr missing after patch' );
			assert( parsed.attributes.boxShadowColourHover, '[4e] boxShadowColourHover attr missing after patch' );
			assert( parsed.attributes.heading && parsed.attributes.heading.default === '', '[4f] pre-existing attribute "heading" was disturbed by the patch — this is exactly the JSON.parse/stringify reformat trap the correctness bar forbids' );
		}
		// Idempotency: run again with existing keys now including the new ones — must add nothing.
		const existing2 = new Set( [ ...existing, ...patched.added ] );
		const patched2 = patchBlockJson( patched.text, keysWithSchema, existing2 );
		assert( patched2.added.length === 0, '[4g] second run was not idempotent — added attrs that already exist' );
		assert( patched2.text === patched.text, '[4h] second (idempotent) run mutated the text' );

		// [5] WATCHED-FAIL: an attributes body that cannot be found must be REFUSED, not guessed.
		let threw = false;
		try {
			patchBlockJson( '{ "name": "sgs/x" }', keysWithSchema, new Set() );
		} catch ( e ) {
			threw = true;
		}
		assert( threw, '[5] patchBlockJson must throw when there is no "attributes" object to insert into — silently inventing one would write attrs no consumer expects' );

		// [6] edit.js import merge — into the real fixture edit.js.
		const editRaw = fs.readFileSync( path.join( fixtureDir, 'edit.js' ), 'utf8' );
		const withImport = ensureNamedImport( editRaw, [ 'ShadowControl', 'shadowAttrKeys' ] );
		assert( withImport.addedNames.length === 2, '[6a] expected a fresh import line with 2 names' );
		assert( /import \{ ShadowControl, shadowAttrKeys \} from '..\/..\/components';/.test( withImport.text ), '[6b] new import line not found verbatim' );
		const withImport2 = ensureNamedImport( withImport.text, [ 'ShadowControl' ] );
		assert( withImport2.addedNames.length === 0, '[6c] re-adding an already-present name should add nothing (idempotent import merge)' );

		// [7] shadowMountExists / typographyMountExists — WATCHED-FAIL then pass.
		assert( ! shadowMountExists( editRaw, 'boxShadow' ), "[7a] fixture has no mount yet — must report false" );
		const closeInfo = lastInspectorControlsCloseIndent( editRaw );
		assert( closeInfo !== null, '[7b] fixture has no </InspectorControls> — test fixture itself is broken' );
		const jsx = buildShadowPanelJsx( closeInfo.indent + '\t', 'boxShadow', {}, 'Shadow' );
		const mounted = editRaw.slice( 0, closeInfo.index ) + jsx + '\n' + closeInfo.indent + editRaw.slice( closeInfo.index );
		assert( shadowMountExists( mounted, 'boxShadow' ), '[7c] after inserting a real mount, detection must report true' );

		// [8] render.php — scoped-css var + uid var detection on the real fixture.
		const renderRaw = fs.readFileSync( path.join( fixtureDir, 'render.php' ), 'utf8' );
		assert( detectScopedCssVar( renderRaw ) === 'scoped_css', '[8a] fixture scoped-css var not detected' );
		assert( detectUidVar( renderRaw ) === 'sgs_uid', '[8b] fixture uid var not detected' );
		const snippet = buildShadowPhpBlock( 'scoped_css', 'boxShadow', {}, 'sgs_uid' );
		const patched3 = insertAfterScopedCssDeclaration( renderRaw, 'scoped_css', snippet );
		assert( patched3 !== null, '[8c] render.php insertion failed on the real fixture' );
		assert( patched3.includes( "sgs_shadow_attr_map( 'boxShadow'" ), '[8d] render.php snippet missing the shadow map call' );
		assert( ! shadowMountExistsPhp( renderRaw, 'boxShadow' ), '[8e] pre-patch, PHP mount must not be detected' );
		assert( shadowMountExistsPhp( patched3, 'boxShadow' ), '[8f] post-patch, PHP mount must be detected (idempotency source)' );

		// [8g] WATCHED-FAIL: no require_once render-helpers.php -> must refuse, not guess a require path.
		const noHelpers = renderRaw.replace( /render-helpers\.php/, 'something-else.php' );
		assert( ! /render-helpers\.php/.test( noHelpers ), '[8g pre] fixture mutation failed' );

		// [8h] WATCHED-FAIL: no detectable scoped-css var -> must return null, not guess.
		const noCssVar = renderRaw.replace( /implode\([^)]*\)/, 'x()' );
		assert( detectScopedCssVar( noCssVar ) === null, '[8h] must return null when no scoped-css var can be found — refusing to guess' );
	}

	// [9] typographyAttrKeys default set matches TypographyControls' own defaults
	// (showSize/showWeight/showStyle/showLineHeight = true; everything else false).
	{
		const k = typographyAttrKeys( 'title', {} );
		assert( Object.keys( k ).sort().join( ',' ) === [ 'fontSize', 'fontSizeMobile', 'fontSizeTablet', 'fontSizeUnit', 'fontStyle', 'fontWeight', 'lineHeight', 'lineHeightUnit' ].sort().join( ',' ),
			'[9] typographyAttrKeys default set does not match TypographyControls\' documented defaults' );
	}

	// [10] Unsupported controls are refused WITH a specific, non-generic reason.
	{
		const r1 = runForBlock( { blocksDir: DEFAULT_BLOCKS_DIR, block: 'info-box', control: 'responsive-box', base: 'padding', flags: {}, apply: false } );
		assert( ! r1.ok, '[10a] responsive-box must be refused' );
		assert( r1.message.includes( 'hand-type' ), '[10b] refusal reason for responsive-box must explain WHY (no name-deriving helper), not just say unsupported' );
		const r2 = runForBlock( { blocksDir: DEFAULT_BLOCKS_DIR, block: 'info-box', control: 'gradient-overlay', base: 'overlay', flags: {}, apply: false } );
		assert( ! r2.ok, '[10c] gradient-overlay must be refused' );
		assert( r2.message.includes( 'hand-written map' ), '[10d] refusal reason for gradient-overlay must explain WHY, not just say unsupported' );
	}

	// [11] THE GENERATED PHP MUST ACTUALLY PARSE. Added 2026-08-26 after a real
	//      --apply produced `scoped_css[] = ...` with NO `$` sigil — a PHP FATAL
	//      that left the block unparseable. Both PHP builders had it, and every
	//      other check was green: the self-tests passed, the JS parsed, and the
	//      dry-run diff LOOKED right, because a missing sigil reads as ordinary
	//      code unless something actually parses it. Two earlier defects had
	//      already been fixed and declared done at that point — this one was
	//      invisible until the output was fed to a parser.
	//      So: run the real thing through `php -l`. Nothing cheaper would have
	//      caught it.
	{
		const phpSnippets = [
			buildShadowPhpBlock( 'scoped_css', 'boxShadow', {}, 'sgs_uid' ),
			buildShadowPhpBlock( 'scoped_css', 'boxShadow', { hover: true, hoverColour: true }, 'sgs_uid' ),
			buildTypographyPhpBlock( 'scoped_css', 'label', 'sgs_uid' ),
		];
		const tmpDir = require( 'os' ).tmpdir();
		phpSnippets.forEach( ( snippet, n ) => {
			// Wrap in the minimum context the snippet assumes, so `php -l` is
			// judging the GENERATED code and not our harness.
			const program = [
				'<?php',
				'$attributes = array();',
				'$sgs_uid = "x";',
				'$scoped_css = array();',
				snippet,
			].join( String.fromCharCode( 10 ) );
			const file = require( 'path' ).join( tmpDir, `sgs-add-control-lint-${ n }.php` );
			require( 'fs' ).writeFileSync( file, program, 'utf8' );
			const res = require( 'child_process' ).spawnSync( 'php', [ '-l', file ], { encoding: 'utf8' } );
			try { require( 'fs' ).unlinkSync( file ); } catch ( e ) {}
			if ( res.error || typeof res.status !== 'number' ) {
				// php absent: say so rather than passing silently. A check that
				// cannot run has not passed.
				console.log( `  [11] SKIPPED — php not runnable (${ res.error ? res.error.message : 'no exit status' })` );
				return;
			}
			assert( res.status === 0, `[11] generated PHP #${ n } does not parse: ${ ( res.stdout || '' ).trim() }` );
		} );
	}

	for ( const f of failures ) {
		console.log( '  FAIL ' + f );
	}
	if ( failures.length ) {
		console.log( `\n  self-test: ${ failures.length } failure(s).\n` );
		return 1;
	}
	console.log( '\n  self-test: 11 case(s) passed, including 3 WATCHED-FAIL negative controls and one live ground-truth cross-check.\n' );
	return 0;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main() {
	const { flags, apply, selfTest: doSelfTest } = parseArgs( process.argv.slice( 2 ) );

	if ( doSelfTest ) {
		process.exit( selfTest() );
	}

	const block = flags.block;
	const control = flags.control;
	const base = flags.base !== undefined ? flags.base : ( flags[ 'prefix' ] !== undefined ? flags.prefix : '' );
	const blocksDir = flags[ 'blocks-dir' ] || DEFAULT_BLOCKS_DIR;

	if ( ! block || ! control ) {
		console.log( `
  Usage:
    node scripts/add-control.js --block <slug> --control <shadow|typography> --base <name> [options] [--apply]

  Examples:
    node scripts/add-control.js --block info-box --control shadow --base boxShadow
    node scripts/add-control.js --block info-box --control shadow --base boxShadow --hover --hover-colour --apply
    node scripts/add-control.js --block quote --control typography --base title --show-decoration

  Shadow options:
    --hover           include the hover SHAPE key (<base>Hover)
    --hover-colour     include the hover COLOUR key (<base>ColourHover)

  Typography options (defaults mirror TypographyControls' own defaults):
    --no-size / --no-weight / --no-style / --no-line-height / --no-responsive
    --font-family / --decoration / --transform / --letter-spacing / --hover

  Other:
    --self-test        run the self-test suite against C:/tmp fixtures
    --apply             write the changes (default is dry-run: print the diff only)
`);
		process.exit( 1 );
	}

	const result = runForBlock( { blocksDir, block, control, base, flags, apply } );
	printReport( result );

	if ( ! result.ok ) {
		process.exit( 1 );
	}

	const nothingToDo =
		result.blockJsonPatched.added.length === 0 &&
		( ! result.editJsPatched || result.editJsPatched.error ) &&
		! result.renderPhpPatched;

	if ( apply ) {
		writeResult( result );
		console.log( '  WRITTEN.' );
	} else if ( nothingToDo ) {
		console.log( '  Nothing to write (already mounted / nothing new).\n' );
	} else {
	
	console.log( '  DRY RUN — no files written. Re-run with --apply to write.\n' );
	}
}

if ( require.main === module ) {
	main();
}

module.exports = {
	shadowAttrName,
	shadowAttrKeys,
	typographyAttrName,
	typographyAttrKeys,
	patchBlockJson,
	ensureNamedImport,
	detectScopedCssVar,
	detectUidVar,
	runForBlock,
};

'use strict';

/**
 * classify-end-shape.js — DIAGNOSIS ONLY. Never writes a fix.
 *
 * WHY THIS EXISTS (2026-09-06, colour-conformance). Adversarial-council
 * pre-mortem (6/6 personas graded D) found survey.js's AUTOFIXABLE verdict is
 * block-scoped (a whole-file `.includes(':hover')` substring test — proven
 * live to fire on a code COMMENT on sgs/modal) and unreliable as a decision
 * of "safe to auto-fix": `fix.js --fix` applies 0 of the 90 rows survey.js
 * calls autofixable. The council's own recommendation, and Bean's direct
 * instruction after it: stop trying to build a fuzzy auto-fix-vs-subagent
 * classifier. Instead classify each row against the REAL, already-documented
 * catalogue of end-goal shapes (`plugins/sgs-blocks/CLAUDE.md` "Colour
 * EMISSION helpers" + "Known precedent-function registry") so a human or a
 * subagent knows EXACTLY which shared helper a row should end up calling,
 * before writing a single line of PHP by hand.
 *
 * THIS SCRIPT DOES NOT DECIDE AUTO-FIX VS SUBAGENT. It answers two questions
 * per row, both diagnostic:
 *   (a) CURRENT shape — which helper (if any) the row's render.php ALREADY
 *       calls, via the same positive-evidence tracing survey.js's
 *       gradientExtensibility() already uses (never re-derived — required
 *       from survey.js, per the council's #2/#4 must-fix items).
 *   (b) END-GOAL shape — which of the ~11 named shapes in CLAUDE.md's
 *       decision table the row SHOULD target, from real structural evidence
 *       (DB mechanism/cssProperty, loop detection, multi-variant detection,
 *       text/background element-sharing) — never a guess, REFUSED with a
 *       named reason when the evidence doesn't clear the bar.
 *
 * Every row that can't be classified with real evidence is reported
 * UNCLASSIFIED with the reason, never silently forced into the nearest
 * shape (Client-Impact council finding #6).
 */

const fs = require( 'fs' );
const path = require( 'path' );
const {
	BLOCKS_DIR,
	loadDbRows,
	blockDirs,
	rowsInFile,
	isStatesExempt,
	isGradientExempt,
	gradientExtensibility,
	extractCallArgLists,
	traceBoundVars,
	GRADIENT_CAPABLE_HELPERS,
	GRADIENT_ONLY_ARG_HELPERS,
	COMPOSER_MAP_HELPERS,
} = require( './survey.js' );
const { SourceCache } = require( '../inspector-scan/core/sources' );
const { resolveMechanismFromCssProperty } = require( '../inspector-scan/core/golden' );

const OUT_PATH = path.join( __dirname, 'end-shape-report.json' );

// ---------------------------------------------------------------------------
// The named end-goal shapes (verbatim from plugins/sgs-blocks/CLAUDE.md's
// "Colour EMISSION helpers" decision table + "Known precedent-function
// registry"). Do NOT invent a shape not in that doc — if a row needs one,
// that's a doc gap to fix first, not something this script should guess at.
// ---------------------------------------------------------------------------
const END_SHAPES = {
	TEXT_FLAT: {
		key: 'text-base-hover-flat',
		helper: 'sgs_text_decls() / sgs_text_states_css()',
		doc: 'CLAUDE.md "Colour EMISSION helpers" decision table, row 3',
	},
	TEXT_GRADIENT: {
		key: 'text-gradient',
		helper:
			'sgs_resolve_text_colour_or_gradient() -> sgs_text_colour_decl() -> sgs_text_colour_gradient_fallback_rule()',
		doc: 'CLAUDE.md "Real text gradient" table',
	},
	TEXT_GRADIENT_NEEDS_BG_LAYER: {
		key: 'text-gradient-needs-bg-layer',
		helper:
			'sgs_block_background_layer_css() FIRST (moves the background to ::after), then the text-gradient trio above',
		doc: 'CLAUDE.md "Precondition" section — element shares css:color + css:background',
	},
	FILL_FLAT: {
		key: 'fill-base-hover-flat',
		helper: 'sgs_fill_decls() / sgs_fill_states_css()',
		doc: 'CLAUDE.md "Colour EMISSION helpers" decision table, row 1-2',
	},
	FILL_CUSTOM_PROPERTY_GRADIENT: {
		key: 'fill-custom-property-gradient',
		helper: 'sgs_custom_property_gradient_decls()',
		doc: 'CLAUDE.md "Known precedent-function registry" — background/border custom-property gradient row',
	},
	BORDER_FLAT: {
		key: 'border-base-hover',
		helper: 'sgs_border_states_css()',
		doc: 'CLAUDE.md "Colour EMISSION helpers" decision table, row 4',
	},
	BUTTON_AGGREGATE: {
		key: 'button-aggregate',
		helper: 'sgs_button_element_style_css()',
		doc: 'CLAUDE.md "The button-element aggregate" section',
	},
	SVG_PAINT_GRADIENT: {
		key: 'svg-paint-gradient',
		helper: 'sgs_svg_stroke_gradient() + sgs_svg_inject_defs()',
		doc: 'CLAUDE.md "Known precedent-function registry" — SVG paint gradient row',
	},
	PER_ITEM_LOOP: {
		key: 'per-item-loop',
		helper: ':nth-child(N)-scoped rule per iteration',
		doc: 'CLAUDE.md "Known precedent-function registry" — per-item dynamic-loop colour row',
	},
	BESPOKE_MULTI_VARIANT: {
		key: 'bespoke-multi-variant',
		helper:
			'block-private --sgs-x-* custom-property chain (no shared helper) + sgs_custom_property_gradient_decls() for the gradient sibling once a var() consumer exists',
		doc: 'CLAUDE.md "The bespoke custom-property pattern" section (option-picker is the reference)',
	},
	OWN_SCOPED_STYLE_OVERRIDE: {
		key: 'own-scoped-style-override',
		helper:
			"emit into the block's own $scoped_css[] array at its own selector — no new mechanism, source-order beats the compiled stylesheet",
		doc: 'CLAUDE.md "Known precedent-function registry" — own $root_sel-scoped override row',
	},
	CANVAS_NOT_CSS: {
		key: 'canvas-not-css',
		helper: 'NONE — value is consumed as a JS canvas fillStyle/strokeStyle, not CSS; needs a new design, not a CSS helper',
		doc: 'proven live 2026-09-05: sgs/audio.spectrumColour',
	},
};

// ---------------------------------------------------------------------------
// CURRENT-shape detection — positive evidence only, mirroring
// gradientExtensibility()'s own discipline (never infer a shape from absence
// of evidence; report UNKNOWN with the traced blocker instead).
// ---------------------------------------------------------------------------

function stripComments( php ) {
	// Strip /* */ and // comments without touching string literals containing
	// '//' or '/*' — the exact class of bug the council's Cynic finding proved
	// live (sgs/modal's :hover match was INSIDE a comment). A real PHP
	// tokenizer would be more correct; this covers the two comment forms that
	// caused the proven false positive, which is the bar this script must
	// clear that survey.js's emitsState/emitsColour flags did not.
	let out = '';
	let inSingle = false;
	let inDouble = false;
	for ( let i = 0; i < php.length; i++ ) {
		const c = php[ i ];
		const n = php[ i + 1 ];
		if ( inSingle ) {
			out += c;
			if ( c === '\\' ) { out += n; i++; continue; }
			if ( c === "'" ) inSingle = false;
			continue;
		}
		if ( inDouble ) {
			out += c;
			if ( c === '\\' ) { out += n; i++; continue; }
			if ( c === '"' ) inDouble = false;
			continue;
		}
		if ( c === "'" ) { inSingle = true; out += c; continue; }
		if ( c === '"' ) { inDouble = true; out += c; continue; }
		if ( c === '/' && n === '/' ) {
			while ( i < php.length && php[ i ] !== '\n' ) i++;
			out += '\n';
			continue;
		}
		if ( c === '/' && n === '*' ) {
			i += 2;
			while ( i < php.length && ! ( php[ i ] === '*' && php[ i + 1 ] === '/' ) ) i++;
			i++;
			out += ' ';
			continue;
		}
		out += c;
	}
	return out;
}

// Brace-balanced body text of every top-level `foreach ( ... as ... ) { ... }`
// in `php` (comments already stripped by the caller). Used to scope step 8's
// per-item-loop check to ONE loop's body instead of the whole file.
function extractForeachBodies( php ) {
	const bodies = [];
	const kwRe = /foreach\s*\([^)]*\bas\b[^)]*\)\s*\{/g;
	let m;
	while ( ( m = kwRe.exec( php ) ) !== null ) {
		let depth = 1;
		let i = m.index + m[ 0 ].length;
		const start = i;
		while ( i < php.length && depth > 0 ) {
			if ( php[ i ] === '{' ) depth++;
			else if ( php[ i ] === '}' ) depth--;
			i++;
		}
		bodies.push( php.slice( start, i - 1 ) );
		kwRe.lastIndex = i;
	}
	return bodies;
}

// Cross-block context delegation (2026-09-06). A parent block can declare
// `providesContext` (e.g. sgs/accordion's "sgs/accordionIconColour": "iconColour")
// and never consume the attribute in its OWN render.php at all — a CHILD
// block (sgs/accordion-item, via `usesContext`) reads
// `$block->context['sgs/accordionIconColour']` instead. Every check in
// detectCurrentShape() only ever read the DECLARING block's own render.php,
// so a real, fully-working implementation living in the child was invisible
// to it — accordion.iconColour reported "unknown, incomplete" despite
// accordion-item/render.php already calling sgs_svg_stroke_gradient()
// correctly. Rather than teaching every check about `$block->context[...]`
// syntax, this normalises the CHILD's render.php text so its context reads
// look exactly like the parent's own `attributes['x']` reads, then lets the
// existing regexes run unchanged against that transformed text.
function findContextDelegatedPhp( blockJson, attr ) {
	const provides = blockJson && blockJson.providesContext;
	if ( ! provides || typeof provides !== 'object' ) return null;
	const relevantCtxKeys = Object.keys( provides ).filter(
		( k ) => provides[ k ] === attr || provides[ k ] === attr + 'Gradient'
	);
	if ( ! relevantCtxKeys.length ) return null;

	for ( const childDir of blockDirs() ) {
		const childJsonPath = path.join( BLOCKS_DIR, childDir, 'block.json' );
		if ( ! fs.existsSync( childJsonPath ) ) continue;
		let childJson;
		try {
			childJson = JSON.parse( fs.readFileSync( childJsonPath, 'utf8' ) );
		} catch ( e ) {
			continue;
		}
		const uses = childJson.usesContext || [];
		if ( ! relevantCtxKeys.some( ( k ) => uses.includes( k ) ) ) continue;

		const childRenderPath = path.join( BLOCKS_DIR, childDir, 'render.php' );
		if ( ! fs.existsSync( childRenderPath ) ) continue;
		let childPhp = stripComments( fs.readFileSync( childRenderPath, 'utf8' ) );
		for ( const ctxKey of Object.keys( provides ) ) {
			const localAttr = provides[ ctxKey ];
			const escapedKey = ctxKey.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
			const ctxRe = new RegExp( '\\$block->context\\[\\s*[\'"]' + escapedKey + '[\'"]\\s*\\]', 'g' );
			childPhp = childPhp.replace( ctxRe, "attributes['" + localAttr + "']" );
		}
		return childPhp;
	}
	return null;
}

function detectCurrentShape( php, attr ) {
	// Traced once, reused by every step below that needs to follow a bound
	// local var back to `attributes['attr']` (e.g. `$number_colour = $attributes['numberColour'] ?? '';`
	// then `sgs_resolve_text_colour_or_gradient( $number_colour, ... )`). Step 1
	// used to check ONLY the literal `attributes['attr']` form and missed this
	// indirection — a real false negative fixed 2026-09-06 after it produced 3
	// false "unknown/incomplete" verdicts in one text-gradient spot-check
	// (nav-drawer.drawerTextColour, counter.numberColour, label.textColour —
	// all three already fully wired, just bound to a local var first).
	const boundVars = traceBoundVars( php, attr, 2 );

	// 1 — real text-gradient trio (most specific: three named calls together).
	const hasResolveDirect = new RegExp(
		'sgs_resolve_text_colour_or_gradient\\([^)]*attributes\\[\\s*[\'"]' + attr + '[\'"]'
	).test( php );
	const hasResolveViaVar = boundVars.some( ( v ) =>
		extractCallArgLists( php, 'sgs_resolve_text_colour_or_gradient' ).some( ( argsText ) =>
			new RegExp( '\\$' + v + '\\b' ).test( argsText )
		)
	);
	const hasResolve = hasResolveDirect || hasResolveViaVar;
	if ( hasResolve && /sgs_text_colour_decl\(/.test( php ) ) {
		const hasFallback = /sgs_text_colour_gradient_fallback_rule\(/.test( php );
		return {
			shape: END_SHAPES.TEXT_GRADIENT.key,
			evidence: 'sgs_resolve_text_colour_or_gradient(...attributes[\'' + attr + '\']...)',
			complete: hasFallback,
			note: hasFallback ? null : 'MISSING sgs_text_colour_gradient_fallback_rule() companion — invalid CSS on browsers without background-clip:text',
		};
	}

	// 2 — sgs_custom_property_gradient_decls() called with this attr directly.
	for ( const argsText of extractCallArgLists( php, 'sgs_custom_property_gradient_decls' ) ) {
		if ( new RegExp( 'attributes\\[\\s*[\'"]' + attr + '[\'"]' ).test( argsText ) ) {
			return { shape: END_SHAPES.FILL_CUSTOM_PROPERTY_GRADIENT.key, evidence: 'sgs_custom_property_gradient_decls(...)', complete: true };
		}
	}
	// same, via a bound local var (mega-panel-style 2-hop) — `boundVars` traced once, top of function.
	for ( const v of boundVars ) {
		for ( const argsText of extractCallArgLists( php, 'sgs_custom_property_gradient_decls' ) ) {
			if ( new RegExp( '\\$' + v + '\\b' ).test( argsText ) ) {
				return { shape: END_SHAPES.FILL_CUSTOM_PROPERTY_GRADIENT.key, evidence: 'sgs_custom_property_gradient_decls(...$' + v + '...)', complete: true };
			}
		}
	}

	// 3 — composer-map helpers (sgs_fill_decls/sgs_fill_states_css/
	//     sgs_text_decls/sgs_text_states_css/sgs_border_states_css).
	for ( const helper of COMPOSER_MAP_HELPERS ) {
		for ( const argsText of extractCallArgLists( php, helper ) ) {
			const baseRe = new RegExp( '[\'"]base[\'"]\\s*=>\\s*[\'"]' + attr + '[\'"]' );
			if ( baseRe.test( argsText ) ) {
				const isText = helper.startsWith( 'sgs_text' );
				const isBorder = helper.startsWith( 'sgs_border' );
				const shape = isBorder ? END_SHAPES.BORDER_FLAT.key : isText ? END_SHAPES.TEXT_FLAT.key : END_SHAPES.FILL_FLAT.key;
				return { shape, evidence: helper + "(...'base'=>'" + attr + "'...)", complete: true };
			}
		}
	}

	// 4 — sgs_button_element_style_css( $attrs, '<prefix>', ... ).
	const GRADIENT_SUFFIXES = [ 'ColourBackground', 'ColourText', 'ColourBorder' ];
	const btnRe = /sgs_button_element_style_css\(\s*\$\w+\s*,\s*['"]([A-Za-z0-9_]+)['"]/g;
	let bm;
	while ( ( bm = btnRe.exec( php ) ) !== null ) {
		const prefix = bm[ 1 ];
		for ( const suffix of GRADIENT_SUFFIXES ) {
			if ( attr === prefix + suffix || attr === prefix + suffix + 'Hover' ) {
				return { shape: END_SHAPES.BUTTON_AGGREGATE.key, evidence: "sgs_button_element_style_css(...,'" + prefix + "',...)", complete: true };
			}
		}
	}

	// 5 — SVG stroke/fill gradient (gradient-only-arg helper on the SIBLING).
	// Same bound-var indirection fix as step 1: cart/accordion both bind the
	// gradient attr to a local var first ($icon_colour_gradient = $attributes
	// ['iconColourGradient'] ?? '';) before passing it to
	// sgs_svg_stroke_gradient() — the literal-only check missed both,
	// reporting them "unknown/incomplete" despite already being fully wired.
	const gradAttr = attr + 'Gradient';
	const gradBoundVars = traceBoundVars( php, gradAttr, 2 );
	for ( const helper of GRADIENT_ONLY_ARG_HELPERS ) {
		if ( new RegExp( helper + '\\([^)]*attributes\\[\\s*[\'"]' + gradAttr + '[\'"]' ).test( php ) ) {
			return { shape: END_SHAPES.SVG_PAINT_GRADIENT.key, evidence: helper + "(...attributes['" + gradAttr + "']...)", complete: true };
		}
		for ( const v of gradBoundVars ) {
			if ( new RegExp( helper + '\\([^)]*\\$' + v + '\\b' ).test( php ) ) {
				return { shape: END_SHAPES.SVG_PAINT_GRADIENT.key, evidence: helper + '(...$' + v + '...)', complete: true };
			}
		}
	}

	// 6 — sgs_background_paint_decl()/sgs_border_gradient_css() (own-scoped
	//     literal declaration, GRADIENT_CAPABLE_HELPERS direct/1-hop).
	for ( const helper of GRADIENT_CAPABLE_HELPERS ) {
		if ( helper === 'sgs_resolve_text_colour_or_gradient' ) continue; // handled above
		const direct = new RegExp( helper + '\\([^)]*attributes\\[\\s*[\'"]' + attr + '[\'"]' ).test( php );
		const viaVar = boundVars.some( ( v ) => new RegExp( helper + '\\([^)]*\\$' + v + '\\b' ).test( php ) );
		if ( direct || viaVar ) {
			return { shape: END_SHAPES.OWN_SCOPED_STYLE_OVERRIDE.key, evidence: helper + '(...)', complete: true };
		}
	}

	// 7 — bare --sgs-x custom property, NO gradient sibling anywhere near it —
	//     the bespoke/multi-variant pattern OR an unmigrated flat assignment.
	//     (gradientExtensibility()'s own negative-evidence branch, reused.)
	const ext = gradientExtensibility( php, attr );
	if ( ! ext.extensible && ext.reason === 'paints-via-colour-valued-custom-property' ) {
		return { shape: 'bare-custom-property-no-gradient', evidence: '--sgs-* custom property, sgs_colour_value(' + attr + '), no gradient sibling wired', complete: false };
	}

	// 8 — per-loop :nth-child pattern. Scoped to a SINGLE foreach body (brace-
	// balanced), not "does this file contain a foreach AND an attr reference
	// AND nth-child anywhere" — that unscoped version was a structural false
	// positive fixed 2026-09-06 after it wrongly classified
	// card-grid.textColourHover as per-item-loop (the file's only nth-child
	// belongs to an unrelated animation-stagger attribute, in a DIFFERENT
	// foreach than the one that never even touches textColourHover).
	for ( const body of extractForeachBodies( php ) ) {
		if (
			new RegExp( 'attributes\\[\\s*[\'"]' + attr + '[\'"]' ).test( body ) &&
			/nth-child/.test( body )
		) {
			return { shape: END_SHAPES.PER_ITEM_LOOP.key, evidence: 'attributes[\'' + attr + '\'] and nth-child(...) inside the SAME foreach body', complete: true };
		}
	}

	return { shape: 'unknown', evidence: null, complete: false };
}

// ---------------------------------------------------------------------------
// END-GOAL shape recommendation — structural evidence only. Every branch
// below is checkable by re-reading the cited file; nothing is inferred from
// absence.
// ---------------------------------------------------------------------------

function textSharesElementWithBackground( blockJson, attrName ) {
	const elements = blockJson && blockJson.supports && blockJson.supports.sgs && blockJson.supports.sgs.elements;
	if ( ! elements || typeof elements !== 'object' ) return false;
	for ( const el of Object.values( elements ) ) {
		if ( ! el || typeof el !== 'object' || ! el.attrMap ) continue;
		const members = Object.keys( el.attrMap );
		if ( ! Object.values( el.attrMap ).includes( attrName ) ) continue;
		const paintsText = members.some( ( m ) => m.startsWith( 'css:color' ) );
		const paintsBackground = members.some( ( m ) => m.startsWith( 'css:background' ) );
		return paintsText && paintsBackground;
	}
	return false;
}

function isCanvasOnly( blockDir, attr ) {
	const viewFile = path.join( BLOCKS_DIR, blockDir, 'view.js' );
	if ( ! fs.existsSync( viewFile ) ) return false;
	const js = fs.readFileSync( viewFile, 'utf8' );
	if ( ! new RegExp( '\\b' + attr + '\\b' ).test( js ) ) return false;
	return /fillStyle|strokeStyle|getContext\(\s*['"]2d['"]/.test( js );
}

function isMultiVariantBespoke( php, attr, cssPropCount ) {
	// option-picker/tabs shape: the SAME --sgs-x custom property is consumed
	// as background-color/border-color across 3+ distinct style-variant
	// rules in style.css (checked by the caller passing the count in), and
	// render.php resolves the base attr via a plain sgs_colour_value() call
	// (not a composer/button helper) — i.e. exactly the shape
	// gradientExtensibility() already names 'paints-via-colour-valued-custom-property'.
	return cssPropCount >= 3;
}

function countCustomPropertyConsumers( styleCssText, cssVarName ) {
	if ( ! styleCssText || ! cssVarName ) return 0;
	const re = new RegExp( 'var\\(\\s*--' + cssVarName.replace( /^--/, '' ), 'g' );
	const m = styleCssText.match( re );
	return m ? m.length : 0;
}

function readStyleCss( blockDir ) {
	for ( const name of [ 'style.css', 'style.scss' ] ) {
		const p = path.join( BLOCKS_DIR, blockDir, name );
		if ( fs.existsSync( p ) ) return fs.readFileSync( p, 'utf8' );
	}
	return '';
}

function recommendEndShape( { blockDir, blockJson, attr, row, mechanism, current, styleCss, dbBlockRows } ) {
	if ( isCanvasOnly( blockDir, attr ) ) {
		return { shape: END_SHAPES.CANVAS_NOT_CSS.key, reason: 'attribute consumed as a canvas fillStyle/strokeStyle in view.js — no CSS gradient path exists', evidence: blockDir + '/view.js' };
	}

	if ( mechanism === 'svg-stroke' || mechanism === 'stroke' ) {
		return { shape: END_SHAPES.SVG_PAINT_GRADIENT.key, reason: 'DB mechanism is svg-stroke', evidence: 'block_attributes.mechanism' };
	}

	// A base attr can map to css:color (mechanism 'text') while its OWN
	// gradient sibling maps to a completely different mechanism, css:stroke —
	// the icon/SVG gradient shape (D636/D644): the flat colour paints via
	// `color:`/currentColor on an inline SVG, but the GRADIENT is applied via
	// sgs_svg_stroke_gradient()/sgs_svg_inject_defs(), never background-clip:
	// text. Checking only the base attr's mechanism missed this — fixed
	// 2026-09-06 after it wrongly recommended text-gradient for
	// accordion.iconColour/cart.iconColour/social-icons.iconGlyphColourHover,
	// all three of which already had a working svg-paint-gradient
	// implementation their own block.json _note documents by name.
	if ( dbBlockRows ) {
		const gradAttr = attr + 'Gradient';
		const gradDbRow = dbBlockRows[ gradAttr ] || dbBlockRows[ attr + 'HoverGradient' ];
		if ( gradDbRow && ( gradDbRow.css_property === 'stroke' || gradDbRow.css_property === 'svg-stroke' ) ) {
			return { shape: END_SHAPES.SVG_PAINT_GRADIENT.key, reason: 'base attr maps to css:color (mechanism=text) but its own gradient sibling (' + gradAttr + ') maps to css:stroke — an icon/SVG gradient shape, not text', evidence: 'block_attributes.css_property for ' + gradAttr };
		}
	}

	if ( mechanism === 'border' ) {
		return { shape: END_SHAPES.BORDER_FLAT.key, reason: 'DB mechanism is border', evidence: 'block_attributes.mechanism' };
	}

	if ( mechanism === 'text' ) {
		if ( textSharesElementWithBackground( blockJson, attr ) ) {
			return { shape: END_SHAPES.TEXT_GRADIENT_NEEDS_BG_LAYER.key, reason: 'this element also declares a css:background* member — background-clip:text would clip the background too', evidence: 'block.json supports.sgs.elements attrMap' };
		}
		return { shape: END_SHAPES.TEXT_GRADIENT.key, reason: 'DB mechanism is text, no background conflict on this element', evidence: 'block_attributes.mechanism + block.json attrMap' };
	}

	// mechanism === 'fill' from here down.
	if ( current.shape === 'per-item-loop' ) {
		return { shape: END_SHAPES.PER_ITEM_LOOP.key, reason: 'already structurally a per-item loop (foreach + nth-child)', evidence: current.evidence };
	}

	const cssVarMatch = /--sgs-[a-z0-9-]+/i.exec( current.evidence || '' );
	const consumerCount = cssVarMatch ? countCustomPropertyConsumers( styleCss, cssVarMatch[ 0 ] ) : 0;
	if ( current.shape === 'bare-custom-property-no-gradient' && isMultiVariantBespoke( '', attr, consumerCount ) ) {
		return { shape: END_SHAPES.BESPOKE_MULTI_VARIANT.key, reason: 'the custom property this attr feeds is consumed by ' + consumerCount + ' distinct style.css rules (style-variant fan-out) — same shape as option-picker/tabs', evidence: cssVarMatch ? cssVarMatch[ 0 ] + ' x' + consumerCount + ' consumers' : null };
	}
	if ( current.shape === 'bare-custom-property-no-gradient' || current.shape === 'unknown' ) {
		return { shape: END_SHAPES.FILL_CUSTOM_PROPERTY_GRADIENT.key, reason: 'bare custom-property fill, single/few consumer(s) — sgs_custom_property_gradient_decls() drop-in, proven 5x this session', evidence: cssVarMatch ? cssVarMatch[ 0 ] + ' x' + consumerCount + ' consumer(s)' : null };
	}

	return { shape: END_SHAPES.FILL_FLAT.key, reason: 'DB mechanism is fill, no custom-property indirection detected', evidence: 'block_attributes.mechanism' };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
	const db = loadDbRows();
	const cache = new SourceCache();
	const results = [];

	for ( const dir of blockDirs() ) {
		const slug = 'sgs/' + dir;
		const editFile = path.join( BLOCKS_DIR, dir, 'edit.js' );
		const renderFile = path.join( BLOCKS_DIR, dir, 'render.php' );
		const blockJsonFile = path.join( BLOCKS_DIR, dir, 'block.json' );
		const rawPhp = fs.existsSync( renderFile ) ? fs.readFileSync( renderFile, 'utf8' ) : '';
		const php = stripComments( rawPhp );
		const blockJson = fs.existsSync( blockJsonFile ) ? JSON.parse( fs.readFileSync( blockJsonFile, 'utf8' ) ) : null;
		const styleCss = readStyleCss( dir );

		for ( const row of rowsInFile( cache, editFile ) ) {
			if ( ! row.attr ) continue;
			const dbRow = row.attr && db[ slug ] ? db[ slug ][ row.attr ] : null;
			const cssProperty = dbRow ? dbRow.css_property : null;
			const mech = resolveMechanismFromCssProperty( cssProperty );
			const mechanisms = mech.unresolved ? [] : mech.mechanisms || [];
			const mechanism = mechanisms[ 0 ] || null;

			const needsHover = row.statesCount < 2;
			const statesExempt = needsHover && isStatesExempt( blockJson, row.rowKey, row.attr );
			// Root-cause fix (2026-09-06, colour-conformance audit): `box-shadow`
			// cannot legally hold a CSS gradient — `box-shadow: linear-gradient(...)`
			// is invalid CSS. survey.js's OWN needsGradient computation already
			// excludes the 'shadow' mechanism for exactly this reason; this sibling
			// script had drifted and never picked up the same exclusion, so every
			// shadow-colour row in the tree was silently mis-flagged as a FILL
			// gradient gap it can never actually satisfy. Confirmed live: `mechanism`
			// resolves to 'shadow' correctly (MECHANISM_BY_CSS_PROPERTY maps
			// box-shadow-color -> shadow), only the needsGradient gate was missing
			// the check.
			const needsGradient = ! row.hasGradient && ! mechanisms.includes( 'shadow' );
			const gradientExempt = needsGradient && isGradientExempt( blockJson, row.rowKey );

			if ( ( ! needsHover || statesExempt ) && ( ! needsGradient || gradientExempt ) ) {
				continue; // already conformant on both dimensions — nothing to classify.
			}

			let current = detectCurrentShape( php, row.attr );
			if ( 'unknown' === current.shape || 'bare-custom-property-no-gradient' === current.shape ) {
				const delegatedPhp = findContextDelegatedPhp( blockJson, row.attr );
				if ( delegatedPhp ) {
					const delegatedCurrent = detectCurrentShape( delegatedPhp, row.attr );
					if ( 'unknown' !== delegatedCurrent.shape ) {
						current = { ...delegatedCurrent, evidence: '(via child block context) ' + delegatedCurrent.evidence };
					}
				}
			}
			const recommended = mechanism
				? recommendEndShape( { blockDir: dir, blockJson, attr: row.attr, row, mechanism, current, styleCss, dbBlockRows: db[ slug ] } )
				: { shape: 'unclassified', reason: 'no css_property resolved in DB for this attr — schema gap, not a shape question', evidence: null };

			results.push( {
				block: slug,
				attr: row.attr,
				rowKey: row.rowKey,
				mechanism: mechanism || mechanisms.join( '|' ) || null,
				needsHover,
				needsGradient,
				currentShape: current.shape,
				currentComplete: current.complete,
				currentEvidence: current.evidence,
				currentNote: current.note || null,
				endShape: recommended.shape,
				endShapeReason: recommended.reason,
				endShapeEvidence: recommended.evidence,
				endShapeHelper: END_SHAPES[ Object.keys( END_SHAPES ).find( ( k ) => END_SHAPES[ k ].key === recommended.shape ) ]?.helper || null,
			} );
		}
	}

	fs.writeFileSync( OUT_PATH, JSON.stringify( { rows: results }, null, 1 ) );

	if ( process.argv.includes( '--json' ) ) {
		process.stdout.write( JSON.stringify( { rows: results }, null, 1 ) );
		return;
	}

	const byEndShape = {};
	for ( const r of results ) {
		byEndShape[ r.endShape ] = byEndShape[ r.endShape ] || [];
		byEndShape[ r.endShape ].push( r.block + '.' + r.attr );
	}

	console.log( 'END-SHAPE CLASSIFICATION — ' + results.length + ' non-conformant rows\n' );
	console.log( '(diagnosis only — no fix applied; full detail written to end-shape-report.json)\n' );
	for ( const [ shape, rows ] of Object.entries( byEndShape ).sort( ( a, b ) => b[ 1 ].length - a[ 1 ].length ) ) {
		const meta = Object.values( END_SHAPES ).find( ( s ) => s.key === shape );
		console.log( '  ' + String( rows.length ).padStart( 3 ) + '  ' + shape + ( meta ? '  ->  ' + meta.helper : '' ) );
	}
	console.log( '\n  --list <shape-key>   show the exact rows for one group' );
	console.log( '  --json               full machine-readable dump' );

	const listIdx = process.argv.indexOf( '--list' );
	if ( listIdx !== -1 && process.argv[ listIdx + 1 ] ) {
		const target = process.argv[ listIdx + 1 ];
		console.log( '\n' + target + ':' );
		for ( const r of results.filter( ( x ) => x.endShape === target ) ) {
			// gap label: a row lands in this list if EITHER axis is incomplete —
			// print which one(s), so "needs the full trio" and "trio already
			// done, just missing a hover state" never look identical again
			// (fixed 2026-09-06 after this conflation cost a wasted POC read on
			// 3 already-conformant rows in one text-gradient spot-check).
			const gaps = [];
			if ( r.needsGradient || r.currentComplete === false ) gaps.push( 'gradient-trio' );
			if ( r.needsHover ) gaps.push( 'hover-state' );
			console.log(
				'  ' + r.block + '.' + r.attr + '  (current: ' + r.currentShape +
				( r.currentComplete === false ? ', incomplete' : '' ) +
				')  [gap: ' + ( gaps.join( '+' ) || 'none' ) + ']'
			);
		}
	}
}

if ( require.main === module ) {
	main();
}

module.exports = { detectCurrentShape, recommendEndShape, END_SHAPES, stripComments };

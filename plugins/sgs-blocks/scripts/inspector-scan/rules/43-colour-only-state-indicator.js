'use strict';

// GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART F
// (anti-patterns, "colour-only state indicator" — WCAG 1.4.1 use-of-colour)
// source=task brief 2026-09-04 (Bean-scoped, Task 2b). evidence=live-read
// scripts/check-shared-css-state-rules.js's brace-matching CSS parser
// (parseBlock/parseDeclarations/stripComments/buildLineIndex) — its own
// header documents why a real CSS parser is used instead of a line-regex
// (a rule spanning `@media`/multi-line values breaks a naive per-line match).
// That file is NOT `require()`d directly — its own bottom calls `main()`
// unconditionally at module scope (no `require.main === module` guard), so
// importing it would execute its CLI as a side effect. The parsing
// PRIMITIVES are copied here (same algorithm, this rule's own trigger/
// property vocabulary) rather than the file itself.
//
// WHAT THIS CATCHES. A persisted UI STATE (the current tab, the selected
// thumbnail, the active pagination page, an expanded accordion) that is
// visually distinguished from its resting sibling by COLOUR ALONE fails
// WCAG 1.4.1 (use of colour) for anyone who cannot perceive the colour
// difference — colour-blindness, low vision, greyscale/high-contrast
// display modes. This rule flags a block's own style.css when every
// declaration on a real "current/selected/active/open" selector is a colour
// property (color/background-color/border*-color/outline-color/fill/stroke/
// text-decoration-color) with nothing else (weight, underline, icon,
// border-WIDTH, shape, size, position) marking the state.
//
// TRIGGER SELECTORS vs `:hover`. `:hover` is TRANSIENT (gone the instant the
// pointer leaves) and is not this rule's concern — a colour-only hover
// affordance is a design choice, not an accessibility defect a persisted-
// state selector is. This rule's trigger vocabulary deliberately never
// includes a bare `:hover` token; a selector whose ONLY state marker is
// `:hover` never matches any trigger pattern below and is silently skipped.
//
// UNION ACROSS OCCURRENCES (load-bearing, per the task brief). The SAME
// selector can appear more than once in one style.css (a base declaration,
// then a state-scoped follow-up, or vice versa — sgs/accordion's `[open]`
// case is the named real example: one rule paints colour, a SEPARATE rule
// elsewhere in the file adds `border-width` on the identical selector). This
// rule collects every property declared under a normalised selector ACROSS
// THE WHOLE FILE before judging colour-only-ness — checking only the first
// occurrence would false-flag that pairing.
//
// SEVERITY. `warn` when every unioned property is unambiguously colour-only.
// `informational` (never a hard fail) when the set also/only contains an
// AMBIGUOUS property (background / box-shadow / filter / opacity) — these
// COULD be colour-only in effect (a flat colour swap) or could carry a real
// shape/texture change depending on the actual value. Any block with at
// least one CLEARLY non-colour property in the union (font-weight,
// border-width, transform, text-decoration, etc.) is not flagged at all —
// a real distinguishing signal already exists.
//
// VALUE-LEVEL BRANCHES (2026-09-07, Bean-scoped, task "Rule 43 false-positive
// triage"). The severity paragraph above used to defer EVERY ambiguous
// property's real effect to "a value-level judgement this rule does not
// attempt" — that blanket deferral produced 8 false positives, all in one of
// three shapes. This fix closes the value-level judgement for THOSE THREE
// SHAPES ONLY, by property/value pattern (never by file path or line
// number, so a new block hitting the same shape is covered for free). The
// general case — an arbitrary `background`/`filter`/`opacity` colour swap
// whose real visual effect this rule cannot see without rendering — remains
// OPEN and UNEVALUATED, deliberately, exactly as the severity paragraph
// above still describes. Do not read the branches below as "value judgement
// solved" — only these three named shapes are resolved:
//
//   (A) SANCTIONED 2-STATE BORDER COLOUR (SgsBorderControl). A block using
//       the framework's supported 2-state border-colour control (a resting
//       `border-{side}: Npx solid transparent` reserving the space, then a
//       state rule that changes only `border-{side}-color`) is not
//       colour-only: the border's WIDTH is always reserved, so a bar
//       APPEARS on state change with zero layout shift and zero reliance on
//       colour perception — the presence/absence of the bar is the signal,
//       colour is secondary. Detected by finding the state selector's BASE
//       selector (the trigger token stripped back out) elsewhere in the
//       same file and checking it already reserves a non-zero border width
//       on the matching side. See `computeBaseSelectorCandidates` +
//       `hasReservedBorderWidth` below.
//   (B) SUPPRESSION VALUES. A rule that turns a visual OFF (`box-shadow:
//       none`, `filter: none`, `opacity: 0`, `background: none|transparent`)
//       is not a state INDICATOR at all — it removes something, it does not
//       distinguish a state by painting a colour. See `classifyBoxShadowValue`
//       ('ignore' branch) + `isSuppressionValue` below.
//   (C) `::backdrop` IS NOT A CONTROL SURFACE. A dialog/fullscreen backdrop
//       never renders content a user reads as UI state — the state it
//       reflects (open/closed) is already conveyed by the dialog's own
//       presence, not by the backdrop's opacity. Any trigger selector
//       targeting `::backdrop` is skipped outright, structurally, for any
//       block using a native `<dialog>`, not just `sgs/modal`.
//
// RECLASSIFICATION, not silencing (tabs `[aria-selected="true"]` inset
// underline bars). A `box-shadow` value is only "ambiguous" when it reads as
// a soft colour wash (a glow: no `inset`, offsets at/near zero, a blur
// radius doing the work). An `inset` shadow with a non-zero primary offset
// draws a hard-edged BAR — a real shape, not a colour wash — and is
// reclassified as a clear non-colour signal, not merely dropped from the
// count. See `classifyBoxShadowValue` ('non-colour' branch).
//
// This value-level reasoning trusts LITERAL CSS length tokens only. A width/
// offset expressed via `var(...)` cannot be resolved statically and is
// treated as UNPROVEN (the branch refuses to reclassify) rather than guessed
// at either way — see `isNonZeroWidthShorthand`'s `var(...)` refusal.

const fs = require( 'fs' );
const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

// ---------------------------------------------------------------------------
// TRIGGER SELECTORS — persisted/current UI state, never a bare `:hover`.
// ---------------------------------------------------------------------------
const TRIGGER_PATTERNS = [
	/\[aria-current(?:=|\])/i,
	/\[aria-selected\s*=\s*["']?true["']?\]/i,
	/\[aria-checked\s*=\s*["']?true["']?\]/i,
	/\[aria-expanded\s*=\s*["']?true["']?\]/i,
	/\.is-active\b/,
	/\.is-selected\b/,
	/\.is-current\b/,
	/\[open\]/,
	/--(active|current|selected)\b/,
];

function isTriggerSelector( selector ) {
	return TRIGGER_PATTERNS.some( ( re ) => re.test( selector ) );
}

// ---------------------------------------------------------------------------
// STRIP PATTERNS — the mirror image of TRIGGER_PATTERNS, used ONLY to
// reconstruct a trigger selector's BASE selector (the resting-state rule the
// same element/class carries without its state token) for shape (A) below.
// Each pattern here captures the FULL token (including a closing `]`/word
// boundary) so removing it leaves clean selector text — the detection
// regexes above only need to prove presence, not extract exact boundaries.
// ---------------------------------------------------------------------------
const STRIP_PATTERNS = [
	/\[aria-current(?:=[^\]]*)?\]/gi,
	/\[aria-selected\s*=\s*["']?true["']?\]/gi,
	/\[aria-checked\s*=\s*["']?true["']?\]/gi,
	/\[aria-expanded\s*=\s*["']?true["']?\]/gi,
	/\.is-active\b/g,
	/\.is-selected\b/g,
	/\.is-current\b/g,
	/\[open\]/g,
	/--(active|current|selected)\b/g,
];

/**
 * Given a normalised (possibly comma-joined) trigger selector, return the
 * unique BASE selector(s) obtained by stripping the trigger token out of
 * each triggered comma-part. A part that isn't itself triggered (e.g. a
 * `:hover` sibling in a comma list) contributes no candidate — `:hover` is
 * never this rule's concern and never needs a base lookup.
 */
function computeBaseSelectorCandidates( normSelector ) {
	const candidates = new Set();
	const parts = normSelector.split( ',' ).map( ( p ) => p.trim() ).filter( Boolean );
	for ( const part of parts ) {
		if ( ! isTriggerSelector( part ) ) continue;
		let stripped = part;
		for ( const re of STRIP_PATTERNS ) stripped = stripped.replace( re, '' );
		stripped = normaliseSelector( stripped );
		if ( stripped ) candidates.add( stripped );
	}
	return [ ...candidates ];
}

// ---------------------------------------------------------------------------
// PROPERTY CLASSIFICATION
// ---------------------------------------------------------------------------
const COLOUR_ONLY_RE = /^(color|background-color|border(-top|-right|-bottom|-left)?-color|outline-color|fill|stroke|text-decoration-color)$/;
const AMBIGUOUS_RE = /^(background|box-shadow|filter|opacity)$/;
const BORDER_COLOUR_RE = /^border(-top|-right|-bottom|-left)?-color$/;

/**
 * Paren-depth-aware whitespace tokeniser — a CSS value like
 * `inset 0 -2px 0 var( --a, var( --b, red ) )` must split into 5 tokens, not
 * explode on the spaces/commas living INSIDE the var()'s argument list.
 */
function tokenizeCssValue( value ) {
	const tokens = [];
	let depth = 0;
	let current = '';
	for ( const ch of value.trim() ) {
		if ( ch === '(' ) depth++;
		if ( ch === ')' ) depth--;
		if ( /\s/.test( ch ) && depth === 0 ) {
			if ( current ) tokens.push( current );
			current = '';
		} else {
			current += ch;
		}
	}
	if ( current ) tokens.push( current );
	return tokens;
}

/**
 * Shape (A) helper. `border-{side}` / `border-{side}-width` (or the
 * shorthand `border` / `border-width` when side is '' — an all-sides
 * `border-color`) reserves visible SPACE the moment it declares a non-zero
 * width — `thin`/`medium`/`thick` count as non-zero named widths. A value
 * built from `var(...)` cannot be resolved statically and is refused
 * (returns false) rather than assumed either way.
 */
function isNonZeroWidthShorthand( value ) {
	const tokens = tokenizeCssValue( value );
	if ( ! tokens.length ) return false;
	const first = tokens[ 0 ].toLowerCase();
	if ( first === 'thin' || first === 'medium' || first === 'thick' ) return true;
	const m = /^(-?\d*\.?\d+)/.exec( first );
	if ( ! m ) return false;
	return parseFloat( m[ 1 ] ) !== 0;
}

function hasReservedBorderWidth( baseValueMap, side ) {
	if ( ! baseValueMap ) return false;
	const candidates = side ? [ `border-${ side }`, `border-${ side }-width` ] : [ 'border', 'border-width' ];
	for ( const prop of candidates ) {
		const value = baseValueMap.get( prop );
		if ( value && isNonZeroWidthShorthand( value ) ) return true;
	}
	return false;
}

function borderColourSide( property ) {
	const m = BORDER_COLOUR_RE.exec( property );
	if ( ! m ) return undefined;
	return m[ 1 ] ? m[ 1 ].slice( 1 ) : '';
}

/**
 * Shape (B) + reclassification helper for `box-shadow` specifically.
 * 'ignore'     — a suppression value (`none`); not an indicator at all.
 * 'non-colour' — an `inset` shadow with a non-zero primary offset; a drawn
 *                bar/edge, a real shape signal, not a colour wash.
 * 'ambiguous'  — anything else (a glow: no inset, offsets at/near zero,
 *                doing its work via blur/spread) — left as this rule's
 *                existing, deliberately unevaluated ambiguous case.
 */
function classifyBoxShadowValue( value ) {
	const v = value.trim().toLowerCase();
	if ( v === 'none' ) return 'ignore';
	const tokens = tokenizeCssValue( value );
	const hasInset = tokens.some( ( t ) => t.toLowerCase() === 'inset' );
	const lengthTokens = tokens.filter( ( t ) => /^-?\d*\.?\d+(px|em|rem|%|vh|vw)?$/.test( t ) );
	const offsetX = lengthTokens[ 0 ];
	const offsetY = lengthTokens[ 1 ];
	const nonZeroOffset = [ offsetX, offsetY ].some( ( t ) => t !== undefined && parseFloat( t ) !== 0 );
	if ( hasInset && nonZeroOffset ) return 'non-colour';
	return 'ambiguous';
}

/**
 * Shape (B) for the OTHER ambiguous properties (`background`/`filter`/
 * `opacity`) — a literal removal value is a suppression, not an indicator.
 * `box-shadow` is handled separately above (it needs the drawn-bar
 * reclassification too, which is a three-way, not a two-way, branch).
 */
function isSuppressionValue( property, value ) {
	const v = value.trim().toLowerCase();
	if ( property === 'filter' ) return v === 'none';
	if ( property === 'opacity' ) return v === '0';
	if ( property === 'background' ) return v === 'none' || v === 'transparent';
	return false;
}

/**
 * @return {'ok'|'warn'|'informational'} 'warn' = every property is
 * unambiguously colour-only. 'informational' = colour-only + at least one
 * ambiguous property, no clear non-colour signal. 'ok' = at least one clear
 * non-colour property exists (including a reclassified one) — a real
 * distinguishing signal, not flagged.
 */
function classifySelectorProperties( normSelector, propsValueMap, allSelectorValueMap ) {
	let hasColourOnly = false;
	let hasAmbiguous = false;
	let hasClearNonColour = false;

	const baseValueMaps = computeBaseSelectorCandidates( normSelector )
		.map( ( cand ) => allSelectorValueMap.get( cand ) )
		.filter( Boolean );

	for ( const [ property, value ] of propsValueMap ) {
		if ( property === 'box-shadow' ) {
			const kind = classifyBoxShadowValue( value );
			if ( kind === 'ignore' ) continue;
			if ( kind === 'non-colour' ) {
				hasClearNonColour = true;
				continue;
			}
			hasAmbiguous = true;
			continue;
		}

		if ( COLOUR_ONLY_RE.test( property ) ) {
			const side = borderColourSide( property );
			if ( side !== undefined && baseValueMaps.some( ( m ) => hasReservedBorderWidth( m, side ) ) ) {
				// Shape (A): the sanctioned 2-state border-colour mechanism —
				// a bar of already-reserved width appears/disappears, a real
				// non-colour signal, not a colour-only one.
				hasClearNonColour = true;
				continue;
			}
			hasColourOnly = true;
			continue;
		}

		if ( AMBIGUOUS_RE.test( property ) ) {
			if ( isSuppressionValue( property, value ) ) continue; // Shape (B): removes, doesn't indicate.
			hasAmbiguous = true;
			continue;
		}

		hasClearNonColour = true;
	}

	if ( hasClearNonColour ) return 'ok';
	if ( hasAmbiguous ) return 'informational';
	if ( hasColourOnly ) return 'warn';
	return 'ok';
}

// ---------------------------------------------------------------------------
// CSS PARSING PRIMITIVES — copied algorithm from check-shared-css-state-
// rules.js (see header note above for why this is a copy, not a require()).
// ---------------------------------------------------------------------------
function stripComments( src ) {
	return src.replace( /\/\*[\s\S]*?\*\//g, ( m ) => m.replace( /[^\n]/g, ' ' ) );
}

function buildLineIndex( src ) {
	const idx = [ 0 ];
	for ( let i = 0; i < src.length; i++ ) {
		if ( src[ i ] === '\n' ) idx.push( i + 1 );
	}
	return idx;
}

function offsetToLine( lineIndex, offset ) {
	let lo = 0;
	let hi = lineIndex.length - 1;
	let ans = 0;
	while ( lo <= hi ) {
		const mid = ( lo + hi ) >> 1;
		if ( lineIndex[ mid ] <= offset ) {
			ans = mid;
			lo = mid + 1;
		} else {
			hi = mid - 1;
		}
	}
	return ans + 1;
}

const CONDITIONAL_AT_RULES = new Set( [ 'media', 'supports', 'container', 'layer' ] );

function parseBlock( src, start, end ) {
	const rules = [];
	let i = start;
	while ( i < end ) {
		const selStart = i;
		let quote = null;
		while ( i < end ) {
			const ch = src[ i ];
			if ( quote ) {
				if ( ch === quote && src[ i - 1 ] !== '\\' ) quote = null;
				i++;
				continue;
			}
			if ( ch === '"' || ch === "'" ) {
				quote = ch;
				i++;
				continue;
			}
			if ( ch === '{' ) break;
			if ( ch === '}' ) return { rules, next: i + 1 };
			i++;
		}
		if ( i >= end ) break;
		const selectorText = src.slice( selStart, i ).trim();
		const blockStart = i + 1;
		let depth = 1;
		let j = blockStart;
		quote = null;
		while ( j < end && depth > 0 ) {
			const ch = src[ j ];
			if ( quote ) {
				if ( ch === quote && src[ j - 1 ] !== '\\' ) quote = null;
				j++;
				continue;
			}
			if ( ch === '"' || ch === "'" ) {
				quote = ch;
				j++;
				continue;
			}
			if ( ch === '{' ) depth++;
			else if ( ch === '}' ) depth--;
			j++;
		}
		const blockEnd = j - 1;
		if ( selectorText.startsWith( '@' ) ) {
			const atNameMatch = selectorText.match( /^@([a-zA-Z-]+)/ );
			const atName = atNameMatch ? atNameMatch[ 1 ].toLowerCase() : '';
			if ( CONDITIONAL_AT_RULES.has( atName ) ) {
				const nested = parseBlock( src, blockStart, blockEnd );
				rules.push( ...nested.rules );
			}
		} else if ( selectorText ) {
			rules.push( { selector: selectorText, bodyStart: blockStart, bodyEnd: blockEnd } );
		}
		i = j;
	}
	return { rules, next: i };
}

function parseDeclarations( src, bodyStart, bodyEnd ) {
	const decls = [];
	let i = bodyStart;
	let declStart = i;
	let parenDepth = 0;
	let quote = null;
	while ( i < bodyEnd ) {
		const ch = src[ i ];
		if ( quote ) {
			if ( ch === quote && src[ i - 1 ] !== '\\' ) quote = null;
			i++;
			continue;
		}
		if ( ch === '"' || ch === "'" ) {
			quote = ch;
			i++;
			continue;
		}
		if ( ch === '(' ) {
			parenDepth++;
			i++;
			continue;
		}
		if ( ch === ')' ) {
			parenDepth--;
			i++;
			continue;
		}
		if ( ch === ';' && parenDepth === 0 ) {
			decls.push( { raw: src.slice( declStart, i ), offset: declStart } );
			declStart = i + 1;
			i++;
			continue;
		}
		i++;
	}
	const tail = src.slice( declStart, bodyEnd );
	if ( tail.trim() ) decls.push( { raw: tail, offset: declStart } );
	return decls;
}

function normaliseSelector( selector ) {
	return selector.replace( /\s+/g, ' ' ).trim();
}

/**
 * Scan one already comment-stripped style.css and return one finding per
 * DISTINCT triggered selector whose UNIONED property set (across every
 * occurrence in the file) classifies as 'warn' or 'informational'.
 */
function scanBlockCss( strippedSrc ) {
	const lineIndex = buildLineIndex( strippedSrc );
	const { rules } = parseBlock( strippedSrc, 0, strippedSrc.length );

	const selectorValueMap = new Map(); // normSelector -> Map(property -> last raw value)
	const selectorFirstLine = new Map(); // normSelector -> line
	const selectorRawText = new Map(); // normSelector -> original selector text (first seen)
	const triggeredSelectors = new Set();

	for ( const rule of rules ) {
		const normSelector = normaliseSelector( rule.selector );
		if ( ! selectorValueMap.has( normSelector ) ) selectorValueMap.set( normSelector, new Map() );
		if ( ! selectorFirstLine.has( normSelector ) ) {
			selectorFirstLine.set( normSelector, offsetToLine( lineIndex, rule.bodyStart ) );
			selectorRawText.set( normSelector, normSelector );
		}
		const decls = parseDeclarations( strippedSrc, rule.bodyStart, rule.bodyEnd );
		for ( const { raw } of decls ) {
			const colonIdx = raw.indexOf( ':' );
			if ( colonIdx === -1 ) continue;
			const property = raw.slice( 0, colonIdx ).trim().toLowerCase();
			if ( ! property ) continue;
			const value = raw.slice( colonIdx + 1 ).trim();
			selectorValueMap.get( normSelector ).set( property, value );
		}
		if ( isTriggerSelector( rule.selector ) ) triggeredSelectors.add( normSelector );
	}

	// Shape (C): `::backdrop` is never a control surface — a dialog/
	// fullscreen backdrop conveys no state itself (the dialog's own
	// presence already does), so any trigger targeting it is skipped
	// outright, structurally, for any block using a native `<dialog>`.
	const findings = [];
	for ( const sel of triggeredSelectors ) {
		if ( sel.includes( '::backdrop' ) ) continue;
		const propsValueMap = selectorValueMap.get( sel ) || new Map();
		const verdict = classifySelectorProperties( sel, propsValueMap, selectorValueMap );
		if ( verdict === 'ok' ) continue;
		findings.push( {
			line: selectorFirstLine.get( sel ),
			selector: selectorRawText.get( sel ),
			properties: [ ...propsValueMap.keys() ].sort(),
			verdict,
		} );
	}
	return findings;
}

module.exports = {
	id: '43-colour-only-state-indicator',
	checklistItem: null,
	title: 'A persisted UI state distinguished by colour alone (Spec 35 PART F / WCAG 1.4.1)',
	scope: 'per-block',
	needs: [ 'text:style.css' ],
	run( ctx, block ) {
		const cssFile = path.join( ctx.blocksDir, block.tail, 'style.css' );
		if ( ! fs.existsSync( cssFile ) ) return [];
		const raw = ctx.cache.text( cssFile );
		if ( raw == null ) return [];
		const stripped = stripComments( raw );
		const hits = scanBlockCss( stripped );

		return hits.map( ( h ) =>
			makeFinding( {
				rule: this.id,
				block: block.slug,
				file: cssFile,
				line: h.line,
				severity: h.verdict === 'warn' ? 'warn' : 'informational',
				kind: h.verdict === 'warn' ? 'colour-only-state-indicator' : 'ambiguous-state-property',
				detail:
					h.verdict === 'warn'
						? `${ block.slug }'s "${ h.selector }" (a persisted UI state — current/selected/active/open) is ` +
						  `distinguished from its resting sibling by COLOUR ALONE (declares only: ${ h.properties.join( ', ' ) }). ` +
						  'Fails WCAG 1.4.1 (use of colour) for anyone who cannot perceive the colour difference.'
						: `${ block.slug }'s "${ h.selector }" (a persisted UI state) declares only colour-family and/or ` +
						  `AMBIGUOUS properties (${ h.properties.join( ', ' ) }) — background/box-shadow/filter/opacity CAN carry ` +
						  'a real shape/texture change or could just be a flat colour swap; verify the actual value by eye.',
				fix:
					h.verdict === 'warn'
						? 'Add a non-colour signal to this state rule — font-weight, text-decoration, a border-WIDTH change, an ' +
						  'icon swap, or a shape/size change — so the state reads without relying on colour perception.'
						: 'Check the actual value: if the ambiguous property (background/box-shadow/filter/opacity) resolves to a ' +
						  'flat colour swap with nothing else, add a real non-colour signal per WCAG 1.4.1; if it already carries a ' +
						  'genuine shape/texture change, this finding can be baselined with that reason.',
				keyParts: [ h.verdict, h.selector ],
			} )
		);
	},
	selfTest: {
		fixture: 'fixtures/43-colour-only-state-indicator',
		mustFlag: [ 'colour-only-current', 'bem-modifier-active', 'ambiguous-shadow' ],
		mustFlagKind: {
			'colour-only-current': 'colour-only-state-indicator',
			'bem-modifier-active': 'colour-only-state-indicator',
			'ambiguous-shadow': 'ambiguous-state-property',
		},
		mustNotFlag: [
			'non-colour-real-difference',
			'paired-rule-union',
			'hover-only-excluded',
			'border-reservation-legit',
			'suppression-not-indicator',
			'backdrop-not-a-control',
			'inset-bar-not-ambiguous',
		],
	},
};

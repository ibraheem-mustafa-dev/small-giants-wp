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
// shape/texture change depending on the actual value, which this rule does
// not attempt to evaluate (a value-level judgement, not a property-name
// one). Any block with at least one CLEARLY non-colour property in the
// union (font-weight, border-width, transform, text-decoration, etc.) is not
// flagged at all — a real distinguishing signal already exists.

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
// PROPERTY CLASSIFICATION
// ---------------------------------------------------------------------------
const COLOUR_ONLY_RE = /^(color|background-color|border(-top|-right|-bottom|-left)?-color|outline-color|fill|stroke|text-decoration-color)$/;
const AMBIGUOUS_RE = /^(background|box-shadow|filter|opacity)$/;

/**
 * @return {'ok'|'warn'|'informational'} 'warn' = every property is
 * unambiguously colour-only. 'informational' = colour-only + at least one
 * ambiguous property, no clear non-colour signal. 'ok' = at least one clear
 * non-colour property exists — a real distinguishing signal, not flagged.
 */
function classifyPropertySet( props ) {
	let hasColourOnly = false;
	let hasAmbiguous = false;
	let hasClearNonColour = false;
	for ( const p of props ) {
		if ( COLOUR_ONLY_RE.test( p ) ) hasColourOnly = true;
		else if ( AMBIGUOUS_RE.test( p ) ) hasAmbiguous = true;
		else hasClearNonColour = true;
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

	const selectorPropertyMap = new Map(); // normSelector -> Set(property)
	const selectorFirstLine = new Map(); // normSelector -> line
	const selectorRawText = new Map(); // normSelector -> original selector text (first seen)
	const triggeredSelectors = new Set();

	for ( const rule of rules ) {
		const normSelector = normaliseSelector( rule.selector );
		if ( ! selectorPropertyMap.has( normSelector ) ) selectorPropertyMap.set( normSelector, new Set() );
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
			selectorPropertyMap.get( normSelector ).add( property );
		}
		if ( isTriggerSelector( rule.selector ) ) triggeredSelectors.add( normSelector );
	}

	const findings = [];
	for ( const sel of triggeredSelectors ) {
		const props = selectorPropertyMap.get( sel ) || new Set();
		const verdict = classifyPropertySet( props );
		if ( verdict === 'ok' ) continue;
		findings.push( {
			line: selectorFirstLine.get( sel ),
			selector: selectorRawText.get( sel ),
			properties: [ ...props ].sort(),
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
		mustNotFlag: [ 'non-colour-real-difference', 'paired-rule-union', 'hover-only-excluded' ],
	},
};

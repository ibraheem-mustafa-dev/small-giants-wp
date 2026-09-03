'use strict';

/**
 * Declaration-level classification: is a hover rule "motion-only" (safe for
 * the transform to guard automatically), or OUT OF SCOPE for this
 * transform entirely?
 *
 * OUT OF SCOPE has two reasons, tracked separately for reporting but given
 * IDENTICAL skip behaviour by every caller (transform.js/audit.js just
 * check `'motion' === verdict`, so anything else is left untouched):
 *   - 'colour'                — a colour-family property is present.
 *     Colour hovers are a separate, already-handled track per PHP
 *     helpers-hover-state.php.
 *   - 'text-decoration-only'  — the ONLY non-neutral declaration(s) are
 *     `text-decoration`/`text-decoration-line` (Bean's ruling, 2026-09-03):
 *     a stuck underline after a tap is a minor cosmetic artefact, not a
 *     broken-looking control, and underline-on-hover is the standard
 *     expected link affordance. This is a general classification rule,
 *     not a per-file exception — it fires for ANY rule shaped this way,
 *     and stops firing the instant a MOTION_PROPERTY joins the same rule
 *     (motion always wins — see classifyDeclarations()).
 * One coherent "out of scope" bucket, two labelled reasons, not two
 * diverging code paths — every caller treats both the same way.
 *
 * CONFIDENT-CASE ONLY. Anything this module cannot classify with certainty
 * is reported as UNKNOWN so the checker fails the build rather than the
 * transform guessing. See classifyDeclarations() doc for the exact rule.
 *
 * @package SGS\Blocks
 */

/** Properties that count as "motion" for this transform's purposes. */
const MOTION_PROPERTIES = new Set( [
	'transform',
	'opacity',
	'filter',
	'translate',
	'scale',
	'rotate',
	'box-shadow',
	// Animates position, so a stuck hover leaves a half-swept gradient exactly
	// as a stuck `transform` leaves a lifted card. Added for the paired rules in
	// business-info's attribution link: a generic `:hover` dims it to
	// `opacity: 0.8` and a more specific `:hover` cancels that with `opacity: 1`
	// alongside `background-position`. The generic rule guards (motion wins over
	// its `text-decoration`), so the canceller must guard too — guarding only
	// one of a matched pair leaves the link dimmed on touch with nothing left to
	// undo it.
	'background-position',
] );

/** Properties that count as "colour family" — never auto-guarded here. */
const COLOUR_PROPERTIES = new Set( [
	'color',
	'background',
	'background-color',
	'background-image',
	'border-color',
	'border-top-color',
	'border-right-color',
	'border-bottom-color',
	'border-left-color',
	'outline-color',
	'fill',
	'stroke',
	'text-decoration-color',
	'caret-color',
	'column-rule-color',
] );

/**
 * Shorthand properties whose colour-vs-motion nature depends on the VALUE,
 * not the property name alone (e.g. `border: 1px solid red` carries colour;
 * `transition` and `animation` are process properties that don't paint
 * anything themselves). These are UNKNOWN unless a stricter sub-check below
 * resolves them — see classifyDeclarations().
 */
const AMBIGUOUS_SHORTHANDS = new Set( [ 'border', 'outline', 'background' ] );

/** Properties this transform treats as structurally irrelevant to the
 *  guard decision — they neither paint colour nor move anything, so their
 *  presence alongside a motion property doesn't disqualify the rule. */
const NEUTRAL_PROPERTIES = new Set( [
	'transition',
	'transition-property',
	'transition-duration',
	'transition-timing-function',
	'transition-delay',
	'animation',
	'animation-name',
	'animation-duration',
	'animation-timing-function',
	'animation-delay',
	'animation-iteration-count',
	'animation-fill-mode',
	'animation-play-state',
	'will-change',
	'cursor',
	'pointer-events',
	'z-index',
	'overflow',
	'transform-origin',
] );

/**
 * Text-decoration properties — OUT OF SCOPE, same as COLOUR_PROPERTIES, per
 * Bean's ruling 2026-09-03: a stuck underline after a tap is a minor
 * cosmetic artefact, not a broken-looking control, and underline-on-hover
 * is the standard expected link affordance. Kept as a SEPARATE set (not
 * merged into COLOUR_PROPERTIES) purely so the checker/report can label
 * the two reasons differently in its stats — the SKIP BEHAVIOUR is
 * identical: see classifyDeclarations()'s 'text-decoration-only' branch,
 * which callers (transform.js/audit.js) treat exactly like a 'colour'
 * verdict. One coherent "out of scope" bucket, two reasons.
 *
 * ⛔ This exemption is TEXT-DECORATION-ONLY, not "text-decoration present
 * anywhere". A rule combining `text-decoration` with a MOTION_PROPERTY
 * (transform/opacity/filter/translate/scale/rotate/box-shadow) still
 * returns 'motion' below — hasMotion wins over a pure decoration toggle,
 * because the motion part is the actual touch-safety hazard.
 */
const TEXT_DECORATION_PROPERTIES = new Set( [ 'text-decoration', 'text-decoration-line' ] );

/**
 * Classify a list of {prop, value} declarations.
 *
 * Confident-case contract (matches the brief's "unambiguous case only"):
 *   - MOTION: every declaration is either a MOTION_PROPERTY, a
 *     NEUTRAL_PROPERTY, or a TEXT_DECORATION_PROPERTY, and at least one
 *     MOTION_PROPERTY is present, and NO declaration is a COLOUR_PROPERTY
 *     or an ambiguous shorthand whose value cannot be proven colour-free.
 *     Motion always wins over a co-present decoration toggle — see the
 *     ⛔ note on TEXT_DECORATION_PROPERTIES above.
 *   - COLOUR: at least one declaration is a COLOUR_PROPERTY, or an
 *     ambiguous shorthand whose value contains a colour token.
 *   - TEXT-DECORATION-ONLY: no MOTION_PROPERTY and no COLOUR_PROPERTY is
 *     present, but at least one TEXT_DECORATION_PROPERTY is — e.g.
 *     `a:hover { text-decoration: none; }`. OUT OF SCOPE, same skip
 *     behaviour as 'colour' (see module docblock).
 *   - UNKNOWN: an ambiguous shorthand whose value has no colour token we
 *     can detect (so we can't prove it's colour-free either), OR a
 *     property this module has never seen before, OR zero declarations,
 *     OR the only declarations present are NEUTRAL_PROPERTY (no motion, no
 *     text-decoration, no colour — nothing to classify with confidence).
 *
 * @param {{prop: string, value: string}[]} decls
 * @returns {'motion'|'colour'|'text-decoration-only'|'unknown'}
 */
function classifyDeclarations( decls ) {
	if ( ! decls || 0 === decls.length ) {
		return 'unknown';
	}

	let hasMotion = false;
	let hasTextDecoration = false;
	let hasUnknownProp = false;

	for ( const { prop, value } of decls ) {
		const p = prop.toLowerCase().trim();

		if ( COLOUR_PROPERTIES.has( p ) ) {
			return 'colour';
		}

		if ( AMBIGUOUS_SHORTHANDS.has( p ) ) {
			if ( valueContainsColourToken( value ) ) {
				return 'colour';
			}
			// Can't prove the shorthand is colour-free (e.g. `border: none`,
			// `border-width: 2px` are safe, but `border: var(--x)` might
			// resolve to anything) — only exonerate the clearly-safe shapes.
			if ( ! isProvablyColourFreeShorthand( p, value ) ) {
				hasUnknownProp = true;
				continue;
			}
			continue;
		}

		if ( MOTION_PROPERTIES.has( p ) ) {
			hasMotion = true;
			continue;
		}

		if ( TEXT_DECORATION_PROPERTIES.has( p ) ) {
			hasTextDecoration = true;
			continue;
		}

		if ( NEUTRAL_PROPERTIES.has( p ) ) {
			continue;
		}

		// Custom properties (--x) set inside a hover rule are common for
		// feeding a motion value to a child selector via var(); they carry
		// no colour semantics of their own, so treat as neutral UNLESS the
		// value itself looks like a colour.
		if ( p.startsWith( '--' ) ) {
			if ( valueContainsColourToken( value ) ) {
				return 'colour';
			}
			continue;
		}

		hasUnknownProp = true;
	}

	if ( hasUnknownProp ) {
		return 'unknown';
	}

	if ( hasMotion ) {
		return 'motion';
	}

	if ( hasTextDecoration ) {
		return 'text-decoration-only';
	}

	return 'unknown';
}

/**
 * Cheap, deliberately conservative colour-token sniff used only to resolve
 * ambiguous shorthands/custom-properties. False negatives are fine (they
 * fall through to 'unknown' and get reported); false positives are NOT —
 * this only needs to catch the common literal shapes.
 *
 * @param {string} value
 * @returns {boolean}
 */
function valueContainsColourToken( value ) {
	const v = value.toLowerCase();
	if ( /#[0-9a-f]{3,8}\b/.test( v ) ) {
		return true;
	}
	if ( /\b(rgb|rgba|hsl|hsla|oklch|oklab|color-mix)\s*\(/.test( v ) ) {
		return true;
	}
	if ( /var\(\s*--[a-z0-9-]*(color|colour)/.test( v ) ) {
		return true;
	}
	// bare named colours are too noisy to enumerate reliably (e.g. `red`
	// could theoretically be a `border-style` typo but never legitimately
	// is) — keep this list short and only the common ones.
	if ( /\b(red|blue|green|black|white|transparent|currentcolor)\b/.test( v ) ) {
		return true;
	}
	return false;
}

/**
 * A narrow allowlist of shorthand VALUE shapes proven colour-free —
 * `border: none`, `border: 0`, `border-width: Npx`, `outline: none`.
 * Anything else stays 'unknown' rather than guessed at.
 *
 * @param {string} prop
 * @param {string} value
 * @returns {boolean}
 */
function isProvablyColourFreeShorthand( prop, value ) {
	const v = value.toLowerCase().trim();
	if ( 'none' === v || '0' === v ) {
		return true;
	}
	return false;
}

module.exports = {
	classifyDeclarations,
	MOTION_PROPERTIES,
	COLOUR_PROPERTIES,
	AMBIGUOUS_SHORTHANDS,
	NEUTRAL_PROPERTIES,
	TEXT_DECORATION_PROPERTIES,
};

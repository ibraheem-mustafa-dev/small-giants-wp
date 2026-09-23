'use strict';

/**
 * Shadow lift on hover for STATIC stylesheets (design H4, stylesheet part —
 * `.claude/reports/2026-09-23-shadow-hover-lift-design.md`).
 *
 * For each RESTING rule that draws a `box-shadow` (not `none`/a global
 * keyword) and has no `:hover` rule for the same selector in the same file,
 * this appends a sibling rule:
 *
 *   SEL:hover{box-shadow:<lifted>}
 *
 * The lifted value: each OUTER (non-inset) layer's y-offset and blur are
 * multiplied by 1.25 and rounded to a whole pixel; spread and colour are
 * unchanged; `inset` layers are carried through byte-for-byte. A value that
 * is nothing but a single `var(--wp--preset--shadow--<slug>)` token is
 * looked up in the theme's hover map (`theme.json::settings.custom.shadowHover`,
 * read at run time by run.js and passed in as `ctx.hoverMap`) instead of
 * being scaled — see `liftValue()`.
 *
 * This transform runs BEFORE `scripts/hover-guard/run-transform.js` in
 * `postbuild` (see the report) for BUILT block CSS — that script wraps the
 * plain `SEL:hover{...}` rule this transform writes into the touch-safe
 * guarded form. Because `classify.js` lists `box-shadow` as an unconditional
 * motion property, a single-declaration `box-shadow` rule this transform
 * emits is ALWAYS classified `motion` (never `unknown`/`colour`) — see the
 * report's verification section for a quote of the wrapped output.
 *
 * `theme/sgs-theme/assets/css/*.css` (edited only via `--fix-theme`) is
 * NEVER touched by `hover-guard/run-transform.js` — that script's postbuild
 * wiring only ever scans `build/blocks/**`. So `ctx.wrapGuard` makes THIS
 * transform emit the guarded shape directly for theme files, importing
 * `SGS_HOVER_MEDIA_PARAMS`/`SGS_HOVER_NOT_TOUCH` from
 * `hover-guard/transform.js` (read-only `require`, not an edit to that file)
 * so the two stay byte-identical without copying the literal strings.
 *
 * `--check` runs AFTER the hover guard's own check, so `existingHoverBases()`
 * (used both to decide what still needs lifting during `--build`/`--fix-theme`
 * and to decide what already has its lift during `--check`) recognises
 * EITHER the plain `SEL:hover{}` shape or the guarded
 * `@media (hover:hover) and (pointer:fine){:where(:root:not(.sgs-touch-input))
 * SEL:hover{}}` shape as "already covered" — postcss's `walkRules` descends
 * into every at-rule on its own, so no special nesting handling is needed;
 * this transform only has to strip the known guard prefix before comparing.
 * `findUnguardedLiftRules()` is the separate, stricter scan used by
 * `--check` for THEME files only: it fails on a lift-shaped
 * (single-declaration `box-shadow`) `:hover` rule that is NOT wrapped in the
 * guard media query with the guard prefix, since a theme file should never
 * carry one of those unwrapped.
 *
 * Skipped on purpose (every skip is counted and reported by reason, never
 * silent): `none`/global keywords, a value with no outer (non-inset) layer
 * at all ("inset-only"), a rule whose OWN selector member is already a
 * transient state (`:hover`, `:focus*`, `:active` — this is not a resting
 * rule to begin with), a pseudo-element selector member, a member that
 * already has its own explicit `:hover` rule elsewhere in the file, a rule
 * inside a forced-colours query or `@keyframes`, a value this module cannot
 * parse with confidence (never guessed), a preset-variable shadow with no
 * entry in the hover map (or no map at all), and every rule in a file for a
 * block that declares `supports.sgs.shadowLift: false` (`ctx.disabled`).
 * A selector list mixing skipped and liftable members lifts only the
 * liftable ones. Idempotent: re-running over already-lifted output adds
 * nothing new. No `transition` is added (Council ruling, design doc H4/§Council).
 *
 * @package SGS\Blocks
 */

const postcss = require( 'postcss' );
const { SGS_HOVER_MEDIA_PARAMS, SGS_HOVER_NOT_TOUCH } = require( '../hover-guard/transform.js' );

const TRANSIENT_STATE = /:(hover|focus|focus-within|focus-visible|active)\b/i;
const PSEUDO_ELEMENT = /::|:(before|after|first-line|first-letter)\b/i;
const FORCED_QUERY = /forced-colors\s*:\s*active/i;

const PRESET_VAR_RE = /^var\(\s*--wp--preset--shadow--([a-z0-9-]+)\s*\)$/i;
const LENGTH_RE = /^-?\d*\.?\d+(px|em|rem|%)?$/i;

function ignoredValue( value ) {
	const v = value.trim().toLowerCase();
	return '' === v || /^(none|unset|initial|inherit|revert|revert-layer)(\s*!important)?$/.test( v );
}

function insideExcluded( node ) {
	for ( let p = node.parent; p; p = p.parent ) {
		if ( 'atrule' === p.type && 'media' === p.name.toLowerCase() && FORCED_QUERY.test( p.params ) ) {
			return true;
		}
		if ( 'atrule' === p.type && /keyframes$/i.test( p.name ) ) {
			return true;
		}
	}
	return false;
}

function normalise( s ) {
	return s.replace( /\s+/g, '' );
}

function lineOf( rule ) {
	return rule.source && rule.source.start ? rule.source.start.line : 0;
}

/**
 * Strip the hover-guard's touch-safety prefix, if present, so a
 * guard-wrapped hover rule is recognised the same as a plain one.
 *
 * @param {string} selector
 * @return {string}
 */
function stripGuardPrefix( selector ) {
	const s = selector.trim();
	return s.startsWith( SGS_HOVER_NOT_TOUCH ) ? s.slice( SGS_HOVER_NOT_TOUCH.length ).trim() : s;
}

/**
 * Every selector, normalised, that already has an explicit `:hover` rule
 * ANYWHERE in the file — a hand-authored one, a previous run of this
 * transform's plain output, or the hover-guard's wrapped output.
 *
 * @param {import('postcss').Root} root
 * @return {Set<string>}
 */
function existingHoverBases( root ) {
	const set = new Set();
	root.walkRules( ( rule ) => {
		const sel = rule.selector || '';
		if ( ! sel.includes( ':hover' ) ) {
			return;
		}
		const members = rule.selectors && rule.selectors.length ? rule.selectors : [ sel ];
		for ( const member of members ) {
			const stripped = stripGuardPrefix( member ).trim();
			if ( /:hover$/i.test( stripped ) ) {
				set.add( normalise( stripped.replace( /:hover$/i, '' ) ) );
			}
		}
	} );
	return set;
}

/**
 * Multiply a single length token's number by 1.25 and round to a whole
 * pixel, keeping its original unit (or staying unitless for a bare zero).
 *
 * @param {string} token
 * @return {string}
 */
function scaleLength( token ) {
	const m = /^(-?\d*\.?\d+)(px|em|rem|%)?$/i.exec( token );
	if ( ! m ) {
		return token;
	}
	const value = parseFloat( m[ 1 ] );
	const unit = m[ 2 ] || '';
	if ( 0 === value ) {
		return unit ? `0${ unit }` : '0';
	}
	return `${ Math.round( value * 1.25 ) }${ unit || 'px' }`;
}

/**
 * Lift a single comma-separated `box-shadow` layer.
 *
 * @param {string} layerText
 * @return {{ok:boolean, inset?:boolean, output?:string}}
 */
function liftLayer( layerText ) {
	const tokens = postcss.list.space( layerText.trim() );
	if ( 0 === tokens.length ) {
		return { ok: false };
	}
	const isInset = tokens.some( ( t ) => 'inset' === t.toLowerCase() );
	if ( isInset ) {
		// Inset layers are unchanged — reproduce verbatim, position of the
		// `inset` keyword and all, rather than reassembling.
		return { ok: true, inset: true, output: layerText.trim() };
	}

	const lengths = [];
	let i = 0;
	while ( i < tokens.length && i < 4 && LENGTH_RE.test( tokens[ i ] ) ) {
		lengths.push( tokens[ i ] );
		i++;
	}
	if ( lengths.length < 2 ) {
		return { ok: false }; // can't identify offset-x/offset-y with confidence
	}
	const colourTokens = tokens.slice( i );
	if ( 0 === colourTokens.length ) {
		return { ok: false }; // no colour token left — not a shape we recognise
	}

	const lifted = lengths.map( ( tok, idx ) => ( 1 === idx || 2 === idx ) ? scaleLength( tok ) : tok );
	return { ok: true, inset: false, output: [ ...lifted, ...colourTokens ].join( ' ' ) };
}

/**
 * Lift a full `box-shadow` value (all layers), or resolve a bare preset
 * variable through the theme's hover map.
 *
 * @param {string} rawValue
 * @param {{hoverMap: (Object|null), presetSlugs: Set<string>}} ctx
 * @return {{ok:boolean, output?:string, reason?:string}}
 */
function liftValue( rawValue, ctx ) {
	const value = rawValue.trim();

	const presetMatch = PRESET_VAR_RE.exec( value );
	if ( presetMatch ) {
		const slug = presetMatch[ 1 ];
		if ( ! ctx.hoverMap ) {
			return { ok: false, reason: 'no-hover-map' };
		}
		const mapped = ctx.hoverMap[ slug ];
		if ( 'string' !== typeof mapped || '' === mapped.trim() ) {
			return { ok: false, reason: 'no-map-entry' };
		}
		if ( ctx.presetSlugs.has( mapped.trim() ) ) {
			return { ok: true, output: `var(--wp--preset--shadow--${ mapped.trim() })` };
		}
		return {
			ok: true,
			output: `var(--wp--custom--shadow-hover--${ slug }, var(--wp--preset--shadow--${ slug }))`,
		};
	}

	const layers = postcss.list.comma( value ).filter( ( l ) => '' !== l.trim() );
	if ( 0 === layers.length ) {
		return { ok: false, reason: 'unparseable-value' };
	}

	const lifted = [];
	let sawOuter = false;
	for ( const layer of layers ) {
		const result = liftLayer( layer );
		if ( ! result.ok ) {
			return { ok: false, reason: 'unparseable-value' };
		}
		if ( ! result.inset ) {
			sawOuter = true;
		}
		lifted.push( result.output );
	}
	if ( ! sawOuter ) {
		return { ok: false, reason: 'inset-only' };
	}
	return { ok: true, output: lifted.join( ', ' ) };
}

/**
 * Offset just after the closing brace of the rule starting at `start` —
 * identical technique to shadow-fallback/transform.js's `endOfRule` (brace
 * counting, string/comment aware), needed for the same reason: postcss's
 * own `source.end` is unreliable right before a parent's closing brace in
 * minified/compact output, and this must run over hand-written theme CSS
 * too, where re-serialising the whole tree would rewrite comment text.
 *
 * @param {string} css
 * @param {number} start
 * @return {number}
 */
function endOfRule( css, start ) {
	let depth = 0;
	for ( let i = start; i < css.length; i++ ) {
		const c = css[ i ];
		if ( '"' === c || "'" === c ) {
			for ( i++; i < css.length && css[ i ] !== c; i++ ) {
				if ( '\\' === css[ i ] ) {
					i++;
				}
			}
		} else if ( '/' === c && '*' === css[ i + 1 ] ) {
			i = css.indexOf( '*/', i + 2 );
			if ( -1 === i ) {
				return css.length;
			}
			i++;
		} else if ( '{' === c ) {
			depth++;
		} else if ( '}' === c && 0 === --depth ) {
			return i + 1;
		}
	}
	return css.length;
}

/**
 * Run the transform over a CSS source string.
 *
 * @param {string} css       Input CSS text.
 * @param {string} filename  Path, for messages.
 * @param {{hoverMap: (Object|null), presetSlugs: (Set<string>|undefined), disabled: (boolean|undefined), dryRun: (boolean|undefined), wrapGuard: (boolean|undefined)}} [ctx]
 * @return {{css: string, added: number, skipped: Array<{reason:string, line:number, selector:string}>}}
 */
function transformCss( css, filename, ctx ) {
	ctx = ctx || {};
	const hoverMap = ctx.hoverMap || null;
	const presetSlugs = ctx.presetSlugs || new Set();
	const disabled = true === ctx.disabled;
	const dryRun = true === ctx.dryRun;
	const wrapGuard = true === ctx.wrapGuard;

	const root = postcss.parse( css, { from: filename } );
	const existingHover = existingHoverBases( root );

	const skipped = [];
	const inserts = [];
	let added = 0;

	root.walkRules( ( rule ) => {
		if ( insideExcluded( rule ) ) {
			return;
		}
		const selectorText = rule.selector || '';
		if ( ! selectorText ) {
			return;
		}

		let value = null;
		rule.walkDecls( /^box-shadow$/i, ( decl ) => {
			if ( decl.parent === rule ) {
				value = decl.value;
			}
		} );
		if ( null === value || ignoredValue( value ) ) {
			return; // not a shadow-drawing rule — not a candidate, nothing to report
		}

		if ( disabled ) {
			skipped.push( { reason: 'block-shadow-lift-disabled', line: lineOf( rule ), selector: selectorText } );
			return;
		}

		const members = ( rule.selectors && rule.selectors.length ? rule.selectors : [ selectorText ] ).map( ( s ) => s.trim() );

		const liftableMembers = [];
		for ( const member of members ) {
			if ( TRANSIENT_STATE.test( member ) ) {
				skipped.push( { reason: 'transient-state-selector', line: lineOf( rule ), selector: member } );
				continue;
			}
			if ( PSEUDO_ELEMENT.test( member ) ) {
				skipped.push( { reason: 'pseudo-element-selector', line: lineOf( rule ), selector: member } );
				continue;
			}
			if ( existingHover.has( normalise( member ) ) ) {
				skipped.push( { reason: 'explicit-hover-exists', line: lineOf( rule ), selector: member } );
				continue;
			}
			liftableMembers.push( member );
		}

		if ( 0 === liftableMembers.length ) {
			return; // every member already accounted for above
		}

		const lift = liftValue( value, { hoverMap, presetSlugs } );
		if ( ! lift.ok ) {
			skipped.push( { reason: lift.reason, line: lineOf( rule ), selector: members.join( ', ' ) } );
			return;
		}

		added += liftableMembers.length;

		if ( ! dryRun ) {
			const text = wrapGuard
				? `\n@media ${ SGS_HOVER_MEDIA_PARAMS }{${ liftableMembers.map( ( m ) => `${ SGS_HOVER_NOT_TOUCH } ${ m }:hover` ).join( ',\n' ) }{box-shadow:${ lift.output }}}\n`
				: `\n${ liftableMembers.map( ( m ) => `${ m }:hover` ).join( ',\n' ) }{box-shadow:${ lift.output }}\n`;
			inserts.push( { at: endOfRule( css, rule.source.start.offset ), text } );
		}

		// Idempotence WITHIN a single run: a later rule targeting the same
		// selector won't double-count/double-insert.
		for ( const m of liftableMembers ) {
			existingHover.add( normalise( m ) );
		}
	} );

	let out = css;
	for ( const { at, text } of inserts.sort( ( a, b ) => b.at - a.at ) ) {
		out = out.slice( 0, at ) + text + out.slice( at );
	}

	return { css: out, added, skipped };
}

/**
 * Is `node` nested inside an `@media` at-rule whose params are exactly the
 * hover guard's own `SGS_HOVER_MEDIA_PARAMS` (whitespace-normalised)?
 *
 * @param {import('postcss').Node} node
 * @return {boolean}
 */
function ruleIsInsideHoverGuardMedia( node ) {
	const wanted = SGS_HOVER_MEDIA_PARAMS.replace( /\s+/g, ' ' ).trim();
	for ( let p = node.parent; p; p = p.parent ) {
		if ( 'atrule' === p.type && 'media' === p.name.toLowerCase() && p.params.replace( /\s+/g, ' ' ).trim() === wanted ) {
			return true;
		}
	}
	return false;
}

/**
 * Strict scan for THEME files only (never touched by hover-guard's own
 * postbuild wiring): a rule whose ENTIRE declaration set is exactly one
 * `box-shadow` decl — the shape this transform's own lift rules take — and
 * whose `:hover` selector member is not BOTH prefixed with the hover guard's
 * touch-safety selector AND nested inside its media query. Used by
 * `run.js --check` to fail on a theme lift rule that shipped unguarded
 * (e.g. from before `ctx.wrapGuard` existed, or a hand-authored regression).
 *
 * @param {string} css
 * @param {string} filename
 * @return {Array<{line:number, selector:string}>}
 */
function findUnguardedLiftRules( css, filename ) {
	const root = postcss.parse( css, { from: filename } );
	const out = [];
	root.walkRules( ( rule ) => {
		const sel = ( rule.selector || '' ).trim();
		if ( ! sel ) {
			return;
		}
		const decls = [];
		rule.walkDecls( ( d ) => {
			if ( d.parent === rule ) {
				decls.push( d );
			}
		} );
		if ( 1 !== decls.length || ! /^box-shadow$/i.test( decls[ 0 ].prop ) ) {
			return;
		}
		const insideGuardMedia = ruleIsInsideHoverGuardMedia( rule );
		const members = rule.selectors && rule.selectors.length ? rule.selectors : [ sel ];
		for ( const member of members ) {
			const trimmed = member.trim();
			if ( ! /:hover$/i.test( trimmed ) ) {
				continue;
			}
			const alreadyPrefixed = trimmed.startsWith( SGS_HOVER_NOT_TOUCH );
			if ( ! ( alreadyPrefixed && insideGuardMedia ) ) {
				out.push( { line: lineOf( rule ), selector: trimmed } );
			}
		}
	} );
	return out;
}

module.exports = {
	transformCss,
	liftValue,
	liftLayer,
	scaleLength,
	existingHoverBases,
	findUnguardedLiftRules,
	SGS_HOVER_NOT_TOUCH,
	SGS_HOVER_MEDIA_PARAMS,
};

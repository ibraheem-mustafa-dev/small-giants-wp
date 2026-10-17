'use strict';

/**
 * The CSS classifier for check-focus-system.js. Parses CSS (postcss) or SCSS (postcss-scss),
 * puts every focus-related rule in exactly one category, and returns declaration-level findings
 * keyed by content (path + context + selector + property, never by line).
 *
 * Declaration categories, decided per declaration from the rule's selector shape:
 *   bespoke          an indicator property (outline*, box-shadow, --sgs-focus-shadow) on a positive
 *                    :focus / :focus-visible selector (the element itself or a proxy sibling), or on a
 *                    wrapper painted through :has( :focus… ), or on :focus-within when the subject is
 *                    itself a control; a target, deleted by --fix.
 *   suppress         outline: none | 0 (or outline-style: none, outline-width: 0) on a focus selector
 *                    or on a resting selector whose subject is focusable (selector.js::subjectFocusable);
 *                    a target. The same reset on a non-focusable subject (editor block-selection
 *                    chrome, a decorative shape) is resting-outline.
 *   radius-on-focus  border-radius in a rule whose every member is a focus selector; a target.
 *   legacy-token     a retired token (plan §2.3) in the property or value; a target, fixed by hand.
 *   hover-outline    an outline whose WIDTH or STYLE is set (outline, outline-width, outline-style) on a
 *                    :hover + :focus pair; a target. Never deleted by --fix, because that would also
 *                    delete the hover effect: --fix reports the rule as a hand edit.
 *   shared-shadow    box-shadow on a :hover + :focus pair; allowed, listed (hand in --sgs-focus-under).
 *   shared-outline   outline-color or outline-offset (no width or style) on a :hover + :focus pair;
 *                    allowed, listed: the hover half only recolours an outline the system draws.
 *   shared-state     any other declaration on a focus selector (colour, background, transform, a
 *                    hover/focus pair, a floating label); allowed.
 *   container        a :focus-within (or :has( :focus… )) state on a container that is not itself a
 *                    control; allowed.
 *   forced-resting   a :not( :focus… ) resting rule inside @media (forced-colors); allowed.
 *   resting-outline  an outline on a selector with no positive focus state (hover, invalid input,
 *                    highlight, a :not( :focus-visible ) resting outline outside forced colours);
 *                    it paints a state, not the keyboard indicator; allowed.
 *   allow            the rule is in check-focus-system-allow.json (its retired tokens are still
 *                    reported as legacy-token findings).
 *   system           focus.css.
 *
 * A rule's category is the highest-priority category among its declarations (RULE_PRIORITY).
 *
 * @package SGS\Blocks
 */

const postcss = require( 'postcss' );
const postcssScss = require( 'postcss-scss' );

const { SYSTEM_FILE, RETIRED_TOKEN_RE, INDICATOR_PROPS, groupOf } = require( './config.js' );
const { norm, resolveSelector, contextOf, selectorInfo, countFocus } = require( './selector.js' );

const TARGET_CATEGORIES = new Set( [ 'bespoke', 'suppress', 'radius-on-focus', 'hover-outline', 'legacy-token', 'php-emitter', 'js-emitter', 'json-focus', 'unrecognised' ] );
const FIXABLE = new Set( [ 'bespoke', 'suppress', 'radius-on-focus' ] );

const RULE_PRIORITY = [ 'system', 'allow', 'bespoke', 'suppress', 'radius-on-focus', 'hover-outline', 'php-emitter', 'js-emitter', 'json-focus', 'legacy-token', 'shared-outline', 'shared-shadow', 'shared-state', 'container', 'forced-resting', 'resting-outline', 'unrecognised' ];

const RADIUS_RE = /^border(?:-(?:top|bottom|start|end)-(?:left|right|start|end))?-radius$/;

function hasRetired( text ) {
	RETIRED_TOKEN_RE.lastIndex = 0;
	const hit = RETIRED_TOKEN_RE.test( text );
	RETIRED_TOKEN_RE.lastIndex = 0;
	return hit;
}

function isSuppress( prop, value ) {
	const v = value.replace( /!important/i, '' ).trim().toLowerCase();
	if ( 'outline' === prop || 'outline-style' === prop ) {
		return /^(none|0|0px|0 none|none 0)$/.test( v );
	}
	if ( 'outline-width' === prop ) {
		return /^0(px)?$/.test( v );
	}
	return false;
}

/** True when an outline declaration sets the outline's width or style (not only its colour or offset). */
function setsOutlineShape( prop, value ) {
	if ( 'outline-width' === prop || 'outline-style' === prop ) {
		return true;
	}
	if ( 'outline' !== prop ) {
		return false;
	}
	const STYLES = /\b(auto|dotted|dashed|solid|double|groove|ridge|inset|outset)\b/i;
	return STYLES.test( value ) || /(^|\s)[0-9.]+[a-z%]*(\s|$)|\b(thin|medium|thick)\b/i.test( value );
}

/**
 * Category of one declaration, or null when the declaration is not focus-related.
 *
 * @param {string} prop    lower-cased property
 * @param {string} value
 * @param {Object} sel     selectorInfo()
 * @param {string} context at-rule chain
 */
function declCategory( prop, value, sel, context ) {
	const indicator = INDICATOR_PROPS.has( prop );
	const radius = RADIUS_RE.test( prop );
	const suppress = isSuppress( prop, value );
	const token = hasRetired( `${ prop }:${ value }` );
	const forced = /forced-colors/.test( context );

	if ( sel.anyFocus ) {
		if ( suppress ) {
			return 'suppress';
		}
		if ( indicator ) {
			if ( sel.anyHover ) {
				if ( 'box-shadow' === prop ) {
					return 'shared-shadow';
				}
				return setsOutlineShape( prop, value ) ? 'hover-outline' : 'shared-outline';
			}
			return 'bespoke';
		}
		if ( radius && sel.allFocus && ! sel.anyHover ) {
			return 'radius-on-focus';
		}
		return token ? 'legacy-token' : 'shared-state';
	}
	// A wrapper ringed through :has( :focus… ), or :focus-within on a subject that is itself a
	// control (a button holding an icon), draws the indicator for the focused element: bespoke.
	if ( ( sel.anyHasFocus || ( sel.anyWithin && sel.focusable ) ) && indicator && ! suppress && ! sel.anyHover ) {
		return 'bespoke';
	}
	if ( sel.anyWithin || sel.anyHasFocus ) {
		if ( suppress ) {
			return 'suppress';
		}
		return token ? 'legacy-token' : 'container';
	}
	if ( sel.anyNeg ) {
		if ( suppress && sel.focusable ) {
			return 'suppress';
		}
		if ( token ) {
			return 'legacy-token';
		}
		if ( forced ) {
			return 'forced-resting';
		}
		return indicator ? 'resting-outline' : 'shared-state';
	}
	if ( suppress && sel.focusable ) {
		return 'suppress';
	}
	if ( token ) {
		return 'legacy-token';
	}
	if ( prop.startsWith( 'outline' ) ) {
		return 'resting-outline';
	}
	return null;
}

function ruleCategory( cats ) {
	for ( const c of RULE_PRIORITY ) {
		if ( cats.includes( c ) ) {
			return c;
		}
	}
	return 'unrecognised';
}

function findingKey( f ) {
	return [ f.category, f.path, f.context, f.selector, f.prop ].join( ' | ' );
}

function parse( text, rel ) {
	const syntax = /\.scss$/.test( rel ) ? postcssScss : null;
	return syntax ? syntax.parse( text, { from: rel } ) : postcss.parse( text, { from: rel } );
}

/** Allow-file lookup by path and normalised selector. */
function allowHit( allow, rel, selectorKey, written ) {
	return ( allow || [] ).find( ( a ) => a.path === rel && ( norm( a.selector ) === selectorKey || norm( a.selector ) === written ) ) || null;
}

/**
 * Classify one rule-shaped unit (a postcss rule, or a CSS fragment a PHP/JS emitter writes).
 *
 * @param {{ members: string[], context: string, decls: Array<{prop:string,value:string,node?:Object}> }} unit
 * @param {string} rel
 * @param {{ allow?: Array, emitter?: string }} opts  emitter 'php-emitter' | 'js-emitter' turns
 *   bespoke and suppress into that category (emitters are fixed by hand).
 */
function classifyUnit( unit, rel, opts ) {
	const sel = selectorInfo( unit.members );
	const selectorKey = unit.members.join( ', ' );
	const system = rel === SYSTEM_FILE;
	const allowed = system ? null : allowHit( opts.allow, rel, selectorKey, unit.written ? norm( unit.written ) : '' );
	const decls = [];
	for ( const d of unit.decls ) {
		const prop = d.prop.toLowerCase();
		let cat = declCategory( prop, d.value, sel, unit.context );
		if ( null === cat ) {
			continue;
		}
		if ( system ) {
			cat = 'system';
		} else if ( allowed ) {
			cat = hasRetired( `${ prop }:${ d.value }` ) ? 'legacy-token' : 'allow';
		} else if ( opts.emitter && ( 'bespoke' === cat || 'suppress' === cat || 'radius-on-focus' === cat || 'hover-outline' === cat ) ) {
			cat = opts.emitter;
		}
		decls.push( { prop, value: norm( d.value ), category: cat, node: d.node } );
	}
	if ( 0 === decls.length ) {
		return null;
	}
	let category = ruleCategory( decls.map( ( d ) => d.category ) );
	if ( allowed ) {
		category = 'allow';
	}
	const indicatorDecls = decls.filter( ( d ) => INDICATOR_PROPS.has( d.prop ) || RADIUS_RE.test( d.prop ) );
	const focusSelector = sel.anyFocus || sel.anyWithin || sel.anyHasFocus;
	const indicatorShaped = focusSelector && decls.some( ( d ) => INDICATOR_PROPS.has( d.prop ) );
	return {
		category,
		selector: selectorKey,
		context: unit.context,
		group: groupOf( rel, selectorKey ),
		decls,
		indicatorShaped,
		form: indicatorShaped ? indicatorDecls.map( ( d ) => `${ d.prop }: ${ d.value.toLowerCase() }` ).join( '; ' ) : '',
		allowReason: allowed ? allowed.reason : '',
	};
}

/**
 * @param {string} text
 * @param {string} rel   repo-relative path
 * @param {{ allow?: Array }} opts
 * @returns {{ items: Object[], findings: Object[], gap: Object<string, number>, root: Object }}
 */
function analyseCss( text, rel, opts ) {
	const root = parse( text, rel );
	const items = [];
	const findings = [];
	const gap = { comment: 0, 'at-rule-param': 0, 'decl-value': 0, 'structural-selector': 0 };
	let classifiedFocus = 0;

	root.walkComments( ( c ) => {
		gap.comment += countFocus( c.text );
	} );
	root.walkAtRules( ( a ) => {
		gap[ 'at-rule-param' ] += countFocus( a.params );
	} );
	root.walkDecls( ( d ) => {
		gap[ 'decl-value' ] += countFocus( d.prop ) + countFocus( d.value );
	} );

	root.walkRules( ( rule ) => {
		const written = rule.raws.selector && rule.raws.selector.raw ? rule.raws.selector.raw : rule.selector;
		const decls = ( rule.nodes || [] ).filter( ( n ) => 'decl' === n.type ).map( ( n ) => ( { prop: n.prop, value: n.value, node: n } ) );
		if ( 0 === decls.length ) {
			gap[ 'structural-selector' ] += countFocus( written );
			return;
		}
		const item = classifyUnit( { members: resolveSelector( rule ), context: contextOf( rule ), decls, written: rule.selector }, rel, opts );
		if ( ! item ) {
			// No focus-related declaration; any `:focus` in the selector would have made one.
			gap[ 'structural-selector' ] += countFocus( written );
			return;
		}
		classifiedFocus += countFocus( written );
		item.kind = 'css-rule';
		item.path = rel;
		items.push( item );
		for ( const d of item.decls ) {
			if ( ! TARGET_CATEGORIES.has( d.category ) ) {
				continue;
			}
			const f = { category: d.category, path: rel, context: item.context, selector: item.selector, prop: d.prop, value: d.value, group: item.group, node: d.node };
			f.key = findingKey( f );
			findings.push( f );
		}
	} );

	// Retired tokens named in comments are findings too (plan §2.3: "anywhere in the corpus").
	root.walkComments( ( c ) => {
		RETIRED_TOKEN_RE.lastIndex = 0;
		const tokens = c.text.match( RETIRED_TOKEN_RE );
		RETIRED_TOKEN_RE.lastIndex = 0;
		if ( ! tokens ) {
			return;
		}
		const ctx = contextOf( c );
		const item = { kind: 'css-comment', category: 'legacy-token', path: rel, context: ctx, selector: '/* comment */', group: groupOf( rel, '' ), decls: [], indicatorShaped: false, form: '' };
		items.push( item );
		for ( const t of [ ...new Set( tokens ) ] ) {
			const f = { category: 'legacy-token', path: rel, context: ctx, selector: `/* ${ norm( c.text ).slice( 0, 80 ) } */`, prop: t, value: '', group: item.group, node: null };
			f.key = findingKey( f );
			findings.push( f );
		}
	} );

	return { items, findings, gap, classifiedFocus, root };
}

module.exports = { analyseCss, classifyUnit, declCategory, findingKey, parse, hasRetired, TARGET_CATEGORIES, FIXABLE, RULE_PRIORITY };

/**
 * Shared motion stylesheet contract (Spec 38A §9, §10, §12; FR-38A-17, 18, 23, 27, 42, 49; plan unit M2.2).
 *
 * Reads assets/css/motion.css and the schema's channel map (x-sgs-channels, x-sgs-writes) and asserts:
 *   - every channel owner custom property has a matching @property (syntax and initial value from the schema);
 *   - each composed channel is declared with the schema's exact formula, persistently under its data-sgs-mc token
 *     and in its entrance keyframes; every owner appears in that formula;
 *   - no transition names `all`;
 *   - every :hover rule sits inside the pointer guard and only sets an engagement flag, so nothing outside the
 *     hover media query moves an element on hover; the root and group sources read :hover and :focus-within;
 *   - the entrance's hidden start applies only under .sgs-motion-ready and before data-sgs-in, inside
 *     no-preference; every entrance keyframe declares its channel with the composite formula;
 *   - the reduced-motion block zeroes hover movement and every delay;
 *   - a channel with plain `inputs` (the clip reveal's uniform amount over its four edge owners) gives every owner its
 *     own holder falling back to each input, in every entrance keyframe and in the hidden start;
 *   - the stylesheet's token readers carry no M2.2 allow-list entry;
 *   - no rule paints `box-shadow` or `outline` on :focus-visible, and every arm of the focus system's indicator rule
 *     (theme focus.css) outranks the box-shadow channel's base rule, so on a focused element the focus indicator
 *     replaces the hover ring and accent line.
 * Each check is also run against planted faults (negative controls) so a check that cannot fail fails here.
 *
 * MOTION_CSS_FILE overrides the stylesheet path, for a manual negative control on a planted copy.
 */

const fs = require( 'fs' );
const path = require( 'path' );
const postcss = require( 'postcss' );

const PLUGIN = path.resolve( __dirname, '..', '..' );
const CSS_FILE = process.env.MOTION_CSS_FILE || path.join( PLUGIN, 'assets', 'css', 'motion.css' );
const SCHEMA = JSON.parse( fs.readFileSync( path.join( PLUGIN, 'schemas', 'motion.schema.json' ), 'utf8' ) );
const ALLOWLIST = JSON.parse(
	fs.readFileSync( path.join( PLUGIN, 'scripts', 'data', 'motion-gate-allowlist.json' ), 'utf8' )
);
const HOVER_MEDIA = '(hover: hover) and (pointer: fine)';
const TOUCH_GUARD = ':where(:root:not(.sgs-touch-input))';
const REDUCE = '(prefers-reduced-motion: reduce)';
const NO_PREFERENCE = '(prefers-reduced-motion: no-preference)';
const ENGAGEMENT_FLAG = /^--sgs-mh-(?:root-|group-|item-)?on$/;

const norm = ( value ) => value.replace( /\s+/g, ' ' ).replace( /\(\s+/g, '(' ).replace( /\s+\)/g, ')' ).trim();

function channels() {
	return SCHEMA[ 'x-sgs-channels' ];
}

/** Every registered property a channel reads: its owners' properties and its shared ones (the one perspective). */
function ownerProperties() {
	return channels().flatMap( ( c ) => [ ...( c.owners || [] ).flatMap( ( o ) => o.properties || [] ), ...( c.shared || [] ) ] );
}

/** Channels with a formula, as { channel, property, value }. */
function formulas() {
	return channels()
		.filter( ( c ) => c.formula )
		.map( ( c ) => {
			const colon = c.formula.indexOf( ':' );
			return {
				channel: c.channel,
				property: c.formula.slice( 0, colon ).trim(),
				value: norm( c.formula.slice( colon + 1 ) ),
			};
		} );
}

function mediaChain( node ) {
	const chain = [];
	for ( let p = node.parent; p; p = p.parent ) {
		if ( 'atrule' === p.type ) {
			chain.push( `${ p.name } ${ p.params }` );
		}
	}
	return chain;
}

const inMedia = ( node, query ) => mediaChain( node ).includes( `media ${ query }` );
const inKeyframes = ( node ) => mediaChain( node ).some( ( a ) => a.startsWith( 'keyframes ' ) );

function decls( rule ) {
	const out = {};
	rule.walkDecls( ( d ) => {
		out[ d.prop ] = { value: norm( d.value ), important: d.important };
	} );
	return out;
}

/** Every contract breach in `css`, as human-readable strings (empty when the sheet keeps the contract). */
function contractErrors( css ) {
	const root = postcss.parse( css );
	const errors = [];
	const registered = {};
	root.walkAtRules( 'property', ( at ) => {
		const d = {};
		at.walkDecls( ( x ) => {
			d[ x.prop ] = x.value.replace( /^['"]|['"]$/g, '' ).trim();
		} );
		registered[ at.params.trim() ] = d;
	} );
	for ( const p of ownerProperties() ) {
		const r = registered[ p.name ];
		if ( ! r ) {
			errors.push( `owner ${ p.name } has no @property` );
		} else if ( r.syntax !== p.syntax || r[ 'initial-value' ] !== p.initial || ! r.inherits ) {
			errors.push( `@property ${ p.name } does not match the schema (${ p.syntax }, ${ p.initial })` );
		}
	}

	const rules = [];
	root.walkRules( ( rule ) => rules.push( rule ) );
	const entranceChannels = SCHEMA[ 'x-sgs-writes' ].entrance.channels;
	for ( const f of formulas() ) {
		const channel = channels().find( ( c ) => c.channel === f.channel );
		for ( const name of [ ...channel.owners.flatMap( ( o ) => ( o.properties || [] ).map( ( p ) => p.name ) ), ...( channel.shared || [] ).map( ( p ) => p.name ) ] ) {
			if ( ! f.value.includes( `var(${ name })` ) ) {
				errors.push( `schema formula for ${ f.channel } omits owner ${ name }` );
			}
		}
		const persistent = rules.find( ( r ) => r.selector === `[data-sgs-mc~="${ f.channel }"]` );
		const persistsHere = f.channel !== 'clip-path';
		if ( persistsHere && ( ! persistent || decls( persistent )[ f.property ]?.value !== f.value ) ) {
			errors.push( `channel ${ f.channel } is not declared with its formula under [data-sgs-mc~="${ f.channel }"]` );
		}
		if ( entranceChannels.includes( f.channel ) ) {
			let frames = 0;
			root.walkAtRules( 'keyframes', ( k ) => {
				if ( k.params === `sgs-me-${ f.channel }` ) {
					k.walkRules( ( frame ) => {
						frames++;
						if ( decls( frame )[ f.property ]?.value !== f.value ) {
							errors.push( `keyframe ${ k.params } ${ frame.selector } lacks the ${ f.channel } formula` );
						}
					} );
				}
			} );
			if ( frames < 2 ) {
				errors.push( `entrance channel ${ f.channel } has no from and to keyframes` );
			}
		}
	}

	root.walkAtRules( 'keyframes', ( k ) => {
		k.walkDecls( ( d ) => {
			const f = formulas().find( ( x ) => x.property === d.prop );
			if ( ! d.prop.startsWith( '--' ) && ( ! f || norm( d.value ) !== f.value ) ) {
				errors.push( `keyframe ${ k.params } sets plain ${ d.prop } without the composite formula` );
			}
		} );
	} );

	root.walkDecls( ( d ) => {
		if ( /^transition(-property)?$/.test( d.prop ) && /(^|[\s,])all([\s,]|$)/.test( d.value ) ) {
			errors.push( `transition names all: ${ d.parent.selector } { ${ d.prop }: ${ d.value } }` );
		}
	} );

	for ( const rule of rules ) {
		if ( inKeyframes( rule ) ) {
			continue;
		}
		const d = decls( rule );
		if ( rule.selector.includes( ':hover' ) ) {
			if ( ! inMedia( rule, HOVER_MEDIA ) || ! rule.selector.startsWith( TOUCH_GUARD ) ) {
				errors.push( `unguarded :hover rule: ${ rule.selector }` );
			}
			if ( Object.keys( d ).some( ( prop ) => ! ENGAGEMENT_FLAG.test( prop ) ) ) {
				errors.push( `:hover rule sets more than an engagement flag: ${ rule.selector }` );
			}
		}
		const setsEntrance = Object.keys( d ).some( ( prop ) => /^--sgs-me-(?!a-)/.test( prop ) );
		if ( setsEntrance && ! ( rule.selector.startsWith( '.sgs-motion-ready ' ) && rule.selector.includes( ':not([data-sgs-in])' ) && inMedia( rule, NO_PREFERENCE ) ) ) {
			errors.push( `entrance start state outside .sgs-motion-ready / :not([data-sgs-in]) / no-preference: ${ rule.selector }` );
		}
		if ( d[ 'animation-name' ] && ! inMedia( rule, NO_PREFERENCE ) ) {
			errors.push( `animation outside the no-preference block: ${ rule.selector }` );
		}
	}

	const selectorSet = rules.map( ( r ) => r.selector );
	for ( const needed of [ '[data-sgs-hover-group]:hover', '[data-sgs-hover-group]:focus-within', '[data-sgs-mroot]:hover', '[data-sgs-mroot]:focus-within', '[data-sgs-mitem]:hover', '[data-sgs-mitem]:focus-within', '[data-sgs-mh="self"]:focus-visible' ] ) {
		if ( ! selectorSet.some( ( s ) => s.endsWith( needed ) ) ) {
			errors.push( `source selector missing: ${ needed }` );
		}
	}
	const reads = ( sel, prop, fragment ) => rules.some( ( r ) => r.selector === sel && decls( r )[ prop ]?.value.includes( fragment ) );
	if ( ! reads( '[data-sgs-mh="group"]', '--sgs-mh-on', '--sgs-mh-group-on' ) || ! reads( '[data-sgs-mh="root"]', '--sgs-mh-on', '--sgs-mh-root-on' ) || ! reads( '[data-sgs-mh="item"]', '--sgs-mh-on', '--sgs-mh-item-on' ) ) {
		errors.push( 'group, root or item targets do not read their source flag' );
	}

	errors.push( ...inputErrors( root, rules ) );

	const reduce = rules.filter( ( r ) => inMedia( r, REDUCE ) ).map( decls );
	const merged = Object.assign( {}, ...reduce );
	for ( const [ prop, identity ] of [ [ '--sgs-mh-tx', '0px' ], [ '--sgs-mh-ty', '0px' ], [ '--sgs-mh-rot', '0deg' ], [ '--sgs-mh-s', '1' ] ] ) {
		if ( merged[ prop ]?.value !== identity ) {
			errors.push( `reduced motion does not zero ${ prop }` );
		}
	}
	for ( const prop of [ 'transition-delay', 'animation-delay' ] ) {
		if ( merged[ prop ]?.value !== 'initial' || ! merged[ prop ].important ) {
			errors.push( `reduced motion does not zero ${ prop }` );
		}
	}
	if ( ! merged[ 'transition-duration' ]?.important ) {
		errors.push( 'reduced motion does not make state changes instant' );
	}
	return errors;
}

/**
 * A channel with plain `inputs` (x-sgs-channels): each owner property `--sgs-me-<x>` is set, in every frame of its
 * entrance keyframes and in its hidden start, to its own holder `--sgs-me-<end>-<x>` falling back to the input's holder
 * `--sgs-me-<end>-<input>`, so a uniform value reaches every owner and a per-owner value overrides it.
 */
function inputErrors( root, rules ) {
	const errors = [];
	const suffix = ( name ) => name.slice( '--sgs-me-'.length );
	for ( const channel of channels().filter( ( c ) => ( c.inputs || [] ).length ) ) {
		const owners = channel.owners.flatMap( ( o ) => ( o.properties || [] ).map( ( p ) => p.name ) );
		const holds = ( d, end, where ) => {
			const fallback = channel.inputs.reduceRight( ( inner, input ) => `var(--sgs-me-${ end }-${ suffix( input.name ) }, ${ inner })`, '0%' );
			for ( const name of owners ) {
				const want = `var(--sgs-me-${ end }-${ suffix( name ) }, ${ fallback })`;
				if ( d[ name ]?.value !== norm( want ) ) {
					errors.push( `${ where } does not set ${ name } to ${ want }` );
				}
			}
		};
		root.walkAtRules( 'keyframes', ( k ) => {
			if ( k.params === `sgs-me-${ channel.channel }` ) {
				k.walkRules( ( frame ) => holds( decls( frame ), 'from' === frame.selector ? 'from' : 'to', `keyframe ${ k.params } ${ frame.selector }` ) );
			}
		} );
		const start = rules.find( ( r ) => r.selector.endsWith( `:not([data-sgs-in])[data-sgs-me~="${ channel.channel }"]` ) );
		if ( ! start ) {
			errors.push( `the ${ channel.channel } entrance has no hidden start` );
		} else {
			holds( decls( start ), 'from', `the ${ channel.channel } hidden start` );
		}
	}
	return errors;
}

/** Motion tokens the sheet reads outside comments. */
function tokensRead( css ) {
	const text = css.replace( /\/\*[\s\S]*?\*\//g, '' );
	const found = new Set();
	for ( const [ key, entry ] of Object.entries( SCHEMA[ 'x-sgs-tokens' ] ) ) {
		if ( text.includes( `var(${ entry.cssVar }` ) ) {
			found.add( key );
		}
	}
	return found;
}

/**
 * Every `--sgs-mh-to-*` the renderer can emit for a hover state, derived the way the emitter names them: an owner
 * property `--sgs-mh-<x>` gives `--sgs-mh-to-<x>`, any other non-timing field gives `--sgs-mh-to-<field key>`, and
 * the resting and active fields (state `rest` or `active`: the rest Z, X and Y angles, the perspective and Follow
 * pointer's maximum angle and axis lock, each written plain to its own property) and the timing fields emit no
 * to-value of their own.
 */
function emittedHoverToValues() {
	const out = new Set();
	for ( const [ key, field ] of Object.entries( SCHEMA.$defs.HoverStateValues.properties ) ) {
		const prop = field[ 'x-sgs-field' ]?.cssProperty;
		if ( ! prop || prop.startsWith( 'transition-' ) || [ 'rest', 'active' ].includes( field[ 'x-sgs-field' ].state ) ) {
			continue;
		}
		out.add( prop.startsWith( '--sgs-mh-' ) ? `--sgs-mh-to-${ prop.slice( '--sgs-mh-'.length ) }` : `--sgs-mh-to-${ key }` );
	}
	return out;
}

/** The emitted to-values the sheet never reads through var(). */
function unreadToValues( css ) {
	const text = css.replace( /\/\*[\s\S]*?\*\//g, '' );
	return [ ...emittedHoverToValues() ].filter( ( name ) => ! text.includes( `var(${ name }` ) );
}

const CSS = fs.readFileSync( CSS_FILE, 'utf8' );

describe( 'motion.css contract', () => {
	test( 'the shared stylesheet keeps every clause of the contract', () => {
		expect( contractErrors( CSS ) ).toEqual( [] );
	} );

	test( 'the two framework tokens it owns are read, and no M2.2 allow-list entry names a token it reads', () => {
		const read = tokensRead( CSS );
		expect( read.has( 'duration.slow' ) ).toBe( true );
		expect( read.has( 'duration.instant' ) ).toBe( true );
		const stale = ALLOWLIST.filter( ( e ) => 'M2.2' === e.delete_in_unit && read.has( e.pattern ) );
		expect( stale ).toEqual( [] );
	} );
} );

describe( 'hover to-values', () => {
	test( 'every --sgs-mh-to-* the renderer can emit has a reader in the sheet', () => {
		expect( emittedHoverToValues().size ).toBeGreaterThanOrEqual( 9 );
		expect( unreadToValues( CSS ) ).toEqual( [] );
	} );

	test( 'negative control: a sheet without the indent reader is caught', () => {
		const planted = CSS.replace( /--sgs-mh-indent: calc\(var\(--sgs-mh-to-indent[^;]*;/, '' );
		expect( planted ).not.toBe( CSS );
		expect( unreadToValues( planted ) ).toEqual( [ '--sgs-mh-to-indent' ] );
	} );
} );

describe( 'negative controls: each planted fault is caught', () => {
	const plants = {
		'an owner without its @property': [ /@property --sgs-mh-s \{[^}]*\}/, '' ],
		'a transition: all': [ /\[data-sgs-mh\] \{ --sgs-mh-on: 0; \}/, '[data-sgs-mh] { --sgs-mh-on: 0; transition: all 1s; }' ],
		'an unguarded hover that moves': [ /@media \(hover: hover\)/, '[data-sgs-mh]:hover { translate: 0 -4px; }\n@media (hover: hover)' ],
		'a hidden start without the ready class': [ /\.sgs-motion-ready \[data-sgs-me~="scroll"\]:not\(\[data-sgs-in\]\)\[data-sgs-me~="opacity"\]/, '[data-sgs-me~="scroll"][data-sgs-me~="opacity"]' ],
		'a keyframe with a plain opacity': [ /(--sgs-me-op: var\(--sgs-me-from-op, 1\);\s*)opacity: [^;]*;/, '$1opacity: 0;' ],
		'a missing item hover selector': [ /:where\(:root:not\(\.sgs-touch-input\)\) \[data-sgs-mitem\]:hover \{[^}]*\}/, '' ],
		'a missing hover-group selector': [ /:where\(:root:not\(\.sgs-touch-input\)\) \[data-sgs-hover-group\]:hover \{[^}]*\}/, '' ],
		'reduced motion that keeps hover movement': [ /--sgs-mh-s: 1;\n\t\}\n\t:is/, '}\n\t:is' ],
		'a persistent channel off its formula': [ /\[data-sgs-mc~="scale"\] \{\n\tscale: [^;]*;/, '[data-sgs-mc~="scale"] {\n\tscale: var(--sgs-mh-s);' ],
		'a clip edge owner without its @property': [ /@property --sgs-me-clip-b \{[^}]*\}/, '' ],
		'a per-axis scale owner without its @property': [ /@property --sgs-me-sy \{[^}]*\}/, '' ],
		'a scale keyframe that drops the x axis owner': [ /(--sgs-me-sy: var\(--sgs-me-to-sy, 1\);\s*scale: [^;]*?) \* var\(--sgs-me-sx\)/, '$1' ],
		'a clip keyframe that drops an edge from the formula': [ /(--sgs-me-clip-l: var\(--sgs-me-to-clip-l[^;]*;\s*)clip-path: [^;]*;/, '$1clip-path: inset(var(--sgs-me-clip-t));' ],
		'a clip edge that ignores the uniform amount': [ /--sgs-me-clip-r: var\(--sgs-me-from-clip-r, var\(--sgs-me-from-clip, 0%\)\);/, '--sgs-me-clip-r: var(--sgs-me-from-clip-r, 0%);' ],
		'a clip hidden start without the left edge': [ /(:not\(\[data-sgs-in\]\)\[data-sgs-me~="clip-path"\] \{\n(?:\t\t--sgs-me-clip-[trb][^\n]*\n){3})\t\t--sgs-me-clip-l[^\n]*\n/, '$1' ],
	};

	test.each( Object.entries( plants ) )( '%s', ( _label, [ find, replace ] ) => {
		expect( CSS ).toMatch( find );
		expect( contractErrors( CSS.replace( find, replace ) ).length ).toBeGreaterThan( 0 );
	} );
} );

describe( 'no motion rule paints on :focus-visible, and the focus system outranks the box-shadow channel', () => {
	const FOCUS_CSS = path.resolve( PLUGIN, '..', '..', 'theme', 'sgs-theme', 'assets', 'css', 'focus.css' );
	const CHANNEL = '[data-sgs-mc~="box-shadow"]';
	const INDICATOR = /^(?:box-shadow|outline(?:-[a-z]+)*)$/;
	const selectorParser = require( 'postcss-selector-parser' );

	/** Every motion.css rule on a :focus-visible selector that declares the indicator (`box-shadow` or `outline*`). */
	const focusPainters = ( css ) => {
		const hits = [];
		postcss.parse( css ).walkRules( ( rule ) => {
			if ( ! /:focus-visible/.test( rule.selector ) ) {
				return;
			}
			rule.walkDecls( ( decl ) => {
				if ( INDICATOR.test( decl.prop ) ) {
					hits.push( `${ norm( rule.selector ) } { ${ decl.prop } }` );
				}
			} );
		} );
		return hits;
	};

	/**
	 * Selectors Level 4 specificity as [ ids, classes, types ]: :is(), :not() and :has() take their most specific
	 * argument, :where() counts nothing, pseudo-elements count as types.
	 */
	const specificityOf = ( selectorText ) => {
		const add = ( a, b ) => [ a[ 0 ] + b[ 0 ], a[ 1 ] + b[ 1 ], a[ 2 ] + b[ 2 ] ];
		const max = ( list ) => list.reduce( ( best, s ) => ( compare( s, best ) > 0 ? s : best ), [ 0, 0, 0 ] );
		const ofSelector = ( sel ) =>
			sel.nodes.reduce( ( acc, node ) => {
				switch ( node.type ) {
					case 'id':
						return add( acc, [ 1, 0, 0 ] );
					case 'class':
					case 'attribute':
						return add( acc, [ 0, 1, 0 ] );
					case 'tag':
						return add( acc, [ 0, 0, 1 ] );
					case 'pseudo': {
						const name = node.value.toLowerCase();
						if ( ':where' === name ) {
							return acc;
						}
						if ( [ ':is', ':not', ':has', ':matches' ].includes( name ) ) {
							return add( acc, max( node.nodes.map( ofSelector ) ) );
						}
						return add( acc, name.startsWith( '::' ) ? [ 0, 0, 1 ] : [ 0, 1, 0 ] );
					}
					default:
						return acc;
				}
			}, [ 0, 0, 0 ] );
		let result = null;
		selectorParser( ( root ) => {
			result = max( root.nodes.map( ofSelector ) );
		} ).processSync( selectorText );
		return result;
	};
	function compare( a, b ) {
		for ( let i = 0; i < 3; i++ ) {
			if ( a[ i ] !== b[ i ] ) {
				return a[ i ] - b[ i ];
			}
		}
		return 0;
	}

	/** The focus system's indicator arms: the selectors of the rule that declares `outline` outside every at-rule. */
	const indicatorArms = ( css ) => {
		const arms = [];
		postcss.parse( css ).walkRules( ( rule ) => {
			const atTop = 'root' === rule.parent.type;
			if ( atTop && rule.nodes.some( ( n ) => 'decl' === n.type && 'outline' === n.prop ) && ! /::/.test( rule.selector ) ) {
				arms.push( ...rule.selectors.map( norm ) );
			}
		} );
		return arms;
	};

	/** The arms that do NOT outrank the channel's base rule (empty when every arm wins on specificity). */
	const losingArms = ( focusCss, motionCss ) => {
		const channel = [];
		postcss.parse( motionCss ).walkRules( ( rule ) => {
			if ( rule.selector === CHANNEL ) {
				channel.push( specificityOf( rule.selector ) );
			}
		} );
		if ( 1 !== channel.length ) {
			return [ `want one ${ CHANNEL } rule in motion.css, found ${ channel.length }` ];
		}
		const arms = indicatorArms( focusCss );
		if ( 0 === arms.length ) {
			return [ 'no indicator arm found in focus.css' ];
		}
		return arms.filter( ( arm ) => compare( specificityOf( arm ), channel[ 0 ] ) <= 0 );
	};

	const FOCUS = fs.readFileSync( FOCUS_CSS, 'utf8' );

	test( 'no :focus-visible box-shadow rule in motion.css (nor any outline)', () => {
		expect( focusPainters( CSS ) ).toEqual( [] );
	} );

	test( 'the channel base rule still draws the ring and accent line on hover', () => {
		expect( CSS ).toMatch( /\[data-sgs-mc~="box-shadow"\] \{\n\tbox-shadow: 0 0 0 var\(--sgs-mh-ring\)/ );
	} );

	test( 'every focus system indicator arm, the element arm first, outranks the box-shadow channel', () => {
		const arms = indicatorArms( FOCUS );
		expect( arms[ 0 ] ).toMatch( /^:focus-visible:not\(#wpadminbar \*/ );
		expect( specificityOf( arms[ 0 ] ) ).toEqual( [ 1, 1, 0 ] );
		expect( specificityOf( CHANNEL ) ).toEqual( [ 0, 1, 0 ] );
		expect( losingArms( FOCUS, CSS ) ).toEqual( [] );
	} );

	test( 'negative control: a :focus-visible box-shadow rule in motion.css is caught', () => {
		const planted = `${ CSS }\n${ CHANNEL }:focus-visible { box-shadow: 0 0 0 var(--sgs-mh-ring) var(--sgs-mh-ring-c); }\n`;
		expect( focusPainters( planted ) ).toEqual( [ `${ CHANNEL }:focus-visible { box-shadow }` ] );
	} );

	test( 'negative control: an element arm with no weight (wrapped in :where()) loses to the channel', () => {
		const planted = FOCUS.replace( /^:focus-visible:not\(#wpadminbar \*[^\n]*,$/m, ':where(:focus-visible),' );
		expect( planted ).not.toBe( FOCUS );
		expect( losingArms( planted, CSS ) ).toEqual( [ ':where(:focus-visible)' ] );
	} );

	test( 'negative control: the specificity count is not vacuous', () => {
		expect( specificityOf( ':not(#a *, .b)' ) ).toEqual( [ 1, 0, 0 ] );
		expect( specificityOf( ':is(.a, .b .c)' ) ).toEqual( [ 0, 2, 0 ] );
		expect( specificityOf( ':where(#a) p::before' ) ).toEqual( [ 0, 0, 2 ] );
	} );
} );

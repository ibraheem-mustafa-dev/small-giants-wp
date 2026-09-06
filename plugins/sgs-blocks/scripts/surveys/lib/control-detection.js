/**
 * control-detection.js
 *
 * Answers ONE question per (block, attribute): **can a client set this?**
 *
 * WHY THIS EXISTS
 * ---------------
 * The wrapper-capability census measures three things. Its PAINT side is
 * self-tested and break-injected. Its CONTROL side was a pair of regexes looking
 * for `setAttributes({ attr: … })`, and that is not how this codebase writes
 * controls. Measured consequence: the orphan count swung between 61 and 159
 * depending on the denominator, and neither figure could be trusted, because a
 * control bound any way other than a literal key was invisible.
 *
 * The real shapes, taken from the tree rather than assumed —
 *
 *   COMPUTED KEY (`sgs/accordion/edit.js:135`):
 *       setAttributes( {
 *         [ tier === "tablet" ? "paddingTablet" : "paddingMobile" ]: next,
 *       } );
 *   There is no literal `paddingTablet:` anywhere in that file. A name-matching
 *   regex reports the attribute as having no control, on a block whose inspector
 *   plainly offers it.
 *
 *   NATIVE SUPPORT (`sgs/accordion/block.json`):
 *       "supports": { "spacing": { "padding": true, "margin": true } }
 *   WordPress renders the Dimensions panel and stores under `style.spacing.*`.
 *   The block declares no `padding` attribute at all, so an attribute-keyed scan
 *   finds nothing and concludes nothing controls it.
 *
 * DETECT BY BEHAVIOUR, NOT BY COMPONENT NAME. This project's own rule
 * (`detect-a-control-by-what-it-does-not-its-component-name`) is why none of the
 * rules below match on `<BoxControl>`, `<ResponsiveOverride>` or any other tag:
 * a name-keyed rule is blind to every component it wasn't told about, and this
 * framework adds components faster than it updates such lists.
 *
 * @package SGS\Blocks
 */

'use strict';

/**
 * Native `supports` keys that make WordPress render a control, mapped to the
 * attribute names the shared wrapper reads for the same property.
 *
 * Small, named and justified — the mapping between a WP support and an SGS
 * attribute name is a fact about WordPress, not a data dictionary about blocks.
 */
const NATIVE_SUPPORT_ATTRS = {
	'spacing.padding': [ 'padding' ],
	'spacing.margin': [ 'margin' ],
	'spacing.blockGap': [ 'gap' ],
	// `typography.textAlign` makes WP render the "Align text" toolbar button —
	// verified live on the canary 2026-08-15. Some blocks ALSO declare a
	// top-level `textAlign` attribute for the cloning converter to write; the
	// native control is a control either way, so the attribute is not orphaned.
	// Missing this entry reported sgs/cta-section.textAlign as uncontrolled.
	'typography.textAlign': [ 'textAlign' ],
};

function getPath( obj, dotted ) {
	return dotted.split( '.' ).reduce( ( o, k ) => ( o == null ? o : o[ k ] ), obj );
}

/**
 * Extract every attribute name written by a `setAttributes` call.
 *
 * Handles both key forms:
 *   LITERAL   `{ gap: next }`            → "gap"
 *   COMPUTED  `{ [ cond ? "a" : "b" ]: n }` → "a" and "b"
 *
 * The computed form takes every string literal inside the bracket, because the
 * branch taken is a runtime decision and BOTH names are reachable. Over-claiming
 * here is the safe direction: it can only mark an attribute as controlled when a
 * control genuinely writes one of those names.
 *
 * @param {string} src Comment-blanked JS source.
 * @return {Set<string>} Attribute names written.
 */
function attrsWrittenBySetAttributes( src ) {
	const found = new Set();
	const resetOnly = new Set();
	const re = /setAttributes\s*\(/g;
	let m;

	while ( ( m = re.exec( src ) ) !== null ) {
		// Walk to the matching close paren so nested objects/calls stay intact.
		let depth = 0;
		let end = -1;
		for ( let i = m.index + m[ 0 ].length - 1; i < src.length; i++ ) {
			const c = src[ i ];
			if ( c === '(' || c === '{' || c === '[' ) {
				depth++;
			} else if ( c === ')' || c === '}' || c === ']' ) {
				depth--;
				if ( depth === 0 ) {
					end = i;
					break;
				}
			}
		}
		if ( end === -1 ) {
			continue;
		}
		const body = src.slice( m.index, end );

		// Literal keys: `name:` at object-property position.
		//
		// ⛔ A RESET IS NOT A CONTROL. `sgs/site-header/edit.js:545,682` writes
		// `bgSvgMinHeight: ''` as part of a bulk "clear the SVG background"
		// action. Counting that as a control made site-header the ONLY block of
		// six to look like it offered an SVG min-height setting, and it was the
		// odd-one-out that made the finding look block-specific rather than
		// systematic. A write whose value is only ever empty/undefined/null
		// clears the attribute; it never lets a client choose one.
		const lit = /[{,]\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*([^,}]*)/g;
		let l;
		while ( ( l = lit.exec( body ) ) !== null ) {
			const value = ( l[ 2 ] || '' ).trim();
			const isReset = /^(''|""|``|undefined|null)$/.test( value );
			if ( isReset ) {
				resetOnly.add( l[ 1 ] );
			} else {
				found.add( l[ 1 ] );
			}
		}

		// Computed keys: every string literal inside `[ … ]:`
		const comp = /\[([^\]]*)\]\s*:/g;
		let c2;
		while ( ( c2 = comp.exec( body ) ) !== null ) {
			const strs = c2[ 1 ].match( /['"`]([A-Za-z_$][A-Za-z0-9_$]*)['"`]/g ) || [];
			for ( const s of strs ) {
				found.add( s.replace( /['"`]/g, '' ) );
			}
		}
	}

	// An attribute written ONLY as a reset never gave the client a choice.
	for ( const r of resetOnly ) {
		if ( ! found.has( r ) ) {
			resetOnlyAttrs.add( r );
		}
	}
	return found;
}

/** Attributes seen only ever being cleared, never set. Diagnostic surface. */
const resetOnlyAttrs = new Set();

/**
 * Extract attribute names from tier-map props.
 *
 * `<ResponsiveControl attrMap={ { desktop: 'gap', tablet: 'gapTablet' } } />`
 * names its targets as string VALUES rather than writing them itself — the
 * wrapper component performs the write, so no `setAttributes` in this file
 * mentions them.
 *
 * @param {string} src Comment-blanked JS source.
 * @return {Set<string>} Attribute names referenced as tier-map values.
 */
function attrsFromTierMaps( src ) {
	const found = new Set();
	const re = /\b(attrMap|attrs|tierAttrs)\s*=\s*\{\{([^}]*)\}\}/g;
	let m;
	while ( ( m = re.exec( src ) ) !== null ) {
		const strs = m[ 2 ].match( /['"]([A-Za-z_$][A-Za-z0-9_$]*)['"]/g ) || [];
		for ( const s of strs ) {
			found.add( s.replace( /['"]/g, '' ) );
		}
	}
	return found;
}

/**
 * Attributes WordPress itself provides a control for, via native `supports`.
 *
 * @param {Object} blockJson Parsed block.json.
 * @return {Set<string>} Attribute names natively controlled.
 */
function attrsFromNativeSupports( blockJson ) {
	const found = new Set();
	const supports = ( blockJson && blockJson.supports ) || {};
	for ( const [ dotted, attrs ] of Object.entries( NATIVE_SUPPORT_ATTRS ) ) {
		if ( getPath( supports, dotted ) ) {
			attrs.forEach( ( a ) => found.add( a ) );
		}
	}
	return found;
}

/**
 * Every attribute a client can set on this block, from its own inspector.
 *
 * Does NOT include attributes reached through a shared wrapper panel — the
 * caller supplies those from findMounts(), because that resolution needs the
 * panel table and the mount's suppression props.
 *
 * @param {string} editSrc   Comment-blanked edit.js source ('' when absent).
 * @param {Object} blockJson Parsed block.json.
 * @return {{controlled: Set<string>, bySource: Object}} Result.
 */
function findControlledAttrs( editSrc, blockJson ) {
	const written = attrsWrittenBySetAttributes( editSrc );
	const tierMapped = attrsFromTierMaps( editSrc );
	const native = attrsFromNativeSupports( blockJson );
	// A block's own edit.js can declare its OWN indirection map locally (e.g.
	// `const attrFor = { base: 'padding', tablet: 'paddingTablet', ... }` then
	// `setAttributes({ [attrFor[tier]]: next })`) rather than reaching one from
	// a shared component. Proven necessary 2026-09-02 (D917 follow-up):
	// sgs/container's own responsive-box map was invisible because this
	// resolver ran ONLY against the shared-component corpus, never against the
	// calling block's own file -- 13 false "orphaned capability" findings on
	// sgs/container alone (marginMobile/marginTablet/paddingMobile/
	// paddingTablet among them), the SAME shape survey-wrapper-capability.js
	// was built to catch, just one file closer to home than it looked.
	const indirect = attrsFromIndirectionMaps( editSrc );

	const controlled = new Set( [ ...written, ...tierMapped, ...native, ...indirect ] );
	return {
		controlled,
		bySource: {
			setAttributes: [ ...written ].sort(),
			tierMap: [ ...tierMapped ].sort(),
			nativeSupports: [ ...native ].sort(),
			indirectionMap: [ ...indirect ].sort(),
		},
	};
}

/**
 * Resolve a computed key written through an INDIRECTION MAP in another file.
 *
 * ⛔ THE BLIND SPOT THIS CLOSES (Bean, 2026-08-15). The census reported 36
 * missing colour controls across 8 blocks. All 36 were false. The overlay family
 * is controlled by `src/components/GradientOverlayControl.js`, which writes:
 *
 *     const DEFAULT_ATTR_NAMES = { …, solid: 'backgroundOverlayColour' };   // :196-202
 *     function GradientOverlayControl( { attrNames = DEFAULT_ATTR_NAMES, … } )
 *     setAttributes( { [ attrNames.solid ]: val } )                          // :308
 *
 * and is mounted with no `attrNames` prop at `ContainerWrapperControls.js:796`,
 * so the defaults apply. The string `backgroundOverlayColour` therefore appears
 * in NEITHER the block's edit.js NOR the wrapper — it lives two hops away, in a
 * third file's default parameter. Scanning per-block could never see it.
 *
 * The deeper lesson, and the reason this is a named rule rather than a patch:
 * TWO instruments agreed the control was missing, and I read that as
 * corroboration. They were not independent — both scoped per-block, so they
 * shared one blind spot. Agreement between instruments only counts as evidence
 * when they would fail in DIFFERENT ways.
 *
 * Resolution is deliberately conservative: for a computed key `[ ident.prop ]`,
 * take the string values of any `prop:` entry in an object literal in the same
 * file. Over-claiming here can only mark an attribute controlled when some map
 * in that file really does name it.
 *
 * @param {string} src Comment-blanked JS source of a component.
 * @return {Set<string>} Attribute names reachable through indirection maps.
 */
function attrsFromIndirectionMaps( src ) {
	const found = new Set();

	// FORM A — `[ something.prop ]:` resolved against an object map in this file.
	const props = new Set();
	const compRe = /\[\s*[A-Za-z_$][A-Za-z0-9_$]*\s*\.\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\]\s*:/g;
	let m;
	while ( ( m = compRe.exec( src ) ) !== null ) {
		props.add( m[ 1 ] );
	}
	for ( const prop of props ) {
		const mapRe = new RegExp( `\\b${ prop }\\s*:\\s*['"]([A-Za-z_$][A-Za-z0-9_$]*)['"]`, 'g' );
		let mm;
		while ( ( mm = mapRe.exec( src ) ) !== null ) {
			found.add( mm[ 1 ] );
		}
	}

	// FORM B — `[ ident ]:` where ident is a local holding a ternary of names.
	//
	//   const key = 'tablet' === bp ? 'backgroundImageTablet' : 'backgroundImageMobile';
	//   setAttributes( { [ key ]: { … } } );        ContainerWrapperControls.js:867
	//
	// Same idea as FORM A but hoisted to a variable, which is why FORM A alone
	// still reported all four background art-direction tiers as uncontrolled.
	const idents = new Set();
	const bareRe = /\[\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\]\s*:/g;
	let b;
	while ( ( b = bareRe.exec( src ) ) !== null ) {
		idents.add( b[ 1 ] );
	}

	// FORM B2 -- `[ ident[ other ] ]:`, a BRACKET-NESTED computed key (an
	// object-literal lookup rather than a bare local). Same idea as FORM B,
	// one more level of indirection.
	//
	//   const attrFor = { base: 'padding', tablet: 'paddingTablet', mobile: 'paddingMobile' };
	//   setAttributes( { [ attrFor[ tier ] ]: next } );      container/edit.js:613-614
	//
	// Proven necessary 2026-09-02: this exact shape (declared LOCALLY inside a
	// JSX callback, not hoisted to module scope) left marginMobile/
	// marginTablet/paddingMobile/paddingTablet reported orphaned on every one
	// of the 6 blocks using ResponsiveBoxControl this way, even after FORM
	// A/B and findControlledAttrs() were taught to scan the block's own
	// edit.js -- `attrFor` itself was invisible to both existing forms.
	const bracketRe = /\[\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\[\s*[A-Za-z_$][A-Za-z0-9_$]*\s*\]\s*\]\s*:/g;
	while ( ( b = bracketRe.exec( src ) ) !== null ) {
		idents.add( b[ 1 ] );
	}

	for ( const id of idents ) {
		// `[^;]*` (no `\n` exclusion) so a multi-line ternary declaration is
		// captured in full. Proven necessary 2026-09-02: BackgroundPanel.js
		// computes its overlay-opacity key across several lines --
		//     const key =
		//       'desktop' === bp
		//         ? 'backgroundOverlayOpacity'
		//         : ...
		// -- and the old `[^;\n]*` stopped at the first newline (right after
		// `key =`), capturing nothing. `[^;]` already matches a literal
		// newline character in a JS character class with no `s`/dotall flag
		// needed; it still stops correctly at the statement's `;`.
		const declRe = new RegExp( `\\b(?:const|let|var)\\s+${ id }\\s*=\\s*([^;]*)`, 'g' );
		let d;
		while ( ( d = declRe.exec( src ) ) !== null ) {
			const strs = d[ 1 ].match( /['"]([A-Za-z_$][A-Za-z0-9_$]*)['"]/g ) || [];
			for ( const s of strs ) {
				found.add( s.replace( /['"]/g, '' ) );
			}
		}
	}

	// FORM C -- a JSX prop passed as an OBJECT LITERAL configuring a child
	// component's own attribute-name map, e.g.
	//   <ShadowControl attrNames={{ colour: 'shadowColour', hoverColour: 'shadowColourHover' }} />
	// The string appears at neither end of a single file in the usual sense:
	// the literal lives in the CALLER's JSX prop, and is only consumed inside
	// the CALLEE against a differently-named function parameter (`attrNames.colour`)
	// -- a two-hop indirection FORM A/B do not cover, since there is no
	// same-file map keyed by the destructured parameter name to resolve
	// against. Proven necessary 2026-09-02: sgs/container's own
	// shadowColour/shadowColourHover and shapeDivider*Colour* families were
	// reported orphaned this exact way. Treating every string value inside a
	// JSX prop's inline object literal as a plausible controlled attribute
	// name is deliberately permissive (matching this function's existing
	// documented stance: over-claiming here can only mark an attribute
	// controlled when a real map really does name it) -- a non-attribute
	// string value (e.g. a CSS colour, a label) simply adds a harmless name
	// no `block_attributes` row will ever match.
	const jsxObjRe = /=\s*\{\s*\{([^{}]*)\}\s*\}/g;
	let j;
	while ( ( j = jsxObjRe.exec( src ) ) !== null ) {
		const strs = j[ 1 ].match( /:\s*['"]([A-Za-z_$][A-Za-z0-9_$]*)['"]/g ) || [];
		for ( const s of strs ) {
			found.add( s.replace( /^:\s*['"]/, '' ).replace( /['"]$/, '' ) );
		}
	}

	return found;
}

/**
 * Every attribute any SHARED control component writes.
 *
 * The corpus is the shared component directories, because a control mounted from
 * a block does its writing in the component's file, not the block's.
 *
 * @param {Function} readFile  (absPath) => string, already comment-blanked.
 * @param {string[]} files     Absolute paths of shared component sources.
 * @return {Set<string>} Attribute names written by shared components.
 */
function attrsFromSharedComponents( readFile, files ) {
	const found = new Set();
	for ( const f of files ) {
		const src = readFile( f );
		if ( ! src ) {
			continue;
		}
		for ( const a of attrsWrittenBySetAttributes( src ) ) {
			found.add( a );
		}
		for ( const a of attrsFromIndirectionMaps( src ) ) {
			found.add( a );
		}
		for ( const a of attrsFromTierMaps( src ) ) {
			found.add( a );
		}
	}
	return found;
}

module.exports = {
	NATIVE_SUPPORT_ATTRS,
	attrsWrittenBySetAttributes,
	attrsFromTierMaps,
	attrsFromNativeSupports,
	attrsFromIndirectionMaps,
	attrsFromSharedComponents,
	findControlledAttrs,
};

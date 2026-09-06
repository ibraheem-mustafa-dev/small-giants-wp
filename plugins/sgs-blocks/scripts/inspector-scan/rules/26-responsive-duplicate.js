'use strict';

// GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §12 (THE
// RESPONSIVE WRAPPER FAMILY) source=file evidence=live-read
// src/blocks/container/components/ContainerWrapperControls.js:276-307 + :351-399
// and src/blocks/extensions/image-controls.js:224-281, both read 2026-08-10.
//
// WHY THIS RULE EXISTS — and why it is a NEW rule rather than a widening of an
// existing one.
//
// Contract §12 bans "per-tier duplicate controls rendered side by side instead
// of one wrapped control". Two live shapes breach it, and NO existing detector
// can see either, because every one of them is scoped out of the two files
// where both live. Measured 2026-08-10 by reading each matcher, not its name:
//
//   check-control-ux.js          SHARED_COMPONENT_FILE_BASENAMES skip (:122-124)
//                                excludes ContainerWrapperControls.js outright;
//                                `d.name !== 'extensions'` (:506) excludes the
//                                extensions dir.
//   lint-responsive-controls.py  globs `*/edit.js` ONE level deep (:299), and
//                                EXCLUDED_DIR_PARTS carries "extensions" (:110).
//   rules 21 / 25                scope:'per-block'; core/roster.js admits only
//                                directories carrying a block.json, which
//                                neither components/ nor extensions/ does.
//
// So the gap is a SCOPE gap, not a logic gap. This rule is scope:'global'
// precisely because that is the only ctx in this scanner that can reach both
// `<blocksDir>/*/components/*.js` and `<extensionsDir>/*.js`.
//
// ⛔ Why not widen check-control-ux.js in place: rules/24-raw-canonical-component.js:26-33
// is the house ruling on exactly this question — overlap deliberately rather
// than widen a LIVE gate's corpus, because a passing gate reds the build on its
// first finding. check-control-ux.js is a live `--check` gate in prebuild.
// This rule starts advisory, per rules.json _meta.
//
// ⚠ KNOWN CORPUS GAP, stated rather than hidden: this rule does NOT scan
// `src/components/*.js` (the framework-wide shared components). Reaching it
// would need a path derived by climbing out of ctx.blocksDir, which in
// self-test resolves outside the sandbox temp dir and would make the rule
// un-isolatable. Widening it needs its own ctx plumbing (the way themeDir and
// extensionsDir were plumbed in core/selftest.js), not a hardcoded repo path.
//
// EXPECTED POPULATION, declared BEFORE the first live run per
// rules.json _meta.zeroIsAClaim, by hand-reading the two corpus files: 4 —
// 2 hollow-tier ("Outer max-width by viewport", "Content band width by
// viewport") + 2 sibling-tier-triple (minHeight ×3, sgsHeight ×3).
//
// MEASURED: 8. The gap was reconciled, not accepted, and that reconciliation
// is the only reason two real defects in THIS RULE surfaced — see rules.json's
// advisoryReason for the full account. In short:
//   * 2 extra hollow-tiers are REAL and were invisible to the hand-derivation,
//     because it grepped the literal label "by viewport" and these are labelled
//     Padding (:1264) and Margin (:1289). The detector found what the
//     label-grep structurally could not.
//   * 2 extra sibling-triples (backgroundImage :688, bgVideo :812) are the
//     D521 art-direction media pickers — real, but Spec 35 Part D5 work, not
//     Phase 1.4.
//
// A run returning 0 for either detection — or any number that does not
// reconcile against a hand-derived expectation — is a CLAIM requiring
// investigation, not a pass.

const fs = require( 'fs' );
const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

// The two sanctioned responsive primitives (contract §12 field 1). Named here
// because lint-responsive-controls.py is a WIRED prebuild gate naming exactly
// these two — renaming either must change that gate in the same commit.
const RESPONSIVE_WRAPPERS = new Set( [ 'ResponsiveControl', 'ResponsiveOverride' ] );

const TIERS = [ 'Desktop', 'Tablet', 'Mobile' ];
const TIER_LITERALS = new Set( [ 'desktop', 'tablet', 'mobile' ] );

// A tier branch is "hollow" when it renders a lowercase intrinsic element
// (help text, a note) instead of a control. Uppercase = a React component,
// which we assume IS a control — deliberately conservative: a false negative
// here is a missed finding, a false positive is a rule nobody trusts.
function isIntrinsicElement( name ) {
	return typeof name === 'string' && name.length > 0 && name[ 0 ] === name[ 0 ].toLowerCase();
}

function jsxName( node ) {
	if ( ! node ) return null;
	if ( node.type === 'JSXIdentifier' ) return node.name;
	if ( node.type === 'JSXMemberExpression' ) return jsxName( node.property );
	return null;
}

function elementName( jsxElementNode ) {
	return jsxName( jsxElementNode.openingElement && jsxElementNode.openingElement.name );
}

/** WordPress's asset pickers. Mounting one of these is the mechanical signal
 *  that a per-device family is a MEDIA SOURCE swap (Spec 35 Part D5) rather
 *  than a scalar tier cascade. */
const ASSET_PICKERS = new Set( [ 'MediaUpload', 'MediaUploadCheck' ] );

function subtreeMountsAssetPicker( node ) {
	let found = false;
	const walk = ( n ) => {
		if ( found || ! n || typeof n !== 'object' ) return;
		if ( Array.isArray( n ) ) {
			n.forEach( walk );
			return;
		}
		if ( n.type === 'JSXElement' && ASSET_PICKERS.has( elementName( n ) ) ) {
			found = true;
			return;
		}
		for ( const key of Object.keys( n ) ) {
			if ( key === 'loc' || key === 'start' || key === 'end' ) continue;
			walk( n[ key ] );
		}
	};
	walk( node );
	return found;
}

/** True when this responsive wrapper is the Spec 35 Part D5 art-direction
 *  shape: the wrapper itself mounts an asset picker for its override tiers,
 *  AND a second asset picker exists elsewhere in the file (the always-visible
 *  base/desktop picker, deliberately mounted outside the wrapper).
 *
 *  Both halves are required. The first alone would exempt any wrapper that
 *  happens to contain a picker; the second alone would exempt every wrapper
 *  in a file that mounts a picker anywhere. Together they describe only the
 *  documented pattern.
 *
 *  @param {Object} wrapperPath Babel path of the responsive wrapper JSXElement.
 *  @param {Object} fileAst     The file's full AST, for the outside-the-wrapper check.
 */
function isArtDirectionSwap( wrapperPath, fileAst ) {
	if ( ! subtreeMountsAssetPicker( wrapperPath.node ) ) return false;

	// Count pickers in the whole file; if the only one(s) are inside this
	// wrapper, there is no separate base control mounted outside it.
	let total = 0;
	const wrapperStart = wrapperPath.node.start;
	const wrapperEnd = wrapperPath.node.end;
	const walk = ( n ) => {
		if ( ! n || typeof n !== 'object' ) return;
		if ( Array.isArray( n ) ) {
			n.forEach( walk );
			return;
		}
		if ( n.type === 'JSXElement' && ASSET_PICKERS.has( elementName( n ) ) ) {
			const inside =
				typeof n.start === 'number' &&
				typeof wrapperStart === 'number' &&
				n.start >= wrapperStart &&
				n.end <= wrapperEnd;
			if ( ! inside ) total++;
		}
		for ( const key of Object.keys( n ) ) {
			if ( key === 'loc' || key === 'start' || key === 'end' ) continue;
			walk( n[ key ] );
		}
	};
	walk( fileAst );
	return total > 0;
}

/** Splits `minHeightTablet` -> { base: 'minHeight', tier: 'Tablet' }. A bare
 *  name is the desktop/base tier — which is the whole point: `minHeight` +
 *  `minHeightTablet` + `minHeightMobile` is a triple even though only two
 *  carry a tier word. */
function splitTier( attrName ) {
	for ( const tier of TIERS ) {
		if ( attrName.length > tier.length && attrName.endsWith( tier ) ) {
			return { base: attrName.slice( 0, -tier.length ), tier };
		}
	}
	return { base: attrName, tier: 'Base' };
}

/** Every `setAttributes({ key: ... })` key written anywhere inside a node.
 *  Detects a control by WHAT IT DOES (writes an attribute), never by its
 *  component name — memory rule
 *  `detect-a-control-by-what-it-does-not-its-component-name`. A name-keyed
 *  matcher is blind to any control type nobody anticipated. */
function collectSetAttributesKeys( node, out ) {
	if ( ! node || typeof node !== 'object' ) return out;
	if ( Array.isArray( node ) ) {
		for ( const n of node ) collectSetAttributesKeys( n, out );
		return out;
	}
	// Both call shapes count. `setAttributes(...)` is the destructured form;
	// `props.setAttributes(...)` is the form used by every panel in
	// ContainerWrapperControls.js (e.g. :1492). An Identifier-only matcher was
	// blind to the SECOND, which is the exact shape this rule was built to
	// catch — and because the first fixture used the destructured form,
	// --self-test went GREEN on the defect the rule exists to find. Caught
	// 2026-08-10 by cross-checking the live count against the hand-derived
	// expected population, which is the only reason it surfaced at all.
	const callee = node.type === 'CallExpression' ? node.callee : null;
	const isSetAttributesCall =
		callee &&
		( ( callee.type === 'Identifier' && callee.name === 'setAttributes' ) ||
			( callee.type === 'MemberExpression' &&
				! callee.computed &&
				callee.property &&
				callee.property.type === 'Identifier' &&
				callee.property.name === 'setAttributes' ) );
	if (
		isSetAttributesCall &&
		node.arguments &&
		node.arguments[ 0 ] &&
		node.arguments[ 0 ].type === 'ObjectExpression'
	) {
		for ( const prop of node.arguments[ 0 ].properties ) {
			if ( prop.type === 'ObjectProperty' && ! prop.computed ) {
				const k =
					prop.key.type === 'Identifier'
						? prop.key.name
						: prop.key.type === 'StringLiteral'
							? prop.key.value
							: null;
				// A COMPUTED key (`{ [attrMap[breakpoint]]: val }`) is
				// deliberately skipped: it is the canonical ResponsiveControl
				// idiom, and treating it as a literal write is exactly the
				// false-positive class check-duplicate-controls.js documents
				// at :485.
				if ( k ) out.add( k );
			}
		}
	}
	for ( const key of Object.keys( node ) ) {
		if ( key === 'loc' || key === 'start' || key === 'end' || key === 'leadingComments' ) continue;
		const child = node[ key ];
		if ( child && typeof child === 'object' ) collectSetAttributesKeys( child, out );
	}
	return out;
}

/**
 * Bases that are INDEPENDENT PER-TIER FLAGS, not a responsive value cascade.
 *
 * A cascade resolves ONE tier at a time and falls back up the chain, so it
 * never needs to see two of its own tiers at once. A set of independent
 * per-device flags is conjunctive — "hide on mobile" AND "hide on tablet" are
 * simultaneously meaningful, and the UI deliberately shows them together.
 * Merging those behind the one global toggle would DESTROY the control: the
 * operator could only ever see the active tier's state.
 *
 * The discriminator is mechanism, never the attribute's name or its control's
 * component: does any SINGLE expression reference two or more tier siblings of
 * the same base? Proven against both live instances on 2026-08-10 —
 * fx.js:1305-1307 (`attributes.fxDisableTablet || attributes.fxDisableMobile`)
 * and its `onDeselect` writing `{ fxDisableTablet: false, fxDisableMobile: false }`
 * in one object; conditional-visibility.js computes a combined `visibleOn`
 * summary line from all three tiers.
 *
 * ⛔ These two were NOT baselined. A baseline entry records accepted debt; a
 * false positive is a detector bug, and dumping it into the baseline is the
 * failure mode check-dead-controls.js's own docs call out ("If it
 * false-positives a legit consumption pattern, broaden the script — do NOT dump
 * the finding into the baseline").
 */
function collectSimultaneousBases( node, out, depth = 0 ) {
	if ( ! node || typeof node !== 'object' || depth > 200 ) return out;
	if ( Array.isArray( node ) ) {
		for ( const n of node ) collectSimultaneousBases( n, out, depth + 1 );
		return out;
	}

	// Two tier siblings COMBINED IN ONE EVALUATION — `a || b`, `a && b`, `a === b`.
	//
	// ⚠ Deliberately NOT ObjectExpression/ArrayExpression, though the first
	// version of this check included them. That version was measured and was
	// too blunt: an attribute-DECLARATION block lists every tier in one object
	// (`{ sgsHeightDesktop: { type: 'number' }, sgsHeightTablet: {...}, ... }`,
	// image-controls.js:98-100), as does a destructure — and both are perfectly
	// normal for a cascade. It suppressed BOTH true positives (minHeight and
	// sgsHeight, this rule's own headline targets) alongside the two false ones.
	// DECLARING tiers together is routine; EVALUATING them together is the
	// signal, because a cascade resolves one tier at a time and never needs to.
	if ( node.type === 'LogicalExpression' || node.type === 'BinaryExpression' ) {
		const names = new Set();
		collectIdentifierishNames( node, names, 0 );
		const byBase = new Map();
		for ( const n of names ) {
			const { base, tier } = splitTier( n );
			if ( tier === 'Base' ) continue;
			if ( ! byBase.has( base ) ) byBase.set( base, new Set() );
			byBase.get( base ).add( tier );
		}
		for ( const [ base, tiers ] of byBase ) {
			if ( tiers.size >= 2 ) out.add( base );
		}
	}

	for ( const key of Object.keys( node ) ) {
		if ( key === 'loc' || key === 'start' || key === 'end' || key === 'leadingComments' ) continue;
		const child = node[ key ];
		if ( child && typeof child === 'object' ) collectSimultaneousBases( child, out, depth + 1 );
	}
	return out;
}

/** Every identifier-ish name in a subtree: bare identifiers, `a.b` property
 *  names, and non-computed object keys. */
function collectIdentifierishNames( node, out, depth ) {
	if ( ! node || typeof node !== 'object' || depth > 60 ) return out;
	if ( Array.isArray( node ) ) {
		for ( const n of node ) collectIdentifierishNames( n, out, depth + 1 );
		return out;
	}
	if ( node.type === 'Identifier' ) out.add( node.name );
	if ( node.type === 'MemberExpression' && ! node.computed && node.property?.type === 'Identifier' ) {
		out.add( node.property.name );
	}
	if ( node.type === 'ObjectProperty' && ! node.computed ) {
		if ( node.key?.type === 'Identifier' ) out.add( node.key.name );
		if ( node.key?.type === 'StringLiteral' ) out.add( node.key.value );
	}
	for ( const key of Object.keys( node ) ) {
		if ( key === 'loc' || key === 'start' || key === 'end' || key === 'leadingComments' ) continue;
		const child = node[ key ];
		if ( child && typeof child === 'object' ) collectIdentifierishNames( child, out, depth + 1 );
	}
	return out;
}

/** Files this rule owns — the union no other detector reaches. */
function corpusFiles( ctx ) {
	const files = [];

	// Root 1 — per-block shared components, e.g.
	// src/blocks/container/components/ContainerWrapperControls.js
	if ( ctx.blocksDir && fs.existsSync( ctx.blocksDir ) ) {
		for ( const entry of fs.readdirSync( ctx.blocksDir, { withFileTypes: true } ) ) {
			if ( ! entry.isDirectory() ) continue;
			const compDir = path.join( ctx.blocksDir, entry.name, 'components' );
			if ( ! fs.existsSync( compDir ) ) continue;
			for ( const f of fs.readdirSync( compDir ) ) {
				if ( f.endsWith( '.js' ) ) files.push( path.join( compDir, f ) );
			}
		}
	}

	// Root 2 — the extensions surface, e.g. src/blocks/extensions/image-controls.js
	if ( ctx.extensionsDir && fs.existsSync( ctx.extensionsDir ) ) {
		for ( const f of fs.readdirSync( ctx.extensionsDir ) ) {
			if ( f.endsWith( '.js' ) ) files.push( path.join( ctx.extensionsDir, f ) );
		}
	}

	return files;
}

module.exports = {
	id: '26-responsive-duplicate',
	checklistItem: 26,
	title: 'No responsive control keeps an unmerged non-responsive original, and no hand-written tier siblings in shared components or extensions',
	scope: 'global',
	needs: [ 'ast:shared-components', 'ast:extensions' ],

	// See the ART-DIRECTION EXEMPTION comment at its call site in Detection 1.
	// Kept as a named helper so the negative-control fixtures can exercise both
	// halves of the AND independently.
	_isArtDirectionSwap: isArtDirectionSwap,

	run( ctx ) {
		const findings = [];

		for ( const file of corpusFiles( ctx ) ) {
			const parsed = ctx.cache.parse( file );
			// A parse failure is surfaced by the scanner's own parseErrorFindings
			// channel; silently skipping here would let this rule report clean on
			// a file it never read.
			if ( ! parsed.ok ) continue;

			// ---- Detection 1: a responsive wrapper with a hollow tier branch ----
			//
			// Requires a real AST walk INTO the render-prop callback body — the
			// Python surveys' backward-scan heuristic structurally cannot do this
			// (survey-length-controls.py:22-27 says so in its own docstring: "the
			// real control lives in the CALLER's render-prop body").
			ctx.cache.traverse( file, {
				JSXElement( p ) {
					const name = elementName( p.node );
					if ( ! RESPONSIVE_WRAPPERS.has( name ) ) return;

					// The render prop: {( breakpoint ) => ...}
					let arrow = null;
					for ( const child of p.node.children || [] ) {
						if (
							child.type === 'JSXExpressionContainer' &&
							child.expression &&
							( child.expression.type === 'ArrowFunctionExpression' ||
								child.expression.type === 'FunctionExpression' )
						) {
							arrow = child.expression;
							break;
						}
					}
					if ( ! arrow || ! arrow.params.length ) return;
					const paramName =
						arrow.params[ 0 ].type === 'Identifier' ? arrow.params[ 0 ].name : null;
					if ( ! paramName ) return;

					// Find `param === '<tier>'` guards and inspect what they return.
					const hollowTiers = new Set();
					const visitTest = ( test, returned ) => {
						if ( ! test || test.type !== 'BinaryExpression' ) return;
						if ( test.operator !== '===' && test.operator !== '==' ) return;
						const { left, right } = test;
						const isParam = ( n ) => n && n.type === 'Identifier' && n.name === paramName;
						const litOf = ( n ) => ( n && n.type === 'StringLiteral' ? n.value : null );
						const tier = isParam( left ) ? litOf( right ) : isParam( right ) ? litOf( left ) : null;
						if ( ! tier || ! TIER_LITERALS.has( tier ) ) return;
						if ( ! returned || returned.type !== 'JSXElement' ) return;
						if ( isIntrinsicElement( elementName( returned ) ) ) hollowTiers.add( tier );
					};

					p.traverse( {
						IfStatement( ip ) {
							const cons = ip.node.consequent;
							let ret = null;
							if ( cons && cons.type === 'ReturnStatement' ) ret = cons.argument;
							else if ( cons && cons.type === 'BlockStatement' ) {
								const r = cons.body.find( ( s ) => s.type === 'ReturnStatement' );
								if ( r ) ret = r.argument;
							}
							// Unwrap `return ( <p/> )`
							if ( ret && ret.type === 'JSXFragment' && ret.children ) {
								ret = ret.children.find( ( c ) => c.type === 'JSXElement' ) || ret;
							}
							visitTest( ip.node.test, ret );
						},
						ConditionalExpression( cp ) {
							visitTest( cp.node.test, cp.node.consequent );
						},
					} );

					// ART-DIRECTION EXEMPTION (2026-09-02) — Spec 35 Part D5.
					//
					// A per-device MEDIA SOURCE family is a deliberate RUNTIME SWAP,
					// not a cascade: the desktop picker is mounted OUTSIDE the wrapper
					// as the always-visible base control, and the wrapper carries only
					// the optional tablet/mobile overrides. Its desktop branch renders
					// help text BY DESIGN, so the "hollow tier" signature fires on a
					// shape that is correct. Both live findings (BackgroundPanel.js
					// :289 and :420) were this.
					//
					// ⛔ The exemption CANNOT key on "desktop is the only hollow tier"
					// — that is structurally identical to the genuine-bug fixture
					// `hollow-desktop-tier` (a scalar `maxWidth` cascade), which must
					// keep firing. The discriminator is WHICH CONTROL the branches
					// mount: an asset picker (MediaUpload/MediaUploadCheck) is the
					// art-direction shape; a scalar control (UnitControl et al) is the
					// cascade bug. Both conditions are required — the wrapper mounts a
					// picker AND a picker also exists outside it in the same file,
					// which is what proves the "base mounted outside" claim rather
					// than trusting an unsubstantiated help-text branch.
					if ( hollowTiers.size && isArtDirectionSwap( p, parsed.ast ) ) {
						return;
					}

					for ( const tier of hollowTiers ) {
						findings.push(
							makeFinding( {
								rule: '26-responsive-duplicate',
								block: null,
								file,
								line: p.node.loc ? p.node.loc.start.line : null,
								severity: 'warn',
								detail:
									`<${ name }> renders static markup instead of a control for the "${ tier }" tier. ` +
									'That is the signature of a responsive control added ALONGSIDE its non-responsive ' +
									'original rather than replacing it: the original still owns that tier, so the ' +
									'client sees two controls for one property and the wrapper has a hole where a ' +
									'control should be.',
								fix:
									`Fold the standalone ${ tier } control into <${ name }> so every tier renders the ` +
									'same real control, then delete the original and its "set above" help branch. Keep ' +
									'the base attribute as the desktop value so nothing stored changes, and MOVE any ' +
									'explanatory help text onto the merged control rather than dropping it.',
								keyParts: [ 'hollow-tier', name, tier ],
							} )
						);
					}
				},
			} );

			// ---- Detection 2: hand-written tier siblings, no wrapper ----
			const simultaneous = collectSimultaneousBases( parsed.ast, new Set() );
			const groups = new Map(); // base -> Map<tier, {line}>
			ctx.cache.traverse( file, {
				JSXElement( p ) {
					// Inside a sanctioned wrapper = the canonical shape. Skip.
					const insideWrapper = p.findParent(
						( parent ) =>
							parent.isJSXElement() && RESPONSIVE_WRAPPERS.has( elementName( parent.node ) )
					);
					if ( insideWrapper ) return;
					if ( RESPONSIVE_WRAPPERS.has( elementName( p.node ) ) ) return;

					const keys = collectSetAttributesKeys( p.node.openingElement, new Set() );
					if ( ! keys.size ) return;

					for ( const attr of keys ) {
						const { base, tier } = splitTier( attr );
						if ( ! groups.has( base ) ) groups.set( base, new Map() );
						if ( ! groups.get( base ).has( tier ) ) {
							groups.get( base ).set( tier, p.node.loc ? p.node.loc.start.line : null );
						}
					}
				},
			} );

			for ( const [ base, tierMap ] of groups ) {
				// A real tier family needs at least one explicit tier word — two
				// unrelated controls both writing `foo` would otherwise group.
				const explicitTiers = [ ...tierMap.keys() ].filter( ( t ) => t !== 'Base' );
				if ( tierMap.size < 2 || explicitTiers.length === 0 ) continue;
				// Independent per-tier flags, not a cascade — see
				// collectSimultaneousBases. Skipping here rather than baselining,
				// because this is a detector bug and not accepted debt.
				if ( simultaneous.has( base ) ) continue;

				const shown = [ ...tierMap.keys() ]
					.map( ( t ) => ( t === 'Base' ? base : base + t ) )
					.sort()
					.join( ', ' );
				const firstLine = Math.min(
					...[ ...tierMap.values() ].filter( ( l ) => typeof l === 'number' )
				);

				findings.push(
					makeFinding( {
						rule: '26-responsive-duplicate',
						block: null,
						file,
						line: Number.isFinite( firstLine ) ? firstLine : null,
						severity: 'warn',
						detail:
							`${ tierMap.size } hand-written sibling controls write the "${ base }" tier family ` +
							`(${ shown }) without a <ResponsiveControl> / <ResponsiveOverride> wrapper. The ONE ` +
							'global device toggle cannot drive them, so the client sees a stack of per-device ' +
							'controls the rest of the editor no longer has.',
						fix:
							`Wrap the "${ base }" family in a single <ResponsiveControl> whose render prop returns ` +
							'one control, writing the tier attribute via a computed key. Copy the shape already ' +
							'used in src/blocks/container/edit.js and src/blocks/physics-canvas/edit.js — do not ' +
							'invent a new one. If the value domain changes as part of the merge, ship the stored- ' +
							'content migration with it.',
						keyParts: [ 'sibling-tier-triple', base ],
					} )
				);
			}
		}

		return findings;
	},

	selfTest: {
		fixture: 'fixtures/26-responsive-duplicate',
		mustFlag: [
			// Detection 1 — the "by viewport" shape, desktop branch returns help text.
			'hollow-desktop-tier',
			// Detection 1 via a ternary rather than an if-statement.
			'hollow-tier-ternary',
			// Detection 2 — three siblings, bare base + Tablet + Mobile.
			'sibling-triple-bare-base',
			// Detection 2 — three siblings, all three tier-suffixed (the
			// image-controls shape, where no attribute carries the bare name).
			'sibling-triple-all-suffixed',
			// Detection 2 via `props.setAttributes(...)` rather than the
			// destructured form. Added after the first live run proved the rule
			// was blind to its own headline target while self-test read PASS.
			'sibling-triple-props-setattributes',
		],
		mustNotFlag: [
			// Spec 35 Part D5 art-direction swap: a per-device MEDIA SOURCE family,
			// desktop picker deliberately mounted OUTSIDE the wrapper, so the
			// desktop branch renders help text by design. Added 2026-09-02 to close
			// the two live BackgroundPanel.js false positives.
			// ⛔ PAIRED with `hollow-desktop-tier` in mustFlag above — the two are
			// structurally near-identical and differ only in which control the
			// branches mount (asset picker vs scalar UnitControl). Keep BOTH: if
			// this exemption ever widens to swallow the scalar cascade bug, that
			// fixture is what catches it.
			'art-direction-media-swap',
			// The canonical shape: one control inside the wrapper, computed key.
			'canonical-responsive-control',
			// A wrapper whose every tier returns a real control component.
			'wrapper-all-tiers-real-controls',
			// Two unrelated controls with no tier word between them.
			'unrelated-sibling-controls',
			// A single non-responsive control — nothing to merge.
			'single-control-no-tiers',
			// Local `const`s whose names carry a tier word but which are NOT
			// attributes. This is the exact false positive that a source-identifier
			// scan produced on 2026-08-10 (cwTabletPreset / cwMobileLiteral).
			'tier-named-local-consts',
			// Independent per-device FLAGS (conditional-visibility / fx) — a
			// conjunctive set the operator must see all of at once, not a
			// cascade. Both live instances were flagged by the first run and
			// both are correct as written.
			'independent-per-tier-flags',
		],
	},
};

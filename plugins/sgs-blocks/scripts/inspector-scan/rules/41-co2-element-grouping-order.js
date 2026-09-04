'use strict';

// GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O
// §"THE PLACEMENT RULE" (D537, 2026-08-09) + CO-2 ("element-first grouping")
// + .claude/plans/2026-08-25-road-to-uniform-then-spec-39.md C14 ("Bean
// answered ... 2026-08-27") + C4 ("CO-2 element grouping has no enforcing
// gate ... needs an AST walk of every edit.js, its own build"). source=file
// evidence=live-read plugins/sgs-blocks/scripts/placement-reach.py (the
// existing, correctly-scoped implementation of THE PLACEMENT RULE against
// real block.json data) and rules/35-pinned-panel-position.js (the existing
// implementation of the two PINNED positions named in C14).
//
// WHAT BEAN SETTLED, 2026-08-27 (quoted in the plan doc, C14, "not open for
// re-litigation, only implementation"):
//   "DOM order: first from top to bottom; where two elements sit at the same
//   level, left to right. At root, follow WP-native ordering (Styles, then
//   Colour, then Typography). Pinned positions: the helpers; Advanced always
//   bottom of Settings; Visibility conditions always second from bottom."
//
// WHAT THIS RULE CHECKS (four axes, all reusing placement-reach.py's
// resolution rather than re-deriving it — `getPlacementReach()` below shells
// out to `placement-reach.py --json`, the SAME `resolve_block_detailed()`
// THE PLACEMENT RULE / D537 is built from, exactly the way
// core/components.js's `getStructuralAttrMap()` already shells out to a
// Python helper for DB data. Two callers reading one resolution, never a
// second drifting computation):
//
//   A. CO-2 TIER-1 element grouping. For every element the manifest says
//      owns 2+ attributes, are ALL of that element's controls found inside
//      ONE panel (PanelBody/ToolsPanel) in edit.js? An element's attrs
//      split across 2+ panels is exactly the defect CO-2 exists to catch —
//      "one panel per element, holding that element's content, its styling
//      and its hover together" (THE PLACEMENT RULE, TIER 1).
//   B. CONTESTED manifest gaps. placement-reach.py already reports the
//      ~32-42% of attributes claimable by 2+ elements per the manifest
//      (Bean's own framing in the C14/C4 task: "a judgement call ... a real
//      manifest gap needing an explicit attrMap entry, not something this
//      gate should guess at or silently resolve"). Surfaced here as a
//      distinct, real, actionable finding — never guessed at, never
//      silently tie-broken (placement-reach.py's own resolver already
//      refuses to tie-break these; this rule inherits that refusal rather
//      than second-guessing it with a heuristic of its own).
//   C. Within-block panel ORDER vs each element's declared `order`. THE
//      PLACEMENT RULE already states "Panel order = the element's `order`"
//      (PART O, flagged PROVISIONAL only for the CROSS-block canonical
//      sequence CO-28 still owns — see the scope note below). Reading
//      "DOM order: first from top to bottom" against THIS manifest, within
//      ONE block, is exactly what that provisional per-block ordering
//      already licenses: if edit.js's own JSX places a lower-`order`
//      element's panel AFTER a higher-`order` element's panel, that block
//      contradicts its own declared manifest.
//   D. Root Colour-before-Typography. Bean's "Styles, then Colour, then
//      Typography" clause, narrowed to the one slice that is statically
//      decidable from JSX text position: does `<SgsColourPanel` (the
//      canonical colour mount, plugins/sgs-blocks/CLAUDE.md "Colour
//      controls") appear before `<TypographyControls` (the canonical
//      typography mount, same doc, "TYPOGRAPHY — use the SHARED component")
//      when a block mounts both? Narrow and safe-default on purpose (skip
//      when either is absent) — the same "a false absence here is safe"
//      discipline rule 35 states for its own title match.
//
// WHAT THIS RULE DELIBERATELY DOES NOT CHECK, and why:
//
//   - THE TWO PINNED POSITIONS ("Advanced always bottom", "Visibility
//     conditions always second-from-bottom") are ALREADY gated by
//     rules/35-pinned-panel-position.js. This rule does not duplicate that
//     check — the C14/C4 task brief itself says to "delegate to it rather
//     than duplicating". Read rule 35's own findings for that axis.
//   - THE FULL CROSS-BLOCK CANONICAL ORDER (a fixed sequence of WHICH panel
//     comes before which, library-wide) is CO-28's own open item — "Bean
//     picks the canonical panel order — a Rule 7 design gate" (PART O,
//     "still stands, unreleased"). Axis C above checks a per-block manifest
//     the block's OWN block.json already declares (`order`); it is not a
//     cross-block sequence and does not attempt to be one.
//   - LEFT-TO-RIGHT ordering at the same vertical level (HStack/Flex rows)
//     is not checked — JSX text order and visual row order can diverge for
//     a flex-row layout in a way this rule cannot resolve without laying
//     out the DOM, and a false positive here is worse than a missed one
//     (mirrors rule 35's "a narrow rule that is always right beats a broad
//     rule that is sometimes wrong").
//   - Native `supports`-driven Styles-tab panels (colour/border/spacing
//     rendered by WP core, not this block's own JSX) carry no JSX position
//     to compare against — core renders that slot in a fixed structural
//     place regardless of authoring order (PART O "Where the tabs go"),
//     so axis D only ever compares two of THIS block's own JSX mounts.
//
// SCATTERED-ELEMENT-CONTROLS.JS CAUTIONARY TALE (do not repeat it): a prior
// attempt at this exact class of rule was DELETED 2026-09-02 after ~600
// false positives, because it grouped PURELY by the DB's `css_element`
// column with no knowledge of `isWrapper`/`clusters`/TIER 2 — every
// `wrapper`-element finding was a false positive by design (TIER 2 property
// -family panels are the CORRECT split for a wrapper element, not scatter).
// ⚠ THIS WAS ALSO HIT LIVE WHILE BUILDING THIS RULE, not just anticipated:
// the first version asserted grouping on EVERY element `placement-reach.py`
// resolves an attr to — including `isWrapper: true` elements, since
// placement-reach.py's ownership map does not itself distinguish "explicit
// attrMap/states/contentAttrs claim" (TIER 1) from "cluster-member match on
// a wrapper's declared clusters" (TIER 2) — both land in the same
// `ownership[attr] = elementKey` map. The first live run flagged
// `sgs/accordion`'s "Wrapper" element for splitting Colour/Border/Padding
// across 3 panels — precisely the false-positive class the deleted script
// produced. Fixed by having placement-reach.py's `--json` mode also emit
// each element's `isWrapper` flag, and gating axis A/C on `!isWrapper` —
// this rule now only asserts TIER-1 grouping for genuine per-element panels,
// never for a wrapper's property-family split. Covered by a dedicated
// self-test fixture (`wrapper-element-not-flagged`) proving the exemption
// doesn't overmatch, not just asserted in prose.

const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

const PLACEMENT_REACH_PY = path.resolve( __dirname, '..', '..', 'placement-reach.py' );

/**
 * The `{slug: {elements, ownership, blockLevel, contested}}` map for every
 * block, shelled out to placement-reach.py's `--json` mode once per ctx and
 * memoised on it — the SAME `resolve_block_detailed()` result THE PLACEMENT
 * RULE itself is measured from (placement-reach.py's own committed-artefact
 * rationale: "a number nobody else can re-derive is not a measurement").
 * FAILS CLOSED like its sibling `getStructuralAttrMap()` in
 * core/components.js: a script that can't run throws rather than silently
 * resolving every block as "no elements, nothing to check", which would
 * look identical to "every block is already correctly grouped".
 */
function getPlacementReach( ctx ) {
	if ( ctx.__placementReach ) return ctx.__placementReach;
	const { spawnSync } = require( 'child_process' );
	const result = spawnSync( 'python', [ PLACEMENT_REACH_PY, '--json' ], { encoding: 'utf8' } );
	if ( result.status !== 0 || ! result.stdout ) {
		throw new Error(
			'getPlacementReach: placement-reach.py --json failed — refusing to silently treat every ' +
				`block as having no elements to check. stderr: ${ result.stderr || '(none)' }`
		);
	}
	let map;
	try {
		map = JSON.parse( result.stdout );
	} catch ( e ) {
		throw new Error( `getPlacementReach: placement-reach.py --json produced invalid JSON: ${ e.message }` );
	}
	ctx.__placementReach = map;
	return map;
}

// Same panel vocabulary as rules/01-tab-group.js's `panelTagNames()`, kept
// as an independent copy on purpose: 01's version excludes self-routing
// shared components (a different question — "does this panel need a group
// prop" vs this rule's "which panel, if any, holds this attribute's
// control"), so importing it here would silently inherit an exclusion this
// rule does not want.
function panelTagNames( ctx ) {
	const names = [ 'PanelBody', 'ToolsPanel' ];
	if ( ctx.components && ctx.components.ok ) {
		for ( const [ name, info ] of Object.entries( ctx.components.exportsMap ) ) {
			if ( info.wrapsPanel ) names.push( name );
		}
	}
	return names;
}

function findPanelElements( ctx, editFile, tagNameSet ) {
	const panels = [];
	const ok = ctx.cache.traverse( editFile, {
		JSXElement( nodePath ) {
			const opening = nodePath.node.openingElement;
			const name = opening && opening.name && opening.name.type === 'JSXIdentifier' ? opening.name.name : null;
			if ( ! name || ! tagNameSet.has( name ) ) return;
			panels.push( nodePath.node );
		},
	} );
	// File position order == DOM order for static JSX (no runtime reordering
	// in the SGS codebase's own inspector panels) — this is axis C/D's whole
	// "top to bottom" reading of Bean's DOM-order convention.
	panels.sort( ( a, b ) => a.start - b.start );
	return { ok, panels };
}

function panelTitle( node ) {
	const opening = node.openingElement;
	if ( ! opening || ! opening.attributes ) return null;
	for ( const attr of opening.attributes ) {
		if ( attr.type !== 'JSXAttribute' || ! attr.name || attr.name.name !== 'title' ) continue;
		const v = attr.value;
		if ( ! v ) return null;
		if ( v.type === 'StringLiteral' ) return v.value;
		if ( v.type === 'JSXExpressionContainer' ) {
			const expr = v.expression;
			if ( expr.type === 'StringLiteral' ) return expr.value;
			if ( expr.type === 'CallExpression' && expr.arguments[ 0 ] && expr.arguments[ 0 ].type === 'StringLiteral' ) {
				return expr.arguments[ 0 ].value;
			}
		}
		return null;
	}
	return null;
}

function escapeRegExp( s ) {
	return s.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
}

/**
 * Which panel(s), if any, contain a whole-word mention of `attrName`? Text-
 * slice matching, same detection level rules 01/34 already use for "this
 * panel writes that attribute" — not full JSX prop-binding resolution.
 */
function panelsMentioning( rawText, panels, attrName ) {
	const re = new RegExp( `\\b${ escapeRegExp( attrName ) }\\b` );
	const hits = [];
	for ( let i = 0; i < panels.length; i++ ) {
		const slice = rawText.slice( panels[ i ].start, panels[ i ].end );
		if ( re.test( slice ) ) hits.push( i );
	}
	return hits;
}

function panelLabel( node, index ) {
	const t = panelTitle( node );
	if ( t ) return t;
	const opening = node.openingElement;
	const tag = opening && opening.name && opening.name.name ? opening.name.name : 'panel';
	return `${ tag } #${ index + 1 }`;
}

module.exports = {
	id: '41-co2-element-grouping-order',
	checklistItem: null,
	title: 'CO-2 element-panel grouping + THE PLACEMENT RULE order (C14/C4)',
	scope: 'per-block',
	needs: [ 'stripped:edit.js', 'ast:edit.js', 'components' ],
	run( ctx, block ) {
		const placement = getPlacementReach( ctx )[ block.slug ];
		if ( ! placement || ! Object.keys( placement.elements || {} ).length ) return [];

		const editFile = path.join( ctx.blocksDir, block.tail, 'edit.js' );
		const rawText = ctx.stripped( editFile );
		if ( rawText == null ) return [];

		const tagNames = panelTagNames( ctx );
		const { ok: astOk, panels } = findPanelElements( ctx, editFile, new Set( tagNames ) );
		const findings = [];

		// ── B. CONTESTED manifest gaps — always reportable, no AST needed. ──
		for ( const [ attrName, owners ] of Object.entries( placement.contested || {} ) ) {
			findings.push(
				makeFinding( {
					rule: this.id,
					block: block.slug,
					file: path.join( ctx.blocksDir, block.tail, 'block.json' ),
					severity: 'warn',
					kind: 'contested-manifest-gap',
					detail:
						`${ block.slug }'s attribute "${ attrName }" is claimable by 2+ elements per ` +
						`supports.sgs.elements (${ owners.join( ' / ' ) }) — the manifest does not say which ` +
						'element owns it, so CO-2 grouping cannot place its control with confidence.',
					fix: `Add an explicit attrMap entry on whichever element genuinely owns "${ attrName }" ` +
						`(e.g. { "css:<property>": "${ attrName }" } under that element's attrMap) — an explicit ` +
						'entry is authoritative and removes the contest. This is a manifest gap, not a placement ' +
						'this rule (or any codemod) should guess at.',
					keyParts: [ 'contested', attrName ],
				} )
			);
		}

		if ( ! astOk || ! panels.length ) return findings; // nothing more to check without a real panel tree

		// ── A. CO-2 TIER-1 grouping — attrs owned by ONE element must live in ONE panel. ──
		const byElement = new Map(); // elementKey -> [attrName, ...]
		for ( const [ attrName, elementKey ] of Object.entries( placement.ownership || {} ) ) {
			if ( ! byElement.has( elementKey ) ) byElement.set( elementKey, [] );
			byElement.get( elementKey ).push( attrName );
		}

		const orderedElementPanels = []; // { elementKey, order, firstPanelIndex } for axis C

		for ( const [ elementKey, attrNames ] of byElement ) {
			if ( attrNames.length < 2 ) continue; // nothing to scatter with only one owned attr

			// ⛔ isWrapper elements are TIER 2 (property-family) territory, not
			// TIER 1 — Colour/Border/Padding&margin are DELIBERATELY separate
			// panels for a wrapper (THE PLACEMENT RULE TIER 2). Treating their
			// cluster-member attrs as one TIER-1 element needing one panel is
			// the exact false-positive class that got
			// scattered-element-controls.js deleted 2026-09-02 (~600 false
			// positives, all on isWrapper elements) — see this file's header.
			const elMetaGate = placement.elements[ elementKey ] || {};
			if ( elMetaGate.isWrapper ) continue;

			const attrPanelIndices = new Map(); // attrName -> [panelIndex, ...]
			for ( const attrName of attrNames ) {
				const hits = panelsMentioning( rawText, panels, attrName );
				if ( hits.length ) attrPanelIndices.set( attrName, hits );
			}
			if ( attrPanelIndices.size < 2 ) continue; // fewer than 2 attrs resolved to a real panel — nothing to compare

			const elMeta = placement.elements[ elementKey ] || {};
			const firstPanelIndex = Math.min( ...[ ...attrPanelIndices.values() ].map( ( hits ) => hits[ 0 ] ) );
			if ( typeof elMeta.order === 'number' ) {
				orderedElementPanels.push( { elementKey, order: elMeta.order, firstPanelIndex } );
			}

			// Distinct panels touched, counting each attr's FIRST match only —
			// an attr legitimately mentioned again elsewhere (e.g. a hover-state
			// sibling read inside the SAME panel further down) must not inflate
			// the panel count.
			const distinctPanels = new Set( [ ...attrPanelIndices.values() ].map( ( hits ) => hits[ 0 ] ) );
			if ( distinctPanels.size <= 1 ) continue; // correctly grouped

			const panelNames = [ ...distinctPanels ]
				.sort( ( a, b ) => a - b )
				.map( ( i ) => panelLabel( panels[ i ], i ) );
			const unplacedCount = attrNames.length - attrPanelIndices.size;

			findings.push(
				makeFinding( {
					rule: this.id,
					block: block.slug,
					file: editFile,
					severity: 'warn',
					kind: 'co2-scattered-element',
					detail:
						`${ block.slug }'s "${ elMeta.label || elementKey }" element (TIER 1, THE PLACEMENT RULE) ` +
						`has its controls split across ${ distinctPanels.size } panels instead of one: ` +
						`${ panelNames.join( ', ' ) }. Owned attributes: ${ [ ...attrPanelIndices.keys() ].join( ', ' ) }` +
						( unplacedCount ? ` (${ unplacedCount } more owned attribute(s) not found in any panel — not counted here).` : '.' ),
					fix: `Move every "${ elMeta.label || elementKey }" control into ONE panel titled "${
						elMeta.label || elementKey
					}" (CO-2 / THE PLACEMENT RULE TIER 1 — one panel per element, holding that element's content, ` +
						'styling and hover together).',
					keyParts: [ 'scattered', elementKey ],
				} )
			);
		}

		// ── C. Within-block panel order vs declared element `order`. ──
		if ( orderedElementPanels.length >= 2 ) {
			const byDeclaredOrder = [ ...orderedElementPanels ].sort( ( a, b ) => a.order - b.order );
			for ( let i = 1; i < byDeclaredOrder.length; i++ ) {
				const prev = byDeclaredOrder[ i - 1 ];
				const cur = byDeclaredOrder[ i ];
				if ( prev.firstPanelIndex <= cur.firstPanelIndex ) continue; // still in DOM order — fine
				const prevMeta = placement.elements[ prev.elementKey ] || {};
				const curMeta = placement.elements[ cur.elementKey ] || {};
				findings.push(
					makeFinding( {
						rule: this.id,
						block: block.slug,
						file: editFile,
						severity: 'warn',
						kind: 'dom-order-vs-declared-order',
						detail:
							`${ block.slug }'s "${ curMeta.label || cur.elementKey }" panel (declared order ${ cur.order }) ` +
							`appears in edit.js BEFORE "${ prevMeta.label || prev.elementKey }" (declared order ${ prev.order }) ` +
							"— DOM order (top to bottom) contradicts the block's own declared element order.",
						fix: `Reorder the panels in edit.js's InspectorControls so "${
							prevMeta.label || prev.elementKey
						}" (order ${ prev.order }) renders before "${ curMeta.label || cur.elementKey }" (order ${ cur.order }), ` +
							'or correct the declared `order` values in block.json\'s supports.sgs.elements to match the intended sequence.',
						keyParts: [ 'dom-order', prev.elementKey, cur.elementKey ],
					} )
				);
			}
		}

		// ── D. Root Colour-before-Typography. ──
		const colourIdx = rawText.indexOf( '<SgsColourPanel' );
		const typographyIdx = rawText.indexOf( '<TypographyControls' );
		if ( colourIdx !== -1 && typographyIdx !== -1 && colourIdx > typographyIdx ) {
			findings.push(
				makeFinding( {
					rule: this.id,
					block: block.slug,
					file: editFile,
					severity: 'warn',
					kind: 'root-colour-after-typography',
					detail:
						`${ block.slug } mounts <TypographyControls> before <SgsColourPanel> in edit.js — Bean's ` +
						'root ordering convention (2026-08-27) is "Styles, then Colour, then Typography".',
					fix: 'Move the <SgsColourPanel> mount above the <TypographyControls> mount in edit.js so Colour renders before Typography.',
					keyParts: [ 'root-order' ],
				} )
			);
		}

		return findings;
	},
	selfTest: {
		fixture: 'fixtures/41-co2-element-grouping-order',
		mustFlag: [
			'scattered-element',
			'contested-attr',
			'dom-order-mismatch',
			'colour-after-typography',
		],
		mustNotFlag: [
			'grouped-correctly',
			'no-manifest',
			'single-owned-attr',
			'wrapper-element-not-flagged',
		],
	},
};

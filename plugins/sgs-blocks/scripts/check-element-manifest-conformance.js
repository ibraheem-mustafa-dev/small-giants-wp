/**
 * check-element-manifest-conformance.js
 *
 * Spec 35 Task 2 — the CLUSTER-COHERENCE rule, made computable.
 *
 * Reads each block's `block.json` `supports.sgs.elements` manifest (the
 * schema defined in .claude/plans/spec-35-compound-control-sets-design.md
 * §"The element manifest") and, for every element × declared cluster, checks
 * the block exposes EVERY member of that cluster's member set (from
 * scripts/consistency/cluster-member-sets.json — itself derived from the
 * setting-registry.json golden master) through either:
 *
 *   (a) an explicit `attrMap` entry on the element (a flat block.json
 *       attribute name, or `native:<supports-dot-path>` for a member covered
 *       by WordPress-native `supports` e.g. `native:spacing.padding`), or
 *   (b) the DEFAULT convention — `{element.prefix}{member.suffix}` tried
 *       against the block's declared attributes, in the member's suffix
 *       order, first exact then case-insensitive.
 *
 * A declared-cluster member that resolves to nothing is a GAP — reported,
 * never silently dropped and never hand-judged. This is the "applicable is a
 * FLAG, not prose semantics" rule (F4): a member is applicable iff its
 * cluster is in the element's `clusters` list, full stop.
 *
 * Blocks with no `supports.sgs.elements` manifest are SKIPPED (not errored —
 * the manifest is opt-in during rollout; every other block is un-migrated,
 * not non-conformant).
 *
 * ORPHAN detection (Spec 35 FR-35-4)
 * -----------------------------------
 * The rules above only check DECLARED cluster members — an element declaring
 * `clusters: []` (e.g. sgs/button's `icon` element, whose iconColour/iconSize/
 * iconGap controls don't nest cleanly into Text/Fill/Layout/Flow/Position/
 * Motion) is invisible to the forward check, so its real controls could never
 * be verified by anything.
 *
 * After resolving declared members for a block, this script also scans
 * BACKWARDS: for every declared element, it computes an effective prefix
 * (`element.prefix` if declared, else the element's own manifest key — this
 * is why `icon` with no explicit `prefix` still matches `iconColour` etc.),
 * then scans the block's `attributes` for any attribute that starts with
 * that prefix (via the same `{prefix}{PascalCaseSuffix}` convention used by
 * the forward resolver) and is NOT already claimed by ANY resolved member of
 * ANY element in the block (whether via `attrMap` or the default
 * convention). Every such attribute is reported as an ORPHAN finding — wired
 * to a real block attribute, but invisible to cluster-coherence.
 *
 * An attribute belonging to a responsive/unit/hover suffix family of an
 * already-claimed base attribute (`{base}Tablet`, `{base}Mobile`,
 * `{base}Desktop`, `{base}Unit`, `{base}Hover`) is treated as belonging to
 * that base attribute and is NOT reported as its own orphan — only the base
 * form needs to resolve for the whole family to count as claimed.
 *
 * An element with no prefix (and no fallback — i.e. an empty-string
 * `element.prefix`) is skipped for orphan scanning; there is nothing to
 * match attribute names against.
 *
 * ORPHAN is WARN-ONLY like everything else here — it never affects the exit
 * code.
 *
 * WARN-ONLY: always exits 0. Mirrors the sibling audit-inspector-
 * conformance.js WARN-ONLY posture — promotion to a hard gate is a later
 * Spec 35 rollout step (see design doc "Rollout / hardening steps" #5), not
 * this task.
 *
 * Usage
 * -----
 *   node scripts/check-element-manifest-conformance.js            # human report
 *   node scripts/check-element-manifest-conformance.js --json      # machine report to stdout
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const ROOT = path.join( __dirname, '..' );
const BLOCKS_DIR = path.join( ROOT, 'src', 'blocks' );
const CLUSTER_SETS_PATH = path.join( __dirname, 'consistency', 'cluster-member-sets.json' );

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function loadJson( p, fallback ) {
	if ( ! fs.existsSync( p ) ) return fallback;
	try {
		return JSON.parse( fs.readFileSync( p, 'utf8' ) );
	} catch ( e ) {
		return fallback;
	}
}

/** Dot-path getter, e.g. get(obj, 'spacing.padding'). */
function get( obj, dotPath ) {
	return dotPath.split( '.' ).reduce(
		( acc, k ) => ( acc && typeof acc === 'object' ? acc[ k ] : undefined ),
		obj
	);
}

/** Case-insensitive key lookup against an attributes object. Returns the real key or null. */
function findAttrKeyCaseInsensitive( attributes, candidate ) {
	if ( Object.prototype.hasOwnProperty.call( attributes, candidate ) ) return candidate;
	const lower = candidate.toLowerCase();
	const hit = Object.keys( attributes ).find( ( k ) => k.toLowerCase() === lower );
	return hit || null;
}

/**
 * Resolve one cluster member for one element. Returns
 * { resolved: bool, via: 'attrMap-native'|'attrMap-attr'|'default-attr', attr?: string, path?: string }
 */
function resolveMember( element, member, blockJson ) {
	const attributes = blockJson.attributes || {};
	const supports = blockJson.supports || {};

	// (a) explicit attrMap entry — always tried first, always authoritative.
	const mapped = element.attrMap && element.attrMap[ member.key ];
	if ( mapped ) {
		if ( mapped.startsWith( 'native:' ) ) {
			const supportsPath = mapped.slice( 'native:'.length );
			const val = get( supports, supportsPath );
			return { resolved: !! val, via: 'attrMap-native', path: supportsPath };
		}
		const found = findAttrKeyCaseInsensitive( attributes, mapped );
		return { resolved: !! found, via: 'attrMap-attr', attr: mapped };
	}

	// (b) default convention — {prefix}{suffix}, tried in suffix order.
	//
	// NOTE the `!== undefined` test, not a truthiness check. An explicit
	// `"prefix": ""` means "my attributes are BARE" — a single-element block whose
	// attrs are `fontSize` / `opacity` / `zIndex` rather than `captionFontSize`.
	// Empty string is falsy, so a truthiness test silently skipped the whole default
	// convention for those blocks and reported every member as a GAP. Two independent
	// agents hit this on 2026-07-20 (collapsible-text `body`, decorative-image
	// `image`) and both worked around it with hand-written attrMap entries.
	// findAttrKeyCaseInsensitive() makes the bare case work: prefix '' + suffix
	// 'FontSize' → candidate 'FontSize' → matches the real attr `fontSize`.
	if ( element.prefix !== undefined ) {
		for ( const suffix of member.suffixes || [] ) {
			const candidate = element.prefix + suffix;
			const found = findAttrKeyCaseInsensitive( attributes, candidate );
			if ( found ) return { resolved: true, via: 'default-attr', attr: found };
		}
	}

	// See memberAppliesToElement() above the caller for the element-axis gate that
	// decides whether this member is even asked about for this element.

	// (c) nativeSupportsPath fallback — ONLY for the element the manifest marks
	// `isWrapper: true`. Native `supports` (color/spacing/__experimentalBorder)
	// apply to the block ROOT only; without this gate every element sharing the
	// "layout" cluster would falsely inherit the wrapper's native margin/border
	// as its own (e.g. a repeater-item element like "tile" does NOT have a
	// margin control just because the block wrapper does).
	if ( member.nativeSupportsPath && element.isWrapper ) {
		const val = get( supports, member.nativeSupportsPath );
		if ( val ) return { resolved: true, via: 'native-fallback', path: member.nativeSupportsPath };
	}

	return { resolved: false, via: null };
}

/**
 * ELEMENT-AXIS GATE (Spec 35, 2026-07-20).
 *
 * Element is the PRIMARY mapping axis; cluster is SECONDARY. A member carrying
 * `appliesToLayers` is an ARRANGEMENT property — it describes how an element lays
 * out its CHILDREN (display / flex-* / grid-* / justify-* / align-* / order /
 * overflow / gap). Such a member only makes sense on an element that HAS children
 * to arrange. A member with NO `appliesToLayers` is a BOX property (padding,
 * border, width…) and applies to every element.
 *
 * An element qualifies ONLY when its declared `layer` is in the member's
 * `appliesToLayers` list. An element with NO `layer` is never asked about
 * arrangement — which is the correct default, because it has not declared itself
 * to be a structural layout layer.
 *
 * An earlier version also let any `isWrapper: true` element through as a
 * compatibility shim. That was WRONG and was measured: it asked sgs/button
 * whether it had grid-template-columns (a single-element block wrapper arranges
 * nothing), producing 60 false gaps across button/quote/media/testimonial/
 * brand-strip on 2026-07-20. Every wrapper is not a layout layer.
 *
 * This is what makes merging the old `flow` cluster into `layout` correct rather
 * than merely tidy: role=layout on a GRID element means "arrange these children",
 * the same role on a leaf tile means "size this box", and the ELEMENT tells them
 * apart. Without this gate the merge produced 144 false gaps (measured 2026-07-20).
 *
 * @param {Object} member  Cluster member (may carry appliesToLayers).
 * @param {Object} element Manifest element (may carry layer / isWrapper).
 * @return {boolean} True when this member should be checked for this element.
 */
function memberAppliesToElement( member, element ) {
	const layers = member.appliesToLayers;
	if ( ! Array.isArray( layers ) || layers.length === 0 ) return true; // box member

	return !! element.layer && layers.includes( element.layer );
}

// ---------------------------------------------------------------------------
// STATES AXIS (Spec 35 FR-35-5)
// ---------------------------------------------------------------------------

/**
 * Build a flat lookup of member.key -> { ...member, cluster: clusterKey } across
 * every declared cluster, so a `states` block can reference a member by key
 * (e.g. "css:background-color") without repeating its label/suffixes.
 */
function buildMemberIndex( clusterSets ) {
	const index = {};
	for ( const clusterKey of Object.keys( clusterSets.clusters || {} ) ) {
		const cluster = clusterSets.clusters[ clusterKey ];
		for ( const member of cluster.members || [] ) {
			index[ member.key ] = Object.assign( {}, member, { cluster: clusterKey } );
		}
	}
	return index;
}

/**
 * Resolve one member at one STATE for one element. Mirrors resolveMember()'s two
 * resolution forms (FR-35-5 schema):
 *
 *   (a) `attrMap` on the state — explicit, always authoritative, and the ONLY
 *       correct form wherever the state token is infix/prefix or semantically
 *       misleading (tabActiveTextColour is NOT :active — see module header).
 *   (b) `suffix` + `members` — the mechanical shortcut for the 81% suffix-shaped
 *       majority (`backgroundColour` + `Hover` = `backgroundColourHover`).
 *       `members` names WHICH members participate; `suffix` derives the state
 *       attribute name FROM THE ALREADY-RESOLVED BASE ATTRIBUTE, so a false
 *       friend like `pauseOnHover` is never reachable — nobody lists it.
 *
 * Returns { resolved, via, attr? }. Does NOT decide STATE_WITHOUT_BASE — that is
 * computed by the caller by separately resolving the member at base.
 */
function resolveStateMember( element, member, stateSpec, blockJson ) {
	const attributes = blockJson.attributes || {};
	const supports = blockJson.supports || {};

	// (a) explicit attrMap on the state — always tried first, always authoritative.
	if ( stateSpec.attrMap && Object.prototype.hasOwnProperty.call( stateSpec.attrMap, member.key ) ) {
		const mapped = stateSpec.attrMap[ member.key ];
		if ( mapped.startsWith( 'native:' ) ) {
			const supportsPath = mapped.slice( 'native:'.length );
			const val = get( supports, supportsPath );
			return { resolved: !! val, via: 'state-attrMap-native', path: supportsPath };
		}
		const found = findAttrKeyCaseInsensitive( attributes, mapped );
		return { resolved: !! found, via: 'state-attrMap', attr: mapped };
	}

	// (b) suffix + members — mechanical shortcut, only for members the author listed.
	if ( typeof stateSpec.suffix === 'string' && Array.isArray( stateSpec.members ) && stateSpec.members.includes( member.key ) ) {
		const base = resolveMember( element, member, blockJson );
		if ( base.resolved && base.attr ) {
			const candidate = base.attr + stateSpec.suffix;
			const found = findAttrKeyCaseInsensitive( attributes, candidate );
			if ( found ) return { resolved: true, via: 'state-suffix', attr: found, baseAttr: base.attr };
		}
		return { resolved: false, via: null };
	}

	return { resolved: false, via: null }; // member not declared for this state
}

/**
 * Process every `states` entry on every declared element of a block. Adds
 * `state-ok` / `state-gap` / `state-without-base` findings (a THIRD status,
 * per FR-35-5, kept out of `state-gap` so a client-facing "hover works but the
 * resting state doesn't" defect can't hide inside the gap count) and adds any
 * resolved state attribute to `claimedAttrs` so it drops out of orphan-scan
 * (FR-35-5 rule 4).
 */
function analyseStates( elementKeys, elements, blockJson, memberIndex, claimedAttrs, findings ) {
	for ( const elementKey of elementKeys ) {
		const element = elements[ elementKey ];
		const states = element.states;
		if ( ! states || typeof states !== 'object' ) continue; // opt-in — no states declared, nothing to check

		for ( const stateName of Object.keys( states ) ) {
			const stateSpec = states[ stateName ];
			const memberKeys = new Set( [
				...( stateSpec.attrMap ? Object.keys( stateSpec.attrMap ) : [] ),
				...( Array.isArray( stateSpec.members ) ? stateSpec.members : [] ),
			] );

			for ( const memberKey of memberKeys ) {
				const member = memberIndex[ memberKey ];
				if ( ! member ) continue; // unknown member key — not this script's job to invent one

				const stateResult = resolveStateMember( element, member, stateSpec, blockJson );
				// Base resolution is checked INDEPENDENTLY of the element's declared
				// `clusters` list — a state can be declared even where the base cluster
				// isn't (card-grid's card-tile: clusters: [] but states.hover declared).
				const baseResult = resolveMember( element, member, blockJson );

				let status;
				if ( stateResult.resolved ) {
					status = baseResult.resolved ? 'state-ok' : 'state-without-base';
					if ( stateResult.attr ) claimedAttrs.add( stateResult.attr );
				} else {
					status = 'state-gap';
				}

				findings.push( {
					block: blockJson.name,
					element: elementKey,
					elementLabel: element.label || elementKey,
					cluster: member.cluster,
					member: member.key,
					memberLabel: member.label,
					state: stateName,
					status,
					via: stateResult.via,
					resolvedAttr: stateResult.attr,
					baseResolved: baseResult.resolved,
				} );
			}
		}
	}
}

// ---------------------------------------------------------------------------
// ORPHAN DETECTION (Spec 35 FR-35-4)
// ---------------------------------------------------------------------------

// Suffix families that extend a base attribute rather than being their own
// setting — an attribute in one of these families is "claimed" whenever its
// base form is claimed, and is never itself reported as an orphan.
const RESPONSIVE_AND_STATE_SUFFIXES = [ 'Tablet', 'Mobile', 'Desktop', 'Unit', 'Hover' ];

/**
 * Strip a trailing responsive/unit/hover suffix (repeatedly — e.g. an attr
 * could in principle carry `UnitTablet`) to find the base attribute name a
 * given attribute belongs to. Returns the original name unchanged if no
 * known suffix matches.
 */
function baseAttrName( attrName ) {
	let current = attrName;
	let changed = true;
	while ( changed ) {
		changed = false;
		for ( const suffix of RESPONSIVE_AND_STATE_SUFFIXES ) {
			if ( current.length > suffix.length && current.endsWith( suffix ) ) {
				current = current.slice( 0, current.length - suffix.length );
				changed = true;
				break;
			}
		}
	}
	return current;
}

/**
 * Scan a block's attributes for ones that are wired to a declared element's
 * prefix but never claimed by any resolved cluster member — the ORPHAN case.
 * Must run AFTER every element's declared-cluster members have been
 * resolved, so `claimedAttrs` reflects the full block, not just one element.
 */
function findOrphans( elementKeys, elements, blockJson, claimedAttrs ) {
	const attributes = blockJson.attributes || {};
	const attrNames = Object.keys( attributes );
	const orphans = [];

	// An attribute counts as claimed if its OWN name is claimed, or if the
	// base name (with responsive/unit/hover suffixes stripped) is claimed.
	const isClaimed = ( attrName ) => {
		if ( claimedAttrs.has( attrName ) ) return true;
		const base = baseAttrName( attrName );
		return base !== attrName && claimedAttrs.has( base );
	};

	for ( const elementKey of elementKeys ) {
		const element = elements[ elementKey ];
		// Effective prefix: explicit element.prefix, else the element's own
		// manifest key (this is why button's `icon` element — no explicit
		// `prefix` — still matches `iconColour`/`iconSize`/`iconGap`).
		// NOTE the `!== undefined` test, not `||`. An explicit `"prefix": ""` is a
		// deliberate opt-OUT of orphan scanning, and `""` is falsy — so `||` would
		// silently fall back to the element key and reinstate the very matching the
		// author asked to suppress. That bug shipped and was caught by the
		// form-field batch on 2026-07-20 (`help` element + `helpText` content attr).
		const prefix = element.prefix !== undefined ? element.prefix : elementKey;
		if ( prefix === '' ) continue; // explicit opt-out

		for ( const attrName of attrNames ) {
			if ( ! attrName.startsWith( prefix ) ) continue;
			// Guard against accidental prefix collisions with no PascalCase
			// suffix boundary, e.g. prefix "icon" must not match "icons".
			const rest = attrName.slice( prefix.length );
			if ( rest.length === 0 || rest[ 0 ] !== rest[ 0 ].toUpperCase() ) continue;
			if ( isClaimed( attrName ) ) continue;

			orphans.push( {
				block: blockJson.name,
				element: elementKey,
				elementLabel: element.label || elementKey,
				attr: attrName,
				status: 'orphan',
			} );
		}
	}

	return orphans;
}

// ---------------------------------------------------------------------------
// PER-BLOCK ANALYSIS
// ---------------------------------------------------------------------------

function analyseBlock( blockSlug, blockJson, clusterSets, findings ) {
	const elements = get( blockJson, 'supports.sgs.elements' );
	if ( ! elements || typeof elements !== 'object' ) return false; // no manifest — skip

	const elementKeys = Object.keys( elements ).sort(
		( a, b ) => ( elements[ a ].order ?? 999 ) - ( elements[ b ].order ?? 999 )
	);

	const claimedAttrs = new Set();

	for ( const elementKey of elementKeys ) {
		const element = elements[ elementKey ];
		const declaredClusters = clusterSets.order.filter(
			( c ) => Array.isArray( element.clusters ) && element.clusters.includes( c )
		);

		for ( const clusterKey of declaredClusters ) {
			const cluster = clusterSets.clusters[ clusterKey ];
			if ( ! cluster ) continue; // unknown cluster name in manifest — not this script's job to invent one

			for ( const member of cluster.members ) {
				// ELEMENT-AXIS SCOPING (see cluster-member-sets.json
				// `_meta.note_on_appliesToLayers`). Element is the PRIMARY mapping
				// axis; cluster is SECONDARY. An ARRANGEMENT member describes how an
				// element lays out its CHILDREN, so it only applies to an element that
				// HAS children to arrange — one at layer OUTER/GRID, or (when no layer
				// is declared) one marked isWrapper. Without this a leaf tile is asked
				// whether it has grid-template-columns: 144 false gaps, measured
				// 2026-07-20 before this gate existed.
				if ( ! memberAppliesToElement( member, element ) ) continue;

				const result = resolveMember( element, member, blockJson );
				if ( result.resolved && result.attr ) claimedAttrs.add( result.attr );
				findings.push( {
					block: blockSlug,
					element: elementKey,
					elementLabel: element.label || elementKey,
					cluster: clusterKey,
					member: member.key,
					memberLabel: member.label,
					status: result.resolved ? 'ok' : 'gap',
					via: result.via,
					resolvedAttr: result.attr,
					resolvedPath: result.path,
				} );
			}
		}
	}

	// STATES AXIS (Spec 35 FR-35-5) — runs AFTER base-cluster resolution (states can
	// reference members regardless of whether the base cluster was declared) and
	// BEFORE orphan-scanning (a resolved state attribute is CLAIMED, FR-35-5 rule 4).
	const memberIndex = buildMemberIndex( clusterSets );
	analyseStates( elementKeys, elements, blockJson, memberIndex, claimedAttrs, findings );

	const orphans = findOrphans( elementKeys, elements, blockJson, claimedAttrs );
	for ( const orphan of orphans ) findings.push( orphan );

	return true;
}

// ---------------------------------------------------------------------------
// REPORT
// ---------------------------------------------------------------------------

function printHuman( meta, findings ) {
	process.stdout.write( '[check-element-manifest-conformance] Spec 35 Task 2 — CLUSTER-COHERENCE rule (WARN-ONLY)\n\n' );
	process.stdout.write(
		`Blocks with a manifest: ${ meta.manifested_count } | blocks skipped (no supports.sgs.elements): ${ meta.skipped_count }\n`
	);
	process.stdout.write(
		`Members checked: ${ meta.total_checked } | OK: ${ meta.total_ok } | GAP: ${ meta.total_gap } | ORPHAN: ${ meta.total_orphan }\n`
	);
	process.stdout.write(
		`States (FR-35-5, separate from base): STATE_OK: ${ meta.total_state_ok } | STATE_GAP: ${ meta.total_state_gap } | STATE_WITHOUT_BASE: ${ meta.total_state_without_base }\n\n`
	);

	const byBlock = {};
	for ( const f of findings ) {
		if ( ! byBlock[ f.block ] ) byBlock[ f.block ] = [];
		byBlock[ f.block ].push( f );
	}

	const blockSlugs = Object.keys( byBlock ).sort();
	if ( blockSlugs.length === 0 ) {
		process.stdout.write( '(no blocks carry a supports.sgs.elements manifest yet)\n' );
		return;
	}

	for ( const slug of blockSlugs ) {
		process.stdout.write( `\n${ slug }\n` );
		let currentElement = null;
		for ( const f of byBlock[ slug ] ) {
			if ( f.element !== currentElement ) {
				process.stdout.write( `  ▸ ${ f.elementLabel } (${ f.element })\n` );
				currentElement = f.element;
			}
			if ( f.status === 'ok' ) {
				const detail =
					f.via === 'attrMap-native' || f.via === 'native-fallback'
						? `native supports.${ f.resolvedPath }`
						: f.resolvedAttr;
				process.stdout.write( `      [OK]  ${ f.cluster }/${ f.member } (${ f.memberLabel }) → ${ detail }\n` );
			} else if ( f.status === 'gap' ) {
				process.stdout.write( `      [GAP] ${ f.cluster }/${ f.member } (${ f.memberLabel }) — no attrMap entry and no default-convention attribute found\n` );
			} else if ( f.status === 'state-ok' ) {
				process.stdout.write( `      [STATE_OK]  ${ f.state } ${ f.cluster }/${ f.member } (${ f.memberLabel }) → ${ f.resolvedAttr }\n` );
			} else if ( f.status === 'state-gap' ) {
				process.stdout.write( `      [STATE_GAP] ${ f.state } ${ f.cluster }/${ f.member } (${ f.memberLabel }) — no state attrMap entry and no derivable suffix attribute found\n` );
			} else if ( f.status === 'state-without-base' ) {
				process.stdout.write( `      [STATE_WITHOUT_BASE] ${ f.state } ${ f.cluster }/${ f.member } (${ f.memberLabel }) → ${ f.resolvedAttr } — client can style the ${ f.state } state but NOT the resting state (no base attribute)\n` );
			} else if ( f.status === 'orphan' ) {
				process.stdout.write( `      [ORPHAN] ${ f.attr } — wired to the block but not claimed by any declared cluster member\n` );
			}
		}
	}
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function main() {
	const clusterSets = loadJson( CLUSTER_SETS_PATH, null );
	if ( ! clusterSets || ! clusterSets.clusters ) {
		process.stderr.write(
			'[check-element-manifest-conformance] cluster-member-sets.json missing or invalid.\n'
		);
		process.exitCode = 0; // WARN-ONLY
		return;
	}

	if ( ! fs.existsSync( BLOCKS_DIR ) ) {
		process.stderr.write( '[check-element-manifest-conformance] src/blocks directory not found.\n' );
		process.exitCode = 0;
		return;
	}

	const findings = [];
	let manifestedCount = 0;
	let skippedCount = 0;

	const blockDirs = fs
		.readdirSync( BLOCKS_DIR, { withFileTypes: true } )
		.filter( ( d ) => d.isDirectory() )
		.map( ( d ) => d.name );

	for ( const dirName of blockDirs ) {
		const blockJsonPath = path.join( BLOCKS_DIR, dirName, 'block.json' );
		const blockJson = loadJson( blockJsonPath, null );
		if ( ! blockJson || ! blockJson.name ) continue;

		const scanned = analyseBlock( blockJson.name, blockJson, clusterSets, findings );
		if ( scanned ) {
			manifestedCount++;
		} else {
			skippedCount++;
		}
	}

	// total_checked/total_ok/total_gap cover cluster-member findings ONLY
	// (unchanged shape/semantics from Task 2) — orphans are a separate,
	// additive count so existing tooling parsing these three keys is
	// unaffected by FR-35-4.
	const clusterFindings = findings.filter( ( f ) => f.status === 'ok' || f.status === 'gap' );
	const totalChecked = clusterFindings.length;
	const totalOk = clusterFindings.filter( ( f ) => f.status === 'ok' ).length;
	const totalGap = totalChecked - totalOk;
	const totalOrphan = findings.filter( ( f ) => f.status === 'orphan' ).length;

	// STATE counters (Spec 35 FR-35-5) — kept SEPARATE from total_ok/total_gap
	// (rule 5: "Without this the headline number silently changes meaning again").
	// STATE_WITHOUT_BASE is its own count too, not folded into total_state_gap —
	// it is a client-facing defect class (hover works, resting state doesn't),
	// not a plain gap, and must not be able to hide inside the gap count.
	const totalStateOk = findings.filter( ( f ) => f.status === 'state-ok' ).length;
	const totalStateGap = findings.filter( ( f ) => f.status === 'state-gap' ).length;
	const totalStateWithoutBase = findings.filter( ( f ) => f.status === 'state-without-base' ).length;

	const meta = {
		audit: 'element-manifest-conformance',
		warn_only: true,
		manifested_count: manifestedCount,
		skipped_count: skippedCount,
		total_checked: totalChecked,
		total_ok: totalOk,
		total_gap: totalGap,
		total_orphan: totalOrphan,
		total_state_ok: totalStateOk,
		total_state_gap: totalStateGap,
		total_state_without_base: totalStateWithoutBase,
	};

	if ( process.argv.includes( '--json' ) ) {
		process.stdout.write( JSON.stringify( { _meta: meta, findings }, null, 2 ) + '\n' );
	} else {
		printHuman( meta, findings );
	}

	process.exitCode = 0; // WARN-ONLY — promotion to a hard gate is a later rollout step
}

main();

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
	if ( element.prefix ) {
		for ( const suffix of member.suffixes || [] ) {
			const candidate = element.prefix + suffix;
			const found = findAttrKeyCaseInsensitive( attributes, candidate );
			if ( found ) return { resolved: true, via: 'default-attr', attr: found };
		}
	}

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

// ---------------------------------------------------------------------------
// PER-BLOCK ANALYSIS
// ---------------------------------------------------------------------------

function analyseBlock( blockSlug, blockJson, clusterSets, findings ) {
	const elements = get( blockJson, 'supports.sgs.elements' );
	if ( ! elements || typeof elements !== 'object' ) return false; // no manifest — skip

	const elementKeys = Object.keys( elements ).sort(
		( a, b ) => ( elements[ a ].order ?? 999 ) - ( elements[ b ].order ?? 999 )
	);

	for ( const elementKey of elementKeys ) {
		const element = elements[ elementKey ];
		const declaredClusters = clusterSets.order.filter(
			( c ) => Array.isArray( element.clusters ) && element.clusters.includes( c )
		);

		for ( const clusterKey of declaredClusters ) {
			const cluster = clusterSets.clusters[ clusterKey ];
			if ( ! cluster ) continue; // unknown cluster name in manifest — not this script's job to invent one

			for ( const member of cluster.members ) {
				const result = resolveMember( element, member, blockJson );
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
	process.stdout.write( `Members checked: ${ meta.total_checked } | OK: ${ meta.total_ok } | GAP: ${ meta.total_gap }\n\n` );

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
			} else {
				process.stdout.write( `      [GAP] ${ f.cluster }/${ f.member } (${ f.memberLabel }) — no attrMap entry and no default-convention attribute found\n` );
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

	const totalChecked = findings.length;
	const totalOk = findings.filter( ( f ) => f.status === 'ok' ).length;
	const totalGap = totalChecked - totalOk;

	const meta = {
		audit: 'element-manifest-conformance',
		warn_only: true,
		manifested_count: manifestedCount,
		skipped_count: skippedCount,
		total_checked: totalChecked,
		total_ok: totalOk,
		total_gap: totalGap,
	};

	if ( process.argv.includes( '--json' ) ) {
		process.stdout.write( JSON.stringify( { _meta: meta, findings }, null, 2 ) + '\n' );
	} else {
		printHuman( meta, findings );
	}

	process.exitCode = 0; // WARN-ONLY — promotion to a hard gate is a later rollout step
}

main();

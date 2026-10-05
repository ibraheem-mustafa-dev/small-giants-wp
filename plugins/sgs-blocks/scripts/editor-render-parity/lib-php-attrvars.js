/**
 * Traces render.php variables back to the attributes they read (one and two hops).
 */

'use strict';

// ---------------------------------------------------------------------------
// CHECK B — invalid CSS keyword passthrough
// ---------------------------------------------------------------------------

// `$localVar = $attributes['AttrName']` (optional `?? default`, optional
// leading paren) — the direct-read shape.
const ATTR_READ_RE = /\$([A-Za-z_]\w*)\s*=\s*\(?\s*\$attributes\[\s*['"]([A-Za-z0-9_]+)['"]\s*\]/g;

/**
 * Collect every direct `$var = $attributes['AttrName']` read in render.php.
 *
 * @param {string} phpSrc render.php source.
 * @return {Map<string,string>} localVar -> attrName.
 */
function collectAttrVarMap( phpSrc ) {
	const map = new Map();
	let m;
	ATTR_READ_RE.lastIndex = 0;
	while ( ( m = ATTR_READ_RE.exec( phpSrc ) ) !== null ) {
		map.set( m[ 1 ], m[ 2 ] );
	}
	return map;
}

/**
 * One-hop derived-variable trace: `$derived = ...$original...;` where
 * `$original` is already resolved to an attribute by collectAttrVarMap.
 *
 * @param {string}              phpSrc     render.php source.
 * @param {Map<string,string>}  attrVarMap Direct-read map (localVar -> attrName).
 * @return {Map<string,string>} derivedVar -> attrName (same attribute, one hop away).
 */
function collectDerivedVarMap( phpSrc, attrVarMap ) {
	const derived = new Map();
	const assignRe = /\$([A-Za-z_]\w*)\s*=([^;]*);/g;
	let m;
	while ( ( m = assignRe.exec( phpSrc ) ) !== null ) {
		const lhs = m[ 1 ];
		const rhs = m[ 2 ];
		if ( attrVarMap.has( lhs ) ) {
			continue; // that IS a direct-read assignment, not a derivation
		}
		for ( const [ origVar, attrName ] of attrVarMap ) {
			const re = new RegExp( '\\$' + origVar + '\\b' );
			if ( re.test( rhs ) ) {
				derived.set( lhs, attrName );
				break;
			}
		}
	}
	return derived;
}

/**
 * SIGNAL 1's own derived-variable trace (2026-08-13 audit fix) — used ONLY by
 * CHECK A (attributeIsNonPaintSinkOnly/collectAttrUsageOffsets), NOT by CHECK B
 * (which keeps using collectDerivedVarMap() above, unmodified, per the file
 * header's documented scoping decision). Two differences from
 * collectDerivedVarMap(), both real bugs measured live 2026-08-13:
 *
 * 1. MULTI-ATTRIBUTE, not `break`-on-first-match. A derived var can
 *    legitimately trace back to MORE THAN ONE attribute in the same
 *    right-hand-side expression (real shape: sgs/countdown-timer's
 *    `$total_seconds = ($evergreen_hours*3600) + ($evergreen_mins*60);` —
 *    the old single-value collectDerivedVarMap() `break`s on the FIRST
 *    origVar match found during Map iteration, so `total_seconds` was
 *    attributed only to `evergreenHours`, never `evergreenMinutes` — the
 *    exact reason `evergreenMinutes` stayed wrongly flagged even though its
 *    only real usage site is the same non-paint `data-evergreen` sink as its
 *    sibling). Returns a Set of every attribute name whose var appears
 *    anywhere in the RHS, not just the first one found.
 * 2. TWO derivation hops, not one. A var derived from an ALREADY-derived var
 *    (real shape: sgs/product-search's `$max_results_tiers =
 *    sgs_responsive_normalise_object($attributes['maxResults'] ?? null);`
 *    then, later, `$max_results = clamp($max_results_tiers['desktop']);` —
 *    `max_results` is two hops from the attribute, past the single-hop
 *    ceiling the file header's own blind-spot note already documented as
 *    "not observed live... as of 2026-08-13" — it has now been observed).
 *    Scoped to exactly two hops (not unbounded) — matches this file's own
 *    stated preference for hand-verified bounded extensions over an
 *    unbounded dataflow engine (see file header, Signal 1 cross-file
 *    consumption note) until a THIRD hop is observed live.
 *
 * @param {string}              phpSrc     render.php source.
 * @param {Map<string,string>}  attrVarMap Direct-read map (localVar -> attrName).
 * @return {Map<string,Set<string>>} derivedVar -> Set of every attrName it traces back to.
 */
function collectDerivedVarMapAll( phpSrc, attrVarMap ) {
	const derived = new Map();
	const assignRe = /\$([A-Za-z_]\w*)\s*=([^;]*);/g;

	function addAttr( varName, attrName ) {
		if ( ! derived.has( varName ) ) {
			derived.set( varName, new Set() );
		}
		derived.get( varName ).add( attrName );
	}

	// Hop 1: direct reference to an attrVarMap var, anywhere in the RHS
	// (never `break`s — every matching origVar contributes).
	let m;
	assignRe.lastIndex = 0;
	while ( ( m = assignRe.exec( phpSrc ) ) !== null ) {
		const lhs = m[ 1 ];
		const rhs = m[ 2 ];
		if ( attrVarMap.has( lhs ) ) {
			continue; // that IS a direct-read assignment, not a derivation
		}
		for ( const [ origVar, attrName ] of attrVarMap ) {
			const re = new RegExp( '\\$' + origVar + '\\b' );
			if ( re.test( rhs ) ) {
				addAttr( lhs, attrName );
			}
		}
	}

	// Hop 2: a var derived from a HOP-1 derived var.
	assignRe.lastIndex = 0;
	while ( ( m = assignRe.exec( phpSrc ) ) !== null ) {
		const lhs = m[ 1 ];
		const rhs = m[ 2 ];
		if ( attrVarMap.has( lhs ) || derived.has( lhs ) ) {
			continue;
		}
		for ( const [ hop1Var, attrNames ] of derived ) {
			const re = new RegExp( '\\$' + hop1Var + '\\b' );
			if ( re.test( rhs ) ) {
				for ( const attrName of attrNames ) {
					addAttr( lhs, attrName );
				}
			}
		}
	}

	return derived;
}

function resolveAttrForVar( varName, attrVarMap, derivedVarMap ) {
	return attrVarMap.get( varName ) || derivedVarMap.get( varName ) || null;
}

module.exports = {
	collectAttrVarMap,
	collectDerivedVarMap,
	collectDerivedVarMapAll,
	resolveAttrForVar,
};

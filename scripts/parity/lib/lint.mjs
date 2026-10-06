// Config lint for draft-live-walk.mjs: runs before any browser opens and fails the run on
// a config that cannot prove what it claims (GAP-CHECKLIST.md, "Config lint").

import fs from 'fs';
import { pairingPath } from './ref-trace.mjs';

// The hand pairs' twin-containment verdicts from the surface's pairing report (qa/pairs/<surface>.json, written by
// scripts/computed-route/pairs.mjs), or null when the surface has no pairing report or it carries none.
export function loadHandScope( cfgPath, cfg ) {
	const p = pairingPath( cfgPath, cfg );
	return p ? JSON.parse( fs.readFileSync( p, 'utf8' ) ).handScope || null : null;
}

// Returns a list of problems; an empty list means the config passes. handScope: the verdicts loadHandScope reads; a hand
// pair whose elements hold different words (lib/pair-scope.mjs::judgePairScope) is a problem, so the run stops before
// any browser opens.
export function lintConfig( cfg, handScope = null ) {
	const problems = [];
	const pairNames = new Set( ( cfg.pairs || [] ).map( ( p ) => p.name ) );
	for ( const v of handScope || [] ) {
		if ( ! v.ok && pairNames.has( v.name ) ) {
			problems.push( `pair "${ v.name }" pairs two different parts of the page: ${ v.why } (point both finders at the same element)` );
		}
	}
	const names = new Set();
	for ( const p of cfg.pairs || [] ) {
		if ( names.has( p.name ) ) {
			problems.push( `pair "${ p.name }" is named twice` );
		}
		names.add( p.name );
		for ( const s of p.states || [] ) {
			if ( ! ( cfg.states || [] ).some( ( st ) => st.name === s ) ) {
				problems.push( `pair "${ p.name }" names unknown state "${ s }"` );
			}
		}
	}
	// A state after the first changes something; a pair scoped to it must look at what changed.
	// Pairs shared by every state only prove the page around the change still matches.
	for ( const [ i, st ] of ( cfg.states || [] ).entries() ) {
		if ( i > 0 && ! ( cfg.pairs || [] ).some( ( p ) => p.states?.includes( st.name ) ) ) {
			problems.push( `state "${ st.name }" has no pair scoped to it (add one for the thing the state changes)` );
		}
	}
	for ( const [ i, a ] of ( cfg.accept || [] ).entries() ) {
		if ( ! a.reason || a.reason.trim().length < 12 ) {
			problems.push( `accept #${ i } has no real reason` );
		}
		if ( a.pair && ! names.has( a.pair ) && ! [ '(state)', '(auto)', '(entrance)', '(links)' ].includes( a.pair ) ) {
			problems.push( `accept #${ i } names unknown pair "${ a.pair }"` );
		}
	}
	// A normalise rule is a decision, like an accept: it needs a reason.
	for ( const [ i, n ] of ( cfg.auto?.normalise || [] ).entries() ) {
		if ( ! ( n.from instanceof RegExp ) || 'string' !== typeof n.to || ! n.reason || n.reason.trim().length < 12 ) {
			problems.push( `auto.normalise #${ i } needs a from regex, a to string and a real reason` );
		}
	}
	// The links table maps a link's visible text to where it must go: a path, a URL, tel: or mailto:.
	if ( cfg.links && false !== cfg.links ) {
		for ( const [ label, dest ] of Object.entries( cfg.links ) ) {
			const bad = ( Array.isArray( dest ) ? dest : [ dest ] ).filter( ( v ) => 'string' !== typeof v || ! /^(\/|https?:|tel:|mailto:)/.test( v ) );
			if ( ! label.trim() || bad.length ) {
				problems.push( `links "${ label }" needs a path, URL, tel: or mailto: destination` );
			}
		}
	}
	// A review note says what was looked at in that shot, not that it "looks fine".
	for ( const [ key, note ] of Object.entries( cfg.review || {} ) ) {
		if ( ! /^[\w-]+@\d+$/.test( key ) ) {
			problems.push( `review key "${ key }" is not state@width` );
		} else if ( String( note ).trim().length < 40 ) {
			problems.push( `review note for ${ key } is too short to say what was checked` );
		}
	}
	return problems;
}

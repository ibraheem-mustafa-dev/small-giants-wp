// Solve's half of FR-48-14 (parent writes over one loop body): the inputs lib/loop-body.mjs::loopBodyCheck needs on a real
// run. The fact record (lib/fact-record.mjs::loadFacts) names each template element's enclosing `sc-for`; the surface's
// origin map (`<surface>.origin.json` beside the tree, written by fill.mjs from lib/fill-skeleton.mjs::originMap) names the
// draft element behind each cr-ref; the served root component (the intake's animation inventory entry for the surface's
// draft index, as fill.mjs::animationInventory reads it) turns an origin `Root/<n>` key into the record's key space. With
// any input missing, the hop keeps its one-descendant rule and the reason is returned for the run log.
import fs from 'fs';
import path from 'path';
import { factsFile, loadFacts } from './fact-record.mjs';
import { loopBodyCheck, identityFromOrigin } from './loop-body.mjs';

const readJson = ( file ) => ( fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null );

// The served draft's component from intake.json: the inventory draft whose file is the surface's draft index, else the first.
export function rootComponentOf( intake, draftIndex = null ) {
	const drafts = intake?.inventory?.animations?.drafts || [];
	return ( drafts.find( ( d ) => draftIndex && d.file === path.basename( draftIndex ) ) || drafts[ 0 ] )?.dc ?? null;
}

// { loopBody, note }: loopBody is the hop's ctx.loopBody callback, or null with `note` naming the missing input. repo: the
// checkout; client, surface: the run's; draftIndex: surfaces.json's `draftIndex` for the surface; readFacts( client ): the
// fact record (loadFacts, which refuses an invalid or stale record).
export function solveLoopBody( { repo, client, surface, draftIndex = null, readFacts = ( c ) => loadFacts( c, { repo } ) } ) {
	const buildDir = path.join( repo, 'sites', client, 'build' );
	const originFile = path.join( buildDir, `${ surface }.origin.json` );
	const origin = readJson( originFile );
	if ( ! origin ) {
		return { loopBody: null, note: `no ${ path.relative( repo, originFile ) } (run Fill for the surface): a parent write reaches one descendant only` };
	}
	if ( ! fs.existsSync( factsFile( repo, client ) ) ) {
		return { loopBody: null, note: `no ${ path.relative( repo, factsFile( repo, client ) ) } (run intake --facts ${ client }): a parent write reaches one descendant only` };
	}
	const facts = readFacts( client );
	const rootComponent = rootComponentOf( readJson( path.join( buildDir, 'intake', 'intake.json' ) ), draftIndex );
	return { loopBody: loopBodyCheck( { facts, identityOf: identityFromOrigin( origin, rootComponent ) } ), note: `loop bodies from the fact record and ${ path.relative( repo, originFile ) } (root ${ rootComponent || 'unnamed' })` };
}

// The draft address Solve's walker reads (FR-48-113). A walker config names the draft at the port Fill served it on
// (`draft: { url: process.env.SGS_DRAFT_URL || "<that address>" }`, lib/fill-config.mjs::baseConfigText), and that server is closed
// when the site run ends, so a Solve launched afterwards walks an address nothing answers. serveSurfaceDraft serves the surface's
// draft folder again and gives the recorded address (route hash and all) on the new port, for the child's SGS_DRAFT_URL.
import fs from 'fs';
import path from 'path';
import { assertDraftPage, serveDraft } from './draft.mjs';

// The draft address a walker config's text records, or null when it names none.
export function recordedDraftUrl( text ) {
	const m = /draft:\s*\{\s*url:\s*process\.env\.SGS_DRAFT_URL\s*\|\|\s*("(?:[^"\\]|\\.)*")/.exec( String( text ) );
	return m ? JSON.parse( m[ 1 ] ) : null;
}

// `recorded` on the server at `origin`: the same path, query and route hash.
export function rebaseDraftUrl( recorded, origin ) {
	if ( ! recorded ) {
		return `${ origin }/`;
	}
	const u = new URL( recorded );
	return `${ origin }${ u.pathname }${ u.search }${ u.hash }`;
}

// Serves the draft of surface `key` of `client` and resolves { url, close }, or null when the surface names no draft folder (a surface
// the manifest does not hold, or one that reads no draft). `serve` and `assertPage` are for tests.
export async function serveSurfaceDraft( { repo, client, key, serve = serveDraft, assertPage = assertDraftPage } ) {
	const build = path.join( repo, 'sites', client, 'build' );
	const file = path.join( build, 'surfaces.json' );
	const entry = fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) )[ key ] : null;
	if ( ! entry?.draftDir ) {
		return null;
	}
	const walker = entry.walkerFull || entry.walker;
	const walkerFile = walker ? path.join( build, walker ) : null;
	const recorded = walkerFile && fs.existsSync( walkerFile ) ? recordedDraftUrl( fs.readFileSync( walkerFile, 'utf8' ) ) : null;
	const server = await serve( assertPage( path.join( repo, entry.draftDir ), entry.draftIndex ?? null ), { index: entry.draftIndex ?? null } );
	// A server whose address cannot be read is closed before the error goes on: nobody holds its close.
	try {
		return { url: rebaseDraftUrl( recorded, new URL( server.url ).origin ), close: () => server.close() };
	} catch ( e ) {
		await server.close();
		throw e;
	}
}

// Skeleton writer, decisions and the finaliser (Spec 47 §3.4). Two files beside a surface's inventory hold choices:
//   decisions.json          Bean's recorded choices per element (`skeleton.mjs decide`): top-priority evidence for propose.
//   <surface>.picks.json    the finaliser subagent's picks for the low-confidence rows (`skeleton.mjs finalise --apply`).
// A decision keeps the element's signature (tag and words), so a re-read draft whose element changed under the same key
// is reported stale instead of silently applied. Scripts never call a model: `finalise` writes a request file, the session
// runs prompts/skeleton-finaliser.md over it as a subagent, and `finalise --apply` merges the picks it returns.
import fs from 'fs';
import path from 'path';

export const skeletonDir = ( repo, client ) => path.join( repo, 'sites', client, 'build', 'skeleton' );
export const signatureOf = ( element ) => `${ element.tag }|${ String( element.words ?? '' ).replace( /\s+/g, ' ' ).trim() }`;

const readJson = ( file, fallback ) => ( fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : fallback );
const writeJson = ( file, value ) => {
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, `${ JSON.stringify( value, null, '\t' ) }\n` );
};

// { siteName?, surfaces: { <surface>: { <key>: { block | remove, attributes?, signature, reason? } } } }.
export const readDecisions = ( file ) => readJson( file, { surfaces: {} } );

// Records one decision for an element of a surface. `choice`: { block, attributes? } or { remove: true }. Returns the file's content.
export function recordDecision( { file, surface, element, choice, reason = null } ) {
	if ( ! element ) {
		throw new Error( 'decide needs an element that is in the inventory' );
	}
	if ( ! choice?.remove && ! choice?.block ) {
		throw new Error( 'decide needs --block <slug> or --remove' );
	}
	const all = readDecisions( file );
	( all.surfaces[ surface ] ||= {} )[ element.key ] = { ...( choice.remove ? { remove: true } : { block: choice.block, ...( choice.attributes ? { attributes: choice.attributes } : {} ) } ), signature: signatureOf( element ), ...( reason ? { reason } : {} ) };
	writeJson( file, all );
	return all;
}

// Records the site name (the typed-brand rule compares words with it).
export function recordSiteName( { file, siteName } ) {
	const all = readDecisions( file );
	all.siteName = String( siteName ).replace( /\s+/g, ' ' ).trim();
	writeJson( file, all );
	return all;
}

export const readPicks = ( file ) => readJson( file, {} );

// What the finaliser subagent is asked: one entry per low-confidence row with the element's record, the candidates and the evidence.
export function finaliseRequest( { inventory, proposal, surface, promptFile } ) {
	const byKey = Object.fromEntries( inventory.elements.map( ( e ) => [ e.key, e ] ) );
	const rows = proposal.rows.filter( ( r ) => ( r.low && ! r.action ) || 'unresolved' === r.action );
	return {
		generated: new Date().toISOString(), surface, source: inventory.source, prompt: promptFile, answerShape: '[ { "key": "<row key>", "block": "<slug>" | null, "remove": true | false, "attributes": { }, "confidence": 0..1, "reason": "<one sentence>" } ]',
		rows: rows.map( ( r ) => {
			const e = byKey[ r.key ];
			const parent = byKey[ e.parentKey ];
			return {
				key: r.key, element: { tag: e.tag, attrs: e.attrs, words: e.words, allText: e.allText, snippet: e.snippet, membership: e.membership, display: e.display, box: e.box, visible: e.visible },
				parent: parent ? { key: parent.key, tag: parent.tag, words: parent.words } : null, siblings: inventory.elements.filter( ( x ) => x.parentKey === e.parentKey && x.key !== e.key ).map( ( x ) => ( { key: x.key, tag: x.tag, words: x.words } ) ),
				confidence: r.confidence, candidates: r.candidates, reason: r.reason,
			};
		} ),
	};
}

// Validates a picks list against a finalise request and the database, and merges it into the picks file. Throws on a
// key outside the request, an unknown block or an entry with neither block nor remove. Returns the merged picks.
export function applyPicks( { picks, request, knownBlock, file } ) {
	if ( ! Array.isArray( picks ) ) {
		throw new Error( 'the picks file is a list of { key, block | remove, confidence, reason }' );
	}
	const keys = new Set( request.rows.map( ( r ) => r.key ) );
	const merged = readPicks( file );
	for ( const p of picks ) {
		if ( ! keys.has( p?.key ) ) {
			throw new Error( `pick for ${ p?.key } is not a row of the finalise request` );
		}
		if ( ! p.remove && ! p.block ) {
			throw new Error( `pick for ${ p.key } names neither a block nor remove` );
		}
		if ( p.block && ! knownBlock( p.block ) ) {
			throw new Error( `pick for ${ p.key } names ${ p.block }, which is not in the framework database` );
		}
		merged[ p.key ] = { ...( p.remove ? { remove: true } : { block: p.block, ...( p.attributes ? { attributes: p.attributes } : {} ) } ), confidence: Math.min( 0.95, Number( p.confidence ?? 0.8 ) ), reason: p.reason || '' };
	}
	writeJson( file, merged );
	return merged;
}

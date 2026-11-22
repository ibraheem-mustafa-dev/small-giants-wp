// A menu entry that says it is coming soon (data/skeleton-decisions.json `rules.navigation.briefOnlyEntry`; Bean, 2026-10-09:
// "there's no point of putting a coming soon item in a link list"). An entry with no link, among a menu's links, whose label
// or chip is a coming-soon word (a lone "SOON" beside "Glasses") is a line the designer's brief wrote: intake never reads it
// as a menu item (lib/intake-pagemap-surfaces.mjs::readItems), and the skeleton removes its draft elements and lists them for
// removal (lib/skeleton-write-record.mjs::absorbSubtree). Decided by meaning from the patterns, never by a client's words.
import fs from 'fs';
import { DECISIONS_FILE, specHit } from './skeleton-facts.mjs';

let cached = null;

// The decisions' spec ({ id, patterns, flags, reason }) or null; `file` reads another decisions file (tests).
export function soonEntrySpec( file = DECISIONS_FILE ) {
	if ( file !== DECISIONS_FILE ) {
		return JSON.parse( fs.readFileSync( file, 'utf8' ) ).rules?.navigation?.briefOnlyEntry ?? null;
	}
	return ( cached ??= { spec: JSON.parse( fs.readFileSync( DECISIONS_FILE, 'utf8' ) ).rules?.navigation?.briefOnlyEntry ?? null } ).spec;
}

// Whether a link-less entry's label or chip words say it is coming soon.
export const isSoonEntry = ( { label = '', badge = '' } = {}, spec = soonEntrySpec() ) => !! spec && [ badge, label ].some( ( t ) => '' !== String( t ?? '' ).trim() && !! specHit( spec, t ) );

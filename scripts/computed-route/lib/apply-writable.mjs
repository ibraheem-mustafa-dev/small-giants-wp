// The CSS properties an applier family can write. A divergence-ledger ruling about one of these must name what it covers
// (lib/apply-ledger.mjs); a ruling about a property the applier never writes (a breakpoint, a section height, text) needs no more.
// Sources: each family's declared props, the state read (hover looks), the form and tile probes, and the state timing looks.
import { FAMILIES, familyProps } from './apply-families.mjs';
import { HOVER_READ_PROPS } from './apply-hover.mjs';
import { CHECK_PROPS, CONSENT_PROPS, FIELD_FOCUS_PROPS, FIELD_REST_PROPS, LABEL_PROPS, TILE_PROPS } from './apply-probes.mjs';
import { TIMED_PROPS } from './apply-state-timing.mjs';

export function writableProps() {
	return [ ...new Set( [ ...familyProps( FAMILIES ), ...HOVER_READ_PROPS, ...FIELD_REST_PROPS, ...FIELD_FOCUS_PROPS, ...LABEL_PROPS, ...TILE_PROPS, ...CONSENT_PROPS, ...CHECK_PROPS, ...TIMED_PROPS ] ) ].sort();
}

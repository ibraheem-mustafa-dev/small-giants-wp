// The class of a failed stage, recorded in status.json beside its message (site-run.mjs::stageRecord), so a run's failures are
// counted by class and no reader has to reconstruct the class from free text. An error that knows its own class carries it as
// `failureClass` (surfaceStepper passes it on); any other failure is classed from its message by the first row below that
// matches. A message no row matches is `other`: a new class is a new row, and a failure that keeps landing in `other` is a row
// to add. The classes are the ones the 2026-11 proof runs produced.
export const FAILURE_CLASSES = [
	[ 'not-at-rest', /not at rest after a fresh load|was refused, not measured/ ],
	[ 'live-element-absent', /has no element for the surface's root|the live page has no element/ ],
	[ 'no-setting-row', /no-setting rows?\b.*(name|names) (something|a setting)/s ],
	[ 'stale-intake', /intake\.json.*(stale|older)|stale.*intake|(stale|invalid) one is the record/s ],
	[ 'paint-conservation', /paint conservation/ ],
	[ 'paint-pairing', /paint pairing/ ],
	[ 'no-default-paint', /no default paint/ ],
	[ 'skeleton-lint', /skeleton lint|the skeleton is not valid/ ],
	[ 'handover-shape', /handover/ ],
	[ 'unknown-rule', /unknown rule/ ],
	[ 'fill-wrote-no-tree', /Fill wrote no tree|none of its pages has a Filled tree/ ],
	[ 'tree-rejected', /setting "[^"]+" must be|tree rejected/ ],
	[ 'browser-timeout', /Timeout \d+ms|timed out|Execution context was destroyed|Target (page|closed)/i ],
	[ 'no-intake-surface', /no intake surface/ ],
	[ 'missing-input', /no such file|ENOENT|Cannot find module/ ],
];

export const OTHER_FAILURE = 'other';

// The class of a failed stage: the error's own `failureClass`, else the first row matching its message, else `other`.
export function failureClass( detail, own = null ) {
	if ( own ) {
		return own;
	}
	const text = String( detail ?? '' );
	return FAILURE_CLASSES.find( ( [ , re ] ) => re.test( text ) )?.[ 0 ] ?? OTHER_FAILURE;
}

// How many failed stages of a status object fall in each class: { class: count }, most frequent first. A failed stage with no
// recorded class (a status written before the field existed) is classed from its detail.
export function failureCounts( status ) {
	const counts = {};
	for ( const stages of Object.values( status ) ) {
		for ( const r of Object.values( stages ) ) {
			if ( ! r.ok ) {
				const c = r.failureClass ?? failureClass( r.detail );
				counts[ c ] = ( counts[ c ] || 0 ) + 1;
			}
		}
	}
	return Object.fromEntries( Object.entries( counts ).sort( ( a, b ) => b[ 1 ] - a[ 1 ] ) );
}

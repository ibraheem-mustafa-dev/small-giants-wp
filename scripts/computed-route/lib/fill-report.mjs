// Fill's report (FR-47-4 step 5): fill-report.md for a reader and fill-report.json for a tool. The UNMAPPED list is the
// framework work for the surface, known before the first build; the handover list is Solve's shape (§3.3).
import { handoverCounts, HANDOVER_OWNERS } from './fill-handover.mjs';

const cell = ( v ) => String( typeof v === 'object' && null !== v ? JSON.stringify( v ) : v ?? '' ).replace( /\|/g, '\\|' ).replace( /\n/g, ' ' ).slice( 0, 200 );
const table = ( head, rows ) => ( rows.length ? [ `| ${ head.join( ' | ' ) } |`, `|${ head.map( () => '---' ).join( '|' ) }|`, ...rows.map( ( r ) => `| ${ r.map( cell ).join( ' | ' ) } |` ), '' ] : [ 'None.', '' ] );

// The UNMAPPED list as the contract names it: property, value, node, reason (plus the block and element for a reader).
export const unmappedList = ( unmapped ) => unmapped.map( ( u ) => ( { property: u.property, value: u.value, node: u.node, reason: u.reason, block: u.block, slot: u.slot ?? '' } ) );

// r: { client, surface, draft (the page or folder read), nodes (count), targets (count), writes, unmapped, notes,
// handover, spacing, fluid, held, snaps, steps (breakpoint log), entrances: [{ node, block, measured | null }],
// scale?: the sweep was skipped }. Returns { markdown, json }.
export function fillReport( r ) {
	const counts = handoverCounts( r.handover );
	const json = {
		client: r.client, surface: r.surface, draft: r.draft, nodes: r.nodes, targets: r.targets,
		counts: { writes: r.writes.length, unmapped: r.unmapped.length, handover: r.handover.length, notes: r.notes.length, fluid: r.fluid.length, breakpointSteps: r.steps.length, ledgerHeld: r.held.length },
		writes: r.writes, unmapped: unmappedList( r.unmapped ), handover: r.handover, handoverByOwner: counts, spacing: r.spacing, fluid: r.fluid, breakpoints: r.steps, entrances: r.entrances, ledger: r.held, snaps: r.snaps, notes: r.notes,
	};
	const L = [
		`# Fill: ${ r.surface }`, '',
		`Client ${ r.client }. Draft: ${ r.draft }. ${ r.nodes } nodes, ${ r.targets } measured elements (draftRef and draftSlots). Fill writes rest-state styles, spacing, presence, words, links and entrances in one root-down pass; hover, focus and active states are Solve's.`, '',
		'| What | Count |', '|---|---|',
		`| Settings written | ${ r.writes.length } |`,
		`| UNMAPPED (framework work, known before the first build) | ${ r.unmapped.length } |`,
		`| Handover (content outside the tree) | ${ r.handover.length } (${ HANDOVER_OWNERS.map( ( o ) => `${ o } ${ counts[ o ] }` ).join( ', ' ) }) |`,
		`| Fluid sizes found | ${ r.fluid.length } (${ r.fluid.filter( ( f ) => 'clamp' === f.written ).length } written as clamp()) |`,
		`| Breakpoint steps logged for a human | ${ r.steps.length } |`,
		`| Held by the divergence ledger | ${ r.held.length } |`, '',
		'## UNMAPPED', '',
		'Each row is a draft value no block setting can hold (or that the draft paints and the block cannot), with the reason the resolver gave.', '',
		...table( [ 'Property', 'Value', 'Node', 'Block', 'Element', 'Reason' ], r.unmapped.map( ( u ) => [ u.property, u.value, u.node, u.block, u.slot ?? '', u.reason ] ) ),
		'## Handover', '',
		...table( [ 'Owner', 'Kind', 'Node', 'Element', 'Evidence', 'Reason' ], r.handover.map( ( h ) => [ h.owner, h.kind, h.node, h.slot, h.evidence, h.reason ] ) ),
		'## Settings written', '',
		...table( [ 'Node', 'Block', 'Element', 'Property', 'Setting', 'Before', 'After', 'Tiers', 'How' ], r.writes.map( ( w ) => [ w.node, w.block, w.slot, w.prop, w.attr, w.before, w.after, w.widths.join( ',' ), w.how ] ) ),
		'## Spacing ownership', '',
		'Decided per tier from the rendered gaps between consecutive children\'s border boxes (equal means within 0.5px). Parent: it holds the gap and the children give up their between-sibling margins. Children: the parent gap is 0 and each child keeps its own margin.', '',
		...table( [ 'Node', 'Width', 'Owner', 'Rendered children', 'Decisions' ], r.spacing.map( ( s ) => [ s.node, s.width, s.owner, s.count, s.decisions.map( ( d ) => `${ d.prop } ${ d.owner } ${ d.value } (gaps ${ d.gaps.join( ', ' ) })` ).join( '; ' ) ] ) ),
		'## Fluid sizes', '',
		...table( [ 'Node', 'Element', 'Property', 'Expression', 'Written', 'Why' ], r.fluid.map( ( f ) => [ f.node, f.slot, f.prop, f.clamp, f.written, f.reason ] ) ),
		'## Breakpoint steps', '',
		r.sweepSkipped ? 'The 16px sweep was not run (--no-sweep).' : 'Each element swept every 16px from 320 to 1920. A step is where a value changes against its neighbour; the nearest SGS boundary (768, 1024) is named, and `on boundary` says the step lands on it. For a human to decide against `divergences.json`: Fill writes no ledger entry.', '',
		...( r.sweepSkipped ? [] : table( [ 'Node', 'Element', 'Property', 'From', 'To', 'At', 'Nearest boundary', 'Offset', 'On boundary' ], r.steps.map( ( s ) => [ s.node, s.slot, s.prop, s.from, s.to, s.at, s.boundary, s.offset, s.onBoundary ? 'yes' : 'no' ] ) ) ),
		'## Entrances', '',
		...table( [ 'Node', 'Block', 'Delay ms', 'Duration ms', 'Distance px', 'Opacity from', 'Settings written' ], r.entrances.filter( ( e ) => e.measured ).map( ( e ) => [ e.node, e.block, e.measured.delayMs, e.measured.durationMs, e.measured.distancePx, e.measured.opacityFrom, r.writes.filter( ( w ) => w.node === e.node && 'entrance' === w.how ).map( ( w ) => w.attr ).join( ', ' ) ] ) ),
		'## Divergence ledger', '',
		...table( [ 'Entry', 'Node', 'Property', 'Width', 'Effect' ], r.held.map( ( h ) => [ h.id, h.node, h.prop, h.width, h.rule ? `rule ${ h.rule }: nothing written` : ( false === h.applied ? 'not applied: a hover-capable property, judged on hover rows (Solve)' : 'decided value written' ) ] ) ),
		'## Token snaps', '',
		...table( [ 'Where', 'From', 'To', 'Distance', 'Kind' ], r.snaps.map( ( s ) => [ s.where, s.from, s.to, s.distance, s.kind ] ) ),
		'## Notes', '',
		...( r.notes.length ? r.notes.map( ( n ) => `- ${ n }` ) : [ 'None.' ] ), '',
	];
	return { markdown: L.join( '\n' ), json };
}

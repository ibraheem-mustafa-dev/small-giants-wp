// Fill's report (FR-47-4 step 5): fill-report.md for a reader and fill-report.json for a tool. The UNMAPPED list is the
// framework work for the surface, known before the first build; the handover list is Solve's shape (§3.3).
import { handoverCounts, HANDOVER_OWNERS } from './fill-handover.mjs';
import { HELD_REASONS, heldCounts } from './fill-held.mjs';

// Why a value Fill read ends with nothing written and nothing unwritten (lib/fill-resolve-element.mjs::settled): `equal`, the
// element already shows it; `already-set`, the tree already holds the setting's value; `used-size`, the rendered value is a
// layout result the code does not declare as a length (an auto margin, an undeclared width or height); `not-painted`, the
// value paints nothing there; `row-held`, a generated icon's value the icon row's shared setting holds
// (lib/fill-row-lift.mjs::liftChildren); `logo-size`, `width-ladder`, `dimension` and `motion`, an UNMAPPED row that pass
// wrote or settled (passSettled).
export const SETTLED = [ 'equal', 'already-set', 'used-size', 'not-painted', 'row-held', 'logo-size', 'width-ladder', 'dimension', 'motion' ];

// The file of each pass a settled row names.
const PASS_FILE = { 'logo-size': 'fill-logo-size.mjs', 'width-ladder': 'fill-width-ladder.mjs', dimension: 'fill-dimensions.mjs', motion: 'fill-motion-settle.mjs' };
const sameRead = ( u, a ) => ( u.node === a.node || ( u.nodes || [] ).includes( a.node ) ) && ( u.slot ?? '' ) === a.slot && u.property === a.property && String( u.value ) === String( a.value ) && ( u.state ?? null ) === ( a.state ?? null );

// The UNMAPPED rows a later Fill pass (lib/fill-logo-size.mjs, lib/fill-width-ladder.mjs, lib/fill-dimensions.mjs) wrote
// or settled, as settled rows naming the pass (`reason`): one per entry of the pass's `answered` list
// (lib/fill-regap.mjs::answer, one per node, with the read widths it answers). A row the pass took out of `before`
// without answering it is no settled row, so its read shows as dropped; a node the pass answered and still leaves in
// `after` stays unwritten.
export function passSettled( before, after, reason, answered = [] ) {
	return answered.filter( ( a ) => ! after.some( ( u ) => sameRead( u, a ) ) ).map( ( a ) => {
		const was = before.find( ( u ) => sameRead( u, a ) );
		return { node: a.node, block: a.block, slot: a.slot, ...( a.readSlot ? { readSlot: a.readSlot } : {} ), property: a.property, value: a.value, ...( a.state ? { state: a.state } : {} ), widths: a.widths, reason, detail: `lib/${ PASS_FILE[ reason ] } wrote or settled it${ was ? ` (was: ${ was.reason })` : '' }` };
	} );
}
const settledCounts = ( rows ) => Object.fromEntries( SETTLED.map( ( k ) => [ k, rows.filter( ( s ) => s.reason === k ).length ] ) );

// The confirm record's verdicts (lib/fill-confirm.mjs, FR-48-36).
const VERDICTS = [ 'confirmed', 'render-wins', 'draft-defect', 'effect-differs', 'open' ];

const cell = ( v ) => String( typeof v === 'object' && null !== v ? JSON.stringify( v ) : v ?? '' ).replace( /\|/g, '\\|' ).replace( /\n/g, ' ' ).slice( 0, 200 );
const table = ( head, rows ) => ( rows.length ? [ `| ${ head.join( ' | ' ) } |`, `|${ head.map( () => '---' ).join( '|' ) }|`, ...rows.map( ( r ) => `| ${ r.map( cell ).join( ' | ' ) } |` ), '' ] : [ 'None.', '' ] );

// The UNMAPPED list as the contract names it: property, value, node, reason (plus the block, the element and the state the
// row was read in, null at rest, which lib/confirm-live.mjs::judgeUnmapped judges by). A `no-setting` row keeps the `code`,
// `checks` and `unchecked` fields the resolver recorded (lib/fill-resolve-element.mjs::checksRan): lib/gap-classes.mjs::mapResolverGap
// classes the row from them.
export const unmappedList = ( unmapped ) => unmapped.map( ( u ) => ( { property: u.property, value: u.value, node: u.node, reason: u.reason, block: u.block, slot: u.slot ?? '', state: u.state ?? null, ...( u.nodes?.length > 1 ? { nodes: u.nodes } : {} ), ...( u.code ? { code: u.code } : {} ), ...( u.checks ? { checks: u.checks } : {} ), ...( u.unchecked ? { unchecked: u.unchecked } : {} ) } ) );

// The property an UNMAPPED row names for a draft read that failed: no one property was read.
export const READ_FAILED = '(declared read)';

// Each failed draft read (lib/fill-read.mjs::readDraft's `failures`) as an UNMAPPED row with its reason, so a read that threw
// ends recorded rather than silent. nodes: lib/fill-skeleton.mjs::skeletonNodes; flat[index]: the tree node; refOf: its ref.
export function readFailureRows( { reads, nodes, flat, refOf } ) {
	return ( reads?.failures || [] ).map( ( f ) => {
		const rec = nodes.find( ( n ) => n.index === f.owner );
		const slot = f.id.slice( f.id.indexOf( ':' ) + 1 );
		return { node: refOf( flat[ f.owner ] ), block: rec?.name ?? '', slot, property: READ_FAILED, value: `${ f.width }px`, state: null, reason: `read-failed: the draft's ${ f.read } values for this element at ${ f.width }px could not be read (${ f.reason }), so none of them is judged there` };
	} );
}

const isObj = ( v ) => v && 'object' === typeof v && ! Array.isArray( v );

// The places (`desktop`, `mobile.right`, '' for a whole value) where a write changed its setting: before and after differ.
function changedPaths( before, after, at = '' ) {
	if ( isObj( after ) ) {
		const b = isObj( before ) ? before : {};
		return [ ...new Set( [ ...Object.keys( b ), ...Object.keys( after ) ] ) ].flatMap( ( k ) => changedPaths( b[ k ], after[ k ], at ? `${ at }.${ k }` : k ) );
	}
	return JSON.stringify( before ) === JSON.stringify( after ) ? [] : [ at ];
}
const valueAt = ( v, at ) => ( '' === at ? v : at.split( '.' ).reduce( ( o, k ) => ( isObj( o ) ? o[ k ] : undefined ), v ) );

// The writes a later write replaced: Map( index -> index of the write that replaced it ). A write is replaced when
// every place it changed (a tier, a side, or the whole value) is changed again by a later write on the same node and
// setting; a later text that extends the earlier one (Additional CSS and its label, appended to) keeps it.
export function supersededWrites( writes ) {
	const out = new Map();
	writes.forEach( ( w, i ) => {
		const paths = changedPaths( w.before, w.after );
		let by = null;
		const replaced = paths.length > 0 && paths.every( ( at ) => {
			const mine = valueAt( w.after, at );
			const j = writes.findIndex( ( x, k ) => k > i && x.node === w.node && x.attr === w.attr && changedPaths( x.before, x.after ).some( ( p ) => p === at || p.startsWith( `${ at }.` ) || at.startsWith( `${ p }.` ) || '' === p ) && ! ( 'string' === typeof mine && String( valueAt( x.after, at ) ?? '' ).startsWith( mine ) ) );
			by = Math.max( by ?? -1, j );
			return -1 !== j;
		} );
		replaced && out.set( i, by );
	} );
	return out;
}

// r: { client, surface, draft (the page or folder read), nodes (count), targets (count), writes, unmapped, notes,
// handover, spacing, fluid, held, snaps, steps (breakpoint log), entrances: [{ node, block, measured | null }],
// customCssGaps (lib/fill-step-rungs.mjs `gaps`), scale?: the sweep was skipped }. Returns { markdown, json }. A write a later
// write replaced (supersededWrites) stays in `writes` marked `supersededBy` (the later write's index) and is not counted.
export function fillReport( r ) {
	const replaced = supersededWrites( r.writes );
	const writes = r.writes.map( ( w, i ) => ( replaced.has( i ) ? { ...w, supersededBy: replaced.get( i ) } : w ) );
	const live = writes.length - replaced.size;
	const gaps = r.customCssGaps || [];
	const counts = handoverCounts( r.handover );
	const held = r.alreadyHeld || [];
	const heldBy = heldCounts( held );
	const settled = r.settled || [];
	const settledBy = settledCounts( settled );
	const json = {
		client: r.client, surface: r.surface, draft: r.draft, nodes: r.nodes, targets: r.targets,
		counts: { writes: live, superseded: replaced.size, customCssGaps: gaps.length, unmapped: r.unmapped.length, handover: r.handover.length, notes: r.notes.length, fluid: r.fluid.length, breakpointSteps: r.steps.length, ledgerHeld: r.held.length, alreadyHeld: { total: held.length, ...heldBy }, patchKeys: ( r.snapshotPatch?.entries || [] ).length, unread: ( r.unread || [] ).length, settled: { total: settled.length, ...settledBy }, confirm: ( r.confirm || [] ).length },
		writes, customCssGaps: gaps, unmapped: unmappedList( r.unmapped ), alreadyHeld: held.map( ( h ) => ( { property: h.property, value: h.value, node: h.node, block: h.block, slot: h.slot ?? '', state: h.state ?? null, reason: h.heldReason, detail: h.heldDetail } ) ), handover: r.handover, handoverByOwner: counts, spacing: r.spacing, fluid: r.fluid, breakpoints: r.steps, entrances: r.entrances, ledger: r.held, snaps: r.snaps, notes: r.notes, snapshotPatch: r.snapshotPatch || { file: null, entries: [] }, unread: r.unread || [], settled, confirm: r.confirm || [],
	};
	const L = [
		`# Fill: ${ r.surface }`, '',
		`Client ${ r.client }. Draft: ${ r.draft }. ${ r.nodes } nodes, ${ r.targets } measured elements (draftRef and draftSlots). Fill writes rest-state styles, spacing, presence, words, links and motion (each node's sgsMotion: entrances and hover moves) in one root-down pass; hover, focus and active colour states are Solve's.`, '',
		'| What | Count |', '|---|---|',
		`| Settings written | ${ live } (and ${ replaced.size } a later write on the same setting replaced, marked \`supersededBy\`) |`,
		`| Custom-CSS rules with a gaps row (the native control each could become) | ${ gaps.length } |`,
		`| UNMAPPED (framework work, known before the first build) | ${ r.unmapped.length } |`,
		`| Handover (content outside the tree) | ${ r.handover.length } (${ HANDOVER_OWNERS.map( ( o ) => `${ o } ${ counts[ o ] }` ).join( ', ' ) }) |`,
		`| Fluid sizes found | ${ r.fluid.length } (${ r.fluid.filter( ( f ) => 'clamp' === f.written ).length } written as clamp()) |`,
		`| Breakpoint steps logged for a human | ${ r.steps.length } |`,
		`| Already held (the element renders the draft's value; not a gap) | ${ held.length } (${ HELD_REASONS.map( ( k ) => `${ k } ${ heldBy[ k ] }` ).join( ', ' ) }) |`,
		`| Held by the divergence ledger | ${ r.held.length } |`,
		`| Not read (settings no read reached and no decision judged) | ${ ( r.unread || [] ).length } |`,
		`| Settled (read, nothing to write; each row in fill-report.json \`settled\`) | ${ settled.length } (${ SETTLED.map( ( k ) => `${ k } ${ settledBy[ k ] }` ).join( ', ' ) }) |`,
		`| Confirm records (declared against rendered, FR-48-8) | ${ ( r.confirm || [] ).length } (${ VERDICTS.map( ( v ) => `${ v } ${ ( r.confirm || [] ).filter( ( c ) => c.verdict === v ).length }` ).join( ', ' ) }) |`, '',
		'## UNMAPPED', '',
		'Each row is a draft value no block setting can hold (or that the draft paints and the block cannot), with the reason the resolver gave.', '',
		...table( [ 'Property', 'Value', 'State', 'Node', 'Block', 'Element', 'Reason' ], r.unmapped.map( ( u ) => [ u.property, u.value, u.state ?? '', u.node, u.block, u.slot ?? '', u.reason ] ) ),
		'## Already held', '',
		'Rows the resolver could not place by name that the element already renders at every width they state, so nothing needs writing. `covered`: a written setting (or an sgsMotion state) paints this value on this element. `inherited`: an inherited property on an element with no text of its own, equal to its parent. `default`: the value is the calibrated default paint of this element. A value that differs by one unit, or holds at some widths only, stays in UNMAPPED.', '',
		...HELD_REASONS.flatMap( ( k ) => [ `### ${ k } (${ heldBy[ k ] })`, '', ...table( [ 'Property', 'Value', 'State', 'Node', 'Block', 'Element', 'Held because' ], held.filter( ( h ) => h.heldReason === k ).map( ( h ) => [ h.property, h.value, h.state ?? '', h.node, h.block, h.slot ?? '', h.heldDetail ] ) ) ] ),
		'## Not read', '',
		'Settings the block\'s calibration or the framework database knows that no read reached and no decision judged on a measured node: a draftSlots finder the skeleton does not give, or a calibration reading that does not exist. Nothing here was written.', '',
		...table( [ 'Node', 'Block', 'Kind', 'Element', 'Settings', 'Reason' ], ( r.unread || [] ).map( ( u ) => [ u.node, u.block, u.kind, u.slot, u.settings.join( ', ' ), u.reason ] ) ),
		'## Confirm records: the render overrides the code, or the code never paints', '',
		'Every written value keeps a confirm record in fill-report.json (`confirm`). These are the ones whose declared value and rendered draft value disagree: `render-wins` writes the rendered value; `draft-defect` is a declaration intake lists as never painting (FR-48-34), for Bean. The check fills in the rendered-live value.', '',
		...table( [ 'Node', 'Block', 'Property', 'Width', 'Declared', 'Rendered', 'Tolerance', 'Verdict' ], ( r.confirm || [] ).filter( ( c ) => 'render-wins' === c.verdict || 'draft-defect' === c.verdict ).map( ( c ) => [ c.node, c.block, c.property, c.width, c.declared, c.renderedDraft, c.tolerance, c.verdict ] ) ),
		'## Handover', '',
		...table( [ 'Owner', 'Kind', 'Node', 'Element', 'Evidence', 'Reason' ], r.handover.map( ( h ) => [ h.owner, h.kind, h.node, h.slot, h.evidence, h.reason ] ) ),
		'## Settings written', '',
		...table( [ 'Node', 'Block', 'Element', 'Property', 'Setting', 'Before', 'After', 'Tiers', 'How' ], writes.map( ( w, i ) => [ w.node, w.block, w.slot, w.prop, w.attr, w.before, w.after, w.widths.join( ',' ), `${ w.read ? `${ w.how } (read ${ w.read }: the render did not confirm it)` : w.how }${ replaced.has( i ) ? ` (superseded by write ${ replaced.get( i ) })` : '' }` ] ) ),
			'## Custom-CSS gaps', '',
			...table( [ 'Node', 'Block', 'Element', 'Properties', 'Native control', 'Rule' ], gaps.map( ( g ) => [ g.node, g.block, g.slot, g.properties.join( ', ' ), g.control, g.css ] ) ),
		'## Theme snapshot patch', '',
		r.snapshotPatch?.file ? `Keys for the client's theme-snapshot.json, written beside this report as \`${ r.snapshotPatch.file }\` (Fill never edits the snapshot): the draft's focus look, button press looks and link-state looks. Merge it with the snapshot, then run the focus-token gate.` : 'The draft sets no focus, press or link-state look the theme holds; no patch file was written.', '',
		...table( [ 'Key', 'Value', 'State', 'Node', 'Block', 'Element' ], ( r.snapshotPatch?.entries || [] ).map( ( e ) => [ e.path, e.value, e.state, e.node, e.block, e.slot ] ) ),
		'## Spacing ownership', '',
		'Decided per tier from the rendered gaps between consecutive children\'s border boxes (equal means within 0.5px). Parent: it holds the gap and the children give up their between-sibling margins. Children: the parent gap is 0 and each child keeps its own margin.', '',
		...table( [ 'Node', 'Width', 'Owner', 'Rendered children', 'Decisions' ], r.spacing.map( ( s ) => [ s.node, s.width, s.owner, s.count, s.decisions.map( ( d ) => `${ d.prop } ${ d.owner } ${ d.value } (gaps ${ d.gaps.join( ', ' ) })` ).join( '; ' ) ] ) ),
		'## Fluid sizes', '',
		...table( [ 'Node', 'Element', 'Property', 'Expression', 'Written', 'Why' ], r.fluid.map( ( f ) => [ f.node, f.slot, f.prop, f.clamp, f.written, f.reason ] ) ),
		'## Breakpoint steps', '',
		r.sweepSkipped ? 'The 16px sweep was not run (--no-sweep).' : 'Each element swept every 16px from 320 to 1920. A step is where a value changes against its neighbour; the nearest SGS boundary (768, 1024) is named, and `on boundary` says the step lands on it. For a human to decide against `divergences.json`: Fill writes no ledger entry.', '',
		...( r.sweepSkipped ? [] : table( [ 'Node', 'Element', 'Property', 'From', 'To', 'At', 'Nearest boundary', 'Offset', 'On boundary' ], r.steps.map( ( s ) => [ s.node, s.slot, s.prop, s.from, s.to, s.at, s.boundary, s.offset, s.onBoundary ? 'yes' : 'no' ] ) ) ),
		'## Entrances', '',
		...table( [ 'Node', 'Block', 'Delay ms', 'Duration ms', 'Distance px', 'Opacity from', 'Settings written' ], r.entrances.filter( ( e ) => e.measured ).map( ( e ) => [ e.node, e.block, e.measured.delayMs, e.measured.durationMs, e.measured.distancePx, e.measured.opacityFrom, r.writes.filter( ( w ) => w.node === e.node && 'motion' === w.how ).map( ( w ) => w.attr ).join( ', ' ) ] ) ),
		'## Divergence ledger', '',
		...table( [ 'Entry', 'Node', 'Property', 'Width', 'Effect' ], r.held.map( ( h ) => [ h.id, h.node, h.prop, h.width, h.rule ? `rule ${ h.rule }: nothing written` : ( false === h.applied ? 'not applied: a hover-capable property, judged on hover rows (Solve)' : 'decided value written' ) ] ) ),
		'## Token snaps', '',
		...table( [ 'Where', 'From', 'To', 'Distance', 'Kind' ], r.snaps.map( ( s ) => [ s.where, s.from, s.to, s.distance, s.kind ] ) ),
		'## Notes', '',
		...( r.notes.length ? r.notes.map( ( n ) => `- ${ n }` ) : [ 'None.' ] ), '',
	];
	return { markdown: L.join( '\n' ), json };
}

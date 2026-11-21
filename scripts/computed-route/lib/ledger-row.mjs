// The run ledger's row shape (tools/clone-ledger.mjs, and the shape each stage of a cloning run could append to one per-run
// file for the surface, so the last stage is only the live read and the comparison). One row is one draft look at one
// part, property, state and set of widths, and what one stage did with it:
//   { draftKey, part, property, state, widths, draft,
//     stage,      // the pipeline stage that last handled the look: inventory, skeleton, fill, build, apply, render, site
//     outcome,    // { kind, setting?, value?, baseline?, reason?, into? }: kind is passed-on, written, judged-equal,
//                 // custom-css, dropped, absorbed, unread or misread
//     record,     // { file, section, match }: the stage's own record row that shows it
//     live?,      // { selector, paintedOn?, value, box? }: the finished page, filled in by the verify stage only
//     verdict? }  // the ledger's closed stage (lib/ledger-stage.mjs::STAGES) once the live read differs
// Pure functions: the ledger's own rows mapped onto that shape.

// The pipeline stage each ledger verdict belongs to.
export const PIPELINE_STAGE = {
	'draft-read': 'inventory',
	'no-node': 'skeleton',
	'other-block': 'skeleton',
	'not-read-by-fill': 'fill',
	'judged-equal': 'fill',
	unmapped: 'fill',
	'custom-css': 'fill',
	'written-not-built': 'build',
	'apply-failed': 'apply',
	'block-render': 'render',
	content: 'build',
	'live-only': 'site',
};

// The files each record name points to, relative to the records folder (`fill` is the Fill run's folder name).
const fileOf = ( rec, surface, fill ) => {
	const r = String( rec || '' );
	if ( /^fill-report/.test( r ) ) {
		return `qa/fill/${ surface }/${ fill }/fill-report.json`;
	}
	if ( /^inventory/.test( r ) ) {
		return `skeleton/${ surface }.inventory.json`;
	}
	if ( /^proposal/.test( r ) ) {
		return `skeleton/${ surface }.proposal.json`;
	}
	if ( /^skeleton/.test( r ) ) {
		return `skeleton/${ surface }.skeleton.json`;
	}
	if ( /^apply/.test( r ) ) {
		return `qa/apply/${ surface }.plan.json`;
	}
	if ( /built tree/.test( r ) ) {
		return `qa/fill/${ surface }/${ fill }/filled.tree.json`;
	}
	if ( /fill-read\.mjs/.test( r ) ) {
		return 'scripts/computed-route/lib/fill-read.mjs';
	}
	return null;
};

// What the stage did with the look, from the verdict and its proof.
export function outcomeOf( stage, proof = {} ) {
	const p = proof.cause || proof;
	const row = p.row || ( p.rows || [] )[ 0 ] || null;
	switch ( stage ) {
		case 'draft-read':
			return { kind: 'misread', value: p.inventory ?? null, reason: 'the inventory holds another value than the draft paints' };
		case 'no-node':
			return { kind: 'dropped', reason: p.why || p.reason || null };
		case 'other-block':
			return { kind: 'absorbed', into: p.drawnBy ? `${ p.drawnBy.block } ${ p.drawnBy.ref }` : p.into ?? null, reason: ( p.problems || [] )[ 0 ] || p.reason || null };
		case 'not-read-by-fill':
			return { kind: 'unread', reason: p.reason || null };
		case 'judged-equal':
			return { kind: 'judged-equal', baseline: p.baseline ?? p.reason ?? null, value: p.value ?? null };
		case 'unmapped':
			return { kind: 'dropped', reason: p.reason || null };
		case 'custom-css':
			return { kind: 'custom-css', setting: row?.attr || null, value: row?.after ?? row?.css ?? row?.declarations ?? null };
		case 'written-not-built':
			return { kind: 'written', setting: row?.attr || null, value: row?.after ?? null, reason: `the built tree holds ${ JSON.stringify( p.built ?? null ) }` };
		case 'apply-failed':
			return { kind: 'dropped', setting: row?.prop || null, reason: row?.status || null };
		case 'block-render':
			return { kind: 'written', setting: row?.attr || null, value: row?.after ?? null, ...( p.why ? { reason: p.why } : {} ) };
		case 'content':
			return { kind: 'passed-on', value: p.attributes || null };
		case 'live-only':
			return { kind: 'passed-on', reason: p.why || null };
		default:
			return { kind: 'unknown' };
	}
}

// The ledger row in the run ledger's shape (its own fields kept beside). surface, fill: the surface slug and Fill run name.
export function asRunRow( r, { surface, fill } ) {
	const p = r.proof?.cause || r.proof || {};
	const match = r.ref ? { node: r.ref, ...( r.slot ? { slot: r.slot } : {} ), property: r.key } : { key: r.draftKey };
	// The ledger's own fields that the shape renames (stage is the verdict, live the live value, key the property, slot the part).
	const { stage, live, key, slot, paintedOn, selector, box, ...own } = r;
	return {
		...own,
		draftKey: r.draftKey ?? null,
		part: r.slot || '',
		property: r.pseudo ? `${ r.pseudo } ${ r.key }` : r.key,
		state: r.state || 'rest',
		widths: r.widths,
		draft: r.draft,
		stage: PIPELINE_STAGE[ r.stage ] || null,
		outcome: outcomeOf( r.stage, r.proof ),
		record: { file: fileOf( p.record, surface, fill ), section: p.record || null, match },
		live: { selector: p.live?.selector || r.selector || null, ...( r.paintedOn ? { paintedOn: r.paintedOn } : {} ), value: r.live, ...( p.live?.box || r.box ? { box: p.live?.box || r.box } : {} ) },
		verdict: stage,
	};
}

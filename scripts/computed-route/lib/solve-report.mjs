// Writes Solve's report (FR-47-3): solve-report.json (everything) and solve-report.md (counts per class, every write
// with its before and after values, every token snap, wrong writes, and each surviving row with its class).
import fs from 'fs';
import path from 'path';
import { openRows } from './solve-rows.mjs';
// The counted row kinds and the issue key are shared with lib/sweep.mjs and lib/triage.mjs: wholePage's count, a
// surface's sweep count and its triage count are the same number, so all three read one definition (C0.5).
import { isIssue, issueKey } from './issue-classes.mjs';

const cell = ( v ) => String( typeof v === 'object' && null !== v ? JSON.stringify( v ) : v ?? '' ).replace( /\|/g, '\\|' ).replace( /\n/g, ' ' ).slice( 0, 160 );

// The whole page in distinct issues (a style, hover, box, text, presence or link-coverage difference on one element and property, whatever the width
// or state), before and after: closed, new, still open and labelled a gap by Solve (Hardcode or Missing setting: a gap
// counts as handled only once proven outside the tool), and still open with no label.
export function wholePage( before, after, classes, prefix = null ) {
	// A surface sharing its walker with another (a page and the form post it embeds) is judged on its own blocks' rows
	// and the rows that carry no block.
	const mine = ( x ) => ! prefix || ! x.ref || ( x.ref.startsWith( prefix ) && /^\d+$/.test( x.ref.slice( prefix.length ) ) );
	const set = ( rep ) => new Set( openRows( rep ).filter( ( x ) => isIssue( x ) && mine( x ) ).map( issueKey ) );
	const b = set( before );
	const a = set( after );
	const labelled = new Set( [ ...( classes?.hardcode || [] ), ...( classes?.missing || [] ) ].map( issueKey ) );
	const open = [ ...a ];
	return {
		before: b.size,
		after: a.size,
		closed: [ ...b ].filter( ( k ) => ! a.has( k ) ).length,
		new: open.filter( ( k ) => ! b.has( k ) ).length,
		labelledGap: open.filter( ( k ) => labelled.has( k ) ).length,
		unexplained: open.filter( ( k ) => ! labelled.has( k ) ).length,
	};
}

export function writeSolveReport( outDir, r ) {
	const page = wholePage( r.before, r.after, r.classes, `cr-ref-${ r.surface }-` );
	const handover = r.handover || [];
	const content = ( fate ) => r.classes.other.filter( ( x ) => fate === x.contentClass ).length;
	fs.writeFileSync( path.join( outDir, 'solve-report.json' ), JSON.stringify( { ...r, handover, before: undefined, after: undefined, openBefore: openRows( r.before ).length, openAfter: openRows( r.after ).length, wholePage: page }, null, 1 ) );
	const L = [ `# Solve: ${ r.surface }`, '',
		`Refs added: ${ r.refsAdded }. Write rounds: ${ r.rounds }${ r.roundThreeWrote ? ' (round 3 still wrote: a kill condition)' : '' }. Open rows before: ${ openRows( r.before ).length }, after: ${ openRows( r.after ).length }. Intended (accepted): ${ r.intended }.`, '',
		`**Whole page (distinct style, hover, box, text, presence and link-coverage issues, any width or state):** ${ page.before } before, ${ page.after } after: ${ page.closed } closed, ${ page.new } new; of those open, ${ page.labelledGap } labelled a gap by Solve (to prove) and ${ page.unexplained } with no label.`, '',
		'| Class | Rows |', '|---|---|',
		`| Hardcode (setting holds the draft value, paint still differs) | ${ r.classes.hardcode.length } |`,
		`| Missing setting (no setting paints it) | ${ r.classes.missing.length } |`,
		`| Unresolved | ${ r.classes.unresolved.length } |`,
		`| Derived box rows (not written) | ${ r.classes.derived.length } |`,
		`| Other kinds (reported, never written) | ${ r.classes.other.length } |`,
		`| of which from an unmapped walker state (reported, never written) | ${ r.unmappedState ?? 0 } |`,
		`| Content rows (text, presence, link) written, still differing | ${ content( 'written' ) } |`,
		`| Content rows with no setting that could hold them (Missing setting) | ${ content( 'missing' ) } |`,
		`| Content rows unresolved | ${ content( 'unresolved' ) } |`,
		`| Handover (content outside the tree, or behaviour the walker cannot drive) | ${ handover.length } |`,
		`| Wrong writes | ${ r.wrong.length } of ${ r.writes.length }${ r.wrongSettings ? ` (settings ${ r.wrongSettings.wrong } of ${ r.wrongSettings.total })` : '' } |`, '',
		'## Handover', '', ...( handover.length ? [ '| Owner | Pair | Kind | Key | Draft | Live | Widths |', '|---|---|---|---|---|---|---|', ...handover.map( ( h ) => `| ${ h.owner } | ${ h.row.pair } | ${ h.row.kind } | ${ cell( h.row.key ) } | ${ cell( h.row.draft ) } | ${ cell( h.row.live ) } | ${ h.widths.join( ', ' ) } |` ) ] : [ 'None.' ] ), '',
		'## Writes', '', '| Round | Node | Block | Element | Property | Setting | Before | After |', '|---|---|---|---|---|---|---|---|',
		...r.writes.map( ( w ) => `| ${ w.round } | ${ w.ref } | ${ w.block } | \`${ w.path }\` | ${ w.prop }${ w.state ? ':' + w.state : '' } | ${ w.attr } | ${ cell( w.before ) } | ${ cell( w.after ) } |` ), '',
		'## Wrong writes', '', ...( r.wrong.length ? r.wrong.map( ( w ) => `- round ${ w.round } ${ w.ref } ${ w.block } ${ w.attr } = ${ cell( w.after ) }${ w.reverted ? ' (reverted: ' + cell( w.revertReason ) + ')' : '' }` ) : [ 'None.' ] ), '',
		'## Token snaps', '', '| Where | From | To | Distance | Kind |', '|---|---|---|---|---|',
		...r.snaps.map( ( s ) => `| ${ s.where } | ${ s.from } | ${ s.to } | ${ s.distance ?? '' } | ${ s.kind } |` ), '' ];
	const section = ( title, rows, withReason ) => {
		L.push( `## ${ title }`, '' );
		if ( ! rows.length ) {
			L.push( 'None.', '' );
			return;
		}
		L.push( `| Width | Pair | Node | Element | Kind | Key | Draft | Live |${ withReason ? ' Reason |' : '' }`, `|---|---|---|---|---|---|---|---|${ withReason ? '---|' : '' }` );
		rows.forEach( ( x ) => L.push( `| ${ x.width } | ${ x.pair } | ${ x.ref || '' } | \`${ x.path ?? '' }\` | ${ x.kind } | ${ x.key } | ${ cell( x.draft ) }${ x.decided && ! x.decided.rule ? ' (decided ' + x.decided.id + ')' : '' } | ${ cell( x.live ) } |${ withReason ? ' ' + cell( x.reason ) + ' |' : '' }` ) );
		L.push( '' );
	};
	section( 'Hardcode', r.classes.hardcode, true );
	section( 'Missing setting', r.classes.missing, true );
	section( 'Unresolved', r.classes.unresolved, true );
	section( 'Derived box rows', r.classes.derived, false );
	fs.writeFileSync( path.join( outDir, 'solve-report.md' ), L.join( '\n' ) );
}

// One chain output row (the input lib/gaps-file.mjs::gapRow reads) from one Solve issue and its chain result. Every field comes
// from the row's own data: a value the data lacks is null, never filled in. `ctx` is gate-chain.mjs::buildContext's result.
import { gapClassOf } from './gap-classes.mjs';

const read = ( v ) => ( undefined === v ? null : v );

// The setting a row names: the one a failing instrument gate judged in the chain result (G3 or G4, an I-class row), else
// the single candidate setting G3 listed, else null (none listed, or several with nothing to choose between them).
function attributeOf( res ) {
	if ( [ 'G3', 'G4' ].includes( res.gate ) && String( res.class ).startsWith( 'I-' ) ) {
		return res.setting?.attr ?? null;
	}
	return 1 === res.settings?.length ? res.settings[ 0 ].attr : null;
}

// A row names its draft element by `draftId`, else by its pair: the walker pairs elements by draft identity and the pair key is the
// only draft identity a Solve row carries.
// issue: { key, solveClass, rows }; row: the issue's first row; res: runChain's result.
export function gapInput( { issue, row, res }, ctx ) {
	// A class outside FR-48-65 (G7's `closed` apart) is a chain defect, never defaulted.
	'closed' === res.class || null === res.class || gapClassOf( res.class );
	return {
		key: issue.key, solveClass: issue.solveClass, ref: row.ref ?? null, pair: row.pair, property: row.key,
		widths: [ ...new Set( issue.rows.map( ( x ) => x.width ) ) ], draftId: read( row.draftId ?? row.pair ), state: read( ctx.stateOf( row ) ),
		declared: read( ctx.declaredOf( row ) ), renderedDraft: read( row.draft ), renderedLive: read( row.live ),
		block: ctx.blockOf( row ), attribute: attributeOf( res ), ...res,
	};
}

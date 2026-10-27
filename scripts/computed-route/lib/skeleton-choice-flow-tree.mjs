// The choice flow's nodes and rows (Spec 48 FR-48-6, rules.choiceFlow; Spec 43): lib/skeleton-choice-flow.mjs reads what the
// flow holds from the fact record; this file turns it into the inner blocks of the `sgs/choice-flow` node and settles the rows
// of the draft elements the flow absorbed. Each step is an `sgs/form-step` (FR-43-1) holding the panel's fields, then its
// `sgs/choice-flow-question` or `sgs/choice-flow-result`. A question whose container renders in the inventory reads the
// draft there (its draftRef); a step the page never showed has none, as a later form step has none (lib/skeleton-form-steps.mjs).
// The words the flow holds no setting for (the model's canvas groups) are top-level blocks of the flow post before or after
// the `sgs/choice-flow` block, built by the writer's ordinary rules.
//
// Rows: an absorbed element inside a covered piece names that piece; an element whose words are a covered piece's shown again
// (the summary's help note where the summary collapses) names it too; any other element with words or a control is a gap row
// (action `unresolved`, the missing-features list's input, FR-48-34) and its descendants stay absorbed inside it; an element
// with neither (a wrapper, a progress line) stays absorbed into the flow, which draws its own frame.
const CONTROL = new Set( [ 'a', 'button', 'input', 'select', 'textarea', 'sc-raw-select' ] );
const flat = ( s ) => String( s ?? '' ).replace( /\s+/g, '' );

// The first rendered inventory element of each record key.
function renderedByKey( m, view ) {
	const rendered = new Map();
	m.els.forEach( ( e ) => {
		const k = view.entry( e )?.template.key;
		k && ! rendered.has( k ) && rendered.set( k, e );
	} );
	return rendered;
}

// The flow post's own blocks beside the flow (model.canvas, Spec 48 R-47-12): each group the flow does not draw is built by
// the ordinary rules (`build`, the writer's buildNode at the top level) in place of the rows the flow absorbed for it, which
// keep their place in the row book. o: { model, m, view, rows, rowOf, build }. Returns { before: [nodes], after: [nodes] }.
export function canvasSiblings( { model, m, view, rows, rowOf, build } ) {
	const out = { before: [], after: [] };
	const rendered = renderedByKey( m, view );
	for ( const c of model.canvas || [] ) {
		const e = rendered.get( c.key );
		if ( ! e ) {
			continue;
		}
		const under = ( x ) => {
			for ( let p = x; p; p = m.byKey[ p.parentKey ] ) {
				if ( p === e ) {
					return true;
				}
			}
			return false;
		};
		const mine = new Set( m.els.filter( under ).map( ( x ) => x.key ) );
		const at = rows.findIndex( ( r ) => mine.has( r.key ) );
		for ( let i = rows.length - 1; i >= 0; i-- ) {
			mine.has( rows[ i ].key ) && rows.splice( i, 1 );
		}
		mine.forEach( ( k ) => delete rowOf[ k ] );
		const start = rows.length;
		const made = [].concat( build( e ) || [] ).filter( Boolean );
		rows.splice( at < 0 ? rows.length : at, 0, ...rows.splice( start ) );
		out[ c.at ].push( ...made );
	}
	rows.forEach( ( r, i ) => ( r.order = i ) );
	return out;
}

// o: { model, R (rules.choiceFlow), m, view, finder (the element's draftRef) }. Returns the flow node's inner blocks.
export function flowNodes( { model, R, m, view, finder } ) {
	const rendered = renderedByKey( m, view );
	return model.steps.map( ( s ) => {
		const at = s.question ? rendered.get( s.key ) : null;
		const inner = [
			...s.fields.map( ( f ) => ( { name: f.block, attributes: f.label ? { label: f.label } : {}, innerBlocks: [] } ) ),
			...( s.question ? [ { name: R.question, attributes: s.question, ...( at ? { draftRef: finder( at ), draftFingerprint: m.fingerprint( at ) } : {} ), innerBlocks: [] } ] : [] ),
			...( s.result ? [ { name: R.result, attributes: s.result, innerBlocks: [] } ] : [] ),
		];
		return { name: R.step, attributes: { label: s.label }, innerBlocks: inner };
	} );
}

// Settles the rows absorbed into the flow root (rule choiceFlow). o: { model, R, rows, root (the root element), block, m, view }.
// Returns the gap rows' keys.
export function settleFlowRows( { model, R, rows, root, block, m, view } ) {
	const gaps = new Set();
	const copied = new Map();
	const above = ( e, book ) => {
		for ( let p = m.byKey[ e.parentKey ]; p && p !== root; p = m.byKey[ p.parentKey ] ) {
			if ( book.has( p.key ) ) {
				return p.key;
			}
		}
		return null;
	};
	const gapAbove = ( e ) => above( e, gaps );
	for ( const row of rows.filter( ( r ) => r.into === root.key && 'choiceFlow' === r.rule ) ) {
		const e = m.byKey[ row.key ];
		const why = model.covered.get( view.entry( e )?.template.key );
		// An element showing a covered piece's words again, or one inside such an element, is that piece.
		const copy = ! why && ( copied.get( above( e, copied ) ) || model.copies.find( ( c ) => c.words && c.words === flat( e.allText ?? m.words( e ) ) ) );
		copy && copied.set( row.key, copy );
		const inside = ! why && ! copy ? gapAbove( e ) : null;
		if ( why || copy ) {
			row.reason = `drawn by ${ block }: ${ why || copy.reason }`;
		} else if ( inside ) {
			row.reason = `inside the gap row ${ inside }`;
		} else if ( m.words( e ) || CONTROL.has( view.realTag( e ) ) ) {
			Object.assign( row, { action: 'unresolved', block: null, reason: R.gapReason } );
			delete row.into;
			gaps.add( row.key );
		}
	}
	return [ ...gaps ];
}

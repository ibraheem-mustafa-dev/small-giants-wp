// The shop filter panel, probed and judged (Spec 47 FR-47-7; register N25).
//
// `sgs-shop-filters-accordion.js::build` wraps every `.sgs-shop-filters__group-heading` and the blocks after it in a
// `<details class="sgs-shop-filters__group">`, and rebuilds them on `sgs-shop-filters:rebuilt` after WooCommerce
// redraws the region. N25's fault: a rebuild leaves the old group wrappers behind as empty shells, so the panel shows
// a duplicate heading and an empty section under each section. The register's own test is: choose a filter, clear it,
// and the group count must equal the heading count.
//
// probeFiltersInPage runs in the page (self-contained, no imports); evaluateFilterProbe is pure.
export const GROUP_SELECTOR = '.sgs-shop-filters__group';
export const HEADING_SELECTOR = '.sgs-shop-filters__group-heading';
export const CHIP_SELECTOR = '.wc-block-product-filter-chips__item';
export const TOGGLE_SELECTOR = '.sgs-shop-filters__toggle';
export const CLEAR_ALL_SELECTOR = '.sgs-shop-filters__clear-all';

export function probeFiltersInPage( [ groupSel, headingSel, chipSel ] ) {
	const norm = ( s ) => ( s || '' ).replace( /\s+/g, ' ' ).trim();
	const groups = [ ...document.querySelectorAll( groupSel ) ];
	const labelOf = ( g ) => {
		const h = g.querySelector( headingSel );
		if ( ! h ) {
			return '';
		}
		const clone = h.cloneNode( true );
		clone.querySelectorAll( '.sgs-shop-filters__group-count' ).forEach( ( c ) => c.remove() );
		return norm( clone.textContent );
	};
	// The summary is the heading row; an empty shell has nothing in it but that row (or nothing at all).
	const hasContent = ( g ) => {
		const body = g.cloneNode( true );
		body.querySelectorAll( 'summary' ).forEach( ( s ) => s.remove() );
		body.querySelectorAll( headingSel ).forEach( ( s ) => s.remove() );
		return !! body.querySelector( 'button, input, a[href], li, label, [role="checkbox"], [role="radio"], [role="button"]' ) || norm( body.textContent ) !== '';
	};
	return {
		groups: groups.length,
		headings: document.querySelectorAll( headingSel ).length,
		labels: groups.map( labelOf ),
		emptyShells: groups.map( ( g, i ) => ( hasContent( g ) ? null : i ) ).filter( ( i ) => i !== null ),
		chosen: document.querySelectorAll( chipSel + '[aria-checked="true"]' ).length,
	};
}

export function probeFilters( page ) {
	return page.evaluate( probeFiltersInPage, [ GROUP_SELECTOR, HEADING_SELECTOR, CHIP_SELECTOR ] );
}

export const FILTER_SIGNALS = Object.freeze( {
	EMPTY_SHELLS: 'empty-shell-groups',
	DUPLICATES: 'duplicate-group-labels',
	NOT_RESTORED: 'baseline-not-restored',
} );

export function groupsHeadingsSignal( probe ) {
	return `groups!=headings (${ probe.groups } vs ${ probe.headings })`;
}

// The register's test, plus the three things the bug produces. `baseline` is the panel before any filter was chosen,
// `after` the panel once the filter was cleared again. Returns every problem found; the first is the headline signal.
export function evaluateFilterProbe( baseline, after ) {
	const problems = [];
	if ( after.groups !== after.headings ) {
		problems.push( { signal: groupsHeadingsSignal( after ), detail: `${ after.groups } group wrapper(s) but ${ after.headings } heading(s) after clearing` } );
	}
	if ( after.emptyShells.length ) {
		problems.push( { signal: FILTER_SIGNALS.EMPTY_SHELLS, detail: `${ after.emptyShells.length } group(s) hold nothing but their heading row (positions ${ after.emptyShells.join( ', ' ) })` } );
	}
	const dupes = [ ...new Set( after.labels.filter( ( l ) => l && after.labels.filter( ( x ) => x === l ).length > 1 ) ) ];
	if ( dupes.length ) {
		problems.push( { signal: FILTER_SIGNALS.DUPLICATES, detail: `duplicate group label(s): ${ dupes.join( ', ' ) }` } );
	}
	if ( ! problems.length && ( after.groups !== baseline.groups || after.labels.join( '|' ) !== baseline.labels.join( '|' ) || after.chosen !== 0 ) ) {
		problems.push( { signal: FILTER_SIGNALS.NOT_RESTORED, detail: `before: ${ baseline.groups } group(s) [${ baseline.labels.join( ', ' ) }]; after clearing: ${ after.groups } [${ after.labels.join( ', ' ) }], ${ after.chosen } filter(s) still chosen` } );
	}
	return { ok: problems.length === 0, problems, signal: problems.length ? problems[ 0 ].signal : null };
}

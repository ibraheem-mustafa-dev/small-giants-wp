// The product flow links (Spec 48 FR-48-55, Spec 43 FR-43-25): a page-map `product` row naming the choice flow its
// page opens (`opens`, lib/intake-pagemap-flow-openers.mjs) links every product that row covers to that flow by
// the product meta `_sgs_choice_flow` (the flow's slug), which makes the buybox open the flow
// (plugins/sgs-blocks/includes/buybox-linked-flow.php). A `live` product row covers every published product (they all
// use the one single-product template); a `static` row's items are content written into the page, so it covers none.
// The run changes only what it would make: a product holding another flow's slug (a person's choice) is reported and
// left, a calibration reference product (`_sgs_cr_fixture`, lib/provision-product.mjs) keeps the framework's own buybox
// the calibration reads, and a flow slug that resolves to no published flow stops the run before any write.
export const FLOW_META = '_sgs_choice_flow';
const SLUG = /^[a-z0-9-]+$/;

// The flow a row links: the one flow its page opens (`opens`, kind flow); null when it opens none or several (a product
// links one flow, and the page map holds a gap row for a page opening two).
export function flowOf( row ) {
	const flows = ( row?.opens || [] ).filter( ( o ) => 'flow' === o.kind );
	return 1 === flows.length ? flows[ 0 ].slug : null;
}

// The product rows that link a flow, and the problems that stop the run (a flow slug no flow row of the map holds, two
// live rows naming different flows).
export function flowLinkRows( rows ) {
	const linking = rows.filter( ( r ) => 'product' === r.postType && flowOf( r ) );
	const flows = new Set( rows.filter( ( r ) => 'sgs_choice_flow' === r.postType ).map( ( r ) => r.slug ) );
	const problems = linking.filter( ( r ) => ! SLUG.test( flowOf( r ) ) || ! flows.has( flowOf( r ) ) )
		.map( ( r ) => `product row "${ r.slug }" opens flow "${ flowOf( r ) }", which no sgs_choice_flow row of the page map holds` );
	const live = [ ...new Set( linking.filter( ( r ) => 'live' === r.collection ).map( ( r ) => flowOf( r ) ) ) ];
	if ( live.length > 1 ) {
		problems.push( `the live product rows open different flows (${ live.join( ', ' ) }) and every product uses one single-product template` );
	}
	return { linking, problems };
}

// The PHP that reads what the plan needs: every published product's id, title and current flow link, and the
// published flow post each slug resolves to through the resolver the buybox uses.
export function flowStatePhp( slugs ) {
	const list = Buffer.from( JSON.stringify( slugs.filter( ( s ) => SLUG.test( s ) ) ) ).toString( 'base64' );
	return `$slugs = json_decode( base64_decode( '${ list }' ), true );
$flows = array();
foreach ( $slugs as $slug ) {
	$post = class_exists( '\\SGS\\Blocks\\Sgs_Block_CPTs' ) ? \\SGS\\Blocks\\Sgs_Block_CPTs::resolve_choice_flow( $slug ) : null;
	$flows[ $slug ] = ( $post && 'publish' === $post->post_status ) ? (int) $post->ID : null;
}
$products = array();
foreach ( post_type_exists( 'product' ) ? get_posts( array( 'post_type' => 'product', 'post_status' => 'publish', 'numberposts' => -1, 'orderby' => 'ID', 'order' => 'ASC', 'suppress_filters' => true ) ) : array() as $p ) {
	$products[] = array( 'id' => (int) $p->ID, 'title' => $p->post_title, 'flow' => (string) get_post_meta( $p->ID, '${ FLOW_META }', true ), 'calibration' => '' !== (string) get_post_meta( $p->ID, '_sgs_cr_fixture', true ) );
}
echo wp_json_encode( array( 'flows' => $flows, 'products' => $products ) );`;
}

const parseJson = ( text, what ) => {
	const s = String( text );
	const start = s.indexOf( '{' );
	if ( start < 0 ) {
		throw new Error( `${ what } printed no JSON: ${ s.slice( 0, 300 ) }` );
	}
	return JSON.parse( s.slice( start ) );
};

export const readFlowState = ( runPhp, slugs ) => parseJson( runPhp( flowStatePhp( slugs ) ), 'the flow-link read' );

// The plan: { actions: [{ id, title, from, to, say }], notes, problems }. `state` is readFlowState's answer. With
// `pending` (a whole site build's dry run, whose posts phase makes the flow posts) a flow the site lacks is a note.
export function planFlowLinks( rows, state, { pending = false } = {} ) {
	const { linking, problems } = flowLinkRows( rows );
	const notes = [];
	const actions = [];
	for ( const row of linking ) {
		if ( 'live' !== row.collection ) {
			notes.push( `product row "${ row.slug }" is static (its items are content written into the page), so it links no WordPress product` );
			continue;
		}
		if ( ! state.flows?.[ flowOf( row ) ] ) {
			( pending ? notes : problems ).push( `flow "${ flowOf( row ) }" is no published sgs_choice_flow post on the site; run the site build for its row first` );
			continue;
		}
		if ( ! state.products?.length ) {
			notes.push( `the site has no published product for product row "${ row.slug }" to link` );
		}
		for ( const p of state.products || [] ) {
			if ( p.calibration ) {
				notes.push( `product ${ p.id } "${ p.title }" is the calibration reference product, left on the framework's own buybox` );
				continue;
			}
			if ( p.flow === flowOf( row ) ) {
				continue;
			}
			if ( p.flow ) {
				notes.push( `product ${ p.id } "${ p.title }" links flow "${ p.flow }", left as it is (the page map's product row opens "${ flowOf( row ) }")` );
				continue;
			}
			actions.push( { id: p.id, title: p.title, from: '', to: flowOf( row ), say: `product ${ p.id } "${ p.title }": ${ FLOW_META } (unset) -> ${ flowOf( row ) } (flow post ${ state.flows[ flowOf( row ) ] })` } );
		}
	}
	return { actions, notes, problems };
}

// The PHP that sets each planned link and reads every product back: { set: n, wrong: [{ id, flow }] }.
export function flowApplyPhp( actions ) {
	const list = Buffer.from( JSON.stringify( actions.filter( ( a ) => Number.isInteger( a.id ) && SLUG.test( a.to ) ).map( ( a ) => [ a.id, a.to ] ) ) ).toString( 'base64' );
	return `$links = json_decode( base64_decode( '${ list }' ), true );
$set = 0;
$wrong = array();
foreach ( $links as $link ) {
	if ( 'product' !== get_post_type( (int) $link[0] ) ) {
		$wrong[] = array( 'id' => (int) $link[0], 'flow' => 'not a product' );
		continue;
	}
	update_post_meta( (int) $link[0], '${ FLOW_META }', $link[1] );
	$now = (string) get_post_meta( (int) $link[0], '${ FLOW_META }', true );
	if ( $now === $link[1] ) {
		$set++;
	} else {
		$wrong[] = array( 'id' => (int) $link[0], 'flow' => $now );
	}
}
echo wp_json_encode( array( 'set' => $set, 'wrong' => $wrong ) );`;
}

// Runs the step: prints the plan, and with `apply` writes it and checks a fresh read plans nothing. Returns the exit
// code (0 done, 1 stopped or a read-back mismatch). The page map is only read.
export function runFlowLinks( { rows, runPhp, apply, pending = false, log = console.log, error = console.error } ) {
	const slugs = [ ...new Set( flowLinkRows( rows ).linking.map( ( r ) => flowOf( r ) ) ) ];
	if ( ! slugs.length ) {
		log( 'flow links: no product row of the page map opens a choice flow; nothing to link' );
		return 0;
	}
	const plan = planFlowLinks( rows, readFlowState( runPhp, slugs ), { pending: pending && ! apply } );
	plan.notes.forEach( ( n ) => log( `note: ${ n }` ) );
	if ( plan.problems.length ) {
		plan.problems.forEach( ( p ) => error( `STOP ${ p }` ) );
		error( `FAILED: ${ plan.problems.length } problem(s); nothing was written` );
		return 1;
	}
	log( 'flow links:' );
	plan.actions.forEach( ( a ) => log( `  ${ a.say }` ) );
	if ( ! apply ) {
		log( `${ plan.actions.length } product flow link(s) to set (dry run: re-run with --apply)` );
		return 0;
	}
	const done = parseJson( runPhp( flowApplyPhp( plan.actions ) ), 'the flow-link write' );
	const again = planFlowLinks( rows, readFlowState( runPhp, slugs ) );
	if ( done.wrong.length || again.actions.length || again.problems.length ) {
		error( `FAILED: ${ done.set } set; read back wrong ${ JSON.stringify( done.wrong ) }; a fresh read still plans ${ again.actions.length }` );
		return 1;
	}
	log( `${ done.set } product flow link(s) set; a fresh read plans 0` );
	return 0;
}

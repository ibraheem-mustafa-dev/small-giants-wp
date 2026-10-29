// The product a choice flow sells (Spec 48 FR-48-55, Spec 43 FR-43-10 and FR-43-20): an `sgs_choice_flow` post opened off a
// product page has no product of its own, so its `sgs/choice-flow` root carries `flowProductId`, the WooCommerce product its
// "add to bag" result adds. The draft names that product in the code the flow's result runs: the `id` of the basket call
// (`M.cart.add({ key: …, id: 'zookies', … })`) in the script of the component that draws the flow's surface. That id is a
// catalogue product's draft id (lib/catalogue-records.mjs), and the product on the site is the one with the catalogue's SKU.
// A flow whose script adds no catalogue product, or adds several, keeps `flowProductId` 0 and is named in a note: no product is
// guessed. The step runs after the catalogue step has made the products; a product the site lacks is a note, never an error.
import fs from 'node:fs';
import path from 'node:path';

const SLUG = /^[a-z0-9-]+$/;
const SKU = /^[\w.-]+$/;

// The draft ids of the products a script's basket calls add: every `.add({ … id: '<literal>' … })` object's first `id` string.
export function addedIds( script ) {
	return [ ...new Set( [ ...String( script || '' ).matchAll( /\.add\(\s*\{[^}]*?\bid\s*:\s*(['"])([\w-]+)\1/g ) ].map( ( m ) => m[ 2 ] ) ) ];
}

// The plan: { actions: [{ slug, postId, productId, draftId, say }], notes }. flows: the page map's `sgs_choice_flow` rows;
// surfaces: the fact record's surfaces (`dc` names the component drawing each); scriptOf( dc ): that component's script text;
// catalogue: catalogue.json; state: readState's answer ({ flows: { slug: { id, current } }, products: { sku: id | null } }).
export function planFlowProducts( { rows, surfaces, scriptOf, catalogue, state } ) {
	const notes = [];
	const actions = [];
	const products = new Map( ( catalogue?.products || [] ).map( ( p ) => [ p.draftId, p ] ) );
	for ( const row of rows.filter( ( r ) => 'sgs_choice_flow' === r.postType ) ) {
		const surface = surfaces?.[ /(S-\d+)$/.exec( String( row.draftId || '' ) )?.[ 1 ] ];
		if ( ! surface?.dc ) {
			notes.push( `flow "${ row.slug }" names no draft surface, so the product it sells is unread` );
			continue;
		}
		const sold = addedIds( scriptOf( surface.dc ) ).filter( ( id ) => products.has( id ) );
		if ( 1 !== sold.length ) {
			notes.push( `flow "${ row.slug }": the ${ surface.dc } script adds ${ sold.length ? `${ sold.length } catalogue products (${ sold.join( ', ' ) })` : 'no catalogue product' }, so its flowProductId stays 0` );
			continue;
		}
		const product = products.get( sold[ 0 ] );
		const have = state.flows?.[ row.slug ];
		const productId = state.products?.[ product.sku ];
		if ( ! have?.id ) {
			notes.push( `flow "${ row.slug }" is no published sgs_choice_flow post on the site; run the site build for its row first` );
		} else if ( ! productId ) {
			notes.push( `flow "${ row.slug }" sells "${ product.name }" (SKU ${ product.sku }), which the site does not hold yet; run the catalogue step first` );
		} else if ( have.current !== productId ) {
			actions.push( { slug: row.slug, postId: have.id, productId, draftId: product.draftId, say: `flow "${ row.slug }" (post ${ have.id }): flowProductId ${ have.current } -> ${ productId } ("${ product.name }")` } );
		}
	}
	return { actions, notes };
}

// The PHP that reads each flow post's root `flowProductId` and the id of each SKU's product.
export function flowProductStatePhp( slugs, skus ) {
	const b64 = ( v ) => Buffer.from( JSON.stringify( v ) ).toString( 'base64' );
	return `$slugs = json_decode( base64_decode( '${ b64( slugs.filter( ( s ) => SLUG.test( s ) ) ) }' ), true );
$skus = json_decode( base64_decode( '${ b64( skus.filter( ( s ) => SKU.test( s ) ) ) }' ), true );
$find = function ( $blocks ) use ( &$find ) {
	foreach ( $blocks as $b ) {
		if ( 'sgs/choice-flow' === $b['blockName'] ) {
			return $b;
		}
		$in = $find( $b['innerBlocks'] );
		if ( $in ) {
			return $in;
		}
	}
	return null;
};
$flows = array();
foreach ( $slugs as $slug ) {
	$post = class_exists( '\\SGS\\Blocks\\Sgs_Block_CPTs' ) ? \\SGS\\Blocks\\Sgs_Block_CPTs::resolve_choice_flow( $slug ) : null;
	if ( $post && 'publish' === $post->post_status ) {
		$root = $find( parse_blocks( $post->post_content ) );
		$flows[ $slug ] = array( 'id' => (int) $post->ID, 'current' => $root ? (int) ( $root['attrs']['flowProductId'] ?? 0 ) : 0 );
	}
}
$products = array();
foreach ( $skus as $sku ) {
	$products[ $sku ] = function_exists( 'wc_get_product_id_by_sku' ) ? ( (int) wc_get_product_id_by_sku( $sku ) ?: null ) : null;
}
echo wp_json_encode( array( 'flows' => (object) $flows, 'products' => (object) $products ) );`;
}

// The PHP that sets each planned flow's root `flowProductId` and reads every flow back: { set: n, wrong: [{ id, now }] }.
export function flowProductApplyPhp( actions ) {
	const list = Buffer.from( JSON.stringify( actions.filter( ( a ) => Number.isInteger( a.postId ) && Number.isInteger( a.productId ) ).map( ( a ) => [ a.postId, a.productId ] ) ) ).toString( 'base64' );
	return `$links = json_decode( base64_decode( '${ list }' ), true );
$set = 0;
$wrong = array();
$walk = function ( &$blocks, $pid ) use ( &$walk ) {
	foreach ( $blocks as &$b ) {
		if ( 'sgs/choice-flow' === $b['blockName'] ) {
			$b['attrs']['flowProductId'] = $pid;
			return true;
		}
		if ( $walk( $b['innerBlocks'], $pid ) ) {
			return true;
		}
	}
	return false;
};
foreach ( $links as $link ) {
	$post = get_post( (int) $link[0] );
	if ( ! $post || 'sgs_choice_flow' !== $post->post_type ) {
		$wrong[] = array( 'id' => (int) $link[0], 'now' => 'not a flow' );
		continue;
	}
	$blocks = parse_blocks( $post->post_content );
	$walk( $blocks, (int) $link[1] );
	wp_update_post( array( 'ID' => $post->ID, 'post_content' => wp_slash( serialize_blocks( $blocks ) ) ) );
	$after = parse_blocks( get_post( $post->ID )->post_content );
	$check = function ( $bs ) use ( &$check ) {
		foreach ( $bs as $b ) {
			if ( 'sgs/choice-flow' === $b['blockName'] ) {
				return (int) ( $b['attrs']['flowProductId'] ?? 0 );
			}
			$in = $check( $b['innerBlocks'] );
			if ( null !== $in ) {
				return $in;
			}
		}
		return null;
	};
	$now = $check( $after );
	if ( $now === (int) $link[1] ) {
		$set++;
	} else {
		$wrong[] = array( 'id' => (int) $link[0], 'now' => $now );
	}
}
echo wp_json_encode( array( 'set' => $set, 'wrong' => $wrong ) );`;
}

const parseJson = ( text, what ) => {
	const s = String( text );
	const start = s.indexOf( '{' );
	if ( start < 0 ) {
		throw new Error( `${ what } printed no JSON: ${ s.slice( 0, 300 ) }` );
	}
	return JSON.parse( s.slice( start ) );
};

// Runs the step: prints the plan and, with `apply`, writes it and checks a fresh read plans nothing. Returns the exit code
// (0 done, 1 a read-back mismatch). The page map, the fact record, the catalogue and the draft folder are only read.
export function runFlowProducts( { repo, client, rows, runPhp, apply, log = console.log, error = console.error } ) {
	const build = path.join( repo, 'sites', client, 'build' );
	const read = ( file ) => ( fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null );
	const flows = rows.filter( ( r ) => 'sgs_choice_flow' === r.postType );
	const catalogue = read( path.join( build, 'catalogue.json' ) );
	const facts = read( path.join( build, 'intake', 'facts.json' ) );
	if ( ! flows.length || ! catalogue?.products?.length || ! facts ) {
		log( 'flow products: the page map has no choice flow, or the client has no catalogue or fact record; nothing to set' );
		return 0;
	}
	const scriptOf = ( dc ) => {
		const file = path.join( repo, 'sites', client, 'handoff', `${ dc }.dc.html` );
		return fs.existsSync( file ) ? fs.readFileSync( file, 'utf8' ) : null;
	};
	const skus = catalogue.products.map( ( p ) => p.sku );
	const planNow = () => planFlowProducts( { rows, surfaces: facts.surfaces, scriptOf, catalogue, state: parseJson( runPhp( flowProductStatePhp( flows.map( ( r ) => r.slug ), skus ) ), 'the flow-product read' ) } );
	const plan = planNow();
	plan.notes.forEach( ( n ) => log( `note: ${ n }` ) );
	log( 'flow products:' );
	plan.actions.forEach( ( a ) => log( `  ${ a.say }` ) );
	if ( ! apply ) {
		log( `${ plan.actions.length } flow product(s) to set (dry run: re-run with --apply)` );
		return 0;
	}
	if ( ! plan.actions.length ) {
		return 0;
	}
	const done = parseJson( runPhp( flowProductApplyPhp( plan.actions ) ), 'the flow-product write' );
	const again = planNow();
	if ( done.wrong.length || again.actions.length ) {
		error( `FAILED: ${ done.set } set; read back wrong ${ JSON.stringify( done.wrong ) }; a fresh read still plans ${ again.actions.length }` );
		return 1;
	}
	log( `${ done.set } flow product(s) set; a fresh read plans 0` );
	return 0;
}

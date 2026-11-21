// The words of a flow's opener button (Spec 43 FR-43-25, the button kit's flow opener): the buy box shows the linked choice flow's
// `openerLabel` (plugins/sgs-blocks/includes/buybox-linked-flow.php::sgs_buybox_linked_flow_label reads the flow post's root block)
// on its opener, and nothing wrote it from the draft, so a cloned opener said "Choose your options" wherever the draft's said something else. This step runs after the product flow links (site-build.mjs calls lib/site-build-flow-links.mjs::runFlowLinks, then this): for every live product
// row whose buy box opens a flow (lib/site-build-flow-scope.mjs::rowRefusal), the words of the draft's control that opens it
// (lib/part-look-controls.mjs::flowControls, found from the draft's code, never from its words) become the flow post's `openerLabel`.
// Never guessed: a flow whose rows, or whose buy box's openers, say different words writes nothing and the notes name each wording;
// a row whose opener cannot be found says why; a flow post the site lacks is a note (pending) or a problem. The page map and the
// draft are only read; the flow post is the one write, and a flow already holding the words plans nothing.
import fs from 'node:fs';
import path from 'node:path';
import { flowLinkRows } from './site-build-flow-links.mjs';
import { rowRefusal } from './site-build-flow-scope.mjs';
import { flowControls } from './part-look-controls.mjs';
import { surfaceKey } from './manifest-build.mjs';

export const LABEL_ATTR = 'openerLabel';
const SLUG = /^[a-z0-9-]+$/;

// The control finder of a client's page map: row -> lib/part-look-controls.mjs::flowControls for the surface that row's page is built
// from (the client's surfaces.json record and skeleton inventory, keyed by the row's surface key).
export function openerControlsOf( { repo, client } ) {
	const file = path.join( repo, 'sites', client, 'build', 'surfaces.json' );
	const manifest = fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : {};
	return ( row ) => {
		const surface = surfaceKey( row );
		return manifest[ surface ] ? flowControls( { repo, client, entry: manifest[ surface ], surface, template: row.template } ) : { openers: [], adds: [], why: `surfaces.json holds no ${ surface } surface` };
	};
}

// The words each flow's opener should hold, from the page map's rows: { flows: [ { slug, label, rows } ], notes }. `controlsOf( row )` is
// the control finder ({ openers: [ { label } ], why }). A flow whose rows say different words, or a row whose opener says several, gets
// no label (`label: null`) and a note naming the wordings.
export function labelsPlan( rows, controlsOf ) {
	const notes = [];
	const byFlow = new Map();
	for ( const row of flowLinkRows( rows ).linking.filter( ( r ) => 'live' === r.collection && ! rowRefusal( r ) ) ) {
		const controls = controlsOf( row );
		const words = [ ...new Set( ( controls.openers || [] ).map( ( o ) => o.label ).filter( Boolean ) ) ];
		const entry = byFlow.get( row.opensFlow ) || { slug: row.opensFlow, said: [], rows: [] };
		byFlow.set( row.opensFlow, entry );
		entry.rows.push( row.slug );
		if ( ! words.length ) {
			notes.push( `product row "${ row.slug }": no opener words read for flow "${ row.opensFlow }" (${ controls.why || 'the opener holds no text' })` );
			continue;
		}
		if ( words.length > 1 ) {
			notes.push( `product row "${ row.slug }": its buy box has openers for flow "${ row.opensFlow }" that say different words (${ words.map( ( w ) => JSON.stringify( w ) ).join( ', ' ) }), so no openerLabel is written` );
			entry.said.push( ...words, null );
			continue;
		}
		entry.said.push( words[ 0 ] );
	}
	const flows = [ ...byFlow.values() ].map( ( e ) => {
		const distinct = [ ...new Set( e.said.filter( ( w ) => null !== w ) ) ];
		const conflict = e.said.includes( null ) || distinct.length > 1;
		distinct.length > 1 && notes.push( `flow "${ e.slug }": its product rows (${ e.rows.join( ', ' ) }) say different opener words (${ distinct.map( ( w ) => JSON.stringify( w ) ).join( ', ' ) }), so no openerLabel is written` );
		return { slug: e.slug, rows: e.rows, label: conflict || 1 !== distinct.length ? null : distinct[ 0 ] };
	} );
	return { flows, notes };
}

// The PHP that reads each flow post's current `openerLabel`: { slug: { id, label } | null }.
export function labelStatePhp( slugs ) {
	const list = Buffer.from( JSON.stringify( slugs.filter( ( s ) => SLUG.test( s ) ) ) ).toString( 'base64' );
	return `$slugs = json_decode( base64_decode( '${ list }' ), true );
$out = array();
foreach ( $slugs as $slug ) {
	$post = class_exists( '\\SGS\\Blocks\\Sgs_Block_CPTs' ) ? \\SGS\\Blocks\\Sgs_Block_CPTs::resolve_choice_flow( $slug ) : null;
	if ( ! $post || 'publish' !== $post->post_status ) {
		$out[ $slug ] = null;
		continue;
	}
	$label = '';
	foreach ( parse_blocks( $post->post_content ) as $b ) {
		if ( 'sgs/choice-flow' === ( $b['blockName'] ?? '' ) ) {
			$label = (string) ( $b['attrs']['${ LABEL_ATTR }'] ?? '' );
			break;
		}
	}
	$out[ $slug ] = array( 'id' => (int) $post->ID, 'label' => $label );
}
echo wp_json_encode( $out );`;
}

// The PHP that sets each planned label on its flow post's root block and reads every one back: { set: n, wrong: [ { slug, label } ] }.
export function labelApplyPhp( actions ) {
	const list = Buffer.from( JSON.stringify( actions.filter( ( a ) => Number.isInteger( a.id ) && SLUG.test( a.slug ) ).map( ( a ) => [ a.id, a.slug, a.to ] ) ) ).toString( 'base64' );
	return `$items = json_decode( base64_decode( '${ list }' ), true );
$set = 0;
$wrong = array();
$save = static function ( int $id, string $content ): void {
	// Past the content filter (it strips markup from block attributes for a user without unfiltered_html), put back after.
	$kses = false !== has_filter( 'content_save_pre', 'wp_filter_post_kses' );
	if ( $kses ) {
		kses_remove_filters();
	}
	wp_update_post( wp_slash( array( 'ID' => $id, 'post_content' => $content ) ) );
	if ( $kses ) {
		kses_init_filters();
	}
};
foreach ( $items as $item ) {
	$post = get_post( (int) $item[0] );
	$content = $post ? (string) $post->post_content : '';
	$attrs = null;
	foreach ( parse_blocks( $content ) as $b ) {
		if ( 'sgs/choice-flow' === ( $b['blockName'] ?? '' ) ) {
			$attrs = (array) $b['attrs'];
			break;
		}
	}
	if ( null !== $attrs ) {
		$attrs['${ LABEL_ATTR }'] = (string) $item[2];
		// Only the flow's own opening tag is rewritten: every other byte of the post stays as saved.
		$new = preg_replace_callback(
			'#<!--\\s+wp:sgs/choice-flow(\\s+\\{.*?\\})?\\s+(/?)-->#s',
			static function ( $m ) use ( $attrs ) {
				return '<!-- wp:sgs/choice-flow ' . serialize_block_attributes( $attrs ) . ' ' . $m[2] . '-->';
			},
			$content,
			1
		);
		if ( is_string( $new ) && $new !== $content ) {
			$save( (int) $item[0], $new );
			clean_post_cache( (int) $item[0] );
			$back = (string) get_post_field( 'post_content', (int) $item[0], 'raw' );
			if ( ! ( $back === $new ) ) {
				// The save changed more than the tag: the old content goes back, and the flow is reported wrong below.
				$save( (int) $item[0], $content );
				clean_post_cache( (int) $item[0] );
			}
		}
	}
	$now = '';
	foreach ( parse_blocks( (string) get_post_field( 'post_content', (int) $item[0] ) ) as $b ) {
		if ( 'sgs/choice-flow' === ( $b['blockName'] ?? '' ) ) {
			$now = (string) ( $b['attrs']['${ LABEL_ATTR }'] ?? '' );
			break;
		}
	}
	if ( $now === (string) $item[2] ) {
		$set++;
	} else {
		$wrong[] = array( 'slug' => $item[1], 'label' => $now );
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

// The actions: { actions: [ { slug, id, from, to, say } ], notes, problems } from the plan and the posts' current labels. With `pending`
// (a dry run before the flow posts are built) a flow post the site lacks is a note.
export function planLabels( plan, state, { pending = false } = {} ) {
	const notes = [ ...plan.notes ];
	const problems = [];
	const actions = [];
	for ( const flow of plan.flows ) {
		if ( null === flow.label ) {
			continue;
		}
		const now = state[ flow.slug ];
		if ( ! now ) {
			( pending ? notes : problems ).push( `flow "${ flow.slug }" is no published sgs_choice_flow post on the site, so its opener words are not written` );
			continue;
		}
		if ( now.label === flow.label ) {
			continue;
		}
		actions.push( { slug: flow.slug, id: now.id, from: now.label, to: flow.label, say: `flow "${ flow.slug }" (post ${ now.id }): ${ LABEL_ATTR } ${ JSON.stringify( now.label ) } -> ${ JSON.stringify( flow.label ) } (the draft's opener in ${ flow.rows.join( ', ' ) } says it)` } );
	}
	return { actions, notes, problems };
}

// Runs the step: prints the plan and, with `apply`, writes it and reads every label back. Returns the exit code (0 done or nothing to
// do, 1 a problem or a read-back mismatch). `controlsOf`: the control finder (labelsPlan).
export function runOpenerLabels( { rows, controlsOf, runPhp, apply, pending = false, log = console.log, error = console.error } ) {
	const plan = labelsPlan( rows, controlsOf );
	const slugs = plan.flows.filter( ( f ) => null !== f.label ).map( ( f ) => f.slug );
	const state = slugs.length ? parseJson( runPhp( labelStatePhp( slugs ) ), 'the opener label read' ) : {};
	const result = planLabels( plan, state, { pending: pending && ! apply } );
	result.notes.forEach( ( n ) => log( `note: ${ n }` ) );
	if ( result.problems.length ) {
		result.problems.forEach( ( p ) => error( `STOP ${ p }` ) );
		error( `FAILED: ${ result.problems.length } problem(s); no opener label was written` );
		return 1;
	}
	if ( ! result.actions.length ) {
		log( 'opener labels: nothing to do' );
		return 0;
	}
	log( 'opener labels:' );
	result.actions.forEach( ( a ) => log( `  ${ a.say }` ) );
	if ( ! apply ) {
		log( `${ result.actions.length } opener label(s) to set (dry run: re-run with --apply)` );
		return 0;
	}
	const done = parseJson( runPhp( labelApplyPhp( result.actions ) ), 'the opener label write' );
	if ( done.wrong.length ) {
		error( `FAILED: ${ done.set } set; read back wrong ${ JSON.stringify( done.wrong ) }` );
		return 1;
	}
	log( `${ done.set } opener label(s) set` );
	return 0;
}

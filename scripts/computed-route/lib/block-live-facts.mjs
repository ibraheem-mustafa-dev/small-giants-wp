// The live read of the identification facts the code read leaves unknown (Spec 48 F1, plan
// `.claude/plans/2026-10-30-clone-recognition-fixes.md` step A2b). WooCommerce templates, WordPress core's image output
// and block-support wrapper attributes, and the GSAP motion modules print markup outside the repo, so the code read
// (`plugins/sgs-blocks/scripts/lib/block_identity_facts.py`) leaves those blocks' renders-tag, renders-role and
// renders-aria values `unknown`. This module holds the pure parts of the read; `tools/block-live-facts.mjs` runs it.
//
// Attribution: an instance is an element carrying the block's wrapper class (`wp-block-sgs-<name>`). Its facts are the
// tags, ARIA roles and aria-* attributes of the root and its subtree, less (a) the subtree of every element carrying the
// wrapper class of any block saved anywhere on the site (a child block carries its own rows; content a block pulls from
// another post, such as a mega-menu panel, is saved blocks too) and (b) every value a classless static block saved
// anywhere on the site prints (a paragraph's `p`, `strong`, `a`), or that literal markup saved inside a dynamic block's
// content prints, since neither has a root to cut away. Theme scripts are refused while the page loads
// (`THEME_SCRIPT`): a theme script rewriting an instance (the shop filter drawer turning a container into a dialog) is
// never the block's output, whose modules ship from the plugin build. Both cuts
// are wider than the instance needs: a part the block renders itself that is also a saved block elsewhere (a product
// card's option picker) is cut too, so the read may miss a value, never claim one that is not the block's.
// A value seen is `yes` with its site, page, width and selector; a value never seen stays unknown, because no page set
// proves every variant of a block rendered, so the read never writes `no`. Every value in the code read's vocabulary is
// recorded whatever its code state when read: the seeder (`block_identity_facts.py::live_rows`, stage 14) compares each
// with the code rows it is writing, so a value beside a code `unknown` is imported and one beside a code `no` is a gate A
// conflict, computed afresh at every seed and never stored here.

export const MARKUP_FACTS = [ 'renders-tag', 'renders-role', 'renders-aria' ];
export const WIDTHS = [ 375, 768, 1440 ];
export const EVIDENCE_CAP = 3;
// The requests the read refuses: a theme's own scripts (never a block's output).
export const THEME_SCRIPT = /\/wp-content\/themes\/[^?#]+\.m?js(?:[?#]|$)/;

// The wrapper class WordPress gives a block (`get_block_wrapper_attributes`): core blocks drop their namespace.
export const wrapperClass = ( name ) => `wp-block-${ String( name ).replace( /^core\//, '' ).replace( '/', '-' ) }`;

// The code rows of the three markup facts, from the framework DB (opened read-only by the caller):
// { block: { fact: { value: state } } }.
export function codeFacts( db ) {
	const out = {};
	const rows = db.prepare( `SELECT block_slug, fact, value, state FROM block_identity_facts WHERE source = 'code' AND fact IN ( ${ MARKUP_FACTS.map( () => '?' ).join( ', ' ) } )` ).all( ...MARKUP_FACTS );
	for ( const r of rows ) {
		( ( out[ r.block_slug ] ??= {} )[ r.fact ] ??= {} )[ r.value ] = r.state;
	}
	return out;
}

// The blocks with at least one markup value the code read left unknown: the blocks this read is for.
export const blocksToRead = ( code ) => Object.keys( code ).filter( ( b ) => MARKUP_FACTS.some( ( f ) => Object.values( code[ b ][ f ] || {} ).includes( 'unknown' ) ) ).sort();

// The PHP `wp eval-file -` runs on a mirror. Read-only: it queries posts, templates and patterns and prints JSON.
// `urls`: the pages rendered (home, posts page, the WooCommerce pages, the first products and a product category, and
// every viewable published post that holds an SGS block). `saved`: every block name saved on the site with its count.
// `unmarked`: the values every classless static block saved on the site prints, and the values of the literal markup
// saved inside a dynamic block's content (a template's hand-written HTML between a container's inner blocks: content,
// never the block's render). A static block whose saved root carries a `wp-block-` class is cut away whole in the page,
// so its markup is not counted.
export const INVENTORY_PHP = String.raw`
global $wpdb;
$out = array( 'origin' => home_url( '/' ), 'urls' => array(), 'saved' => array(), 'unmarked' => array(), 'sources' => 0 );
$add = function ( $u, $why ) use ( &$out ) {
	if ( $u && ! is_wp_error( $u ) && ! isset( $out['urls'][ $u ] ) ) { $out['urls'][ $u ] = $why; }
};
$add( home_url( '/' ), 'home' );
if ( get_option( 'page_for_posts' ) ) { $add( get_permalink( (int) get_option( 'page_for_posts' ) ), 'posts page' ); }
if ( function_exists( 'wc_get_page_id' ) ) {
	foreach ( array( 'shop', 'cart', 'checkout', 'myaccount' ) as $p ) {
		$id = wc_get_page_id( $p );
		if ( $id > 0 && 'publish' === get_post_status( $id ) ) { $add( get_permalink( $id ), 'woocommerce ' . $p ); }
	}
	foreach ( get_posts( array( 'post_type' => 'product', 'post_status' => 'publish', 'numberposts' => 3, 'orderby' => 'ID', 'order' => 'ASC', 'fields' => 'ids' ) ) as $id ) { $add( get_permalink( $id ), 'product ' . $id ); }
	$terms = get_terms( array( 'taxonomy' => 'product_cat', 'hide_empty' => true, 'number' => 1 ) );
	if ( ! is_wp_error( $terms ) && $terms ) { $add( get_term_link( $terms[0] ), 'product category' ); }
}
$sources = array();
foreach ( $wpdb->get_results( "SELECT ID, post_type, post_content FROM {$wpdb->posts} WHERE post_status = 'publish' AND post_content LIKE '%<!-- wp:sgs/%' ORDER BY ID" ) as $r ) {
	$sources[] = $r->post_content;
	if ( is_post_type_viewable( $r->post_type ) ) { $add( get_permalink( (int) $r->ID ), 'post ' . $r->ID . ' (' . $r->post_type . ')' ); }
}
foreach ( array( 'wp_template', 'wp_template_part' ) as $t ) {
	foreach ( get_block_templates( array(), $t ) as $tpl ) { if ( false !== strpos( (string) $tpl->content, '<!-- wp:sgs/' ) ) { $sources[] = $tpl->content; } }
}
foreach ( WP_Block_Patterns_Registry::get_instance()->get_all_registered() as $p ) { if ( false !== strpos( (string) $p['content'], '<!-- wp:sgs/' ) ) { $sources[] = $p['content']; } }
$out['sources'] = count( $sources );
$reg = WP_Block_Type_Registry::get_instance();
$classed = function ( $b ) use ( $reg ) {
	$t = $reg->get_registered( $b['blockName'] );
	if ( $t && $t->is_dynamic() ) { return true; }
	return (bool) preg_match( '/^\s*<[a-zA-Z][^>]*\bclass="[^"]*\bwp-block-/', (string) $b['innerHTML'] );
};
$values = function ( $html ) {
	$v = array( 'renders-tag' => array(), 'renders-role' => array(), 'renders-aria' => array() );
	preg_match_all( '/<([a-zA-Z][a-zA-Z0-9-]*)/', $html, $m );
	foreach ( $m[1] as $t ) { $v['renders-tag'][ strtolower( $t ) ] = 1; }
	preg_match_all( '/\srole="([^"]*)"/', $html, $m );
	foreach ( $m[1] as $rs ) { foreach ( preg_split( '/\s+/', trim( $rs ) ) as $r ) { if ( '' !== $r ) { $v['renders-role'][ $r ] = 1; } } }
	preg_match_all( '/\s(aria-[a-z]+)=/', $html, $m );
	foreach ( $m[1] as $a ) { $v['renders-aria'][ $a ] = 1; }
	return $v;
};
$walk = function ( $blocks ) use ( &$walk, &$out, $classed, $values, $reg ) {
	foreach ( $blocks as $b ) {
		if ( empty( $b['blockName'] ) ) { continue; }
		$out['saved'][ $b['blockName'] ] = ( $out['saved'][ $b['blockName'] ] ?? 0 ) + 1;
		$type = $reg->get_registered( $b['blockName'] );
		if ( ! $classed( $b ) || ( $type && $type->is_dynamic() ) ) {
			foreach ( $values( implode( '', array_filter( $b['innerContent'], 'is_string' ) ) ) as $f => $vs ) {
				foreach ( $vs as $val => $one ) { $out['unmarked'][ $f ][ $val ] = 1; }
			}
		}
		if ( ! empty( $b['innerBlocks'] ) ) { $walk( $b['innerBlocks'] ); }
	}
};
foreach ( $sources as $c ) { $walk( parse_blocks( $c ) ); }
ksort( $out['saved'] );
foreach ( $out['unmarked'] as $f => $vs ) { $out['unmarked'][ $f ] = array_keys( $vs ); }
$out['urls'] = (object) $out['urls'];
$out['saved'] = (object) $out['saved'];
$out['unmarked'] = (object) $out['unmarked'];
echo wp_json_encode( $out );
`;

// Runs in the page (page.evaluate): for each target block, every instance's own tags, roles and aria-* attributes, each
// value with the first selector it was seen at. `targets`: { block: { root: class, cut: [classes of blocks saved inside
// it] } }. Self-contained: the browser receives only its source.
export function readInstances( targets ) {
	const out = {};
	const pathOf = ( el, root ) => {
		const parts = [];
		for ( let n = el; n && n !== root; n = n.parentElement ) {
			const cls = [ ...( n.classList || [] ) ].find( ( c ) => /^sgs-/.test( c ) ) || '';
			parts.unshift( n.localName + ( cls ? '.' + cls : '' ) );
			if ( parts.length >= 3 ) {
				break;
			}
		}
		return parts.join( ' > ' );
	};
	for ( const [ block, t ] of Object.entries( targets ) ) {
		const roots = [ ...document.getElementsByClassName( t.root ) ];
		const cut = new Set( t.cut );
		const instances = [];
		roots.forEach( ( root, i ) => {
			const seen = { 'renders-tag': {}, 'renders-role': {}, 'renders-aria': {} };
			const note = ( fact, value, el ) => {
				if ( ! seen[ fact ][ value ] ) {
					seen[ fact ][ value ] = `.${ t.root }[${ i }]${ el === root ? '' : ' ' + pathOf( el, root ) }`;
				}
			};
			const visit = ( el ) => {
				if ( el !== root && [ ...el.classList ].some( ( c ) => cut.has( c ) ) ) {
					return;
				}
				note( 'renders-tag', el.localName, el );
				for ( const r of ( el.getAttribute( 'role' ) || '' ).split( /\s+/ ).filter( Boolean ) ) {
					note( 'renders-role', r, el );
				}
				for ( const a of el.getAttributeNames() ) {
					if ( a.startsWith( 'aria-' ) ) {
						note( 'renders-aria', a, el );
					}
				}
				for ( const c of el.children ) {
					visit( c );
				}
			};
			visit( root );
			instances.push( seen );
		} );
		out[ block ] = instances;
	}
	return out;
}

// The read's targets for one site: each block to read, its wrapper class and the wrapper classes of every block saved
// on that site.
export function targetsFor( blocks, inventory ) {
	const cut = [ ...new Set( Object.keys( inventory.saved || {} ).map( wrapperClass ) ) ].sort();
	return Object.fromEntries( blocks.map( ( b ) => [ b, { root: wrapperClass( b ), cut } ] ) );
}

const vocab = ( code, block, fact, value ) => code[ block ]?.[ fact ]?.[ value ];

// Folds one page read into the accumulator. `read`: readInstances' result; `where`: { site, path, width }.
// `acc`: { blocks: { block: { instances: { site: n }, facts: { fact: { value: [ evidence ] } } } }, outside: {} }.
export function absorb( acc, read, where, code, inventory ) {
	for ( const [ block, instances ] of Object.entries( read ) ) {
		if ( ! instances.length ) {
			continue;
		}
		const entry = ( acc.blocks[ block ] ??= { instances: {}, facts: {} } );
		const key = `${ where.site } ${ where.path }`;
		entry.instances[ key ] = Math.max( entry.instances[ key ] || 0, instances.length );
		const unmarked = inventory.unmarked || {};
		for ( const seen of instances ) {
			for ( const fact of MARKUP_FACTS ) {
				for ( const [ value, selector ] of Object.entries( seen[ fact ] ) ) {
					if ( ( unmarked[ fact ] || [] ).includes( value ) ) {
						continue;
					}
					const ev = `${ where.site } ${ where.path } @${ where.width } ${ selector }`;
					const state = vocab( code, block, fact, value );
					if ( undefined !== state ) {
						const list = ( ( entry.facts[ fact ] ??= {} )[ value ] ??= [] );
						if ( list.length < EVIDENCE_CAP && ! list.includes( ev ) ) {
							list.push( ev );
						}
					} else {
						( ( acc.outside[ block ] ??= {} )[ `${ fact }=${ value }` ] ??= ev );
					}
				}
			}
		}
	}
	return acc;
}

const sortObj = ( o ) => Object.fromEntries( Object.keys( o ).sort().map( ( k ) => [ k, o[ k ] ] ) );

// The file `data/block-live-facts.json`: block -> fact -> value -> { state: 'yes', evidence }, with the pages read, the
// blocks found on no page, and the out-of-vocabulary values for gate A.
export function liveFile( acc, { sites, toRead, readOn } ) {
	const blocks = {};
	for ( const b of Object.keys( acc.blocks ).sort() ) {
		const facts = {};
		for ( const f of MARKUP_FACTS ) {
			const vals = acc.blocks[ b ].facts[ f ] || {};
			if ( Object.keys( vals ).length ) {
				facts[ f ] = sortObj( Object.fromEntries( Object.entries( vals ).map( ( [ v, ev ] ) => [ v, { state: 'yes', evidence: [ ...ev ].sort() } ] ) ) );
			}
		}
		blocks[ b ] = { instances: sortObj( acc.blocks[ b ].instances ), facts };
	}
	return {
		about: 'Spec 48 F1 step A2b: renders-tag / renders-role / renders-aria values seen on the local mirrors (scripts/computed-route/tools/block-live-facts.mjs). Stage 14 of sgs-update-v2.py imports a value as a source=live row beside a code unknown and counts one beside a code no as a gate A conflict, both computed at each seed; a value never seen stays unknown (no `no` is written).',
		readOn,
		widths: WIDTHS,
		sites,
		blocks,
		notSeen: toRead.filter( ( b ) => ! acc.blocks[ b ] ),
		outsideVocabulary: sortObj( acc.outside ),
	};
}

// The yes keys of a live file, `block|fact|value`.
export const yesKeys = ( file ) => Object.entries( file.blocks || {} ).flatMap( ( [ b, e ] ) => Object.entries( e.facts || {} ).flatMap( ( [ f, vals ] ) => Object.keys( vals ).map( ( v ) => `${ b }|${ f }|${ v }` ) ) ).sort();

// What a fresh read changes against the stored file: yes keys gained and lost, blocks newly seen or lost. Evidence and
// instance counts moving are not drift.
export function compareLive( stored, fresh ) {
	const a = new Set( yesKeys( stored ) );
	const b = new Set( yesKeys( fresh ) );
	return {
		gained: [ ...b ].filter( ( k ) => ! a.has( k ) ),
		lost: [ ...a ].filter( ( k ) => ! b.has( k ) ),
		notSeenNow: ( fresh.notSeen || [] ).filter( ( x ) => ! ( stored.notSeen || [] ).includes( x ) ),
		seenNow: ( stored.notSeen || [] ).filter( ( x ) => ! ( fresh.notSeen || [] ).includes( x ) ),
	};
}

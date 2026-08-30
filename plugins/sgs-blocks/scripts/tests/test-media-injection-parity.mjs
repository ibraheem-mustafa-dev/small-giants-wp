/**
 * Standing gate: the JS injection filter and the PHP registration filter must
 * inject the SAME attribute set for the same supports.sgs.mediaElements
 * declaration.
 *
 * If they disagree, the editor writes a key the server schema does not carry -
 * ServerSideRender rejects it as an invalid parameter and the editor preview
 * dies while the front end renders perfectly. A one-sided failure is the worst
 * kind: it looks like an editor bug, not a registration bug.
 *
 * Runs the REAL PHP filter through the CLI and the REAL JS module - neither
 * side is reimplemented here.
 *
 * Run:  node scripts/tests/test-media-injection-parity.mjs
 */
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const BS = String.fromCharCode( 92 );
const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const P = path.resolve( HERE, '..', '..' ).split( BS ).join( '/' );

const { attributesForElement } = await import(
	'file:///' + P + '/src/blocks/extensions/media-elements.js'
);

let fail = 0;
const ck = ( n, c, extra = '' ) => {
	process.stdout.write( '  ' + ( c ? 'ok   ' : 'FAIL ' ) + n + ( c ? '' : '  ' + extra ) + '\n' );
	if ( ! c ) fail++;
};

function phpInject( blockName, declared, existing ) {
	const body =
		'define("ABSPATH","' + P + '/");' +
		'function add_filter(...$a){} function esc_attr($s){return $s;} function __($s,$d=null){return $s;}' +
		'function esc_html($s){return $s;} function esc_html__($s,$d=null){return $s;}' +
		'function _doing_it_wrong($f,$m,$v){}' +
		'require "' + P + '/includes/media-element-attrs-register.php";' +
		'$args=' + phpArr( { supports: { sgs: { mediaElements: declared } }, attributes: existing } ) + ';' +
		'$o=SGS\\Blocks\\sgs_register_media_element_attrs($args,' + JSON.stringify( blockName ) + ');' +
		'echo json_encode(array_keys($o["attributes"]));';
	return JSON.parse( execFileSync( 'php', [ '-r', body ], { encoding: 'utf8' } ) );
}
function phpArr( o ) { return 'json_decode(' + JSON.stringify( JSON.stringify( o ) ) + ',true)'; }

// --- Case 1: two prefixed elements, no pre-existing attributes.
const declared = [ { prefix: 'before', context: 'element' }, { prefix: 'after', context: 'element' } ];
const jsKeys = Object.keys( { ...attributesForElement( 'sgs/before-after', declared[0] ),
                              ...attributesForElement( 'sgs/before-after', declared[1] ) } ).sort();
const phpKeys = phpInject( 'sgs/before-after', declared, {} ).sort();

ck( 'JS and PHP inject the SAME key set (' + jsKeys.length + ' keys)',
	JSON.stringify( jsKeys ) === JSON.stringify( phpKeys ),
	'\n         only JS: ' + jsKeys.filter( k => !phpKeys.includes(k) ).slice(0,6).join(', ') +
	'\n         only PHP: ' + phpKeys.filter( k => !jsKeys.includes(k) ).slice(0,6).join(', ') );

ck( 'prefixes applied', jsKeys.includes( 'beforeImageUrl' ) && jsKeys.includes( 'afterImageUrl' ) );
ck( 'tiers applied to source', jsKeys.includes( 'beforeImageUrlTablet' ) );
ck( 'tiers NOT applied to meaning', ! jsKeys.includes( 'beforeImageAltTablet' ) );
ck( 'storedAs honoured: shared autoplay is block-level',
	jsKeys.includes( 'videoAutoplay' ) && ! jsKeys.includes( 'beforeVideoAutoplay' ) );

// --- Case 2: the block's OWN declaration must win.
const own = { beforeImageUrl: { type: 'string', default: 'KEEP-ME' } };
const body =
	'define("ABSPATH","' + P + '/");function add_filter(...$a){}' +
	'require "' + P + '/includes/media-element-attrs-register.php";' +
	'$args=' + phpArr( { supports: { sgs: { mediaElements: [ declared[0] ] } }, attributes: own } ) + ';' +
	'$o=SGS\\Blocks\\sgs_register_media_element_attrs($args,"sgs/before-after");' +
	'echo json_encode($o["attributes"]["beforeImageUrl"]);';
const kept = JSON.parse( execFileSync( 'php', [ '-r', body ], { encoding: 'utf8' } ) );
ck( "the block's own declaration WINS (default preserved)", kept.default === 'KEEP-ME', JSON.stringify( kept ) );

// --- Case 3: a block that declares nothing gets nothing.
const none = phpInject( 'sgs/heading', [], {} );
ck( 'no declaration -> no injection', none.length === 0, JSON.stringify( none ) );

// ── SELECTIVE INJECTION ────────────────────────────────────────────────────
// The behaviour that makes adoption safe: an entry naming ATOMS receives only
// those atoms' bases. Both sides must narrow IDENTICALLY, or the editor writes
// a key the server never registered.
{
	const full = { prefix: 'image', context: 'element' };
	const two = { prefix: 'image', context: 'element', atoms: [ 'source', 'box-shape' ] };

	const jsFull = Object.keys( attributesForElement( 'sgs/probe', full ) ).sort();
	const jsTwo = Object.keys( attributesForElement( 'sgs/probe', two ) ).sort();
	// phpInject already returns array_keys(), so it is a LIST - wrapping it in
	// Object.keys() yields array INDICES and a diff of pure noise.
	const phpFull = phpInject( 'sgs/probe', [ full ], {} ).sort();
	const phpTwo = phpInject( 'sgs/probe', [ two ], {} ).sort();

	// Report the symmetric difference, not just the counts. Two sets of equal
	// SIZE can still disagree, and "49 vs 49" is the least useful thing a
	// failing parity check can say.
	const onlyJs = jsTwo.filter( ( k ) => ! phpTwo.includes( k ) );
	const onlyPhp = phpTwo.filter( ( k ) => ! jsTwo.includes( k ) );
	ck(
		'selective: JS and PHP agree on the narrowed set (' + jsTwo.length + ' keys)',
		! onlyJs.length && ! onlyPhp.length,
		'JS-only: [' + onlyJs.join( ', ' ) + ']  PHP-only: [' + onlyPhp.join( ', ' ) + ']'
	);
	ck(
		'selective: naming two atoms injects FEWER keys than naming none',
		jsTwo.length < jsFull.length,
		jsTwo.length + ' vs ' + jsFull.length
	);
	ck(
		'selective: omitting `atoms` still injects everything (both sides)',
		jsFull.length === phpFull.length && jsFull.length > jsTwo.length
	);
	// POSITIVE CONTROL for the narrowing: a base the named atoms own must be
	// present, and one they do not own must be absent. Without both, "fewer
	// keys" could mean the filter simply broke.
	ck(
		'selective: a base the named atoms OWN is present (imageImageUrl)',
		jsTwo.includes( 'imageImageUrl' ) && phpTwo.includes( 'imageImageUrl' )
	);
	ck(
		'selective: a base they do NOT own is absent (imageOverlayColour)',
		! jsTwo.includes( 'imageOverlayColour' ) &&
			! phpTwo.includes( 'imageOverlayColour' )
	);
	// Tiering is data-driven now: ObjectPosition IS tiered, OverlayBlendMode is not.
	const focal = { prefix: '', context: 'element', atoms: [ 'focal-point', 'overlay' ] };
	const jsFocal = Object.keys( attributesForElement( 'sgs/probe', focal ) );
	const phpFocal = phpInject( 'sgs/probe', [ focal ], {} );
	ck(
		'tiered set is DATA: objectPositionTablet exists, overlayBlendModeTablet does not',
		jsFocal.includes( 'objectPositionTablet' ) &&
			! jsFocal.includes( 'overlayBlendModeTablet' ) &&
			phpFocal.includes( 'objectPositionTablet' ) &&
			! phpFocal.includes( 'overlayBlendModeTablet' )
	);
}

process.stdout.write( '\n' + ( fail ? 'FAIL - ' + fail + ' failure(s)' : 'PASS - JS and PHP agree' ) + '\n' );
process.exit( fail ? 1 : 0 );

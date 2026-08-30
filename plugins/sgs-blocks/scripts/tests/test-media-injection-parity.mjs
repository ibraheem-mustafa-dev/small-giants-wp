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

process.stdout.write( '\n' + ( fail ? 'FAIL - ' + fail + ' failure(s)' : 'PASS - JS and PHP agree' ) + '\n' );
process.exit( fail ? 1 : 0 );

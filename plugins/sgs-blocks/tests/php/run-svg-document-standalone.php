<?php
/**
 * Standalone test for the whole-file SVG sanitiser (helpers-svg-document.php) and the logo's inline option.
 * Each refused case of scripts/computed-route/lib/svg-screen.mjs::svgProblem must be refused or stripped.
 *
 *   php plugins/sgs-blocks/tests/php/run-svg-document-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable
define( 'ABSPATH', sys_get_temp_dir() . DIRECTORY_SEPARATOR );
function __( $s, $d = '' ) { return $s; }
require_once dirname( __DIR__, 2 ) . '/includes/helpers-svg-document.php';

$pass = 0;
$fail = 0;
function ok( bool $c, string $label, string $detail = '' ): void {
	global $pass, $fail;
	$c ? ++$pass : ++$fail;
	echo ( $c ? 'PASS  ' : 'FAIL  ' ) . $label . ( $c || '' === $detail ? '' : "  => $detail" ) . "\n";
}
const NS = 'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"';
$svg = static function ( string $inner ): string {
	return '<svg ' . NS . ' viewBox="0 0 10 10">' . $inner . '</svg>';
};
// The end state never holds any refused construct.
$clean = static function ( string $out ): bool {
	return ! preg_match( '/javascript|@import|<script|foreignObject|\son[a-z]+=|attributeName="\s*(xlink:)?href|url\(\s*["\']?(?!#)/i', $out );
};

// ── MUST FAIL: every refused construct, plus case and encoding tricks ──
$refused = array(
	'javascript: in an attribute'            => $svg( '<path d="M0 0" class="javascript:x"/>' ),
	'case and space trick JaVaScRiPt :'      => $svg( '<use href="JaVaScRiPt :alert(1)"/>' ),
	'entity-encoded &#106;avascript:'        => $svg( '<use href="&#106;avascript:alert(1)"/>' ),
	'tab inside java\tscript:'               => $svg( '<set attributeName="fill" to="java&#9;script:x"/>' ),
	'CSS @import in <style>'                 => $svg( '<style>@import "https://evil.test/x.css";</style>' ),
	'@import hidden by a CSS comment'        => $svg( '<style>@im/**/port url(#a);</style>' ),
	'escaped @\69mport'                      => $svg( '<style>@\69mport "x.css";</style>' ),
	'DOCTYPE with entity declarations'       => '<!DOCTYPE svg [<!ENTITY x "y">]>' . $svg( '<path d="M0 0"/>' ),
	'element outside the SVG namespace'      => $svg( '<html:div xmlns:html="http://www.w3.org/1999/xhtml">x</html:div>' ),
	'root with no namespace'                 => '<svg viewBox="0 0 1 1"><path d="M0 0"/></svg>',
	'foreignObject'                          => $svg( '<foreignObject><p>x</p></foreignObject>' ),
	'on… event attribute'                    => $svg( '<path d="M0 0" onclick="x()"/>' ),
	'ONLOAD on the root'                     => '<svg ' . NS . ' ONLOAD="x()"></svg>',
	'animate attributeName href'             => $svg( '<a><animate attributeName="href" values="#a;#b"/></a>' ),
	'set attributeName " xlink:href"'        => $svg( '<a><set attributeName=" xlink:href" to="#b"/></a>' ),
	'animate values javascript: on href'     => $svg( '<a><animate attributeName="href" values="javascript:alert(1)"/></a>' ),
	'animation targeting an on… attribute'   => $svg( '<set attributeName="onclick" to="x()"/>' ),
	'href to an outside URL'                 => $svg( '<image href="https://evil.test/a.png"/>' ),
	'xlink:href to an outside URL'           => $svg( '<use xlink:href="//evil.test/s.svg#a"/>' ),
	'data:image/svg+xml link'                => $svg( '<image href="data:image/svg+xml;base64,AAAA"/>' ),
	'style attribute url() outside'          => $svg( '<path d="M0 0" style="fill:url( &quot;javascript:x&quot; )"/>' ),
	'<style> url() outside'                  => $svg( '<style>.a{background:url(https://evil.test/x)}</style>' ),
	'presentation attribute url() outside'   => $svg( '<path d="M0 0" fill="url(https://evil.test/x#g)"/>' ),
	'escaped u\72l( in <style>'              => $svg( '<style>.a{fill:u\72l(https://evil.test/x)}</style>' ),
	'not well-formed XML'                    => '<svg ' . NS . '><path d="M0 0"></svg>',
	'undefined entity'                       => $svg( '<text>&nbsp;</text>' ),
	'@import split by an XML comment'        => $svg( '<style>@im<!---->port "https://evil.test/x.css";</style>' ),
	'url( split by a CDATA section'          => $svg( '<style>.a{fill:u<![CDATA[rl(]]>http://x)}</style>' ),
	'@import split by an element'            => $svg( '<style>@im<g/>port "x.css";</style>' ),
	'processing instruction in <style>'      => $svg( '<style>.a{}<?x y?></style>' ),
	'undeclared xlink: prefix, outside href' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><use xlink:href="https://evil.test/s.svg#a"/><g xml:space="bogus"/></svg>',
);
foreach ( $refused as $label => $markup ) {
	$r = sgs_svg_sanitise_document( $markup );
	ok( '' === $r['svg'] || $clean( $r['svg'] ), "MUST FAIL: $label", $r['svg'] );
	ok( '' === $r['svg'] && '' !== $r['error'], "MUST FAIL: $label is refused with a reason", $r['svg'] );
}

// ── Stripped, the file still uploads ──
$r = sgs_svg_sanitise_document( '<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' . $svg( '<!-- c --><script type="text/javascript">!function(){}()</script><sodipodi:namedview xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"/><path d="M0 0" inkscape:label="x" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"/>' ) );
ok( '' !== $r['svg'] && false === stripos( $r['svg'], 'script' ) && false === strpos( $r['svg'], 'sodipodi' ) && false === strpos( $r['svg'], 'inkscape' ) && false === strpos( $r['svg'], '<!--' ), 'script, editor metadata, comments and a plain DOCTYPE are stripped', $r['svg'] . $r['error'] );

// ── Positive: animation, style, fragment url and mesh gradient survive with camelCase ──
$animated = $svg(
	'<style type="text/css">@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} .sun > path{animation:spin 9s linear infinite;fill:url(#g)}</style>'
	. '<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" xlink:href="#h"><stop offset="0" style="stop-color:#f00"/></linearGradient>'
	. '<meshgradient id="m" x="0" y="0" gradientUnits="userSpaceOnUse"><meshrow><meshpatch><stop path="c 1,0 2,0 3,0" style="stop-color:#fff"/></meshpatch></meshrow></meshgradient></defs>'
	. '<g class="sun" style="fill:url(#m)"><path d="M0 0" pathLength="1"><animate attributeName="opacity" values="0;1" dur="1s" repeatCount="indefinite" keySplines="0.4 0 0.2 1" calcMode="spline"/></path>'
	. '<animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="30s" repeatCount="indefinite"/></g>'
);
$r   = sgs_svg_sanitise_document( $animated );
$out = $r['svg'];
ok( '' !== $out, 'an animated file is kept', $r['error'] );
foreach ( array( 'viewBox="0 0 10 10"', '<animate attributeName="opacity"', 'repeatCount="indefinite"', 'keySplines=', 'calcMode="spline"', '<animateTransform', 'type="rotate"', '@keyframes spin', 'url(#g)', '<meshgradient', '<meshrow>', '<meshpatch>', 'path="c 1,0 2,0 3,0"', 'gradientUnits="userSpaceOnUse"', 'xlink:href="#h"', 'pathLength="1"', 'style="fill:url(#m)"', '.sun &gt; path' ) as $needle ) {
	ok( false !== strpos( $out, $needle ), "kept: $needle", $out );
}
ok( '' !== sgs_svg_sanitise_document( $svg( '<image href="data:image/png;base64,AAAA"/>' ) )['svg'], 'a raster data:image href is kept' );

// ── Plain wp_kses callers: the shared list carries no screened-only element, so wp_kses strips <set attributeName="href"> ──
$shared   = sgs_svg_kses_allowed_tags();
$document = sgs_svg_document_allowed_tags();
foreach ( array( 'set', 'animatetransform', 'animatemotion', 'mpath', 'meshgradient', 'meshrow', 'meshpatch', 'style' ) as $tag ) {
	ok( ! isset( $shared[ $tag ] ), "MUST FAIL: the shared wp_kses list has no <$tag>" );
	ok( isset( $document[ $tag ] ), "the whole-file list keeps <$tag>" );
}
ok( empty( $shared['stop']['path'] ) && ! empty( $document['stop']['path'] ), 'a mesh <stop path> is whole-file only' );
ok( ! empty( $shared['animate']['attributename'] ) && empty( $shared['animate']['keysplines'] ), 'the shared list keeps its narrow <animate>' );

// ── A <style> split into text nodes is screened as one string ──
$split = new DOMDocument();
$split->loadXML( $svg( '<style></style>' ) );
$style_el = $split->getElementsByTagName( 'style' )->item( 0 );
$style_el->appendChild( $split->createTextNode( '@im' ) );
$style_el->appendChild( $split->createTextNode( 'port "x.css";' ) );
$scopy = new DOMDocument();
$sroot = $scopy->appendChild( $scopy->createElementNS( SGS_SVG_NS, 'svg' ) );
ok( '' !== sgs_svg_document_copy( $split->documentElement, $sroot, $scopy, sgs_svg_document_allowed_tags() ), 'MUST FAIL: @import split across text nodes in the copy step' );
$parent = new DOMDocument();
$parent->loadXML( $svg( '<style>.a{fill:red}</style>' ) );
$root_el = $parent->documentElement;
$copied  = new DOMDocument();
$croot   = $copied->appendChild( $copied->createElementNS( SGS_SVG_NS, 'svg' ) );
$sstyle  = $parent->createElementNS( SGS_SVG_NS, 'style' );
$sstyle->appendChild( $parent->createTextNode( 'u' ) );
$sstyle->appendChild( $parent->createCDATASection( 'rl(http://x)' ) );
$root_el->appendChild( $sstyle );
ok( '' !== sgs_svg_document_copy( $root_el, $croot, $copied, sgs_svg_document_allowed_tags() ), 'MUST FAIL: url( split across a text node and a CDATA node in the copy step' );
$r = sgs_svg_sanitise_document( $svg( '<style>.a{fill:red}</style><g xml:space="bogus"/>' ) );
ok( '' !== $r['svg'], 'a parser warning alone does not refuse the file', $r['error'] );

// ── Upload: the refusal reason the media uploader shows as HTML is escaped ──
function add_filter( ...$a ) { return true; }
function esc_html( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES, 'UTF-8' ); }
require_once dirname( __DIR__, 2 ) . '/includes/svg-upload.php';
$tmp = tempnam( sys_get_temp_dir(), 'sgs' );
file_put_contents( $tmp, $svg( '<image href="https://evil.test/&lt;img src=x onerror=alert(1)&gt;"/>' ) );
$up = sgs_svg_upload_prefilter( array( 'name' => 'a.svg', 'tmp_name' => $tmp ) );
ok( isset( $up['error'] ) && false === strpos( $up['error'], '<img' ) && false !== strpos( $up['error'], '&lt;img' ), 'MUST FAIL: the upload refusal reason is HTML-escaped', $up['error'] ?? '' );
unlink( $tmp );

// ── Render: the logo's inline option through the real render.php ──
$dir  = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sgs-svg-inline-' . getmypid();
@mkdir( $dir );
$file = $dir . DIRECTORY_SEPARATOR . 'logo.svg';
file_put_contents( $file, $svg( '<style>rect{fill:red} #sun{opacity:1} svg > g{fill:blue}</style><script>x()</script><path id="sun" d="M0 0"><animate attributeName="opacity" values="0;1" dur="1s"/></path><use href="#sun"/>' ) );
$prepend = $dir . DIRECTORY_SEPARATOR . 'prepend.php';
file_put_contents( $prepend, '<?php function get_attached_file( $id ) { return 7 === (int) $id ? ' . var_export( $file, true ) . ' : false; }'
	. ' function wp_get_attachment_url( $id ) { return 7 === (int) $id ? "https://x.test/logo.svg" : ( 8 === (int) $id ? "https://x.test/square.png" : false ); }'
	. ' function get_transient( $k ) { return false; } function set_transient( $k, $v, $e = 0 ) { return true; }'
	. ' defined( "DAY_IN_SECONDS" ) || define( "DAY_IN_SECONDS", 86400 );' );
$render = static function ( array $attrs ) use ( $prepend, $dir ): string {
	$af = $dir . DIRECTORY_SEPARATOR . 'attrs.json';
	file_put_contents( $af, json_encode( $attrs ) );
	$cmd = escapeshellarg( PHP_BINARY ) . ' -d auto_prepend_file=' . escapeshellarg( $prepend ) . ' ' . escapeshellarg( dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php' ) . ' --slug sgs/responsive-logo --attrs-file ' . escapeshellarg( $af ) . ' 2>&1';
	$json = json_decode( (string) shell_exec( $cmd ), true );
	return is_array( $json ) && ! empty( $json['ok'] ) ? (string) $json['html'] : 'NOT RUN: ' . json_encode( $json );
};
$on = $render( array( 'logoId' => 7, 'inlineSvg' => true, 'alt' => 'Acme home' ) );
ok( 1 === preg_match( '/<span class="sgs-responsive-logo__svg sgs-responsive-logo__svg--inline"><svg role="img" aria-label="Acme home" focusable="false" xmlns="http:\/\/www.w3.org\/2000\/svg"/', $on ), 'inline on: the SVG is printed with role="img" and the accessible name', $on );
ok( false !== strpos( $on, '<animate attributeName="opacity"' ) && false === strpos( $on, '<script' ) && false === strpos( $on, '<img' ), 'inline on: sanitised, animation kept, no <img>', $on );
ok( false !== strpos( $on, 'class="sgs-responsive-logo__link" href=' ), 'inline on: the home link still wraps the logo', $on );
preg_match( '/<svg [^>]* id="(sgs-logo-svg-[^"]+)"/', $on, $root_id );
$rid = $root_id[1] ?? 'NONE';
ok( false !== strpos( $on, ':where(#' . $rid . ') rect{fill:red}' ) && false === strpos( $on, '>rect{' ), 'MUST FAIL: inline on: the file rect rule only matches inside this logo', $on );
ok( false !== strpos( $on, ':where(#' . $rid . ') #' . $rid . '-sun{' ) && false !== strpos( $on, 'id="' . $rid . '-sun"' ) && false !== strpos( $on, 'href="#' . $rid . '-sun"' ), 'MUST FAIL: inline on: ids, id selectors and #id links carry the instance prefix', $on );
ok( false !== strpos( $on, 'svg:where(#' . $rid . ') &gt; g{fill:blue}' ), 'inline on: a rule on the root svg keeps matching the root', $on );
$draw = $render( array( 'logoId' => 8, 'sgsMotion' => array( 'elements' => array( 'wrapper' => array( 'effects' => array( array( 'effect' => 'draw', 'values' => array( 'asset' => 7 ) ) ) ) ) ) ) );
preg_match( '/<span class="sgs-responsive-logo__svg" aria-hidden="true"><svg [^>]* id="(sgs-logo-svg-[^"]+)"/', $draw, $draw_id );
$did = $draw_id[1] ?? 'NONE';
ok( false !== strpos( $draw, ':where(#' . $did . ') rect{fill:red}' ) && false !== strpos( $draw, 'id="' . $did . '-sun"' ) && false !== strpos( $draw, 'href="#' . $did . '-sun"' ), 'MUST FAIL: draw layer: the SVG ids and <style> rules are scoped to this logo', $draw );
$swap = $render( array( 'logoId' => 7, 'logoIdMobile' => 8, 'inlineSvg' => true ) );
ok( false !== strpos( $swap, 'sgs-responsive-logo__svg--swaps' ) && false !== strpos( $swap, 'src="https://x.test/square.png"' ), 'inline on with a compact logo: the compact logo swaps in below 1024px', $swap );
$deco = $render( array( 'logoId' => 7, 'inlineSvg' => true, 'logoDecorative' => true ) );
ok( false !== strpos( $deco, '<svg aria-hidden="true"' ) && false === strpos( $deco, 'role="img"' ), 'inline on, decorative: the SVG is hidden from assistive tech', $deco );
$off = $render( array( 'logoId' => 7 ) );
ok( false === strpos( $off, '<svg' ) && false !== strpos( $off, '<img class="sgs-responsive-logo__image sgs-responsive-logo__image--desktop" src="https://x.test/logo.svg"' ), 'negative control: inline off prints the <img> as before', $off );
// ── Two instances of one file never share an id or a keyframes name ──
require_once dirname( __DIR__, 2 ) . '/includes/helpers-svg-instance-scope.php';
$one_file = sgs_svg_sanitise_document( $svg( '<style>@keyframes spin{to{transform:rotate(1turn)}} @media (min-width:1px){.a{animation:spin 2s;fill:url(#g)}}</style><defs><linearGradient id="g"/></defs><path class="a" d="M0 0" fill="url(#g)"><animate begin="g.end; 1s" attributeName="opacity" values="0;1" dur="1s"/></path>' ) )['svg'];
$first  = sgs_svg_scope_instance( $one_file, 'sgs-logo-svg-1' );
$second = sgs_svg_scope_instance( $one_file, 'sgs-logo-svg-2' );
ok( false !== strpos( $first, 'id="sgs-logo-svg-1-g"' ) && false !== strpos( $second, 'id="sgs-logo-svg-2-g"' ) && false === strpos( $second, 'sgs-logo-svg-1' ), 'MUST FAIL: two instances get distinct ids', $first . ' | ' . $second );
ok( false !== strpos( $first, 'fill="url(#sgs-logo-svg-1-g)"' ) && false !== strpos( $first, 'begin="sgs-logo-svg-1-g.end; 1s"' ), 'url(#id) attributes and begin id.event follow the renamed id', $first );
ok( false !== strpos( $first, '@keyframes sgs-logo-svg-1-spin{' ) && false !== strpos( $first, '@media (min-width:1px){:where(#sgs-logo-svg-1) .a{animation:sgs-logo-svg-1-spin 2s;fill:url(#sgs-logo-svg-1-g)}}' ), 'keyframes renamed; rules inside @media scoped', $first );

// ── Dark mode and colour treatment reach the inline logo ──
$scss = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/responsive-logo/style.scss' );
ok( 1 === preg_match( "/data-theme='dark'[^}]*\.sgs-responsive-logo__image--desktop \{\s*display: none;\s*\}\s*\.sgs-responsive-logo__svg--inline \{\s*visibility: hidden;/", $scss ), 'MUST FAIL: the inline logo hides under the dark logo in dark mode' );
ok( 7 === substr_count( $scss, "img:not( .sgs-responsive-logo__dark ),\n\t\t\t.sgs-responsive-logo__svg--inline svg {" ), 'MUST FAIL: every automatic colour treatment rule reaches the inline <svg>' );

array_map( 'unlink', glob( $dir . DIRECTORY_SEPARATOR . '*' ) );
@rmdir( $dir );

echo "\nRESULT  $pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );

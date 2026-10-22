<?php
/**
 * Standalone test for trusted scripted SVG uploads (includes/svg-upload.php, helpers-svg-trust.php,
 * helpers-svg-inline-attachment.php, helpers-svg-instance-scope.php, svg-htaccess-guard.php).
 *
 *   php plugins/sgs-blocks/tests/php/run-svg-trusted-upload-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable
define( 'ABSPATH', sys_get_temp_dir() . DIRECTORY_SEPARATOR );
defined( 'DAY_IN_SECONDS' ) || define( 'DAY_IN_SECONDS', 86400 );

// ── WordPress stubs, steered by $GLOBALS['t'] ──
$GLOBALS['t'] = array(
	'caps'    => array(), // user id => bool unfiltered_html
	'current' => 0,
	'users'   => array(), // user id => true when the user exists
	'meta'    => array(), // attachment id => mark
	'mime'    => 'image/svg+xml',
	'file'    => '',
	'options' => array(),
	'markers' => null,
	'basedir' => '',
);
function __( $s, $d = '' ) { return $s; }
function esc_html( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES, 'UTF-8' ); }
function add_filter( ...$a ) { return true; }
function add_action( ...$a ) { return true; }
function get_current_user_id() { return $GLOBALS['t']['current']; }
function current_user_can( $c ) { return 'unfiltered_html' === $c && ! empty( $GLOBALS['t']['caps'][ $GLOBALS['t']['current'] ] ); }
function get_userdata( $id ) { return ! empty( $GLOBALS['t']['users'][ $id ] ) ? (object) array( 'ID' => $id ) : false; }
function user_can( $u, $c ) { return 'unfiltered_html' === $c && ! empty( $GLOBALS['t']['caps'][ $u->ID ] ); }
function get_post_meta( $id, $k = '', $single = false ) { return $GLOBALS['t']['meta'][ $id ] ?? ''; }
function update_post_meta( $id, $k, $v ) { if ( '_sgs_svg_trusted' === $k ) { $GLOBALS['t']['meta'][ $id ] = $v; } return true; }
function get_post_mime_type( $id ) { return $GLOBALS['t']['mime']; }
function get_attached_file( $id ) { return $GLOBALS['t']['file']; }
function get_option( $k, $d = false ) { return $GLOBALS['t']['options'][ $k ] ?? $d; }
function update_option( $k, $v ) { $GLOBALS['t']['options'][ $k ] = $v; return true; }
function wp_upload_dir() { return array( 'basedir' => $GLOBALS['t']['basedir'] ); }
function insert_with_markers( $file, $marker, $lines ) { $GLOBALS['t']['markers'] = array( $file, $marker, $lines ); return true; }
function get_transient( $k ) { return false; }
function set_transient( $k, $v, $e = 0 ) { return true; }

$base = dirname( __DIR__, 2 ) . '/includes/';
require_once $base . 'svg-upload.php';
require_once $base . 'svg-htaccess-guard.php';
require_once $base . 'helpers-svg-inline-attachment.php';
require_once $base . 'helpers-svg-instance-scope.php';

$pass = 0;
$fail = 0;
function ok( bool $c, string $label, string $detail = '' ): void {
	global $pass, $fail;
	$c ? ++$pass : ++$fail;
	echo ( $c ? 'PASS  ' : 'FAIL  ' ) . $label . ( $c || '' === $detail ? '' : "  => $detail" ) . "\n";
}

const NS = 'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"';
$svg    = static function ( string $inner ): string {
	return '<svg ' . NS . ' viewBox="0 0 10 10">' . $inner . '</svg>';
};
$dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sgs-trusted-' . getmypid();
@mkdir( $dir );
/** Upload $contents as $name for user $uid (capability $cap); returns array( result, tmp contents ). */
$upload = static function ( string $contents, string $name, int $uid, bool $cap ) use ( $dir ): array {
	$GLOBALS['t']['current']       = $uid;
	$GLOBALS['t']['caps'][ $uid ] = $cap;
	$tmp                          = $dir . DIRECTORY_SEPARATOR . 'up-' . mt_rand() . '.tmp';
	file_put_contents( $tmp, $contents );
	$res = sgs_svg_upload_prefilter( array( 'name' => $name, 'tmp_name' => $tmp ) );
	return array( $res, (string) file_get_contents( $tmp ) );
};

$scripted = $svg( '<script type="text/javascript">document.querySelector("#a").setAttribute("x","1")</script><path id="a" d="M0 0"/>' );

// (a) untrusted: script stripped.
list( $res, $out ) = $upload( $scripted, 'a.svg', 5, false );
ok( empty( $res['error'] ) && false === stripos( $out, 'script' ), '(a) an untrusted upload comes out without its <script>', $out . ( $res['error'] ?? '' ) );

// (b) trusted: script kept, file byte-identical (including an XML declaration and a comment the sanitiser would strip).
$exact = '<?xml version="1.0"?>' . "\n<!-- keep me -->\n" . $scripted . "\n";
list( $res, $out ) = $upload( $exact, 'b.svg', 1, true );
ok( empty( $res['error'] ) && $out === $exact, '(b) a trusted upload keeps its script and stays byte-identical', $out . ( $res['error'] ?? '' ) );

// (c) three identical scripts collapse to one, the rest untouched.
$three = $svg( '<script>x()</script><path d="M0 0"/><script>x()</script><script>x()</script><script>y()</script>' );
list( $res, $out ) = $upload( $three, 'c.svg', 1, true );
ok( empty( $res['error'] ) && 1 === substr_count( $out, '<script>x()</script>' ) && 1 === substr_count( $out, '<script>y()</script>' ) && false !== strpos( $out, '<path d="M0 0"/>' ), '(c) identical scripts collapse to one, a distinct one stays', $out );

// (d) entity declaration refused even when trusted.
list( $res, $out ) = $upload( '<!DOCTYPE svg [<!ENTITY x "y">]>' . $svg( '<path d="M0 0"/>' ), 'd.svg', 1, true );
ok( ! empty( $res['error'] ), '(d) a trusted upload with <!ENTITY is refused', $res['error'] ?? '' );
list( $res, $out ) = $upload( '<svg xmlns="http://www.w3.org/2000/svg"><g></svg>', 'd2.svg', 1, true );
ok( ! empty( $res['error'] ), '(d) a trusted upload that is not well-formed XML is refused' );
list( $res, $out ) = $upload( '<html><body/></html>', 'd3.svg', 1, true );
ok( ! empty( $res['error'] ), '(d) a trusted upload with no <svg> root is refused' );

// (e) .svgz and gzipped .svg refused for everyone.
$gz = gzencode( $scripted );
foreach ( array( 'trusted' => array( 1, true ), 'untrusted' => array( 5, false ) ) as $who => $u ) {
	list( $res ) = $upload( $gz, 'e.svgz', $u[0], $u[1] );
	ok( ! empty( $res['error'] ), "(e) .svgz is refused for a $who user" );
	list( $res ) = $upload( $gz, 'e.svg', $u[0], $u[1] );
	ok( ! empty( $res['error'] ), "(e) a gzipped .svg is refused for a $who user" );
}

// (f) the mark is set only for an unfiltered_html uploader.
$file = $dir . DIRECTORY_SEPARATOR . 'stored.svg';
$mark = static function ( string $contents, int $uid, bool $cap, bool $capAtMark ) use ( $upload, $file ): array {
	$GLOBALS['t']['meta'] = array();
	$upload( $contents, 'f.svg', $uid, $cap );
	file_put_contents( $file, $contents );
	$GLOBALS['t']['file']         = $file;
	$GLOBALS['t']['caps'][ $uid ] = $capAtMark;
	sgs_svg_trust_mark( 42 );
	return $GLOBALS['t']['meta'][42] ?? array();
};
$m = $mark( $scripted, 1, true, true );
ok( ( $m['sha256'] ?? '' ) === hash( 'sha256', $scripted ) && 1 === ( $m['user'] ?? 0 ), '(f) an unfiltered_html uploader gets the mark' );
ok( array() === $mark( $scripted, 5, false, false ), '(f) a user without unfiltered_html gets no mark' );
ok( array() === $mark( $scripted, 1, true, false ), '(f) an uploader who lost the capability before the attachment was saved gets no mark' );
$GLOBALS['t']['meta'] = array();
$GLOBALS['t']['current'] = 1;
$GLOBALS['t']['caps'][1] = true;
file_put_contents( $file, $svg( '<script>never uploaded</script>' ) );
sgs_svg_trust_mark( 42 );
ok( ! isset( $GLOBALS['t']['meta'][42] ), '(f) a file that was not this request\'s trusted upload gets no mark' );

// (g) sgs_svg_attachment_is_trusted.
$good = array( 'sha256' => hash( 'sha256', $scripted ), 'user' => 1 );
$is   = static function ( $meta, string $raw, bool $exists = true, bool $cap = true ) {
	$GLOBALS['t']['meta']     = array( 7 => $meta );
	$GLOBALS['t']['users']    = array( 1 => $exists );
	$GLOBALS['t']['caps'][1]  = $cap;
	return sgs_svg_attachment_is_trusted( 7, $raw );
};
ok( true === $is( $good, $scripted ), '(g) a matching mark, existing user with the capability is trusted' );
ok( false === $is( $good, $scripted . ' ' ), '(g) a tampered file (hash mismatch) is not trusted' );
ok( false === $is( array( 'sha256' => $good['sha256'] ), $scripted ), '(g) a mark missing its user is not trusted' );
ok( false === $is( array( 'user' => 1 ), $scripted ), '(g) a mark missing its hash is not trusted' );
ok( false === $is( '', $scripted ), '(g) no mark is not trusted' );
ok( false === $is( $good, $scripted, false, true ), '(g) a deleted uploader is not trusted' );
ok( false === $is( $good, $scripted, true, false ), '(g) an uploader who lost unfiltered_html is not trusted' );

// Inline print: trusted prints as stored, untrusted is rebuilt.
$stored = '<?xml version="1.0"?><!-- c -->' . "\n" . $scripted;
file_put_contents( $file, $stored );
$GLOBALS['t']['file'] = $file;
$GLOBALS['t']['meta'] = array( 9 => array( 'sha256' => hash( 'sha256', $stored ), 'user' => 1 ) );
$GLOBALS['t']['users'] = array( 1 => true );
$GLOBALS['t']['caps'][1] = true;
$trusted_inline = sgs_svg_inline_attachment( 9 );
ok( 0 === strpos( $trusted_inline, '<svg' ) && false !== strpos( $trusted_inline, '<script' ) && $trusted_inline === $scripted, 'a trusted attachment prints as stored, starting with <svg>', $trusted_inline );
$GLOBALS['t']['caps'][1] = false;
$demoted_inline = sgs_svg_inline_attachment( 9 );
ok( 0 === strpos( $demoted_inline, '<svg' ) && false === stripos( $demoted_inline, '<script' ), 'a demoted uploader\'s attachment prints sanitised', $demoted_inline );

// (h) the scoper leaves a script's text byte-identical and scopes the rest.
$code   = 'var a=document.getElementById("a"); if(a&&1<2){ a.setAttribute("fill","url(#g)"); }';
$inline = sgs_svg_trusted_inline_markup( $svg( '<defs><linearGradient id="g"><stop offset="0"/></linearGradient></defs><script><![CDATA[' . $code . ']]></script><path id="a" d="M0 0" fill="url(#g)"/>' ) );
$scoped = sgs_svg_scope_instance( $inline, 'inst1' );
$doc    = new DOMDocument();
$doc->loadXML( $scoped );
$script = $doc->getElementsByTagName( 'script' )->item( 0 );
ok( null !== $script && $script->textContent === $code, '(h) the scoper leaves a script\'s text byte-identical', $scoped );
ok( false !== strpos( $scoped, 'id="inst1-g"' ) && false !== strpos( $scoped, 'fill="url(#inst1-g)"' ) && false !== strpos( $scoped, 'id="inst1-a"' ), '(h) the SVG\'s own ids and url(#) references are scoped consistently', $scoped );

// (i) the .htaccess writer.
$GLOBALS['t']['basedir'] = $dir;
$GLOBALS['t']['options'] = array();
sgs_svg_htaccess_install();
$expected = array(
	'<IfModule mod_headers.c>',
	'<FilesMatch "\.svgz?$">',
	'Header always set Content-Security-Policy "default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; sandbox"',
	'Header always set X-Content-Type-Options "nosniff"',
	'</FilesMatch>',
	'</IfModule>',
);
ok( array( $dir . '/.htaccess', 'SGS SVG', $expected ) === $GLOBALS['t']['markers'], '(i) the .htaccess writer produces exactly the specified lines' );
ok( SGS_SVG_HTACCESS_VERSION === get_option( 'sgs_svg_htaccess_version' ), '(i) the version option is stored' );
$GLOBALS['t']['markers'] = null;
sgs_svg_htaccess_install();
ok( null === $GLOBALS['t']['markers'], '(i) a current version does not rewrite' );
$GLOBALS['t']['options'] = array();
$GLOBALS['t']['basedir'] = $dir . DIRECTORY_SEPARATOR . 'missing';
sgs_svg_htaccess_install();
ok( null === $GLOBALS['t']['markers'], '(i) an unwritable folder is skipped silently' );

// Negative control: an assertion must be able to fail.
$before = $fail;
ok( false, 'NEGATIVE CONTROL (expected FAIL)' );
$controlled = ( $fail === $before + 1 );
$fail       = $before;
--$pass;
ok( $controlled, 'negative control: a false assertion is counted as a failure' );

array_map( 'unlink', glob( $dir . DIRECTORY_SEPARATOR . '*' ) ?: array() );
@rmdir( $dir );
echo "\n$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );

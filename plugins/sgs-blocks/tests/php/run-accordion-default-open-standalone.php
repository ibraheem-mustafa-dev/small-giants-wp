<?php
/**
 * Standalone runner: an item counts as open only when its `<details>` tag has an `open` ATTRIBUTE, not when an
 * attribute VALUE contains the word " open ".
 *
 * WordPress core is not on this machine, so WP_HTML_Tag_Processor is a minimal stand-in that tokenises attributes
 * (names and quoted values) the way the real one reports them through get_attribute().
 *
 * Run: php plugins/sgs-blocks/tests/php/run-accordion-default-open-standalone.php
 *
 * @package SGS\Blocks
 */

define( 'ABSPATH', __DIR__ );

class WP_HTML_Tag_Processor {
	private array $attrs = array();
	public function __construct( private string $html ) {}
	public function next_tag( string $name ): bool {
		if ( ! preg_match( '#^<' . $name . '\b([^>]*)>#i', $this->html, $m ) ) {
			return false;
		}
		preg_match_all( '#([^\s=/"\'>]+)(?:\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s>]+)))?#', $m[1], $all, PREG_SET_ORDER );
		foreach ( $all as $a ) {
			$this->attrs[ strtolower( $a[1] ) ] = ( $a[2] ?? '' ) . ( $a[3] ?? '' ) . ( $a[4] ?? '' );
		}
		return true;
	}
	public function get_attribute( string $name ) {
		return $this->attrs[ strtolower( $name ) ] ?? null;
	}
}

require dirname( __DIR__, 2 ) . '/includes/accordion-default-open.php';

$pass  = 0;
$fail  = 0;
$check = static function ( bool $ok, string $label ) use ( &$pass, &$fail ): void {
	$ok ? $pass++ : $fail++;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
};

$decoy = '<details class="x" data-note="a box that is open now"><summary aria-expanded="false">A</summary>body</details>';
$out   = sgs_accordion_open_default_item( $decoy, 0 );
$check( 1 === preg_match( '#<details [^>]*\sopen>#', $out ), 'an item with " open " only inside an attribute value is still opened as the default' );

$real = '<details class="x" open><summary aria-expanded="true">A</summary>body</details>';
$check( $real === sgs_accordion_open_default_item( $real, 5 ), 'an item that has the open attribute is left as it is' );
$none = sgs_accordion_open_default_item( $decoy, 3 );
$check( $none === $decoy, 'a decoy value does not make a non-default item count as open' );

echo "{$pass} passed, {$fail} failed\n";
exit( $fail > 0 ? 1 : 0 );

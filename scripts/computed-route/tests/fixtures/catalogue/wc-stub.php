<?php
// A stand-in WooCommerce for tests/site-build-catalogue-axes-php.test.mjs: the functions and classes the catalogue step's
// read and write PHP (lib/site-build-catalogue-php.mjs) call, over an in-memory store that persists between php runs in
// the state file named by SGS_STATE_FILE. Products, variations and attributes are posts; terms and global attributes are
// tables; $W['orders'] lists the variation ids an order holds. Just enough of WooCommerce to run the step, not a copy of it.
define( 'ABSPATH', sys_get_temp_dir() . '/sgs-stub-abspath/' );
@mkdir( ABSPATH . 'wp-admin/includes', 0777, true );
foreach ( array( 'file', 'media', 'image' ) as $f ) { file_put_contents( ABSPATH . "wp-admin/includes/$f.php", "<?php\n" ); }
const OBJECT = 'OBJECT';
class WooCommerce {}
class WC_Data_Exception extends Exception {
	public function __construct( $code = '', $message = '' ) { parent::__construct( $message ); }
}
$W = is_file( SGS_STATE_FILE ) ? json_decode( file_get_contents( SGS_STATE_FILE ), true ) : array( 'next' => 100, 'posts' => array(), 'terms' => array(), 'attrs' => array(), 'objterms' => array(), 'orders' => array(), 'meta' => array() );
register_shutdown_function( function () { global $W; file_put_contents( SGS_STATE_FILE, json_encode( $W ) ); } );

function sgs_next() { global $W; return $W['next']++; }
class WC_Product_Attribute {
	public $d = array( 'id' => 0, 'name' => '', 'options' => array(), 'position' => 0, 'visible' => false, 'variation' => false );
	public function set_id( $v ) { $this->d['id'] = (int) $v; }
	public function set_name( $v ) { $this->d['name'] = $v; }
	public function get_name() { return $this->d['name']; }
	public function set_options( $v ) { $this->d['options'] = array_values( $v ); }
	public function get_options() { return $this->d['options']; }
	public function set_position( $v ) { $this->d['position'] = $v; }
	public function set_visible( $v ) { $this->d['visible'] = (bool) $v; }
	public function get_visible() { return $this->d['visible']; }
	public function set_variation( $v ) { $this->d['variation'] = (bool) $v; }
	public function get_variation() { return $this->d['variation']; }
}
class WC_Product {
	public $id = 0;
	public $type = 'simple';
	public function __construct( $id = 0 ) {
		global $W;
		$this->id = (int) $id;
		if ( $id && isset( $W['posts'][ $id ] ) ) { $this->type = $W['posts'][ $id ]['type']; }
	}
	protected function ensure() {
		global $W;
		if ( empty( $W['posts'][ $this->id ] ) ) {
			$W['posts'][ $this->id ] = array( 'type' => $this->type, 'parent' => 0, 'status' => 'draft', 'name' => '', 'slug' => '', 'sku' => '', 'price' => '', 'thumb' => 0, 'gallery' => array(), 'attrs' => array(), 'defaults' => array(), 'vattrs' => array(), 'meta' => array() );
		}
	}
	protected function g( $k ) { global $W; $this->ensure(); return $W['posts'][ $this->id ][ $k ]; }
	protected function s( $k, $v ) { global $W; $this->ensure(); $W['posts'][ $this->id ][ $k ] = $v; }
	public function get_id() { return $this->id; }
	public function get_type() { return $this->g( 'type' ); }
	public function is_type( $t ) { return $this->g( 'type' ) === $t; }
	public function set_name( $v ) { $this->s( 'name', $v ); }
	public function set_slug( $v ) { $this->s( 'slug', $v ); }
	public function set_status( $v ) { $this->s( 'status', $v ); }
	public function set_catalog_visibility( $v ) {}
	public function set_short_description( $v ) {}
	public function get_sku() { return $this->g( 'sku' ); }
	public function set_sku( $v ) {
		global $W;
		foreach ( $W['posts'] as $id => $p ) {
			if ( $p && (int) $id !== $this->id && 'trash' !== $p['status'] && '' !== $v && $p['sku'] === $v ) { throw new WC_Data_Exception( 'product_invalid_sku', 'Invalid or duplicated SKU.' ); }
		}
		$this->s( 'sku', $v );
	}
	public function get_regular_price() { return $this->g( 'price' ); }
	public function set_regular_price( $v ) { $this->s( 'price', $v ); }
	public function get_attributes() {
		$out = array();
		foreach ( $this->g( 'attrs' ) as $tax => $d ) { $a = new WC_Product_Attribute(); $a->d = $d; $out[ $tax ] = $a; }
		return $out;
	}
	public function set_attributes( $list ) {
		$rows = array();
		foreach ( $list as $tax => $a ) { $rows[ $tax ] = $a->d; }
		$this->s( 'attrs', $rows );
	}
	public function get_default_attributes() { return $this->g( 'defaults' ); }
	public function set_default_attributes( $v ) { $this->s( 'defaults', $v ); }
	public function get_gallery_image_ids() { return $this->g( 'gallery' ); }
	public function set_gallery_image_ids( $v ) { $this->s( 'gallery', $v ); }
	public function get_children() {
		global $W;
		$out = array();
		foreach ( $W['posts'] as $id => $p ) {
			if ( $p && 'variation' === $p['type'] && $p['parent'] === $this->id && in_array( $p['status'], array( 'publish', 'private' ), true ) ) { $out[] = (int) $id; }
		}
		return $out;
	}
	public function save() {
		global $W;
		$this->ensure();
		if ( 0 === $this->id ) { $this->id = sgs_next(); $W['posts'][ $this->id ] = $W['posts'][0]; unset( $W['posts'][0] ); }
		foreach ( $W['posts'][ $this->id ]['attrs'] as $tax => $d ) { $W['objterms'][ $this->id ][ $tax ] = $d['options']; }
		return $this->id;
	}
	public function delete( $force = false ) { $this->s( 'status', 'trash' ); return true; }
}
class WC_Product_Simple extends WC_Product { public $type = 'simple'; }
class WC_Product_Variable extends WC_Product {
	public $type = 'variable';
	public static function sync( $id ) {}
}
class WC_Product_Variation extends WC_Product {
	public $type = 'variation';
	public function set_parent_id( $v ) { $this->s( 'parent', (int) $v ); }
	public function set_attributes( $list ) { $this->s( 'vattrs', $list ); }
	public function get_attributes() { return $this->g( 'vattrs' ); }
}
function wc_get_product( $id ) {
	global $W;
	$p = $W['posts'][ $id ] ?? null;
	if ( ! $p ) { return null; }
	$class = array( 'variable' => 'WC_Product_Variable', 'variation' => 'WC_Product_Variation' )[ $p['type'] ] ?? 'WC_Product_Simple';
	return new $class( $id );
}
function wc_get_product_id_by_sku( $sku ) { global $W; foreach ( $W['posts'] as $id => $p ) { if ( $p && 'trash' !== $p['status'] && '' !== $sku && $p['sku'] === $sku ) { return (int) $id; } } return 0; }
function wc_delete_product_transients( $id ) {}
function get_post_meta( $id, $key, $single = true ) {
	global $W;
	$p = $W['posts'][ $id ] ?? null;
	if ( ! $p ) { return ''; }
	return '_sku' === $key ? $p['sku'] : ( $p['meta'][ $key ] ?? '' );
}
function update_post_meta( $id, $key, $v ) { global $W; $W['posts'][ $id ]['meta'][ $key ] = $v; }
function delete_post_meta( $id, $key ) { global $W; unset( $W['posts'][ $id ]['meta'][ $key ] ); }
function get_posts( $a ) { global $W; $out = array(); foreach ( $W['posts'] as $id => $p ) { if ( $p && 'product' === ( $a['post_type'] ?? '' ) && isset( $a['meta_key'] ) && ( $p['meta'][ $a['meta_key'] ] ?? null ) === $a['meta_value'] ) { $out[] = (int) $id; } } return $out; }
function get_page_by_path( $slug ) { global $W; foreach ( $W['posts'] as $id => $p ) { if ( $p && $p['slug'] === $slug ) { return (object) array( 'ID' => $id ); } } return null; }
function get_post_status( $id ) { global $W; return $W['posts'][ $id ]['status'] ?? false; }
function get_post_type( $id ) { return 'product'; }
function wp_update_post( $a ) { global $W; $W['posts'][ $a['ID'] ]['status'] = $a['post_status']; }
function get_post_thumbnail_id( $id ) { global $W; return $W['posts'][ $id ]['thumb'] ?? 0; }
function set_post_thumbnail( $id, $att ) { global $W; $W['posts'][ $id ]['thumb'] = $att; }
function get_permalink( $id ) { return 'https://shop.test/?p=' . $id; }
function get_option( $name, $d = false ) { return array( 'default_product_cat' => 0, 'woocommerce_permalinks' => array(), 'active_plugins' => array() )[ $name ] ?? $d; }
function update_option( $n, $v ) {}
function delete_transient( $n ) {}
function wp_get_attachment_url( $id ) { return ''; }
function wp_json_encode( $v ) { return json_encode( $v ); }
function is_wp_error( $v ) { return false; }
function sanitize_hex_color( $c ) { return $c; }
function wc_attribute_taxonomy_name( $slug ) { return 'pa_' . $slug; }
function wc_attribute_taxonomy_id_by_name( $tax ) { global $W; return (int) ( $W['attrs'][ $tax ]['id'] ?? 0 ); }
function wc_create_attribute( $a ) { global $W; $id = sgs_next(); $W['attrs'][ 'pa_' . $a['slug'] ] = array( 'id' => $id, 'name' => $a['name'] ); return $id; }
function wc_get_attribute( $id ) { global $W; foreach ( $W['attrs'] as $a ) { if ( $a['id'] === $id ) { return (object) array( 'name' => $a['name'] ); } } return null; }
function wc_check_if_attribute_name_is_reserved( $s ) { return false; }
function taxonomy_exists( $tax ) { global $W; return isset( $W['attrs'][ $tax ] ); }
function register_taxonomy( $t, $o, $a ) {}
function sgs_term_obj( $id ) { global $W; $t = $W['terms'][ $id ]; return (object) array( 'term_id' => $id, 'name' => $t['name'], 'slug' => $t['slug'], 'taxonomy' => $t['tax'] ); }
function get_term_by( $field, $v, $tax ) { global $W; foreach ( $W['terms'] as $id => $t ) { if ( $t['tax'] === $tax && ( 'name' === $field ? $t['name'] : $t['slug'] ) === $v ) { return sgs_term_obj( $id ); } } return false; }
function wp_insert_term( $name, $tax ) { global $W; $id = sgs_next(); $W['terms'][ $id ] = array( 'tax' => $tax, 'name' => $name, 'slug' => strtolower( preg_replace( '/[^A-Za-z0-9]+/', '-', $name ) ), 'meta' => array() ); return array( 'term_id' => $id ); }
function get_term( $id, $tax ) { return sgs_term_obj( $id ); }
function get_terms( $a ) { global $W; $out = array(); foreach ( $W['terms'] as $id => $t ) { if ( $t['tax'] === $a['taxonomy'] ) { $out[] = sgs_term_obj( $id ); } } return $out; }
function get_term_meta( $id, $k, $s = true ) { global $W; return $W['terms'][ $id ]['meta'][ $k ] ?? ''; }
function update_term_meta( $id, $k, $v ) { global $W; $W['terms'][ $id ]['meta'][ $k ] = $v; }
function wp_get_object_terms( $id, $tax, $a = array() ) {
	global $W;
	$ids = $W['objterms'][ $id ][ $tax ] ?? array();
	return 'names' === ( $a['fields'] ?? 'ids' ) ? array_map( fn( $t ) => $W['terms'][ $t ]['name'], $ids ) : array_map( 'intval', $ids );
}
function wc_get_product_terms( $id, $tax, $a = array() ) { return wp_get_object_terms( $id, $tax, $a ); }
function wp_set_object_terms( $id, $terms, $tax ) { global $W; $W['objterms'][ $id ][ $tax ] = array_map( 'intval', (array) $terms ); }
class SgsStubDb {
	public $prefix = 'wp_';
	public $postmeta = 'wp_postmeta';
	public function prepare( $sql, ...$args ) { return vsprintf( str_replace( array( '%d', '%s' ), array( '%d', "'%s'" ), $sql ), $args ); }
	public function esc_like( $s ) { return $s; }
	// The only query the step makes that this stand-in answers: does an order item hold this variation?
	public function get_var( $sql ) {
		global $W;
		return preg_match( '/woocommerce_order_itemmeta WHERE meta_key = \'_variation_id\' AND meta_value = (\d+)/', $sql, $m ) && in_array( (int) $m[1], $W['orders'], true ) ? '9' : null;
	}
}
$wpdb = new SgsStubDb();

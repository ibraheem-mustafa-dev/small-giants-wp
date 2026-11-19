<?php
/**
 * Self-test step: inverts the colours of the seeded product's main photo and every resized copy of it, in place and
 * under the same file names, so nothing in the page's HTML, styles or boxes changes and only the pixels do. Scratch
 * copies only (render-check.py runs it through --step on the after copy).
 *
 *   wp eval-file negate-product-image.php
 *
 * @package SGS\RenderCheck
 */

$rc_user = get_user_by( 'login', 'rc-customer' );
$rc_list = $rc_user ? json_decode( (string) get_user_meta( $rc_user->ID, '_sgs_wishlist', true ), true ) : null;
$rc_pid  = is_array( $rc_list ) && ! empty( $rc_list[0]['id'] ) ? (int) $rc_list[0]['id'] : 0;
$rc_att  = $rc_pid ? (int) get_post_thumbnail_id( $rc_pid ) : 0;
$rc_file = $rc_att ? get_attached_file( $rc_att ) : '';
if ( ! $rc_file || ! is_file( $rc_file ) ) {
	fwrite( STDERR, "negate-product-image.php: the seeded product has no main photo file\n" );
	exit( 1 );
}
$rc_dir   = dirname( $rc_file );
$rc_files = array( $rc_file );
foreach ( (array) ( wp_get_attachment_metadata( $rc_att )['sizes'] ?? array() ) as $rc_size ) {
	$rc_files[] = $rc_dir . '/' . $rc_size['file'];
}
$rc_done = 0;
foreach ( array_unique( $rc_files ) as $rc_path ) {
	$rc_ext = strtolower( pathinfo( $rc_path, PATHINFO_EXTENSION ) );
	$rc_img = 'png' === $rc_ext ? imagecreatefrompng( $rc_path ) : ( 'webp' === $rc_ext ? imagecreatefromwebp( $rc_path ) : imagecreatefromjpeg( $rc_path ) );
	if ( ! $rc_img ) {
		continue;
	}
	imagefilter( $rc_img, IMG_FILTER_NEGATE );
	$rc_ok = 'png' === $rc_ext ? imagepng( $rc_img, $rc_path ) : ( 'webp' === $rc_ext ? imagewebp( $rc_img, $rc_path ) : imagejpeg( $rc_img, $rc_path, 90 ) );
	$rc_done += $rc_ok ? 1 : 0;
}
echo "inverted $rc_done file(s) of attachment $rc_att\n";

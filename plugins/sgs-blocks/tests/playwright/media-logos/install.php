<?php
/**
 * AC-26 fixture for the logo slots (Spec 49 §10.4): one published page holding every logo block with known pictures
 * and settings, installed idempotently on any site that runs the Stage B build.
 *
 *   wp --path=<docroot> eval-file plugins/sgs-blocks/tests/playwright/media-logos/install.php
 *
 * It makes three pictures (a wide 400x100, a square 100x100 and a 200x100) in the media library under fixed file names
 * if they are not already there, then creates or updates the page `sgs-w3c-logos-fixture`. A second run changes nothing.
 * `check.mjs --base <url>` reads the page at 375, 768 and 1440 and asserts the computed styles the settings below set.
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

/**
 * One fixture picture: found by its file name, else drawn and added to the media library.
 *
 * @param string $name  File name.
 * @param int    $width Width in px.
 * @param int    $height Height in px.
 * @param int[]  $rgb   Fill colour.
 * @return array{kind:string,id:int,url:string,width:int,height:int,mime:string}
 */
function sgs_w3c_fixture_picture( string $name, int $width, int $height, array $rgb ): array {
	global $wpdb;
	$id = (int) $wpdb->get_var( $wpdb->prepare( "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_wp_attached_file' AND meta_value LIKE %s LIMIT 1", '%' . $wpdb->esc_like( $name ) ) );
	if ( $id <= 0 ) {
		$dir  = wp_upload_dir();
		$path = trailingslashit( $dir['path'] ) . $name;
		$img  = imagecreatetruecolor( $width, $height );
		imagefill( $img, 0, 0, imagecolorallocate( $img, $rgb[0], $rgb[1], $rgb[2] ) );
		imagepng( $img, $path );
		$id = wp_insert_attachment(
			array(
				'post_mime_type' => 'image/png',
				'post_title'     => $name,
				'post_status'    => 'inherit',
			),
			$path
		);
		wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $path ) );
	}
	return array(
		'kind'   => 'image',
		'id'     => $id,
		'url'    => (string) wp_get_attachment_url( $id ),
		'width'  => $width,
		'height' => $height,
		'mime'   => 'image/png',
	);
}

$wide   = sgs_w3c_fixture_picture( 'sgs-w3c-fixture-wide.png', 400, 100, array( 200, 40, 40 ) );
$square = sgs_w3c_fixture_picture( 'sgs-w3c-fixture-square.png', 100, 100, array( 40, 80, 200 ) );
$half   = sgs_w3c_fixture_picture( 'sgs-w3c-fixture-half.png', 200, 100, array( 40, 160, 80 ) );

/**
 * One block comment.
 *
 * @param string              $name  Block name.
 * @param array<string,mixed> $attrs Attributes.
 * @return string
 */
function sgs_w3c_fixture_block( string $name, array $attrs ): string {
	return '<!-- wp:' . $name . ' ' . wp_json_encode( $attrs, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . ' /-->';
}

$logo = static function ( string $class, array $more ) use ( $wide, $square ): string {
	return sgs_w3c_fixture_block(
		'sgs/responsive-logo',
		array_merge(
			array(
				'className'  => $class,
				'width'      => 200,
				'logoAlt'    => $class,
				'linkToHome' => false,
				'logoSource' => array(
					'desktop' => $wide,
					'mobile'  => $square,
				),
			),
			$more
		)
	);
};

$content = implode(
	"\n\n",
	array(
		$logo( 'w3c-rl-mobile', array() ),
		$logo( 'w3c-rl-tablet', array( 'logoSwitchMode' => 'tablet' ) ),
		$logo(
			'w3c-rl-custom',
			array(
				'logoSwitchMode'     => 'custom',
				'logoSwitchCustomPx' => 900,
			)
		),
		$logo( 'w3c-rl-dark', array( 'logoDarkSource' => array( 'desktop' => $half ) ) ),
		sgs_w3c_fixture_block(
			'sgs/brand-strip',
			array(
				'className' => 'w3c-bs',
				'logoShape' => array(
					'desktop' => array( 'shape' => 'circle' ),
					'mobile'  => array( 'shape' => 'none' ),
				),
				'logos'     => array(
					array(
						'source' => array( 'desktop' => $wide ),
						'alt'    => 'Wide',
						'name'   => 'Wide',
						'_key'   => 'w3c-1',
					),
					array(
						'source' => array( 'desktop' => $square ),
						'alt'    => 'Square',
						'name'   => 'Square',
						'_key'   => 'w3c-2',
					),
					array(
						'source' => array( 'desktop' => $wide ),
						'alt'    => 'Wide cropped',
						'name'   => 'Wide cropped',
						'_key'   => 'w3c-3',
						'fit'    => array( 'desktop' => 'cover' ),
					),
				),
			)
		),
		sgs_w3c_fixture_block(
			'sgs/nav-drawer',
			array(
				'className'        => 'w3c-nd',
				'chromeLogoSource' => array(
					'desktop' => $wide,
					'mobile'  => $square,
				),
				'chromeLogoAlt'    => 'w3c-nd',
				'chromeLogoWidth'  => array(
					'desktop' => '176px',
					'mobile'  => '120px',
				),
			)
		),
		sgs_w3c_fixture_block(
			'sgs/choice-flow',
			array(
				'className'        => 'w3c-cf',
				'showHeader'       => true,
				'headerLogoSource' => array( 'desktop' => $square ),
				'headerLogoAlt'    => 'w3c-cf',
			)
		),
	)
);

$existing = get_page_by_path( 'sgs-w3c-logos-fixture', OBJECT, 'page' );
$post     = array(
	'post_type'    => 'page',
	'post_status'  => 'publish',
	'post_title'   => 'Logo slots fixture',
	'post_name'    => 'sgs-w3c-logos-fixture',
	'post_content' => wp_slash( $content ),
);
if ( $existing ) {
	$post['ID'] = $existing->ID;
	if ( $existing->post_content === $content && 'publish' === $existing->post_status ) {
		echo 'sgs-w3c-logos-fixture: page ' . $existing->ID . " is already current\n";
		return;
	}
	$id = wp_update_post( $post, true );
} else {
	$id = wp_insert_post( $post, true );
}
if ( is_wp_error( $id ) ) {
	WP_CLI::error( $id->get_error_message() );
}
echo 'sgs-w3c-logos-fixture: page ' . $id . " written\n";

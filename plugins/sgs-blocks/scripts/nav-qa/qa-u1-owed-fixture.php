<?php
/**
 * U-1 owed live checks on sandybrown (wp eval-file qa-u1-owed-fixture.php <case>). Idempotent.
 * Merges attributes into the FIRST sgs/site-header and sgs/nav-bar-menu blocks of test header
 * 3777 and the FIRST sgs/mega-panel block of mega menu post 1745 ("Brands" in menu 119).
 * Backups (first run only) in post meta _sgs_qa_u1_backup. Case "restore" puts both bodies back.
 *
 * Run `qa-item-markup-fixture.php restore` first, so this fixture starts from the untouched header.
 *
 * Cases:
 *   exit-cells  header: fantasy's ground, black at 0.5 fading to clear at the bottom edge, as a
 *               gradient fill (`backgroundColourGradient`). Bar: menu 119 (Shop dropdown, Brands mega panel),
 *               collapse below 1024 so both open at 1440, fantasy's submenu link resting at 0.6 and
 *               brightening to 1. Mega panel: the `cards` style with indus-foods' 6px card lift.
 *   controls    the negative controls: a flat black fill at 0.5, no submenu opacity pair, no card
 *               lift (empty).
 *   restore     put the pre-fixture bodies back.
 */

$header_id = 3777;
$panel_id  = 1745;
$case      = isset( $args[0] ) ? (string) $args[0] : 'exit-cells';

foreach ( array( $header_id, $panel_id ) as $id ) {
	if ( '' === (string) get_post_meta( $id, '_sgs_qa_u1_backup', true ) ) {
		update_post_meta( $id, '_sgs_qa_u1_backup', wp_slash( get_post_field( 'post_content', $id ) ) );
	}
}

if ( 'restore' === $case ) {
	foreach ( array( $header_id, $panel_id ) as $id ) {
		$backup = get_post_meta( $id, '_sgs_qa_u1_backup', true );
		wp_update_post( wp_slash( array( 'ID' => $id, 'post_content' => $backup ) ) );
		delete_post_meta( $id, '_sgs_qa_u1_backup' );
	}
	echo "restored\n";
	return;
}

if ( ! in_array( $case, array( 'exit-cells', 'controls' ), true ) ) {
	echo "unknown case {$case}\n";
	return;
}

/**
 * Merge $set into the attribute JSON of the first $block comment in $content.
 * Keys whose value is null are removed.
 */
$merge = static function ( string $content, string $block, array $set ): string {
	$pattern = '#<!-- wp:' . preg_quote( $block, '#' ) . '(?: (\{.*?\}))? (/?)-->#s';
	return (string) preg_replace_callback(
		$pattern,
		static function ( $m ) use ( $block, $set ) {
			$attrs = ( isset( $m[1] ) && '' !== $m[1] ) ? json_decode( $m[1], true ) : array();
			$attrs = is_array( $attrs ) ? $attrs : array();
			foreach ( $set as $k => $v ) {
				if ( null === $v ) {
					unset( $attrs[ $k ] );
				} else {
					$attrs[ $k ] = $v;
				}
			}
			$json = $attrs ? ' ' . serialize_block_attributes( $attrs ) : '';
			return '<!-- wp:' . $block . $json . ' ' . ( $m[2] ?? '' ) . '-->';
		},
		$content,
		1
	);
};

$on = 'exit-cells' === $case;

$header_set = array(
	'backgroundColour'         => '#000000',
	'surfaceOpacity'           => 0.5,
	'backgroundColourGradient' => $on ? 'linear-gradient(to bottom,rgba(0,0,0,0.5),rgba(0,0,0,0))' : null,
);
$bar_set    = array(
	'ref'                 => 119,
	'collapsePoint'       => 1024,
	'submenuOpacity'      => $on ? 0.6 : null,
	'submenuOpacityHover' => $on ? 1 : null,
);
$panel_set  = array(
	'style'         => 'cards',
	'panelCardLift' => $on ? '6px' : '',
);

$h = get_post_field( 'post_content', $header_id );
$h = $merge( $h, 'sgs/site-header', $header_set );
$h = $merge( $h, 'sgs/nav-bar-menu', $bar_set );
wp_update_post( wp_slash( array( 'ID' => $header_id, 'post_content' => $h ) ) );

$p = $merge( get_post_field( 'post_content', $panel_id ), 'sgs/mega-panel', $panel_set );
wp_update_post( wp_slash( array( 'ID' => $panel_id, 'post_content' => $p ) ) );

preg_match( '#<!-- wp:sgs/site-header (\{.*?\}) #s', get_post_field( 'post_content', $header_id ), $sm );
preg_match( '#<!-- wp:sgs/nav-bar-menu (\{.*?\}) #s', get_post_field( 'post_content', $header_id ), $bm );
preg_match( '#<!-- wp:sgs/mega-panel (\{.*?\}) #s', get_post_field( 'post_content', $panel_id ), $pm );
echo "case: {$case}\n";
echo 'header: ' . ( $sm[1] ?? 'NOT FOUND' ) . "\n";
echo 'bar: ' . ( $bm[1] ?? 'NOT FOUND' ) . "\n";
echo 'panel: ' . ( $pm[1] ?? 'NOT FOUND' ) . "\n";

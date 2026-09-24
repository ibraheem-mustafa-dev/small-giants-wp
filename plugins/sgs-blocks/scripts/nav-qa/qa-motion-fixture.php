<?php
/**
 * U-5 live-check fixture on sandybrown (wp eval-file qa-motion-fixture.php <case>). Idempotent.
 * Merges motion attributes into the FIRST sgs/nav-drawer block of test drawer 3778 and the FIRST
 * sgs/nav-bar-menu block of test header 3777. Backups (first run only) in post meta
 * _sgs_qa_motion_backup. Case "restore" puts both bodies back.
 *
 * Cases:
 *   exit-cells  away's drawer (slide from the start edge, 300ms each way, no fade) with the
 *               drafts' 55ms item stagger capped at 320ms; halcyon's panels (fade-lift, 340ms,
 *               drafts curve, instant close) with a 28ms item stagger capped at 320ms.
 *   restore     put the pre-fixture bodies back.
 */

$header_id = 3777;
$drawer_id = 3778;
$case      = isset( $args[0] ) ? (string) $args[0] : 'exit-cells';

foreach ( array( $header_id, $drawer_id ) as $id ) {
	if ( '' === (string) get_post_meta( $id, '_sgs_qa_motion_backup', true ) ) {
		update_post_meta( $id, '_sgs_qa_motion_backup', wp_slash( get_post_field( 'post_content', $id ) ) );
	}
}

if ( 'restore' === $case ) {
	foreach ( array( $header_id, $drawer_id ) as $id ) {
		$backup = get_post_meta( $id, '_sgs_qa_motion_backup', true );
		wp_update_post( wp_slash( array( 'ID' => $id, 'post_content' => $backup ) ) );
	}
	echo "restored\n";
	return;
}

if ( 'exit-cells' !== $case ) {
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
			$json = $attrs ? ' ' . wp_json_encode( $attrs, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) : '';
			return '<!-- wp:' . $block . $json . ' ' . ( $m[2] ?? '' ) . '-->';
		},
		$content,
		1
	);
};

$drawer_set = array(
	'animateFrom'    => null,
	'entryAnimation' => array( 'desktop' => 'slide-start' ),
	'entryDuration'  => 300,
	'exitDuration'   => 300,
	'entryEasing'    => 'ease-out-css',
	'entryFade'      => false,
	'itemStagger'    => 55,
	'itemStaggerMax' => 320,
);

$bar_set = array(
	'submenuAnimation'         => 'fade-lift',
	'submenuAnimationDuration' => 340,
	'submenuExitDuration'      => 0,
	'submenuAnimationEasing'   => 'drafts',
	'submenuItemStagger'       => 28,
	'submenuItemStaggerMax'    => 320,
	'submenuItemStaggerDuration' => 460,
);

$d = $merge( get_post_field( 'post_content', $drawer_id ), 'sgs/nav-drawer', $drawer_set );
wp_update_post( wp_slash( array( 'ID' => $drawer_id, 'post_content' => $d ) ) );

$h = $merge( get_post_field( 'post_content', $header_id ), 'sgs/nav-bar-menu', $bar_set );
wp_update_post( wp_slash( array( 'ID' => $header_id, 'post_content' => $h ) ) );

preg_match( '#<!-- wp:sgs/nav-drawer (\{.*?\}) #s', get_post_field( 'post_content', $drawer_id ), $dm );
preg_match( '#<!-- wp:sgs/nav-bar-menu (\{.*?\}) #s', get_post_field( 'post_content', $header_id ), $hm );
echo "case: {$case}\n";
echo 'drawer: ' . ( $dm[1] ?? 'NOT FOUND' ) . "\n";
echo 'bar: ' . ( $hm[1] ?? 'NOT FOUND' ) . "\n";

<?php
/**
 * Tests: the saved-content sweep that stores the trust bar's default ticker (`scripts/migrate-trust-bar-ticker.php`).
 *
 * Every fixture's expected block is the one the render-time filter produced (`Sgs_Motion_Ticker_Default::apply`,
 * retired by this sweep; each expectation was asserted against the filter itself in the commit that added this sweep, before the filter was deleted), so a migrated page renders exactly as it did: a bar that took the default stores the same
 * layer in the same place, and every bar that did not take it (a stored marquee under any id with `touchPause` or the
 * older `pauseOnTouch`, `wrap`, `drop`, a motion value or root effects that are not a list) is left as saved.
 *
 * Run with:
 *   vendor/bin/phpunit --filter TrustBarTickerMigrationTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

if ( ! defined( 'SGS_TRUST_BAR_TICKER_LIBRARY' ) ) {
	define( 'SGS_TRUST_BAR_TICKER_LIBRARY', true );
}
require_once dirname( __DIR__, 2 ) . '/scripts/migrate-trust-bar-ticker.php';

final class TrustBarTickerMigrationTest extends TestCase {

	private static function layer(): array {
		$layer = sgs_trust_bar_ticker_layer( dirname( __DIR__, 2 ) . '/includes/motion/data/trust-bar-default-ticker.json' );
		self::assertIsArray( $layer );
		return $layer;
	}

	private static function bar( array $attrs ): array {
		return array( 'blockName' => 'sgs/trust-bar', 'attrs' => $attrs, 'innerBlocks' => array() );
	}

	private static function motion( array $effects, array $extra = array() ): array {
		return array_merge( array( 'v' => 1, 'elements' => array( 'root' => array( 'effects' => $effects ) ) ), $extra );
	}

	/**
	 * Each case: the saved block and the block the render-time filter produced from it.
	 *
	 * @return array<string,array{0:array,1:array}>
	 */
	public static function cases(): array {
		$layer   = self::layer();
		$tilt    = array( 'id' => 'tilt-1', 'effect' => 'tilt', 'values' => array() );
		$mm_tag  = array( 'id' => 'mmtag', 'effect' => 'marquee', 'values' => array( 'speed' => 58.8, 'pauseOnTouch' => true, 'belowBreakpoint' => 'always' ) );
		$mobile  = array( 'id' => 'marquee', 'effect' => 'marquee', 'values' => array( 'touchPause' => 'hold', 'belowBreakpoint' => 'mobile' ) );
		$no_id   = array( 'effect' => 'marquee', 'values' => array() );
		$with    = static fn( array $attrs ): array => self::bar( $attrs );
		return array(
			'no setting takes the default'              => array( $with( array() ), $with( array( 'sgsMotion' => self::motion( array( $layer ) ) ) ) ),
			'an explicit ticker takes the default'      => array( $with( array( 'overflowMode' => 'ticker' ) ), $with( array( 'overflowMode' => 'ticker', 'sgsMotion' => self::motion( array( $layer ) ) ) ) ),
			'a mode in capitals counts as ticker'       => array( $with( array( 'overflowMode' => 'TICKER' ) ), $with( array( 'overflowMode' => 'TICKER', 'sgsMotion' => self::motion( array( $layer ) ) ) ) ),
			'an unknown mode counts as ticker'          => array( $with( array( 'overflowMode' => 'bogus' ) ), $with( array( 'overflowMode' => 'bogus', 'sgsMotion' => self::motion( array( $layer ) ) ) ) ),
			'wrap takes none'                           => array( $with( array( 'overflowMode' => 'wrap' ) ), $with( array( 'overflowMode' => 'wrap' ) ) ),
			'wrap in capitals takes none'               => array( $with( array( 'overflowMode' => 'WRAP' ) ), $with( array( 'overflowMode' => 'WRAP' ) ) ),
			'drop takes none'                           => array( $with( array( 'overflowMode' => 'drop' ) ), $with( array( 'overflowMode' => 'drop' ) ) ),
			'a marquee under another id, pauseOnTouch'  => array( $with( array( 'sgsMotion' => self::motion( array( $mm_tag ) ) ) ), $with( array( 'sgsMotion' => self::motion( array( $mm_tag ) ) ) ) ),
			'a mobile marquee with touchPause and drop' => array( $with( array( 'overflowMode' => 'drop', 'sgsMotion' => self::motion( array( $mobile ) ) ) ), $with( array( 'overflowMode' => 'drop', 'sgsMotion' => self::motion( array( $mobile ) ) ) ) ),
			'a mobile marquee with touchPause, ticker'  => array( $with( array( 'sgsMotion' => self::motion( array( $mobile ) ) ) ), $with( array( 'sgsMotion' => self::motion( array( $mobile ) ) ) ) ),
			'a marquee saved without an id'             => array( $with( array( 'sgsMotion' => self::motion( array( $no_id ) ) ) ), $with( array( 'sgsMotion' => self::motion( array( $no_id ) ) ) ) ),
			'another effect is kept, marquee after it'  => array( $with( array( 'sgsMotion' => self::motion( array( $tilt ) ) ) ), $with( array( 'sgsMotion' => self::motion( array( $tilt, $layer ) ) ) ) ),
			'a stored version stays'                    => array( $with( array( 'sgsMotion' => array( 'v' => 2 ) ) ), $with( array( 'sgsMotion' => array( 'v' => 2, 'elements' => array( 'root' => array( 'effects' => array( $layer ) ) ) ) ) ) ),
			'a hover on root stays beside the effects'  => array( $with( array( 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'root' => array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => 1.02 ) ) ) ) ) ) ) ), $with( array( 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'root' => array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => 1.02 ) ) ), 'effects' => array( $layer ) ) ) ) ) ) ),
			'elements that are not a list are replaced' => array( $with( array( 'sgsMotion' => array( 'elements' => 'x' ) ) ), $with( array( 'sgsMotion' => array( 'elements' => array( 'root' => array( 'effects' => array( $layer ) ) ), 'v' => 1 ) ) ) ),
			'a motion value that is not a list stays'   => array( $with( array( 'sgsMotion' => 'x' ) ), $with( array( 'sgsMotion' => 'x' ) ) ),
			'root effects that are not a list stay'     => array( $with( array( 'sgsMotion' => self::motion( array() , array( 'elements' => array( 'root' => array( 'effects' => 'x' ) ) ) ) ) ), $with( array( 'sgsMotion' => self::motion( array(), array( 'elements' => array( 'root' => array( 'effects' => 'x' ) ) ) ) ) ) ),
			'another block is untouched'                => array( array( 'blockName' => 'sgs/hero', 'attrs' => array() ), array( 'blockName' => 'sgs/hero', 'attrs' => array() ) ),
		);
	}

	#[\PHPUnit\Framework\Attributes\DataProvider( 'cases' )]
	public function test_the_stored_block_is_the_one_the_render_filter_produced( array $saved, array $rendered ): void {
		$this->assertSame( $rendered, sgs_trust_bar_ticker_stored( $saved, self::layer() ) ?? $saved );
	}

	public function test_a_bar_at_any_depth_is_converted_and_counted(): void {
		$layer  = self::layer();
		$tree   = array(
			array( 'blockName' => 'sgs/container', 'attrs' => array(), 'innerBlocks' => array( self::bar( array() ), self::bar( array( 'overflowMode' => 'wrap' ) ) ) ),
			self::bar( array( 'sgsMotion' => self::motion( array( array( 'id' => 'mmtag', 'effect' => 'marquee', 'values' => array( 'touchPause' => 'hold' ) ) ) ) ) ),
		);
		$found  = array();
		$out    = sgs_trust_bar_ticker_migrate( $tree, $layer, $found );
		$this->assertCount( 1, $found );
		$this->assertSame( array( $layer ), $out[0]['innerBlocks'][0]['attrs']['sgsMotion']['elements']['root']['effects'] );
		$this->assertSame( $tree[0]['innerBlocks'][1], $out[0]['innerBlocks'][1] );
		$this->assertSame( $tree[1], $out[1] );
		$again = array();
		sgs_trust_bar_ticker_migrate( $out, $layer, $again );
		$this->assertSame( array(), $again, 'a second run finds nothing' );
	}

	public function test_the_probe_negative_control_bar_is_skipped_by_default(): void {
		$layer   = self::layer();
		$control = self::bar( array( 'className' => 'm515-control' ) );
		$other   = self::bar( array( 'className' => 'm515-other' ) );
		$skip    = sgs_trust_bar_ticker_skip_classes( SGS_TRUST_BAR_TICKER_EXCLUDE );
		$this->assertSame( array( 'm515-control' ), $skip, 'the unique class alone, on any post' );
		$found = array();
		$out   = sgs_trust_bar_ticker_migrate( array( $control, $other ), $layer, $found, $skip );
		$this->assertSame( $control, $out[0], 'the control bar stays as saved' );
		$this->assertSame( array( $layer ), $out[1]['attrs']['sgsMotion']['elements']['root']['effects'], 'control: another bar on the page is converted' );
		$this->assertSame( 'skipped (excluded: m515-control)', $found[0] );
		$none = array();
		$all  = sgs_trust_bar_ticker_migrate( array( $control ), $layer, $none, array() );
		$this->assertSame( array( $layer ), $all[0]['attrs']['sgsMotion']['elements']['root']['effects'], 'with include-excluded it is converted' );
	}

	public function test_an_exclude_entry_that_matches_no_bar_is_named(): void {
		$exclude = array(
			array( 'class' => 'm515-control', 'why' => 'a' ),
			array( 'class' => 'gone-bar', 'why' => 'b' ),
		);
		$notes   = array( 'overflowMode null; root effects now marquee', 'skipped (excluded: m515-control)' );
		$this->assertSame( array( 'gone-bar' ), sgs_trust_bar_ticker_unmatched_excludes( $exclude, $notes ) );
		$this->assertSame( array( 'm515-control', 'gone-bar' ), sgs_trust_bar_ticker_unmatched_excludes( $exclude, array() ) );
	}

	public function test_a_probe_page_is_skipped_by_default(): void {
		$this->assertTrue( sgs_trust_bar_ticker_probe_page( '[probe] trust-bar controls' ) );
		$this->assertTrue( sgs_trust_bar_ticker_probe_page( ' [Probe] x' ) );
		$this->assertFalse( sgs_trust_bar_ticker_probe_page( 'Home' ), 'control: a site page is swept' );
		$this->assertFalse( sgs_trust_bar_ticker_probe_page( 'Our [probe] results' ), 'control: the word elsewhere in a title is not a probe page' );
	}

	public function test_the_undo_file_must_encode_and_decode_back_to_the_same_posts(): void {
		$undo = array( '12' => array( 'before' => 'a', 'after' => 'b' ) );
		$this->assertSame( $undo, json_decode( (string) sgs_trust_bar_ticker_undo_json( $undo ), true ) );
		$this->assertNull( sgs_trust_bar_ticker_undo_json( array( '12' => array( 'before' => "\xB1\x31", 'after' => 'b' ) ) ), 'content that is not UTF-8 cannot be encoded: refuse' );
		$this->assertNull( sgs_trust_bar_ticker_undo_json( array( '12' => array( 'before' => NAN, 'after' => 'b' ) ) ), 'a value JSON cannot hold: refuse' );
		$this->assertNull( sgs_trust_bar_ticker_undo_json( $undo, static fn( $v ) => false ), 'an encoder that fails: refuse' );
		$this->assertNull( sgs_trust_bar_ticker_undo_json( $undo, static fn( $v ) => '' ), 'an empty encoding: refuse' );
		$this->assertNull( sgs_trust_bar_ticker_undo_json( $undo, static fn( $v ) => json_encode( array( '12' => array( 'before' => 'a?', 'after' => 'b' ) ) ) ), 'an encoder that rewrites content (wp_json_encode on bytes that are not UTF-8): refuse' );
	}

	public function test_undo_refuses_each_post_that_no_longer_holds_what_the_sweep_wrote(): void {
		$saved   = array(
			'10' => array( 'before' => 'old10', 'after' => 'new10' ),
			'11' => array( 'before' => 'old11', 'after' => 'new11' ),
			'12' => array( 'before' => 'old12', 'after' => 'new12' ),
			'13' => 'old13',
		);
		$current = static fn( int $id ): ?string => array( 10 => 'new10', 11 => 'edited since', 13 => 'x' )[ $id ] ?? null;
		$this->assertSame(
			array( 'post 11: changed since the sweep wrote it', 'post 12: no longer exists', 'post 13: the undo entry holds no before and after content' ),
			sgs_trust_bar_ticker_undo_conflicts( $saved, $current )
		);
		$this->assertSame( array(), sgs_trust_bar_ticker_undo_conflicts( array( '10' => $saved['10'] ), $current ), 'control: an untouched post may be restored' );
	}

	public function test_a_post_already_holding_its_old_content_is_skipped_not_refused(): void {
		// A write that failed at post 11 leaves 11 and 12 holding their old content; a re-run undo meets posts it restored.
		$saved   = array(
			'10' => array( 'before' => 'old10', 'after' => 'new10' ),
			'11' => array( 'before' => 'old11', 'after' => 'new11' ),
			'12' => array( 'before' => 'old12', 'after' => 'new12' ),
		);
		$current = static fn( int $id ): ?string => array( 10 => 'new10', 11 => 'old11', 12 => 'old12' )[ $id ] ?? null;
		$this->assertSame( array(), sgs_trust_bar_ticker_undo_conflicts( $saved, $current ) );
		$this->assertSame( array( 10 ), sgs_trust_bar_ticker_undo_restore( $saved, $current ), 'only the post still holding what the sweep wrote is written back' );
	}

	public function test_the_undo_file_must_not_exist_or_sit_under_the_site(): void {
		$root = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'tb-root-' . uniqid();
		$home = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'tb-home-' . uniqid();
		mkdir( $root . DIRECTORY_SEPARATOR . 'wp-content', 0777, true );
		mkdir( $home );
		$this->assertNull( sgs_trust_bar_ticker_undo_path_problem( $home . DIRECTORY_SEPARATOR . 'undo.json', $root ), 'control: a new file outside the site' );
		$this->assertMatchesRegularExpression( '/inside the site/', (string) sgs_trust_bar_ticker_undo_path_problem( $root . DIRECTORY_SEPARATOR . 'undo.json', $root ) );
		$this->assertMatchesRegularExpression( '/inside the site/', (string) sgs_trust_bar_ticker_undo_path_problem( $root . DIRECTORY_SEPARATOR . 'wp-content' . DIRECTORY_SEPARATOR . 'undo.json', $root . DIRECTORY_SEPARATOR ) );
		$this->assertMatchesRegularExpression( '/inside the site/', (string) sgs_trust_bar_ticker_undo_path_problem( $root . DIRECTORY_SEPARATOR . 'wp-content' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'undo.json', $root ), 'a path that climbs back into the site' );
		file_put_contents( $home . DIRECTORY_SEPARATOR . 'old.json', '{}' );
		$this->assertMatchesRegularExpression( '/already exists/', (string) sgs_trust_bar_ticker_undo_path_problem( $home . DIRECTORY_SEPARATOR . 'old.json', $root ) );
		$this->assertMatchesRegularExpression( '/folder/', (string) sgs_trust_bar_ticker_undo_path_problem( $home . DIRECTORY_SEPARATOR . 'nope' . DIRECTORY_SEPARATOR . 'undo.json', $root ) );
		mkdir( $root . '-sibling' );
		$this->assertNull( sgs_trust_bar_ticker_undo_path_problem( $root . '-sibling' . DIRECTORY_SEPARATOR . 'x.json', $root ), 'a sibling folder whose name starts with the site folder is outside it' );
		unlink( $home . DIRECTORY_SEPARATOR . 'old.json' );
	}

	public function test_a_failed_posts_query_is_an_error_not_nothing_to_do(): void {
		$this->assertNull( sgs_trust_bar_ticker_rows( null, '' ) );
		$this->assertNull( sgs_trust_bar_ticker_rows( array(), 'Table wp_posts is marked as crashed' ) );
		$this->assertSame( array(), sgs_trust_bar_ticker_rows( array(), '' ), 'control: an empty answer with no error is no posts' );
	}

	public function test_a_missing_or_wrong_data_file_refuses(): void {
		$this->assertNull( sgs_trust_bar_ticker_layer( __DIR__ . '/no-such-file.json' ) );
		$tmp = tempnam( sys_get_temp_dir(), 'tb' );
		file_put_contents( $tmp, '{"effect":"tilt"}' );
		$this->assertNull( sgs_trust_bar_ticker_layer( $tmp ) );
		unlink( $tmp );
	}
}

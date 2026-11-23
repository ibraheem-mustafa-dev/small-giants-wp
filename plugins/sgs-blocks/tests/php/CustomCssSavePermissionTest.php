<?php
/**
 * Custom CSS on save (Spec 32 FR-32-30): a save by a user who may not use Custom CSS keeps every block's three
 * attributes exactly as stored; anyone who may edit the post may use the control, and a site can narrow that with
 * `sgs_custom_css_capability`; a `url()` that points off-site is refused by the scoper.
 *
 * The saving user is a Shop-manager-like role (`edit_pages`, `edit_others_pages`, `edit_theme_options`, no
 * `unfiltered_html`, so no `edit_css`), as WooCommerce's Shop manager is on a single site (read from a WordPress 7.1
 * mirror: shop_manager unfiltered_html=false and edit_theme_options=true; editor unfiltered_html=true; core maps
 * `edit_css` to `unfiltered_html`).
 *
 * Run with: php vendor/phpunit/phpunit/phpunit tests/php/CustomCssSavePermissionTest.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

namespace SGS\Blocks\Tests;

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Custom_Css_Scoper;

use function SGS\Blocks\render_custom_css;
use function SGS\Blocks\sgs_custom_css_block_tokens;
use function SGS\Blocks\sgs_custom_css_editor_settings;
use function SGS\Blocks\sgs_custom_css_keep_stored_on_save;
use function SGS\Blocks\sgs_custom_css_user_can;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class CustomCssSavePermissionTest extends TestCase {

	private const SHOP_MANAGER = array( 'read', 'edit_posts', 'edit_pages', 'edit_others_pages', 'edit_published_pages', 'edit_theme_options' );
	private const EDITOR       = array( 'read', 'edit_posts', 'edit_pages', 'edit_others_pages', 'edit_published_pages', 'unfiltered_html' );
	private const CONTRIBUTOR  = array( 'read', 'edit_posts' );

	protected function setUp(): void {
		$GLOBALS['sgs_t'] = array(
			'filters' => array(),
			'caps'    => self::SHOP_MANAGER,
			'user_id' => 5,
			'posts'   => array(),
		);
		require_once __DIR__ . '/fixtures/custom-css-wp-stubs.php';
		require_once dirname( __DIR__, 2 ) . '/includes/custom-css.php';
	}

	private function as_role( array $caps ): void {
		$GLOBALS['sgs_t']['caps'] = $caps;
	}

	/** Narrow Custom CSS to WordPress's own rule, as a site may with the filter. */
	private function narrow_to_edit_css(): void {
		\add_filter( 'sgs_custom_css_capability', static fn() => 'edit_css' );
	}

	/** Store a page (ID 7, written by another user) holding `$content`. */
	private function store( string $content, int $id = 7 ): void {
		$GLOBALS['sgs_t']['posts'][ $id ] = (object) array(
			'ID'                    => $id,
			'post_type'             => 'page',
			'post_author'           => 1,
			'post_content'          => $content,
			'post_content_filtered' => '',
		);
	}

	private function block( string $name, array $attrs, string $inner = '' ): string {
		$json = empty( $attrs ) ? '' : \serialize_block_attributes( $attrs ) . ' ';
		return '<!-- wp:' . $name . ' ' . $json . '-->' . $inner . '<!-- /wp:' . $name . ' -->';
	}

	private function css( string $id, string $css, string $note = '' ): array {
		$attrs = array(
			'sgsCustomCss'   => $css,
			'sgsCustomCssId' => $id,
		);
		if ( '' !== $note ) {
			$attrs['sgsCustomCssNote'] = $note;
		}
		return $attrs;
	}

	/** Run a save the way wp_insert_post() does: slashed content through the `wp_insert_post_data` filter. */
	private function save( string $content, int $id = 7, array $extra = array() ): string {
		$data = array_merge(
			array(
				'post_type'             => 'page',
				'post_content'          => addslashes( $content ),
				'post_content_filtered' => '',
			),
			$extra
		);
		$out  = \apply_filters( 'wp_insert_post_data', $data, array( 'ID' => $id ) );
		return stripslashes( $out['post_content'] );
	}

	/** Each block's Custom CSS attributes keyed by instance key, as JSON text, so a comparison is byte for byte. */
	private function css_by_id( string $content ): array {
		$found = array();
		foreach ( sgs_custom_css_block_tokens( $content ) as $token ) {
			$id = $token['attrs']['sgsCustomCssId'] ?? null;
			if ( null !== $id ) {
				$found[ $id ][] = json_encode( array_intersect_key( $token['attrs'], array_flip( \SGS\Blocks\SGS_CUSTOM_CSS_ATTRS ) ) );
			}
		}
		return $found;
	}

	private function page(): string {
		$inner = $this->block( 'paragraph', $this->css( 'inner0001', '&selector { color: green; }' ), '<p>Hello</p>' );
		$group = $this->block( 'group', array_merge( array( 'tagName' => 'section' ), $this->css( 'group0001', '&selector > p { margin: 0 }', 'Spacing from the draft' ) ), $inner );
		$side  = $this->block( 'heading', $this->css( 'head0001', '&selector { letter-spacing: 2px; }' ), '<h2>Title</h2>' );
		$plain = $this->block( 'paragraph', array(), '<p>No rule</p>' );
		return $group . "\n\n" . $side . "\n\n" . $plain;
	}

	// Ruling 1: a save never removes or changes Custom CSS the user may not write.

	public function test_the_shop_manager_role_cannot_use_edit_css_but_may_edit_the_page(): void {
		$this->store( $this->page() );
		$this->assertFalse( \current_user_can( 'edit_css' ) );
		$this->assertTrue( \current_user_can( 'edit_post', 7 ) );
	}

	public function test_a_save_with_the_default_capability_passes_everything_through_unchanged(): void {
		$stored = $this->page();
		$this->store( $stored );
		$edited = str_replace( 'Hello', 'Hello again', $stored );
		$this->assertSame( $edited, $this->save( $edited ), 'anyone who may edit the post may use Custom CSS' );
	}

	public function test_a_save_by_a_user_who_may_not_edit_css_keeps_every_blocks_css_byte_for_byte(): void {
		$stored = $this->page();
		$this->store( $stored );
		$this->narrow_to_edit_css();

		// The editor sends the page back with a text edit and no change to the rules.
		$sent  = str_replace( array( 'Hello', 'No rule' ), array( 'Hello again', 'Some rule-free text' ), $stored );
		$saved = $this->save( $sent );

		$this->assertSame( $sent, $saved, 'an unchanged rule is not rewritten' );
		$this->assertSame( $this->css_by_id( $stored ), $this->css_by_id( $saved ) );
		$this->assertStringContainsString( 'Hello again', $saved, 'the rest of the save goes through' );
	}

	public function test_incoming_changes_new_rules_and_removals_are_ignored_while_the_rest_of_the_save_goes_through(): void {
		$stored = $this->page();
		$this->store( $stored );
		$this->narrow_to_edit_css();

		$inner = $this->block( 'paragraph', $this->css( 'inner0001', '&selector { color: hotpink }' ), '<p>Hello edited</p>' ); // Changed.
		$group = $this->block( 'group', array( 'tagName' => 'section' ), $inner ); // Its own rule, note and id removed.
		$side  = $this->block( 'heading', array(), '<h2>Title edited</h2>' ); // Removed, id and all.
		$added = $this->block( 'paragraph', $this->css( 'new00001', '&selector { display: none }' ), '<p>New rule</p>' ); // A new rule on a block that had none.
		$saved = $this->save( $group . "\n\n" . $side . "\n\n" . $added );
		$css   = $this->css_by_id( $saved );
		$was   = $this->css_by_id( $stored );

		$this->assertSame( $was['inner0001'], $css['inner0001'], 'a changed rule is put back' );
		$this->assertSame( $was['group0001'], $css['group0001'], 'a removed rule and note are put back' );
		$this->assertSame( $was['head0001'], $css['head0001'], 'a rule removed with its id is put back on the same block' );
		$this->assertArrayNotHasKey( 'new00001', $css, 'a new rule on a block that had none is dropped' );
		$this->assertStringContainsString( '<h2>Title edited</h2>', $saved );
		$this->assertStringContainsString( '<p>New rule</p>', $saved );
	}

	public function test_a_block_moved_within_the_post_or_nested_deeper_keeps_its_rule(): void {
		$stored = $this->page();
		$this->store( $stored );
		$this->narrow_to_edit_css();

		$inner = $this->block( 'paragraph', $this->css( 'inner0001', '&selector { color: hotpink }' ), '<p>Hello</p>' );
		$side  = $this->block( 'heading', $this->css( 'head0001', '' ), '<h2>Title</h2>' );
		$group = $this->block( 'group', array( 'tagName' => 'section' ), $side . $inner ); // The heading moves into the group.
		$wrap  = $this->block( 'group', array(), $group ); // And the group is nested a level deeper.
		$css   = $this->css_by_id( $this->save( $wrap ) );

		foreach ( array( 'inner0001', 'head0001' ) as $id ) {
			$this->assertSame( $this->css_by_id( $stored )[ $id ], $css[ $id ], "$id keeps its rule after the move" );
		}
	}

	public function test_a_duplicated_block_does_not_gain_the_rule_twice(): void {
		$this->store( $this->page() );
		$this->narrow_to_edit_css();

		$copy = $this->block( 'heading', $this->css( 'head0001', '&selector { letter-spacing: 2px; }' ), '<h2>Title</h2>' );
		$this->assertCount( 1, $this->css_by_id( $this->save( $copy . $copy ) )['head0001'] );
	}

	public function test_blocks_that_share_one_key_in_stored_content_each_keep_their_own_rule(): void {
		// The cloning route writes one key on several blocks (Mama's home page holds `herocardtop` three times).
		$one    = $this->block( 'button', $this->css( 'herolink', '&selector { color: red }' ), 'a' );
		$two    = $this->block( 'button', $this->css( 'herolink', '&selector { color: blue }' ), 'b' );
		$stored = $one . "

" . $two;
		$this->store( $stored );
		$this->narrow_to_edit_css();

		$this->assertSame( $stored, $this->save( $stored ), 'saved as it stands, nothing moves' );
		$swapped = $this->save( $two . "

" . $one );
		$this->assertSame( $two . "

" . $one, $swapped, 'a swap keeps each block with its own rule' );
		$this->assertSame( array( 'herolink' ), array_keys( $this->css_by_id( $swapped ) ) );
		$this->assertCount( 2, $this->css_by_id( $swapped )['herolink'] );
	}

	public function test_a_stored_rule_with_no_id_is_kept_through_its_blocks_other_attributes(): void {
		$this->store( $this->block( 'paragraph', array( 'align' => 'center', 'sgsCustomCss' => '&selector { color: red }' ), '<p>Old</p>' ) );
		$this->narrow_to_edit_css();

		$saved = $this->save( $this->block( 'paragraph', array( 'align' => 'center' ), '<p>New</p>' ) );
		$attrs = sgs_custom_css_block_tokens( $saved )[0]['attrs'];
		$this->assertSame( '&selector { color: red }', $attrs['sgsCustomCss'] );
		$this->assertSame( 'center', $attrs['align'] );
		$this->assertStringContainsString( '<p>New</p>', $saved );
	}

	public function test_a_user_who_may_not_edit_the_page_at_all_cannot_change_its_css_either(): void {
		$stored = $this->page();
		$this->store( $stored );
		$this->as_role( self::CONTRIBUTOR );

		$sent = $this->block( 'paragraph', $this->css( 'inner0001', '&selector { color: hotpink }' ), '<p>Hello</p>' );
		$css  = $this->css_by_id( $this->save( $sent ) );
		$this->assertSame( $this->css_by_id( $stored )['inner0001'], $css['inner0001'] );
	}

	public function test_the_editor_role_keeps_working_under_the_wordpress_rule(): void {
		$this->store( $this->page() );
		$this->as_role( self::EDITOR );
		$this->narrow_to_edit_css();
		$sent = $this->block( 'paragraph', $this->css( 'inner0001', '&selector { color: hotpink }' ), '<p>Hello</p>' );
		$this->assertSame( $sent, $this->save( $sent ), 'an Editor holds unfiltered_html, so edit_css, and writes freely' );
	}

	public function test_the_first_autosave_of_a_post_is_matched_against_the_post_it_autosaves(): void {
		$stored = $this->page();
		$this->store( $stored );
		$this->narrow_to_edit_css();

		$saved = $this->save( $this->block( 'heading', array(), '<h2>Title</h2>' ), 0, array( 'post_type' => 'revision', 'post_parent' => 7 ) );
		$this->assertSame( $this->css_by_id( $stored )['head0001'], $this->css_by_id( $saved )['head0001'] );
	}

	public function test_a_new_post_gets_no_rule_from_a_user_the_site_narrowed_out(): void {
		$this->narrow_to_edit_css();
		$sent = $this->block( 'paragraph', $this->css( 'new00001', '&selector { color: red }' ), '<p>x</p>' );
		$this->assertSame( $this->block( 'paragraph', array(), '<p>x</p>' ), $this->save( $sent, 0 ) );
	}

	public function test_a_new_post_by_anyone_who_may_create_it_keeps_its_rule(): void {
		$sent = $this->block( 'paragraph', $this->css( 'new00001', '&selector { color: red }' ), '<p>x</p>' );
		$this->assertSame( $sent, $this->save( $sent, 0 ) );
	}

	public function test_the_filtered_content_field_is_handled_the_same_way(): void {
		$stored = $this->page();
		$this->store( $stored );
		$GLOBALS['sgs_t']['posts'][7]->post_content_filtered = $stored;
		$this->narrow_to_edit_css();
		$sent = $this->block( 'paragraph', $this->css( 'inner0001', '&selector { color: hotpink }' ), '<p>Hello</p>' );
		$out  = sgs_custom_css_keep_stored_on_save(
			array(
				'post_type'             => 'page',
				'post_content'          => addslashes( $stored ),
				'post_content_filtered' => addslashes( $sent ),
			),
			array( 'ID' => 7 )
		);
		$this->assertSame( $this->css_by_id( $stored )['inner0001'], $this->css_by_id( stripslashes( $out['post_content_filtered'] ) )['inner0001'] );
	}

	public function test_content_without_a_custom_css_attribute_anywhere_is_returned_untouched(): void {
		$this->store( $this->block( 'paragraph', array(), '<p>a</p>' ) );
		$this->narrow_to_edit_css();
		$sent = "<!-- wp:paragraph {\"align\":\"center\"} -->\n<p>b</p>\n<!-- /wp:paragraph -->\n\n<!-- wp:separator /-->";
		$this->assertSame( $sent, $this->save( $sent ) );
	}

	public function test_a_rule_sent_on_a_void_block_that_had_none_is_removed_cleanly(): void {
		$this->store( '<!-- wp:separator /-->' );
		$this->narrow_to_edit_css();
		$sent = '<!-- wp:separator {"sgsCustomCss":"&selector{color:red}","sgsCustomCssId":"abcd1234"} /-->';
		$this->assertSame( '<!-- wp:separator /-->', $this->save( $sent ) );
	}

	public function test_a_rule_restored_onto_a_block_that_has_no_attributes_is_inserted_cleanly(): void {
		$attrs  = \serialize_block_attributes( $this->css( 'abcd1234', '&selector{color:red}' ) );
		$this->narrow_to_edit_css();
		foreach ( array(
			'<!-- wp:separator ' . $attrs . ' /-->'                                    => '<!-- wp:separator /-->',
			'<!-- wp:group ' . $attrs . ' -->x<!-- /wp:group -->'                      => '<!-- wp:group -->x<!-- /wp:group -->',
		) as $stored => $sent ) {
			$this->store( $stored );
			$this->assertSame( $stored, $this->save( $sent ) );
		}
	}

	public function test_a_post_write_goes_through_wp_insert_post_data_not_content_save_pre(): void {
		$this->assertArrayNotHasKey( 'content_save_pre', $GLOBALS['sgs_t']['filters'] );
		$this->assertArrayHasKey( 'wp_insert_post_data', $GLOBALS['sgs_t']['filters'] );
	}

	// Ruling 2: anyone who may edit the post may use the control; the capability is filterable.

	public function test_the_default_capability_is_the_right_to_edit_this_post(): void {
		$this->store( $this->page() );
		$this->assertTrue( sgs_custom_css_user_can( 7, 'page' ) );
		$this->as_role( self::CONTRIBUTOR );
		$this->assertFalse( sgs_custom_css_user_can( 7, 'page' ) );
	}

	public function test_a_site_narrows_the_capability_with_the_filter(): void {
		$this->store( $this->page() );
		$this->narrow_to_edit_css();
		$this->assertFalse( sgs_custom_css_user_can( 7, 'page' ) );
		$this->as_role( self::EDITOR );
		$this->assertTrue( sgs_custom_css_user_can( 7, 'page' ) );
	}

	public function test_a_filter_returning_nothing_usable_denies(): void {
		$this->store( $this->page() );
		\add_filter( 'sgs_custom_css_capability', static fn() => false );
		$this->assertFalse( sgs_custom_css_user_can( 7, 'page' ) );
	}

	public function test_the_editor_is_told_whether_the_control_is_read_only_and_which_hosts_a_url_may_name(): void {
		$this->store( $this->page() );
		$context  = (object) array( 'post' => \get_post( 7 ) );
		$settings = sgs_custom_css_editor_settings( array( 'a' => 1 ), $context );
		$this->assertTrue( $settings['sgsCustomCssAccess']['canEdit'] );
		$this->assertSame( array( 'site.test' ), $settings['sgsCustomCssAccess']['siteHosts'] );
		$this->narrow_to_edit_css();
		$this->assertFalse( sgs_custom_css_editor_settings( array(), $context )['sgsCustomCssAccess']['canEdit'] );
		$this->assertArrayHasKey( 'sgsCustomCssAccess', sgs_custom_css_editor_settings( array(), null ), 'the site editor has no post' );
	}

	// Ruling 2's precondition: the scoper refuses a url() that points outside the site.

	public function test_the_page_prints_a_rule_whose_url_is_on_the_site_and_drops_one_that_is_not(): void {
		$on  = array( 'attrs' => $this->css( 'on000001', '&selector { background: url(https://site.test/wp-content/uploads/a.png) }' ) );
		$off = array( 'attrs' => $this->css( 'off00001', '&selector { background: url(https://evil.test/a.png) }' ) );
		$rel = array( 'attrs' => $this->css( 'rel00001', '&selector { background: url(/wp-content/uploads/a.png) }' ) );
		$this->assertStringContainsString( '<style id="sgs-custom-css-sgs-c-on000001">', render_custom_css( '<div class="x"></div>', $on ) );
		$this->assertStringContainsString( '<style id="sgs-custom-css-sgs-c-rel00001">', render_custom_css( '<div class="x"></div>', $rel ) );
		$this->assertSame( '<div class="x"></div>', render_custom_css( '<div class="x"></div>', $off ) );
	}

	public function test_the_refusal_lists_its_reason_for_the_field(): void {
		$result = Custom_Css_Scoper::scope( '&selector { background: url(https://evil.test/a.png) }', '.s.s', array( 'site.test' ) );
		$this->assertSame( '', $result['css'] );
		$this->assertSame( array( 'off-site url: &selector' ), $result['refused'] );
	}

	public function test_what_the_scoper_allows_is_relative_site_host_and_inline_images_only(): void {
		foreach ( array( 'img/a.png', '/up/a.png', 'https://site.test/a.png', '//site.test/a.png', 'data:image/png;base64,AAAA' ) as $allowed ) {
			$this->assertSame( array(), Custom_Css_Scoper::scope( "&selector { background: url($allowed) }", '.s.s', array( 'site.test' ) )['refused'], $allowed );
		}
		foreach ( array( 'https://evil.test/a.png', '//evil.test/a.png', 'https://site.test.evil.test/a.png', 'data:text/html,x', 'ftp://site.test/a.png' ) as $refused ) {
			$this->assertSame( array( 'off-site url: &selector' ), Custom_Css_Scoper::scope( "&selector { background: url($refused) }", '.s.s', array( 'site.test' ) )['refused'], $refused );
		}
		$this->assertSame( array( 'off-site url: &selector' ), Custom_Css_Scoper::scope( '&selector { background: url(https://site.test/a.png) }', '.s.s' )['refused'], 'with no site host given, no absolute URL may stay' );
	}
}

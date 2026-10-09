<?php
/**
 * sgs/icon visible label (showLabel) and the sgs/social-icons group label defaults: the label is real text inside the
 * link and so the link's name, the visually hidden name is not printed as well, " (opens in new tab)" stays visually
 * hidden, the position classes, hostile label text is escaped, the label colours and gap print only when set, and the
 * row's switch, position, colours and typography reach the children (an icon's own value wins).
 *
 * Renders run in child processes (tests/php/fixtures/icon-render-child.php and social-icons-render-child.php) like
 * IconRenderTest and SocialIconsRenderTest. Negative control: test_negative_control_hidden_name_probe_sees_a_hidden_name
 * proves the "no hidden name" probe sees one on an unlabelled link, so its "absent" verdicts are not vacuous.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class IconLabelTest extends TestCase {

	private const SITE_INFO = array(
		'phone'   => '0121 729 8233',
		'socials' => array(
			'whatsapp'  => '07700 900123',
			'instagram' => 'https://instagram.com/shop',
		),
	);

	/**
	 * Run a child renderer and return its HTML.
	 *
	 * @param string $child Fixture file name.
	 * @param array  $spec  The child's JSON spec.
	 * @return string Rendered HTML.
	 */
	private function run_child( string $child, array $spec ): string {
		$file = tempnam( sys_get_temp_dir(), 'sgslbl' );
		file_put_contents( $file, json_encode( $spec, JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __DIR__ . '/fixtures/' . $child ) . ' ' . escapeshellarg( $file ) . ' 2>&1' );
		} finally {
			@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'child did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render failed: ' . ( $decoded['error'] ?? $out ) );
		return (string) $decoded['html'];
	}

	/**
	 * One icon.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $bind       Site Info key linkUrl is bound to.
	 * @return string Rendered HTML.
	 */
	private function icon( array $attributes, string $bind = '' ): string {
		return $this->run_child(
			'icon-render-child.php',
			array(
				'attributes' => (object) $attributes,
				'bind'       => $bind,
				'site_info'  => self::SITE_INFO,
			)
		);
	}

	/**
	 * A social-icons row.
	 *
	 * @param array $attributes Row attributes.
	 * @param array $children   List of [ attributes, bind ].
	 * @return string Rendered HTML.
	 */
	private function row( array $attributes, array $children ): string {
		return $this->run_child(
			'social-icons-render-child.php',
			array(
				'attributes' => (object) $attributes,
				'children'   => array_map(
					static fn( $c ) => array(
						'attributes' => (object) $c[0],
						'bind'       => $c[1],
					),
					$children
				),
				'site_info'  => self::SITE_INFO,
			)
		);
	}

	/** The visible label's text, or null. */
	private function visible( string $html ): ?string {
		return preg_match( '#<span class="sgs-icon__label-text">([^<]*)</span>#', $html, $m ) ? html_entity_decode( $m[1], ENT_QUOTES ) : null;
	}

	/** The visually hidden span's text, or null. */
	private function hidden( string $html ): ?string {
		return preg_match( '#<span class="sgs-icon__label">([^<]*)</span>#', $html, $m ) ? html_entity_decode( $m[1], ENT_QUOTES ) : null;
	}

	/** The link's inner HTML, or ''. */
	private function link_inner( string $html ): string {
		return preg_match( '#<a class="sgs-icon__link"[^>]*>(.*)</a>#s', $html, $m ) ? $m[1] : '';
	}

	/** The root element's class attribute. */
	private function root_classes( string $html ): string {
		return preg_match( '#<div [^>]*class="(sgs-icon [^"]*)"#', $html, $m ) ? $m[1] : '';
	}

	public function test_label_is_link_text_and_no_hidden_name_is_printed(): void {
		$html  = $this->icon(
			array(
				'showLabel' => true,
				'linkUrl'   => 'https://example.test/shop',
				'ariaLabel' => 'Our shop',
			)
		);
		$inner = $this->link_inner( $html );
		$this->assertStringContainsString( '<span class="sgs-icon__label-text">Our shop</span>', $inner, 'the visible label sits inside the link' );
		$this->assertNull( $this->hidden( $html ), 'no visually hidden name beside a visible label' );
		$this->assertSame( 1, substr_count( $html, 'Our shop' ), 'the name appears once: no double announcement' );
		$this->assertMatchesRegularExpression( '#<span class="sgs-icon__svg" aria-hidden="true">#', $inner, 'the glyph stays hidden' );
		$this->assertDoesNotMatchRegularExpression( '#<a [^>]*aria-label=#', $html, 'the link takes its name from its text' );
	}

	public function test_negative_control_hidden_name_probe_sees_a_hidden_name(): void {
		$html = $this->icon(
			array(
				'linkUrl'   => 'https://example.test/shop',
				'ariaLabel' => 'Our shop',
			)
		);
		$this->assertSame( 'Our shop', $this->hidden( $html ) );
		$this->assertNull( $this->visible( $html ) );
		$this->assertStringNotContainsString( 'sgs-icon--has-label', $this->root_classes( $html ) );
	}

	public function test_new_tab_warning_stays_visually_hidden_beside_a_label(): void {
		$html = $this->icon(
			array(
				'showLabel'  => true,
				'labelText'  => 'Shop',
				'linkUrl'    => 'https://example.test/shop',
				'linkTarget' => '_blank',
			)
		);
		$this->assertSame( 'Shop', $this->visible( $html ) );
		$this->assertSame( ' (opens in new tab)', $this->hidden( $html ) );
		$this->assertMatchesRegularExpression( '#sgs-icon__label-text">Shop</span><span class="sgs-icon__label">#', $html, 'read straight after the label' );
	}

	public function test_label_text_falls_back_through_the_name_chain(): void {
		$this->assertSame(
			'Follow us on Instagram',
			$this->visible(
				$this->icon(
					array(
						'showLabel'  => true,
						'iconSource' => 'brand',
						'brandName'  => 'instagram',
					),
					'socials.instagram'
				)
			)
		);
		$this->assertSame(
			'Instagram',
			$this->visible(
				$this->icon(
					array(
						'showLabel'  => true,
						'iconSource' => 'brand',
						'brandName'  => 'instagram',
						'ariaLabel'  => 'Instagram',
					),
					'socials.instagram'
				)
			)
		);
		$this->assertSame(
			'Call',
			$this->visible(
				$this->icon(
					array(
						'showLabel' => true,
						'linkUrl'   => 'tel:+441217298233',
					)
				)
			)
		);
		$this->assertSame(
			'Insta',
			$this->visible(
				$this->icon(
					array(
						'showLabel' => true,
						'labelText' => '  Insta ',
						'ariaLabel' => 'Instagram',
						'linkUrl'   => 'https://instagram.com/x',
					)
				)
			)
		);
		// Nothing names it (a relative link, no label): no empty label element.
		$none = $this->icon(
			array(
				'showLabel' => true,
				'linkUrl'   => '/contact/',
			)
		);
		$this->assertNull( $this->visible( $none ) );
		$this->assertStringNotContainsString( 'sgs-icon--has-label', $this->root_classes( $none ) );
	}

	public function test_position_classes(): void {
		$base = array(
			'showLabel' => true,
			'labelText' => 'Shop',
			'linkUrl'   => 'https://example.test/shop',
		);
		$end  = $this->root_classes( $this->icon( $base ) );
		$this->assertStringContainsString( 'sgs-icon--has-label', $end );
		$this->assertStringNotContainsString( 'sgs-icon--label-', $end );
		$this->assertStringContainsString( 'sgs-icon--label-start', $this->root_classes( $this->icon( $base + array( 'labelPosition' => 'start' ) ) ) );
		$this->assertStringContainsString( 'sgs-icon--label-below', $this->root_classes( $this->icon( $base + array( 'labelPosition' => 'below' ) ) ) );
		$this->assertStringContainsString( 'sgs-icon--label-above', $this->root_classes( $this->icon( $base + array( 'labelPosition' => 'above' ) ) ) );
		$this->assertStringNotContainsString( 'sgs-icon--label-', $this->root_classes( $this->icon( $base + array( 'labelPosition' => 'sideways"><script>' ) ) ) );
	}

	public function test_hostile_label_text_is_escaped(): void {
		$html = $this->icon(
			array(
				'showLabel' => true,
				'labelText' => '<img src=x onerror=alert(1)>"</span><script>alert(2)</script>',
				'linkUrl'   => 'https://example.test/',
			)
		);
		$this->assertStringNotContainsString( '<img', $html );
		$this->assertStringNotContainsString( '<script', $html );
		$this->assertStringContainsString( '&lt;img src=x onerror=alert(1)&gt;', $html );
	}

	public function test_unlinked_label_is_text_not_an_image(): void {
		$html = $this->icon(
			array(
				'showLabel' => true,
				'labelText' => 'Free delivery',
				'ariaLabel' => 'Delivery',
			)
		);
		$this->assertMatchesRegularExpression( '#<span class="sgs-icon__inner"><span class="sgs-icon__shape">.*</span><span class="sgs-icon__label-text">Free delivery</span></span>#s', $html );
		$this->assertStringNotContainsString( 'role="img"', $html );
	}

	public function test_label_colours_gap_and_typography_print_only_when_set(): void {
		$plain = $this->icon(
			array(
				'showLabel' => true,
				'labelText' => 'Shop',
				'linkUrl'   => 'https://example.test/',
			)
		);
		$this->assertStringNotContainsString( '--sgs-icon-label', $plain );
		$this->assertStringNotContainsString( '__label-text{', $plain );
		$set = $this->icon(
			array(
				'showLabel'          => true,
				'labelText'          => 'Shop',
				'linkUrl'            => 'https://example.test/',
				'labelColour'        => 'text-inverse',
				'labelColourHover'   => '#ffffff',
				'labelGap'           => array(
					'desktop' => '12px',
					'mobile'  => '4px;}body{color:red',
				),
				'labelFontSize'      => array( 'desktop' => 13 ),
				'labelFontWeight'    => '500',
				'labelTextTransform' => 'uppercase',
			)
		);
		$this->assertStringContainsString( '--sgs-icon-label-colour:var(--wp--preset--color--text-inverse', $set );
		$this->assertStringContainsString( '--sgs-icon-label-colour-hover:#ffffff', $set );
		$this->assertStringContainsString( '--sgs-icon-label-gap:12px', $set );
		$this->assertStringNotContainsString( 'body{color:red', $set );
		$this->assertMatchesRegularExpression( '#\.sgs-icn-[0-9a-f]{8}\.wp-block-sgs-icon\.sgs-icon \.sgs-icon__label-text\{[^}]*font-size:13px#', $set );
		$this->assertMatchesRegularExpression( '#__label-text\{[^}]*font-weight:500#', $set );
		$this->assertStringContainsString( 'sgs-icon--own-label-colour', $this->root_classes( $set ) );
		$this->assertStringNotContainsString( 'style="', preg_replace( '#<style>.*?</style>#s', '', $set ), 'no inline style attribute' );
		// With the label off, its settings print nothing.
		$off = $this->icon(
			array(
				'labelColour'     => 'text-inverse',
				'labelGap'        => array( 'desktop' => '12px' ),
				'labelFontWeight' => '500',
				'linkUrl'         => 'https://example.test/',
			)
		);
		$this->assertStringNotContainsString( 'label-colour', $off );
		$this->assertStringNotContainsString( 'label-gap', $off );
	}

	public function test_label_gradient_paints_text_with_its_fallback(): void {
		$html = $this->icon(
			array(
				'showLabel'           => true,
				'labelText'           => 'Shop',
				'linkUrl'             => 'https://example.test/',
				'labelColourGradient' => 'linear-gradient(90deg,#ff0000 0%,#0000ff 100%)',
			)
		);
		$this->assertMatchesRegularExpression( '~\.sgs-icon__label-text\{background-image:linear-gradient\(90deg,#ff0000 0%,#0000ff 100%\);-webkit-background-clip:text;background-clip:text;color:transparent;\}~', $html );
		$this->assertStringContainsString( '@supports not ((background-clip:text) or (-webkit-background-clip:text))', $html );
	}

	public function test_row_switch_position_colours_and_typography_reach_children(): void {
		$html = $this->row(
			array(
				'childIconShowLabel'           => true,
				'childIconLabelPosition'       => 'below',
				'childIconLabelColour'         => 'text-inverse',
				'childIconLabelColourHover'    => 'accent',
				'childIconLabelFontSize'       => array( 'desktop' => 13 ),
				'childIconLabelFontWeight'     => '500',
				'childIconLabelColourGradient' => 'linear-gradient(90deg,#ff0000 0%,#0000ff 100%)',
			),
			array(
				array(
					array(
						'iconSource' => 'brand',
						'brandName'  => 'instagram',
						'ariaLabel'  => 'Instagram',
					),
					'socials.instagram',
				),
				array(
					array(
						'iconSource'    => 'brand',
						'brandName'     => 'whatsapp',
						'ariaLabel'     => 'WhatsApp',
						'labelPosition' => 'start',
						'labelColour'   => 'primary',
					),
					'socials.whatsapp',
				),
			)
		);
		$this->assertStringContainsString( '<span class="sgs-icon__label-text">Instagram</span>', $html, 'the row switch shows a child label' );
		$this->assertStringContainsString( '<span class="sgs-icon__label-text">WhatsApp</span>', $html );
		$this->assertSame( 1, preg_match_all( '#class="[^"]*sgs-icon--label-below#', $html ), 'the row position reaches the child left on end' );
		$this->assertSame( 1, preg_match_all( '#class="[^"]*sgs-icon--label-start#', $html ), 'an own position wins' );
		$this->assertStringContainsString( '--sgs-si-label-colour:var(--wp--preset--color--text-inverse', $html );
		$this->assertStringContainsString( '--sgs-si-label-colour-hover:var(--wp--preset--color--accent', $html );
		$this->assertMatchesRegularExpression( '#\.sgs-si-[0-9a-f]{8}\.sgs-social-icons \.sgs-icon__label-text\{[^}]*font-size:13px#', $html );
		$this->assertMatchesRegularExpression( '#\.sgs-icon:not\(\.sgs-icon--own-label-colour\) \.sgs-icon__label-text\{background-image:linear-gradient#', $html, 'the group gradient skips own colours' );
		$this->assertSame( 1, preg_match_all( '#class="[^"]*sgs-icon--own-label-colour#', $html ) );
		$this->assertStringNotContainsString( 'role="img"', $html );
	}

	public function test_row_default_above_reaches_a_child_left_on_end(): void {
		$html = $this->row(
			array(
				'childIconShowLabel'     => true,
				'childIconLabelPosition' => 'above',
			),
			array(
				array(
					array(
						'iconSource' => 'brand',
						'brandName'  => 'instagram',
						'ariaLabel'  => 'Instagram',
					),
					'socials.instagram',
				),
				array(
					array(
						'iconSource'    => 'brand',
						'brandName'     => 'whatsapp',
						'ariaLabel'     => 'WhatsApp',
						'labelPosition' => 'start',
					),
					'socials.whatsapp',
				),
			)
		);
		$this->assertSame( 1, preg_match_all( '#class="[^"]*sgs-icon--label-above#', $html ), 'the row position above reaches the child left on end' );
		$this->assertSame( 1, preg_match_all( '#class="[^"]*sgs-icon--label-start#', $html ), 'an own position still wins' );
	}

	public function test_row_without_the_switch_shows_no_labels(): void {
		$html = $this->row(
			array( 'childIconLabelPosition' => 'below' ),
			array(
				array(
					array(
						'iconSource' => 'brand',
						'brandName'  => 'instagram',
						'ariaLabel'  => 'Instagram',
					),
					'socials.instagram',
				),
			)
		);
		$this->assertStringNotContainsString( 'sgs-icon__label-text', $html );
		$this->assertStringNotContainsString( '--sgs-si-label', $html );
		$this->assertSame( 'Instagram', $this->hidden( $html ) );
	}

	public function test_icon_typography_out_ranks_the_row_rule(): void {
		// Own rule: .uid.wp-block-sgs-icon.sgs-icon .sgs-icon__label-text (0,4,0); row rule: .uid.sgs-social-icons .sgs-icon__label-text (0,3,0).
		$html = $this->row(
			array(
				'childIconShowLabel'     => true,
				'childIconLabelFontSize' => array( 'desktop' => 13 ),
			),
			array(
				array(
					array(
						'iconSource'    => 'brand',
						'brandName'     => 'instagram',
						'labelFontSize' => array( 'desktop' => 18 ),
					),
					'socials.instagram',
				),
			)
		);
		$this->assertMatchesRegularExpression( '#\.sgs-icn-[0-9a-f]{8}\.wp-block-sgs-icon\.sgs-icon \.sgs-icon__label-text\{[^}]*font-size:18px#', $html );
		$this->assertMatchesRegularExpression( '#\.sgs-si-[0-9a-f]{8}\.sgs-social-icons \.sgs-icon__label-text\{[^}]*font-size:13px#', $html );
	}

	public function test_stylesheet_keeps_the_target_and_paints_the_label(): void {
		$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/icon/style.css' );
		$this->assertMatchesRegularExpression( '#\.sgs-icon__link \{[^}]*min-inline-size: 44px;[^}]*min-block-size: 44px;#s', $css );
		$this->assertMatchesRegularExpression( '#\.sgs-icon--label-below \.sgs-icon__link,\s*\.sgs-icon--label-below \.sgs-icon__inner \{\s*flex-direction: column;#', $css );
		$this->assertMatchesRegularExpression( '#\.sgs-icon--label-above \.sgs-icon__link,\s*\.sgs-icon--label-above \.sgs-icon__inner \{\s*flex-direction: column-reverse;#', $css );
		$this->assertMatchesRegularExpression( '#\.sgs-icon--label-start \.sgs-icon__link,\s*\.sgs-icon--label-start \.sgs-icon__inner \{\s*flex-direction: row-reverse;#', $css );
		$this->assertMatchesRegularExpression( '#\.sgs-icon__label-text \{\s*color: var\(--sgs-icon-label-colour, var\(--sgs-si-label-colour, var\(--sgs-icon-colour,#', $css );
	}

	/** The icon's scoped class (`sgs-icn-` + 8 hex) from a one-icon row, or ''. */
	private function icon_uid_in_row( array $row_attributes ): string {
		$html = $this->row( $row_attributes, array( array( array( 'brandName' => 'instagram' ), 'socials.instagram' ) ) );
		return preg_match( '#class="sgs-icon [^"]*(sgs-icn-[0-9a-f]{8})#', $html, $m ) ? $m[1] : '';
	}

	public function test_icon_scope_class_differs_between_rows_with_different_group_settings(): void {
		$theme = $this->icon_uid_in_row( array( 'colourMode' => 'theme' ) );
		$brand = $this->icon_uid_in_row( array( 'colourMode' => 'brand' ) );
		$this->assertNotSame( '', $theme );
		$this->assertNotSame( '', $brand );
		$this->assertNotSame( $theme, $brand, 'two rows with different colour modes must not share the icon scope class' );
	}

	public function test_icon_scope_class_is_shared_by_identically_configured_rows(): void {
		$this->assertSame(
			$this->icon_uid_in_row( array( 'colourMode' => 'brand' ) ),
			$this->icon_uid_in_row( array( 'colourMode' => 'brand' ) )
		);
	}
}

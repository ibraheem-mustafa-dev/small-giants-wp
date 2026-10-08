<?php
/**
 * sgs/social-icons render (icon plan Phase B): the row is a list and every child icon a listitem; group defaults
 * print as --sgs-si-* only when set; a Links-unticked key and a blank Site Info key render nothing; the row renders
 * nothing when every child is hidden; the row's colour mode reaches children left on Automatic; the group shape,
 * background and border reach the children through context and an icon's own value wins.
 *
 * Renders run in a child process (tests/php/fixtures/social-icons-render-child.php) that hands each child the
 * context social-icons/block.json::providesContext declares. Negative control:
 * test_negative_control_probe_sees_a_planted_group_property proves the "printed only when set" probe sees a
 * group property when one is set, so its "absent" verdicts are not vacuous.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class SocialIconsRenderTest extends TestCase {

	private const SITE_INFO = array(
		'phone'   => '0121 729 8233',
		'socials' => array(
			'whatsapp'  => '07700 900123',
			'instagram' => 'https://instagram.com/shop',
		),
	);

	/**
	 * Render a row in a child process.
	 *
	 * @param array $attributes Row attributes.
	 * @param array $children   List of [ attributes, bind ].
	 * @return string Rendered HTML.
	 */
	private function render( array $attributes, array $children ): string {
		$spec = array(
			'attributes' => (object) $attributes,
			'children'   => array_map(
				static fn( $c ) => array(
					'attributes' => (object) $c[0],
					'bind'       => $c[1],
				),
				$children
			),
			'site_info'  => self::SITE_INFO,
		);
		$file = tempnam( sys_get_temp_dir(), 'sgssi' );
		file_put_contents( $file, json_encode( $spec, JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __DIR__ . '/fixtures/social-icons-render-child.php' ) . ' ' . escapeshellarg( $file ) . ' 2>&1' );
		} finally {
			@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'child did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render failed: ' . ( $decoded['error'] ?? $out ) );
		return (string) $decoded['html'];
	}

	/** The row's own scoped rule (the last <style>, printed by the row after its children). */
	private function row_css( string $html ): string {
		return preg_match( '#<style>([^<]*)</style><div [^>]*role="list"#', $html, $m ) ? $m[1] : '';
	}

	private static function bound( string $brand ): array {
		return array( 'iconSource' => 'brand', 'brandName' => $brand );
	}

	private function standard_children(): array {
		return array(
			array( self::bound( 'phone' ), 'phone' ),
			array( self::bound( 'whatsapp' ), 'socials.whatsapp' ),
			array( self::bound( 'instagram' ), 'socials.instagram' ),
		);
	}

	public function test_row_is_a_list_of_listitems_with_its_name(): void {
		$html = $this->render( array(), $this->standard_children() );
		$this->assertMatchesRegularExpression( '#<div [^>]*class="sgs-social-icons sgs-si-[0-9a-f]{8}" role="list" aria-label="Social media and contact"#', $html );
		$this->assertSame( 3, preg_match_all( '#<div [^>]*role="listitem"#', $html ) );
		$html = $this->render( array( 'ariaLabel' => 'Find us' ), $this->standard_children() );
		$this->assertStringContainsString( 'aria-label="Find us"', $html );
	}

	public function test_group_properties_print_only_when_set(): void {
		$css = $this->row_css( $this->render( array(), $this->standard_children() ) );
		$this->assertStringNotContainsString( '--sgs-si-', $css );
		$this->assertStringNotContainsString( 'gap:', $css );
	}

	public function test_negative_control_probe_sees_a_planted_group_property(): void {
		$css = $this->row_css(
			$this->render(
				array(
					'childIconSize'        => array( 'desktop' => '18px' ),
					'childIconShapeSize'   => array( 'desktop' => array( 'width' => '44px' ) ),
					'childIconColour'      => 'text',
					'childIconColourHover' => 'accent-text',
					'childIconBackground'  => 'surface-alt',
					'childIconBorderWidth' => array(
						'top'    => '1px',
						'right'  => '1px',
						'bottom' => '1px',
						'left'   => '1px',
					),
					'gap'                  => array(
						'desktop' => '10px',
						'mobile'  => '6px',
					),
					'rowAlign'             => 'center',
				),
				$this->standard_children()
			)
		);
		$this->assertStringContainsString( '--sgs-si-size:18px', $css );
		$this->assertStringContainsString( '--sgs-si-shape-w:44px', $css );
		$this->assertStringContainsString( '--sgs-si-colour:var(--wp--preset--color--text', $css );
		$this->assertStringContainsString( '--sgs-si-colour-hover:var(--wp--preset--color--accent-text', $css );
		$this->assertStringContainsString( '--sgs-si-bg:var(--wp--preset--color--surface-alt', $css );
		$this->assertStringContainsString( '--sgs-si-border-width:1px 1px 1px 1px;--sgs-si-border-style:solid', $css );
		$this->assertStringContainsString( 'gap:10px', $css );
		$this->assertStringContainsString( '@media(max-width:767px){.sgs-si-', $css );
		$this->assertStringContainsString( 'gap:6px', $css );
		$this->assertStringContainsString( 'justify-content:center', $css );
		$this->assertStringNotContainsString( '--sgs-si-shape-h', $css, 'height follows width while linked' );
	}

	/**
	 * Group gradients: the background through --sgs-si-bg-gradient, the glyph through one defs block and a stroke
	 * rule that skips icons with their own colour and filled marks; an icon's own background hides the group gradient.
	 */
	public function test_group_gradients_and_own_values(): void {
		$html = $this->render(
			array(
				'childIconShowBackground'  => true,
				'childIconBackground'      => 'surface',
				'childIconBackgroundHover' => 'primary',
				'childIconBackgroundGradient' => 'linear-gradient(90deg, #ff0000 0%, #0000ff 100%)',
				'childIconColourGradient'  => 'linear-gradient(90deg, #00ff00 0%, #000000 100%)',
			),
			array(
				array( self::bound( 'phone' ), 'phone' ),
				array( array_merge( self::bound( 'instagram' ), array( 'iconColour' => 'accent', 'backgroundColour' => 'surface-alt' ) ), 'socials.instagram' ),
				array( self::bound( 'whatsapp' ), 'socials.whatsapp' ),
			)
		);
		$css = $this->row_css( $html );
		$this->assertStringContainsString( '--sgs-si-bg-gradient:linear-gradient(90deg', $css );
		$this->assertStringContainsString( '--sgs-si-bg-hover-gradient:none', $css, 'a hover colour without a hover gradient clears the gradient' );
		$this->assertStringContainsString( ':not(.sgs-icon--own-colour):not(.sgs-icon--mark) .sgs-icon__svg svg{stroke:url(#sgs-si-', $css );
		$this->assertMatchesRegularExpression( '#<svg class="sgs-social-icons__defs" aria-hidden="true" focusable="false"><defs><linearGradient id="sgs-si-[0-9a-f]{8}-g"#', $html );
		$this->assertSame( 1, preg_match_all( '#class="[^"]*sgs-icon--own-colour#', $html ), 'instagram has its own colour' );
		$this->assertSame( 1, preg_match_all( '#class="[^"]*sgs-icon--mark#', $html ), 'the WhatsApp registry mark is filled' );
		$this->assertStringContainsString( '--sgs-icon-bg-image:none', $html, "instagram's own background hides the group gradient" );
	}

	/**
	 * The row's group colours beat a brand child's brand colours (CR6 P2-r): the row prints --sgs-si-*, the brand
	 * child prints only --sgs-icon-brand-* (no own --sgs-icon-* colour), and icon/style.css reads --sgs-si-* before
	 * --sgs-icon-brand-* in every slot, resting and hover.
	 */
	public function test_group_colours_beat_a_brand_childs_brand_colours(): void {
		$html = $this->render(
			array(
				'colourMode'                 => 'brand',
				'childIconShowBackground'    => true,
				'childIconBackground'        => 'surface-alt',
				'childIconColour'            => 'text',
				'childIconColourHover'       => 'accent-text',
				'childIconBorderColour'      => 'border',
				'childIconBorderColourHover' => 'border',
				'childIconBorderWidth'       => array(
					'top'    => '1px',
					'right'  => '1px',
					'bottom' => '1px',
					'left'   => '1px',
				),
			),
			array( array( self::bound( 'whatsapp' ), 'socials.whatsapp' ) )
		);
		$row = $this->row_css( $html );
		$this->assertStringContainsString( '--sgs-si-border-colour:var(--wp--preset--color--border', $row );
		$this->assertStringContainsString( 'sgs-icon--brand', $html, 'the child really is in brand colours' );
		$this->assertStringContainsString( '--sgs-icon-brand-border:', $html );
		$this->assertDoesNotMatchRegularExpression( '#--sgs-icon-(border-colour|colour|bg)(-hover)?:#', $html, 'the child sets no own colour' );

		$css   = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/icon/style.css' );
		$order = static function ( string $decl ) use ( $css ): array {
			preg_match_all( '#' . preg_quote( $decl, '#' ) . '\s*:\s*([^;]+);#', $css, $m );
			return $m[1];
		};
		$checked = 0;
		foreach ( array( 'border-color', 'color', 'background-color' ) as $property ) {
			foreach ( $order( "\n\t" . $property ) as $value ) {
				if ( false === strpos( $value, '--sgs-icon-brand-' ) ) {
					continue;
				}
				$si    = strpos( $value, '--sgs-si-' );
				$brand = strpos( $value, '--sgs-icon-brand-' );
				$this->assertNotFalse( $si, "$property chain reads a group default: $value" );
				$this->assertLessThan( $brand, $si, "$property: the group default comes before the brand colour in $value" );
				++$checked;
			}
		}
		$this->assertGreaterThanOrEqual( 6, $checked, 'every resting and hover colour chain was checked' );
	}

	public function test_hostile_group_values_never_reach_the_css(): void {
		$css = $this->row_css(
			$this->render(
				array(
					'childIconSize'   => array( 'desktop' => '18px;}body{color:red' ),
					'gap'             => array( 'desktop' => 'calc(1px + 1px)' ),
					'childIconColour' => 'red;}body{x:y',
				),
				$this->standard_children()
			)
		);
		$this->assertStringNotContainsString( 'body{', $css );
		$this->assertStringNotContainsString( '--sgs-si-size', $css );
		$this->assertStringNotContainsString( 'gap:', $css );
	}

	public function test_unticked_key_and_blank_key_render_nothing(): void {
		$children   = $this->standard_children();
		$children[] = array( self::bound( 'tiktok' ), 'socials.tiktok' );
		$html       = $this->render( array( 'hiddenLinks' => array( 'socials.whatsapp' ) ), $children );
		$this->assertSame( 2, preg_match_all( '#role="listitem"#', $html ), 'phone and instagram only' );
		$this->assertStringNotContainsString( 'wa.me', $html );
		$this->assertStringNotContainsString( 'tiktok', strtolower( $html ) );
		$this->assertStringContainsString( 'href="tel:', $html );
	}

	public function test_row_renders_nothing_when_every_child_is_hidden(): void {
		$html = $this->render(
			array( 'hiddenLinks' => array( 'phone', 'socials.whatsapp' ) ),
			array(
				array( self::bound( 'phone' ), 'phone' ),
				array( self::bound( 'whatsapp' ), 'socials.whatsapp' ),
				array( self::bound( 'tiktok' ), 'socials.tiktok' ),
			)
		);
		$this->assertSame( '', trim( $html ) );
	}

	public function test_row_colour_mode_reaches_icons_left_on_automatic(): void {
		$auto = $this->render( array(), array( array( self::bound( 'whatsapp' ), 'socials.whatsapp' ) ) );
		$this->assertStringContainsString( 'sgs-icon--brand', $auto, 'automatic: a brand key gets brand colours' );
		$theme = $this->render( array( 'colourMode' => 'theme' ), array( array( self::bound( 'whatsapp' ), 'socials.whatsapp' ) ) );
		$this->assertStringNotContainsString( 'sgs-icon--brand', $theme, 'the row says theme' );
		$own = $this->render(
			array( 'colourMode' => 'theme' ),
			array( array( array_merge( self::bound( 'whatsapp' ), array( 'colourMode' => 'brand' ) ), 'socials.whatsapp' ) )
		);
		$this->assertStringContainsString( 'sgs-icon--brand', $own, "the icon's own mode wins" );
	}

	public function test_group_shape_background_and_border_reach_children_and_own_values_win(): void {
		$html = $this->render(
			array(
				'colourMode'              => 'theme',
				'childIconShape'          => 'circle',
				'childIconShowBackground' => true,
				'childIconBorderWidth'    => array( 'top' => '1px' ),
			),
			array(
				array( self::bound( 'phone' ), 'phone' ),
				array(
					array_merge(
						self::bound( 'instagram' ),
						array(
							'shape'       => 'pill',
							'borderWidth' => array( 'top' => '2px' ),
						)
					),
					'socials.instagram',
				),
			)
		);
		$this->assertSame( 2, preg_match_all( '#sgs-icon--has-bg#', $html ) );
		$this->assertSame( 1, preg_match_all( '#sgs-icon--shape-circle#', $html ), 'phone takes the row shape' );
		$this->assertSame( 1, preg_match_all( '#sgs-icon--shape-pill#', $html ), 'instagram keeps its own' );
		$this->assertSame( 1, preg_match_all( '#sgs-icon--group-border#', $html ), 'only the icon without its own border' );
	}

	public function test_outside_a_row_an_icon_is_not_a_listitem(): void {
		$file = tempnam( sys_get_temp_dir(), 'sgsicon' );
		file_put_contents(
			$file,
			json_encode(
				array(
					'attributes' => (object) array( 'ariaLabel' => 'Star' ),
					'bind'       => '',
					'site_info'  => self::SITE_INFO,
				),
				JSON_THROW_ON_ERROR
			)
		);
		$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __DIR__ . '/fixtures/icon-render-child.php' ) . ' ' . escapeshellarg( $file ) . ' 2>&1' );
		@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		$html = (string) ( json_decode( $out, true )['html'] ?? '' );
		$this->assertStringContainsString( 'role="img"', $html );
		$this->assertStringNotContainsString( 'listitem', $html );
	}
}

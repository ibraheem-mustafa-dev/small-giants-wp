<?php
/**
 * Pins what includes/helpers-button-style.php::sgs_button_element_style_css prints for every existing caller.
 *
 * The callers are the choice-flow Back button, the form submit, previous and next buttons, the google-reviews write-review,
 * see-all and arrow buttons, the modal close button, the product-card CTA (typed and bound markup, and the legacy scalar
 * border and size shape) and the nav-drawer chrome button. Each test calls the function with that caller's prefix, selector
 * and flags and one realistic attribute set, and compares the exact string. The built-in button kit
 * (sgs_button_kit_css) is additive, so every string here must stay byte for byte the same before and after it.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter ButtonElementStyleCallersPinTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class ButtonElementStyleCallersPinTest extends TestCase {

	/**
	 * The exact CSS each caller's call prints today, keyed by caller.
	 */
	private const EXPECTED = array(
		'choice-flow back' =>
			'.u .sgs-choice-flow__nav-back{background-color:var(--wp--preset--color--primary, currentColor);color:#ffffff;border-color:var(--wp--preset--color--accent, currentColor);border-style:dashed;border-width:2px 2px 2px 2px;border-top-left-radius:4px;border-bottom-right-radius:8px;font-weight:600;line-height:1.4;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;width:100%;}.u .sgs-choice-flow__nav-back.sgs-pressed,:where(:root:not(.sgs-touch-input)) .u .sgs-choice-flow__nav-back:hover{background-color:#112233;color:var(--wp--preset--color--surface, currentColor);border-color:#ff0000;}.u .sgs-choice-flow__nav-back:focus-visible{background-color:#112233;color:var(--wp--preset--color--surface, currentColor);border-color:#ff0000;}',
		'form submit' =>
			'.sgs-form-ab12 .sgs-form__button--submit{border-color:var(--wp--preset--color--accent, currentColor);border-style:dashed;border-width:2px 2px 2px 2px;border-top-left-radius:4px;border-bottom-right-radius:8px;}.sgs-form-ab12 .sgs-form__button--submit.sgs-pressed,:where(:root:not(.sgs-touch-input)) .sgs-form-ab12 .sgs-form__button--submit:hover{border-color:#ff0000;}.sgs-form-ab12 .sgs-form__button--submit:focus-visible{border-color:#ff0000;}',
		'form prev' =>
			'.sgs-form-ab12 .sgs-form__button--prev{background-color:var(--wp--preset--color--primary, currentColor);color:#ffffff;border-color:var(--wp--preset--color--accent, currentColor);border-style:dashed;border-width:2px 2px 2px 2px;border-top-left-radius:4px;border-bottom-right-radius:8px;font-weight:600;line-height:1.4;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;width:100%;}.sgs-form-ab12 .sgs-form__button--prev.sgs-pressed,:where(:root:not(.sgs-touch-input)) .sgs-form-ab12 .sgs-form__button--prev:hover{background-color:#112233;color:var(--wp--preset--color--surface, currentColor);border-color:#ff0000;}.sgs-form-ab12 .sgs-form__button--prev:focus-visible{background-color:#112233;color:var(--wp--preset--color--surface, currentColor);border-color:#ff0000;}',
		'form next' =>
			'.sgs-form-ab12 .sgs-form__button--next{background-color:var(--wp--preset--color--primary, currentColor);color:#ffffff;border-color:var(--wp--preset--color--accent, currentColor);border-style:dashed;border-width:2px 2px 2px 2px;border-top-left-radius:4px;border-bottom-right-radius:8px;font-weight:600;line-height:1.4;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;width:100%;}.sgs-form-ab12 .sgs-form__button--next.sgs-pressed,:where(:root:not(.sgs-touch-input)) .sgs-form-ab12 .sgs-form__button--next:hover{background-color:#112233;color:var(--wp--preset--color--surface, currentColor);border-color:#ff0000;}.sgs-form-ab12 .sgs-form__button--next:focus-visible{background-color:#112233;color:var(--wp--preset--color--surface, currentColor);border-color:#ff0000;}',
		'gr writeReview' =>
			'.u .sgs-google-reviews__write-review{color:#ffffff;border-color:var(--wp--preset--color--accent, currentColor);border-style:dashed;border-width:2px 2px 2px 2px;border-top-left-radius:4px;border-bottom-right-radius:8px;font-weight:600;line-height:1.4;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;width:100%;}.u .sgs-google-reviews__write-review.sgs-pressed,:where(:root:not(.sgs-touch-input)) .u .sgs-google-reviews__write-review:hover{color:var(--wp--preset--color--surface, currentColor);border-color:#ff0000;}.u .sgs-google-reviews__write-review:focus-visible{color:var(--wp--preset--color--surface, currentColor);border-color:#ff0000;}.u .sgs-google-reviews__write-review{position:relative;isolation:isolate;}.u .sgs-google-reviews__write-review::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;background-color:var(--wp--preset--color--primary, currentColor);}.u .sgs-google-reviews__write-review.sgs-pressed::after,:where(:root:not(.sgs-touch-input)) .u .sgs-google-reviews__write-review:hover::after{background-color:#112233;}.u .sgs-google-reviews__write-review:focus-visible::after,.u .sgs-google-reviews__write-review:has(:focus-visible)::after{background-color:#112233;}',
		'gr seeAll' =>
			'.u .sgs-google-reviews__see-all{color:#ffffff;border-color:var(--wp--preset--color--accent, currentColor);border-style:dashed;border-width:2px 2px 2px 2px;border-top-left-radius:4px;border-bottom-right-radius:8px;font-weight:600;line-height:1.4;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;width:100%;}.u .sgs-google-reviews__see-all.sgs-pressed,:where(:root:not(.sgs-touch-input)) .u .sgs-google-reviews__see-all:hover{color:var(--wp--preset--color--surface, currentColor);border-color:#ff0000;}.u .sgs-google-reviews__see-all:focus-visible{color:var(--wp--preset--color--surface, currentColor);border-color:#ff0000;}.u .sgs-google-reviews__see-all{position:relative;isolation:isolate;}.u .sgs-google-reviews__see-all::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;background-color:var(--wp--preset--color--primary, currentColor);}.u .sgs-google-reviews__see-all.sgs-pressed::after,:where(:root:not(.sgs-touch-input)) .u .sgs-google-reviews__see-all:hover::after{background-color:#112233;}.u .sgs-google-reviews__see-all:focus-visible::after,.u .sgs-google-reviews__see-all:has(:focus-visible)::after{background-color:#112233;}',
		'gr arrow' =>
			'.u .sgs-google-reviews__arrow{color:#ffffff;border-color:var(--wp--preset--color--accent, currentColor);border-style:dashed;border-width:2px 2px 2px 2px;border-top-left-radius:4px;border-bottom-right-radius:8px;font-weight:600;line-height:1.4;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;width:100%;}.u .sgs-google-reviews__arrow.sgs-pressed,:where(:root:not(.sgs-touch-input)) .u .sgs-google-reviews__arrow:hover{color:var(--wp--preset--color--surface, currentColor);border-color:#ff0000;}.u .sgs-google-reviews__arrow:focus-visible{color:var(--wp--preset--color--surface, currentColor);border-color:#ff0000;}.u .sgs-google-reviews__arrow::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;background-color:var(--wp--preset--color--primary, currentColor);}.u .sgs-google-reviews__arrow.sgs-pressed::after,:where(:root:not(.sgs-touch-input)) .u .sgs-google-reviews__arrow:hover::after{background-color:#112233;}.u .sgs-google-reviews__arrow:focus-visible::after,.u .sgs-google-reviews__arrow:has(:focus-visible)::after{background-color:#112233;}',
		'modal close' =>
			'.u .sgs-modal__close{color:#ffffff;border-color:var(--wp--preset--color--accent, currentColor);border-style:dashed;border-width:2px 2px 2px 2px;border-top-left-radius:4px;border-bottom-right-radius:8px;font-weight:600;line-height:1.4;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;width:100%;}.u .sgs-modal__close.sgs-pressed,:where(:root:not(.sgs-touch-input)) .u .sgs-modal__close:hover{color:var(--wp--preset--color--surface, currentColor);border-color:#ff0000;}.u .sgs-modal__close:focus-visible{color:var(--wp--preset--color--surface, currentColor);border-color:#ff0000;}.u .sgs-modal__close::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;background-color:var(--wp--preset--color--primary, currentColor);}.u .sgs-modal__close.sgs-pressed::after,:where(:root:not(.sgs-touch-input)) .u .sgs-modal__close:hover::after{background-color:#112233;}.u .sgs-modal__close:focus-visible::after,.u .sgs-modal__close:has(:focus-visible)::after{background-color:#112233;}',
		'pc cta' =>
			'.u .sgs-product-card__cta--primary{color:#ffffff;border-color:var(--wp--preset--color--accent, currentColor);border-style:dashed;border-width:2px 2px 2px 2px;border-top-left-radius:4px;border-bottom-right-radius:8px;font-weight:600;line-height:1.4;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;width:100%;}.u .sgs-product-card__cta--primary.sgs-pressed,:where(:root:not(.sgs-touch-input)) .u .sgs-product-card__cta--primary:hover{color:var(--wp--preset--color--surface, currentColor);border-color:#ff0000;}.u .sgs-product-card__cta--primary:focus-visible{color:var(--wp--preset--color--surface, currentColor);border-color:#ff0000;}.u .sgs-product-card__cta--primary{position:relative;isolation:isolate;}.u .sgs-product-card__cta--primary::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;background-color:var(--wp--preset--color--primary, currentColor);}.u .sgs-product-card__cta--primary.sgs-pressed::after,:where(:root:not(.sgs-touch-input)) .u .sgs-product-card__cta--primary:hover::after{background-color:#112233;}.u .sgs-product-card__cta--primary:focus-visible::after,.u .sgs-product-card__cta--primary:has(:focus-visible)::after{background-color:#112233;}',
		'pc cta bound' =>
			'.u .product-card__view, .u .product-card__add-to-cart{color:#ffffff;border-color:var(--wp--preset--color--accent, currentColor);border-style:dashed;border-width:2px 2px 2px 2px;border-top-left-radius:4px;border-bottom-right-radius:8px;font-weight:600;line-height:1.4;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;width:100%;}.u .product-card__view.sgs-pressed,.u .product-card__add-to-cart.sgs-pressed,:where(:root:not(.sgs-touch-input)) .u .product-card__view:hover,:where(:root:not(.sgs-touch-input)) .u .product-card__add-to-cart:hover{color:var(--wp--preset--color--surface, currentColor);border-color:#ff0000;}.u .product-card__view:focus-visible,.u .product-card__add-to-cart:focus-visible{color:var(--wp--preset--color--surface, currentColor);border-color:#ff0000;}.u .product-card__view, .u .product-card__add-to-cart{position:relative;isolation:isolate;}.u .product-card__view::after,.u .product-card__add-to-cart::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;background-color:var(--wp--preset--color--primary, currentColor);}.u .product-card__view.sgs-pressed::after,.u .product-card__add-to-cart.sgs-pressed::after,:where(:root:not(.sgs-touch-input)) .u .product-card__view:hover::after,:where(:root:not(.sgs-touch-input)) .u .product-card__add-to-cart:hover::after{background-color:#112233;}.u .product-card__view:focus-visible::after,.u .product-card__view:has(:focus-visible)::after,.u .product-card__add-to-cart:focus-visible::after,.u .product-card__add-to-cart:has(:focus-visible)::after{background-color:#112233;}',
		'pc cta legacy scalar' =>
			'.u .x{border-style:solid;border-width:3px;border-radius:6px;font-size:15px;}',
		'nav chromeButton' =>
			'.row .sgs-nav-drawer__chrome-slot{color:#ffffff;border-color:var(--wp--preset--color--accent, currentColor);border-style:dashed;border-width:2px 2px 2px 2px;border-top-left-radius:4px;border-bottom-right-radius:8px;font-weight:600;line-height:1.4;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;width:100%;}.row .sgs-nav-drawer__chrome-slot.sgs-pressed,:where(:root:not(.sgs-touch-input)) .row .sgs-nav-drawer__chrome-slot:hover{color:var(--wp--preset--color--surface, currentColor);border-color:#ff0000;}.row .sgs-nav-drawer__chrome-slot:focus-visible{color:var(--wp--preset--color--surface, currentColor);border-color:#ff0000;}.row .sgs-nav-drawer__chrome-slot{position:relative;isolation:isolate;}.row .sgs-nav-drawer__chrome-slot::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;background-color:var(--wp--preset--color--primary, currentColor);}.row .sgs-nav-drawer__chrome-slot.sgs-pressed::after,:where(:root:not(.sgs-touch-input)) .row .sgs-nav-drawer__chrome-slot:hover::after{background-color:#112233;}.row .sgs-nav-drawer__chrome-slot:focus-visible::after,.row .sgs-nav-drawer__chrome-slot:has(:focus-visible)::after{background-color:#112233;}',
		'gradient' =>
			'.u .g.sgs-pressed,:where(:root:not(.sgs-touch-input)) .u .g:hover{background-image:linear-gradient(90deg,#f00,#00f);-webkit-background-clip:text;background-clip:text;color:transparent;}.u .g:focus-visible{background-image:linear-gradient(90deg,#f00,#00f);-webkit-background-clip:text;background-clip:text;color:transparent;}@supports not ((background-clip:text) or (-webkit-background-clip:text)){.u .g.sgs-pressed,:where(:root:not(.sgs-touch-input)) .u .g:hover{background-image:none;color:#f00;}}@supports not ((background-clip:text) or (-webkit-background-clip:text)){.u .g:focus-visible{background-image:none;color:#f00;}}.u .g{position:relative;isolation:isolate;}.u .g::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;background-image:linear-gradient(90deg,#000,#fff);}.u .g{border-color:transparent;position:relative;background-clip:padding-box;}.u .g::before{content:"";position:absolute;inset:0;margin:-2px;border-radius:inherit;padding:2px;background:linear-gradient(90deg,#f00,#00f);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;}',
	);

	/**
	 * Run every caller's call in a child process (the render helpers load as the plugin loads them) and return the CSS by caller.
	 *
	 * @return array<string,string>
	 */
	private function outputs(): array {
		static $cache = null;
		if ( null !== $cache ) {
			return $cache;
		}
		$root   = dirname( __DIR__, 2 ) . '/';
		$script = (string) tempnam( sys_get_temp_dir(), 'sgsbp' );
		file_put_contents(
			$script,
			"<?php\ndefine( 'ABSPATH', " . var_export( $root, true ) . " );\ndefine( 'SGS_BLOCKS_PATH', ABSPATH );\ndefine( 'SGS_BLOCKS_VERSION', 't' );\n"
			. "require ABSPATH . 'scripts/qa/lib/wp-stubs.php';\nrequire ABSPATH . 'includes/render-helpers.php';\n"
			. $this->calls_code()
			. "\$out = array();\nforeach ( \$calls as \$name => \$c ) { \$out[ \$name ] = sgs_button_element_style_css( ...\$c ); }\necho json_encode( \$out );\n"
		);
		try {
			$raw = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			unlink( $script );
		}
		$decoded = json_decode( $raw, true );
		$this->assertIsArray( $decoded, 'child process did not return JSON: ' . $raw );
		$cache = $decoded;
		return $cache;
	}

	/**
	 * The attribute sets and call shapes, one entry per caller, as PHP source.
	 *
	 * @return string
	 */
	private function calls_code(): string {
		return <<<'CODE'
		$box = array( 'top' => '2px', 'right' => '2px', 'bottom' => '2px', 'left' => '2px' );
		$pad = array( 'top' => '10px', 'right' => '20px', 'bottom' => '10px', 'left' => '20px' );
		$look = function ( string $p ) use ( $box, $pad ) {
			return array(
				$p . 'ColourBackground' => 'primary', $p . 'ColourText' => '#ffffff', $p . 'ColourBorder' => 'accent',
				$p . 'ColourBackgroundHover' => '#112233', $p . 'ColourTextHover' => 'surface', $p . 'ColourBorderHover' => '#ff0000',
				$p . 'BorderStyle' => 'dashed', $p . 'BorderWidth' => $box, $p . 'BorderRadius' => array( 'topLeft' => '4px', 'bottomRight' => '8px' ),
				$p . 'FontWeight' => '600', $p . 'LineHeight' => '1.4', $p . 'Padding' => $pad, $p . 'WidthType' => 'full',
			);
		};
		$legacy = array( 'ctaFontSize' => 15, 'ctaBorderWidth' => 3, 'ctaBorderRadius' => 6 );
		$calls = array(
		 'choice-flow back' => array( $look('back'), 'back', '.u .sgs-choice-flow__nav-back' ),
		 'form submit' => array( array_intersect_key( $look('submit'), array_flip( array( 'submitColourBorder','submitColourBorderHover','submitBorderStyle','submitBorderWidth','submitBorderRadius' ) ) ), 'submit', '.sgs-form-ab12 .sgs-form__button--submit' ),
		 'form prev' => array( $look('prev'), 'prev', '.sgs-form-ab12 .sgs-form__button--prev' ),
		 'form next' => array( $look('next'), 'next', '.sgs-form-ab12 .sgs-form__button--next' ),
		 'gr writeReview' => array( $look('writeReview'), 'writeReview', '.u .sgs-google-reviews__write-review', true, false ),
		 'gr seeAll' => array( $look('seeAll'), 'seeAll', '.u .sgs-google-reviews__see-all', true, false ),
		 'gr arrow' => array( $look('arrow'), 'arrow', '.u .sgs-google-reviews__arrow', true, true ),
		 'modal close' => array( $look('close'), 'close', '.u .sgs-modal__close', true, true ),
		 'pc cta' => array( $look('cta'), 'cta', '.u .sgs-product-card__cta--primary', true ),
		 'pc cta bound' => array( $look('cta'), 'cta', '.u .product-card__view, .u .product-card__add-to-cart', true ),
		 'pc cta legacy scalar' => array( $legacy, 'cta', '.u .x' ),
		 'nav chromeButton' => array( $look('chromeButton'), 'chromeButton', '.row .sgs-nav-drawer__chrome-slot', true ),
		 'gradient' => array( array( 'ctaColourBackgroundGradient' => 'linear-gradient(90deg,#000,#fff)', 'ctaColourBorderGradient' => 'linear-gradient(90deg,#f00,#00f)', 'ctaColourTextHoverGradient' => 'linear-gradient(90deg,#f00,#00f)' ), 'cta', '.u .g', true ),
		);
CODE;
	}

	/**
	 * @return array<string,array{0:string}>
	 */
	public static function callers(): array {
		$out = array();
		foreach ( array_keys( self::EXPECTED ) as $name ) {
			$out[ $name ] = array( $name );
		}
		return $out;
	}

	#[DataProvider( 'callers' )]
	public function test_the_caller_output_is_unchanged( string $name ): void {
		$this->assertSame( self::EXPECTED[ $name ], $this->outputs()[ $name ] );
	}

	public function test_every_known_caller_is_pinned(): void {
		$this->assertCount( 13, self::EXPECTED );
		$this->assertSame( array_keys( self::EXPECTED ), array_keys( $this->outputs() ) );
	}
}

<?php
/**
 * Tests: a named extension's attributes are registered on the blocks its rule names only.
 *
 * Every attribute registered on a block type is sent to the block editor with that type's settings, so the commerce
 * look's several hundred attributes on every block type came to 15 MB of editor settings on a shop site. The generator
 * writes each named extension's attributes with its blocks (includes/extension-attributes-scope.generated.php) and
 * sgs_extension_attribute_schema_for() leaves them off any other block.
 *
 * Run with:
 *   vendor/bin/phpunit --filter ExtensionAttributeScopeTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable Squiz.Commenting.FunctionComment.Missing, Squiz.Commenting.ClassComment.Missing, WordPress.NamingConventions.PrefixAllGlobals, WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents, WordPress.Arrays.ArrayDeclarationSpacing.AssociativeArrayFound

namespace SGS\Blocks {
	// A namespaced stub wins over the global function inside the shipped file's namespace.
	if ( ! function_exists( __NAMESPACE__ . '\add_filter' ) ) {
		function add_filter(): bool {
			return true;
		}
	}
}

namespace {
	use PHPUnit\Framework\TestCase;

	require_once dirname( __DIR__, 2 ) . '/includes/extension-attrs-rest-register.php';

	final class ExtensionAttributeScopeTest extends TestCase {

		private function root(): string {
			return dirname( __DIR__, 2 ) . '/';
		}

		/**
		 * Each attribute of a `named` extension in the roster, mapped to the blocks its rule names.
		 *
		 * @return array<string, string[]>
		 */
		private function roster_scope(): array {
			$roster = json_decode( (string) file_get_contents( $this->root() . 'src/blocks/extensions/extension-roster.json' ), true );
			$scope  = array();
			foreach ( $roster['extensions'] as $ext ) {
				if ( 'named' !== ( $ext['rule']['mode'] ?? '' ) ) {
					continue;
				}
				foreach ( array_keys( $ext['attributes'] ) as $attr ) {
					$scope[ $attr ] = array_values( array_unique( array_merge( $scope[ $attr ] ?? array(), $ext['rule']['blocks'] ) ) );
				}
			}
			return $scope;
		}

		public function test_the_scope_file_holds_every_named_attribute_with_its_blocks(): void {
			$file = $this->root() . 'includes/extension-attributes-scope.generated.php';
			$this->assertFileExists( $file, 'run scripts/generate-extension-attributes.js' );
			$got = array();
			foreach ( require $file as $group ) {
				foreach ( $group['attributes'] as $attr ) {
					$got[ $attr ] = $group['blocks'];
				}
			}
			$want = $this->roster_scope();
			$this->assertGreaterThan( 500, count( $want ), 'the roster names the commerce look attributes' );
			ksort( $got );
			ksort( $want );
			foreach ( $want as $attr => $blocks ) {
				sort( $blocks );
				$this->assertArrayHasKey( $attr, $got, "$attr is not in the scope file" );
				$this->assertSame( $blocks, $got[ $attr ], "$attr is scoped to the wrong blocks" );
			}
			$this->assertSame( array_keys( $want ), array_keys( $got ), 'the scope file holds an attribute the roster does not name' );
		}
	}
}

<?php
/**
 * The motion model's folder loader (Spec 38A): requires every PHP file under `includes/motion/` in a fixed order, so a
 * later unit adds a file to one of these folders and nothing else.
 *
 * Order: `motion/*.php`, then `motion/field-types/`, `motion/migrate/` and `motion/migrate/mappers/`, each folder's
 * files sorted by name. `migrate/` loads before `migrate/mappers/`, so an interface or base class a mapper extends is
 * declared first. Every file is loaded with `require_once`, so a file another include already required (for example
 * `helpers-motion-easing.php` requiring the field-type class) is not loaded twice. The files run inside a closure, so
 * a file's top-level variables stay out of the global scope (functions, classes and hook registrations a file declares are global as usual).
 *
 * Required by `sgs-blocks.php` and by `tests/php/MotionFieldTypesTest.php`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

( static function ( string $root ): void {
	foreach ( array( '', '/field-types', '/migrate', '/migrate/mappers' ) as $folder ) {
		$files = glob( $root . $folder . '/*.php' );
		if ( ! is_array( $files ) ) {
			continue;
		}
		sort( $files, SORT_STRING );
		foreach ( $files as $file ) {
			require_once $file;
		}
	}
} )( __DIR__ . '/motion' );

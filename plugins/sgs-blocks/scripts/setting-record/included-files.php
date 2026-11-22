<?php
/**
 * Loaded before the offline runner (php -d auto_prepend_file=...) by the setting check's renderer (render.py::Renderer):
 * when the render ends it writes every PHP file the request loaded (get_included_files()) to the file named by
 * SGS_SETTING_RECORD_INCLUDED. The check stamps each block's record with those files, so a change to a helper re-checks
 * only the blocks whose renders loaded it. It prints nothing, so the runner's output is unchanged.
 */

register_shutdown_function(
	static function () {
		$target = getenv( 'SGS_SETTING_RECORD_INCLUDED' );
		if ( $target ) {
			file_put_contents( $target, json_encode( get_included_files() ) );
		}
	}
);

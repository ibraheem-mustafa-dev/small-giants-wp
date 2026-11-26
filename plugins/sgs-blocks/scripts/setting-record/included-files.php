<?php
/**
 * Loaded before the offline runner (php -d auto_prepend_file=...) by the setting check's renderer (render.py::Renderer):
 * when the render ends it writes every PHP file the request loaded (get_included_files()) to the file named by
 * SGS_SETTING_RECORD_INCLUDED. The check stamps each block's record with those files, so a change to a helper re-checks
 * only the blocks whose renders loaded it. It also writes every block.json the render read (the runner and its registry
 * stand-in list them in $GLOBALS['sgs_qa_read_files']) to the file named by SGS_SETTING_RECORD_READS: the render cache
 * checks those files' content before it reuses a render (render.py::Renderer, `outside`). It prints nothing, so the
 * runner's output is unchanged.
 */

register_shutdown_function(
	static function () {
		$target = getenv( 'SGS_SETTING_RECORD_INCLUDED' );
		if ( $target ) {
			file_put_contents( $target, json_encode( get_included_files() ) );
		}
		$reads = getenv( 'SGS_SETTING_RECORD_READS' );
		if ( $reads ) {
			file_put_contents( $reads, json_encode( array_values( array_unique( $GLOBALS['sgs_qa_read_files'] ?? array() ) ) ) );
		}
	}
);

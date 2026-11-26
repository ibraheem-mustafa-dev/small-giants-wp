<?php
/**
 * Loaded before the offline runner (php -d auto_prepend_file=...) by the setting check's renderer (render.py::Renderer):
 * when the render ends it writes every PHP file the request loaded (get_included_files()) to the file named by
 * SGS_SETTING_RECORD_INCLUDED. The check stamps each block's record with those files, so a change to a helper re-checks
 * only the blocks whose renders loaded it. It also writes, to the file named by SGS_SETTING_RECORD_READS, the md5 of every
 * block-folder file the render loaded or read (the runner and its registry stand-in list each block.json they read in
 * $GLOBALS['sgs_qa_read_files']), taken here before PHP exits, so an edit made after the render cannot pass for what it
 * read: the render cache checks those hashes before it reuses a render (render.py::Renderer, `outside`). It prints
 * nothing, so the runner's output is unchanged.
 */

register_shutdown_function(
	static function () {
		$loaded = get_included_files();
		$target = getenv( 'SGS_SETTING_RECORD_INCLUDED' );
		if ( $target ) {
			file_put_contents( $target, json_encode( $loaded ) );
		}
		$reads = getenv( 'SGS_SETTING_RECORD_READS' );
		if ( $reads ) {
			$hashes = array();
			foreach ( array_unique( array_merge( $loaded, $GLOBALS['sgs_qa_read_files'] ?? array() ) ) as $file ) {
				if ( false !== strpos( str_replace( '\\', '/', (string) $file ), '/src/blocks/' ) ) {
					$hashes[ $file ] = is_file( $file ) ? md5_file( $file ) : 'missing';
				}
			}
			file_put_contents( $reads, json_encode( (object) $hashes ) );
		}
	}
);

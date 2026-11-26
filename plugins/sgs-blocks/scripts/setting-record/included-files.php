<?php
/**
 * Loaded before the offline runner (php -d auto_prepend_file=...) by the setting check's renderer (render.py::Renderer):
 * when the render ends it writes every PHP file the request loaded (get_included_files()) to the file named by
 * SGS_SETTING_RECORD_INCLUDED. The check stamps each block's record with those files, so a change to a helper re-checks
 * only the blocks whose renders loaded it. It also writes, to the file named by SGS_SETTING_RECORD_READS, the md5 of every
 * block-folder file the render loaded or read: a block.json the runner or its registry stand-in read by the md5 of the
 * bytes they read ($GLOBALS['sgs_qa_read_md5']; one they looked for and found missing is 'missing', so adding it later
 * re-renders), a loaded PHP file by its md5 here before PHP exits. So an edit made during or after the render cannot pass
 * for what it read: the render cache checks those hashes before it reuses a render (render.py::Renderer, `outside`). It
 * prints nothing, so the runner's output is unchanged.
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
			// SGS_RENDER_MUTATE (render.py::MUTATE) switches one mechanism off for its must-fail test (tests/test_render.py)
			$mutate = array_filter( explode( ',', (string) getenv( 'SGS_RENDER_MUTATE' ) ) );
			$read   = in_array( 'read-md5', $mutate, true ) ? array() : ( $GLOBALS['sgs_qa_read_md5'] ?? array() );
			$hashes = array();
			foreach ( array_unique( array_merge( $loaded, $GLOBALS['sgs_qa_read_files'] ?? array() ) ) as $file ) {
				if ( in_array( 'missing-read', $mutate, true ) && ! is_file( $file ) ) {
					continue;
				}
				if ( false !== strpos( str_replace( '\\', '/', (string) $file ), '/src/blocks/' ) ) {
					$hashes[ $file ] = $read[ $file ] ?? ( is_file( $file ) ? md5_file( $file ) : 'missing' );
				}
			}
			file_put_contents( $reads, json_encode( (object) $hashes ) );
		}
	}
);

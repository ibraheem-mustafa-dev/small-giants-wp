'use strict';

const path = require( 'path' );
const { editFiles, renderFiles } = require( '../../lib/block-source-files' );

/**
 * The per-block source context every rule shares. A block's behaviour is not
 * only in edit.js and render.php: edit.js imports components from inside the
 * block folder and render.php includes partials with a plain
 * `require __DIR__ . '/x.php';`. A rule that reads those two files by name
 * misses the code that moved out of them, so rules ask the ctx instead.
 *
 *   ctx.editFiles( tail )      edit.js plus its in-block relative imports
 *   ctx.renderFiles( tail )    render.php plus its plain require/include partials
 *   ctx.editStripped( tail )   comment-stripped text of every edit file, joined
 *   ctx.renderStripped( tail ) comment-stripped text of every render file, joined
 *   ctx.renderRaw( tail )      raw text of every render file, joined
 *
 * Lists are memoised per block for the life of the ctx. A block with neither
 * partials nor components resolves to exactly [ edit.js ] / [ render.php ].
 *
 * @param {string}      blocksDir Directory holding the block folders.
 * @param {SourceCache} cache     The run's shared source cache.
 * @return {Object} Fields to spread into a ctx.
 */
function blockSourceCtx( blocksDir, cache ) {
	const edit = new Map();
	const render = new Map();
	const listed = ( memo, resolve, tail ) => {
		if ( ! memo.has( tail ) ) memo.set( tail, resolve( path.join( blocksDir, tail ) ) );
		return memo.get( tail );
	};
	const join = ( files, read ) => files.map( read ).filter( ( t ) => t != null ).join( '\n' );
	return {
		editFiles: ( tail ) => listed( edit, editFiles, tail ),
		renderFiles: ( tail ) => listed( render, renderFiles, tail ),
		editStripped: ( tail ) =>
			join( listed( edit, editFiles, tail ), ( f ) => cache.strippedText( f ) ),
		renderStripped: ( tail ) =>
			join( listed( render, renderFiles, tail ), ( f ) => cache.strippedText( f ) ),
		renderRaw: ( tail ) => join( listed( render, renderFiles, tail ), ( f ) => cache.text( f ) ),
	};
}

module.exports = { blockSourceCtx };

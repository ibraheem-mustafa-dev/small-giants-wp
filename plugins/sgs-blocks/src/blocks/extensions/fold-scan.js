/**
 * Fold scan: when a published post or page finishes saving in the block editor, measure its real first screen
 * (fold-scan-measure.js) and store the section count (POST /sgs/v1/fold-scan/<id>, Sgs_Fold_Scan_Rest). The save
 * itself is never delayed; a failure leaves the stored value (or the default) untouched and logs a console warning.
 */
import { select, subscribe } from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';
import { measureFold } from './fold-scan-measure';

/**
 * Watch the editor store and call `onScan` once per finished, successful, non-autosave save of a published post.
 *
 * @param {Object}   deps
 * @param {Function} deps.getEditor Returns the `core/editor` selectors.
 * @param {Function} deps.onScan    Called with `{ id, permalink }`.
 * @return {Function} The store listener.
 */
export function createSaveWatcher( { getEditor, onScan } ) {
	let wasManualSave = false;
	return function check() {
		const editor = getEditor();
		if ( ! editor || typeof editor.isSavingPost !== 'function' ) {
			return;
		}
		const saving = editor.isSavingPost();
		const manual = saving && ! editor.isAutosavingPost();
		if ( saving ) {
			wasManualSave = wasManualSave || manual;
			return;
		}
		if ( ! wasManualSave ) {
			return;
		}
		wasManualSave = false;
		const permalink = editor.getPermalink();
		if (
			! editor.didPostSaveRequestSucceed() ||
			editor.getCurrentPostAttribute( 'status' ) !== 'publish' ||
			! permalink
		) {
			return;
		}
		onScan( { id: editor.getCurrentPostId(), permalink } );
	};
}

function scanAndStore( { id, permalink } ) {
	measureFold( permalink )
		.then( ( sections ) =>
			apiFetch( {
				path: `/sgs/v1/fold-scan/${ id }`,
				method: 'POST',
				data: { sections },
			} )
		)
		.catch( ( error ) => {
			// eslint-disable-next-line no-console
			console.warn( 'SGS fold scan skipped:', error );
		} );
}

subscribe(
	createSaveWatcher( {
		getEditor: () => select( 'core/editor' ),
		onScan: scanAndStore,
	} ),
	'core/editor'
);

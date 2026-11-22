/**
 * The forms editor (the `sgs_form` post type) opens ready to add fields.
 *
 * Forms are built on their own screen (Bean, 2026-11-22: the form post type is where forms are built). Once the post
 * holds a form block (a saved form, a starter pattern picked from WordPress's "Choose a pattern" window, or one added
 * by hand), its first step is selected and the inserter opens inside it, so the form family is on screen at once, as
 * Jetpack's form editor does. An empty new form is left to the pattern window (the post type has no template on
 * purpose: includes/class-sgs-block-cpts.php). It runs once per editor load and changes no content.
 *
 * @package SGS\Blocks
 */

import { subscribe, select, dispatch } from '@wordpress/data';
import { FORM_CPT } from '../form/form-cpt';

/**
 * The container fields go into: the form's first step, or the form when it holds blocks but no step. Null while
 * the form's template has not filled it yet, or when the post holds no form.
 *
 * @param {Object[]} blocks The editor's top-level blocks.
 * @return {Object|null} The block.
 */
export function fieldContainer( blocks ) {
	const form = ( blocks || [] ).find( ( b ) => 'sgs/form' === b.name );
	if ( ! form || ! form.innerBlocks.length ) {
		return null;
	}
	return form.innerBlocks.find( ( b ) => 'sgs/form-step' === b.name ) || form;
}

let done = false;
const unsubscribe = subscribe( () => {
	if ( done ) {
		return;
	}
	const editor = select( 'core/editor' );
	const type = editor && 'function' === typeof editor.getCurrentPostType ? editor.getCurrentPostType() : null;
	if ( ! type ) {
		return;
	}
	if ( FORM_CPT !== type ) {
		done = true;
		unsubscribe();
		return;
	}
	const target = fieldContainer( select( 'core/block-editor' ).getBlocks() );
	if ( ! target ) {
		return;
	}
	done = true;
	unsubscribe();
	dispatch( 'core/block-editor' ).selectBlock( target.clientId );
	dispatch( 'core/editor' ).setIsInserterOpened( { rootClientId: target.clientId, insertionIndex: target.innerBlocks.length } );
} );

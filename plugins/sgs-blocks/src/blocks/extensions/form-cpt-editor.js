/**
 * The forms editor (the `sgs_form` post type) opens ready to add fields.
 *
 * Forms are built on their own screen (Bean, 2026-11-22: the form post type is where forms are built). Once the post
 * holds a form block (a saved form, or one this adds), its first step is selected and the inserter opens inside it,
 * so the form family is on screen at once, as Jetpack's form editor does. A new, empty form gets a form block (with
 * its own first step) unless starter patterns exist for forms: then the post is left to WordPress's "Choose a
 * pattern" window, which only opens on an empty post (the post type has no template for that reason:
 * includes/class-sgs-block-cpts.php). Nothing in a saved form is changed. It runs once per editor load.
 *
 * @package SGS\Blocks
 */

import { subscribe, select, dispatch } from '@wordpress/data';
import { createBlock } from '@wordpress/blocks';
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

/**
 * Whether a new form should start with a form block: the post is new and empty, and no starter pattern is offered
 * for forms (a pattern for `core/post-content` that names the post type, which WordPress's pattern window shows).
 *
 * @param {Object[]} blocks   The editor's top-level blocks.
 * @param {boolean}  isNew    Whether the post has never been saved.
 * @param {Object[]} patterns The registered block patterns.
 * @return {boolean} Whether to add a form block.
 */
export function shouldStartForm( blocks, isNew, patterns ) {
	if ( ! isNew || ( blocks || [] ).length ) {
		return false;
	}
	return ! ( patterns || [] ).some(
		( p ) => ( p.postTypes || [] ).includes( FORM_CPT ) && ( p.blockTypes || [] ).includes( 'core/post-content' )
	);
}

let done = false;
let started = false;
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
	const blocks = select( 'core/block-editor' ).getBlocks();
	if ( ! started && editor.isEditedPostNew() ) {
		const core = select( 'core' );
		const patterns = core && 'function' === typeof core.getBlockPatterns ? core.getBlockPatterns() : [];
		if ( undefined === patterns ) {
			return; // the patterns are still loading
		}
		if ( shouldStartForm( blocks, true, patterns ) ) {
			started = true;
			dispatch( 'core/block-editor' ).insertBlocks( createBlock( 'sgs/form' ) );
			return;
		}
	}
	const target = fieldContainer( blocks );
	if ( ! target ) {
		return;
	}
	done = true;
	unsubscribe();
	// after the editor's own first selection, so the step stays selected
	setTimeout( () => {
		dispatch( 'core/block-editor' ).selectBlock( target.clientId );
		dispatch( 'core/editor' ).setIsInserterOpened( { rootClientId: target.clientId, insertionIndex: target.innerBlocks.length } );
	}, 0 );
} );

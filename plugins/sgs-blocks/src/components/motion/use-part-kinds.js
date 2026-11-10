/**
 * The media kind shown on each device by the slot behind a motion part (Spec 49 §10.1, FR-49-40).
 *
 * A part declares `availableWhen: { slot, kinds }`: `slot` is the prefix of the block's `supports.sgs.mediaElements`
 * entry, `kinds` the kinds the part is for. The kind per device is the slot's resolved kind (the same
 * `createContext` the media panels read).
 *
 * @package SGS\Blocks
 */
import { useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { getBlockType } from '@wordpress/blocks';

import { createContext } from '../media/panels/disclosure-context.js';
import { KIND_DEVICES } from './kind-fit.js';

/**
 * Pure: the kind on each device for one slot entry.
 *
 * @param {Object} attributes Block attributes.
 * @param {Object} entry      The `mediaElements` entry: `{ prefix, kinds, context }`.
 * @return {Object} `{ desktop, tablet, mobile }` to a kind.
 */
export function kindsByDeviceFor( attributes, entry ) {
	const opts = { kinds: entry.kinds || [], context: entry.context || 'element', adopted: true };
	return Object.fromEntries(
		KIND_DEVICES.map( ( device ) => [ device, createContext( attributes, device, entry.prefix || '', opts ).kind ] )
	);
}

/**
 * The slot entry a part reads, or null when the part declares no `availableWhen` or no entry matches.
 *
 * @param {Object|null} supportsSgs The block's `supports.sgs`.
 * @param {Object|null} part        The part's declaration.
 * @return {Object|null} The entry.
 */
export function slotEntryFor( supportsSgs, part ) {
	const slot = part?.availableWhen?.slot;
	if ( undefined === slot || null === slot ) {
		return null;
	}
	return ( supportsSgs?.mediaElements || [] ).find( ( e ) => ( e.prefix || '' ) === slot && Array.isArray( e.kinds ) ) || null;
}

/**
 * A reader of the kinds on each device for any part of one block: `kindsOf( part )` is `{ desktop, tablet, mobile }`,
 * or null for a part that declares no `availableWhen` or names no slot entry.
 *
 * @param {string} clientId  The block's client id.
 * @param {string} blockName The block's name.
 * @return {Function} `( part ) => Object|null`.
 */
export function usePartKinds( clientId, blockName ) {
	const attributes = useSelect( ( select ) => select( blockEditorStore )?.getBlockAttributes?.( clientId ), [ clientId ] );
	const supportsSgs = getBlockType( blockName )?.supports?.sgs;
	return ( part ) => {
		const entry = slotEntryFor( supportsSgs, part );
		return entry && attributes ? kindsByDeviceFor( attributes, entry ) : null;
	};
}

const DEVICE_KEYS = { Desktop: 'desktop', Tablet: 'tablet', Mobile: 'mobile' };

/**
 * The editor's previewed device, from the one global toggle.
 *
 * @return {string} `desktop`, `tablet` or `mobile`.
 */
export function useActiveDevice() {
	return useSelect( ( select ) => {
		const editor = select( 'core/editor' );
		const device = editor && 'function' === typeof editor.getDeviceType ? editor.getDeviceType() : null;
		return DEVICE_KEYS[ device ] || 'desktop';
	}, [] );
}

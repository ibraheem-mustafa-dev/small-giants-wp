/**
 * AssetAtom: a media-library file for an asset-gated effect (the `assetReference` field type; Spec 38 section 7). It
 * stores the attachment ID only. A selection that is not a positive whole number is refused.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { useInstanceId } from '@wordpress/compose';
import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import { BaseControl, Button } from '@wordpress/components';
import { useAtomField } from './atom-utils';
import AtomFrame from './AtomFrame';

/**
 * @param {Object}      props
 * @param {string}      props.label          Field label.
 * @param {unknown}     props.value          An attachment ID, or undefined.
 * @param {Function}    props.onChange       Receives a schema-valid attachment ID, or undefined to clear.
 * @param {string[]}    [props.allowedTypes] Media types the picker offers (default `image`).
 * @param {Object|null} [props.fieldNode]    The field's schema node.
 * @param {unknown}     [props.presetValue]  The preset's stamped value; a differing value shows the Customised tag.
 * @param {string}      [props.help]         Hint text.
 * @return {Element} The control.
 */
export default function AssetAtom( {
	label,
	value,
	onChange,
	allowedTypes = [ 'image' ],
	fieldNode = null,
	presetValue,
	help,
} ) {
	const field = useAtomField( {
		type: 'assetReference',
		fieldNode,
		value,
		onChange,
		presetValue,
	} );
	const instanceId = useInstanceId( AssetAtom );
	const media = useSelect(
		( select ) =>
			typeof value === 'number'
				? select( 'core' ).getMedia( value )
				: null,
		[ value ]
	);
	const hasFile = typeof value === 'number';
	const name = media?.title?.rendered || media?.slug || '';

	return (
		<AtomFrame
			kind="asset"
			label={ label }
			help={ help }
			error={ field.error }
			customised={ field.customised }
			onReset={ field.reset }
		>
			<BaseControl
				id={ `sgs-motion-asset-${ instanceId }` }
				label={ label }
				__nextHasNoMarginBottom
			>
				<MediaUploadCheck>
					<div
						style={ {
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							flexWrap: 'wrap',
						} }
					>
						<MediaUpload
							allowedTypes={ allowedTypes }
							value={ hasFile ? value : undefined }
							onSelect={ ( picked ) =>
								field.commit( picked?.id ?? null )
							}
							render={ ( { open } ) => (
								<Button
									variant="secondary"
									onClick={ open }
									style={ { minHeight: '44px' } }
								>
									{ hasFile
										? __( 'Replace file', 'sgs-blocks' )
										: __( 'Choose file', 'sgs-blocks' ) }
								</Button>
							) }
						/>
						{ hasFile && (
							<>
								<span className="sgs-motion-atom__file">
									{ name ||
										sprintf(
											/* translators: %d: the media library attachment ID. */
											__( 'File %d', 'sgs-blocks' ),
											value
										) }
								</span>
								<Button
									variant="tertiary"
									isDestructive
									onClick={ () => field.commit( undefined ) }
									style={ { minHeight: '44px' } }
								>
									{ __( 'Remove', 'sgs-blocks' ) }
								</Button>
							</>
						) }
					</div>
				</MediaUploadCheck>
			</BaseControl>
		</AtomFrame>
	);
}

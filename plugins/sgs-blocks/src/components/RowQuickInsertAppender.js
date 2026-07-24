import { useDispatch } from '@wordpress/data';
import { Button, Placeholder } from '@wordpress/components';
import { createBlock } from '@wordpress/blocks';
import { store as blockEditorStore } from '@wordpress/block-editor';

/**
 * Promoted quick-insert appender for a freeform row block (site-header-row /
 * site-footer-row). Steering, not gating: the row still accepts ANY block via
 * the normal block inserter — these buttons just fast-path the common
 * elements (logo, navigation, cart, etc.) so a non-coder client isn't left
 * searching the full block library for an empty row. Shared between both row
 * blocks; only the `promoted` list differs (Spec 37 §3.5 / FR-37-34).
 *
 * @param {Object}   props
 * @param {string}   props.clientId    Row block's clientId — insertion target.
 * @param {Array}    props.promoted    [{ slug, label, variant, attributes }].
 * @param {string}   props.label       Placeholder heading.
 * @param {string}   props.instructions Placeholder helper text.
 */
export default function RowQuickInsertAppender( {
	clientId,
	promoted,
	label,
	instructions,
} ) {
	const { insertBlock } = useDispatch( blockEditorStore );

	return (
		<Placeholder
			label={ label }
			instructions={ instructions }
			className="sgs-row-quick-insert"
		>
			<div className="sgs-row-quick-insert__buttons">
				{ promoted.map( ( item ) => (
					<Button
						key={ `${ item.slug }-${ item.variant || 'default' }` }
						variant="secondary"
						onClick={ () =>
							insertBlock(
								createBlock(
									item.slug,
									item.attributes || {}
								),
								undefined,
								clientId
							)
						}
					>
						{ item.label }
					</Button>
				) ) }
			</div>
		</Placeholder>
	);
}

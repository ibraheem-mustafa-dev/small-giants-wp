import { __ } from '@wordpress/i18n';
import { useDispatch } from '@wordpress/data';
import { Button, Placeholder } from '@wordpress/components';
import { createBlock } from '@wordpress/blocks';
import { close } from '@wordpress/icons';
import { store as blockEditorStore } from '@wordpress/block-editor';

/**
 * Promoted quick-insert appender for a freeform row block (site-header-row /
 * site-footer-row). Steering, not gating: the row still accepts ANY block via
 * the normal block inserter — these buttons just fast-path the common
 * elements (logo, navigation, cart, etc.) so a non-coder client isn't left
 * searching the full block library for an empty row. Shared between both row
 * blocks; only the `promoted` list differs (Spec 37 §3.5 / FR-37-34).
 *
 * Dismissible per-instance (Bean, 2026-09-17): the 3 header/footer rows are
 * OPTIONAL — not every client needs all 3 — so this steering panel must not
 * be the only route to an empty row. The close button writes
 * `hidePromotedPlaceholder` on the row's OWN attributes (never a global/
 * persistent setting), and the caller (site-header-row/edit.js,
 * site-footer-row/edit.js) reads that attr to fall back to WordPress's own
 * plain default appender — the same behaviour sgs/container already offers
 * for its optional empty InnerBlocks slot.
 *
 * @param {Object}   props
 * @param {string}   props.clientId    Row block's clientId — insertion target.
 * @param {Array}    props.promoted    [{ slug, label, variant, attributes }].
 * @param {string}   props.label       Placeholder heading.
 * @param {string}   props.instructions Placeholder helper text.
 * @param {Function} props.onDismiss   Called with no args when the client
 *                                     dismisses this placeholder.
 */
export default function RowQuickInsertAppender( {
	clientId,
	promoted,
	label,
	instructions,
	onDismiss,
} ) {
	const { insertBlock } = useDispatch( blockEditorStore );

	return (
		<Placeholder
			label={ label }
			instructions={ instructions }
			className="sgs-row-quick-insert"
		>
			<Button
				className="sgs-row-quick-insert__dismiss"
				icon={ close }
				label={ __(
					'Hide these suggestions for this row',
					'sgs-blocks'
				) }
				onClick={ onDismiss }
			/>
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

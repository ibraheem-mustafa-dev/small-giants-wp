/**
 * LinkPopoverControl — the SGS standard LINK control (Spec 35 §2 LINK,
 * promoted from `sgs/button`'s pilot 2026-08-13, Bean-approved live).
 *
 * Supersedes `SgsLinkControl`'s INLINE mount as the canonical shape. Two
 * exports:
 *
 * - `LinkPopoverContent` — the low-level `<Popover>` primitive. Use this
 *   directly when a block needs MULTIPLE triggers to open the SAME popover
 *   instance (e.g. `sgs/button`'s toolbar link button + sidebar row both
 *   opening one popover with a swapped `anchor` — see `button/edit.js`).
 * - `LinkPopoverField` — a self-contained row-trigger + popover in ONE
 *   component, for the common case of a single inspector-panel trigger
 *   (`sgs/icon`, `sgs/media`, the block-link extension, `sgs/product-card`).
 *
 * WHY A POPOVER, NOT AN INLINE MOUNT (the root-cause this migration fixes):
 * 1. Core sets `.block-editor-link-control { min-width: 350px }`, cancelled
 *    ONLY under `.components-popover__content`. Mounting inline in a ~248px
 *    inspector panel overflows by ~86px — a popover fixes this by
 *    construction, never by overriding core CSS.
 * 2. Core `LinkControl` STAGES its `settings` toggles and only commits them
 *    on Submit — there is no blur/close handler. `SgsLinkControl`'s inline
 *    mount (no explicit "Submit" gesture in the ordinary editing flow) let a
 *    flipped toggle silently discard. This component NEVER passes toggles
 *    through `LinkControl`'s `settings` prop — every toggle below is our own
 *    control, committing immediately via `onChange*`, exactly like the
 *    button pilot and the (superseded) `SgsLinkControl`.
 * Neither Kadence nor Otter mount core `LinkControl` inline in a sidebar
 * panel either — both use a popover or `<BlockControls>`.
 *
 * `linkId`/`linkKind` (internal post/term ID resolution, `get_permalink()`
 * at render time) are OPT-IN per consumer — pass `enableInternalResolution`
 * only when the target's `render.php` resolves them (currently `sgs/button`
 * only; see each block's own dispatch notes for why).
 *
 * LINK SOURCE (opt-in per call site): `linkSources` on the Field adds a "Link to" choice
 * (typed URL, page or post, Site Info, back to top). Data shape and naming rule:
 * `LinkSourcePicker.js`'s header.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useState, useRef, forwardRef, useImperativeHandle } from '@wordpress/element';
import { BaseControl, Button } from '@wordpress/components';
import { useInstanceId } from '@wordpress/compose';
import { link as linkIcon } from '@wordpress/icons';
import { LinkPopoverContent } from './LinkPopoverContent';
import { linkSourceRowText } from './LinkSourcePicker';
import './LinkPopoverControl.css';

export { LinkPopoverContent, TARGET_ENUM_OPTIONS } from './LinkPopoverContent';

/**
 * Self-contained trigger row + popover for the common single-trigger case.
 * Renders the compact `.sgs-link-popover__row` Button (icon + truncated URL
 * label, matching `sgs/button`'s sidebar row) and owns its own open/anchor
 * state. Exposes `ref.current.open()` for a caller that ALSO wants an
 * external trigger (e.g. a toolbar button) to open the same instance —
 * `sgs/button` doesn't use this wrapper (it needs two independently-styled
 * triggers), but a future consumer with the same need can.
 *
 * @param {Object}   props
 * @param {string}   props.label                 Row/BaseControl label.
 * @param {string}   [props.help]                Help text.
 * @param {Object}   props.value                 { url, linkId, linkKind, linkTarget, rel, download,
 *                                                 linkSource }.
 * @param {Function} props.onChange               Receives the next partial value object — merge
 *                                                 into attributes yourself (matches `setAttributes`'s
 *                                                 own merge semantics). With `linkSources` it may
 *                                                 carry `linkSource` (map it to the call site's
 *                                                 source attribute like any other key).
 * @param {string[]} [props.linkSources]          Turns on the "Link to" choice and lists the
 *                                                 sources offered besides the typed URL
 *                                                 (`LINK_SOURCES_ALL` / `_WEB` / `_PAGES`). The
 *                                                 stored source is `value.linkSource`, or the
 *                                                 `linkSource` prop with `searchOnly`, where
 *                                                 `onChange( url, { linkSource } )` gets it as a
 *                                                 second argument whenever it changes.
 * @param {string}   [props.linkSource]           searchOnly only: the stored source.
 * @param {'enum'|'boolean'} [props.targetMode]   See `LinkPopoverContent`. Default 'boolean'
 *                                                 (matches icon/media's existing SgsLinkControl shape).
 * @param {boolean}  [props.showTarget=true]      Show the open-in-new-tab control.
 * @param {boolean}  [props.showRel=true]         Show the rel field.
 * @param {boolean}  [props.showDownload=false]   Show the download toggle.
 * @param {boolean}  [props.enableInternalResolution=false] See `LinkPopoverContent`.
 * @param {Function} [props.renderExtraFields]    See `LinkPopoverContent`.
 * @param {boolean}  [props.searchOnly=false]     Opt-in variant for plain string-URL attributes
 *                                                that have no new-tab/rel/download concept (e.g.
 *                                                `sgs/product-card`'s `ctaUrl`). `value` is a bare
 *                                                URL STRING and `onChange` receives the next url
 *                                                STRING directly — matches `SgsLinkControl`'s own
 *                                                `searchOnly` contract, which this supersedes.
 *                                                Forces target/rel/download rows off regardless of
 *                                                the show* props.
 * @param {Object}   [props.suggestionsQuery]     See `LinkPopoverContent`.
 * @param {string}   [props.emptyLabel]           Button text while nothing is chosen (default
 *                                                "Add link"), e.g. "Choose a saved form".
 */
const LinkPopoverField = forwardRef( function LinkPopoverField(
	{
		label,
		help,
		value,
		onChange,
		targetMode = 'boolean',
		showTarget = true,
		showRel = true,
		showDownload = false,
		enableInternalResolution = false,
		renderExtraFields,
		searchOnly = false,
		suggestionsQuery,
		emptyLabel,
		linkSources,
		linkSource: searchOnlySource = '',
	},
	ref
) {
	const [ isOpen, setIsOpen ] = useState( false );
	const triggerRef = useRef();

	useImperativeHandle( ref, () => ( {
		open: () => setIsOpen( true ),
	} ) );

	const url = searchOnly ? ( value || '' ) : ( value?.url || '' );
	const sourceOn = Array.isArray( linkSources ) && linkSources.length > 0;
	const linkSource = ( searchOnly ? searchOnlySource : value?.linkSource ) || '';
	const rowText = sourceOn ? linkSourceRowText( linkSource, url ) : url;
	// searchOnly hands the url as a string, so a source change rides as a second argument.
	const emitLink = ( next ) => {
		if ( ! searchOnly ) {
			onChange( next );
			return;
		}
		if ( 'linkSource' in next ) {
			onChange( next.url || '', { linkSource: next.linkSource } );
		} else {
			onChange( next.url || '' );
		}
	};
	const emitSource = ( next ) => ( searchOnly ? onChange( url, { linkSource: next } ) : onChange( { linkSource: next } ) );

	// `id` is required for BaseControl to give its own `help` paragraph an id
	// (`${id}__help`, the same convention every native self-wiring control
	// gets from useBaseControlProps()) — without it the paragraph renders
	// with no id at all and nothing can point aria-describedby at it.
	const instanceId = useInstanceId( LinkPopoverField, 'sgs-link-popover-field' );
	const id = `sgs-link-popover-field-${ instanceId }`;
	const helpId = help ? `${ id }__help` : undefined;

	return (
		<BaseControl id={ id } label={ label } help={ help } __nextHasNoMarginBottom>
			<Button
				ref={ triggerRef }
				variant="tertiary"
				className="sgs-link-popover__row"
				icon={ linkIcon }
				title={ rowText || undefined }
				aria-describedby={ helpId }
				onClick={ () => setIsOpen( true ) }
			>
				<span className="sgs-link-popover__row-label">
					{ rowText ? rowText : emptyLabel || __( 'Add link', 'sgs-blocks' ) }
				</span>
			</Button>
			{ isOpen && (
				<LinkPopoverContent
					anchor={ triggerRef.current }
					onClose={ () => setIsOpen( false ) }
					url={ url }
					linkId={ searchOnly ? undefined : value?.linkId }
					linkKind={ searchOnly ? undefined : value?.linkKind }
					linkTarget={ searchOnly ? undefined : value?.linkTarget }
					rel={ searchOnly ? undefined : value?.rel }
					download={ searchOnly ? undefined : value?.download }
					targetMode={ targetMode }
					enableInternalResolution={ ! searchOnly && enableInternalResolution }
					onChangeLink={ emitLink }
					onChangeTarget={ ! searchOnly && showTarget ? ( val ) => onChange( { linkTarget: val } ) : undefined }
					onChangeRel={ ! searchOnly && showRel ? ( val ) => onChange( { rel: val } ) : undefined }
					onChangeDownload={ ! searchOnly && showDownload ? ( val ) => onChange( { download: val } ) : undefined }
					renderExtraFields={ searchOnly ? undefined : renderExtraFields }
					suggestionsQuery={ suggestionsQuery }
					linkSource={ linkSource }
					linkSources={ linkSources }
					onChangeLinkSource={ sourceOn ? emitSource : undefined }
				/>
			) }
		</BaseControl>
	);
} );

export default LinkPopoverField;

/**
 * SGS Starter Look preset control (FR-37-47).
 *
 * Turns the header/footer starter patterns (FR-37-8) — plus whatever patterns
 * are registered for `sgs_drawer` — into a preset control on the locked root
 * block (per FR-37-46's template-lock). It stands in for the native "Choose a
 * pattern" starter modal (FR-37-7), which never fires for these three CPTs
 * because every new post is non-empty by construction (the CPT `template`
 * seeds the root block).
 *
 * The patterns ALREADY ARE the source of truth for what each look contains, so
 * this control reads WordPress's own registered pattern list and applies it with
 * ordinary `core/block-editor` dispatches — no per-look attribute dictionary to
 * drift, no new REST route, nonce or sanitisation surface.
 *
 * `getSettings().__experimentalBlockPatterns` is NOT used: it holds ONLY the
 * small "outside `init`" bucket, because core's own JS resolves
 * `__experimentalAdditionalBlockPatterns ?? __experimentalBlockPatterns` and PHP
 * always sets the former (even as `[]`). `select( 'core' ).getBlockPatterns()` is
 * REST-backed, returns the FULL registry, and camel-cases `post_types`/
 * `block_types` into the fields the filter below reads.
 *
 * `metadata` (the provenance that locks child editing behind "Edit pattern" —
 * the failure mode FR-37-46/47 exist to close) is stripped from the whole tree
 * before every write: some starter pattern SOURCE FILES carry a literal
 * `metadata` key on their own children.
 *
 * Two behaviours are load-bearing and must not be "simplified":
 *
 *  1. UNDO. `registry.batch()` does NOT collapse these dispatches into one undo
 *     step — live-tested, Ctrl+Z reverted nothing at all. The working mechanism
 *     is core's persistence marking: `__unstableMarkNextChangeAsNotPersistent()`
 *     before EVERY dispatch, then `__unstableMarkLastChangeAsPersistent()` once
 *     after the last. Marking only the first, or not marking at all, both
 *     measure as TWO undo levels.
 *  2. OWNED KEYS. A look may only write the attributes its own pattern source
 *     explicitly declares (union across all qualifying looks, so switching looks
 *     resets a sibling look's settings). See `starter-look-owned-keys.js` for
 *     why `parse()`'s attributes cannot be used for this.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useMemo, useState } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { store as editorStore } from '@wordpress/editor';
import { store as coreStore } from '@wordpress/core-data';
import { parse, getBlockType } from '@wordpress/blocks';
import { PanelBody, Button, ToggleControl } from '@wordpress/components';
import {
	parseExplicitBlocks,
	findExplicitRoot,
	collectOwnedKeys,
	collectChildOwnedKeys,
	buildOwnedAttributes,
	matchChildrenByName,
	stripMetadataDeep,
} from './starter-look-owned-keys';

function schemaOf( blockName ) {
	return getBlockType( blockName )?.attributes || {};
}

/**
 * Preset control listing every starter look registered for the current post's
 * CPT, on the now-locked root block.
 *
 * @param {Object} props
 * @param {string} props.clientId      The locked root block's clientId.
 * @param {string} props.rootBlockName The root block's registered name.
 * @return {JSX.Element|null} The panel, or null when this CPT has no looks.
 */
export default function StarterLookPresetControl( { clientId, rootBlockName } ) {
	const { postType, patterns: allPatterns } = useSelect( ( select ) => {
		const editor = select( editorStore );
		return {
			postType:
				editor && typeof editor.getCurrentPostType === 'function'
					? editor.getCurrentPostType()
					: null,
			patterns: select( coreStore ).getBlockPatterns() || [],
		};
	}, [] );

	const {
		updateBlockAttributes,
		replaceInnerBlocks,
		__unstableMarkNextChangeAsNotPersistent,
		__unstableMarkLastChangeAsPersistent,
	} = useDispatch( blockEditorStore );
	const rows = useSelect(
		( select ) => select( blockEditorStore ).getBlocks( clientId ),
		[ clientId ]
	);

	// DELIBERATELY STRICTER than WordPress's native starter modal (FR-37-7),
	// which treats "no `Post Types` declared" as universal. The source here is
	// the FULL registry and almost every pattern in it declares no post type
	// because it targets an ordinary page's `core/post-content` — none of those
	// belong on a locked header/footer/drawer root.
	const { qualifying, visible } = useMemo( () => {
		if ( ! postType ) {
			return { qualifying: [], visible: [] };
		}
		const matches = allPatterns.filter( ( pattern ) => {
			const scopedToPostType =
				Array.isArray( pattern.postTypes ) && pattern.postTypes.includes( postType );
			const scopedToPostContent =
				! pattern.blockTypes || pattern.blockTypes.includes( 'core/post-content' );
			return scopedToPostType && scopedToPostContent && pattern.inserter !== false;
		} );
		// With any look marked `featured` the picker shows only those, so a big
		// library stays a short list; with none marked, every look is shown.
		const featured = matches.filter(
			( pattern ) => Array.isArray( pattern.keywords ) && pattern.keywords.includes( 'featured' )
		);
		return { qualifying: matches, visible: featured.length > 0 ? featured : matches };
	}, [ allPatterns, postType ] );

	// Owned keys come from the QUALIFYING set, not the visible one: a look the
	// `featured` filter hides still defines settings that must reset when
	// another look is applied.
	const ownedRootKeys = useMemo(
		() => collectOwnedKeys( qualifying, rootBlockName ),
		[ qualifying, rootBlockName ]
	);
	const ownedChildKeys = useMemo(
		() => collectChildOwnedKeys( qualifying, rootBlockName ),
		[ qualifying, rootBlockName ]
	);

	const [ keepContent, setKeepContent ] = useState( false );

	if ( visible.length === 0 ) {
		return null;
	}

	/**
	 * Applies one starter look onto the live, locked root block.
	 *
	 * @param {Object} pattern The registered pattern object (`{name, content, …}`).
	 */
	function applyLook( pattern ) {
		const parsed = stripMetadataDeep( parse( pattern.content ).filter( ( block ) => block.name ) );
		const rootBlock = parsed.find( ( block ) => block.name === rootBlockName ) || parsed[ 0 ];
		const explicitRoot = findExplicitRoot( parseExplicitBlocks( pattern.content ), rootBlockName );
		if ( ! rootBlock ) {
			return;
		}

		const patternRows = rootBlock.innerBlocks || [];
		const explicitRows = explicitRoot?.innerBlocks || [];
		const hasRowSlots = rows.some( ( row ) => row.attributes?.rowSlot );
		const writes = [];
		const pushAttrs = ( target, name, explicitAttrs, keys ) =>
			writes.push( () =>
				updateBlockAttributes( target, buildOwnedAttributes( keys, explicitAttrs, schemaOf( name ) ) )
			);

		pushAttrs( clientId, rootBlockName, explicitRoot?.attrs, ownedRootKeys );

		if ( hasRowSlots ) {
			rows.forEach( ( row ) => {
				const slot = row.attributes?.rowSlot;
				const matched = patternRows.find( ( r ) => r.attributes?.rowSlot === slot );
				if ( ! matched ) {
					return;
				}
				const explicitRow = explicitRows.find( ( r ) => r.attrs?.rowSlot === slot );
				pushAttrs( row.clientId, row.name, explicitRow?.attrs, ownedChildKeys[ row.name ] || [] );
				if ( ! keepContent ) {
					writes.push( () => replaceInnerBlocks( row.clientId, matched.innerBlocks || [], false ) );
				}
			} );
		} else if ( keepContent ) {
			// Most drawer looks define themselves on the child menu, not the
			// root, so "keep my blocks" still has to carry the child settings
			// across onto whichever of the client's own blocks corresponds.
			matchChildrenByName(
				explicitRows.map( ( child ) => child.name ),
				rows.map( ( child ) => child.name )
			).forEach( ( { patternIndex, liveIndex } ) => {
				const live = rows[ liveIndex ];
				pushAttrs(
					live.clientId,
					live.name,
					explicitRows[ patternIndex ]?.attrs,
					ownedChildKeys[ live.name ] || []
				);
			} );
		} else {
			writes.push( () => replaceInnerBlocks( clientId, patternRows, false ) );
		}

		writes.forEach( ( write ) => {
			__unstableMarkNextChangeAsNotPersistent();
			write();
		} );
		__unstableMarkLastChangeAsPersistent();
	}

	return (
		<PanelBody title={ __( 'Starter look', 'sgs-blocks' ) } initialOpen={ true }>
			<p className="sgs-starter-look__help">
				{ __(
					'Applies a starter look’s settings and content to this locked block. Undo reverts it in one step.',
					'sgs-blocks'
				) }
			</p>
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Keep my blocks – change the look only', 'sgs-blocks' ) }
				help={ __(
					'Your menu, buttons and text stay as they are. Only the settings this look controls (such as layout, size and background) are replaced.',
					'sgs-blocks'
				) }
				checked={ keepContent }
				onChange={ setKeepContent }
			/>
			<div className="sgs-starter-look__grid">
				{ visible.map( ( pattern ) => (
					<Button
						key={ pattern.name }
						variant="secondary"
						className="sgs-starter-look__option"
						onClick={ () => applyLook( pattern ) }
					>
						{ pattern.title }
					</Button>
				) ) }
			</div>
		</PanelBody>
	);
}

/**
 * SGS Starter Look preset control (FR-37-47).
 *
 * Turns the header/footer starter patterns (FR-37-8) — plus whatever
 * patterns are registered for `sgs_drawer` — into a preset control on the
 * locked root block (`sgs/site-header` / `sgs/site-footer` /
 * `sgs/nav-drawer`, per FR-37-46's template-lock). It stands in for the
 * native "Choose a pattern" starter modal (FR-37-7), which never fires for
 * these three CPTs because every new post is non-empty by construction (the
 * CPT `template` seeds the root block).
 *
 * It extends the FR-37-28 "Layout preset" pattern rather than inventing a
 * bespoke write-action: no new REST route, no new nonce, no new
 * sanitisation surface — every write here is an ordinary
 * `core/block-editor` store dispatch (`updateBlockAttributes` /
 * `replaceInnerBlocks`), exactly the category of call FR-37-28's preset and
 * FR-37-34's `RowQuickInsertAppender` already use. It is a normal,
 * Undo-able editor action like any other Inspector control.
 *
 * Mechanism — DB-first, no hand-authored per-look attribute dictionary
 * (CLAUDE.md R-31-1's spirit applied to this surface): the patterns
 * ALREADY ARE the source of truth for what each look contains, so this
 * control reads WordPress's own registered-pattern list via
 * `select( 'core' ).getBlockPatterns()` — the modern, REST-backed,
 * resolver-driven core-data selector — rather than re-encoding each
 * look's attributes/content by hand, which would drift the moment a
 * starter pattern file changes.
 *
 * `select( 'core/block-editor' ).getSettings().__experimentalBlockPatterns`
 * is NOT used: it holds ONLY the small "outside `init`" pattern bucket
 * (WooCommerce's lazily-registered patterns plus this project's own
 * admin_init-derived `sgs/header-<slug>`/`sgs/footer-<slug>` template-part-swap
 * patterns from
 * {@see \SGS\Blocks\Sgs_Block_CPTs::register_patterns_from_cpts()}) — every
 * pattern registered on the normal `init` hook, including all the real FR-37-8
 * `sgs/framework-header-*`/`sgs/header-*` starter patterns, is invisible on
 * that key regardless of post type, because WordPress core's own JS resolves
 * `__experimentalAdditionalBlockPatterns ?? __experimentalBlockPatterns` and
 * PHP always sets the former (even as `[]`), so the latter is never reached.
 * `select( 'core' ).getBlockPatterns()` is backed by
 * `/wp/v2/block-patterns/patterns`, returns the FULL registry, and
 * camel-cases the REST response's `post_types`/
 * `block_types` fields into `postTypes`/`blockTypes` — the same two fields
 * this control's own `looks` filter below already reads. One mechanism
 * covers BOTH kinds of look difference the spec names:
 *   (a) purely stylistic (root/row ATTRIBUTES differ) — `updateBlockAttributes`.
 *   (b) content differs (a row's InnerBlocks differ, e.g. a search-bar
 *       starter's extra `sgs/product-search`) — `replaceInnerBlocks`.
 * A row is matched between the pattern and the live post by its `rowSlot`
 * attribute (the same identity key FR-37-9/§3.1 already uses to tell rows
 * apart) — never by array position, for the same reason FR-37-9's own
 * seed-template guard rejects position-matching (a position match would
 * silently corrupt a hand-edited row order).
 *
 * `metadata` (block-level name/binding metadata, which is how the
 * pattern-INSERTION transform stamps `metadata.patternName`/`metadata.name`
 * provenance that then locks child-block editing behind "Edit pattern" —
 * the exact H failure mode FR-37-46/47 exist to close) is stripped before
 * every write. This control never calls `insertBlock` with a
 * pattern-derived block or any `__experimentalCreatePatternFromBlocks`-style
 * transform — only plain attribute/InnerBlocks dispatches — so the
 * provenance-stamping code path is never invoked in the first place; the
 * strip is a defence-in-depth belt-and-braces, not the only guard, because
 * some starter pattern SOURCE FILES already carry a literal `"metadata"`
 * key on their own child blocks (e.g. `footer-columns.php`'s named
 * columns) that must not be forwarded onto the live post.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useMemo, useState } from '@wordpress/element';
import { useSelect, useDispatch, useRegistry } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { store as editorStore } from '@wordpress/editor';
import { store as coreStore } from '@wordpress/core-data';
import { parse } from '@wordpress/blocks';
import { PanelBody, Button, ToggleControl } from '@wordpress/components';

/**
 * Strips block-level `metadata` (name/binding/provenance) from a single
 * attributes object. Never mutates the input.
 *
 * @param {Object} attributes Raw attributes from a parsed pattern block.
 * @return {Object} The same attributes, minus `metadata`.
 */
function stripMetadata( attributes ) {
	if ( ! attributes || ! Object.prototype.hasOwnProperty.call( attributes, 'metadata' ) ) {
		return attributes || {};
	}
	const { metadata, ...rest } = attributes;
	return rest;
}

/**
 * Recursively strips block-level `metadata` (name/binding/provenance) from an
 * entire parsed block tree — the block's own attributes AND every descendant
 * in `innerBlocks`, arbitrarily deep. Returns a NEW tree; never mutates the
 * pattern source (some starter pattern source files, e.g.
 * `footer-columns.php`, carry a literal `metadata.name` on nested
 * `sgs/container` children, not just the top level — a shallow
 * `stripMetadata()` on only the row's own attributes leaves those nested
 * names in place, which is the exact leak this function closes).
 *
 * @param {Array<Object>} blocks Parsed blocks (as returned by `@wordpress/blocks`'s `parse()`).
 * @return {Array<Object>} A new array of blocks, metadata-free at every level.
 */
function stripMetadataDeep( blocks ) {
	if ( ! Array.isArray( blocks ) ) {
		return [];
	}
	return blocks.map( ( block ) => ( {
		...block,
		attributes: stripMetadata( block.attributes ),
		innerBlocks: stripMetadataDeep( block.innerBlocks ),
	} ) );
}

/**
 * Preset control listing every starter look registered for the current
 * post's CPT, on the now-locked root block. Selecting a look re-applies
 * that starter's root attributes and per-row content (matched by
 * `rowSlot`), or — for a root with no `rowSlot` children (`sgs/nav-drawer`,
 * which is flat InnerBlocks, not a 3-row template) — replaces the root's
 * InnerBlocks wholesale.
 *
 * @param {Object} props
 * @param {string} props.clientId      The locked root block's clientId.
 * @param {string} props.rootBlockName The root block's registered name
 *                                     (`sgs/site-header` etc.) — used to
 *                                     pick the right top-level block out of
 *                                     a parsed pattern that may also carry
 *                                     wrapping comments/whitespace blocks.
 * @return {JSX.Element|null} The preset panel, or null when the current
 *                            CPT has no registered starter looks at all
 *                            (nothing to offer — never render an empty panel).
 */
export default function StarterLookPresetControl( { clientId, rootBlockName } ) {
	const { postType, patterns: allPatterns } = useSelect( ( select ) => {
		const editor = select( editorStore );
		return {
			postType: editor && typeof editor.getCurrentPostType === 'function'
				? editor.getCurrentPostType()
				: null,
			// `core/block-editor`'s `getSettings().__experimentalBlockPatterns` is
			// NOT the full registry here — see the file-level doc comment above for
			// the live-verified reason. `core`'s `getBlockPatterns()` is the
			// resolver-backed selector that actually returns every `init`-registered
			// pattern (REST `/wp/v2/block-patterns/patterns`), correctly carrying
			// `postTypes`/`blockTypes`.
			patterns: select( coreStore ).getBlockPatterns() || [],
		};
	}, [] );

	const { updateBlockAttributes, replaceInnerBlocks } = useDispatch( blockEditorStore );
	const registry = useRegistry();
	const rows = useSelect(
		( select ) => select( blockEditorStore ).getBlocks( clientId ),
		[ clientId ]
	);

	// DELIBERATELY STRICTER than WordPress's own native "Choose a pattern"
	// starter modal (FR-37-7), which treats "no `Post Types` declared" as
	// universal (fair game for a generic page). That fallback is wrong here:
	// this control's source is now the FULL pattern registry (258+ patterns
	// on the canary), and the vast majority — every generic about/pricing/
	// team/testimonial/footer/WooCommerce-product pattern in the library —
	// declares no `Post Types` at all, because it's meant for any ordinary
	// page's `core/post-content`. None of those belong on a locked
	// `sgs/site-header`/`sgs/site-footer`/`sgs/nav-drawer` root. A pattern
	// only qualifies as a starter look for THIS control if it explicitly
	// opts in via `Post Types: <postType>` — matching how the real FR-37-8
	// patterns are actually authored (see e.g.
	// `theme/sgs-theme/patterns/framework-header-default.php`).
	//
	// When any qualifying pattern carries the `featured` keyword the picker shows
	// only those, so a library of many looks stays a short list here while the
	// rest remain available as their own posts; with none marked, every
	// qualifying pattern is shown.
	const looks = useMemo( () => {
		if ( ! postType ) {
			return [];
		}
		const qualifying = allPatterns.filter( ( pattern ) => {
			const scopedToPostType =
				Array.isArray( pattern.postTypes ) && pattern.postTypes.includes( postType );
			const scopedToPostContent =
				! pattern.blockTypes || pattern.blockTypes.includes( 'core/post-content' );
			return scopedToPostType && scopedToPostContent && pattern.inserter !== false;
		} );
		const featured = qualifying.filter(
			( pattern ) => Array.isArray( pattern.keywords ) && pattern.keywords.includes( 'featured' )
		);
		return featured.length > 0 ? featured : qualifying;
	}, [ allPatterns, postType ] );

	// "Change the look only": apply the look's settings but leave the block's
	// existing content (menu, buttons, rows) exactly as the client left it.
	const [ keepContent, setKeepContent ] = useState( false );

	if ( looks.length === 0 ) {
		return null;
	}

	/**
	 * Applies one starter look's parsed block tree onto the live, locked
	 * root block: root attributes always; each row matched by `rowSlot`
	 * gets its attributes + InnerBlocks replaced; a rowSlot-less root
	 * (nav-drawer) gets its InnerBlocks replaced wholesale instead.
	 *
	 * @param {Object} pattern The registered pattern object (`{name, content, ...}`).
	 */
	function applyLook( pattern ) {
		const parsedRaw = parse( pattern.content ).filter( ( block ) => block.name );
		// Strip `metadata` from the ENTIRE tree up front — root, every row, and
		// every nested descendant — before anything is matched or dispatched. A
		// shallow per-call `stripMetadata()` only ever saw the block it was handed
		// directly (the row's own attributes); it was never applied to
		// `matched.innerBlocks`, which is exactly how nested `sgs/container`
		// children (e.g. "Footer — Multi-Column"'s Brand/Company Links/Services
		// Links/Newsletter columns) kept their `metadata.name` and leaked
		// pattern-provenance into the live post.
		const parsed = stripMetadataDeep( parsedRaw );
		const rootBlock =
			parsed.find( ( block ) => block.name === rootBlockName ) || parsed[ 0 ];
		if ( ! rootBlock ) {
			return;
		}

		const patternRows = rootBlock.innerBlocks || [];
		const hasRowSlots = rows.some( ( row ) => row.attributes?.rowSlot );

		// Batch every dispatch this preset application makes — root attributes,
		// every row's attributes, every row's InnerBlocks replacement (or the
		// single wholesale replacement for a rowSlot-less root) — into ONE atomic
		// entry in the undo history. Without this, `core/block-editor` records
		// each `updateBlockAttributes`/`replaceInnerBlocks` call as its own
		// separate undo step, so a single Ctrl+Z only reverts the LAST dispatch
		// and leaves every earlier one (including the root attributes, always
		// dispatched first) permanently applied. `registry.batch()` is core's own
		// mechanism for this — the same primitive `replaceBlocks()` and the
		// block-editor's multi-block paste/duplicate flows use internally to
		// collapse a multi-dispatch operation into a single history entry.
		registry.batch( () => {
			updateBlockAttributes( clientId, rootBlock.attributes );

			if ( hasRowSlots ) {
				rows.forEach( ( row ) => {
					const matched = patternRows.find(
						( patternRow ) =>
							patternRow.attributes?.rowSlot === row.attributes?.rowSlot
					);
					if ( ! matched ) {
						return;
					}
					updateBlockAttributes( row.clientId, matched.attributes );
					if ( ! keepContent ) {
						replaceInnerBlocks( row.clientId, matched.innerBlocks || [], false );
					}
				} );
			} else {
				if ( ! keepContent ) {
					replaceInnerBlocks( clientId, patternRows, false );
				}
			}
		} );
	}

	return (
		<PanelBody title={ __( 'Starter look', 'sgs-blocks' ) } initialOpen={ true }>
			<p className="sgs-starter-look__help">
				{ __(
					'Applies a starter look’s settings and content to this locked block. This overwrites what is here — fine-tune afterwards, or Undo to revert.',
					'sgs-blocks'
				) }
			</p>
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Keep my content — change the look only', 'sgs-blocks' ) }
				checked={ keepContent }
				onChange={ setKeepContent }
			/>
			<div className="sgs-starter-look__grid">
				{ looks.map( ( pattern ) => (
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

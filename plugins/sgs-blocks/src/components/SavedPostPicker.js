/**
 * SavedPostPicker: a searchable picker for posts of one non-public custom post
 * type (sgs_form, sgs_choice_flow, ...).
 *
 * WHY NOT LinkControl + suggestionsQuery: LinkControl searches core's
 * `GET /wp/v2/search?type=post&subtype=<cpt>`, and core only lists post types
 * registered with public=true AND show_in_rest=true. These CPTs are
 * deliberately non-public (no front-end singles, no sitemap entries), so that
 * request is rejected with HTTP 400 and the picker lists nothing. This
 * component reads the CPT's own REST collection through core-data instead
 * (`getEntityRecords( 'postType', cpt, { search } )`), which works for any
 * post type with show_in_rest.
 *
 * Every result row shows the post title and a type badge. The badge text is
 * the post type's own singular label (`getPostType( cpt ).labels.singular_name`),
 * never a hard-coded string. The chosen post's SLUG is handed to `onSelect`
 * (never the id), matching how sgs/form and sgs/choice-flow store the link.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useState, useRef, useEffect } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { decodeEntities } from '@wordpress/html-entities';
import { useInstanceId, useDebounce } from '@wordpress/compose';
import { BaseControl, Button, Popover, SearchControl, Spinner } from '@wordpress/components';
import { link as linkIcon } from '@wordpress/icons';
import { VStack } from './primitives';
import './SavedPostPicker.css';

const PER_PAGE = 20;

function titleOf( record ) {
	return decodeEntities( record?.title?.rendered || record?.title?.raw || '' ) || record?.slug || '';
}

/**
 * @param {Object}   props
 * @param {string}   props.postType     Post type slug (e.g. 'sgs_form').
 * @param {string}   props.label        Control label.
 * @param {string}   [props.help]       Help text.
 * @param {string}   [props.emptyLabel] Trigger text while nothing is chosen.
 * @param {string}   props.value        Chosen post's slug, or '' when unlinked.
 * @param {Function} props.onSelect     Called with the chosen post's slug.
 * @param {Function} props.onClear      Called when the link is removed.
 */
export default function SavedPostPicker( {
	postType,
	label,
	help,
	emptyLabel,
	value,
	onSelect,
	onClear,
} ) {
	const [ isOpen, setIsOpen ] = useState( false );
	const [ term, setTerm ] = useState( '' );
	const [ search, setSearch ] = useState( '' );
	const triggerRef = useRef();
	const listRef = useRef();
	const debounceSearch = useDebounce( setSearch, 250 );

	const instanceId = useInstanceId( SavedPostPicker, 'sgs-saved-post-picker' );
	const id = `sgs-saved-post-picker-${ instanceId }`;
	const helpId = help ? `${ id }__help` : undefined;

	const { typeLabel, results, isResolving, chosen } = useSelect(
		( select ) => {
			const core = select( coreStore );
			const type = core.getPostType( postType );
			const query = { search, per_page: PER_PAGE, status: 'publish', _fields: 'id,slug,title' };
			const chosenQuery = { slug: value, per_page: 1, status: 'publish', _fields: 'id,slug,title' };
			return {
				typeLabel: type?.labels?.singular_name || '',
				results: isOpen ? core.getEntityRecords( 'postType', postType, query ) : null,
				isResolving: isOpen
					? ! core.hasFinishedResolution( 'getEntityRecords', [ 'postType', postType, query ] )
					: false,
				chosen: value ? core.getEntityRecords( 'postType', postType, chosenQuery )?.[ 0 ] : null,
			};
		},
		[ postType, search, value, isOpen ]
	);

	useEffect( () => {
		if ( ! isOpen ) {
			setTerm( '' );
			setSearch( '' );
		}
	}, [ isOpen ] );

	const close = () => {
		setIsOpen( false );
		triggerRef.current?.focus();
	};

	const choose = ( record ) => {
		if ( record?.slug ) {
			onSelect( record.slug );
		}
		close();
	};

	const onSearchKeyDown = ( event ) => {
		if ( 'ArrowDown' === event.key ) {
			event.preventDefault();
			listRef.current?.querySelector( 'button' )?.focus();
		}
	};

	const onListKeyDown = ( event ) => {
		const rows = Array.from( listRef.current?.querySelectorAll( 'button' ) || [] );
		const index = rows.indexOf( event.target );
		if ( 'ArrowDown' === event.key && index < rows.length - 1 ) {
			event.preventDefault();
			rows[ index + 1 ].focus();
		} else if ( 'ArrowUp' === event.key && index > 0 ) {
			event.preventDefault();
			rows[ index - 1 ].focus();
		}
	};

	const triggerText = value ? ( chosen ? titleOf( chosen ) : value ) : emptyLabel || __( 'Choose', 'sgs-blocks' );
	const rows = Array.isArray( results ) ? results : [];

	return (
		<BaseControl id={ id } label={ label } help={ help } __nextHasNoMarginBottom>
			<Button
				ref={ triggerRef }
				variant="tertiary"
				className="sgs-link-popover__row sgs-saved-post-picker__trigger"
				icon={ linkIcon }
				title={ value || undefined }
				aria-describedby={ helpId }
				aria-haspopup="dialog"
				aria-expanded={ isOpen }
				onClick={ () => setIsOpen( ! isOpen ) }
			>
				<span className="sgs-link-popover__row-label">{ triggerText }</span>
			</Button>
			{ isOpen && (
				<Popover
					anchor={ triggerRef.current }
					onClose={ close }
					placement="bottom-start"
					offset={ 8 }
					shift
					className="sgs-link-popover sgs-saved-post-picker"
				>
					<VStack className="sgs-link-popover__inner sgs-saved-post-picker__inner" spacing={ 3 }>
						<SearchControl
							label={ __( 'Search', 'sgs-blocks' ) }
							placeholder={ __( 'Search by title', 'sgs-blocks' ) }
							value={ term }
							onChange={ ( next ) => {
								setTerm( next );
								debounceSearch( next );
							} }
							onKeyDown={ onSearchKeyDown }
							__nextHasNoMarginBottom
						/>
						<div
							ref={ listRef }
							className="sgs-saved-post-picker__list"
							role="listbox"
							aria-label={ label }
							aria-busy={ isResolving }
							onKeyDown={ onListKeyDown }
						>
							{ isResolving && ! rows.length && <Spinner /> }
							{ ! isResolving && ! rows.length && (
								<p className="sgs-saved-post-picker__empty">
									{ __( 'Nothing found. Only published items are listed.', 'sgs-blocks' ) }
								</p>
							) }
							{ rows.map( ( record ) => (
								<Button
									key={ record.id }
									className="sgs-saved-post-picker__row"
									role="option"
									aria-selected={ record.slug === value }
									onClick={ () => choose( record ) }
								>
									<span className="sgs-saved-post-picker__title">{ titleOf( record ) }</span>
									{ typeLabel && (
										<span className="sgs-saved-post-picker__badge">{ typeLabel }</span>
									) }
								</Button>
							) ) }
						</div>
						{ !! value && (
							<Button
								variant="tertiary"
								isDestructive
								className="sgs-saved-post-picker__remove"
								onClick={ () => {
									onClear();
									close();
								} }
							>
								{ __( 'Remove link', 'sgs-blocks' ) }
							</Button>
						) }
					</VStack>
				</Popover>
			) }
		</BaseControl>
	);
}

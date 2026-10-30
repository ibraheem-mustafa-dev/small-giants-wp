// The skeleton rules' reading of what a control opens and what closes a surface (Spec 48 FR-48-6): a button or link whose
// click handler (a renderVals key of its component, read from the draft's logic syntax tree by
// lib/skeleton-handler-opens.mjs) opens a modal, a drawer or a block-owned drawer, prefills a page's form, or closes the
// drawer it sits in; a modal surface's frame parts; the drawer top row's logo; and the trigger settings a block-owned drawer's
// opener carries. Part of lib/skeleton-rules.mjs::makeRules, which passes its own context and reads these back by name.
import path from 'path';
import { closesOn, handlerCloses, handlerOpens, handlerWrites, opensOn, opensOnWrites } from './skeleton-handler-opens.mjs';
import { modalTargets } from './skeleton-opener.mjs';
import { modalFrameParts } from './skeleton-modal-frame.mjs';
import { blockPartSurfaces } from './skeleton-surface-role.mjs';
import { formOpenerOf, prefillHref } from './skeleton-form-prefill.mjs';
import { parseInstanceKey } from './fact-key.mjs';

// ctx: makeRules' own { m, view, read, facts, R, surface, scope, hooks, v (a rule's verdict), desc (an element's block
// descendants), textLeaves, numberOnly }. Returns the readers below by name.
export function makeOpenerRules( { m, view, read, facts, R, surface, scope, hooks, v, desc, textLeaves, numberOnly } ) {
	// The state keys a button or link's click handler (a renderVals key of its component) writes with an opening value, a
	// toggle included (lib/skeleton-handler-opens.mjs); an empty Set for any other element or a client with no draft folder.
	const handlerKeys = ( e ) => ( [ 'a', 'button' ].includes( e.tag ) && facts.repo && facts.client
		? handlerOpens( { folder: path.join( facts.repo, 'sites', facts.client, 'handoff' ), record: { sources: view.sources }, component: view.entry( e )?.template.component, handler: read.handler( e ) } )
		: new Set() );
	// The modals the page map holds as `sgs_modal` rows (lib/skeleton-opener.mjs), and the one a button or link opens: its click
	// handler (a renderVals key of its component) writes the state one of the modal's surfaces.json states holds, a key at true or
	// the very literal written (lib/skeleton-handler-opens.mjs::opensOnWrites). The modal's own surface opens nothing of itself.
	const modals = R.modalOpener ? modalTargets( { pageMap: surface.pageMap, surfaces: view.surfaces } ).filter( ( t ) => t.surface.id !== scope?.id ) : [];
	const opensModal = ( e ) => {
		if ( ! modals.length || ! [ 'a', 'button' ].includes( e.tag ) || ! read.handler( e ) || ! facts.repo || ! facts.client ) {
			return null;
		}
		const written = handlerWrites( { folder: path.join( facts.repo, 'sites', facts.client, 'handoff' ), record: { sources: view.sources }, component: view.entry( e )?.template.component, handler: read.handler( e ) } );
		return modals.find( ( t ) => opensOnWrites( t.surface, written ) ) ?? null;
	};
	// The state keys a button or link's click handler writes a falsy value to (lib/skeleton-handler-opens.mjs::handlerCloses).
	const closeKeys = ( e ) => ( facts.repo && facts.client
		? handlerCloses( { folder: path.join( facts.repo, 'sites', facts.client, 'handoff' ), record: { sources: view.sources }, component: view.entry( e )?.template.component, handler: read.handler( e ) } )
		: new Set() );
	// The draft's own close control of a drawer surface: a button or link below the root whose click handler writes a falsy
	// value to a state key the drawer's own surfaces.json record opens on (rules.drawerClose).
	const ownDrawer = () => ( scope?.id ? view.surfaces[ scope.id ] : null );
	const closesOwnDrawer = ( e ) => {
		const own = ownDrawer();
		return !! own && e !== m.root && [ 'a', 'button' ].includes( e.tag ) && !! read.handler( e ) && opensOn( own, closeKeys( e ) );
	};
	// Whether an element sits in the drawer's top row: the nearest element above it that holds the drawer's own close
	// control is not the surface root and holds no navigation (the drawer's body), so the element shares the close's row.
	const inDrawerTopRow = ( e ) => {
		const holder = ( function up( k ) {
			const p = m.byKey[ k.parentKey ];
			return ! p ? null : desc( p ).some( closesOwnDrawer ) ? p : up( p );
		}( e ) );
		return !! holder && holder !== m.root && 'nav' !== holder.tag && ! desc( holder ).some( ( d ) => 'nav' === d.tag );
	};
	// A logo verdict in the drawer's top row, when the surface root's block draws the top row's logo from its own setting
	// (rules.drawerLogo.idSetting is a setting of that block): the logo is that setting, absorbed into the root, never a second
	// logo block; any other verdict is null.
	const drawerLogo = ( e, out ) => {
		const D = R.drawerLogo;
		const rootBlock = ( R.surfaceRoot?.entries || [] ).find( ( x ) => x.kind === surface.kind && new RegExp( x.namePattern, 'i' ).test( surface.name || '' ) )?.block;
		return D && rootBlock && facts.logoBlocks.includes( out.block ) && facts.attr( rootBlock, D.idSetting ) && inDrawerTopRow( e ) ? v( 'drawerLogo', { action: 'absorbed', into: m.root.key } ) : null;
	};
	// The anchor a saved form is reached by (lib/skeleton-form-prefill.mjs): the slug a page's linked form block references it by
	// (lib/skeleton-form-link.mjs), set on the form block that roots the form's own post, so a link `…#<slug>` on any page lands on it.
	const formAnchor = 'form' === surface.kind && scope?.id ? ( surface.formLinks || [] ).find( ( l ) => l.recordId === scope.id )?.slug ?? null : null;
	// The form a page shows, by the slug of the saved form its linked block references: the first element the form-link rule turns
	// into the linked form block.
	let formSlug;
	const pageForm = () => {
		if ( undefined === formSlug ) {
			const hit = scope ? m.els.map( ( x ) => hooks.formLinkOf( x ) ).find( ( x ) => x?.block ) : null;
			formSlug = Object.values( hit?.attributes || {} ).find( ( x ) => 'string' === typeof x ) ?? null;
		}
		return formSlug;
	};
	// The form opener a button or link runs, as the link it becomes: the page's form with the control's fields in the query. A field is
	// the same on every copy (a literal), or the words of the element that prints the item path in the control's own loop copy.
	const opensForm = ( e ) => {
		const handler = read.handler( e );
		if ( ! R.formPrefillOpener || ! handler || ! [ 'a', 'button' ].includes( e.tag ) || ! facts.repo || ! facts.client ) {
			return null;
		}
		const open = formOpenerOf( { folder: path.join( facts.repo, 'sites', facts.client, 'handoff' ), record: { sources: view.sources }, component: view.entry( e )?.template.component, handler } );
		const anchor = open ? pageForm() : null;
		if ( ! anchor ) {
			return null;
		}
		const loop = ( e.membership || [] ).filter( ( x ) => 'sc-for' === x.kind ).at( -1 );
		const copy = parseInstanceKey( e.key )?.copy;
		const valueOf = ( rest ) => {
			const field = loop && undefined !== copy ? `${ loop.as }.${ rest }` : null;
			const from = field ? m.els.find( ( x ) => parseInstanceKey( x.key )?.copy === copy && ( x.membership || [] ).some( ( y ) => 'sc-for' === y.kind && y.tpl === loop.tpl ) && ( view.entry( x )?.template.holes || [] ).some( ( h ) => 'text' === h.where && field === h.path ) ) : null;
			return from ? m.words( from ) : null;
		};
		return { href: prefillHref( { fields: open.fields, anchor, valueOf } ), form: anchor };
	};
	// The frame parts of a modal surface (lib/skeleton-modal-frame.mjs): its dialog, backdrop and close become the `sgs/modal`
	// frame's own settings (rules.modalFrame), and the root and the dialog panel unwrap into the post's inner content. Found once.
	let frameParts;
	const modalParts = () => {
		if ( undefined === frameParts ) {
			const own = scope?.id ? view.surfaces[ scope.id ] : null;
			frameParts = R.modalFrame && 'modal' === own?.kind
				? modalFrameParts( { m, closeKeysOf: ( e ) => ( [ 'a', 'button' ].includes( e.tag ) && read.handler( e ) ? closeKeys( e ) : new Set() ), closes: ( keys ) => closesOn( own, keys ) } )
				: null;
		}
		return frameParts;
	};
	const modalFrameRule = ( { e } ) => {
		const parts = modalParts();
		const part = parts ? Object.keys( parts ).find( ( k ) => parts[ k ] === e ) : null;
		return part ? v( 'modalFrame', { action: 'scrim' === part || 'close' === part ? 'absorbed' : 'unwrap', ...( 'scrim' === part || 'close' === part ? { into: m.root.key } : {} ), reason: R.modalFrame.parts[ part ] } ) : null;
	};
	// A button or link that opens a drawer surface: its click handler writes a state key one of the drawer's surfaces.json
	// states holds at true, or the handler is named in the drawer's recorded opener words.
	const opensDrawer = ( e ) => {
		const h = read.handler( e );
		if ( ! h || ! [ 'a', 'button' ].includes( e.tag ) ) {
			return false;
		}
		const keys = handlerKeys( e );
		return Object.values( view.surfaces ).some( ( s ) => 'drawer' === s.kind && ( opensOn( s, keys ) || String( view.openers[ s.id ] || '' ).split( /[^\w$]+/ ).includes( h ) ) );
	};
	// The drawers the page map hands to another row's block that names its owning block (rules.blockOwnedPart), found once for
	// a header surface (the block's trigger is the site-wide control the header carries; a page's own link to the same drawer,
	// such as a checkout's Edit link, stays a link): [ { surface, row, part, own (the byTemplate entry) } ].
	const ownedDrawers = R.blockOwnedPart && R.blockPartOpener && 'header' === surface.kind && surface.pageMap?.length
		? blockPartSurfaces( { pageMap: surface.pageMap, surfaces: view.surfaces, elements: view.elements, kind: 'drawer' } ).map( ( d ) => ( { ...d, own: R.blockOwnedPart.byTemplate?.[ d.row.template ] } ) ).filter( ( d ) => d.own )
		: [];
	// The block-owned drawer a button or link opens: its click handler (a renderVals key of its component) writes a state key
	// that one of the drawer's surfaces.json states holds at true (lib/skeleton-handler-opens.mjs), or null.
	const opensOwnedDrawer = ( e ) => {
		if ( ! ownedDrawers.length ) {
			return null;
		}
		const keys = handlerKeys( e );
		return ownedDrawers.find( ( d ) => opensOn( d.surface, keys ) ) ?? null;
	};
	// The owning block's trigger settings drawn from the control (the entry's `trigger` names the block's settings): words
	// beside a count make a pill with that label, no words an icon; a count that paints its own box is a bubble, else plain;
	// a count showing zero at rest keeps showing it; a typed aria-label is the trigger's accessible name.
	const triggerOf = ( e, T ) => {
		if ( ! T ) {
			return {};
		}
		const leaves = [ ...( m.words( e ) ? [ e ] : [] ), ...textLeaves( e ) ];
		const count = leaves.find( numberOnly ) ?? null;
		const label = leaves.filter( ( k ) => k !== count ).map( ( k ) => m.words( k ).trim() ).filter( Boolean ).join( ' ' );
		const aria = view.attr( e, 'aria-label' );
		return {
			[ T.style ]: label ? T.pill : T.icon,
			...( label ? { [ T.label ]: label } : {} ),
			...( count ? { [ T.countStyle ]: view.ownPaint( count ) ? T.bubble : T.plain } : {} ),
			...( count && 0 === Number( m.words( count ).trim() ) ? { [ T.showZero ]: true } : {} ),
			...( aria && ! /\{\{/.test( aria ) ? { [ T.ariaLabel ]: aria } : {} ),
		};
	};
	return { handlerKeys, opensModal, closeKeys, closesOwnDrawer, inDrawerTopRow, drawerLogo, formAnchor, pageForm, opensForm, modalParts, modalFrameRule, opensDrawer, ownedDrawers, opensOwnedDrawer, triggerOf };
}

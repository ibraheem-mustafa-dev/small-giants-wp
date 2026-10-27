// The site build's menus step on its own (`site-build.mjs --menus`, Spec 48 FR-48-55 part 3): the page map's menus and
// their mega-menu bindings reach a site that is already built, and nothing else is written. From the whole plan
// (lib/site-build-plan.mjs::planBuild) it keeps the menu, item and theme-location actions and each mega panel's section
// page (Spec 36 FR-36-5), and adds one action of its own: an item of a menu the site build made that opens a page now
// serving as the section page of a mega item of that menu is removed, because the mega item took over its slot (the
// item opens the panel and links to the page). It never creates, adopts or rebuilds a post, so the page map is only
// read: a menu entry naming a post the map holds no id for on this site stops the step, pointing at the whole build.
import { desiredMenus } from './site-build-menus.mjs';
import { rowKey } from './site-build-map.mjs';

const isRef = ( v ) => Boolean( v && 'object' === typeof v && v.ref );

// The menu items a mega item took over: in each menu the site build made, an item opening a post that is now the
// section page of a mega row the same menu holds, and that no row of the map asks the menu for itself.
export function supersededItems( rows, state, linkText = {}, surfaces = {} ) {
	const wanted = desiredMenus( rows, linkText, surfaces );
	const byKey = new Map( rows.map( ( r ) => [ rowKey( r ), r ] ) );
	const out = [];
	for ( const [ name, list ] of Object.entries( wanted.menus ) ) {
		const menu = state.menus.find( ( m ) => m.slug === name && m.owner === name );
		if ( ! menu ) {
			continue;
		}
		const asked = new Set( list.filter( ( it ) => 'post' === it.kind ).map( ( it ) => byKey.get( it.rowKey )?.id ).filter( Boolean ) );
		const sectionIds = new Map( list.map( ( it ) => [ byKey.get( wanted.sections[ it.rowKey ] )?.id, it.label ] ).filter( ( [ id ] ) => id ) );
		for ( const e of menu.items ) {
			if ( 'post_type' === e.type && sectionIds.has( e.objectId ) && ! asked.has( e.objectId ) ) {
				out.push( { phase: 'menus', type: 'item-delete', id: e.id, say: `menu "${ name }" item ${ e.id } "${ e.title || `${ e.object } ${ e.objectId }` }": remove (the "${ sectionIds.get( e.objectId ) }" mega item holds its slot, with this page as its section page)` } );
			}
		}
	}
	return out;
}

// The menus step of a whole plan: { actions, options, unresolved } where `actions` are the section-page, item-delete and
// menus-phase actions in the order they run, `options` the theme-location changes, and `unresolved` the row keys of
// posts an action names (as its post, section page or item object) that have no id on this site (the step makes no post, so it cannot run while any is left).
export function menusStep( plan, superseded = [] ) {
	const actions = [
		...plan.actions.filter( ( a ) => 'section' === a.type ),
		...superseded,
		...plan.actions.filter( ( a ) => 'menus' === a.phase ),
	];
	const unresolved = [ ...new Set( actions.flatMap( ( a ) => [ a.id, a.page, a.object ] ).filter( isRef ).map( ( v ) => v.ref.replace( /^post:/, '' ) ) ) ];
	return { actions, options: plan.options.filter( ( o ) => o.name.startsWith( 'nav_menu_locations[' ) ), unresolved };
}

// Runs the step. `planFor()` returns { plan, superseded } read fresh from the site; `applyPhase` is
// lib/site-build-apply.mjs::applyPhase and `wp` the site's wp-cli runner. Without `apply` it prints the step and writes
// nothing. With it, it runs the section pages, the removals and the menus phase, then reads the site again and fails
// unless that read plans none of them. Returns the exit code.
export function runMenus( { planFor, apply, wp, applyPhase, log = console.log, error = console.error } ) {
	const first = planFor();
	first.plan.notes.forEach( ( n ) => log( `note: ${ n }` ) );
	if ( first.plan.problems.length ) {
		first.plan.problems.forEach( ( p ) => error( `STOP ${ p }` ) );
		error( `FAILED: ${ first.plan.problems.length } problem(s); nothing was written` );
		return 1;
	}
	const step = menusStep( first.plan, first.superseded );
	log( 'menus:' );
	step.actions.forEach( ( a ) => log( `  ${ a.say }` ) );
	if ( step.options.length ) {
		log( 'option | before | after' );
		step.options.forEach( ( o ) => log( `${ o.name } | ${ o.before } | ${ o.after }` ) );
	}
	if ( step.unresolved.length ) {
		error( `STOP ${ step.unresolved.join( ', ' ) }: no post on this site yet; the menus step makes no post, so run the whole site build first` );
		error( 'FAILED: nothing was written' );
		return 1;
	}
	if ( ! apply ) {
		log( `${ step.actions.length } menu step(s) to run (dry run: re-run with --apply)` );
		return 0;
	}
	const refs = {};
	const noPost = () => {
		throw new Error( 'the menus step makes no post' );
	};
	applyPhase( step.actions.filter( ( a ) => 'section' === a.type ), 'posts', { wp, build: noPost, onId: noPost, log, refs } );
	step.actions.filter( ( a ) => 'item-delete' === a.type ).forEach( ( a ) => {
		log( `  ${ a.say }` );
		wp( [ 'menu', 'item', 'delete', String( a.id ) ] );
	} );
	applyPhase( step.actions.filter( ( a ) => 'menus' === a.phase && 'item-delete' !== a.type ), 'menus', { wp, build: noPost, onId: noPost, log, refs } );
	const again = planFor();
	const left = menusStep( again.plan, again.superseded );
	if ( again.plan.problems.length || left.actions.length ) {
		error( `FAILED: a fresh read still plans ${ left.actions.length } menu step(s): ${ left.actions.map( ( a ) => a.say ).join( '; ' ) }` );
		return 1;
	}
	log( `${ step.actions.length } menu step(s) run; a fresh read plans 0` );
	return 0;
}

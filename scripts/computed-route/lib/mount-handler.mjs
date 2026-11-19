// The handler a mount passes to a mounted component (Spec 48A FR-48A-17: a button built once as `Button.dc.html` and mounted
// through dc-import, `<dc-import name="Button" onPress="{{ f.toggle }}">`, whose own control binds `onClick="{{ onPress }}"`
// and whose renderVals gives `onPress: this.props.onPress`). A reader of click handlers (lib/skeleton-widgets.mjs, the
// accordion, slider and tabs rules; lib/skeleton-choice-flow.mjs) then reads the mount's binding in the parent's logic, as it
// would read a control drawn where it stands. Read from the draft's logic syntax tree, never run, never matched by a name.
import { isThisMember, resolveName, subtree } from './intake-ast.mjs';

// Whether a node is `this.props`, or a name the component declares as `this.props` (`const p = this.props`).
function isProps( d, n ) {
	if ( isThisMember( n, 'props' ) ) {
		return true;
	}
	if ( 'Identifier' === n?.type ) {
		const r = resolveName( d.idx, n );
		return 'var' === r?.kind && isThisMember( r.init, 'props' );
	}
	return false;
}

// The prop a component's logic node passes on (`p.onPress || null`, `this.props.onPress`): its name, or null when the node
// reads no prop, or two. `d`: the component's draft logic (lib/skeleton-narrowing.mjs::draftLogicOf).
export function passedProp( d, node ) {
	if ( ! d || ! node ) {
		return null;
	}
	const names = new Set( subtree( d.idx, node ).filter( ( n ) => 'MemberExpression' === n.type && ! n.computed && isProps( d, n.object ) ).map( ( n ) => n.property?.name ).filter( Boolean ) );
	return 1 === names.size ? [ ...names ][ 0 ] : null;
}

// The binding a mount gives its component's click handler: the expression inside the mount attribute (`f.toggle`) named by
// the prop the control's own handler passes on, or null. `control`: the control's template record; `mount`: the dc-import's
// template record in the parent; `own`: the component's logic readings (lib/skeleton-widgets.mjs::logicReadings).
export function mountBinding( { control, mount, own, event = 'onClick' } ) {
	const expr = ( control?.events || [] ).find( ( ev ) => ev.name.toLowerCase() === event.toLowerCase() )?.expr ?? null;
	if ( ! expr || ! mount || ! own ) {
		return null;
	}
	const prop = passedProp( own.d, own.valueOf( control, expr ) );
	const raw = prop ? Object.entries( mount.attrs || {} ).find( ( [ a ] ) => a === prop || a.toLowerCase() === prop.toLowerCase() )?.[ 1 ] : null;
	return /^\{\{\s*([\w$.]+)\s*\}\}$/.exec( String( raw ?? '' ).trim() )?.[ 1 ] ?? null;
}

/**
 * PlacedSuspense: a `Suspense` whose late content lands where the JSX puts it, inside an inspector fill.
 *
 * An `InspectorControls` fill renders its children through a portal into the slot's one container, next to every other
 * fill's portal. When a lazy child resolves after the first render, React inserts its nodes before the next host node
 * in its own portal's subtree; with none, it appends them to the container, after every other fill's panels. So a
 * panel loaded lazily lands last on first select and sits right once the tab is revisited (everything mounts at once).
 *
 * This keeps a hidden anchor element after the boundary until the content has mounted: the late nodes are inserted
 * before the anchor, in place. The anchor is removed once the content is in (a leftover node between two panels would
 * break core's `.components-panel__body + .components-panel__body` border rule).
 */
import { Suspense, useEffect, useState } from '@wordpress/element';

function Mounted( { onMount } ) {
	useEffect( () => {
		onMount();
	}, [ onMount ] );
	return null;
}

export default function PlacedSuspense( { children } ) {
	const [ ready, setReady ] = useState( false );
	return (
		<>
			<Suspense fallback={ null }>
				{ children }
				<Mounted onMount={ () => setReady( true ) } />
			</Suspense>
			{ ! ready && (
				<span hidden className="sgs-placed-suspense__anchor" />
			) }
		</>
	);
}

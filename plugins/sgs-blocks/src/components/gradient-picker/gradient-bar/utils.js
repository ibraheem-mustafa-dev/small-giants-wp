/**
 * SGS fork of WordPress core's `gradient-bar/utils.ts`, forked verbatim
 * at commit 28c0dedc4eaf001a24237a1fbba4b0887698b000 (WP 7.0.4). Type
 * annotations stripped only.
 */
import { MINIMUM_DISTANCE_BETWEEN_POINTS } from './constants';

export function clampPercent( value ) {
	return Math.max( 0, Math.min( 100, value ) );
}

export function isOverlapping(
	value,
	initialIndex,
	newPosition,
	minDistance = MINIMUM_DISTANCE_BETWEEN_POINTS
) {
	const initialPosition = value[ initialIndex ].position;
	const minPosition = Math.min( initialPosition, newPosition );
	const maxPosition = Math.max( initialPosition, newPosition );

	return value.some( ( { position }, index ) => {
		return (
			index !== initialIndex &&
			( Math.abs( position - newPosition ) < minDistance ||
				( minPosition < position && position < maxPosition ) )
		);
	} );
}

export function addControlPoint( points, position, color, token ) {
	const nextIndex = points.findIndex( ( point ) => point.position > position );
	// Task 3 divergence: carry an optional `token` (palette link) on the new
	// point alongside `color`/`position` — undefined for a custom colour,
	// matching every other point's shape.
	const newPoint = { color, position, token };
	const newPoints = points.slice();
	newPoints.splice( nextIndex - 1, 0, newPoint );
	return newPoints;
}

export function removeControlPoint( points, index ) {
	return points.filter( ( _point, pointIndex ) => {
		return pointIndex !== index;
	} );
}

export function updateControlPoint( points, index, newPoint ) {
	const newValue = points.slice();
	newValue[ index ] = newPoint;
	return newValue;
}

export function updateControlPointPosition( points, index, newPosition ) {
	if ( isOverlapping( points, index, newPosition ) ) {
		return points;
	}
	const newPoint = {
		...points[ index ],
		position: newPosition,
	};
	return updateControlPoint( points, index, newPoint );
}

/**
 * Task 3 divergence: accepts an optional 4th `token` argument. When set,
 * the point becomes palette-linked; when explicitly passed as `null` (the
 * operator picked a custom colour after previously having a palette link),
 * the token is cleared rather than left stale.
 */
export function updateControlPointColor( points, index, newColor, token ) {
	const newPoint = {
		...points[ index ],
		color: newColor,
		token: token ?? undefined,
	};
	return updateControlPoint( points, index, newPoint );
}

export function updateControlPointColorByPosition( points, position, newColor, token ) {
	const index = points.findIndex( ( point ) => point.position === position );
	return updateControlPointColor( points, index, newColor, token );
}

export function getHorizontalRelativeGradientPosition(
	mouseXCoordinate,
	containerElement
) {
	if ( ! containerElement ) {
		return;
	}
	const { x, width } = containerElement.getBoundingClientRect();
	const absolutePositionValue = mouseXCoordinate - x;
	return Math.round(
		clampPercent( ( absolutePositionValue * 100 ) / width )
	);
}

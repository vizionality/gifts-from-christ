<?php
/**
 * Plugin Name: Headless Shop — Config
 * Description: Shared constants and helpers for the headless storefront.
 */

defined( 'ABSPATH' ) || exit;

if ( ! defined( 'HEADLESS_FRONTEND_URL' ) ) {
	define( 'HEADLESS_FRONTEND_URL', 'http://localhost:3000' );
}

if ( ! defined( 'HEADLESS_HANDOFF_SECRET' ) ) {
	define( 'HEADLESS_HANDOFF_SECRET', 'dev-only-insecure-secret' );
}

/**
 * Origins permitted to call the REST/Store API with credentials.
 *
 * @return string[]
 */
function headless_allowed_origins(): array {
	$origins = array( untrailingslashit( HEADLESS_FRONTEND_URL ) );

	// Vercel preview deployments share a suffix; add explicit extras via filter.
	return array_values( array_unique( apply_filters( 'headless_allowed_origins', $origins ) ) );
}

/**
 * Whether an Origin header is allowed.
 */
function headless_is_allowed_origin( string $origin ): bool {
	$origin = untrailingslashit( $origin );

	if ( in_array( $origin, headless_allowed_origins(), true ) ) {
		return true;
	}

	// Allow *.vercel.app previews for the configured project when opted in.
	$suffix = apply_filters( 'headless_allowed_origin_suffix', '' );
	if ( $suffix && str_ends_with( $origin, $suffix ) && str_starts_with( $origin, 'https://' ) ) {
		return true;
	}

	return false;
}

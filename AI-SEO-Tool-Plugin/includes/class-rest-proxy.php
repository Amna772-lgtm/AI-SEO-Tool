<?php
/**
 * REST API proxy — forwards requests from WP admin to the AI SEO Tool backend.
 *
 * Per D-10: All routes at /wp-json/ai-seo-tool/v1/
 * Per D-03: No separate data store — all data from backend API.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class AI_SEO_Tool_REST_Proxy {

    public static function register_routes() {
        // POST /analyze/ — trigger audit (D-02)
        register_rest_route( 'ai-seo-tool/v1', '/analyze', array(
            'methods'             => 'POST',
            'callback'            => array( __CLASS__, 'proxy_analyze' ),
            'permission_callback' => array( __CLASS__, 'check_permission' ),
        ) );

        // GET /sites/{id} — job status polling (D-08)
        register_rest_route( 'ai-seo-tool/v1', '/sites/(?P<id>[a-zA-Z0-9\-]+)', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'proxy_site_status' ),
            'permission_callback' => array( __CLASS__, 'check_permission' ),
        ) );

        // GET /sites/{id}/pages — crawled pages
        register_rest_route( 'ai-seo-tool/v1', '/sites/(?P<id>[a-zA-Z0-9\-]+)/pages', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'proxy_site_pages' ),
            'permission_callback' => array( __CLASS__, 'check_permission' ),
        ) );

        // GET /sites/{id}/audit — technical audit results
        register_rest_route( 'ai-seo-tool/v1', '/sites/(?P<id>[a-zA-Z0-9\-]+)/audit', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'proxy_site_audit' ),
            'permission_callback' => array( __CLASS__, 'check_permission' ),
        ) );

        // GET /sites/{id}/geo — GEO results
        register_rest_route( 'ai-seo-tool/v1', '/sites/(?P<id>[a-zA-Z0-9\-]+)/geo', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'proxy_site_geo' ),
            'permission_callback' => array( __CLASS__, 'check_permission' ),
        ) );

        // GET /auth/me — user + plan info (D-15)
        register_rest_route( 'ai-seo-tool/v1', '/me', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'proxy_me' ),
            'permission_callback' => array( __CLASS__, 'check_permission' ),
        ) );

        // GET /history/ — past analyses (D-06 History tab)
        register_rest_route( 'ai-seo-tool/v1', '/history', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'proxy_history' ),
            'permission_callback' => array( __CLASS__, 'check_permission' ),
        ) );

        // POST /connect — validate API key + backend URL and save to wp_options
        register_rest_route( 'ai-seo-tool/v1', '/connect', array(
            'methods'             => 'POST',
            'callback'            => array( __CLASS__, 'connect' ),
            'permission_callback' => array( __CLASS__, 'check_permission' ),
        ) );

        // POST /disconnect — clear stored API key and backend URL
        register_rest_route( 'ai-seo-tool/v1', '/disconnect', array(
            'methods'             => 'POST',
            'callback'            => array( __CLASS__, 'disconnect' ),
            'permission_callback' => array( __CLASS__, 'check_permission' ),
        ) );

        // GET /settings — return current connection settings
        register_rest_route( 'ai-seo-tool/v1', '/settings', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'get_settings' ),
            'permission_callback' => array( __CLASS__, 'check_permission' ),
        ) );
    }

    public static function check_permission() {
        return is_user_logged_in() && current_user_can( 'manage_options' );
    }

    // ── Proxy helpers ──

    private static function get_backend_url(): string {
        return AI_SEO_TOOL_BACKEND_URL;
    }

    private static function get_api_key(): string {
        return get_option( 'ai_seo_tool_api_key', '' );
    }

    private static function proxy_get( string $path ): \WP_REST_Response {
        $api_key = self::get_api_key();
        $backend = self::get_backend_url();
        if ( empty( $api_key ) ) {
            return new \WP_REST_Response( array( 'error' => 'Not connected. Configure your API key in Settings.' ), 401 );
        }
        $response = wp_remote_get( $backend . $path, array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $api_key,
                'Content-Type'  => 'application/json',
            ),
            'timeout' => 30,
        ) );
        return self::format_response( $response );
    }

    private static function proxy_post( string $path, array $body = array() ): \WP_REST_Response {
        $api_key = self::get_api_key();
        $backend = self::get_backend_url();
        if ( empty( $api_key ) ) {
            return new \WP_REST_Response( array( 'error' => 'Not connected. Configure your API key in Settings.' ), 401 );
        }
        $response = wp_remote_post( $backend . $path, array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $api_key,
                'Content-Type'  => 'application/json',
            ),
            'body'    => wp_json_encode( $body ),
            'timeout' => 30,
        ) );
        return self::format_response( $response );
    }

    private static function format_response( $response ): \WP_REST_Response {
        if ( is_wp_error( $response ) ) {
            return new \WP_REST_Response(
                array( 'error' => $response->get_error_message() ),
                502
            );
        }
        $status = wp_remote_retrieve_response_code( $response );
        $body   = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( $body === null ) {
            $body = array( 'message' => 'Invalid response from backend', 'code' => 'backend_error' );
        }
        // Normalize FastAPI-style errors so apiFetch receives a proper `message` field.
        if ( $status >= 400 ) {
            if ( ! isset( $body['message'] ) ) {
                $body['message'] = isset( $body['detail'] ) && is_string( $body['detail'] )
                    ? $body['detail']
                    : ( $body['error'] ?? 'Request failed' );
            }
            if ( ! isset( $body['code'] ) ) {
                $body['code'] = 'backend_error';
            }
        }
        return new \WP_REST_Response( $body, $status );
    }

    // ── Route callbacks ──

    public static function proxy_analyze( \WP_REST_Request $request ): \WP_REST_Response {
        $body = $request->get_json_params();
        return self::proxy_post( '/analyze/', $body );
    }

    public static function proxy_site_status( \WP_REST_Request $request ): \WP_REST_Response {
        $id = $request->get_param( 'id' );
        return self::proxy_get( '/sites/' . sanitize_text_field( $id ) );
    }

    public static function proxy_site_pages( \WP_REST_Request $request ): \WP_REST_Response {
        $id = $request->get_param( 'id' );
        return self::proxy_get( '/sites/' . sanitize_text_field( $id ) . '/pages' );
    }

    public static function proxy_site_audit( \WP_REST_Request $request ): \WP_REST_Response {
        $id = $request->get_param( 'id' );
        return self::proxy_get( '/sites/' . sanitize_text_field( $id ) . '/audit' );
    }

    public static function proxy_site_geo( \WP_REST_Request $request ): \WP_REST_Response {
        $id = $request->get_param( 'id' );
        return self::proxy_get( '/sites/' . sanitize_text_field( $id ) . '/geo' );
    }

    public static function proxy_me( \WP_REST_Request $request ): \WP_REST_Response {
        return self::proxy_get( '/auth/me' );
    }

    public static function proxy_history( \WP_REST_Request $request ): \WP_REST_Response {
        $domain = $request->get_param( 'domain' );
        $path   = '/history/';
        if ( ! empty( $domain ) ) {
            $path .= '?domain=' . urlencode( sanitize_text_field( $domain ) );
        }
        return self::proxy_get( $path );
    }

    // ── Connection management (not proxied — manages wp_options) ──

    public static function connect( \WP_REST_Request $request ): \WP_REST_Response {
        $params  = $request->get_json_params();
        $api_key = isset( $params['api_key'] ) ? sanitize_text_field( $params['api_key'] ) : '';

        if ( empty( $api_key ) ) {
            return new \WP_REST_Response( array( 'error' => 'API key is required.' ), 400 );
        }

        // Validate the API key by calling /auth/me on the backend
        $response = wp_remote_get( AI_SEO_TOOL_BACKEND_URL . '/auth/me', array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $api_key,
                'Content-Type'  => 'application/json',
            ),
            'timeout' => 15,
        ) );

        if ( is_wp_error( $response ) ) {
            return new \WP_REST_Response( array( 'error' => 'Could not connect to the AI SEO Tool backend.' ), 502 );
        }

        $status = wp_remote_retrieve_response_code( $response );
        if ( $status !== 200 ) {
            return new \WP_REST_Response( array( 'error' => 'Invalid API key. Generate a key from your AI SEO Tool account under Settings > API Keys.' ), 401 );
        }

        update_option( 'ai_seo_tool_api_key', sanitize_text_field( $api_key ) );

        $user_data = json_decode( wp_remote_retrieve_body( $response ), true );
        return new \WP_REST_Response( array( 'status' => 'connected', 'user' => $user_data ), 200 );
    }

    public static function disconnect( \WP_REST_Request $request ): \WP_REST_Response {
        update_option( 'ai_seo_tool_api_key', '' );
        return new \WP_REST_Response( array( 'status' => 'disconnected' ), 200 );
    }

    public static function get_settings( \WP_REST_Request $request ): \WP_REST_Response {
        return new \WP_REST_Response( array(
            'connected'   => ! empty( self::get_api_key() ),
            'backend_url' => AI_SEO_TOOL_BACKEND_URL,
            'site_url'    => get_site_url(),
        ), 200 );
    }
}

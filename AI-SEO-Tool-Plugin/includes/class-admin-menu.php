<?php
/**
 * WordPress admin menu and sub-menu registration.
 *
 * Per D-04: top-level menu item "AI SEO Tool"
 * Per D-05: sub-pages Dashboard, GEO Analysis, Technical Audit, History, Settings
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class AI_SEO_Tool_Admin_Menu {
    public static function register() {
        add_menu_page(
            __( 'AI SEO Tool', 'ai-seo-tool' ),
            __( 'AI SEO Tool', 'ai-seo-tool' ),
            'manage_options',
            'ai-seo-tool',
            array( __CLASS__, 'render_page' ),
            'dashicons-chart-bar',
            30
        );

        add_submenu_page( 'ai-seo-tool', __( 'Dashboard', 'ai-seo-tool' ), __( 'Dashboard', 'ai-seo-tool' ), 'manage_options', 'ai-seo-tool',          array( __CLASS__, 'render_page' ) );
        add_submenu_page( 'ai-seo-tool', __( 'Settings', 'ai-seo-tool' ),  __( 'Settings', 'ai-seo-tool' ),  'manage_options', 'ai-seo-tool-settings', array( __CLASS__, 'render_page' ) );
    }

    public static function render_page() {
        $current_page = isset( $_GET['page'] ) ? sanitize_key( $_GET['page'] ) : 'ai-seo-tool';
        echo '<div class="wrap">';
        echo '<div id="ai-seo-tool-root" data-page="' . esc_attr( $current_page ) . '"></div>';
        echo '</div>';
    }
}

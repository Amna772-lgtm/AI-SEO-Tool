<?php
/**
 * Plugin Name: AI SEO Tool
 * Plugin URI: https://example.com/ai-seo-tool
 * Description: Connect your WordPress site to AI SEO Tool for AI citation readiness audits directly within your admin dashboard.
 * Version: 1.0.0
 * Requires at least: 6.0
 * Tested up to: 6.7
 * Requires PHP: 8.0
 * Author: AI SEO Tool
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: ai-seo-tool
 * Domain Path: /languages
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'AI_SEO_TOOL_VERSION', '1.0.0' );
define( 'AI_SEO_TOOL_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'AI_SEO_TOOL_PLUGIN_URL', plugins_url( '/', __FILE__ ) );
define( 'AI_SEO_TOOL_BACKEND_URL', 'http://localhost:8000' );

require_once AI_SEO_TOOL_PLUGIN_DIR . 'includes/class-activator.php';
require_once AI_SEO_TOOL_PLUGIN_DIR . 'includes/class-admin-menu.php';
require_once AI_SEO_TOOL_PLUGIN_DIR . 'includes/class-rest-proxy.php';

// Activation hook — NO external calls (D-19)
register_activation_hook( __FILE__, array( 'AI_SEO_Tool_Activator', 'activate' ) );

// Admin menu registration
add_action( 'admin_menu', array( 'AI_SEO_Tool_Admin_Menu', 'register' ) );

// REST API proxy routes
add_action( 'rest_api_init', array( 'AI_SEO_Tool_REST_Proxy', 'register_routes' ) );

// Enqueue admin scripts on plugin pages only
add_action( 'admin_enqueue_scripts', 'ai_seo_tool_enqueue_admin_scripts' );

function ai_seo_tool_enqueue_admin_scripts( $hook_suffix ) {
    if ( strpos( $hook_suffix, 'ai-seo-tool' ) === false ) {
        return;
    }
    $asset_file = AI_SEO_TOOL_PLUGIN_DIR . 'build/index.asset.php';
    if ( ! file_exists( $asset_file ) ) {
        return;
    }
    $asset = include $asset_file;

    wp_enqueue_script(
        'ai-seo-tool-admin',
        AI_SEO_TOOL_PLUGIN_URL . 'build/index.js',
        $asset['dependencies'],
        $asset['version'],
        array( 'in_footer' => true )
    );

    wp_enqueue_style( 'wp-components' );

    wp_localize_script( 'ai-seo-tool-admin', 'aiSeoTool', array(
        'siteUrl'    => get_site_url(),
        'apiBase'    => rest_url( 'ai-seo-tool/v1' ),
        'nonce'      => wp_create_nonce( 'wp_rest' ),
        'pluginUrl'  => AI_SEO_TOOL_PLUGIN_URL,
        'mainAppUrl' => AI_SEO_TOOL_BACKEND_URL,
        'connected'  => ! empty( get_option( 'ai_seo_tool_api_key', '' ) ),
    ) );
}

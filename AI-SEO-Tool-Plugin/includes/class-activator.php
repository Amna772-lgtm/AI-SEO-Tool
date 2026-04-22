<?php
/**
 * Plugin activation — sets default options. NO external API calls (D-19 compliance).
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class AI_SEO_Tool_Activator {
    public static function activate() {
        if ( ! get_option( 'ai_seo_tool_api_key' ) ) {
            add_option( 'ai_seo_tool_api_key', '' );
        }
    }
}

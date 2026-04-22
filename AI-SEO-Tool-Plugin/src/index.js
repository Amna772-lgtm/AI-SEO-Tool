/**
 * AI SEO Tool — WordPress Admin React App
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */
import { createRoot } from '@wordpress/element';
import App from './App';

const rootEl = document.getElementById( 'ai-seo-tool-root' );

if ( rootEl ) {
    const root = createRoot( rootEl );
    root.render( <App /> );
}

/**
 * AI SEO Tool — Root App Component
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */
import { useState } from '@wordpress/element';
import ConnectionScreen from './components/ConnectionScreen';
import DashboardScreen from './components/DashboardScreen';

export default function App() {
    const initialPage = document.getElementById( 'ai-seo-tool-root' )?.dataset?.page || 'ai-seo-tool';
    const [ connected, setConnected ] = useState( window.aiSeoTool?.connected || false );
    const [ currentPage ] = useState( initialPage );

    if ( ! connected ) {
        return <ConnectionScreen onConnected={ () => setConnected( true ) } />;
    }

    return (
        <DashboardScreen
            currentPage={ currentPage }
            onDisconnected={ () => setConnected( false ) }
        />
    );
}

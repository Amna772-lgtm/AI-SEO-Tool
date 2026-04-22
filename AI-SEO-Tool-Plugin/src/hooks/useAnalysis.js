/**
 * AI SEO Tool — useAnalysis hook
 * Recursive setTimeout polling for analysis job status.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */
import { useState, useEffect, useRef } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

/**
 * Polls /ai-seo-tool/v1/sites/{siteId} every intervalMs until completed or failed.
 *
 * @param {string|null} siteId      - The site/job ID to poll. Polling starts when non-null.
 * @param {number}      intervalMs  - Poll interval in ms (default 3000).
 *
 * @return {{ status: string|null, data: Object|null, error: string|null, reset: Function }}
 */
export default function useAnalysis( siteId, intervalMs = 3000 ) {
    const [ status, setStatus ] = useState( null );
    const [ data, setData ] = useState( null );
    const [ error, setError ] = useState( null );
    const timeoutRef = useRef( null );
    const activeRef = useRef( true );

    useEffect( () => {
        if ( ! siteId ) return;
        activeRef.current = true;
        setError( null );

        const poll = async () => {
            try {
                const result = await apiFetch( {
                    path: `/ai-seo-tool/v1/sites/${ siteId }`,
                } );
                if ( ! activeRef.current ) return;
                setStatus( result.status );
                setData( result );
                if ( result.status !== 'completed' && result.status !== 'failed' ) {
                    timeoutRef.current = setTimeout( poll, intervalMs );
                }
                if ( result.status === 'failed' ) {
                    setError( result.error || 'Audit failed. Check the AI SEO Tool backend logs for details.' );
                }
            } catch ( err ) {
                if ( activeRef.current ) {
                    const msg = err.message || err.detail || '';
                    const isGone = msg.toLowerCase().includes( 'not found' ) || msg.toLowerCase().includes( 'crawl' );
                    if ( isGone ) {
                        setError( 'expired' );
                        setStatus( 'expired' );
                    } else {
                        timeoutRef.current = setTimeout( poll, intervalMs * 2 );
                    }
                }
            }
        };

        poll();

        return () => {
            activeRef.current = false;
            clearTimeout( timeoutRef.current );
        };
    }, [ siteId, intervalMs ] );

    const reset = () => {
        setStatus( null );
        setData( null );
        setError( null );
    };

    return { status, data, error, reset };
}

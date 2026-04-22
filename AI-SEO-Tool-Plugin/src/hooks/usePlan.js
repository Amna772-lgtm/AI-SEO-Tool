/**
 * AI SEO Tool — usePlan hook
 * Fetches user plan data from /wp-json/ai-seo-tool/v1/me
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */
import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

/**
 * Returns: { plan: { id, email, name, plan, audit_count, audit_limit } | null, loading: boolean, error: string | null }
 */
export default function usePlan() {
    const [ plan, setPlan ] = useState( null );
    const [ loading, setLoading ] = useState( true );
    const [ error, setError ] = useState( null );

    useEffect( () => {
        apiFetch( { path: '/ai-seo-tool/v1/me' } )
            .then( ( data ) => {
                setPlan( data );
                setLoading( false );
            } )
            .catch( ( err ) => {
                setError( err.message || 'Failed to load plan info' );
                setLoading( false );
            } );
    }, [] );

    return { plan, loading, error };
}

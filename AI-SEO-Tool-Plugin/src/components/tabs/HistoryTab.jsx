/**
 * AI SEO Tool — HistoryTab
 * Shows list of past analyses. Trend chart (future) gated to Pro plan.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */
import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { Card, CardBody, Spinner, Notice } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import PlanGate from '../PlanGate';

/**
 * @param {Object} props
 * @param {Object} props.plan - Plan object from usePlan.
 */
export default function HistoryTab( { plan } ) {
    const [ history, setHistory ] = useState( [] );
    const [ loading, setLoading ] = useState( true );
    const [ error, setError ] = useState( null );

    const mainAppUrl = window.aiSeoTool?.mainAppUrl || '';

    // Extract domain from WP site URL (e.g. "https://mysite.local" → "mysite.local")
    const siteDomain = ( () => {
        try {
            return new URL( window.aiSeoTool?.siteUrl || '' ).hostname;
        } catch {
            return '';
        }
    } )();

    useEffect( () => {
        let cancelled = false;
        async function fetchHistory() {
            setLoading( true );
            setError( null );
            try {
                const path = siteDomain
                    ? `/ai-seo-tool/v1/history?domain=${ encodeURIComponent( siteDomain ) }`
                    : '/ai-seo-tool/v1/history';
                const res = await apiFetch( { path } );
                if ( ! cancelled ) setHistory( Array.isArray( res?.items ) ? res.items : [] );
            } catch ( err ) {
                if ( ! cancelled ) setError( err.message || __( 'Failed to load audit history.', 'ai-seo-tool' ) );
            } finally {
                if ( ! cancelled ) setLoading( false );
            }
        }
        fetchHistory();
        return () => { cancelled = true; };
    }, [] );

    const isFree = plan?.plan === 'free';

    if ( loading ) {
        return (
            <div style={ { display: 'flex', alignItems: 'center', gap: '8px', padding: '24px' } }>
                <Spinner />
                <span>{ __( 'Loading audit history…', 'ai-seo-tool' ) }</span>
            </div>
        );
    }

    if ( error ) {
        return <Notice status="error" isDismissible={ false }>{ error }</Notice>;
    }

    return (
        <div>

            {/* Trend chart area — Pro plan only */}
            { isFree ? (
                <div style={ { marginBottom: '16px' } }>
                    <PlanGate featureName={ __( 'Score trend charts are available on the Pro plan. Upgrade to track your GEO citation score over time.', 'ai-seo-tool' ) } />
                </div>
            ) : (
                /* Trend chart is a future enhancement — see Phase 09 plan 06+ */
                <div style={ { marginBottom: '16px', padding: '16px', backgroundColor: '#f0f0f1', borderRadius: '4px', fontSize: '12px', color: '#757575' } }>
                    { __( 'Score trend chart — coming soon.', 'ai-seo-tool' ) }
                </div>
            ) }

            {/* Audit list */}
            <Card>
                <CardBody style={ { padding: '0' } }>
                    { history.length === 0 ? (
                        <div style={ { padding: '48px 24px', textAlign: 'center' } }>
                            <h3 style={ { marginTop: 0 } }>{ __( 'No audits yet', 'ai-seo-tool' ) }</h3>
                            <p style={ { color: '#757575' } }>
                                { __( "Click 'Analyze This Site' to run your first GEO citation readiness audit.", 'ai-seo-tool' ) }
                            </p>
                        </div>
                    ) : (
                        <div style={ { overflowX: 'auto' } }>
                            <table className="wp-list-table widefat fixed striped" style={ { marginBottom: 0 } }>
                                <thead>
                                    <tr>
                                        <th scope="col">{ __( 'Date', 'ai-seo-tool' ) }</th>
                                        <th scope="col">{ __( 'Score', 'ai-seo-tool' ) }</th>
                                        <th scope="col">{ __( 'Grade', 'ai-seo-tool' ) }</th>
                                        <th scope="col">{ __( 'Pages Crawled', 'ai-seo-tool' ) }</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    { history.map( ( item, idx ) => (
                                        <tr key={ item.id || idx }>
                                            <td>{ formatDate( item.analyzed_at ) }</td>
                                            <td>{ Math.round( item.overall_score || 0 ) }</td>
                                            <td>
                                                <GradeBadge grade={ item.grade } score={ item.overall_score } />
                                            </td>
                                            <td>{ item.pages_count || '—' }</td>
                                        </tr>
                                    ) ) }
                                </tbody>
                            </table>
                        </div>
                    ) }
                </CardBody>
            </Card>
        </div>
    );
}

/** Formats an ISO date string to a human-readable date. */
function formatDate( iso ) {
    if ( ! iso ) return '—';
    try {
        return new Date( iso ).toLocaleDateString( undefined, { year: 'numeric', month: 'short', day: 'numeric' } );
    } catch {
        return iso;
    }
}

/** Grade badge with score color. */
function GradeBadge( { grade, score } ) {
    if ( ! grade ) return <span>{ '—' }</span>;

    const color = score >= 80 ? '#16a34a'
        : score >= 65 ? '#ca8a04'
        : score >= 50 ? '#ea580c'
        : '#dc2626';

    return (
        <span style={ {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: color,
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 600,
        } }>
            { grade }
        </span>
    );
}

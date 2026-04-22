/**
 * AI SEO Tool — TechnicalAuditTab
 * Shows HTTPS/sitemap/broken links/canonicals, security headers, and PageSpeed.
 * Free plan users see PlanGate instead.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */
import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { Card, CardBody, Spinner, Notice } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import GeoScoreRing from '../GeoScoreRing';
import PlanGate from '../PlanGate';

const SECURITY_HEADERS = [
    { key: 'hsts',                   label: 'HSTS' },
    { key: 'content_security_policy', label: 'Content Security Policy' },
    { key: 'x_frame_options',        label: 'X-Frame-Options' },
    { key: 'x_content_type_options', label: 'X-Content-Type-Options' },
    { key: 'referrer_policy',        label: 'Referrer-Policy' },
];

/**
 * @param {Object} props
 * @param {string} props.siteId - Analysis site/job ID.
 * @param {Object} props.plan   - Plan object from usePlan.
 */
export default function TechnicalAuditTab( { siteId, plan } ) {
    const [ audit, setAudit ] = useState( null );
    const [ loading, setLoading ] = useState( true );
    const [ error, setError ] = useState( null );

    const mainAppUrl = window.aiSeoTool?.mainAppUrl || '';

    // Free plan gate
    if ( plan?.plan === 'free' ) {
        return <PlanGate />;
    }

    useEffect( () => {
        if ( ! siteId ) {
            setLoading( false );
            return;
        }

        let cancelled = false;
        async function fetchAudit() {
            setLoading( true );
            setError( null );
            try {
                const res = await apiFetch( { path: `/ai-seo-tool/v1/sites/${ siteId }/audit` } );
                if ( ! cancelled ) setAudit( res );
            } catch ( err ) {
                if ( ! cancelled ) setError( err.message || __( 'Failed to load audit data.', 'ai-seo-tool' ) );
            } finally {
                if ( ! cancelled ) setLoading( false );
            }
        }
        fetchAudit();
        return () => { cancelled = true; };
    }, [ siteId ] );

    if ( loading ) {
        return (
            <div style={ { display: 'flex', alignItems: 'center', gap: '8px', padding: '24px' } }>
                <Spinner />
                <span>{ __( 'Loading technical audit…', 'ai-seo-tool' ) }</span>
            </div>
        );
    }

    if ( error ) {
        return <Notice status="error" isDismissible={ false }>{ error }</Notice>;
    }

    if ( ! audit ) {
        return (
            <Notice status="info" isDismissible={ false }>
                { __( 'Technical audit data not yet available.', 'ai-seo-tool' ) }
            </Notice>
        );
    }

    const https          = audit.https          || {};
    const sitemap        = audit.sitemap        || {};
    const brokenLinks    = audit.broken_links   || [];
    const canonicals     = audit.canonicals     || {};
    const securityHeaders = audit.security_headers || {};
    const pagespeed      = audit.pagespeed      || {};

    const desktopScore = Math.round( pagespeed.desktop?.performance_score || pagespeed.desktop?.score || 0 );
    const mobileScore  = Math.round( pagespeed.mobile?.performance_score  || pagespeed.mobile?.score  || 0 );

    return (
        <div>

            {/* 4 summary cards in 2×2 grid */}
            <div style={ { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' } }>
                <SummaryCard
                    label={ __( 'HTTPS', 'ai-seo-tool' ) }
                    pass={ https.secure === true }
                    passText={ __( 'Secure', 'ai-seo-tool' ) }
                    failText={ __( 'Not Secure', 'ai-seo-tool' ) }
                />
                <SummaryCard
                    label={ __( 'Sitemap', 'ai-seo-tool' ) }
                    pass={ sitemap.found === true }
                    passText={ __( 'Found', 'ai-seo-tool' ) }
                    failText={ __( 'Not Found', 'ai-seo-tool' ) }
                />
                <SummaryCard
                    label={ __( 'Broken Links', 'ai-seo-tool' ) }
                    pass={ brokenLinks.length === 0 }
                    passText={ __( 'None Found', 'ai-seo-tool' ) }
                    failText={ `${ brokenLinks.length } ${ __( 'found', 'ai-seo-tool' ) }` }
                />
                <SummaryCard
                    label={ __( 'Canonicals', 'ai-seo-tool' ) }
                    pass={ ! ( canonicals.missing_count > 0 ) }
                    passText={ __( 'OK', 'ai-seo-tool' ) }
                    failText={ `${ canonicals.missing_count || 0 } ${ __( 'missing', 'ai-seo-tool' ) }` }
                />
            </div>

            {/* Security headers + PageSpeed */}
            <div style={ { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' } }>

                {/* Security Headers */}
                <Card>
                    <CardBody style={ { padding: '16px' } }>
                        <h3 style={ { margin: '0 0 12px', fontSize: '13px', fontWeight: 600 } }>
                            { __( 'Security Headers', 'ai-seo-tool' ) }
                        </h3>
                        <ul style={ { margin: 0, padding: 0, listStyle: 'none' } }>
                            { SECURITY_HEADERS.map( ( { key, label } ) => {
                                const pass = !! securityHeaders[ key ];
                                return (
                                    <li key={ key } style={ { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #f0f0f1' } }>
                                        <span
                                            className={ `dashicons ${ pass ? 'dashicons-yes-alt' : 'dashicons-dismiss' }` }
                                            style={ { color: pass ? '#16a34a' : '#dc2626', fontSize: '16px' } }
                                        />
                                        <span style={ { fontSize: '13px' } }>{ label }</span>
                                    </li>
                                );
                            } ) }
                        </ul>
                    </CardBody>
                </Card>

                {/* PageSpeed */}
                <Card>
                    <CardBody style={ { padding: '16px' } }>
                        <h3 style={ { margin: '0 0 16px', fontSize: '13px', fontWeight: 600 } }>
                            { __( 'PageSpeed', 'ai-seo-tool' ) }
                        </h3>
                        <div style={ { display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' } }>
                            <div style={ { textAlign: 'center' } }>
                                <div style={ { fontSize: '12px', color: '#757575', marginBottom: '8px' } }>
                                    { __( 'Desktop', 'ai-seo-tool' ) }
                                </div>
                                <GeoScoreRing score={ desktopScore } size={ 80 } />
                            </div>
                            <div style={ { textAlign: 'center' } }>
                                <div style={ { fontSize: '12px', color: '#757575', marginBottom: '8px' } }>
                                    { __( 'Mobile', 'ai-seo-tool' ) }
                                </div>
                                <GeoScoreRing score={ mobileScore } size={ 80 } />
                            </div>
                        </div>
                        { ( pagespeed.desktop || pagespeed.mobile ) && (
                            <div style={ { marginTop: '16px' } }>
                                <CoreWebVitals desktop={ pagespeed.desktop } mobile={ pagespeed.mobile } />
                            </div>
                        ) }
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}

/** Pass/fail summary card for audit overview items. */
function SummaryCard( { label, pass, passText, failText } ) {
    return (
        <Card>
            <CardBody style={ { padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' } }>
                <span
                    className={ `dashicons ${ pass ? 'dashicons-yes-alt' : 'dashicons-dismiss' }` }
                    style={ { color: pass ? '#16a34a' : '#dc2626', fontSize: '24px', flexShrink: 0 } }
                />
                <div>
                    <div style={ { fontSize: '11px', color: '#757575', textTransform: 'uppercase', letterSpacing: '0.05em' } }>
                        { label }
                    </div>
                    <div style={ { fontSize: '13px', fontWeight: 600 } }>
                        { pass ? passText : failText }
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}

/** Core Web Vitals metric grid. */
function CoreWebVitals( { desktop, mobile } ) {
    const metrics = [
        { key: 'fcp',  label: 'FCP' },
        { key: 'lcp',  label: 'LCP' },
        { key: 'tbt',  label: 'TBT' },
        { key: 'cls',  label: 'CLS' },
        { key: 'speed_index', label: 'SI' },
    ];

    return (
        <div style={ { overflowX: 'auto' } }>
            <table style={ { width: '100%', borderCollapse: 'collapse', fontSize: '12px' } }>
                <thead>
                    <tr>
                        <th style={ { textAlign: 'left', padding: '4px 8px', color: '#757575' } }>{ __( 'Metric', 'ai-seo-tool' ) }</th>
                        <th style={ { textAlign: 'right', padding: '4px 8px', color: '#757575' } }>{ __( 'Desktop', 'ai-seo-tool' ) }</th>
                        <th style={ { textAlign: 'right', padding: '4px 8px', color: '#757575' } }>{ __( 'Mobile', 'ai-seo-tool' ) }</th>
                    </tr>
                </thead>
                <tbody>
                    { metrics.map( ( { key, label } ) => (
                        <tr key={ key }>
                            <td style={ { padding: '4px 8px' } }>{ label }</td>
                            <td style={ { padding: '4px 8px', textAlign: 'right' } }>{ desktop?.[ key ] ?? '—' }</td>
                            <td style={ { padding: '4px 8px', textAlign: 'right' } }>{ mobile?.[ key ] ?? '—' }</td>
                        </tr>
                    ) ) }
                </tbody>
            </table>
        </div>
    );
}

/**
 * AI SEO Tool — TechnicalAuditTab
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */
import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { Spinner, Notice } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import GeoScoreRing from '../GeoScoreRing';
import PlanGate from '../PlanGate';

const SECURITY_HEADERS = [
    { key: 'hsts',                    label: 'HSTS',                  desc: 'Forces HTTPS connections' },
    { key: 'content_security_policy', label: 'Content Security Policy', desc: 'Prevents XSS attacks' },
    { key: 'x_frame_options',         label: 'X-Frame-Options',        desc: 'Blocks clickjacking' },
    { key: 'x_content_type_options',  label: 'X-Content-Type-Options', desc: 'Prevents MIME sniffing' },
    { key: 'referrer_policy',         label: 'Referrer-Policy',        desc: 'Controls referrer info' },
];

const CWV_METRICS = [
    { key: 'fcp',         label: 'FCP',          desc: 'First Contentful Paint' },
    { key: 'lcp',         label: 'LCP',          desc: 'Largest Contentful Paint' },
    { key: 'tbt',         label: 'TBT',          desc: 'Total Blocking Time' },
    { key: 'cls',         label: 'CLS',          desc: 'Cumulative Layout Shift' },
    { key: 'speed_index', label: 'Speed Index',  desc: 'Visual load speed' },
];

export default function TechnicalAuditTab( { siteId, plan } ) {
    const [ audit, setAudit ] = useState( null );
    const [ loading, setLoading ] = useState( true );
    const [ error, setError ] = useState( null );

    if ( plan?.plan === 'free' ) return <PlanGate />;

    useEffect( () => {
        if ( ! siteId ) { setLoading( false ); return; }
        let cancelled = false;
        apiFetch( { path: `/ai-seo-tool/v1/sites/${ siteId }/audit` } )
            .then( ( res ) => { if ( ! cancelled ) setAudit( res ); } )
            .catch( ( err ) => { if ( ! cancelled ) setError( err.message || __( 'Failed to load audit data.', 'ai-seo-tool' ) ); } )
            .finally( () => { if ( ! cancelled ) setLoading( false ); } );
        return () => { cancelled = true; };
    }, [ siteId ] );

    if ( loading ) return <LoadingState label={ __( 'Loading technical audit…', 'ai-seo-tool' ) } />;
    if ( error )   return <Notice status="error" isDismissible={ false }>{ error }</Notice>;
    if ( ! audit ) return <Notice status="info" isDismissible={ false }>{ __( 'Technical audit data not yet available.', 'ai-seo-tool' ) }</Notice>;

    const https           = audit.https           || {};
    const sitemap         = audit.sitemap         || {};
    const brokenLinks     = audit.broken_links    || [];
    const canonicals      = audit.canonicals      || {};
    const securityHeaders = audit.security_headers || {};
    const pagespeed       = audit.pagespeed       || {};

    const brokenCount  = typeof brokenLinks === 'object' && ! Array.isArray( brokenLinks )
        ? ( brokenLinks.count ?? ( brokenLinks.links?.length ?? 0 ) )
        : brokenLinks.length;
    const missingCanon = canonicals.missing_count ?? ( canonicals.pages?.length ?? 0 );

    const desktopScore = Math.round( pagespeed.desktop?.performance_score || pagespeed.desktop?.score || 0 );
    const mobileScore  = Math.round( pagespeed.mobile?.performance_score  || pagespeed.mobile?.score  || 0 );

    const summaryCards = [
        {
            label: __( 'HTTPS', 'ai-seo-tool' ),
            pass:  https.secure === true,
            value: https.secure === true ? __( 'Secure', 'ai-seo-tool' ) : __( 'Not Secure', 'ai-seo-tool' ),
            icon:  '🔒',
            passDesc: __( 'All traffic encrypted', 'ai-seo-tool' ),
            failDesc: __( 'Switch to HTTPS', 'ai-seo-tool' ),
        },
        {
            label: __( 'Sitemap', 'ai-seo-tool' ),
            pass:  sitemap.found === true,
            value: sitemap.found === true ? __( 'Found', 'ai-seo-tool' ) : __( 'Not Found', 'ai-seo-tool' ),
            icon:  '🗺️',
            passDesc: __( 'Sitemap detected', 'ai-seo-tool' ),
            failDesc: __( 'Add a sitemap.xml', 'ai-seo-tool' ),
        },
        {
            label: __( 'Broken Links', 'ai-seo-tool' ),
            pass:  brokenCount === 0,
            value: brokenCount === 0 ? __( 'None Found', 'ai-seo-tool' ) : `${ brokenCount } found`,
            icon:  '🔗',
            passDesc: __( 'All links healthy', 'ai-seo-tool' ),
            failDesc: __( 'Fix broken links', 'ai-seo-tool' ),
        },
        {
            label: __( 'Canonicals', 'ai-seo-tool' ),
            pass:  missingCanon === 0,
            value: missingCanon === 0 ? __( 'All present', 'ai-seo-tool' ) : `${ missingCanon } missing`,
            icon:  '🏷️',
            passDesc: __( 'Canonical tags OK', 'ai-seo-tool' ),
            failDesc: __( 'Add canonical tags', 'ai-seo-tool' ),
        },
    ];

    const headersPassing = SECURITY_HEADERS.filter( ( h ) => !! securityHeaders[ h.key ] ).length;

    return (
        <div style={ { display: 'flex', flexDirection: 'column', gap: '20px' } }>

            {/* Summary Cards */}
            <div style={ { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' } }>
                { summaryCards.map( ( { label, pass, value, icon, passDesc, failDesc } ) => (
                    <SummaryCard key={ label } label={ label } pass={ pass } value={ value } icon={ icon } desc={ pass ? passDesc : failDesc } />
                ) ) }
            </div>

            {/* Security + PageSpeed row */}
            <div style={ { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' } }>

                {/* Security Headers */}
                <Section title={ __( 'Security Headers', 'ai-seo-tool' ) } badge={ `${ headersPassing }/${ SECURITY_HEADERS.length }` } badgeColor={ headersPassing === SECURITY_HEADERS.length ? '#16a34a' : '#ca8a04' }>
                    <div style={ { display: 'flex', flexDirection: 'column', gap: '4px' } }>
                        { SECURITY_HEADERS.map( ( { key, label, desc } ) => {
                            const pass = !! securityHeaders[ key ];
                            return (
                                <div key={ key } style={ {
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '10px 12px',
                                    background: pass ? '#f0fdf4' : '#fef2f2',
                                    borderRadius: '8px',
                                    border: `1px solid ${ pass ? '#bbf7d0' : '#fecaca' }`,
                                } }>
                                    <span style={ { fontSize: '16px', flexShrink: 0 } }>{ pass ? '✅' : '❌' }</span>
                                    <div style={ { minWidth: 0 } }>
                                        <div style={ { fontSize: '12px', fontWeight: 600, color: '#1e293b' } }>{ label }</div>
                                        <div style={ { fontSize: '11px', color: '#6b7280' } }>{ desc }</div>
                                    </div>
                                </div>
                            );
                        } ) }
                    </div>
                </Section>

                {/* PageSpeed */}
                <Section title={ __( 'PageSpeed Insights', 'ai-seo-tool' ) }>
                    <div style={ { display: 'flex', justifyContent: 'center', gap: '32px', marginBottom: '20px' } }>
                        <ScoreDevice label={ __( 'Desktop', 'ai-seo-tool' ) } score={ desktopScore } />
                        <ScoreDevice label={ __( 'Mobile', 'ai-seo-tool' ) }  score={ mobileScore  } />
                    </div>
                    { ( pagespeed.desktop || pagespeed.mobile ) && (
                        <CoreWebVitals desktop={ pagespeed.desktop } mobile={ pagespeed.mobile } />
                    ) }
                </Section>
            </div>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingState( { label } ) {
    return (
        <div style={ { display: 'flex', alignItems: 'center', gap: '10px', padding: '32px 24px' } }>
            <Spinner />
            <span style={ { color: '#6b7280', fontSize: '13px' } }>{ label }</span>
        </div>
    );
}

function SummaryCard( { label, pass, value, icon, desc } ) {
    return (
        <div style={ {
            background: pass ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${ pass ? '#bbf7d0' : '#fecaca' }`,
            borderRadius: '12px',
            padding: '16px',
        } }>
            <div style={ { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' } }>
                <span style={ { fontSize: '22px' } }>{ icon }</span>
                <span style={ {
                    fontSize: '10px', fontWeight: 700,
                    color: pass ? '#16a34a' : '#dc2626',
                    background: '#fff',
                    borderRadius: '6px',
                    padding: '2px 7px',
                    border: `1px solid ${ pass ? '#bbf7d0' : '#fecaca' }`,
                } }>
                    { pass ? '✓ PASS' : '✗ FAIL' }
                </span>
            </div>
            <div style={ { fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' } }>
                { label }
            </div>
            <div style={ { fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' } }>{ value }</div>
            <div style={ { fontSize: '11px', color: '#6b7280' } }>{ desc }</div>
        </div>
    );
}

function Section( { title, badge, badgeColor = '#0d9488', children } ) {
    return (
        <div style={ {
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        } }>
            <div style={ {
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
            } }>
                <span style={ { fontSize: '13px', fontWeight: 700, color: '#1e293b' } }>{ title }</span>
                { badge && (
                    <span style={ {
                        fontSize: '11px', fontWeight: 700, color: badgeColor,
                        background: '#fff', borderRadius: '8px',
                        padding: '2px 8px',
                        border: `1px solid ${ badgeColor }33`,
                    } }>{ badge }</span>
                ) }
            </div>
            <div style={ { padding: '14px 16px' } }>{ children }</div>
        </div>
    );
}

function ScoreDevice( { label, score } ) {
    return (
        <div style={ { textAlign: 'center' } }>
            <div style={ { fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' } }>
                { label }
            </div>
            <GeoScoreRing score={ score } size={ 80 } />
        </div>
    );
}

function CoreWebVitals( { desktop, mobile } ) {
    return (
        <div style={ { display: 'flex', flexDirection: 'column', gap: '6px' } }>
            {/* Header */}
            <div style={ { display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', padding: '6px 10px' } }>
                <span style={ { fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' } }>Metric</span>
                <span style={ { fontSize: '11px', fontWeight: 700, color: '#6b7280', textAlign: 'right', minWidth: '52px' } }>Desktop</span>
                <span style={ { fontSize: '11px', fontWeight: 700, color: '#6b7280', textAlign: 'right', minWidth: '52px' } }>Mobile</span>
            </div>
            { CWV_METRICS.map( ( { key, label, desc } ) => (
                <div key={ key } style={ {
                    display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px',
                    padding: '8px 10px', background: '#f8fafc',
                    borderRadius: '8px', alignItems: 'center',
                } }>
                    <div>
                        <div style={ { fontSize: '12px', fontWeight: 600, color: '#1e293b' } }>{ label }</div>
                        <div style={ { fontSize: '10px', color: '#94a3b8' } }>{ desc }</div>
                    </div>
                    <span style={ { fontSize: '12px', fontWeight: 600, color: '#374151', textAlign: 'right', minWidth: '52px' } }>
                        { desktop?.[ key ] ?? '—' }
                    </span>
                    <span style={ { fontSize: '12px', fontWeight: 600, color: '#374151', textAlign: 'right', minWidth: '52px' } }>
                        { mobile?.[ key ] ?? '—' }
                    </span>
                </div>
            ) ) }
        </div>
    );
}

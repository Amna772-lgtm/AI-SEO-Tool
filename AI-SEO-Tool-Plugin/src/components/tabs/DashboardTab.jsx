/**
 * AI SEO Tool — DashboardTab
 * Shows GEO score gauge, HTTP status summary, pages crawled, and URLs table.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */
import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { Spinner, Notice } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { getScoreColor } from '../GeoScoreRing';

const SECURITY_HEADERS = [
    { key: 'hsts',                    label: 'HSTS',                    desc: 'Forces HTTPS connections' },
    { key: 'content_security_policy', label: 'Content Security Policy', desc: 'Prevents XSS attacks' },
    { key: 'x_frame_options',         label: 'X-Frame-Options',         desc: 'Blocks clickjacking' },
    { key: 'x_content_type_options',  label: 'X-Content-Type-Options',  desc: 'Prevents MIME sniffing' },
    { key: 'referrer_policy',         label: 'Referrer-Policy',         desc: 'Controls referrer info' },
];

const CWV_METRICS = [
    { key: 'fcp',         label: 'FCP',         desc: 'First Contentful Paint' },
    { key: 'lcp',         label: 'LCP',         desc: 'Largest Contentful Paint' },
    { key: 'tbt',         label: 'TBT',         desc: 'Total Blocking Time' },
    { key: 'cls',         label: 'CLS',         desc: 'Cumulative Layout Shift' },
    { key: 'speed_index', label: 'Speed Index', desc: 'Visual load speed' },
];

// ─── Semi-circle gauge ───────────────────────────────────────────────────────

function SemiCircleGauge( { score, grade } ) {
    const cx = 60, cy = 72, r = 50, sw = 10;
    const halfC = Math.PI * r;
    const scoreLen = ( ( score || 0 ) / 100 ) * halfC;
    const color = getScoreColor( score || 0 );

    const gradeLabel = score >= 80 ? __( 'Excellent', 'ai-seo-tool' )
        : score >= 65 ? __( 'Good progress', 'ai-seo-tool' )
        : score >= 50 ? __( 'Needs improvement', 'ai-seo-tool' )
        : __( 'Needs critical work', 'ai-seo-tool' );

    return (
        <div style={ { display: 'flex', flexDirection: 'column', alignItems: 'center' } }>
            <svg width="120" height="78" viewBox="0 0 120 78">
                <circle
                    cx={ cx } cy={ cy } r={ r }
                    fill="none" stroke="#e2e8f0" strokeWidth={ sw }
                    strokeDasharray={ `${ halfC } ${ halfC }` }
                    transform={ `rotate(180 ${ cx } ${ cy })` }
                />
                <circle
                    cx={ cx } cy={ cy } r={ r }
                    fill="none" stroke={ color } strokeWidth={ sw }
                    strokeLinecap="round"
                    strokeDasharray={ `${ scoreLen } ${ halfC * 2 - scoreLen }` }
                    transform={ `rotate(180 ${ cx } ${ cy })` }
                    style={ { transition: 'stroke-dasharray 0.8s ease' } }
                />
                <text x="60" y="62" textAnchor="middle" fill={ color } fontSize="26" fontWeight="700">
                    { score || 0 }
                </text>
                <text x="60" y="75" textAnchor="middle" fill="#94a3b8" fontSize="10">
                    /100
                </text>
            </svg>
            { grade && (
                <div style={ {
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: color, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, marginTop: '6px',
                } }>
                    { grade }
                </div>
            ) }
            <div style={ { fontSize: '11px', color: '#6b7280', marginTop: '6px', textAlign: 'center' } }>
                { gradeLabel }
            </div>
        </div>
    );
}

// ─── Technical health mini-cards ─────────────────────────────────────────────

function TechPassIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#16a34a"/>
            <path d="M7 12l3.5 3.5L17 8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

function TechFailIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#dc2626"/>
            <path d="M8 8l8 8M16 8l-8 8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
    );
}

// ─── Status icons ─────────────────────────────────────────────────────────────

function IconCheck() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="4" fill="#dcfce7"/>
            <path d="M7 12l3.5 3.5L17 8" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

function IconRedirect() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="4" fill="#fef9c3"/>
            <path d="M7 12h10M13 8l4 4-4 4" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

function IconWarning() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="4" fill="#fee2e2"/>
            <circle cx="12" cy="12" r="7" stroke="#dc2626" strokeWidth="1.5"/>
            <line x1="12" y1="8" x2="12" y2="13" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="16" r="0.8" fill="#dc2626"/>
        </svg>
    );
}

function IconServer() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="4" fill="#ede9fe"/>
            <rect x="6" y="7" width="12" height="4" rx="1" stroke="#7c3aed" strokeWidth="1.5"/>
            <rect x="6" y="13" width="12" height="4" rx="1" stroke="#7c3aed" strokeWidth="1.5"/>
            <circle cx="17" cy="9" r="0.8" fill="#7c3aed"/>
            <circle cx="17" cy="15" r="0.8" fill="#7c3aed"/>
        </svg>
    );
}

// ─── Status code badge ────────────────────────────────────────────────────────

function StatusBadge( { code } ) {
    const c = code || 0;
    const color = c >= 500 ? '#7c3aed' : c >= 400 ? '#dc2626' : c >= 300 ? '#ca8a04' : '#16a34a';
    const bg    = c >= 500 ? '#ede9fe' : c >= 400 ? '#fee2e2' : c >= 300 ? '#fef9c3' : '#dcfce7';
    return (
        <span style={ {
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 8px', borderRadius: '12px',
            background: bg, color, fontSize: '11px', fontWeight: 600,
        } }>
            <svg width="8" height="8" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="3" fill={ color }/>
            </svg>
            { code || '—' }
        </span>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {string} props.siteId - Analysis site/job ID.
 * @param {Object} props.data   - Site data from useAnalysis polling.
 * @param {Object} props.plan   - Plan object from usePlan.
 */
export default function DashboardTab( { siteId, data, plan } ) {
    const [ pages, setPages ] = useState( [] );
    const [ geo, setGeo ] = useState( null );
    const [ audit, setAudit ] = useState( null );
    const [ loading, setLoading ] = useState( true );
    const [ error, setError ] = useState( null );

    const mainAppUrl = window.aiSeoTool?.mainAppUrl || '';

    useEffect( () => {
        if ( ! siteId ) {
            setLoading( false );
            return;
        }

        let cancelled    = false;
        let auditTimer   = null;
        let geoTimer     = null;
        let attempts     = 0;
        let geoAttempts  = 0;

        const MAX_RETRIES       = 4;
        const RETRY_DELAY       = 2000;
        const MAX_GEO_POLLS     = 24;   // 24 × 5 s = 2 min
        const GEO_POLL_INTERVAL = 5000;

        async function pollGeo() {
            if ( cancelled || geoAttempts >= MAX_GEO_POLLS ) return;
            geoAttempts++;
            try {
                const res = await apiFetch( { path: `/ai-seo-tool/v1/sites/${ siteId }/geo` } );
                if ( ! cancelled ) {
                    if ( res?.score?.overall_score ) {
                        setGeo( res );
                    } else {
                        geoTimer = setTimeout( pollGeo, GEO_POLL_INTERVAL );
                    }
                }
            } catch {
                if ( ! cancelled ) geoTimer = setTimeout( pollGeo, GEO_POLL_INTERVAL );
            }
        }

        async function fetchData() {
            if ( attempts === 0 ) { setLoading( true ); setError( null ); }
            attempts++;
            try {
                const [ pagesRes, geoRes, auditRes ] = await Promise.all( [
                    apiFetch( { path: `/ai-seo-tool/v1/sites/${ siteId }/pages` } ),
                    apiFetch( { path: `/ai-seo-tool/v1/sites/${ siteId }/geo` } ),
                    apiFetch( { path: `/ai-seo-tool/v1/sites/${ siteId }/audit` } ).catch( () => null ),
                ] );
                if ( ! cancelled ) {
                    setPages( Array.isArray( pagesRes?.pages ) ? pagesRes.pages : [] );
                    setGeo( geoRes );
                    const auditData = auditRes?.audit ?? null;
                    setAudit( auditData );
                    setLoading( false );
                    if ( ! auditData && data?.status === 'completed' && attempts < MAX_RETRIES ) {
                        auditTimer = setTimeout( fetchData, RETRY_DELAY );
                    }
                    if ( ! geoRes?.score?.overall_score ) {
                        geoTimer = setTimeout( pollGeo, GEO_POLL_INTERVAL );
                    }
                }
            } catch ( err ) {
                if ( ! cancelled ) {
                    setError( err.message || __( 'Failed to load dashboard data.', 'ai-seo-tool' ) );
                    setLoading( false );
                }
            }
        }

        fetchData();
        return () => { cancelled = true; clearTimeout( auditTimer ); clearTimeout( geoTimer ); };
    }, [ siteId, data?.status ] );

    const statusCounts = pages.reduce( ( acc, page ) => {
        const code = page.status_code || 0;
        if ( code >= 500 ) acc[ '5xx' ] = ( acc[ '5xx' ] || 0 ) + 1;
        else if ( code >= 400 ) acc[ '4xx' ] = ( acc[ '4xx' ] || 0 ) + 1;
        else if ( code >= 300 ) acc[ '3xx' ] = ( acc[ '3xx' ] || 0 ) + 1;
        else if ( code >= 200 ) acc[ '2xx' ] = ( acc[ '2xx' ] || 0 ) + 1;
        return acc;
    }, {} );

    const score = geo?.score?.overall_score || 0;
    const grade = geo?.score?.grade || '';

    // Technical health values
    const httpsOk      = audit?.https?.secure === true;
    const sitemapOk    = !! audit?.sitemap?.found;
    const brokenCount  = audit?.broken_links?.count ?? ( Array.isArray( audit?.broken_links?.urls ) ? audit.broken_links.urls.length : null );
    const brokenOk     = brokenCount === 0;
    const missingCanon = audit?.missing_canonicals?.missing_count ?? ( Array.isArray( audit?.missing_canonicals?.urls ) ? audit.missing_canonicals.urls.length : null );
    const canonicalsOk = missingCanon === 0;

    const securityHeaders = audit?.security_headers || {};
    const pagespeed       = audit?.pagespeed        || {};
    const headersPassing  = SECURITY_HEADERS.filter( ( h ) => !! securityHeaders[ h.key ] ).length;
    const desktopScore    = Math.round( pagespeed.desktop?.performance_score || pagespeed.desktop?.score || 0 );
    const mobileScore     = Math.round( pagespeed.mobile?.performance_score  || pagespeed.mobile?.score  || 0 );

    const htmlPages      = pages.filter( ( p ) => p.type === 'internal' && ( ! p.content_type || p.content_type.includes( 'html' ) ) );
    const missingMetaDesc = htmlPages.filter( ( p ) => ! p.meta_descp ).length;
    const missingH1       = htmlPages.filter( ( p ) => ! p.h1 ).length;

    if ( loading ) {
        return (
            <div style={ { display: 'flex', alignItems: 'center', gap: '8px', padding: '24px' } }>
                <Spinner />
                <span style={ { color: '#6b7280' } }>{ __( 'Loading dashboard…', 'ai-seo-tool' ) }</span>
            </div>
        );
    }

    if ( error ) {
        return <Notice status="error" isDismissible={ false }>{ error }</Notice>;
    }

    return (
        <div>

            {/* 3-column summary row */}
            <div style={ {
                display: 'grid',
                gridTemplateColumns: '1fr 1.4fr 1.4fr',
                gap: '16px',
                marginBottom: '28px',
            } }>
                {/* AI Citation Score */}
                <div style={ cardStyle }>
                    <div style={ { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' } }>
                        <span style={ cardTitleStyle }>{ __( 'AI Citation Score', 'ai-seo-tool' ) }</span>
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="10" cy="10" r="10" fill="#e2e8f0"/>
                            <circle cx="10" cy="7" r="1.2" fill="#64748b"/>
                            <rect x="9" y="10" width="2" height="5" rx="1" fill="#64748b"/>
                        </svg>
                    </div>
                    <div style={ { display: 'flex', justifyContent: 'center' } }>
                        <SemiCircleGauge score={ score } grade={ grade } />
                    </div>
                </div>

                {/* HTTP Status Summary */}
                <div style={ cardStyle }>
                    <div style={ { marginBottom: '16px' } }>
                        <span style={ cardTitleStyle }>{ __( 'HTTP Status Summary', 'ai-seo-tool' ) }</span>
                    </div>
                    <div style={ { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } }>
                        { [
                            { label: __( '2xx OK', 'ai-seo-tool' ),       key: '2xx', Icon: IconCheck,    color: '#16a34a' },
                            { label: __( '3xx Redirect', 'ai-seo-tool' ), key: '3xx', Icon: IconRedirect, color: '#ca8a04' },
                            { label: __( '4xx Error', 'ai-seo-tool' ),    key: '4xx', Icon: IconWarning,  color: '#dc2626' },
                            { label: __( '5xx Server', 'ai-seo-tool' ),   key: '5xx', Icon: IconServer,   color: '#7c3aed' },
                        ].map( ( { label, key, Icon, color } ) => (
                            <div key={ key } style={ {
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '10px 12px', background: '#f8fafc',
                                borderRadius: '8px', border: '1px solid #e2e8f0',
                            } }>
                                <Icon />
                                <div>
                                    <div style={ { fontSize: '20px', fontWeight: 700, color, lineHeight: 1.1 } }>
                                        { statusCounts[ key ] || 0 }
                                    </div>
                                    <div style={ { fontSize: '11px', color: '#6b7280' } }>{ label }</div>
                                </div>
                            </div>
                        ) ) }
                    </div>
                </div>

                {/* Technical Health */}
                <div style={ cardStyle }>
                    <div style={ { marginBottom: '16px' } }>
                        <span style={ cardTitleStyle }>{ __( 'Technical Health', 'ai-seo-tool' ) }</span>
                    </div>
                    <div style={ { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } }>
                        { [
                            {
                                label: __( 'HTTPS', 'ai-seo-tool' ),
                                value: audit ? ( httpsOk ? __( 'Secure', 'ai-seo-tool' ) : __( 'Not Secure', 'ai-seo-tool' ) ) : '—',
                                pass: httpsOk,
                            },
                            {
                                label: __( 'Sitemap', 'ai-seo-tool' ),
                                value: audit ? ( sitemapOk ? __( 'Found', 'ai-seo-tool' ) : __( 'Not Found', 'ai-seo-tool' ) ) : '—',
                                pass: sitemapOk,
                            },
                            {
                                label: __( 'Broken Links', 'ai-seo-tool' ),
                                value: audit ? ( brokenCount == null ? '—' : brokenOk ? __( 'None Found', 'ai-seo-tool' ) : `${ brokenCount } found` ) : '—',
                                pass: brokenCount == null ? null : brokenOk,
                            },
                            {
                                label: __( 'Canonicals', 'ai-seo-tool' ),
                                value: audit ? ( missingCanon == null ? '—' : canonicalsOk ? __( 'OK', 'ai-seo-tool' ) : `${ missingCanon } missing` ) : '—',
                                pass: missingCanon == null ? null : canonicalsOk,
                            },
                        ].map( ( { label, value, pass } ) => (
                            <div key={ label } style={ {
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '14px 12px', background: '#f8fafc',
                                borderRadius: '8px', border: '1px solid #e2e8f0',
                            } }>
                                { audit ? (
                                    pass === null
                                        ? <div style={ { width: 22, height: 22, borderRadius: '50%', background: '#e2e8f0' } } />
                                        : pass ? <TechPassIcon /> : <TechFailIcon />
                                ) : (
                                    <div style={ { width: 22, height: 22, borderRadius: '50%', background: '#e2e8f0' } } />
                                ) }
                                <div>
                                    <div style={ {
                                        fontSize: '13px', fontWeight: 700, lineHeight: 1.1,
                                        color: audit ? ( pass === null ? '#94a3b8' : pass ? '#16a34a' : '#dc2626' ) : '#94a3b8',
                                    } }>
                                        { value }
                                    </div>
                                    <div style={ { fontSize: '11px', color: '#6b7280' } }>{ label }</div>
                                </div>
                            </div>
                        ) ) }
                    </div>
                </div>
            </div>

            {/* PageSpeed · Security Headers · Issues row */}
            <div style={ { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' } }>

                {/* PageSpeed card */}
                <div style={ { ...cardStyle, padding: '14px 16px' } }>
                    <div style={ { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' } }>
                        <span style={ cardTitleStyle }>{ __( 'PageSpeed Insights', 'ai-seo-tool' ) }</span>
                    </div>
                    <div style={ { display: 'flex', gap: '8px', marginBottom: '10px' } }>
                        { [ { label: __( 'Desktop', 'ai-seo-tool' ), score: desktopScore }, { label: __( 'Mobile', 'ai-seo-tool' ), score: mobileScore } ].map( ( { label, score } ) => {
                            const col = score >= 90 ? '#16a34a' : score >= 50 ? '#ca8a04' : '#dc2626';
                            return (
                                <div key={ label } style={ { flex: 1, background: '#f8fafc', borderRadius: '6px', padding: '6px 8px', textAlign: 'center', border: '1px solid #e2e8f0' } }>
                                    <div style={ { fontSize: '10px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' } }>{ label }</div>
                                    <div style={ { fontSize: '20px', fontWeight: 800, color: col, lineHeight: 1 } }>{ audit ? score : '—' }</div>
                                    <div style={ { fontSize: '10px', color: '#94a3b8', marginTop: '1px' } }>/100</div>
                                </div>
                            );
                        } ) }
                    </div>
                    { audit && ( pagespeed.desktop || pagespeed.mobile ) && (
                        <div>
                            { CWV_METRICS.map( ( { key, label }, i ) => (
                                <div key={ key } style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: i < CWV_METRICS.length - 1 ? '1px solid #f1f5f9' : 'none' } }>
                                    <span style={ { fontSize: '11px', fontWeight: 600, color: '#374151' } }>{ label }</span>
                                    <div style={ { display: 'flex', gap: '10px' } }>
                                        <span style={ { fontSize: '11px', color: '#6b7280', minWidth: '34px', textAlign: 'right' } }>{ pagespeed.desktop?.[ key ] ?? '—' }</span>
                                        <span style={ { fontSize: '11px', color: '#6b7280', minWidth: '34px', textAlign: 'right' } }>{ pagespeed.mobile?.[ key ] ?? '—' }</span>
                                    </div>
                                </div>
                            ) ) }
                        </div>
                    ) }
                </div>

                {/* Security Headers card */}
                <div style={ { ...cardStyle, padding: '14px 16px', display: 'flex', flexDirection: 'column' } }>
                    <div style={ { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' } }>
                        <span style={ cardTitleStyle }>{ __( 'Security Headers', 'ai-seo-tool' ) }</span>
                        { audit && (
                            <span style={ {
                                fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px',
                                background: headersPassing === SECURITY_HEADERS.length ? '#dcfce7' : '#fef9c3',
                                color:      headersPassing === SECURITY_HEADERS.length ? '#16a34a' : '#ca8a04',
                                border:     `1px solid ${ headersPassing === SECURITY_HEADERS.length ? '#bbf7d0' : '#fde68a' }`,
                            } }>{ `${ headersPassing }/${ SECURITY_HEADERS.length }` }</span>
                        ) }
                    </div>
                    <div style={ { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }>
                        { SECURITY_HEADERS.map( ( { key, label, desc } ) => {
                            const pass = audit ? !! securityHeaders[ key ] : null;
                            return (
                                <div key={ key } style={ { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' } }>
                                    { pass === null
                                        ? <div style={ { width: 12, height: 12, borderRadius: '50%', background: '#e2e8f0', flexShrink: 0 } } />
                                        : (
                                            <svg width="12" height="12" viewBox="0 0 12 12" style={ { flexShrink: 0 } }>
                                                <circle cx="6" cy="6" r="6" fill={ pass ? '#16a34a' : '#ef4444' }/>
                                                { pass
                                                    ? <path d="M3 6l2 2 4-4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                                                    : <path d="M4 4l4 4M8 4l-4 4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"/>
                                                }
                                            </svg>
                                        )
                                    }
                                    <div style={ { minWidth: 0, flex: 1 } }>
                                        <span style={ { fontSize: '12px', fontWeight: 600, color: '#1e293b' } }>{ label }</span>
                                        <span style={ { fontSize: '10px', color: '#94a3b8', marginLeft: '5px' } }>{ desc }</span>
                                    </div>
                                    <span style={ { fontSize: '10px', fontWeight: 600, flexShrink: 0, color: pass ? '#16a34a' : '#dc2626' } }>
                                        { pass === null ? '' : pass ? __( 'OK', 'ai-seo-tool' ) : __( 'Missing', 'ai-seo-tool' ) }
                                    </span>
                                </div>
                            );
                        } ) }
                    </div>
                </div>

                {/* Issues Breakdown card */}
                <div style={ { ...cardStyle, padding: '14px 16px', display: 'flex', flexDirection: 'column' } }>
                    <div style={ { marginBottom: '10px' } }>
                        <span style={ cardTitleStyle }>{ __( 'Issues Breakdown', 'ai-seo-tool' ) }</span>
                    </div>
                    <div style={ { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }>
                        { [
                            { label: __( 'Broken Links',       'ai-seo-tool' ), count: brokenCount ?? 0,    color: '#f59e0b' },
                            { label: __( 'Missing Canonicals', 'ai-seo-tool' ), count: missingCanon ?? 0,   color: '#8b5cf6' },
                            { label: __( 'Missing Meta Desc',  'ai-seo-tool' ), count: missingMetaDesc,     color: '#3b82f6' },
                            { label: __( 'Missing H1',         'ai-seo-tool' ), count: missingH1,           color: '#0ea5e9' },
                            { label: __( 'Not Secure (HTTP)',  'ai-seo-tool' ), count: httpsOk ? 0 : 1,     color: '#ef4444' },
                        ].map( ( { label, count, color } ) => (
                            <div key={ label } style={ { display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0' } }>
                                <div style={ { width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 } } />
                                <span style={ { flex: 1, fontSize: '12px', color: '#374151' } }>{ label }</span>
                                <span style={ {
                                    fontSize: '12px', fontWeight: 700, minWidth: '24px', textAlign: 'right',
                                    color: count === 0 ? '#16a34a' : color,
                                } }>{ count === 0 ? '✓' : count }</span>
                            </div>
                        ) ) }
                        <div style={ { paddingTop: '7px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }>
                            <span style={ { fontSize: '11px', color: '#6b7280' } }>{ __( 'Total issues', 'ai-seo-tool' ) }</span>
                            <span style={ { fontSize: '14px', fontWeight: 800, color: ( brokenCount ?? 0 ) + ( missingCanon ?? 0 ) + missingMetaDesc + missingH1 + ( httpsOk ? 0 : 1 ) === 0 ? '#16a34a' : '#ef4444' } }>
                                { ( brokenCount ?? 0 ) + ( missingCanon ?? 0 ) + missingMetaDesc + missingH1 + ( httpsOk ? 0 : 1 ) }
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Crawled URLs table */}
            <div>
                <h3 style={ { fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: '0 0 12px' } }>
                    { __( 'Crawled URLs', 'ai-seo-tool' ) }
                </h3>
                <div style={ {
                    background: '#ffffff', border: '1px solid #e2e8f0',
                    borderRadius: '10px', overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                } }>
                    <div style={ { overflowX: 'auto' } }>
                        <table style={ { width: '100%', borderCollapse: 'collapse', fontSize: '13px' } }>
                            <thead>
                                <tr style={ { borderBottom: '1px solid #e2e8f0', background: '#f8fafc' } }>
                                    { [
                                        { label: '#',                                          w: '3%'  },
                                        { label: __( 'Address', 'ai-seo-tool' ),               w: '22%' },
                                        { label: __( 'Type', 'ai-seo-tool' ),                  w: '7%'  },
                                        { label: __( 'Status', 'ai-seo-tool' ),                w: '7%'  },
                                        { label: __( 'Indexability', 'ai-seo-tool' ),          w: '9%'  },
                                        { label: __( 'Title', 'ai-seo-tool' ),                 w: '13%' },
                                        { label: __( 'Meta Desc', 'ai-seo-tool' ),             w: '11%' },
                                        { label: __( 'H1', 'ai-seo-tool' ),                    w: '10%' },
                                        { label: __( 'Canonical', 'ai-seo-tool' ),             w: '10%' },
                                        { label: __( 'Resp. Time', 'ai-seo-tool' ),            w: '5%'  },
                                        { label: __( 'Readability', 'ai-seo-tool' ),           w: '5%'  },
                                    ].map( ( { label, w } ) => (
                                        <th key={ label } style={ {
                                            padding: '10px 14px', textAlign: 'left',
                                            fontSize: '11px', fontWeight: 600,
                                            color: '#6b7280', textTransform: 'uppercase',
                                            letterSpacing: '0.04em', width: w,
                                        } }>
                                            { label }
                                        </th>
                                    ) ) }
                                </tr>
                            </thead>
                            <tbody>
                                { pages.length === 0 ? (
                                    <tr>
                                        <td colSpan="11" style={ { padding: '32px', textAlign: 'center', color: '#94a3b8' } }>
                                            { __( 'No pages found.', 'ai-seo-tool' ) }
                                        </td>
                                    </tr>
                                ) : pages.map( ( page, idx ) => (
                                    <tr key={ page.address || idx } style={ {
                                        borderBottom: '1px solid #f1f5f9',
                                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                                    } }>
                                        <td style={ { padding: '10px 14px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' } }>
                                            { idx + 1 }
                                        </td>
                                        <td style={ { padding: '10px 14px', maxWidth: '0' } }>
                                            <a
                                                href={ page.address }
                                                target="_blank"
                                                rel="noreferrer"
                                                title={ page.address }
                                                style={ {
                                                    color: '#0d9488', textDecoration: 'none', fontSize: '12px',
                                                    display: 'block', overflow: 'hidden',
                                                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                } }
                                                onMouseOver={ e => { e.currentTarget.style.textDecoration = 'underline'; } }
                                                onMouseOut={ e => { e.currentTarget.style.textDecoration = 'none'; } }
                                            >
                                                { page.address }
                                            </a>
                                        </td>
                                        <td style={ { padding: '10px 14px', fontSize: '12px', color: '#374151' } }>
                                            { page.type || <span style={ { color: '#94a3b8' } }>—</span> }
                                        </td>
                                        <td style={ { padding: '10px 14px' } }>
                                            <StatusBadge code={ page.status_code } />
                                        </td>
                                        <td style={ { padding: '10px 14px' } }>
                                            <span style={ {
                                                color: page.indexability === 'Indexable' ? '#16a34a' : '#dc2626',
                                                fontSize: '12px', fontWeight: 500,
                                            } }>
                                                { page.indexability || <span style={ { color: '#94a3b8' } }>—</span> }
                                            </span>
                                        </td>
                                        <td style={ { padding: '10px 14px', maxWidth: '0' } }>
                                            <span
                                                title={ page.title ?? '' }
                                                style={ {
                                                    display: 'block', overflow: 'hidden',
                                                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    fontSize: '12px', color: '#374151',
                                                } }
                                            >
                                                { page.title || <span style={ { color: '#94a3b8' } }>—</span> }
                                            </span>
                                        </td>
                                        <td style={ { padding: '10px 14px', maxWidth: '0' } }>
                                            <span
                                                title={ page.meta_descp ?? '' }
                                                style={ {
                                                    display: 'block', overflow: 'hidden',
                                                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    fontSize: '12px', color: '#6b7280',
                                                } }
                                            >
                                                { page.meta_descp || <span style={ { color: '#94a3b8' } }>—</span> }
                                            </span>
                                        </td>
                                        <td style={ { padding: '10px 14px', maxWidth: '0' } }>
                                            <span
                                                title={ page.h1 ?? '' }
                                                style={ {
                                                    display: 'block', overflow: 'hidden',
                                                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    fontSize: '12px', color: '#374151',
                                                } }
                                            >
                                                { page.h1 || <span style={ { color: '#94a3b8' } }>—</span> }
                                            </span>
                                        </td>
                                        <td style={ { padding: '10px 14px', maxWidth: '0' } }>
                                            <span
                                                title={ page.canonical ?? '' }
                                                style={ {
                                                    display: 'block', overflow: 'hidden',
                                                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    fontSize: '12px', color: '#6b7280',
                                                } }
                                            >
                                                { page.canonical || <span style={ { color: '#94a3b8' } }>—</span> }
                                            </span>
                                        </td>
                                        <td style={ { padding: '10px 14px', fontSize: '12px', color: '#374151', textAlign: 'right' } }>
                                            { page.response_time != null
                                                ? ( page.response_time / 1000 ).toFixed( 3 )
                                                : <span style={ { color: '#94a3b8' } }>—</span>
                                            }
                                        </td>
                                        <td style={ { padding: '10px 14px', fontSize: '12px', color: '#374151' } }>
                                            { page.readability || <span style={ { color: '#94a3b8' } }>—</span> }
                                        </td>
                                    </tr>
                                ) ) }
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

const cardStyle = {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const cardTitleStyle = {
    fontSize: '13px',
    fontWeight: 600,
    color: '#1e293b',
};


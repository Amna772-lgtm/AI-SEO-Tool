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
                {/* Background arc */}
                <circle
                    cx={ cx } cy={ cy } r={ r }
                    fill="none" stroke="#e2e8f0" strokeWidth={ sw }
                    strokeDasharray={ `${ halfC } ${ halfC }` }
                    transform={ `rotate(180 ${ cx } ${ cy })` }
                />
                {/* Score arc */}
                <circle
                    cx={ cx } cy={ cy } r={ r }
                    fill="none" stroke={ color } strokeWidth={ sw }
                    strokeLinecap="round"
                    strokeDasharray={ `${ scoreLen } ${ halfC * 2 - scoreLen }` }
                    transform={ `rotate(180 ${ cx } ${ cy })` }
                    style={ { transition: 'stroke-dasharray 0.8s ease' } }
                />
                {/* Score number */}
                <text x="60" y="62" textAnchor="middle" fill={ color } fontSize="26" fontWeight="700">
                    { score || 0 }
                </text>
                {/* /100 label */}
                <text x="60" y="75" textAnchor="middle" fill="#94a3b8" fontSize="10">
                    /100
                </text>
            </svg>
            {/* Grade badge */}
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

function TechCard( { label, value, pass } ) {
    return (
        <div style={ {
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            flex: 1,
        } }>
            { pass ? <TechPassIcon /> : <TechFailIcon /> }
            <div>
                <div style={ {
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: pass ? '#16a34a' : '#dc2626',
                    marginBottom: '2px',
                } }>
                    { label }
                </div>
                <div style={ { fontSize: '13px', fontWeight: 600, color: '#1e293b' } }>
                    { value }
                </div>
            </div>
        </div>
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

        let cancelled = false;

        async function fetchData() {
            setLoading( true );
            setError( null );
            try {
                const [ pagesRes, geoRes, auditRes ] = await Promise.all( [
                    apiFetch( { path: `/ai-seo-tool/v1/sites/${ siteId }/pages` } ),
                    apiFetch( { path: `/ai-seo-tool/v1/sites/${ siteId }/geo` } ),
                    apiFetch( { path: `/ai-seo-tool/v1/sites/${ siteId }/audit` } ).catch( () => null ),
                ] );
                if ( ! cancelled ) {
                    setPages( Array.isArray( pagesRes?.pages ) ? pagesRes.pages : [] );
                    setGeo( geoRes );
                    setAudit( auditRes );
                }
            } catch ( err ) {
                if ( ! cancelled ) {
                    setError( err.message || __( 'Failed to load dashboard data.', 'ai-seo-tool' ) );
                }
            } finally {
                if ( ! cancelled ) {
                    setLoading( false );
                }
            }
        }

        fetchData();
        return () => { cancelled = true; };
    }, [ siteId ] );

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
    const brokenCount  = audit?.broken_links?.count ?? ( Array.isArray( audit?.broken_links?.links ) ? audit.broken_links.links.length : null );
    const brokenOk     = brokenCount === 0;
    const missingCanon = audit?.missing_canonicals?.count ?? ( Array.isArray( audit?.missing_canonicals?.pages ) ? audit.missing_canonicals.pages.length : null );
    const canonicalsOk = missingCanon === 0;

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
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
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
                                value: audit ? ( brokenOk ? __( 'None Found', 'ai-seo-tool' ) : `${ brokenCount } found` ) : '—',
                                pass: brokenOk,
                            },
                            {
                                label: __( 'Canonicals', 'ai-seo-tool' ),
                                value: audit ? ( canonicalsOk ? __( 'OK', 'ai-seo-tool' ) : `${ missingCanon } missing` ) : '—',
                                pass: canonicalsOk,
                            },
                        ].map( ( { label, value, pass } ) => (
                            <div key={ label } style={ {
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '10px 12px', background: '#f8fafc',
                                borderRadius: '8px', border: '1px solid #e2e8f0',
                            } }>
                                { audit ? ( pass ? <TechPassIcon /> : <TechFailIcon /> ) : (
                                    <div style={ { width: 22, height: 22, borderRadius: '50%', background: '#e2e8f0' } } />
                                ) }
                                <div>
                                    <div style={ {
                                        fontSize: '13px', fontWeight: 700, lineHeight: 1.1,
                                        color: audit ? ( pass ? '#16a34a' : '#dc2626' ) : '#94a3b8',
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
                                        { label: __( 'URL', 'ai-seo-tool' ),          w: '38%' },
                                        { label: __( 'Status', 'ai-seo-tool' ),       w: '9%'  },
                                        { label: __( 'Indexability', 'ai-seo-tool' ), w: '12%' },
                                        { label: __( 'Title', 'ai-seo-tool' ),        w: '21%' },
                                        { label: __( 'H1', 'ai-seo-tool' ),           w: '15%' },
                                        { label: __( 'Depth', 'ai-seo-tool' ),        w: '5%'  },
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
                                        <td colSpan="6" style={ { padding: '32px', textAlign: 'center', color: '#94a3b8' } }>
                                            { __( 'No pages found.', 'ai-seo-tool' ) }
                                        </td>
                                    </tr>
                                ) : pages.map( ( page, idx ) => (
                                    <tr key={ page.address || idx } style={ {
                                        borderBottom: '1px solid #f1f5f9',
                                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                                    } }>
                                        <td style={ { padding: '10px 14px', wordBreak: 'break-all' } }>
                                            <a
                                                href={ page.address }
                                                target="_blank"
                                                rel="noreferrer"
                                                style={ { color: '#0d9488', textDecoration: 'none', fontSize: '12px' } }
                                                onMouseOver={ e => { e.currentTarget.style.textDecoration = 'underline'; } }
                                                onMouseOut={ e => { e.currentTarget.style.textDecoration = 'none'; } }
                                            >
                                                { page.address }
                                            </a>
                                        </td>
                                        <td style={ { padding: '10px 14px' } }>
                                            <StatusBadge code={ page.status_code } />
                                        </td>
                                        <td style={ { padding: '10px 14px' } }>
                                            { page.indexability === 'Indexable' ? (
                                                <span style={ { color: '#16a34a', fontSize: '12px', fontWeight: 500 } }>
                                                    { __( 'Yes', 'ai-seo-tool' ) }
                                                </span>
                                            ) : (
                                                <span style={ { color: '#dc2626', fontSize: '12px', fontWeight: 500 } }>
                                                    { __( 'No', 'ai-seo-tool' ) }
                                                </span>
                                            ) }
                                        </td>
                                        <td style={ { padding: '10px 14px', fontSize: '12px', color: '#374151' } }>
                                            { page.title || <span style={ { color: '#94a3b8' } }>—</span> }
                                        </td>
                                        <td style={ { padding: '10px 14px', fontSize: '12px', color: '#374151' } }>
                                            { page.h1 || <span style={ { color: '#94a3b8' } }>—</span> }
                                        </td>
                                        <td style={ { padding: '10px 14px', fontSize: '12px', color: '#374151', textAlign: 'center' } }>
                                            { page.crawl_depth ?? '—' }
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

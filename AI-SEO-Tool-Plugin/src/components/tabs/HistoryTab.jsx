/**
 * AI SEO Tool — HistoryTab
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */
import { useState, useEffect, useCallback } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { Spinner, Notice, Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { getScoreColor } from '../GeoScoreRing';
import PlanGate from '../PlanGate';

const siteDomain = ( () => {
    try { return new URL( window.aiSeoTool?.siteUrl || '' ).hostname; } catch { return ''; }
} )();

export default function HistoryTab( { plan } ) {
    const [ history,  setHistory  ] = useState( [] );
    const [ loading,  setLoading  ] = useState( true );
    const [ error,    setError    ] = useState( null );
    const [ deleting, setDeleting ] = useState( null );

    const load = () => {
        setLoading( true );
        setError( null );
        const path = siteDomain
            ? `/ai-seo-tool/v1/history?domain=${ encodeURIComponent( siteDomain ) }`
            : '/ai-seo-tool/v1/history';
        apiFetch( { path } )
            .then( ( res ) => setHistory( Array.isArray( res?.items ) ? res.items : [] ) )
            .catch( ( err ) => setError( err.message || __( 'Failed to load audit history.', 'ai-seo-tool' ) ) )
            .finally( () => setLoading( false ) );
    };

    useEffect( () => { load(); }, [] );

    const handleDelete = async ( id ) => {
        // eslint-disable-next-line no-alert
        if ( ! window.confirm( __( 'Delete this audit record?', 'ai-seo-tool' ) ) ) return;
        setDeleting( id );
        try {
            await apiFetch( { path: `/ai-seo-tool/v1/history/${ id }`, method: 'DELETE' } );
            setHistory( ( prev ) => prev.filter( ( h ) => h.id !== id ) );
        } catch ( err ) {
            setError( err.message || __( 'Failed to delete.', 'ai-seo-tool' ) );
        } finally {
            setDeleting( null );
        }
    };

    if ( loading ) {
        return (
            <div style={ { display: 'flex', alignItems: 'center', gap: '10px', padding: '32px' } }>
                <Spinner />
                <span style={ { color: '#6b7280', fontSize: '13px' } }>{ __( 'Loading audit history…', 'ai-seo-tool' ) }</span>
            </div>
        );
    }

    if ( error ) return <Notice status="error" isDismissible={ false }>{ error }</Notice>;

    return (
        <div style={ { display: 'flex', flexDirection: 'column', gap: '20px' } }>

            {/* Trend chart — Pro gate */}
            { plan?.plan === 'free' ? (
                <PlanGate featureName={ __( 'Score trend charts are available on Pro. Upgrade to track GEO score over time.', 'ai-seo-tool' ) } />
            ) : (
                <div style={ {
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px 24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                } }>
                    <ScoreTrendChart history={ history } />
                </div>
            ) }

            {/* History list */}
            { history.length === 0 ? (
                <div style={ {
                    background: '#fff', border: '1px solid #e2e8f0',
                    borderRadius: '12px', padding: '56px 24px', textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                } }>
                    <div style={ {
                        width: '52px', height: '52px', background: '#f0fdfa', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
                        fontSize: '22px',
                    } }>📋</div>
                    <h3 style={ { margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: '#1e293b' } }>
                        { __( 'No audit history yet', 'ai-seo-tool' ) }
                    </h3>
                    <p style={ { margin: 0, fontSize: '13px', color: '#6b7280', maxWidth: '300px', marginLeft: 'auto', marginRight: 'auto' } }>
                        { __( "Click 'Analyze This Site' to run your first GEO citation readiness audit.", 'ai-seo-tool' ) }
                    </p>
                </div>
            ) : (
                <div style={ { display: 'flex', flexDirection: 'column', gap: '10px' } }>
                    { history.map( ( item, idx ) => (
                        <HistoryCard
                            key={ item.id || idx }
                            item={ item }
                            prev={ history[ idx + 1 ] }
                            onDelete={ handleDelete }
                            deleting={ deleting === item.id }
                        />
                    ) ) }
                </div>
            ) }
        </div>
    );
}

function HistoryCard( { item, prev, onDelete, deleting } ) {
    const score     = Math.round( item.overall_score || 0 );
    const prevScore = prev ? Math.round( prev.overall_score || 0 ) : null;
    const delta     = prevScore !== null ? score - prevScore : null;
    const color     = getScoreColor( score );

    return (
        <div style={ {
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        } }>
            {/* Score ring */}
            <MiniScoreRing score={ score } color={ color } />

            {/* Details */}
            <div style={ { flex: 1, minWidth: 0 } }>
                <div style={ { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' } }>
                    <span style={ { fontSize: '13px', fontWeight: 700, color: '#1e293b' } }>
                        { formatDate( item.analyzed_at ) }
                    </span>
                    { item.grade && <GradeBadge grade={ item.grade } score={ score } /> }
                    { delta !== null && <DeltaBadge delta={ delta } /> }
                </div>
                <div style={ { display: 'flex', gap: '16px', fontSize: '12px', color: '#6b7280' } }>
                    { item.pages_count && (
                        <span>📄 { item.pages_count } { __( 'pages', 'ai-seo-tool' ) }</span>
                    ) }
                    { item.site_type && (
                        <span>🏷️ { item.site_type }</span>
                    ) }
                </div>
            </div>

            {/* Score bar */}
            <div style={ { width: '80px', flexShrink: 0 } }>
                <div style={ { height: '6px', borderRadius: '9999px', background: '#e2e8f0', overflow: 'hidden' } }>
                    <div style={ {
                        height: '100%', width: `${ score }%`,
                        background: `linear-gradient(90deg, ${ color }99, ${ color })`,
                        borderRadius: '9999px', transition: 'width 0.6s ease',
                    } } />
                </div>
                <div style={ { textAlign: 'right', fontSize: '10px', color: '#94a3b8', marginTop: '3px' } }>
                    { score }/100
                </div>
            </div>

            {/* Delete */}
            <button
                onClick={ () => onDelete( item.id ) }
                disabled={ deleting }
                title={ __( 'Delete', 'ai-seo-tool' ) }
                style={ {
                    background: 'none', border: '1px solid #e2e8f0',
                    borderRadius: '8px', padding: '6px 8px',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    color: '#94a3b8', fontSize: '14px',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                } }
                onMouseEnter={ ( e ) => { e.currentTarget.style.borderColor = '#fecaca'; e.currentTarget.style.color = '#dc2626'; } }
                onMouseLeave={ ( e ) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#94a3b8'; } }
            >
                { deleting ? '…' : '🗑' }
            </button>
        </div>
    );
}

function MiniScoreRing( { score, color } ) {
    const size = 52, sw = 5, r = ( size - sw ) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ * ( 1 - score / 100 );
    return (
        <svg width={ size } height={ size } viewBox={ `0 0 ${ size } ${ size }` } style={ { flexShrink: 0 } }>
            <circle cx={ size / 2 } cy={ size / 2 } r={ r } fill="none" stroke="#e2e8f0" strokeWidth={ sw } />
            <circle
                cx={ size / 2 } cy={ size / 2 } r={ r } fill="none"
                stroke={ color } strokeWidth={ sw } strokeLinecap="round"
                strokeDasharray={ circ } strokeDashoffset={ offset }
                transform={ `rotate(-90 ${ size / 2 } ${ size / 2 })` }
                style={ { transition: 'stroke-dashoffset 0.6s ease' } }
            />
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
                fill={ color } fontSize="13" fontWeight="700">
                { score }
            </text>
        </svg>
    );
}

function GradeBadge( { grade, score } ) {
    const color = getScoreColor( score );
    return (
        <span style={ {
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '22px', height: '22px', borderRadius: '50%',
            background: color, color: '#fff',
            fontSize: '11px', fontWeight: 700,
        } }>{ grade }</span>
    );
}

function DeltaBadge( { delta } ) {
    if ( delta === 0 ) return null;
    const up    = delta > 0;
    const color = up ? '#16a34a' : '#dc2626';
    const bg    = up ? '#f0fdf4' : '#fef2f2';
    return (
        <span style={ {
            display: 'inline-flex', alignItems: 'center', gap: '2px',
            fontSize: '11px', fontWeight: 700, color,
            background: bg, borderRadius: '6px', padding: '2px 6px',
        } }>
            { up ? '↑' : '↓' } { Math.abs( delta ) }
        </span>
    );
}

function formatDate( iso ) {
    if ( ! iso ) return '—';
    try {
        return new Date( iso ).toLocaleDateString( undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } );
    } catch { return iso; }
}

function formatShortDate( iso ) {
    if ( ! iso ) return '';
    try {
        return new Date( iso ).toLocaleDateString( undefined, { month: 'short', day: 'numeric' } );
    } catch { return ''; }
}

function formatTooltipDate( iso ) {
    if ( ! iso ) return '';
    try {
        return new Date( iso ).toLocaleDateString( undefined, { month: 'short', day: 'numeric' } ).toUpperCase();
    } catch { return ''; }
}

// ── Score Trend Chart ─────────────────────────────────────────────────────────

const SERIES = [
    { key: 'overall',   label: 'Overall',   color: '#4f46e5', field: 'overall_score'   },
    { key: 'schema',    label: 'Schema',    color: '#94a3b8', field: 'schema_score'    },
    { key: 'eeat',      label: 'E-E-A-T',   color: '#a855f7', field: 'eeat_score'      },
    { key: 'content',   label: 'Content',   color: '#f97316', field: 'content_score'   },
    { key: 'technical', label: 'Technical', color: '#06b6d4', field: 'technical_score' },
    { key: 'nlp',       label: 'NLP',       color: '#ec4899', field: 'nlp_score'       },
    { key: 'speed',     label: 'Speed',     color: '#22c55e', field: 'speed_score'     },
];

const TIME_FILTERS = [
    { key: '7d',  label: '7D',  days: 7   },
    { key: '30d', label: '30D', days: 30  },
    { key: '3m',  label: '3M',  days: 90  },
    { key: 'all', label: 'All', days: null },
];

function ScoreTrendChart( { history } ) {
    const [ filter,       setFilter       ] = useState( 'all' );
    const [ activeSeries, setActiveSeries ] = useState( [ 'overall' ] );
    const [ tooltip,      setTooltip      ] = useState( null ); // { x, y, score, date }

    // Apply time filter
    const now = Date.now();
    const filtered = history.filter( ( h ) => {
        if ( ! h.analyzed_at ) return false;
        const tf = TIME_FILTERS.find( ( f ) => f.key === filter );
        if ( ! tf?.days ) return true;
        return now - new Date( h.analyzed_at ).getTime() < tf.days * 86400000;
    } );
    const sorted = [ ...filtered ].sort( ( a, b ) => new Date( a.analyzed_at ) - new Date( b.analyzed_at ) );

    const toggleSeries = ( key ) => {
        setActiveSeries( ( prev ) =>
            prev.includes( key )
                ? prev.length > 1 ? prev.filter( ( k ) => k !== key ) : prev
                : [ ...prev, key ]
        );
    };

    // ── Geometry ──────────────────────────────────────────────────────────────
    const W = 700, H = 220;
    const padL = 40, padR = 24, padT = 16, padB = 44;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const gridVals = [ 0, 25, 50, 75, 100 ];

    const toX = ( i, total ) => padL + ( total < 2 ? chartW / 2 : ( i / ( total - 1 ) ) * chartW );
    const toY = ( score ) => padT + chartH - ( Math.min( Math.max( score || 0, 0 ), 100 ) / 100 ) * chartH;

    // Build paths per active series
    const seriesPaths = SERIES.filter( ( s ) => activeSeries.includes( s.key ) ).map( ( s ) => {
        const pts = sorted
            .map( ( h, i ) => {
                const val = h[ s.field ] ?? ( s.key === 'overall' ? h.overall_score : null );
                if ( val == null ) return null;
                const score = Math.round( val );
                return { x: toX( i, sorted.length ), y: toY( score ), score };
            } )
            .filter( Boolean );

        if ( pts.length < 2 ) return null;

        const line = pts.map( ( p, i ) => `${ i === 0 ? 'M' : 'L' } ${ p.x.toFixed( 1 ) } ${ p.y.toFixed( 1 ) }` ).join( ' ' );
        const area = `${ line } L ${ pts[ pts.length - 1 ].x.toFixed( 1 ) } ${ ( padT + chartH ).toFixed( 1 ) } L ${ pts[ 0 ].x.toFixed( 1 ) } ${ ( padT + chartH ).toFixed( 1 ) } Z`;
        return { ...s, pts, line, area };
    } ).filter( Boolean );

    // X-axis date labels — from sorted overall points
    const xPoints = sorted.map( ( h, i ) => ( {
        x: toX( i, sorted.length ),
        label: formatShortDate( h.analyzed_at ),
    } ) );

    const isEmpty = sorted.length < 2;

    return (
        <div>
            {/* Header row: title + time filters */}
            <div style={ { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' } }>
                <div>
                    <div style={ { fontSize: '14px', fontWeight: 700, color: '#1e293b' } }>
                        { __( 'Score Trends', 'ai-seo-tool' ) }
                    </div>
                    <div style={ { fontSize: '12px', color: '#94a3b8', marginTop: '2px' } }>
                        { __( 'Last 10 analyses across all generative search signals', 'ai-seo-tool' ) }
                    </div>
                </div>
                <div style={ { display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '8px', padding: '3px' } }>
                    { TIME_FILTERS.map( ( f ) => (
                        <button
                            key={ f.key }
                            onClick={ () => setFilter( f.key ) }
                            style={ {
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                background: filter === f.key ? '#0d9488' : 'transparent',
                                color:      filter === f.key ? '#fff'     : '#64748b',
                                transition: 'all 0.15s',
                            } }
                        >{ f.label }</button>
                    ) ) }
                </div>
            </div>

            {/* Chart */}
            { isEmpty ? (
                <div style={ { textAlign: 'center', padding: '40px 16px', color: '#94a3b8', fontSize: '13px' } }>
                    { sorted.length === 0
                        ? __( 'No audits in this time range.', 'ai-seo-tool' )
                        : __( 'Run at least 2 audits to see the trend.', 'ai-seo-tool' ) }
                </div>
            ) : (
                <div style={ { position: 'relative' } }>
                <svg
                    viewBox={ `0 0 ${ W } ${ H }` }
                    style={ { width: '100%', height: 'auto', display: 'block' } }
                >
                    <defs>
                        { SERIES.map( ( s ) => (
                            <linearGradient key={ s.key } id={ `area-${ s.key }` } x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor={ s.color } stopOpacity="0.12" />
                                <stop offset="100%" stopColor={ s.color } stopOpacity="0.01" />
                            </linearGradient>
                        ) ) }
                    </defs>

                    {/* Gridlines + Y labels */}
                    { gridVals.map( ( val ) => {
                        const y = toY( val );
                        return (
                            <g key={ val }>
                                <line x1={ padL } y1={ y } x2={ W - padR } y2={ y }
                                    stroke="#e2e8f0" strokeWidth="1" strokeDasharray="5 4" />
                                <text x={ padL - 8 } y={ y } textAnchor="end" dominantBaseline="middle"
                                    fontSize="11" fill="#94a3b8" fontWeight="500">{ val }</text>
                            </g>
                        );
                    } ) }

                    {/* Bottom axis */}
                    <line x1={ padL } y1={ padT + chartH } x2={ W - padR } y2={ padT + chartH }
                        stroke="#e2e8f0" strokeWidth="1.5" />

                    {/* Area fills */}
                    { seriesPaths.map( ( s ) => (
                        <path key={ `area-${ s.key }` } d={ s.area } fill={ `url(#area-${ s.key })` } />
                    ) ) }

                    {/* Lines */}
                    { seriesPaths.map( ( s ) => (
                        <path key={ `line-${ s.key }` } d={ s.line }
                            fill="none" stroke={ s.color } strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round" />
                    ) ) }

                    {/* Dots — larger hit area + tooltip trigger */}
                    { seriesPaths.map( ( s ) =>
                        s.pts.map( ( p, i ) => (
                            <g key={ `${ s.key }-${ i }` }
                                onMouseEnter={ () => setTooltip( {
                                    xPct: ( p.x / W ) * 100,
                                    yPct: ( p.y / H ) * 100,
                                    score: p.score,
                                    date: xPoints[ i ]?.label,
                                    dateRaw: sorted[ i ]?.analyzed_at,
                                    color: s.color,
                                    label: s.label,
                                } ) }
                                onMouseLeave={ () => setTooltip( null ) }
                                style={ { cursor: 'crosshair' } }
                            >
                                <circle cx={ p.x } cy={ p.y } r="10" fill="transparent" />
                                <circle cx={ p.x } cy={ p.y } r="3.5" fill={ s.color } />
                            </g>
                        ) )
                    ) }

                    {/* X-axis labels */}
                    { xPoints.map( ( p, i ) => (
                        <text key={ i } x={ p.x } y={ padT + chartH + 20 }
                            textAnchor="middle" fontSize="12" fill="#64748b" fontWeight="500">
                            { p.label }
                        </text>
                    ) ) }
                </svg>

                {/* HTML tooltip card */}
                { tooltip && (
                    <div style={ {
                        position: 'absolute',
                        left: `clamp(0px, calc(${ tooltip.xPct }% - 60px), calc(100% - 120px))`,
                        top:  `calc(${ tooltip.yPct }% - 74px)`,
                        pointerEvents: 'none',
                        zIndex: 10,
                    } }>
                        <div style={ {
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                            padding: '8px 12px',
                            minWidth: '110px',
                        } }>
                            <div style={ {
                                fontSize: '10px', fontWeight: 700,
                                color: '#94a3b8', letterSpacing: '0.08em',
                                marginBottom: '6px',
                            } }>
                                { formatTooltipDate( tooltip.dateRaw ) }
                            </div>
                            <div style={ { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' } }>
                                <div style={ { display: 'flex', alignItems: 'center', gap: '6px' } }>
                                    <span style={ {
                                        width: '8px', height: '8px', borderRadius: '50%',
                                        background: tooltip.color, flexShrink: 0, display: 'inline-block',
                                    } } />
                                    <span style={ { fontSize: '12px', fontWeight: 600, color: '#374151' } }>
                                        { tooltip.label }
                                    </span>
                                </div>
                                <span style={ { fontSize: '13px', fontWeight: 700, color: '#1e293b' } }>
                                    { tooltip.score }
                                </span>
                            </div>
                        </div>
                        {/* Arrow */}
                        <div style={ { width: '12px', height: '6px', overflow: 'hidden', margin: '0 auto' } }>
                            <div style={ {
                                width: '10px', height: '10px',
                                background: '#fff', border: '1px solid #e2e8f0',
                                transform: 'rotate(45deg)', margin: '-5px auto 0',
                                boxShadow: '2px 2px 4px rgba(0,0,0,0.06)',
                            } } />
                        </div>
                    </div>
                ) }
                </div>
            ) }

        </div>
    );
}

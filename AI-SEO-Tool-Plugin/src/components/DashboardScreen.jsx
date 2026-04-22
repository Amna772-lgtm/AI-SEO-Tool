/**
 * AI SEO Tool — Dashboard Screen
 * Main dashboard with account info, analyze button, progress, and result tabs.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */
import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import {
    Card,
    CardHeader,
    CardBody,
    Button,
    TabPanel,
    Notice,
    Spinner,
} from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';
import usePlan from '../hooks/usePlan';
import useAnalysis from '../hooks/useAnalysis';
import AnalysisProgress from './AnalysisProgress';
import DashboardTab from './tabs/DashboardTab';
import GeoAnalysisTab from './tabs/GeoAnalysisTab';
import TechnicalAuditTab from './tabs/TechnicalAuditTab';
import HistoryTab from './tabs/HistoryTab';

/** Maps WP admin sub-menu slug to tab name. */
const PAGE_TO_TAB = {
    'ai-seo-tool':           'dashboard',
    'ai-seo-tool-geo':       'geo',
    'ai-seo-tool-technical': 'technical',
    'ai-seo-tool-history':   'history',
    'ai-seo-tool-settings':  'settings',
};

const SESSION_KEY_SITE_ID  = 'ai_seo_tool_site_id';
const SESSION_KEY_COMPLETE = 'ai_seo_tool_analysis_complete';
const SESSION_KEY_SCAN_TS  = 'ai_seo_tool_scan_ts';

function getRelativeTime( ts ) {
    if ( ! ts ) return null;
    const diff = Math.floor( ( Date.now() - ts ) / 1000 );
    if ( diff < 60 ) return __( 'just now', 'ai-seo-tool' );
    if ( diff < 3600 ) {
        const m = Math.floor( diff / 60 );
        return sprintf( _n( '%d min ago', '%d mins ago', m, 'ai-seo-tool' ), m );
    }
    const h = Math.floor( diff / 3600 );
    return sprintf( _n( '%d hr ago', '%d hrs ago', h, 'ai-seo-tool' ), h );
}

/**
 * @param {Object}   props
 * @param {string}   props.currentPage    - Active WP sub-menu slug.
 * @param {Function} props.onDisconnected - Called after disconnect action.
 */
// ─── Top header bar ──────────────────────────────────────────────────────────

function AppHeader( { plan } ) {
    const name  = plan?.name  || plan?.email?.split( '@' )[ 0 ] || '—';
    const email = plan?.email || '';
    const initial = ( name[ 0 ] || 'U' ).toUpperCase();
    const planLabel = plan?.plan || __( 'Free', 'ai-seo-tool' );
    const auditCount  = plan?.audit_count ?? 0;
    const auditLimit  = plan?.audit_limit;
    const isUnlimited = auditLimit === null || auditLimit === undefined;
    const usageLabel  = isUnlimited
        ? sprintf( __( '%d / Unlimited audits used', 'ai-seo-tool' ), auditCount )
        : sprintf( __( '%1$d / %2$d audits used', 'ai-seo-tool' ), auditCount, auditLimit );

    return (
        <div style={ {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 24px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            marginBottom: '24px',
            marginLeft: '-20px', marginRight: '-20px', marginTop: '-8px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        } }>
            {/* Logo */}
            <div style={ { display: 'flex', alignItems: 'center', gap: '8px' } }>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#0d9488">
                    <path d="M12 2 L13.5 9.5 L21 12 L13.5 14.5 L12 22 L10.5 14.5 L3 12 L10.5 9.5 Z"/>
                </svg>
                <span style={ { fontSize: '16px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px' } }>
                    { __( 'AI SEO Tool', 'ai-seo-tool' ) }
                </span>
            </div>

            {/* Right: user info */}
            { plan && (
                <div style={ { display: 'flex', alignItems: 'center', gap: '12px' } }>
                    {/* Avatar + name/email */}
                    <div style={ { display: 'flex', alignItems: 'center', gap: '10px' } }>
                        <div style={ {
                            width: '34px', height: '34px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #0d9488, #0ea5e9)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0,
                        } }>
                            { initial }
                        </div>
                        <div style={ { lineHeight: 1.3 } }>
                            <div style={ { fontSize: '13px', fontWeight: 600, color: '#1e293b' } }>{ name }</div>
                            { email && (
                                <div style={ { fontSize: '11px', color: '#94a3b8' } }>{ email }</div>
                            ) }
                        </div>
                    </div>

                    {/* Plan badge */}
                    <div style={ {
                        padding: '3px 10px', borderRadius: '12px',
                        background: '#ccfbf1', color: '#0f766e',
                        fontSize: '11px', fontWeight: 700,
                        border: '1px solid #99f6e4',
                    } }>
                        { planLabel }
                    </div>

                    {/* Audit usage */}
                    <div style={ { fontSize: '12px', color: '#64748b', fontWeight: 500 } }>
                        { usageLabel }
                    </div>
                </div>
            ) }
        </div>
    );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

export default function DashboardScreen( { currentPage, onDisconnected } ) {
    const { plan, loading: planLoading, error: planError } = usePlan();
    const [ siteId, setSiteIdState ] = useState( () => sessionStorage.getItem( SESSION_KEY_SITE_ID ) || null );
    const [ analysisComplete, setAnalysisCompleteState ] = useState( () => sessionStorage.getItem( SESSION_KEY_COMPLETE ) === 'true' );
    const [ analyzeError, setAnalyzeError ] = useState( null );
    const [ disconnecting, setDisconnecting ] = useState( false );
    const [ scanTs, setScanTs ] = useState( () => parseInt( sessionStorage.getItem( SESSION_KEY_SCAN_TS ) || '0', 10 ) || null );
    const [ , forceUpdate ] = useState( 0 );

    // Refresh the "last scan" relative time every 30s
    useEffect( () => {
        if ( ! scanTs ) return;
        const id = setInterval( () => forceUpdate( n => n + 1 ), 30000 );
        return () => clearInterval( id );
    }, [ scanTs ] );

    const setSiteId = ( id ) => {
        if ( id ) sessionStorage.setItem( SESSION_KEY_SITE_ID, id );
        else sessionStorage.removeItem( SESSION_KEY_SITE_ID );
        setSiteIdState( id );
    };

    const setAnalysisComplete = ( val ) => {
        if ( val ) {
            sessionStorage.setItem( SESSION_KEY_COMPLETE, 'true' );
            const ts = Date.now();
            sessionStorage.setItem( SESSION_KEY_SCAN_TS, String( ts ) );
            setScanTs( ts );
        } else {
            sessionStorage.removeItem( SESSION_KEY_COMPLETE );
            sessionStorage.removeItem( SESSION_KEY_SCAN_TS );
            setScanTs( null );
        }
        setAnalysisCompleteState( val );
    };

    const { status, data: analysisData, error: pollError, reset: resetAnalysis } = useAnalysis( siteId );

    useEffect( () => {
        if ( status === 'expired' ) {
            setSiteId( null );
            setAnalysisComplete( false );
            resetAnalysis();
        }
    }, [ status ] );

    const isFailed  = status === 'failed';
    const isRunning = siteId && status && status !== 'completed' && status !== 'failed';
    const isComplete = status === 'completed' || analysisComplete;

    if ( status === 'completed' && ! analysisComplete ) {
        setAnalysisComplete( true );
    }

    // Hide the default WP admin page heading — our AppHeader replaces it
    useEffect( () => {
        const heading = document.querySelector( '.wrap > h1, .wrap > h2' );
        if ( heading ) heading.style.display = 'none';
        return () => { if ( heading ) heading.style.display = ''; };
    }, [] );

    if ( currentPage === 'ai-seo-tool-settings' ) {
        return (
            <>
                <AppHeader plan={ plan } />
                <SettingsPage
                    onDisconnected={ onDisconnected }
                    disconnecting={ disconnecting }
                    setDisconnecting={ setDisconnecting }
                />
            </>
        );
    }

    const handleAnalyze = async () => {
        setAnalyzeError( null );
        resetAnalysis();
        setAnalysisComplete( false );
        setSiteId( null );

        try {
            const response = await apiFetch( {
                path: '/ai-seo-tool/v1/analyze',
                method: 'POST',
                data: { url: window.aiSeoTool?.siteUrl },
            } );
            setSiteId( response.site_id || response.id );
        } catch ( err ) {
            const code = err.code || err.status;
            if ( code === 402 ) {
                setAnalyzeError( __( "You've reached your audit quota. Upgrade your plan to run more audits.", 'ai-seo-tool' ) );
            } else {
                setAnalyzeError( err.message || __( 'Failed to start analysis. Please try again.', 'ai-seo-tool' ) );
            }
        }
    };

    const handleTryAgain = () => {
        setSiteId( null );
        setAnalysisComplete( false );
        resetAnalysis();
        setAnalyzeError( null );
    };

    const quotaExhausted = plan && plan.audit_limit !== null && plan.audit_limit !== undefined && plan.audit_count >= plan.audit_limit;
    const auditCount  = plan?.audit_count ?? 0;
    const auditLimit  = plan?.audit_limit;
    const isUnlimited = auditLimit === null || auditLimit === undefined;
    const usagePct    = isUnlimited ? 0 : Math.min( ( auditCount / auditLimit ) * 100, 100 );

    const siteUrl = window.aiSeoTool?.siteUrl || '';
    const domain  = siteUrl.replace( /^https?:\/\//, '' ).replace( /\/$/, '' );
    const lastScan = scanTs ? getRelativeTime( scanTs ) : null;

    const initialTabName = PAGE_TO_TAB[ currentPage ] || 'dashboard';

    const tabs = [
        { name: 'dashboard', title: __( 'Dashboard', 'ai-seo-tool' ) },
        { name: 'geo',       title: __( 'GEO Analysis', 'ai-seo-tool' ) },
        { name: 'technical', title: __( 'Technical Audit', 'ai-seo-tool' ) },
        { name: 'history',   title: __( 'History', 'ai-seo-tool' ) },
    ];

    return (
        <div style={ { marginTop: '0' } }>
            <AppHeader plan={ plan } />

            {/* Analyze Card */}
            <div style={ {
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '28px 32px',
                marginBottom: '24px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            } }>
                { planLoading ? (
                    <div style={ { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px 0' } }>
                        <Spinner />
                        <span style={ { color: '#6b7280', fontSize: '13px' } }>{ __( 'Loading account info…', 'ai-seo-tool' ) }</span>
                    </div>
                ) : planError ? (
                    <Notice status="error" isDismissible={ false }>{ planError }</Notice>
                ) : plan ? (
                    <>
                        {/* Site URL + last scan */}
                        { domain && (
                            <div style={ { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' } }>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="2" y1="12" x2="22" y2="12"/>
                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                                </svg>
                                <span style={ { fontWeight: 600, fontSize: '14px', color: '#1e293b' } }>{ domain }</span>
                                { lastScan && (
                                    <span style={ { color: '#94a3b8', fontSize: '12px' } }>
                                        { sprintf( __( 'Last scan: %s', 'ai-seo-tool' ), lastScan ) }
                                    </span>
                                ) }
                            </div>
                        ) }
                        <p style={ { color: '#6b7280', fontSize: '13px', margin: '4px 0 20px' } }>
                            { __( 'Run a full GEO + Technical audit', 'ai-seo-tool' ) }
                        </p>

                        { quotaExhausted ? (
                            <>
                                <Notice status="warning" isDismissible={ false }>
                                    { sprintf(
                                        __( "You've used all %d audits this period. Upgrade your plan to run more audits.", 'ai-seo-tool' ),
                                        plan.audit_limit
                                    ) }
                                </Notice>
                                <Button
                                    variant="primary"
                                    onClick={ () => window.open( 'http://localhost:3000/select-plan', '_blank' ) }
                                    style={ { marginTop: '12px', backgroundColor: '#0d9488', borderColor: '#0d9488' } }
                                >
                                    { __( 'Upgrade Plan', 'ai-seo-tool' ) }
                                </Button>
                            </>
                        ) : isRunning ? (
                            <AnalysisProgress status={ status } />
                        ) : isFailed ? (
                            <>
                                <Notice status="error" isDismissible={ false }>
                                    { pollError || __( 'Audit failed. Check the AI SEO Tool backend logs for details.', 'ai-seo-tool' ) }
                                </Notice>
                                <Button variant="secondary" onClick={ handleTryAgain } style={ { marginTop: '12px' } }>
                                    { __( 'Try Again', 'ai-seo-tool' ) }
                                </Button>
                            </>
                        ) : (
                            <>
                                { analyzeError && (
                                    <Notice status="error" isDismissible={ false } style={ { marginBottom: '12px' } }>
                                        { analyzeError }
                                    </Notice>
                                ) }
                                <button
                                    onClick={ handleAnalyze }
                                    disabled={ quotaExhausted }
                                    style={ {
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '10px 36px',
                                        background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: quotaExhausted ? 'not-allowed' : 'pointer',
                                        opacity: quotaExhausted ? 0.6 : 1,
                                        boxShadow: '0 2px 8px rgba(13,148,136,0.35)',
                                        transition: 'opacity 0.15s, box-shadow 0.15s',
                                        minWidth: '220px',
                                    } }
                                    onMouseEnter={ ( e ) => { if ( ! quotaExhausted ) e.currentTarget.style.boxShadow = '0 4px 12px rgba(13,148,136,0.5)'; } }
                                    onMouseLeave={ ( e ) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(13,148,136,0.35)'; } }
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2L9.5 8.5 3 11l6.5 2.5L12 22l2.5-8.5L21 11l-6.5-2.5z"/>
                                    </svg>
                                    { __( 'Analyze This Site', 'ai-seo-tool' ) }
                                </button>
                            </>
                        ) }

                        {/* Usage bar */}
                        { ! isRunning && (
                            <div style={ { marginTop: '16px' } }>
                                <div style={ { fontSize: '12px', color: '#6b7280', marginBottom: '6px' } }>
                                    { isUnlimited
                                        ? sprintf( __( '%d of Unlimited audits used this month', 'ai-seo-tool' ), auditCount )
                                        : sprintf( __( '%1$d of %2$d audits used this month', 'ai-seo-tool' ), auditCount, auditLimit )
                                    }
                                </div>
                                { ! isUnlimited && (
                                    <div style={ { height: '4px', background: '#e2e8f0', borderRadius: '2px', maxWidth: '280px', margin: '0 auto' } }>
                                        <div style={ {
                                            height: '100%',
                                            width: `${ usagePct }%`,
                                            background: usagePct >= 90 ? '#dc2626' : '#0d9488',
                                            borderRadius: '2px',
                                            transition: 'width 0.3s',
                                        } } />
                                    </div>
                                ) }
                            </div>
                        ) }
                    </>
                ) : null }
            </div>

            {/* Results Tab Panel */}
            <TabPanel
                tabs={ tabs }
                initialTabName={ initialTabName }
            >
                { ( tab ) => (
                    <div style={ { padding: '24px 0' } }>
                        { isComplete ? (
                            <>
                                { tab.name === 'dashboard' && (
                                    <DashboardTab siteId={ siteId } data={ analysisData } plan={ plan } />
                                ) }
                                { tab.name === 'geo' && (
                                    <GeoAnalysisTab siteId={ siteId } plan={ plan } />
                                ) }
                                { tab.name === 'technical' && (
                                    <TechnicalAuditTab siteId={ siteId } plan={ plan } />
                                ) }
                                { tab.name === 'history' && (
                                    <HistoryTab plan={ plan } />
                                ) }
                            </>
                        ) : (
                            <>
                                { tab.name === 'history' ? (
                                    <HistoryTab plan={ plan } />
                                ) : (
                                    <EmptyState />
                                ) }
                            </>
                        ) }
                    </div>
                ) }
            </TabPanel>
        </div>
    );
}

function EmptyState() {
    return (
        <div style={ {
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '64px 32px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        } }>
            <div style={ {
                width: '56px',
                height: '56px',
                background: '#f0fdfa',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
            } }>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
            </div>
            <h3 style={ { margin: '0 0 8px', fontSize: '16px', fontWeight: 600, color: '#1e293b' } }>
                { __( 'No audits yet', 'ai-seo-tool' ) }
            </h3>
            <p style={ { color: '#6b7280', fontSize: '13px', margin: 0, maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto' } }>
                { __( "Click 'Analyze This Site' above to run your first GEO citation readiness audit.", 'ai-seo-tool' ) }
            </p>
        </div>
    );
}

function SettingsPage( { onDisconnected, disconnecting, setDisconnecting } ) {
    const [ error, setError ] = useState( null );

    const handleDisconnect = async () => {
        setDisconnecting( true );
        setError( null );
        try {
            await apiFetch( {
                path: '/ai-seo-tool/v1/disconnect',
                method: 'POST',
            } );
            onDisconnected();
        } catch ( err ) {
            setError( err.message || __( 'Failed to disconnect. Please try again.', 'ai-seo-tool' ) );
            setDisconnecting( false );
        }
    };

    return (
        <div style={ { marginTop: '24px', maxWidth: '480px' } }>
            <Card>
                <CardHeader>
                    <h2 style={ { margin: 0 } }>{ __( 'Settings', 'ai-seo-tool' ) }</h2>
                </CardHeader>
                <CardBody style={ { padding: '24px' } }>
                    { window.aiSeoTool?.mainAppUrl && (
                        <div style={ { marginBottom: '16px' } }>
                            <div style={ { fontSize: '11px', color: '#757575', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' } }>
                                { __( 'Backend URL', 'ai-seo-tool' ) }
                            </div>
                            <code style={ { fontSize: '13px' } }>{ window.aiSeoTool.mainAppUrl }</code>
                        </div>
                    ) }

                    { error && (
                        <Notice status="error" isDismissible={ false } style={ { marginBottom: '12px' } }>
                            { error }
                        </Notice>
                    ) }

                    <Button
                        variant="secondary"
                        isDestructive
                        onClick={ handleDisconnect }
                        disabled={ disconnecting }
                    >
                        { disconnecting ? (
                            <>
                                <Spinner />
                                { __( 'Disconnecting…', 'ai-seo-tool' ) }
                            </>
                        ) : (
                            __( 'Disconnect Plugin', 'ai-seo-tool' )
                        ) }
                    </Button>
                </CardBody>
            </Card>
        </div>
    );
}

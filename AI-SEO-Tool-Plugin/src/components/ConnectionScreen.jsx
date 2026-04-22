/**
 * AI SEO Tool — Connection Screen
 * Two-panel connection layout matching the AI SEO Tool brand design.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */
import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const SparkleIcon = ( { size = 24, color = 'currentColor' } ) => (
    <svg width={ size } height={ size } viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M12 2 L13.5 9.5 L21 12 L13.5 14.5 L12 22 L10.5 14.5 L3 12 L10.5 9.5 Z"
            fill={ color }
        />
    </svg>
);

const ShieldIcon = ( { size = 16, color = 'currentColor' } ) => (
    <svg width={ size } height={ size } viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V6L12 2z" fill={ color } />
    </svg>
);

const ChartIcon = ( { size = 16, color = 'currentColor' } ) => (
    <svg width={ size } height={ size } viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke={ color } strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="16 7 22 7 22 13" stroke={ color } strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const FeatureItem = ( { icon, label } ) => (
    <div style={ {
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '10px 14px',
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.1)',
    } }>
        <div style={ {
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'rgba(13,148,136,0.35)',
            border: '1px solid rgba(94,234,212,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontSize: '15px',
        } }>
            { icon }
        </div>
        <span style={ { fontSize: '13px', fontWeight: 600, color: '#e2e8f0' } }>
            { label }
        </span>
    </div>
);

/**
 * Connection screen component.
 *
 * @param {Object}   props
 * @param {Function} props.onConnected - Called when connection succeeds.
 */
export default function ConnectionScreen( { onConnected } ) {
    useEffect( () => {
        const heading = document.querySelector( '.wrap > h1, .wrap > h2' );
        if ( heading ) heading.style.display = 'none';
        return () => { if ( heading ) heading.style.display = ''; };
    }, [] );

    const [ apiKey, setApiKey ]           = useState( '' );
    const [ connecting, setConnecting ]   = useState( false );
    const [ testing, setTesting ]         = useState( false );
    const [ showKey, setShowKey ]         = useState( false );
    const [ error, setError ]             = useState( null );
    const [ testResult, setTestResult ]   = useState( null );

    const handleConnect = async () => {
        setConnecting( true );
        setError( null );
        setTestResult( null );

        try {
            const response = await apiFetch( {
                path: '/ai-seo-tool/v1/connect',
                method: 'POST',
                data: { api_key: apiKey },
            } );

            if ( response && response.status === 'connected' ) {
                onConnected();
            } else {
                setError( __( 'Connection failed. Please check your API key and try again.', 'ai-seo-tool' ) );
            }
        } catch ( err ) {
            const code = err.code || err.status;
            if ( code === 401 || err.message?.includes( '401' ) ) {
                setError( __( 'Invalid API key. Generate a key from your AI SEO Tool account under Settings → API Keys.', 'ai-seo-tool' ) );
            } else {
                setError( err.message || __( 'Connection failed. Please check your API key and try again.', 'ai-seo-tool' ) );
            }
        } finally {
            setConnecting( false );
        }
    };

    const handleTest = async () => {
        if ( ! apiKey.trim() ) return;
        setTesting( true );
        setTestResult( null );
        setError( null );

        try {
            const response = await apiFetch( {
                path: '/ai-seo-tool/v1/connect',
                method: 'POST',
                data: { api_key: apiKey },
            } );
            if ( response && response.status === 'connected' ) {
                setTestResult( 'success' );
            } else {
                setTestResult( 'fail' );
            }
        } catch {
            setTestResult( 'fail' );
        } finally {
            setTesting( false );
        }
    };

    const isDisabled = ! apiKey.trim() || connecting;

    return (
        <div style={ {
            position: 'relative',
            height: '85vh',
            background: '#f0f4f8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            overflow: 'hidden',
            boxSizing: 'border-box',
        } }>
            {/* Background blobs */}
            <div style={ {
                position: 'absolute', top: '-80px', right: '-80px',
                width: '280px', height: '280px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(13,148,136,0.18) 0%, transparent 70%)',
                pointerEvents: 'none',
            } } />
            <div style={ {
                position: 'absolute', bottom: '-60px', left: '-60px',
                width: '220px', height: '220px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(22,163,74,0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
            } } />

            {/* Not connected pill */}
            <div style={ {
                position: 'absolute', top: '20px', right: '24px',
                display: 'flex', alignItems: 'center', gap: '7px',
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '12px', fontWeight: 600, color: '#64748b',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            } }>
                <span style={ {
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: '#94a3b8', display: 'inline-block',
                } } />
                { __( 'Not connected', 'ai-seo-tool' ) }
            </div>

            {/* Main card */}
            <div style={ {
                display: 'flex',
                width: '100%',
                maxWidth: '650px',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
                position: 'relative', zIndex: 1,
            } }>

                {/* ── RIGHT PANEL ── */}
                <div style={ {
                    flex: 1,
                    background: '#fff',
                    padding: '28px 32px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                } }>
                    {/* Header */}
                    <div style={ { marginBottom: '16px' } }>
                        <p style={ {
                            margin: '0 0 6px',
                            fontSize: '11px', fontWeight: 700, letterSpacing: '1px',
                            textTransform: 'uppercase', color: '#0d9488',
                        } }>
                            { __( 'GET STARTED', 'ai-seo-tool' ) }
                        </p>
                        <h3 style={ {
                            margin: '0 0 8px',
                            fontSize: '22px', fontWeight: 800, letterSpacing: '-.4px',
                            color: '#0f172a',
                        } }>
                            { __( 'Connect to AI SEO Tool', 'ai-seo-tool' ) }
                        </h3>
                        <p style={ { margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.55 } }>
                            { __( 'Enter your API key to connect this WordPress site to your AI SEO Tool account.', 'ai-seo-tool' ) }
                        </p>
                    </div>

                    {/* API Key field */}
                    <div style={ { marginBottom: '16px' } }>
                        <label style={ {
                            display: 'flex', alignItems: 'center', gap: '6px',
                            fontSize: '13px', fontWeight: 600, color: '#374151',
                            marginBottom: '7px',
                        } }>
                            🔑 { __( 'API Key', 'ai-seo-tool' ) }
                            <span title={ __( 'Find your API key in Account → API & Integrations', 'ai-seo-tool' ) } style={ {
                                width: '16px', height: '16px', borderRadius: '50%',
                                background: '#e2e8f0', display: 'inline-flex',
                                alignItems: 'center', justifyContent: 'center',
                                fontSize: '10px', color: '#64748b', cursor: 'help',
                                flexShrink: 0,
                            } }>?</span>
                        </label>
                        <div style={ { position: 'relative' } }>
                            <input
                                type={ showKey ? 'text' : 'password' }
                                placeholder={ __( 'Paste your API key here', 'ai-seo-tool' ) }
                                value={ apiKey }
                                onChange={ ( e ) => setApiKey( e.target.value ) }
                                disabled={ connecting }
                                style={ {
                                    width: '100%', boxSizing: 'border-box',
                                    padding: '10px 40px 10px 14px',
                                    border: '1.5px solid #e2e8f0',
                                    borderRadius: '9px', fontSize: '13px',
                                    color: '#0f172a', background: '#fff',
                                    outline: 'none',
                                    transition: 'border-color .15s',
                                } }
                                onFocus={ ( e ) => { e.target.style.borderColor = '#0d9488'; } }
                                onBlur={ ( e ) => { e.target.style.borderColor = '#e2e8f0'; } }
                            />
                            <button
                                type="button"
                                onClick={ () => setShowKey( ! showKey ) }
                                style={ {
                                    position: 'absolute', right: '12px', top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none', border: 'none',
                                    cursor: 'pointer', color: '#94a3b8',
                                    padding: 0, fontSize: '14px', lineHeight: 1,
                                } }
                                title={ showKey ? __( 'Hide key', 'ai-seo-tool' ) : __( 'Show key', 'ai-seo-tool' ) }
                            >
                                { showKey ? '🙈' : '👁' }
                            </button>
                        </div>
                        <div style={ {
                            display: 'flex', alignItems: 'flex-start', gap: '8px',
                            background: 'rgba(13,148,136,0.07)',
                            border: '1px solid rgba(13,148,136,0.2)',
                            borderRadius: '8px',
                            padding: '9px 13px',
                            marginTop: '10px',
                            fontSize: '12px', color: '#0f766e', lineHeight: 1.5,
                        } }>
                            <span style={ { flexShrink: 0 } }>📍</span>
                            <span>
                                { __( 'Tip: Find your API key in Account → Settings on app.aiseotool.com.', 'ai-seo-tool' ) }
                            </span>
                        </div>
                    </div>

                    {/* Connect button */}
                    <button
                        type="button"
                        onClick={ handleConnect }
                        disabled={ isDisabled }
                        style={ {
                            width: '100%',
                            padding: '12px',
                            borderRadius: '10px',
                            border: 'none',
                            background: isDisabled
                                ? '#e2e8f0'
                                : 'linear-gradient(135deg, #0d9488, #0ea5e9)',
                            color: isDisabled ? '#94a3b8' : '#fff',
                            fontSize: '14px', fontWeight: 700,
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: '8px',
                            boxShadow: isDisabled ? 'none' : '0 4px 14px rgba(13,148,136,0.35)',
                            transition: 'opacity .15s',
                            marginBottom: '12px',
                        } }
                    >
                        { connecting ? (
                            <>
                                <Spinner style={ { margin: 0 } } />
                                { __( 'Connecting…', 'ai-seo-tool' ) }
                            </>
                        ) : (
                            <>🔗 { __( 'Connect Account', 'ai-seo-tool' ) }</>
                        ) }
                    </button>

                    {/* OR divider */}
                    <div style={ {
                        display: 'flex', alignItems: 'center', gap: '12px',
                        marginBottom: '16px',
                    } }>
                        <div style={ { flex: 1, height: '1px', background: '#e2e8f0' } } />
                        <span style={ { fontSize: '11px', color: '#94a3b8', fontWeight: 600, letterSpacing: '.5px' } }>
                            { __( 'OR', 'ai-seo-tool' ) }
                        </span>
                        <div style={ { flex: 1, height: '1px', background: '#e2e8f0' } } />
                    </div>

                    {/* Sign up / Help links */}
                    <div style={ { textAlign: 'center', marginBottom: '20px' } }>
                        <p style={ { margin: '0 0 6px', fontSize: '13px', color: '#374151' } }>
                            { __( "Don't have an account?", 'ai-seo-tool' ) }{ ' ' }
                            <a
                                href="http://localhost:3000/signup"
                                target="_blank"
                                rel="noreferrer"
                                style={ { color: '#0d9488', fontWeight: 700, textDecoration: 'none' } }
                            >
                                { __( 'Sign up →', 'ai-seo-tool' ) }
                            </a>
                        </p>
                    </div>

                    {/* Error notice */}
                    { error && (
                        <div style={ {
                            padding: '10px 14px',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            fontSize: '13px', color: '#dc2626',
                            marginBottom: '16px',
                        } }>
                            ⚠ { error }
                        </div>
                    ) }

                    {/* Trust badges */}
                    <div style={ {
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
                        paddingTop: '16px',
                        borderTop: '1px solid #f1f5f9',
                    } }>
                        { [
                            { icon: '🔒', label: __( 'SSL encrypted', 'ai-seo-tool' ) },
                            { icon: '👁', label: __( 'Read-only access', 'ai-seo-tool' ) },
                            { icon: '⏱', label: __( 'Setup in 60s', 'ai-seo-tool' ) },
                        ].map( ( badge ) => (
                            <span key={ badge.label } style={ {
                                display: 'flex', alignItems: 'center', gap: '5px',
                                fontSize: '11px', color: '#64748b', fontWeight: 500,
                            } }>
                                { badge.icon } { badge.label }
                            </span>
                        ) ) }
                    </div>
                </div>
            </div>
        </div>
    );
}

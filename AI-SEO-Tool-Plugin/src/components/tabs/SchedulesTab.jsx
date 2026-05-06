/**
 * AI SEO Tool — SchedulesTab
 * Manage the single recurring audit schedule for this WordPress site.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */
import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import {
    Card,
    CardBody,
    Notice,
    Spinner,
    SelectControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const WP_SITE_URL = window.aiSeoTool?.siteUrl || '';

// ── Shared button styles (match Re-analyze btn in DashboardScreen) ────────────

const btnBase = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    borderRadius: '6px', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap', transition: 'box-shadow 0.15s',
};

const BTN_PRIMARY = {
    ...btnBase,
    padding: '7px 18px',
    background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
    color: '#ffffff',
    border: 'none',
    boxShadow: '0 1px 4px rgba(13,148,136,0.3)',
};

const BTN_SECONDARY = {
    ...btnBase,
    padding: '7px 16px',
    background: '#ffffff',
    color: '#374151',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    transition: 'border-color 0.15s, box-shadow 0.15s',
};

const BTN_DESTRUCTIVE = {
    ...btnBase,
    padding: '7px 16px',
    background: '#ffffff',
    color: '#dc2626',
    border: '1px solid #fecaca',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    transition: 'background 0.15s, box-shadow 0.15s',
};

const DAYS_OF_WEEK = [
    { label: __( 'Monday',    'ai-seo-tool' ), value: '0' },
    { label: __( 'Tuesday',   'ai-seo-tool' ), value: '1' },
    { label: __( 'Wednesday', 'ai-seo-tool' ), value: '2' },
    { label: __( 'Thursday',  'ai-seo-tool' ), value: '3' },
    { label: __( 'Friday',    'ai-seo-tool' ), value: '4' },
    { label: __( 'Saturday',  'ai-seo-tool' ), value: '5' },
    { label: __( 'Sunday',    'ai-seo-tool' ), value: '6' },
];

function getBrowserTimezone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; }
    catch { return 'UTC'; }
}

function getSupportedTimezones() {
    try { return Intl.supportedValuesOf( 'timeZone' ); }
    catch {
        return [ 'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles', 'America/Denver',
            'America/Chicago', 'America/New_York', 'America/Halifax', 'America/Sao_Paulo',
            'Europe/London', 'Europe/Paris', 'Europe/Helsinki', 'Europe/Moscow', 'Asia/Dubai',
            'Asia/Karachi', 'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Tokyo',
            'Australia/Sydney', 'Pacific/Auckland', 'UTC' ];
    }
}

function getTzOffsetLabel( tz ) {
    try {
        const parts = new Intl.DateTimeFormat( 'en-US', {
            timeZone: tz, timeZoneName: 'shortOffset',
        } ).formatToParts( new Date( Date.UTC( 2024, 0, 15, 12, 0, 0 ) ) );
        const offset = ( parts.find( ( p ) => p.type === 'timeZoneName' )?.value || 'UTC' ).replace( 'GMT', 'UTC' );
        return `${ tz } (${ offset })`;
    } catch { return tz; }
}

function getUtcOffsetMinutes( timezone ) {
    const now   = new Date();
    const parts = new Intl.DateTimeFormat( 'en-US', {
        timeZone: timezone, hour: 'numeric', minute: 'numeric', hour12: false,
    } ).formatToParts( now );
    const localH = parseInt( parts.find( ( p ) => p.type === 'hour' ).value ) % 24;
    const localM = parseInt( parts.find( ( p ) => p.type === 'minute' ).value );
    let diff = ( localH * 60 + localM ) - ( now.getUTCHours() * 60 + now.getUTCMinutes() );
    if ( diff >  720 ) diff -= 1440;
    if ( diff < -720 ) diff += 1440;
    return diff;
}

function timeStringToUtc( timeStr, timezone ) {
    const parts  = timeStr.split( ':' ).map( Number );
    const h = parts[ 0 ], m = parts[ 1 ] || 0;
    const offset  = getUtcOffsetMinutes( timezone );
    const utcMins = ( ( h * 60 + m - offset ) % 1440 + 1440 ) % 1440;
    return { hour: Math.floor( utcMins / 60 ), minute: utcMins % 60 };
}

function utcToTimeString( utcHour, utcMinute, timezone ) {
    const ref = new Date();
    ref.setUTCHours( utcHour, utcMinute || 0, 0, 0 );
    const parts = new Intl.DateTimeFormat( 'en-US', {
        timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false,
    } ).formatToParts( ref );
    const h = String( parseInt( parts.find( ( p ) => p.type === 'hour' ).value ) % 24 ).padStart( 2, '0' );
    const m = parts.find( ( p ) => p.type === 'minute' ).value.padStart( 2, '0' );
    return `${ h }:${ m }`;
}

const TIMEZONE_OPTIONS = getSupportedTimezones().map( ( tz ) => ( {
    value: tz,
    label: getTzOffsetLabel( tz ),
} ) );

const DAYS_OF_MONTH = Array.from( { length: 28 }, ( _, i ) => ( {
    label: String( i + 1 ),
    value: String( i + 1 ),
} ) );

function emptyForm() {
    return { frequency: 'weekly', time: '09:00', timezone: getBrowserTimezone(), day_of_week: '0', day_of_month: '1' };
}

function scheduleToForm( s ) {
    const tz = getBrowserTimezone();
    return {
        frequency:    s.frequency    || 'weekly',
        time:         utcToTimeString( s.hour ?? 9, s.minute ?? 0, tz ),
        timezone:     tz,
        day_of_week:  String( s.day_of_week  ?? 0 ),
        day_of_month: String( s.day_of_month ?? 1 ),
    };
}

function formatNextRun( dateStr ) {
    if ( ! dateStr ) return '—';
    const d = new Date( dateStr );
    if ( isNaN( d ) ) return '—';
    const totalMins = Math.floor( ( d - Date.now() ) / 60000 );
    if ( totalMins <= 0 )  return __( 'Due now', 'ai-seo-tool' );
    if ( totalMins < 60 )  return `${ totalMins } min`;
    const hrs  = Math.floor( totalMins / 60 );
    const mins = totalMins % 60;
    if ( hrs < 24 ) return mins > 0 ? `${ hrs } hr ${ mins } min` : `${ hrs } hr`;
    const days    = Math.floor( hrs / 24 );
    const remHrs  = hrs % 24;
    return remHrs > 0 ? `${ days } days ${ remHrs } hr` : `${ days } days`;
}

function formatDate( dateStr ) {
    if ( ! dateStr ) return __( 'Never', 'ai-seo-tool' );
    const d = new Date( dateStr );
    return isNaN( d ) ? '—' : d.toLocaleDateString();
}

function frequencyLabel( s ) {
    if ( ! s ) return '—';
    const tz      = getBrowserTimezone();
    const day     = DAYS_OF_WEEK.find( ( d ) => d.value === String( s.day_of_week ) );
    const display = utcToTimeString( s.hour ?? 0, s.minute ?? 0, tz ) + ' (' + tz + ')';
    switch ( s.frequency ) {
        case 'daily':   return `${ __( 'Every day at', 'ai-seo-tool' ) } ${ display }`;
        case 'weekly':  return `${ __( 'Every', 'ai-seo-tool' ) } ${ day?.label || '' } ${ __( 'at', 'ai-seo-tool' ) } ${ display }`;
        case 'monthly': return `${ __( 'Day', 'ai-seo-tool' ) } ${ s.day_of_month } ${ __( 'of every month at', 'ai-seo-tool' ) } ${ display }`;
        default:        return s.frequency;
    }
}

// ── Form ─────────────────────────────────────────────────────────────────────

function ScheduleForm( { form, onChange, onSave, onCancel, saving, error, isEditing } ) {
    return (
        <div style={ { marginTop: isEditing ? '20px' : '0' } }>
            { isEditing && (
                <hr style={ { border: 'none', borderTop: '1px solid #e2e8f0', margin: '0 0 20px' } } />
            ) }

            <h3 style={ { margin: '0 0 16px', fontSize: '13px', fontWeight: 600, color: '#1e293b' } }>
                { isEditing ? __( 'Edit Schedule', 'ai-seo-tool' ) : __( 'Set Up Schedule', 'ai-seo-tool' ) }
            </h3>

            { error && (
                <Notice status="error" isDismissible={ false } style={ { marginBottom: '12px' } }>
                    { error }
                </Notice>
            ) }

            {/* Locked site URL */}
            <div style={ { marginBottom: '16px' } }>
                <div style={ { fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#757575', marginBottom: '4px' } }>
                    { __( 'Site', 'ai-seo-tool' ) }
                </div>
                <div style={ { fontSize: '13px', color: '#1e293b', padding: '7px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' } }>
                    { WP_SITE_URL }
                </div>
            </div>

            <SelectControl
                label={ __( 'Frequency', 'ai-seo-tool' ) }
                value={ form.frequency }
                options={ [
                    { label: __( 'Daily',   'ai-seo-tool' ), value: 'daily'   },
                    { label: __( 'Weekly',  'ai-seo-tool' ), value: 'weekly'  },
                    { label: __( 'Monthly', 'ai-seo-tool' ), value: 'monthly' },
                ] }
                onChange={ ( v ) => onChange( { ...form, frequency: v } ) }
            />

            { form.frequency === 'weekly' && (
                <SelectControl
                    label={ __( 'Day of Week', 'ai-seo-tool' ) }
                    value={ form.day_of_week }
                    options={ DAYS_OF_WEEK }
                    onChange={ ( v ) => onChange( { ...form, day_of_week: v } ) }
                />
            ) }

            { form.frequency === 'monthly' && (
                <SelectControl
                    label={ __( 'Day of Month', 'ai-seo-tool' ) }
                    value={ form.day_of_month }
                    options={ DAYS_OF_MONTH }
                    onChange={ ( v ) => onChange( { ...form, day_of_month: v } ) }
                />
            ) }

            <div style={ { marginBottom: '16px' } }>
                <label style={ { display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.05em', color: '#757575' } }>
                    { __( 'Time', 'ai-seo-tool' ) }
                </label>
                <input
                    type="time"
                    value={ form.time }
                    onChange={ ( e ) => onChange( { ...form, time: e.target.value } ) }
                    required
                    style={ { width: '100%', padding: '7px 10px', fontSize: '13px',
                        border: '1px solid #e2e8f0', borderRadius: '4px',
                        background: '#ffffff', color: '#1e293b', colorScheme: 'light',
                        boxSizing: 'border-box' } }
                />
            </div>

            <SelectControl
                label={ __( 'Timezone', 'ai-seo-tool' ) }
                value={ form.timezone }
                options={ TIMEZONE_OPTIONS }
                onChange={ ( v ) => onChange( { ...form, timezone: v } ) }
            />

            <div style={ { display: 'flex', gap: '8px', marginTop: '8px' } }>
                <button
                    onClick={ onSave }
                    disabled={ saving }
                    style={ { ...BTN_PRIMARY, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' } }
                    onMouseEnter={ ( e ) => { if ( ! saving ) e.currentTarget.style.boxShadow = '0 3px 8px rgba(13,148,136,0.5)'; } }
                    onMouseLeave={ ( e ) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(13,148,136,0.3)'; } }
                >
                    { saving ? <Spinner /> : __( 'Save Schedule', 'ai-seo-tool' ) }
                </button>
                { isEditing && (
                    <button
                        onClick={ onCancel }
                        disabled={ saving }
                        style={ { ...BTN_SECONDARY, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' } }
                        onMouseEnter={ ( e ) => { if ( ! saving ) { e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)'; } } }
                        onMouseLeave={ ( e ) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; } }
                    >
                        { __( 'Cancel', 'ai-seo-tool' ) }
                    </button>
                ) }
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SchedulesTab() {
    const [ schedule,      setSchedule      ] = useState( null );
    const [ loading,       setLoading       ] = useState( true );
    const [ error,         setError         ] = useState( null );
    const [ editing,       setEditing       ] = useState( false );
    const [ form,          setForm          ] = useState( emptyForm() );
    const [ saving,        setSaving        ] = useState( false );
    const [ formError,     setFormError     ] = useState( null );
    const [ triggering,    setTriggering    ] = useState( false );
    const [ toggleLoading, setToggleLoading ] = useState( false );
    const [ deleting,      setDeleting      ] = useState( false );

    useEffect( () => {
        let cancelled = false;
        apiFetch( { path: '/ai-seo-tool/v1/schedules' } )
            .then( ( res ) => {
                if ( cancelled ) return;
                const all = Array.isArray( res ) ? res : ( res?.schedules || [] );
                const match = all.find( ( s ) => {
                    try { return new URL( s.url ).hostname === new URL( WP_SITE_URL ).hostname; }
                    catch { return s.url === WP_SITE_URL; }
                } );
                setSchedule( match || null );
            } )
            .catch( ( err ) => { if ( ! cancelled ) setError( err.message || __( 'Failed to load schedule.', 'ai-seo-tool' ) ); } )
            .finally( () => { if ( ! cancelled ) setLoading( false ); } );
        return () => { cancelled = true; };
    }, [] );

    const handleSave = async () => {
        setSaving( true );
        setFormError( null );
        const { hour, minute } = timeStringToUtc( form.time, form.timezone );
        const day_of_week  = parseInt( form.day_of_week, 10 );
        const day_of_month = parseInt( form.day_of_month, 10 );
        try {
            if ( schedule ) {
                const patch = {
                    frequency:    form.frequency,
                    hour,
                    minute,
                    day_of_week:  form.frequency === 'weekly'  ? day_of_week  : null,
                    day_of_month: form.frequency === 'monthly' ? day_of_month : null,
                };
                const updated = await apiFetch( { path: `/ai-seo-tool/v1/schedules/${ schedule.id }`, method: 'PATCH', data: patch } );
                setSchedule( updated );
                setEditing( false );
            } else {
                const payload = {
                    url:          WP_SITE_URL,
                    frequency:    form.frequency,
                    hour,
                    minute,
                    day_of_week:  form.frequency === 'weekly'  ? day_of_week  : null,
                    day_of_month: form.frequency === 'monthly' ? day_of_month : null,
                };
                const created = await apiFetch( { path: '/ai-seo-tool/v1/schedules', method: 'POST', data: payload } );
                setSchedule( created );
            }
        } catch ( err ) {
            setFormError( err.message || __( 'Failed to save schedule.', 'ai-seo-tool' ) );
        } finally {
            setSaving( false );
        }
    };

    const handleToggle = async () => {
        if ( ! schedule ) return;
        setToggleLoading( true );
        try {
            await apiFetch( { path: `/ai-seo-tool/v1/schedules/${ schedule.id }`, method: 'PATCH', data: { enabled: ! schedule.enabled } } );
            setSchedule( ( prev ) => ( { ...prev, enabled: ! prev.enabled } ) );
        } catch { /* snaps back silently */ }
        finally { setToggleLoading( false ); }
    };

    const handleDelete = async () => {
        // eslint-disable-next-line no-alert
        if ( ! window.confirm( __( 'Remove the recurring schedule for this site?', 'ai-seo-tool' ) ) ) return;
        setDeleting( true );
        try {
            await apiFetch( { path: `/ai-seo-tool/v1/schedules/${ schedule.id }`, method: 'DELETE' } );
            setSchedule( null );
            setEditing( false );
            setForm( emptyForm() );
        } catch ( err ) {
            setError( err.message || __( 'Failed to delete schedule.', 'ai-seo-tool' ) );
        } finally {
            setDeleting( false );
        }
    };

    const handleTrigger = async () => {
        setTriggering( true );
        try {
            await apiFetch( { path: `/ai-seo-tool/v1/schedules/${ schedule.id }/trigger`, method: 'POST' } );
        } catch ( err ) {
            setError( err.message || __( 'Failed to trigger audit.', 'ai-seo-tool' ) );
        } finally {
            setTriggering( false );
        }
    };

    const startEdit = () => {
        setForm( scheduleToForm( schedule ) );
        setFormError( null );
        setEditing( true );
    };

    // ── Loading ───────────────────────────────────────────────────────────────

    if ( loading ) {
        return (
            <div style={ { display: 'flex', alignItems: 'center', gap: '8px', padding: '24px' } }>
                <Spinner />
                <span>{ __( 'Loading schedule…', 'ai-seo-tool' ) }</span>
            </div>
        );
    }

    return (
        <div style={ { maxWidth: '560px' } }>
            { error && (
                <Notice status="error" isDismissible onRemove={ () => setError( null ) } style={ { marginBottom: '16px' } }>
                    { error }
                </Notice>
            ) }

            <Card>
                <CardBody style={ { padding: '24px' } }>

                    { /* ── No schedule yet ── */ }
                    { ! schedule && (
                        <>
                            <div style={ { textAlign: 'center', padding: '8px 0 24px' } }>
                                <div style={ {
                                    width: '52px', height: '52px', background: '#f0fdfa', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
                                } }>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                </div>
                                <h3 style={ { margin: '0 0 6px', fontSize: '15px', fontWeight: 600, color: '#1e293b' } }>
                                    { __( 'No schedule set', 'ai-seo-tool' ) }
                                </h3>
                                <p style={ { margin: 0, fontSize: '13px', color: '#6b7280' } }>
                                    { __( 'Automatically re-audit this site on a recurring schedule.', 'ai-seo-tool' ) }
                                </p>
                            </div>
                            <ScheduleForm
                                form={ form }
                                onChange={ setForm }
                                onSave={ handleSave }
                                onCancel={ null }
                                saving={ saving }
                                error={ formError }
                                isEditing={ false }
                            />
                        </>
                    ) }

                    { /* ── Schedule exists ── */ }
                    { schedule && (
                        <>
                            {/* Header row */}
                            <div style={ { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' } }>
                                <div>
                                    <div style={ { fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' } }>
                                        { __( 'Recurring Audit', 'ai-seo-tool' ) }
                                    </div>
                                    <div style={ { fontSize: '12px', color: '#6b7280' } }>{ WP_SITE_URL }</div>
                                </div>

                                {/* Enabled toggle */}
                                <div style={ { display: 'flex', alignItems: 'center', gap: '8px' } }>
                                    <span style={ { fontSize: '12px', color: '#6b7280' } }>
                                        { schedule.enabled ? __( 'Active', 'ai-seo-tool' ) : __( 'Paused', 'ai-seo-tool' ) }
                                    </span>
                                    <button
                                        onClick={ handleToggle }
                                        disabled={ toggleLoading }
                                        style={ {
                                            width: '44px', height: '24px', borderRadius: '12px', border: 'none',
                                            background: schedule.enabled ? '#0d9488' : '#d1d5db',
                                            cursor: toggleLoading ? 'not-allowed' : 'pointer',
                                            position: 'relative', transition: 'background 0.2s',
                                            opacity: toggleLoading ? 0.6 : 1, flexShrink: 0,
                                        } }
                                    >
                                        <span style={ {
                                            position: 'absolute', top: '4px',
                                            left: schedule.enabled ? '23px' : '4px',
                                            width: '16px', height: '16px', borderRadius: '50%',
                                            background: '#fff', transition: 'left 0.2s',
                                        } } />
                                    </button>
                                </div>
                            </div>

                            {/* Schedule details */}
                            <div style={ {
                                background: '#f8fafc', border: '1px solid #e2e8f0',
                                borderRadius: '8px', padding: '16px', marginBottom: '20px',
                            } }>
                                <div style={ { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } }>
                                    <Stat label={ __( 'Runs', 'ai-seo-tool' ) }        value={ frequencyLabel( schedule ) } span />
                                    <Stat label={ __( 'Next run', 'ai-seo-tool' ) }    value={ formatNextRun( schedule.next_run_at ) } />
                                    <Stat label={ __( 'Last run', 'ai-seo-tool' ) }    value={ formatDate( schedule.last_run_at ) } />
                                </div>
                            </div>

                            {/* Action buttons */}
                            { ! editing && (
                                <div style={ { display: 'flex', gap: '8px', flexWrap: 'wrap' } }>
                                    <button
                                        onClick={ handleTrigger }
                                        disabled={ ! schedule.enabled || triggering }
                                        style={ { ...BTN_PRIMARY, opacity: ( ! schedule.enabled || triggering ) ? 0.35 : 1, cursor: ( ! schedule.enabled || triggering ) ? 'not-allowed' : 'pointer' } }
                                        onMouseEnter={ ( e ) => { if ( schedule.enabled && ! triggering ) e.currentTarget.style.boxShadow = '0 3px 8px rgba(13,148,136,0.5)'; } }
                                        onMouseLeave={ ( e ) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(13,148,136,0.3)'; } }
                                    >
                                        { triggering ? <><Spinner />{ __( ' Running…', 'ai-seo-tool' ) }</> : __( 'Run Now', 'ai-seo-tool' ) }
                                    </button>
                                    <button
                                        onClick={ startEdit }
                                        disabled={ ! schedule.enabled }
                                        title={ schedule.enabled ? undefined : __( 'Enable schedule to edit', 'ai-seo-tool' ) }
                                        style={ { ...BTN_SECONDARY, opacity: ! schedule.enabled ? 0.35 : 1, cursor: ! schedule.enabled ? 'not-allowed' : 'pointer' } }
                                        onMouseEnter={ ( e ) => { if ( schedule.enabled ) { e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)'; } } }
                                        onMouseLeave={ ( e ) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; } }
                                    >
                                        { __( 'Edit', 'ai-seo-tool' ) }
                                    </button>
                                    <button
                                        onClick={ handleDelete }
                                        disabled={ deleting }
                                        style={ { ...BTN_DESTRUCTIVE, opacity: deleting ? 0.7 : 1, cursor: deleting ? 'not-allowed' : 'pointer' } }
                                        onMouseEnter={ ( e ) => { if ( ! deleting ) { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(220,38,38,0.15)'; } } }
                                        onMouseLeave={ ( e ) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; } }
                                    >
                                        { deleting ? <Spinner /> : __( 'Delete', 'ai-seo-tool' ) }
                                    </button>
                                </div>
                            ) }

                            {/* Inline edit form */}
                            { editing && (
                                <ScheduleForm
                                    form={ form }
                                    onChange={ setForm }
                                    onSave={ handleSave }
                                    onCancel={ () => setEditing( false ) }
                                    saving={ saving }
                                    error={ formError }
                                    isEditing={ true }
                                />
                            ) }
                        </>
                    ) }

                </CardBody>
            </Card>
        </div>
    );
}

function Stat( { label, value, span } ) {
    return (
        <div style={ span ? { gridColumn: '1 / -1' } : {} }>
            <div style={ { fontSize: '11px', color: '#6b7280', fontWeight: 500, marginBottom: '3px' } }>{ label }</div>
            <div style={ { fontSize: '13px', fontWeight: 600, color: '#1e293b' } }>{ value }</div>
        </div>
    );
}

/**
 * AI SEO Tool — GeoAnalysisTab
 * Condensed consolidated view: one row per section, expandable issues with inline fixes.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */
import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import {
    Card,
    CardBody,
    Spinner,
    Notice,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import GeoScoreRing from '../GeoScoreRing';
import EngineScoreCard from '../EngineScoreCard';
import PlanGate from '../PlanGate';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
    green:    '#16a34a', greenBg:  '#f0fdf4', greenBd:  '#bbf7d0',
    teal:     '#0d9488', tealBg:   '#f0fdfa', tealBd:   '#99f6e4',
    yellow:   '#ca8a04', yellowBg: '#fefce8', yellowBd: '#fde68a',
    orange:   '#ea580c', orangeBg: '#fff7ed', orangeBd: '#fed7aa',
    red:      '#dc2626', redBg:    '#fef2f2', redBd:    '#fecaca',
    blue:     '#2563eb', blueBg:   '#eff6ff', blueBd:   '#bfdbfe',
    purple:   '#7c3aed', purpleBg: '#f5f3ff', purpleBd: '#ddd6fe',
    gray:     '#6b7280', grayBg:   '#f8fafc', grayBd:   '#e2e8f0',
    dark:     '#1e293b', mid:      '#374151', light:    '#94a3b8',
};

function scoreColor( s ) {
    return s >= 80 ? C.green : s >= 65 ? C.yellow : s >= 50 ? C.orange : C.red;
}

// ── Tiny status badge ─────────────────────────────────────────────────────────

function StatusChip( { value } ) {
    const map = {
        Excellent:   { col: C.green,  bg: C.greenBg,  icon: '🌟' },
        Good:        { col: C.teal,   bg: C.tealBg,   icon: '✅' },
        Fair:        { col: C.yellow, bg: C.yellowBg, icon: '⚠️' },
        Poor:        { col: C.red,    bg: C.redBg,    icon: '⛔' },
        Established: { col: C.green,  bg: C.greenBg,  icon: '🏆' },
        Emerging:    { col: C.yellow, bg: C.yellowBg, icon: '📈' },
        Unknown:     { col: C.gray,   bg: C.grayBg,   icon: '❓' },
    };
    if ( ! value ) return null;
    const { col, bg, icon } = map[ value ] || { col: C.gray, bg: C.grayBg, icon: '' };
    return (
        <span style={ { fontSize: '11px', fontWeight: 700, color: col, background: bg, borderRadius: '4px', padding: '2px 6px' } }>
            { icon } { value }
        </span>
    );
}

// ── Inline metric text: "label bold-value" ────────────────────────────────────

function M( { label, value, color } ) {
    return (
        <span style={ { fontSize: '11px', color: C.gray, whiteSpace: 'nowrap' } }>
            { label } <strong style={ { color: color || C.dark, fontWeight: 700 } }>{ value }</strong>
        </span>
    );
}

function Dot() {
    return <span style={ { color: C.grayBd, fontSize: '11px' } }> · </span>;
}

// ── Condensed SectionBlock ────────────────────────────────────────────────────

function SectionBlock( { icon, title, metrics, issues } ) {
    const hasIssues = issues && issues.length > 0;
    const [ open, setOpen ] = useState( false );

    return (
        <div style={ {
            borderRadius: '8px',
            border: `1px solid ${ hasIssues ? C.grayBd : C.greenBd }`,
            overflow: 'hidden', background: '#fff',
        } }>
            {/* Single compact header row */}
            <button
                onClick={ hasIssues ? () => setOpen( ( v ) => ! v ) : undefined }
                style={ {
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 14px',
                    cursor: hasIssues ? 'pointer' : 'default',
                    background: open && hasIssues ? '#fafafa' : '#fff',
                    border: 'none',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                } }
                onMouseEnter={ ( e ) => { if ( hasIssues ) e.currentTarget.style.background = '#f8fafc'; } }
                onMouseLeave={ ( e ) => { e.currentTarget.style.background = open && hasIssues ? '#fafafa' : '#fff'; } }
            >
                <span style={ { fontSize: '14px', flexShrink: 0 } }>{ icon }</span>
                <span style={ { fontSize: '12px', fontWeight: 700, color: C.dark, minWidth: '130px', flexShrink: 0 } }>
                    { title }
                </span>
                <div style={ { flex: 1, display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', minWidth: 0 } }>
                    { metrics }
                </div>
                { hasIssues ? (
                    <span style={ {
                        fontSize: '11px', fontWeight: 700, flexShrink: 0,
                        color: C.red, background: C.redBg,
                        border: `1px solid ${ C.redBd }`,
                        borderRadius: '20px', padding: '2px 8px',
                    } }>
                        { issues.length } { issues.length === 1 ? __( 'issue', 'ai-seo-tool' ) : __( 'issues', 'ai-seo-tool' ) }
                    </span>
                ) : (
                    <span style={ {
                        fontSize: '11px', fontWeight: 700, flexShrink: 0,
                        color: C.green, background: C.greenBg,
                        border: `1px solid ${ C.greenBd }`,
                        borderRadius: '20px', padding: '2px 8px',
                    } }>✅ OK</span>
                ) }
                { hasIssues && (
                    <span style={ {
                        fontSize: '10px', color: C.light, flexShrink: 0,
                        transform: open ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.15s',
                    } }>▼</span>
                ) }
            </button>

            {/* Compact issues list */}
            { open && hasIssues && (
                <div style={ {
                    borderTop: `1px solid ${ C.grayBd }`,
                    background: C.grayBg,
                    padding: '6px 14px 8px',
                    display: 'flex', flexDirection: 'column', gap: '5px',
                } }>
                    { issues.map( ( issue, i ) => (
                        <div key={ i } style={ {
                            display: 'grid',
                            gridTemplateColumns: 'auto 1fr',
                            gap: '6px',
                            alignItems: 'baseline',
                            fontSize: '12px',
                            lineHeight: '1.5',
                        } }>
                            <span style={ { flexShrink: 0, fontSize: '12px' } }>
                                { issue.severity === 'critical' ? '⛔' : '⚠️' }
                            </span>
                            <span style={ { color: C.mid } }>
                                <strong style={ { color: C.dark } }>{ issue.what }</strong>
                                { issue.fix && (
                                    <span style={ { color: C.gray } }> — { issue.fix }</span>
                                ) }
                            </span>
                        </div>
                    ) ) }
                </div>
            ) }
        </div>
    );
}

// ── Recommendations ───────────────────────────────────────────────────────────

function RecommendationGroup( { label, items, color, bg, icon } ) {
    const [ open, setOpen ]         = useState( false );
    const [ expanded, setExpanded ] = useState( null );
    return (
        <div style={ { borderBottom: '1px solid #f0f0f0' } }>
            <button
                onClick={ () => setOpen( ( v ) => ! v ) }
                style={ {
                    width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 16px', background: open ? bg : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.15s',
                    borderRadius: '6px 6px 0 0',
                    fontWeight: 600,
                } }
                onMouseEnter={ ( e ) => { if ( ! open ) e.currentTarget.style.background = '#f8fafc'; } }
                onMouseLeave={ ( e ) => { e.currentTarget.style.background = open ? bg : 'transparent'; } }
            >
                <span style={ { fontSize: '11px' } }>{ icon }</span>
                <span style={ { flex: 1, fontSize: '12px', fontWeight: 600, color } }>{ label }</span>
                <span style={ {
                    fontSize: '11px', fontWeight: 700, color,
                    background: bg, border: `1px solid ${ color }22`,
                    borderRadius: '10px', padding: '1px 7px', lineHeight: '18px',
                } }>{ items.length }</span>
                <span style={ { fontSize: '10px', color: '#aaa', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' } }>▼</span>
            </button>
            { open && items.map( ( s, i ) => {
                const title = s.title || s.what || s.recommendation || `${ label } ${ i + 1 }`;
                const why   = s.why || s.description || s.detail || '';
                return (
                    <div key={ i } style={ { borderTop: `1px solid ${ color }18` } }>
                        <button
                            onClick={ () => setExpanded( expanded === i ? null : i ) }
                            style={ {
                                width: '100%', display: 'flex', alignItems: 'flex-start', gap: '8px',
                                padding: '8px 16px 8px 28px', background: 'transparent',
                                border: 'none', cursor: 'pointer', textAlign: 'left',
                                transition: 'background 0.15s',
                            } }
                            onMouseEnter={ ( e ) => { e.currentTarget.style.background = '#f8fafc'; } }
                            onMouseLeave={ ( e ) => { e.currentTarget.style.background = 'transparent'; } }
                        >
                            <span style={ { width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0, marginTop: '5px' } } />
                            <span style={ { flex: 1, fontSize: '12px', color: '#333', lineHeight: '1.4' } }>{ title }</span>
                            { why && <span style={ { fontSize: '10px', color: '#aaa', flexShrink: 0 } }>{ expanded === i ? '▲' : '▼' }</span> }
                        </button>
                        { expanded === i && why && (
                            <p style={ { margin: 0, padding: '0 16px 10px 42px', fontSize: '12px', color: '#666', lineHeight: '1.5' } }>{ why }</p>
                        ) }
                    </div>
                );
            } ) }
        </div>
    );
}

// ── Engine constants ──────────────────────────────────────────────────────────

const ENGINE_FOCUS = {
    chatgpt:    __( 'Conversational + authoritative content', 'ai-seo-tool' ),
    perplexity: __( 'Citation-ready, factual depth', 'ai-seo-tool' ),
    gemini:     __( 'Entity clarity + structured data', 'ai-seo-tool' ),
    claude:     __( 'E-E-A-T + trustworthiness signals', 'ai-seo-tool' ),
    grok:       __( 'Real-time relevance + recency', 'ai-seo-tool' ),
};

const ENGINE_DISPLAY_NAMES = {
    chatgpt: 'ChatGPT', perplexity: 'Perplexity',
    gemini: 'Gemini', claude: 'Claude', grok: 'Grok',
};

const ENGINE_COLORS = {
    chatgpt: C.green, perplexity: C.blue,
    gemini: C.yellow, claude: C.purple, grok: C.orange,
};

// ── Main component ────────────────────────────────────────────────────────────

export default function GeoAnalysisTab( { siteId, plan } ) {
    const [ geo, setGeo ] = useState( null );
    const [ loading, setLoading ] = useState( true );
    const [ error, setError ] = useState( null );

    if ( plan?.plan === 'free' ) return <PlanGate />;

    useEffect( () => {
        if ( ! siteId ) { setLoading( false ); return; }
        let cancelled = false;
        async function fetchGeo() {
            setLoading( true ); setError( null );
            try {
                const res = await apiFetch( { path: `/ai-seo-tool/v1/sites/${ siteId }/geo` } );
                if ( ! cancelled ) setGeo( res );
            } catch ( err ) {
                if ( ! cancelled ) setError( err.message || __( 'Failed to load GEO analysis data.', 'ai-seo-tool' ) );
            } finally {
                if ( ! cancelled ) setLoading( false );
            }
        }
        fetchGeo();
        return () => { cancelled = true; };
    }, [ siteId ] );

    if ( loading ) return (
        <div style={ { display: 'flex', alignItems: 'center', gap: '8px', padding: '24px' } }>
            <Spinner /><span>{ __( 'Loading GEO analysis…', 'ai-seo-tool' ) }</span>
        </div>
    );
    if ( error ) return <Notice status="error" isDismissible={ false }>{ error }</Notice>;
    if ( ! geo ) return (
        <Notice status="info" isDismissible={ false }>
            { __( 'GEO analysis data not yet available.', 'ai-seo-tool' ) }
        </Notice>
    );

    const score  = geo.score?.overall_score || 0;
    const grade  = geo.score?.grade || '';

    const engineScores = geo.score?.engine_scores || {};
    const engines = Object.entries( ENGINE_DISPLAY_NAMES ).map( ( [ key, name ] ) => ( {
        key, name,
        score: Math.round( engineScores[ key ]?.score || 0 ),
        focus: engineScores[ key ]?.focus || ENGINE_FOCUS[ key ] || '',
    } ) );

    const critical  = geo.suggestions?.critical  || [];
    const important = geo.suggestions?.important || [];
    const optional  = geo.suggestions?.optional  || [];

    const geoData = geo.geo_data || geo;
    const pages   = geoData?.page_scores || geoData?.pages || [];

    return (
        <div>
            {/* Score ring + engine cards | Recommendations */}
            <div style={ { display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'stretch' } }>
                <Card style={ { flex: '1 1 0', minWidth: '0' } }>
                    <CardBody style={ { padding: '24px' } }>
                        <div style={ { display: 'flex', gap: '24px', alignItems: 'center' } }>
                            <div style={ { display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 } }>
                                <GeoScoreRing score={ score } grade={ grade } size={ 120 } />
                                <div style={ { marginTop: '8px', fontSize: '12px', color: C.gray } }>
                                    { __( 'AI Citation Score', 'ai-seo-tool' ) }
                                </div>
                            </div>
                            <div style={ {
                                flex: 1, display: 'grid',
                                gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                                gap: '12px', minWidth: '0',
                            } }>
                                { engines.map( ( e ) => (
                                    <EngineScoreCard key={ e.key } name={ e.name } score={ e.score } focus={ e.focus } />
                                ) ) }
                            </div>
                        </div>
                    </CardBody>
                </Card>

                { ( critical.length + important.length + optional.length ) > 0 && (
                    <div style={ { flex: '0 0 280px', position: 'relative' } }>
                        <Card style={ { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' } }>
                            <CardBody style={ { padding: '0', height: '100%', overflowY: 'auto', boxSizing: 'border-box' } }>
                                <div style={ { padding: '14px 16px 8px', borderBottom: '1px solid #f0f0f0' } }>
                                    <span style={ { fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#555' } }>
                                        { __( 'Recommendations', 'ai-seo-tool' ) }
                                    </span>
                                </div>
                                { [
                                    { label: __( 'Critical', 'ai-seo-tool' ),  items: critical,  color: C.red,    bg: C.redBg,    icon: '🔴' },
                                    { label: __( 'Important', 'ai-seo-tool' ), items: important, color: C.yellow, bg: C.yellowBg, icon: '🟡' },
                                    { label: __( 'Optional', 'ai-seo-tool' ),  items: optional,  color: C.gray,   bg: C.grayBg,   icon: '⚪' },
                                ].map( ( g ) => g.items.length > 0 && (
                                    <RecommendationGroup key={ g.label } { ...g } />
                                ) ) }
                            </CardBody>
                        </Card>
                    </div>
                ) }
            </div>

            {/* Condensed sections */}
            <ConsolidatedView geo={ geoData } pages={ pages } />
        </div>
    );
}

// ── Issue derivers ────────────────────────────────────────────────────────────

function deriveSchemaIssues( schema ) {
    const out = [];
    ( schema.missing_recommended || [] ).forEach( ( type ) => out.push( {
        severity: 'warning',
        what: `Missing ${ type } schema`,
        fix: `Add a JSON-LD block with @type: "${ type }" to relevant pages.`,
    } ) );
    ( schema.completeness_issues || [] ).forEach( ( i ) => out.push( {
        severity: 'warning',
        what: typeof i === 'string' ? i : JSON.stringify( i ),
        fix: 'Complete the required fields for this schema type.',
    } ) );
    ( schema.semantic_mismatches || [] ).forEach( ( i ) => out.push( {
        severity: 'warning',
        what: typeof i === 'string' ? i : JSON.stringify( i ),
        fix: 'Align schema values with the actual visible page content.',
    } ) );
    return out;
}

function deriveContentIssues( content ) {
    const out = [];
    const wc = Math.round( content.avg_word_count || 0 );
    if ( wc > 0 && wc < 300 ) out.push( {
        severity: 'critical',
        what: `Very low avg word count (${ wc } words)`,
        fix: 'Target 600+ words per key page for AI citation eligibility.',
    } );
    if ( ( content.thin_pages || 0 ) > 0 ) out.push( {
        severity: 'critical',
        what: `${ content.thin_pages } pages under 300 words`,
        fix: 'Expand thin pages with authoritative, topical content.',
    } );
    if ( ! content.faq_pages ) out.push( {
        severity: 'warning',
        what: 'No FAQ sections detected',
        fix: 'Add Q&A sections — AI engines extract these as featured snippets.',
    } );
    return out;
}

const TRUST_FIX = {
    'about':          'Create a detailed /about page with team info and credentials.',
    'contact':        'Add a /contact page with phone, email, and physical address.',
    'privacy policy': 'Publish a /privacy-policy page to signal legal trustworthiness.',
    'terms':          'Add a terms-of-service page to signal a legitimate business.',
    'faq':            'Create a dedicated FAQ page — AI engines cite these heavily.',
    'author bio':     'Add author bio pages or bylines with credentials to all content.',
    'case studies':   'Publish case studies or success stories to show real-world authority.',
};

function deriveEEATIssues( eeat ) {
    const out = [];
    ( eeat.missing_signals || [] ).forEach( ( s ) => {
        const key = ( s || '' ).toLowerCase();
        const fix = Object.entries( TRUST_FIX ).find( ( [ k ] ) => key.includes( k ) )?.[1]
            || 'Add this trust signal to improve E-E-A-T credibility.';
        out.push( { severity: 'warning', what: `Missing: ${ s }`, fix } );
    } );
    if ( ! ( eeat.expertise_signals || [] ).length ) out.push( {
        severity: 'warning',
        what: 'No expertise or authority signals detected',
        fix: 'Add author credentials, professional titles, or certifications to key pages.',
    } );
    return out;
}

function deriveNLPIssues( nlp ) {
    const out = [];
    const r = nlp.snippet_readiness || '';
    if ( r === 'Poor' ) out.push( {
        severity: 'critical',
        what: 'AI snippet readiness is Poor',
        fix: 'Lead every answer with the direct response in 40–120 words (BLUF format).',
    } );
    else if ( r === 'Fair' ) out.push( {
        severity: 'warning',
        what: 'AI snippet readiness is Fair',
        fix: 'Improve answer structure: open each answer with the direct response.',
    } );
    if ( ! nlp.answer_blocks ) out.push( {
        severity: 'warning',
        what: 'No structured answer blocks detected',
        fix: 'Format key answers with a direct opening sentence then supporting detail.',
    } );
    if ( ( nlp.answer_quality_score || 0 ) < 50 ) out.push( {
        severity: 'warning',
        what: `Low answer quality score (${ Math.round( nlp.answer_quality_score || 0 ) }/100)`,
        fix: 'Avoid hedging words like "might", "could", "possibly" — be direct.',
    } );
    return out;
}

function deriveVisibilityIssues( visibility ) {
    const out = [];
    const overall = Math.round( visibility.overall_mention_rate || 0 );
    if ( overall < 30 ) out.push( {
        severity: 'critical',
        what: `Very low AI mention rate (${ overall }%)`,
        fix: 'Prioritize E-E-A-T signals, structured data, and entity establishment.',
    } );
    const rates = visibility.engine_mention_rates || {};
    Object.entries( ENGINE_DISPLAY_NAMES ).forEach( ( [ key, name ] ) => {
        if ( Math.round( ( rates[ key ] || 0 ) * 100 ) === 0 ) out.push( {
            severity: 'warning',
            what: `Not mentioned by ${ name }`,
            fix: `Improve ${ name }-specific signals: ${ ENGINE_FOCUS[ key ] }`,
        } );
    } );
    return out;
}

function deriveEntityIssues( entity ) {
    const out = [];
    if ( ! entity.wikipedia_found ) out.push( {
        severity: 'warning',
        what: 'No Wikipedia article found',
        fix: 'Build brand authority through press mentions before pursuing Wikipedia.',
    } );
    if ( ( entity.same_as_profiles || [] ).length < 2 ) out.push( {
        severity: 'warning',
        what: 'Few sameAs profile links',
        fix: 'Add LinkedIn, Crunchbase, and Wikidata URLs to your Organization schema.',
    } );
    if ( ( ( entity.score_breakdown || {} ).org_schema || 0 ) < 10 ) out.push( {
        severity: 'warning',
        what: 'Organization schema is incomplete',
        fix: 'Add name, URL, logo, address, phone, and founding date to your schema.',
    } );
    return out;
}

// ── ConsolidatedView ──────────────────────────────────────────────────────────

function ConsolidatedView( { geo, pages } ) {
    const schema     = geo?.schema_analysis     || geo?.schema      || {};
    const content    = geo?.content_analysis    || geo?.content     || {};
    const eeat       = geo?.eeat_analysis       || geo?.eeat        || {};
    const nlp        = geo?.nlp_analysis        || geo?.nlp         || {};
    const visibility = geo?.visibility_analysis || geo?.visibility  || {};
    const entity     = geo?.entity_analysis     || geo?.entity      || {};

    const wc      = Math.round( content.avg_word_count || 0 );
    const wcColor = wc >= 600 ? C.green : wc >= 300 ? C.yellow : C.red;

    const intentColors = {
        Informational: C.blue, Commercial: C.purple,
        Transactional: C.teal, Navigational: C.gray,
    };

    const overallRate = Math.round( visibility.overall_mention_rate || 0 );
    const engRates    = visibility.engine_mention_rates || {};

    return (
        <div style={ { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' } }>

            {/* 3 rows × 2 columns grid */}
            <div style={ { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' } }>

                <SectionBlock
                    icon="🗂️"
                    title={ __( 'Schema', 'ai-seo-tool' ) }
                    issues={ deriveSchemaIssues( schema ) }
                    metrics={ <>
                        <M label="Coverage" value={ `${ Math.round( schema.coverage_pct || 0 ) }%` } color={ scoreColor( schema.coverage_pct || 0 ) } />
                        { ( schema.formats_present || [] ).length > 0 && <><Dot /><M label="Formats" value={ ( schema.formats_present || [] ).join( ', ' ) } /></> }
                        <Dot /><M label="Types" value={ ( schema.types_detected || [] ).length } color={ C.blue } />
                    </> }
                />

                <SectionBlock
                    icon="📝"
                    title={ __( 'Content', 'ai-seo-tool' ) }
                    issues={ deriveContentIssues( content ) }
                    metrics={ <>
                        <M label="Avg words" value={ wc } color={ wcColor } />
                        { content.reading_level && <><Dot /><M label="Level" value={ content.reading_level } /></> }
                        <Dot /><M label="FAQ pages" value={ content.faq_pages || 0 } color={ C.teal } />
                        { ( content.thin_pages || 0 ) > 0 && <><Dot /><M label="Thin" value={ content.thin_pages } color={ C.red } /></> }
                    </> }
                />

                <SectionBlock
                    icon="🏅"
                    title={ __( 'E-E-A-T', 'ai-seo-tool' ) }
                    issues={ deriveEEATIssues( eeat ) }
                    metrics={ <>
                        <M label="Score" value={ `${ Math.round( eeat.score || 0 ) }/100` } color={ scoreColor( eeat.score || 0 ) } />
                        <Dot /><M label="Trust pages" value={ `${ ( eeat.trust_pages_present || [] ).length }/7` } color={ C.teal } />
                        { eeat.blog_cadence && <><Dot /><M label="Cadence" value={ eeat.blog_cadence } /></> }
                    </> }
                />

                <SectionBlock
                    icon="🤖"
                    title={ __( 'NLP', 'ai-seo-tool' ) }
                    issues={ deriveNLPIssues( nlp ) }
                    metrics={ <>
                        { nlp.snippet_readiness && <StatusChip value={ nlp.snippet_readiness } /> }
                        { nlp.primary_intent && <><Dot /><M label="Intent" value={ nlp.primary_intent } color={ intentColors[ nlp.primary_intent ] || C.gray } /></> }
                        <Dot /><M label="Answer quality" value={ `${ Math.round( nlp.answer_quality_score || 0 ) }/100` } color={ scoreColor( nlp.answer_quality_score || 0 ) } />
                    </> }
                />

                <SectionBlock
                    icon="👁️"
                    title={ __( 'Visibility', 'ai-seo-tool' ) }
                    issues={ deriveVisibilityIssues( visibility ) }
                    metrics={ <>
                        { visibility.visibility_label && <StatusChip value={ visibility.visibility_label } /> }
                        <Dot /><M label="Mention rate" value={ `${ overallRate }%` } color={ scoreColor( overallRate ) } />
                        { Object.entries( ENGINE_DISPLAY_NAMES ).map( ( [ key, name ] ) => {
                            const rate = Math.round( ( engRates[ key ] || 0 ) * 100 );
                            const col  = ENGINE_COLORS[ key ] || C.gray;
                            return (
                                <span key={ key } title={ `${ name }: ${ rate }%` } style={ {
                                    width: '8px', height: '8px', borderRadius: '50%',
                                    background: rate > 0 ? col : '#e2e8f0',
                                    display: 'inline-block', flexShrink: 0,
                                } } />
                            );
                        } ) }
                    </> }
                />

                <SectionBlock
                    icon="🏢"
                    title={ __( 'Entity', 'ai-seo-tool' ) }
                    issues={ deriveEntityIssues( entity ) }
                    metrics={ <>
                        <M label="Score" value={ `${ Math.round( entity.score || 0 ) }/100` } color={ scoreColor( entity.score || 0 ) } />
                        { entity.establishment_label && <><Dot /><StatusChip value={ entity.establishment_label } /></> }
                        <Dot /><M label="Wikipedia" value={ entity.wikipedia_found ? '✅' : '❌' } />
                        <Dot /><M label="sameAs" value={ ( entity.same_as_profiles || [] ).length } color={ C.blue } />
                    </> }
                />

            </div>

            <WorstPages pages={ pages } />
        </div>
    );
}

// ── WorstPages ────────────────────────────────────────────────────────────────

function WorstPages( { pages } ) {
    const sorted = [ ...( Array.isArray( pages ) ? pages : [] ) ]
        .sort( ( a, b ) => ( a.score || 0 ) - ( b.score || 0 ) )
        .slice( 0, 5 );
    if ( ! sorted.length ) return null;

    return (
        <div style={ {
            borderRadius: '8px', border: `1px solid ${ C.grayBd }`,
            overflow: 'hidden', background: '#fff', marginTop: '2px',
        } }>
            <div style={ {
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 14px', borderBottom: `1px solid ${ C.grayBd }`,
                background: C.grayBg,
            } }>
                <span style={ { fontSize: '14px' } }>📄</span>
                <span style={ { flex: 1, fontSize: '12px', fontWeight: 700, color: C.dark } }>
                    { __( 'Pages Needing Improvement', 'ai-seo-tool' ) }
                </span>
                <span style={ { fontSize: '11px', color: C.light } }>{ __( 'lowest AI citation scores', 'ai-seo-tool' ) }</span>
            </div>
            <div style={ { padding: '4px 14px' } }>
                { sorted.map( ( p, i ) => {
                    const s   = Math.round( p.score || 0 );
                    const col = scoreColor( s );
                    const top = ( p.issues || p.issue_badges || [] )[ 0 ];
                    return (
                        <div key={ p.url || i } style={ {
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '7px 0',
                            borderBottom: i < sorted.length - 1 ? `1px solid ${ C.grayBd }` : 'none',
                        } }>
                            <span style={ { fontSize: '12px', fontWeight: 800, color: col, minWidth: '24px' } }>{ s }</span>
                            <span style={ { flex: 1, fontSize: '12px', color: C.mid, wordBreak: 'break-all' } }>{ p.url || '—' }</span>
                            { top && (
                                <span style={ {
                                    fontSize: '10px', fontWeight: 600, color: col, flexShrink: 0,
                                    background: col + '14', border: `1px solid ${ col }30`,
                                    borderRadius: '4px', padding: '1px 6px',
                                } }>
                                    { typeof top === 'string' ? top : top.label || 'Issue' }
                                </span>
                            ) }
                        </div>
                    );
                } ) }
            </div>
        </div>
    );
}

/**
 * AI SEO Tool — GeoAnalysisTab
 * Shows full GEO Analysis with score, engine cards, 7 sub-tabs, and suggestions.
 * Free plan users see PlanGate instead.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */
import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import {
    Card,
    CardBody,
    TabPanel,
    Spinner,
    Notice,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import GeoScoreRing from '../GeoScoreRing';
import EngineScoreCard from '../EngineScoreCard';
import PlanGate from '../PlanGate';

/** Engine-specific focus descriptions used when data doesn't provide them. */
const ENGINE_FOCUS = {
    chatgpt:    __( 'Conversational + authoritative content', 'ai-seo-tool' ),
    perplexity: __( 'Citation-ready, factual depth', 'ai-seo-tool' ),
    gemini:     __( 'Entity clarity + structured data', 'ai-seo-tool' ),
    claude:     __( 'E-E-A-T + trustworthiness signals', 'ai-seo-tool' ),
    grok:       __( 'Real-time relevance + recency', 'ai-seo-tool' ),
};

const ENGINE_DISPLAY_NAMES = {
    chatgpt: 'ChatGPT',
    perplexity: 'Perplexity',
    gemini: 'Gemini',
    claude: 'Claude',
    grok: 'Grok',
};

/**
 * @param {Object} props
 * @param {string} props.siteId - Analysis site/job ID.
 * @param {Object} props.plan   - Plan object from usePlan.
 */
export default function GeoAnalysisTab( { siteId, plan } ) {
    const [ geo, setGeo ] = useState( null );
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
        async function fetchGeo() {
            setLoading( true );
            setError( null );
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

    if ( loading ) {
        return (
            <div style={ { display: 'flex', alignItems: 'center', gap: '8px', padding: '24px' } }>
                <Spinner />
                <span>{ __( 'Loading GEO analysis…', 'ai-seo-tool' ) }</span>
            </div>
        );
    }

    if ( error ) {
        return <Notice status="error" isDismissible={ false }>{ error }</Notice>;
    }

    if ( ! geo ) {
        return (
            <Notice status="info" isDismissible={ false }>
                { __( 'GEO analysis data not yet available.', 'ai-seo-tool' ) }
            </Notice>
        );
    }

    const score = geo.score?.overall_score || 0;
    const grade = geo.score?.grade || '';

    // Engine scores
    const engineScores = geo.score?.engine_scores || {};
    const engines = Object.entries( ENGINE_DISPLAY_NAMES ).map( ( [ key, name ] ) => ( {
        key,
        name,
        score: Math.round( engineScores[ key ]?.score || 0 ),
        focus: engineScores[ key ]?.focus || ENGINE_FOCUS[ key ] || '',
    } ) );

    // Suggestions — backend returns { critical: [...], important: [...], optional: [...] }
    const critical  = geo.suggestions?.critical  || [];
    const important = geo.suggestions?.important || [];
    const optional  = geo.suggestions?.optional  || [];
    const suggestions = [ ...critical, ...important, ...optional ];

    const geoData = geo.geo_data || geo;

    const subTabs = [
        { name: 'schema',     title: __( 'Schema',     'ai-seo-tool' ) },
        { name: 'content',    title: __( 'Content',    'ai-seo-tool' ) },
        { name: 'eeat',       title: __( 'E-E-A-T',    'ai-seo-tool' ) },
        { name: 'nlp',        title: __( 'NLP',        'ai-seo-tool' ) },
        { name: 'visibility', title: __( 'Visibility', 'ai-seo-tool' ) },
        { name: 'entity',     title: __( 'Entity',     'ai-seo-tool' ) },
        { name: 'pages',      title: __( 'Pages',      'ai-seo-tool' ) },
    ];

    return (
        <div>

            {/* Score ring + engine cards */}
            <Card style={ { marginBottom: '16px' } }>
                <CardBody style={ { padding: '24px' } }>
                    <div style={ { display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap', marginBottom: '24px' } }>
                        <div style={ { display: 'flex', flexDirection: 'column', alignItems: 'center' } }>
                            <GeoScoreRing score={ score } grade={ grade } size={ 120 } />
                            <div style={ { marginTop: '8px', fontSize: '12px', color: '#757575' } }>
                                { __( 'AI Citation Score', 'ai-seo-tool' ) }
                            </div>
                        </div>

                        {/* Engine score cards */}
                        <div style={ {
                            flex: 1,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                            gap: '12px',
                            minWidth: '0',
                        } }>
                            { engines.map( ( engine ) => (
                                <EngineScoreCard
                                    key={ engine.key }
                                    name={ engine.name }
                                    score={ engine.score }
                                    focus={ engine.focus }
                                />
                            ) ) }
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* 7 Sub-tabs */}
            <Card style={ { marginBottom: '16px' } }>
                <CardBody style={ { padding: '0' } }>
                    <TabPanel tabs={ subTabs }>
                        { ( tab ) => (
                            <div style={ { padding: '16px' } }>
                                <SubTabContent tab={ tab.name } geo={ geoData } />
                            </div>
                        ) }
                    </TabPanel>
                </CardBody>
            </Card>

            {/* Suggestions panel */}
            { suggestions.length > 0 && (
                <Card>
                    <CardBody style={ { padding: '16px' } }>
                        <h3 style={ { margin: '0 0 12px', fontSize: '13px', fontWeight: 600 } }>
                            { __( 'Recommendations', 'ai-seo-tool' ) }
                        </h3>
                        { [
                            { label: __( 'Critical', 'ai-seo-tool' ), items: critical, color: '#dc2626' },
                            { label: __( 'Important', 'ai-seo-tool' ), items: important, color: '#ca8a04' },
                            { label: __( 'Optional', 'ai-seo-tool' ), items: optional, color: '#757575' },
                        ].map( ( { label, items, color } ) =>
                            items.length > 0 && (
                                <details key={ label } style={ { marginBottom: '12px' } }>
                                    <summary style={ { cursor: 'pointer', fontSize: '13px', fontWeight: 600, color, marginBottom: '8px' } }>
                                        { label } ({ items.length })
                                    </summary>
                                    { items.map( ( s, i ) => (
                                        <details key={ i } style={ { marginLeft: '16px', marginBottom: '8px' } }>
                                            <summary style={ { cursor: 'pointer', fontSize: '13px' } }>
                                                { s.title || s.what || s.recommendation || `${ label } issue ${ i + 1 }` }
                                            </summary>
                                            <p style={ { marginTop: '8px', marginLeft: '16px', fontSize: '13px', color: '#757575' } }>
                                                { s.why || s.description || s.detail || '' }
                                            </p>
                                        </details>
                                    ) ) }
                                </details>
                            )
                        ) }
                    </CardBody>
                </Card>
            ) }
        </div>
    );
}

/** Renders content for each of the 7 sub-tabs. */
function SubTabContent( { tab, geo } ) {
    const schema     = geo?.schema_analysis     || geo?.schema      || {};
    const content    = geo?.content_analysis    || geo?.content     || {};
    const eeat       = geo?.eeat_analysis       || geo?.eeat        || {};
    const nlp        = geo?.nlp_analysis        || geo?.nlp         || {};
    const visibility = geo?.visibility_analysis || geo?.visibility  || {};
    const entity     = geo?.entity_analysis     || geo?.entity      || {};
    const pages      = geo?.page_scores         || geo?.pages       || [];

    switch ( tab ) {
        case 'schema':
            return (
                <div style={ { display: 'flex', flexDirection: 'column', gap: '12px' } }>
                    <ScoreBar label={ __( 'Schema Coverage', 'ai-seo-tool' ) } value={ schema.coverage_pct || 0 } suffix="%" />
                    <MetricRow label={ __( 'Formats Present', 'ai-seo-tool' ) } value={ ( schema.formats_present || [] ).join( ', ' ) || '—' } />
                    <TagList label={ __( 'Types Detected', 'ai-seo-tool' ) } tags={ ( schema.types_detected || [] ).slice( 0, 8 ) } color="#0d9488" />
                    <TagList label={ __( 'Missing Types', 'ai-seo-tool' ) } tags={ schema.missing_recommended || [] } color="#dc2626" empty={ __( 'None — great!', 'ai-seo-tool' ) } />
                </div>
            );

        case 'content':
            return (
                <div style={ { display: 'flex', flexDirection: 'column', gap: '12px' } }>
                    <MetricRow label={ __( 'Avg Word Count', 'ai-seo-tool' ) }          value={ Math.round( content.avg_word_count || 0 ) } highlight />
                    <MetricRow label={ __( 'Reading Level', 'ai-seo-tool' ) }           value={ content.reading_level || '—' } />
                    <MetricRow label={ __( 'Tone Score', 'ai-seo-tool' ) }              value={ content.tone_score || '—' } />
                    <div style={ { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } }>
                        <StatCard label={ __( 'FAQ Pages', 'ai-seo-tool' ) }            value={ content.faq_pages || 0 } icon="❓" />
                        <StatCard label={ __( 'Thin Pages', 'ai-seo-tool' ) }           value={ content.thin_pages || 0 } icon="📄" warn={ ( content.thin_pages || 0 ) > 0 } />
                    </div>
                </div>
            );

        case 'eeat':
            return (
                <div style={ { display: 'flex', flexDirection: 'column', gap: '12px' } }>
                    <ScoreBar label={ __( 'E-E-A-T Score', 'ai-seo-tool' ) } value={ eeat.score || 0 } suffix="/100" />
                    <MetricRow label={ __( 'Blog Cadence', 'ai-seo-tool' ) } value={ eeat.blog_cadence || '—' } />
                    <TagList label={ __( 'Trust Pages', 'ai-seo-tool' ) }       tags={ eeat.trust_pages_present || [] } color="#16a34a" empty={ __( 'None detected', 'ai-seo-tool' ) } />
                    <TagList label={ __( 'Expertise Signals', 'ai-seo-tool' ) } tags={ eeat.expertise_signals || [] }  color="#0d9488" empty={ __( 'None detected', 'ai-seo-tool' ) } />
                </div>
            );

        case 'nlp':
            return (
                <div style={ { display: 'flex', flexDirection: 'column', gap: '12px' } }>
                    <ReadinessTag label={ __( 'Snippet Readiness', 'ai-seo-tool' ) } value={ nlp.snippet_readiness } />
                    <MetricRow label={ __( 'Primary Intent', 'ai-seo-tool' ) }    value={ nlp.primary_intent || '—' } />
                    <MetricRow label={ __( 'Question Density', 'ai-seo-tool' ) }  value={ nlp.question_density || '—' } />
                    <MetricRow label={ __( 'Synonym Richness', 'ai-seo-tool' ) }  value={ nlp.synonym_richness || '—' } />
                    <ScoreBar  label={ __( 'Answer Quality', 'ai-seo-tool' ) }    value={ Math.round( nlp.answer_quality_score || 0 ) } suffix="/100" />
                </div>
            );

        case 'visibility': {
            const engines = Object.entries( visibility.engine_mention_rates || {} );
            return (
                <div style={ { display: 'flex', flexDirection: 'column', gap: '12px' } }>
                    <ReadinessTag label={ __( 'Visibility', 'ai-seo-tool' ) } value={ visibility.visibility_label } />
                    <ScoreBar label={ __( 'Overall Mention Rate', 'ai-seo-tool' ) } value={ Math.round( visibility.overall_mention_rate || 0 ) } suffix="%" />
                    { engines.length > 0 && (
                        <div style={ { display: 'flex', flexDirection: 'column', gap: '6px' } }>
                            { engines.map( ( [ engine, rate ] ) => (
                                <ScoreBar key={ engine } label={ ENGINE_DISPLAY_NAMES[ engine ] || engine } value={ Math.round( ( rate || 0 ) * 100 ) } suffix="%" small />
                            ) ) }
                        </div>
                    ) }
                </div>
            );
        }

        case 'entity':
            return (
                <div style={ { display: 'flex', flexDirection: 'column', gap: '12px' } }>
                    <ScoreBar label={ __( 'Entity Score', 'ai-seo-tool' ) } value={ entity.score || 0 } suffix="/100" />
                    <MetricRow label={ __( 'Establishment', 'ai-seo-tool' ) } value={ entity.establishment_label || '—' } highlight />
                    <MetricRow
                        label={ __( 'Wikipedia', 'ai-seo-tool' ) }
                        value={ entity.wikipedia_found ? __( '✅ Found', 'ai-seo-tool' ) : __( '❌ Not found', 'ai-seo-tool' ) }
                    />
                    <MetricRow label={ __( 'sameAs Profiles', 'ai-seo-tool' ) } value={ ( entity.same_as_profiles || [] ).length } />
                </div>
            );

        case 'pages': {
            const sorted = [ ...( Array.isArray( pages ) ? pages : [] ) ].sort( ( a, b ) => ( a.score || 0 ) - ( b.score || 0 ) );
            if ( sorted.length === 0 ) {
                return (
                    <p style={ { color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '24px 0' } }>
                        { __( 'No per-page scores available.', 'ai-seo-tool' ) }
                    </p>
                );
            }
            return (
                <div style={ { display: 'flex', flexDirection: 'column', gap: '6px' } }>
                    { sorted.slice( 0, 50 ).map( ( p, i ) => {
                        const s     = Math.round( p.score || 0 );
                        const color = s >= 80 ? '#16a34a' : s >= 65 ? '#ca8a04' : s >= 50 ? '#ea580c' : '#dc2626';
                        return (
                            <div key={ p.url || i } style={ {
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '10px 12px', background: '#f8fafc',
                                borderRadius: '8px', border: '1px solid #e2e8f0',
                            } }>
                                <span style={ {
                                    fontSize: '13px', fontWeight: 700, color,
                                    minWidth: '28px', textAlign: 'right',
                                } }>{ s }</span>
                                { p.grade && (
                                    <span style={ {
                                        width: '20px', height: '20px', borderRadius: '50%',
                                        background: color, color: '#fff',
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '10px', fontWeight: 700, flexShrink: 0,
                                    } }>{ p.grade }</span>
                                ) }
                                <span style={ { fontSize: '12px', color: '#374151', wordBreak: 'break-all', flex: 1 } }>
                                    { p.url || '—' }
                                </span>
                            </div>
                        );
                    } ) }
                </div>
            );
        }

        default:
            return null;
    }
}

// ── Design helpers ────────────────────────────────────────────────────────────

function ScoreBar( { label, value, suffix = '', small = false } ) {
    const pct   = Math.min( Math.max( value, 0 ), 100 );
    const color = pct >= 80 ? '#16a34a' : pct >= 65 ? '#ca8a04' : pct >= 50 ? '#ea580c' : '#dc2626';
    return (
        <div>
            <div style={ { display: 'flex', justifyContent: 'space-between', marginBottom: '5px' } }>
                <span style={ { fontSize: small ? '12px' : '13px', color: '#374151', fontWeight: 500 } }>{ label }</span>
                <span style={ { fontSize: small ? '12px' : '13px', fontWeight: 700, color } }>{ value }{ suffix }</span>
            </div>
            <div style={ { height: small ? '4px' : '6px', borderRadius: '9999px', background: '#e2e8f0', overflow: 'hidden' } }>
                <div style={ {
                    height: '100%', width: `${ pct }%`,
                    background: `linear-gradient(90deg, ${ color }99, ${ color })`,
                    borderRadius: '9999px', transition: 'width 0.6s ease',
                } } />
            </div>
        </div>
    );
}

function MetricRow( { label, value, highlight = false } ) {
    return (
        <div style={ {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '9px 12px', background: '#f8fafc',
            borderRadius: '8px', border: '1px solid #e2e8f0',
        } }>
            <span style={ { fontSize: '13px', color: '#6b7280' } }>{ label }</span>
            <span style={ { fontSize: '13px', fontWeight: highlight ? 700 : 600, color: '#1e293b' } }>{ value }</span>
        </div>
    );
}

function StatCard( { label, value, icon, warn = false } ) {
    return (
        <div style={ {
            padding: '12px', borderRadius: '10px', textAlign: 'center',
            background: warn ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${ warn ? '#fecaca' : '#bbf7d0' }`,
        } }>
            <div style={ { fontSize: '20px', marginBottom: '4px' } }>{ icon }</div>
            <div style={ { fontSize: '22px', fontWeight: 800, color: warn ? '#dc2626' : '#16a34a' } }>{ value }</div>
            <div style={ { fontSize: '11px', color: '#6b7280', marginTop: '2px' } }>{ label }</div>
        </div>
    );
}

function TagList( { label, tags, color, empty } ) {
    return (
        <div>
            <div style={ { fontSize: '12px', color: '#6b7280', fontWeight: 600, marginBottom: '6px' } }>{ label }</div>
            { tags.length === 0 ? (
                <span style={ { fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' } }>{ empty || '—' }</span>
            ) : (
                <div style={ { display: 'flex', flexWrap: 'wrap', gap: '6px' } }>
                    { tags.map( ( tag ) => (
                        <span key={ tag } style={ {
                            fontSize: '11px', fontWeight: 600, color,
                            background: color + '15',
                            border: `1px solid ${ color }33`,
                            borderRadius: '6px', padding: '3px 8px',
                        } }>{ tag }</span>
                    ) ) }
                </div>
            ) }
        </div>
    );
}

function ReadinessTag( { label, value } ) {
    if ( ! value ) return <MetricRow label={ label } value="—" />;
    const colorMap = { Excellent: '#16a34a', Good: '#0d9488', Fair: '#ca8a04', Poor: '#dc2626' };
    const bgMap    = { Excellent: '#f0fdf4', Good: '#f0fdfa', Fair: '#fefce8', Poor: '#fef2f2' };
    const color = colorMap[ value ] || '#6b7280';
    const bg    = bgMap[ value ]    || '#f8fafc';
    return (
        <div style={ {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 12px', background: bg, borderRadius: '8px',
            border: `1px solid ${ color }33`,
        } }>
            <span style={ { fontSize: '13px', color: '#6b7280' } }>{ label }</span>
            <span style={ { fontSize: '13px', fontWeight: 700, color } }>{ value }</span>
        </div>
    );
}

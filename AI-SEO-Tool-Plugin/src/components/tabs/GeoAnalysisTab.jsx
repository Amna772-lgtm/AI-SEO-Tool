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
            return <MetricList items={ [
                { label: __( 'Coverage', 'ai-seo-tool' ), value: `${ schema.coverage_pct || 0 }%` },
                { label: __( 'Formats Present', 'ai-seo-tool' ), value: ( schema.formats_present || [] ).join( ', ' ) || '—' },
                { label: __( 'Types Detected', 'ai-seo-tool' ), value: ( schema.types_detected || [] ).slice( 0, 5 ).join( ', ' ) || '—' },
                { label: __( 'Missing Types', 'ai-seo-tool' ), value: ( schema.missing_recommended || [] ).join( ', ' ) || __( 'None', 'ai-seo-tool' ) },
            ] } />;

        case 'content':
            return <MetricList items={ [
                { label: __( 'Avg Word Count', 'ai-seo-tool' ), value: Math.round( content.avg_word_count || 0 ) },
                { label: __( 'Reading Level', 'ai-seo-tool' ), value: content.reading_level || '—' },
                { label: __( 'FAQ Pages', 'ai-seo-tool' ), value: content.faq_pages || 0 },
                { label: __( 'Thin Pages (<300 words)', 'ai-seo-tool' ), value: content.thin_pages || 0 },
                { label: __( 'Tone Score', 'ai-seo-tool' ), value: content.tone_score || '—' },
            ] } />;

        case 'eeat':
            return <MetricList items={ [
                { label: __( 'E-E-A-T Score', 'ai-seo-tool' ), value: `${ eeat.score || 0 } / 100` },
                { label: __( 'Trust Pages', 'ai-seo-tool' ), value: ( eeat.trust_pages_present || [] ).join( ', ' ) || '—' },
                { label: __( 'Expertise Signals', 'ai-seo-tool' ), value: ( eeat.expertise_signals || [] ).join( ', ' ) || '—' },
                { label: __( 'Blog Cadence', 'ai-seo-tool' ), value: eeat.blog_cadence || '—' },
            ] } />;

        case 'nlp':
            return <MetricList items={ [
                { label: __( 'Snippet Readiness', 'ai-seo-tool' ), value: nlp.snippet_readiness || '—' },
                { label: __( 'Primary Intent', 'ai-seo-tool' ), value: nlp.primary_intent || '—' },
                { label: __( 'Question Density', 'ai-seo-tool' ), value: nlp.question_density || '—' },
                { label: __( 'Answer Quality Score', 'ai-seo-tool' ), value: Math.round( nlp.answer_quality_score || 0 ) },
                { label: __( 'Synonym Richness', 'ai-seo-tool' ), value: nlp.synonym_richness || '—' },
            ] } />;

        case 'visibility':
            return <MetricList items={ [
                { label: __( 'Overall Mention Rate', 'ai-seo-tool' ), value: `${ Math.round( visibility.overall_mention_rate || 0 ) }%` },
                { label: __( 'Visibility Label', 'ai-seo-tool' ), value: visibility.visibility_label || '—' },
                ...Object.entries( visibility.engine_mention_rates || {} ).map( ( [ engine, rate ] ) => ( {
                    label: ENGINE_DISPLAY_NAMES[ engine ] || engine,
                    value: `${ Math.round( rate * 100 ) }%`,
                } ) ),
            ] } />;

        case 'entity':
            return <MetricList items={ [
                { label: __( 'Entity Score', 'ai-seo-tool' ), value: `${ entity.score || 0 } / 100` },
                { label: __( 'Establishment', 'ai-seo-tool' ), value: entity.establishment_label || '—' },
                { label: __( 'Wikipedia', 'ai-seo-tool' ), value: entity.wikipedia_found ? __( 'Found', 'ai-seo-tool' ) : __( 'Not found', 'ai-seo-tool' ) },
                { label: __( 'sameAs Profiles', 'ai-seo-tool' ), value: ( entity.same_as_profiles || [] ).length },
            ] } />;

        case 'pages': {
            const sorted = [ ...( Array.isArray( pages ) ? pages : [] ) ].sort( ( a, b ) => ( a.score || 0 ) - ( b.score || 0 ) );
            if ( sorted.length === 0 ) {
                return <p style={ { color: '#757575', fontSize: '13px' } }>{ __( 'No per-page scores available.', 'ai-seo-tool' ) }</p>;
            }
            return (
                <div style={ { overflowX: 'auto' } }>
                    <table className="wp-list-table widefat fixed striped" style={ { marginBottom: 0 } }>
                        <thead>
                            <tr>
                                <th scope="col">{ __( 'URL', 'ai-seo-tool' ) }</th>
                                <th scope="col">{ __( 'Score', 'ai-seo-tool' ) }</th>
                                <th scope="col">{ __( 'Grade', 'ai-seo-tool' ) }</th>
                            </tr>
                        </thead>
                        <tbody>
                            { sorted.slice( 0, 50 ).map( ( p, i ) => (
                                <tr key={ p.url || i }>
                                    <td style={ { fontSize: '12px', wordBreak: 'break-all' } }>{ p.url || '—' }</td>
                                    <td>{ Math.round( p.score || 0 ) }</td>
                                    <td>{ p.grade || '—' }</td>
                                </tr>
                            ) ) }
                        </tbody>
                    </table>
                </div>
            );
        }

        default:
            return null;
    }
}

/** Simple metric list for sub-tab content. */
function MetricList( { items } ) {
    return (
        <dl style={ { margin: 0 } }>
            { items.map( ( { label, value } ) => (
                <div key={ label } style={ { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f1' } }>
                    <dt style={ { fontSize: '13px', color: '#757575' } }>{ label }</dt>
                    <dd style={ { fontSize: '13px', fontWeight: 600, margin: 0 } }>{ value }</dd>
                </div>
            ) ) }
        </dl>
    );
}

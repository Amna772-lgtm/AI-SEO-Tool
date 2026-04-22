/**
 * AI SEO Tool — Analysis Progress Bar
 * Shows progress bar with phase labels during analysis.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */
import { Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const PHASES = {
    pending:   { label: __( 'Crawling', 'ai-seo-tool' ),          pct: 33 },
    crawling:  { label: __( 'Crawling', 'ai-seo-tool' ),          pct: 33 },
    technical: { label: __( 'Technical Checks', 'ai-seo-tool' ),  pct: 66 },
    geo:       { label: __( 'GEO Analysis', 'ai-seo-tool' ),      pct: 90 },
    completed: { label: __( 'Complete', 'ai-seo-tool' ),          pct: 100 },
};

/**
 * @param {Object} props
 * @param {string} props.status - Job status from polling hook.
 */
export default function AnalysisProgress( { status } ) {
    const phase = PHASES[ status ] || PHASES.pending;

    return (
        <div style={ { padding: '16px 0' } }>
            <div style={ { fontSize: '13px', fontWeight: 600, marginBottom: '8px' } }>
                { phase.label }
            </div>
            <div
                role="progressbar"
                aria-valuenow={ phase.pct }
                aria-valuemin={ 0 }
                aria-valuemax={ 100 }
                aria-label={ __( 'Analysis progress', 'ai-seo-tool' ) }
                style={ {
                    height: '8px',
                    borderRadius: '4px',
                    backgroundColor: '#c3c4c7',
                    overflow: 'hidden',
                } }
            >
                <div
                    style={ {
                        height: '100%',
                        width: `${ phase.pct }%`,
                        backgroundColor: '#0d9488',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease',
                    } }
                />
            </div>
            <div style={ { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' } }>
                <Spinner />
                <span style={ { fontSize: '13px', color: '#757575' } }>
                    { phase.label }...
                </span>
            </div>
        </div>
    );
}

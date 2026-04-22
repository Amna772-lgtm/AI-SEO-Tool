/**
 * AI SEO Tool — EngineScoreCard
 * Displays per-engine AI citation score as a card with a progress bar.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */
import { Card, CardBody } from '@wordpress/components';
import { getScoreColor } from './GeoScoreRing';

/**
 * @param {Object} props
 * @param {string} props.name  - Engine name (e.g. "ChatGPT").
 * @param {number} props.score - Score 0-100.
 * @param {string} props.focus - Short focus description for this engine.
 */
export default function EngineScoreCard( { name, score, focus } ) {
    const color = getScoreColor( score || 0 );

    return (
        <Card>
            <CardBody style={ { padding: '12px' } }>
                {/* Engine name */}
                <div style={ { fontSize: '12px', fontWeight: 400, color: '#757575', marginBottom: '6px' } }>
                    { name }
                </div>

                {/* Score number */}
                <div style={ { fontSize: '13px', fontWeight: 600, color, marginBottom: '6px' } }>
                    { score || 0 }
                </div>

                {/* Progress bar */}
                <div style={ {
                    height: '6px',
                    borderRadius: '3px',
                    backgroundColor: '#c3c4c7',
                    overflow: 'hidden',
                    marginBottom: '8px',
                } }>
                    <div style={ {
                        height: '100%',
                        width: `${ score || 0 }%`,
                        backgroundColor: color,
                        borderRadius: '3px',
                        transition: 'width 0.4s ease',
                    } } />
                </div>

                {/* Focus description */}
                <div style={ { fontSize: '12px', fontWeight: 400, color: '#757575' } }>
                    { focus }
                </div>
            </CardBody>
        </Card>
    );
}

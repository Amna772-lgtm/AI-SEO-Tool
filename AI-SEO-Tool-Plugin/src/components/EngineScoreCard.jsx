/**
 * AI SEO Tool — EngineScoreCard
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */
import { getScoreColor } from './GeoScoreRing';

const ENGINE_ICONS = {
    ChatGPT:    '🤖',
    Perplexity: '🔍',
    Gemini:     '✨',
    Claude:     '🧠',
    Grok:       '⚡',
};

export default function EngineScoreCard( { name, score, focus } ) {
    const color = getScoreColor( score || 0 );
    const pct   = score || 0;

    const label = pct >= 80 ? 'Excellent' : pct >= 65 ? 'Good' : pct >= 50 ? 'Fair' : 'Poor';
    const bgMap = { Excellent: '#f0fdf4', Good: '#fefce8', Fair: '#fff7ed', Poor: '#fef2f2' };
    const borderMap = { Excellent: '#bbf7d0', Good: '#fde68a', Fair: '#fed7aa', Poor: '#fecaca' };

    return (
        <div style={ {
            background: bgMap[ label ],
            border: `1px solid ${ borderMap[ label ] }`,
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
        } }>
            {/* Engine name + icon */}
            <div style={ { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } }>
                <div style={ { display: 'flex', alignItems: 'center', gap: '6px' } }>
                    <span style={ { fontSize: '16px' } }>{ ENGINE_ICONS[ name ] || '🔎' }</span>
                    <span style={ { fontSize: '12px', fontWeight: 600, color: '#374151' } }>{ name }</span>
                </div>
                <span style={ {
                    fontSize: '10px', fontWeight: 700, color,
                    background: '#fff', borderRadius: '6px',
                    padding: '2px 6px', border: `1px solid ${ borderMap[ label ] }`,
                } }>
                    { label }
                </span>
            </div>

            {/* Score number */}
            <div style={ { display: 'flex', alignItems: 'baseline', gap: '4px' } }>
                <span style={ { fontSize: '28px', fontWeight: 800, color, lineHeight: 1 } }>{ pct }</span>
                <span style={ { fontSize: '12px', color: '#94a3b8', fontWeight: 500 } }>/100</span>
            </div>

            {/* Progress bar */}
            <div style={ { height: '6px', borderRadius: '9999px', background: 'rgba(0,0,0,0.08)', overflow: 'hidden' } }>
                <div style={ {
                    height: '100%',
                    width: `${ pct }%`,
                    borderRadius: '9999px',
                    background: `linear-gradient(90deg, ${ color }cc, ${ color })`,
                    transition: 'width 0.6s ease',
                } } />
            </div>

            {/* Focus description */}
            <div style={ { fontSize: '11px', color: '#6b7280', lineHeight: 1.4 } }>{ focus }</div>
        </div>
    );
}

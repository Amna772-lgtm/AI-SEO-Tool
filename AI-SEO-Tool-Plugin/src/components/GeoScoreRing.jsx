/**
 * AI SEO Tool — GeoScoreRing
 * Pure SVG score ring component re-implemented for the WordPress plugin.
 * Math identical to frontend/app/components/geo/GeoScoreRing.tsx.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */

/**
 * Returns the color for a given score value.
 *
 * @param {number} score 0-100
 * @returns {string} hex color
 */
export function getScoreColor( score ) {
    return score >= 80 ? '#16a34a'
        : score >= 65 ? '#ca8a04'
        : score >= 50 ? '#ea580c'
        : '#dc2626';
}

/**
 * @param {Object}  props
 * @param {number}  props.score  - Score value 0-100.
 * @param {number}  [props.size=120] - SVG size in px (default 120, smaller than main app's 140).
 * @param {string}  [props.grade] - Optional letter grade (A–F) to show below ring.
 */
export default function GeoScoreRing( { score, size = 120, grade } ) {
    const cx = size / 2;
    const cy = size / 2;
    const strokeWidth = 10;
    const r = ( size - strokeWidth ) / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * ( 1 - ( score || 0 ) / 100 );
    const color = getScoreColor( score || 0 );

    return (
        <div style={ { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' } }>
            <svg
                width={ size }
                height={ size }
                viewBox={ `0 0 ${ size } ${ size }` }
            >
                {/* Background track */}
                <circle
                    cx={ cx }
                    cy={ cy }
                    r={ r }
                    fill="none"
                    stroke="#c3c4c7"
                    strokeWidth={ strokeWidth }
                />
                {/* Score arc — rotated -90deg so it starts at top */}
                <circle
                    cx={ cx }
                    cy={ cy }
                    r={ r }
                    fill="none"
                    stroke={ color }
                    strokeWidth={ strokeWidth }
                    strokeLinecap="round"
                    strokeDasharray={ circumference }
                    strokeDashoffset={ offset }
                    transform={ `rotate(-90 ${ cx } ${ cy })` }
                    style={ { transition: 'stroke-dashoffset 0.8s ease' } }
                />
                {/* Score number — centered */}
                <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={ color }
                    fontSize={ size * 0.24 }
                    fontWeight="600"
                >
                    { score || 0 }
                </text>
                {/* Sub-text: "/ 100" */}
                <text
                    x="50%"
                    y="67%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#757575"
                    fontSize={ size * 0.1 }
                >
                    / 100
                </text>
            </svg>

            {/* Grade badge */}
            { grade && (
                <div style={ {
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: '600',
                } }>
                    { grade }
                </div>
            ) }
        </div>
    );
}

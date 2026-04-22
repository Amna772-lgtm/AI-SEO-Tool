/**
 * AI SEO Tool — PlanGate
 * Upgrade prompt shown to free plan users on gated tabs.
 *
 * @package AI_SEO_Tool
 * @license GPL-2.0-or-later
 */
import { Card, CardBody, Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * @param {Object} [props]
 * @param {string} [props.featureName] - Optional feature name override.
 */
export default function PlanGate( { featureName } ) {
    const handleUpgrade = () => {
        window.open( 'http://localhost:3000/select-plan', '_blank' );
    };

    return (
        <Card>
            <CardBody style={ { padding: '48px 24px', textAlign: 'center' } }>
                {/* Lock icon */}
                <span
                    className="dashicons dashicons-lock"
                    style={ { fontSize: '28px', color: '#d97706', display: 'block', marginBottom: '16px' } }
                />

                {/* Heading */}
                <h2 style={ { margin: '0 0 12px', fontSize: '16px', fontWeight: 600 } }>
                    { __( 'Pro Feature', 'ai-seo-tool' ) }
                </h2>

                {/* Body */}
                <p style={ { color: '#757575', margin: '0 0 24px', maxWidth: '360px', marginLeft: 'auto', marginRight: 'auto' } }>
                    { featureName
                        ? featureName
                        : __( 'This section is available on the Pro plan. Upgrade to access full GEO Analysis, Technical Audit details, and History trends.', 'ai-seo-tool' )
                    }
                </p>

                {/* Upgrade button */}
                <Button
                    variant="primary"
                    onClick={ handleUpgrade }
                    style={ { backgroundColor: '#0d9488', borderColor: '#0d9488' } }
                >
                    { __( 'Upgrade Plan', 'ai-seo-tool' ) }
                </Button>
            </CardBody>
        </Card>
    );
}

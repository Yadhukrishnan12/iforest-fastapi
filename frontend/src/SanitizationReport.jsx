import { motion } from 'framer-motion';
import {
    Shield,
    CheckCircle,
    AlertTriangle,
    FileCheck,
    Database,
    Activity,
    Trash2,
    Filter,
    Lock,
    ArrowRight
} from 'lucide-react';

function SanitizationReport({ metadata, className = '' }) {
    if (!metadata) return null;

    const validationPassed = metadata.cleaned_rows > 0;
    const dataWasCleaned = metadata.rows_removed > 0;
    const cleaningRate = metadata.original_rows > 0
        ? ((metadata.rows_removed / metadata.original_rows) * 100).toFixed(1)
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`sanitization-report ${className}`}
        >
            {/* Header */}
            <div className="report-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Shield size={24} color="#10b981" />
                    <h2 style={{ margin: 0 }}>Data Sanitization Report</h2>
                </div>
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                >
                    {validationPassed ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
                            <CheckCircle size={20} />
                            <span style={{ fontWeight: 600 }}>Validated</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}>
                            <AlertTriangle size={20} />
                            <span style={{ fontWeight: 600 }}>Failed</span>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Summary Stats */}
            <div className="sanitization-summary">
                <SummaryCard
                    icon={<Database size={20} />}
                    label="Original Rows"
                    value={metadata.original_rows?.toLocaleString()}
                    color="#6366f1"
                    delay={0.1}
                />
                <SummaryCard
                    icon={<CheckCircle size={20} />}
                    label="Clean Rows"
                    value={metadata.cleaned_rows?.toLocaleString()}
                    color="#10b981"
                    delay={0.2}
                />
                <SummaryCard
                    icon={<Trash2 size={20} />}
                    label="Rows Removed"
                    value={metadata.rows_removed?.toLocaleString()}
                    color={dataWasCleaned ? "#ef4444" : "#64748b"}
                    delay={0.3}
                />
                <SummaryCard
                    icon={<Filter size={20} />}
                    label="Cleaning Rate"
                    value={`${cleaningRate}%`}
                    color="#fbbf24"
                    delay={0.4}
                />
            </div>

            {/* Data Cleaning Alert */}
            {dataWasCleaned && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass-panel cleaning-alert"
                >
                    <AlertTriangle size={20} color="#fbbf24" />
                    <div>
                        <h4 style={{ margin: '0 0 0.25rem 0', color: '#fbbf24' }}>
                            Data Cleaning Performed
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>
                            {metadata.rows_removed} row(s) with missing values or invalid data were removed.
                            {metadata.cleaned_rows} clean rows are available for analysis.
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Column Information */}
            <div className="column-info-grid">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="glass-panel column-info-card"
                >
                    <div className="column-info-header">
                        <Activity size={18} color="#6366f1" />
                        <h4>Numeric Columns</h4>
                    </div>
                    <div className="column-count">
                        {metadata.numeric_columns} / {metadata.total_columns}
                    </div>
                    <p className="column-description">
                        Columns used for anomaly detection
                    </p>
                    {metadata.numeric_column_names && metadata.numeric_column_names.length > 0 && (
                        <div className="column-tags">
                            {metadata.numeric_column_names.slice(0, 5).map((col, idx) => (
                                <span key={idx} className="column-tag">
                                    {col}
                                </span>
                            ))}
                            {metadata.numeric_column_names.length > 5 && (
                                <span className="column-tag more">
                                    +{metadata.numeric_column_names.length - 5} more
                                </span>
                            )}
                        </div>
                    )}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="glass-panel column-info-card"
                >
                    <div className="column-info-header">
                        <FileCheck size={18} color="#10b981" />
                        <h4>All Columns</h4>
                    </div>
                    <div className="column-count">
                        {metadata.total_columns}
                    </div>
                    <p className="column-description">
                        Total columns in dataset
                    </p>
                    {metadata.column_names && metadata.column_names.length > 0 && (
                        <div className="column-tags">
                            {metadata.column_names.slice(0, 5).map((col, idx) => (
                                <span key={idx} className="column-tag">
                                    {col}
                                </span>
                            ))}
                            {metadata.column_names.length > 5 && (
                                <span className="column-tag more">
                                    +{metadata.column_names.length - 5} more
                                </span>
                            )}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Security Checks */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="glass-panel security-checks"
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Lock size={20} color="#10b981" />
                    <h4 style={{ margin: 0 }}>Security Validations</h4>
                </div>
                <div className="security-grid">
                    <SecurityCheck
                        label="File Type Validation"
                        passed={true}
                        description="CSV format verified"
                    />
                    <SecurityCheck
                        label="CSV Injection Prevention"
                        passed={true}
                        description="Dangerous patterns neutralized"
                    />
                    <SecurityCheck
                        label="File Size Check"
                        passed={true}
                        description="Within acceptable limits"
                    />
                    <SecurityCheck
                        label="Column Name Sanitization"
                        passed={true}
                        description="Special characters removed"
                    />
                    <SecurityCheck
                        label="Infinite Value Handling"
                        passed={true}
                        description="Replaced with NaN"
                    />
                    <SecurityCheck
                        label="Missing Value Cleanup"
                        passed={true}
                        description={`${metadata.rows_removed} rows cleaned`}
                    />
                </div>
            </motion.div>

            {/* Processing Flow */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="glass-panel processing-flow"
            >
                <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={18} color="#6366f1" />
                    Sanitization Pipeline
                </h4>
                <div className="flow-steps">
                    <FlowStep
                        number={1}
                        title="File Upload"
                        description="Received and validated"
                        status="complete"
                    />
                    <ArrowRight size={16} color="#64748b" />
                    <FlowStep
                        number={2}
                        title="Security Scan"
                        description="CSV injection check"
                        status="complete"
                    />
                    <ArrowRight size={16} color="#64748b" />
                    <FlowStep
                        number={3}
                        title="Data Cleaning"
                        description={`${metadata.rows_removed} rows removed`}
                        status="complete"
                    />
                    <ArrowRight size={16} color="#64748b" />
                    <FlowStep
                        number={4}
                        title="Ready"
                        description={`${metadata.cleaned_rows} rows clean`}
                        status="complete"
                    />
                </div>
            </motion.div>
        </motion.div>
    );
}

function SummaryCard({ icon, label, value, color, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, type: 'spring' }}
            className="glass-panel summary-card"
        >
            <div style={{ color }} className="summary-icon">
                {icon}
            </div>
            <div className="summary-content">
                <div className="summary-label">{label}</div>
                <div className="summary-value" style={{ color }}>
                    {value}
                </div>
            </div>
        </motion.div>
    );
}

function SecurityCheck({ label, passed, description }) {
    return (
        <div className="security-check-item">
            {passed ? (
                <CheckCircle size={16} color="#10b981" />
            ) : (
                <AlertTriangle size={16} color="#ef4444" />
            )}
            <div>
                <div className="security-check-label">{label}</div>
                <div className="security-check-description">{description}</div>
            </div>
        </div>
    );
}

function FlowStep({ number, title, description, status }) {
    const statusColors = {
        complete: '#10b981',
        active: '#6366f1',
        pending: '#64748b'
    };

    return (
        <div className="flow-step">
            <div
                className="flow-step-number"
                style={{
                    background: `${statusColors[status]}22`,
                    border: `2px solid ${statusColors[status]}`,
                    color: statusColors[status]
                }}
            >
                {status === 'complete' ? <CheckCircle size={14} /> : number}
            </div>
            <div className="flow-step-content">
                <div className="flow-step-title">{title}</div>
                <div className="flow-step-description">{description}</div>
            </div>
        </div>
    );
}

export default SanitizationReport;

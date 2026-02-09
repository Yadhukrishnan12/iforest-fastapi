import { useState, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload,
    FileText,
    AlertTriangle,
    Shield,
    RefreshCw,
    CheckCircle,
    FileCheck,
    Lock,
    Activity
} from 'lucide-react';

function SanitizationTest() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('drag-active');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('drag-active');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-active');
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type === 'text/csv') {
            setFile(droppedFile);
            setError(null);
        } else {
            setError('Please upload a valid CSV file.');
        }
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const testSanitization = async () => {
        if (!file) return;

        setLoading(true);
        setError(null);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('http://localhost:8000/detect', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setResult(response.data);
        } catch (err) {
            console.error(err);

            if (err.response && err.response.data && err.response.data.detail) {
                setError(err.response.data.detail);
            } else if (err.response && err.response.status === 413) {
                setError('File is too large. Maximum size is 200MB.');
            } else if (err.response && err.response.status === 400) {
                setError('Invalid file format or data. ' + (err.response.data?.detail || 'Ensure you have numeric columns.'));
            } else {
                setError('Failed to process file. Please ensure the backend is running.');
            }
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setFile(null);
        setResult(null);
        setError(null);
    };

    return (
        <div className="container">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <Shield size={48} color="#10b981" />
                    Data Sanitization Tester
                </h1>
                <p className="subtitle">Test CSV file validation, cleaning, and security checks</p>
            </motion.div>

            <AnimatePresence mode="wait">
                {!result ? (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="glass-panel"
                        style={{ maxWidth: '700px', margin: '0 auto', width: '100%', padding: '2rem' }}
                    >
                        {/* Upload Zone */}
                        <div
                            className="upload-zone"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept=".csv"
                                hidden
                            />
                            <div className="upload-info">
                                {file ? (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                        <FileText size={48} color="#6366f1" style={{ margin: '0 auto 1rem' }} />
                                        <h3>{file.name}</h3>
                                        <p>{formatFileSize(file.size)}</p>
                                    </motion.div>
                                ) : (
                                    <>
                                        <Upload size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
                                        <h3>Drop your CSV dataset here</h3>
                                        <p>or click to browse</p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Security Features Info */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            style={{ marginTop: '2rem' }}
                        >
                            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Lock size={18} color="#10b981" />
                                Security & Validation Checks
                            </h3>
                            <div className="security-grid">
                                <SecurityFeature
                                    icon={<FileCheck size={16} />}
                                    title="File Type Validation"
                                    description="Only CSV files accepted"
                                />
                                <SecurityFeature
                                    icon={<Shield size={16} />}
                                    title="CSV Injection Prevention"
                                    description="Neutralizes dangerous formulas"
                                />
                                <SecurityFeature
                                    icon={<Activity size={16} />}
                                    title="Data Cleaning"
                                    description="Removes invalid & missing data"
                                />
                                <SecurityFeature
                                    icon={<CheckCircle size={16} />}
                                    title="Column Sanitization"
                                    description="Cleans column names"
                                />
                            </div>
                        </motion.div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="error-message"
                                style={{
                                    color: '#ef4444',
                                    marginTop: '1.5rem',
                                    padding: '1rem',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: '0.5rem',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <AlertTriangle size={20} />
                                <div>
                                    <strong>Validation Failed</strong>
                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>{error}</p>
                                </div>
                            </motion.div>
                        )}

                        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                            <button
                                className="btn"
                                onClick={testSanitization}
                                disabled={!file || loading}
                                style={{ opacity: !file || loading ? 0.5 : 1 }}
                            >
                                {loading ? <div className="loader"></div> : (
                                    <>
                                        <Shield size={18} />
                                        Test Sanitization
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="results"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ maxWidth: '1000px', margin: '0 auto' }}
                    >
                        {/* Success Banner */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-panel"
                            style={{
                                padding: '1.5rem',
                                marginBottom: '2rem',
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem'
                            }}
                        >
                            <CheckCircle size={32} color="#10b981" />
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#10b981' }}>
                                    ✓ Sanitization Successful
                                </h2>
                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
                                    Your file passed all security checks and has been cleaned successfully
                                </p>
                            </div>
                            <button
                                className="btn btn-secondary"
                                onClick={reset}
                                style={{ marginLeft: 'auto' }}
                            >
                                <RefreshCw size={16} />
                                Test Another File
                            </button>
                        </motion.div>

                        {/* Detailed Results */}
                        <div className="glass-panel" style={{ padding: '2rem' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem' }}>Sanitization Details</h3>

                            {/* Metadata Grid */}
                            <div className="sanitization-summary">
                                <DetailCard
                                    label="Original Rows"
                                    value={result.metadata.original_rows?.toLocaleString()}
                                    icon={<FileText size={20} />}
                                    color="#6366f1"
                                />
                                <DetailCard
                                    label="Clean Rows"
                                    value={result.metadata.cleaned_rows?.toLocaleString()}
                                    icon={<CheckCircle size={20} />}
                                    color="#10b981"
                                />
                                <DetailCard
                                    label="Rows Removed"
                                    value={result.metadata.rows_removed?.toLocaleString()}
                                    icon={<AlertTriangle size={20} />}
                                    color={result.metadata.rows_removed > 0 ? "#ef4444" : "#64748b"}
                                />
                                <DetailCard
                                    label="Total Columns"
                                    value={result.metadata.total_columns}
                                    icon={<Activity size={20} />}
                                    color="#fbbf24"
                                />
                                <DetailCard
                                    label="Numeric Columns"
                                    value={result.metadata.numeric_columns}
                                    icon={<BarChart2 size={20} />}
                                    color="#8b5cf6"
                                />
                            </div>

                            {/* Column Names */}
                            {result.metadata.numeric_column_names && result.metadata.numeric_column_names.length > 0 && (
                                <div style={{ marginTop: '2rem' }}>
                                    <h4 style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Numeric Columns Detected
                                    </h4>
                                    <div className="column-tags">
                                        {result.metadata.numeric_column_names.map((col, idx) => (
                                            <span key={idx} className="column-tag">
                                                {col}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* All Columns */}
                            {result.metadata.column_names && result.metadata.column_names.length > 0 && (
                                <div style={{ marginTop: '1.5rem' }}>
                                    <h4 style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        All Columns (Sanitized)
                                    </h4>
                                    <div className="column-tags">
                                        {result.metadata.column_names.map((col, idx) => (
                                            <span key={idx} className="column-tag" style={{
                                                background: result.metadata.numeric_column_names?.includes(col)
                                                    ? 'rgba(99, 102, 241, 0.1)'
                                                    : 'rgba(255, 255, 255, 0.05)',
                                                borderColor: result.metadata.numeric_column_names?.includes(col)
                                                    ? 'rgba(99, 102, 241, 0.3)'
                                                    : 'var(--glass-border)',
                                                color: result.metadata.numeric_column_names?.includes(col)
                                                    ? '#818cf8'
                                                    : '#94a3b8'
                                            }}>
                                                {col}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Data Quality Warning */}
                            {result.metadata.rows_removed > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    style={{
                                        marginTop: '1.5rem',
                                        padding: '1rem',
                                        background: 'rgba(251, 191, 36, 0.1)',
                                        border: '1px solid rgba(251, 191, 36, 0.3)',
                                        borderRadius: '0.5rem',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '0.75rem'
                                    }}
                                >
                                    <AlertTriangle size={20} color="#fbbf24" />
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '0.875rem', color: '#fbbf24' }}>
                                            Data Cleaning Applied
                                        </h4>
                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
                                            {result.metadata.rows_removed} row(s) contained missing values or invalid data and were removed.
                                            {result.metadata.cleaned_rows} clean rows remain for analysis.
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Security Checks */}
                            <div style={{ marginTop: '2rem' }}>
                                <h4 style={{
                                    fontSize: '0.875rem',
                                    color: '#94a3b8',
                                    marginBottom: '1rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <Lock size={16} color="#10b981" />
                                    Security Validations Passed
                                </h4>
                                <div className="security-grid">
                                    <SecurityCheck
                                        title="File Type"
                                        description="CSV format verified"
                                        passed={true}
                                    />
                                    <SecurityCheck
                                        title="CSV Injection"
                                        description="Dangerous patterns neutralized"
                                        passed={true}
                                    />
                                    <SecurityCheck
                                        title="File Size"
                                        description="Within limits"
                                        passed={true}
                                    />
                                    <SecurityCheck
                                        title="Column Names"
                                        description="Sanitized successfully"
                                        passed={true}
                                    />
                                    <SecurityCheck
                                        title="Infinite Values"
                                        description="Replaced with NaN"
                                        passed={true}
                                    />
                                    <SecurityCheck
                                        title="Missing Values"
                                        description="Cleaned"
                                        passed={true}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function DetailCard({ label, value, icon, color }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
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

function SecurityFeature({ icon, title, description }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '0.75rem',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '0.5rem',
            border: '1px solid var(--glass-border)'
        }}>
            <div style={{ color: '#10b981', marginTop: '0.125rem' }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.125rem' }}>
                    {title}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {description}
                </div>
            </div>
        </div>
    );
}

function SecurityCheck({ title, description, passed }) {
    return (
        <div className="security-check-item">
            {passed ? (
                <CheckCircle size={16} color="#10b981" />
            ) : (
                <AlertTriangle size={16} color="#ef4444" />
            )}
            <div>
                <div className="security-check-label">{title}</div>
                <div className="security-check-description">{description}</div>
            </div>
        </div>
    );
}

export default SanitizationTest;

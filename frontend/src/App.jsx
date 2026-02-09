import { useState, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, AlertTriangle, RefreshCw } from 'lucide-react';
import SanitizationReport from './SanitizationReport';

function App() {
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

  const handleUpload = async () => {
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
      console.log('API response:', response.data);
      setResult(response.data);
    } catch (err) {
      console.error(err);

      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else if (err.response && err.response.status === 413) {
        setError('File is too large. Maximum size is 200MB. Try reducing your dataset size.');
      } else if (err.response && err.response.status === 400) {
        setError('Invalid file format or data. Ensure you have numeric columns in your CSV.');
      } else {
        setError('Failed to process file. Please ensure the backend is running and the file is valid.');
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
        <h1>Anomaly Detection</h1>
        <p className="subtitle">Isolation Forest powered outlier detection for your datasets.</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-panel"
            style={{ maxWidth: '600px', margin: '0 auto', width: '100%', padding: '2rem' }}
          >
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
                    {file.size > 50 * 1024 * 1024 && (
                      <p style={{ fontSize: '0.875rem', color: '#fbbf24', marginTop: '0.5rem' }}>
                        ⚡ Large file - processing may take 30-60 seconds
                      </p>
                    )}
                  </motion.div>
                ) : (
                  <>
                    <Upload size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
                    <h3>Drop your CSV dataset here</h3>
                    <p>or click to browse</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                      Max size: 200MB • Max rows: 1,000,000
                    </p>
                  </>
                )}
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="error-message"
                style={{ color: '#ef4444', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
              >
                <AlertTriangle size={16} />
                {error}
              </motion.div>
            )}

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <button
                className="btn"
                onClick={handleUpload}
                disabled={!file || loading}
                style={{ opacity: !file || loading ? 0.5 : 1 }}
              >
                {loading ? <div className="loader"></div> : 'Analyze Dataset'}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="results-container"
          >
            <div className="stats-grid">
              <div className="glass-panel stat-card">
                <span className="stat-label">Total Rows</span>
                <span className="stat-value">{result.total_rows}</span>
              </div>
              <div className="glass-panel stat-card">
                <span className="stat-label">Anomalies Found</span>
                <span className="stat-value danger">{result.anomalies_found}</span>
              </div>
              <div className="glass-panel stat-card">
                <span className="stat-label">Contamination</span>
                <span className="stat-value highlight">
                  {result.metadata?.contamination_rate
                    ? result.metadata.contamination_rate + '%'
                    : ((result.anomalies_found / result.total_rows) * 100).toFixed(1) + '%'}
                </span>
              </div>
            </div>

            {/* Sanitization Report */}
            {result.metadata && (
              <SanitizationReport metadata={result.metadata} />
            )}

            {/* Data Quality Metadata */}
            {result.metadata && result.metadata.rows_removed > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel"
                style={{ padding: '1rem', marginBottom: '1.5rem', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)' }}
              >
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={16} />
                  <strong>Data Cleaning:</strong> {result.metadata.rows_removed} row(s) removed
                  (had missing values or invalid data). {result.metadata.cleaned_rows} clean rows analyzed.
                </p>
              </motion.div>
            )}

            <div className="glass-panel" style={{ padding: '0' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={20} color="#ef4444" />
                  Detected Anomalies
                </h3>
                <button className="btn btn-secondary" onClick={reset}>
                  <RefreshCw size={16} /> Analyze New File
                </button>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      {result.anomalies.length > 0 && Object.keys(result.anomalies[0])
                        .filter(k => k !== 'anomaly' && k !== 'score' && k !== 'explanation').map(key => (
                          <th key={key}>{key}</th>
                        ))}
                      <th>Anomaly Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.anomalies.slice(0, 100).map((row, idx) => (
                      <tr key={idx}>
                        {Object.entries(row).filter(([k]) => k !== 'anomaly' && k !== 'score' && k !== 'explanation').map(([key, val], i) => (
                          <td key={i}>{typeof val === 'number' ? val.toFixed(4) : val}</td>
                        ))}
                        <td>
                          <span className="score-badge">
                            {row.score.toFixed(4)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.anomalies.length > 100 && (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                  Showing top 100 anomalies out of {result.anomalies_found}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
import {
  ShieldAlert,
  TriangleAlert,
  Activity,
  Siren,
  FileSpreadsheet,
  BrainCircuit,
  Gauge,
} from 'lucide-react';

const DETECTOR_LABELS = {
  iforest: 'Isolation Forest (Numeric)',
  ae_numeric: 'Autoencoder (Numeric)',
  ae_categorical: 'Autoencoder (Categorical)',
};

const RISK_BANDS = [
  { label: 'Low', max: 24, color: '#10b981' },
  { label: 'Guarded', max: 49, color: '#f59e0b' },
  { label: 'Elevated', max: 74, color: '#fb923c' },
  { label: 'Critical', max: 100, color: '#ef4444' },
];

function safeNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function percent(part, total) {
  if (!total) return 0;
  return (part / total) * 100;
}

function getSeverityDistribution(anomalies) {
  const scores = anomalies
    .map((a) => safeNum(a.score, NaN))
    .filter((x) => Number.isFinite(x));

  if (scores.length === 0) {
    return { low: 0, medium: 0, high: 0, maxScore: 0, avgScore: 0 };
  }

  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length;
  const range = maxScore - minScore;

  const bucket = { low: 0, medium: 0, high: 0 };
  for (const score of scores) {
    const normalized = range === 0 ? 1 : (score - minScore) / range;
    if (normalized >= 0.66) bucket.high += 1;
    else if (normalized >= 0.33) bucket.medium += 1;
    else bucket.low += 1;
  }

  return { ...bucket, maxScore, avgScore };
}

function getTopIndicators(anomalies) {
  const aggregate = new Map();

  const addFeature = (name, rawValue) => {
    const absValue = Math.abs(safeNum(rawValue, 0));
    if (!name || !Number.isFinite(absValue)) return;
    const current = aggregate.get(name) || { feature: name, weight: 0, hits: 0 };
    current.weight += absValue;
    current.hits += 1;
    aggregate.set(name, current);
  };

  anomalies.forEach((row) => {
    if (Array.isArray(row.per_feature) && row.per_feature.length > 0) {
      row.per_feature.slice(0, 6).forEach((f) => addFeature(f.feature, f.recon_error ?? f.loss ?? 0));
      return;
    }

    if (Array.isArray(row.explanation)) {
      row.explanation.slice(0, 6).forEach((f) => addFeature(f.feature, f.shap_value ?? 0));
      return;
    }

    if (row.explanation && Array.isArray(row.explanation.features)) {
      row.explanation.features.slice(0, 6).forEach((f) => addFeature(f.feature, f.shap_value ?? 0));
      return;
    }

    if (row.explanation && typeof row.explanation === 'object') {
      Object.entries(row.explanation)
        .slice(0, 6)
        .forEach(([feature, value]) => addFeature(feature, value));
    }
  });

  return [...aggregate.values()]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);
}

function getRiskLevel(anomalyRate, highSeverityPct) {
  const score = Math.max(
    0,
    Math.min(100, Math.round(anomalyRate * 6 + highSeverityPct * 0.4))
  );
  const band = RISK_BANDS.find((b) => score <= b.max) || RISK_BANDS[RISK_BANDS.length - 1];
  return { score, label: band.label, color: band.color };
}

function ThreatIntelligenceDashboard({
  result,
  detector,
  fileName,
  analyzedAt,
  downloadingCleaned,
  onDownloadCleaned,
}) {
  const anomalies = Array.isArray(result?.anomalies) ? result.anomalies : [];
  const totalRows = safeNum(result?.total_rows, 0);
  const anomaliesFound = safeNum(result?.anomalies_found, anomalies.length);
  const anomalyRate = percent(anomaliesFound, totalRows);
  const metaContamination = safeNum(result?.metadata?.contamination_rate, NaN);
  const contamination = Number.isFinite(metaContamination) ? metaContamination : anomalyRate;
  const featureCount = Array.isArray(result?.metadata?.features_used)
    ? result.metadata.features_used.length
    : 0;

  const severity = getSeverityDistribution(anomalies);
  const highSeverityPct = percent(severity.high, anomaliesFound);
  const risk = getRiskLevel(anomalyRate, highSeverityPct);
  const indicators = getTopIndicators(anomalies);
  const peakIndicator = indicators.length > 0 ? indicators[0].feature : 'N/A';
  const topWeight = indicators.length > 0 ? indicators[0].weight : 1;

  return (
    <div className="threat-dashboard">
      <div className="glass-panel threat-hero">
        <div>
          <p className="threat-eyebrow">Threat Intelligence Dashboard</p>
          <h2>Operational Threat Posture</h2>
          <p className="threat-subtext">
            Unified view of anomaly volume, severity trend, and primary risk indicators.
          </p>
        </div>
        <div className="risk-chip" style={{ borderColor: `${risk.color}66` }}>
          <Gauge size={16} color={risk.color} />
          <span style={{ color: risk.color, fontWeight: 700 }}>{risk.label}</span>
          <strong>{risk.score}/100</strong>
        </div>
      </div>

      <div className="threat-kpi-grid">
        <KpiCard icon={<Activity size={18} />} label="Rows Analyzed" value={totalRows.toLocaleString()} />
        <KpiCard icon={<TriangleAlert size={18} />} label="Anomalies" value={anomaliesFound.toLocaleString()} accent="danger" />
        <KpiCard icon={<Siren size={18} />} label="Anomaly Rate" value={`${anomalyRate.toFixed(2)}%`} accent="warn" />
        <KpiCard icon={<ShieldAlert size={18} />} label="High Severity" value={`${highSeverityPct.toFixed(1)}%`} accent="danger" />
      </div>

      <div className="threat-detail-grid">
        <div className="glass-panel threat-panel">
          <h3>Severity Distribution</h3>
          <SeverityRow label="High" count={severity.high} total={anomaliesFound} color="#ef4444" />
          <SeverityRow label="Medium" count={severity.medium} total={anomaliesFound} color="#f59e0b" />
          <SeverityRow label="Low" count={severity.low} total={anomaliesFound} color="#10b981" />
          <div className="threat-metrics-inline">
            <span>Peak Score: {severity.maxScore.toFixed(4)}</span>
            <span>Average Score: {severity.avgScore.toFixed(4)}</span>
          </div>
        </div>

        <div className="glass-panel threat-panel">
          <h3>Top Threat Indicators</h3>
          {indicators.length === 0 && (
            <p className="threat-empty">No feature-level explanation data was returned by the model.</p>
          )}
          {indicators.map((item) => (
            <div key={item.feature} className="indicator-row">
              <div className="indicator-head">
                <span>{item.feature}</span>
                <span>{item.weight.toFixed(4)}</span>
              </div>
              <div className="indicator-track">
                <div
                  className="indicator-fill"
                  style={{ width: `${Math.max(6, (item.weight / topWeight) * 100)}%` }}
                />
              </div>
              <small>{item.hits} correlated anomalies</small>
            </div>
          ))}
        </div>

        <div className="glass-panel threat-panel">
          <h3>Run Context</h3>
          <ContextRow icon={<BrainCircuit size={16} />} label="Model" value={DETECTOR_LABELS[detector] || detector} />
          <ContextRow icon={<FileSpreadsheet size={16} />} label="Dataset" value={fileName || 'Uploaded CSV'} />
          <ContextRow icon={<Activity size={16} />} label="Feature Count" value={featureCount.toString()} />
          <ContextRow icon={<Gauge size={16} />} label="Contamination" value={`${contamination.toFixed(2)}%`} />
          <ContextRow icon={<ShieldAlert size={16} />} label="Top Indicator" value={peakIndicator} />
          <ContextRow icon={<Siren size={16} />} label="Analyzed At" value={analyzedAt} />
          <button
            className="btn btn-secondary"
            onClick={onDownloadCleaned}
            disabled={downloadingCleaned}
            style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}
          >
            {downloadingCleaned ? <div className="loader"></div> : 'Download Cleaned CSV'}
          </button>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, accent }) {
  return (
    <div className={`glass-panel threat-kpi-card ${accent ? `kpi-${accent}` : ''}`}>
      <div className="kpi-label">{icon}{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}

function SeverityRow({ label, count, total, color }) {
  const width = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="severity-row">
      <div className="severity-head">
        <span>{label}</span>
        <span>{count}</span>
      </div>
      <div className="severity-track">
        <div className="severity-fill" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function ContextRow({ icon, label, value }) {
  return (
    <div className="context-row">
      <span className="context-label">{icon}{label}</span>
      <strong className="context-value" title={value}>{value}</strong>
    </div>
  );
}

export default ThreatIntelligenceDashboard;

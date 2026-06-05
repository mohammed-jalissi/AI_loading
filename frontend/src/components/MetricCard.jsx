export default function MetricCard({ label, value, unit, variant }) {
  const cls = variant === 'warning' ? 'warning' : variant === 'danger' ? 'danger' : '';
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${cls}`}>
        {value}
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
    </div>
  );
}

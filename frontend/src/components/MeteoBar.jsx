export default function MeteoBar({ vector = [], horizon = 48 }) {
  const okCount = vector.filter(v => v === 1).length;
  const status = okCount === vector.length ? 'OK' : `${Math.round(okCount/vector.length*100)}%`;

  return (
    <div className="meteo-bar">
      <span className="meteo-label">WEATHER_TELEMETRY // {horizon}H</span>
      {vector.slice(0, Math.min(horizon, 48)).map((v, i) => (
        <div key={i} className={`meteo-cell ${v === 1 ? 'ok' : 'bad'}`}
             title={`${String((7 + i) % 24).padStart(2, '0')}h`} />
      ))}
      <span className="meteo-status">{status}</span>
    </div>
  );
}

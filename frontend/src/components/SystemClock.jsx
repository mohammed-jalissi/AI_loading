import { useState, useEffect } from 'react';

export default function SystemClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 100);
    return () => clearInterval(timer);
  }, []);

  const h = String(time.getHours()).padStart(2, '0');
  const m = String(time.getMinutes()).padStart(2, '0');
  const s = String(time.getSeconds()).padStart(2, '0');
  const ms = String(Math.floor(time.getMilliseconds() / 10)).padStart(2, '0');

  return (
    <div className="sys-time">
      <div className="label">SYS_TIME</div>
      <div>
        <span className="clock">{h}:{m}:{s}</span>
        <span className="clock-ms">.{ms}Z</span>
      </div>
    </div>
  );
}

'use client';

// Local time in the studio's city. Renders a placeholder on the server, so there's no hydration mismatch.
import { useEffect, useState } from 'react';
import { SITE } from '@/lib/works';

const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: SITE.timeZone, hour: '2-digit', minute: '2-digit' });

export default function Clock() {
  const [time, setTime] = useState('--:--');
  useEffect(() => {
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, []);
  return <span className="tnum">{time}</span>;
}

import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { todayIn } from '../../core/calendarDate';
import type { CalendarDate } from '../../core/types';

/**
 * "Today" in the picker's zone, moved to the next day at local midnight while the
 * picker stays open. `now` lets tests and screens pin the clock.
 */
export const useTodayTick = (zone: string, now?: () => Date): CalendarDate => {
  const read = () => todayIn(zone, now?.() ?? new Date());
  const [today, setToday] = useState<CalendarDate>(read);

  useEffect(() => {
    setToday(read());
    const current = DateTime.fromJSDate(now?.() ?? new Date()).setZone(zone);
    const msToMidnight = Math.max(
      1000,
      current.endOf('day').diff(current).as('milliseconds') + 1
    );
    const timer = setTimeout(() => setToday(read()), msToMidnight);
    // Under Node (e.g. Jest) this long timer must not keep the process alive;
    // React Native's timers have no unref, so nothing changes in an app.
    (timer as { unref?: () => void }).unref?.();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-armed only when the day or the zone changes
  }, [zone, today.year, today.month, today.day]);

  return today;
};

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { isSameDay } from '../../core/calendarDate';
import type { Constraints } from '../../core/constraints';
import type { Draft, DraftTarget } from '../../core/draft';
import type { TimeEntryIssue } from '../../core/timeEntry';
import type { CalendarDate, Time, TimeFormat } from '../../core/types';
import type { RangeEnd } from '../field/RangeFields';
import { formatDateText } from '../field/fieldText';
import type { PickerStrings } from '../theme/defaultStrings';
import type { PickerStyles } from '../theme/styleKeys';
import type { ThemeTokens } from '../theme/tokens';
import TimeRow from './TimeRow';

/** Times typed before their day is picked, per end ('shared' lives in the draft). */
export type PendingTimes = Partial<Record<'single' | RangeEnd, Time | null>>;

interface Props {
  draft: Draft;
  setTime: (time: Time, target: DraftTarget) => void;
  pending: PendingTimes;
  setPending: (key: 'single' | RangeEnd, time: Time) => void;
  onEdit: () => void;
  rangeLayout: 'singleField' | 'fromTo';
  activeEnd: RangeEnd;
  multipleTimeMode: 'shared' | 'perDate';
  /** perDate: the selected day whose time the row edits. */
  activeDay: CalendarDate | null;
  constraints: Constraints;
  input: 'typed' | 'wheel';
  timeFormat: TimeFormat;
  minuteStep: number;
  dateFormat: string;
  disabled?: boolean;
  onIssueChange: (issue: TimeEntryIssue | null) => void;
  /** See `TimeRow.issueCheck`. */
  issueCheck?: number;
  onSpinChange: (spinning: boolean) => void;
  /** A row's box gained or lost focus. */
  onFocusChange?: (rowKey: string, focused: boolean) => void;
  /** A row's time that is typed but not saved yet (null once saved or gone). */
  onPendingChange?: (
    rowKey: string,
    target: DraftTarget,
    time: Time | null
  ) => void;
  tokens: ThemeTokens;
  styles?: PickerStyles;
  strings: PickerStrings;
  testID?: string;
}

interface RowSpec {
  key: string;
  label: string;
  time: Time | null;
  day: CalendarDate | null;
  target: DraftTarget;
  onTime: (time: Time) => void;
}

/**
 * The time rows for a date-time picker: one for a single value; start and end
 * for a range ('fromTo' shows the end being edited); one shared row, or one for
 * the active day, for multiple dates.
 */
const TimeRows: React.FC<Props> = (props) => {
  const {
    draft,
    setTime,
    pending,
    setPending,
    onEdit,
    rangeLayout,
    activeEnd,
    multipleTimeMode,
    activeDay,
    constraints,
    input,
    timeFormat,
    minuteStep,
    dateFormat,
    disabled,
    onIssueChange,
    issueCheck,
    onSpinChange,
    onFocusChange,
    onPendingChange,
    tokens,
    styles,
    strings,
    testID,
  } = props;

  const slotRow = (
    key: 'single' | RangeEnd,
    label: string,
    value: { date: CalendarDate; time: Time | null } | null
  ): RowSpec => {
    return {
      key,
      label,
      time: value?.time ?? pending[key] ?? null,
      day: value?.date ?? null,
      target: key,
      onTime: (time) => {
        onEdit();
        if (value) setTime(time, key);
        else setPending(key, time);
      },
    };
  };

  let rows: RowSpec[] = [];
  if (draft.mode === 'single') {
    rows = [slotRow('single', strings.time, draft.slot.value)];
  } else if (draft.mode === 'range') {
    const fromRow = slotRow('from', strings.startTime, draft.from.value);
    const toRow = slotRow('to', strings.endTime, draft.to.value);
    if (rangeLayout === 'fromTo')
      rows = [activeEnd === 'from' ? fromRow : toRow];
    else rows = [fromRow, toRow];
  } else if (multipleTimeMode === 'shared') {
    rows = [
      {
        key: 'shared',
        label: strings.time,
        time: draft.sharedTime,
        day: null,
        target: 'shared',
        onTime: (time) => {
          onEdit();
          setTime(time, 'shared');
        },
      },
    ];
  } else {
    const index = draft.slots.findIndex((s) =>
      isSameDay(s.value?.date, activeDay)
    );
    const slot = draft.slots[index]?.value;
    if (slot) {
      rows = [
        {
          key: `day-${slot.date.year}-${slot.date.month}-${slot.date.day}`,
          label: `${strings.time} · ${formatDateText(slot, dateFormat)}`,
          time: slot.time,
          day: slot.date,
          target: { day: slot.date },
          onTime: (time) => {
            onEdit();
            setTime(time, { day: slot.date });
          },
        },
      ];
    }
  }

  // Confirm waits for every row: the first problem (or a spinning wheel) blocks it.
  const [issues, setIssues] = useState<Record<string, TimeEntryIssue | null>>(
    {}
  );
  const [spinning, setSpinning] = useState<Record<string, boolean>>({});
  const issueSetters = useMemo(
    () => new Map<string, (i: TimeEntryIssue | null) => void>(),
    []
  );
  const spinSetters = useMemo(
    () => new Map<string, (on: boolean) => void>(),
    []
  );
  const issueFor = useCallback(
    (key: string) => {
      if (!issueSetters.has(key))
        issueSetters.set(key, (issue) =>
          setIssues((prev) =>
            prev[key] === issue ? prev : { ...prev, [key]: issue }
          )
        );
      return issueSetters.get(key)!;
    },
    [issueSetters]
  );
  const spinFor = useCallback(
    (key: string) => {
      if (!spinSetters.has(key))
        spinSetters.set(key, (on) =>
          setSpinning((prev) =>
            prev[key] === on ? prev : { ...prev, [key]: on }
          )
        );
      return spinSetters.get(key)!;
    },
    [spinSetters]
  );

  const firstIssue = Object.values(issues).find(Boolean) ?? null;
  const anySpinning = Object.values(spinning).some(Boolean);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reports changes only; the callback may be a new function on every render
  useEffect(() => onIssueChange(firstIssue), [firstIssue]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reports changes only; the callback may be a new function on every render
  useEffect(() => onSpinChange(anySpinning), [anySpinning]);

  const single = rows.length === 1;
  return (
    <>
      {rows.map((row) => (
        <TimeRow
          key={row.key}
          time={row.time}
          onTime={row.onTime}
          onIssueChange={issueFor(row.key)}
          issueCheck={issueCheck}
          onSpinChange={spinFor(row.key)}
          onFocusChange={(f) => onFocusChange?.(row.key, f)}
          onPendingChange={(t) => onPendingChange?.(row.key, row.target, t)}
          input={input}
          timeFormat={timeFormat}
          minuteStep={minuteStep}
          bounds={row.day ? constraints.timeBounds(row.day) : null}
          label={row.label}
          disabled={disabled}
          tokens={tokens}
          styles={styles}
          strings={strings}
          testID={
            testID
              ? single
                ? `${testID}-time`
                : `${testID}-time-${row.key}`
              : undefined
          }
        />
      ))}
    </>
  );
};

export default TimeRows;

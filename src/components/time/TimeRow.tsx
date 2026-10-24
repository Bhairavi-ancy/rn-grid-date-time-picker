import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { TextInputRef } from '../nativeTypes';
import type { TimeBounds } from '../../core/constraints';
import type { Period } from '../../core/segments';
import {
  checkTime,
  cleanBoxText,
  completeTimeEntry,
  formatTimeEntry,
  type TimeEntryIssue,
  type TimeEntryValues,
  type TimeKey,
} from '../../core/timeEntry';
import type { Time, TimeFormat } from '../../core/types';
import FieldMessages from '../field/FieldMessages';
import type { PickerStrings } from '../theme/defaultStrings';
import type { PickerStyles } from '../theme/styleKeys';
import type { ThemeTokens } from '../theme/tokens';
import { buildTimeStyles } from './timeStyles';
import TypedTime from './TypedTime';
import TimeWheel from './Wheel';

export interface TimeRowProps {
  /** The draft's time for this slot (or the time typed before a day was picked). */
  time: Time | null;
  /** A time was saved (focus left a box). It may still be off-step or outside the limits. */
  onTime: (time: Time) => void;
  /**
   * The time the boxes would save right now, while it isn't saved yet (a box is
   * still focused); null once saved. The picker uses it so Confirm can save a
   * time that is still being typed.
   */
  onPendingChange?: (time: Time | null) => void;
  /** What currently stops Confirm in this row, or null. */
  onIssueChange?: (issue: TimeEntryIssue | null) => void;
  /**
   * How many times Confirm was pressed while a time had a problem. The error
   * shows from then until the time is edited again, so nothing is flagged while
   * typing. undefined: errors show as soon as they appear (instant commit).
   */
  issueCheck?: number;
  /** Wheel only: true while a column is still moving (Confirm waits). */
  onSpinChange?: (spinning: boolean) => void;
  /** Typed boxes (default) or the custom wheel. */
  input?: 'typed' | 'wheel';
  timeFormat: TimeFormat;
  minuteStep?: number;
  /** The day's limits (`Constraints.timeBounds`). */
  bounds?: TimeBounds | null;
  label: string;
  disabled?: boolean;
  tokens: ThemeTokens;
  styles?: PickerStyles;
  strings: PickerStrings;
  testID?: string;
}

const timeKey = (t: Time | null) => (t ? `${t.hour}:${t.minute}` : '');

const issueText = (
  issue: TimeEntryIssue,
  strings: PickerStrings,
  minuteStep: number
): string => {
  if (issue === 'INCOMPLETE') return strings.errorIncompleteTime;
  if (issue === 'INVALID') return strings.errorInvalidTime;
  if (issue === 'OFF_STEP') return strings.errorMinuteStep(minuteStep);
  return strings.errorTimeNotAllowed;
};

/**
 * Label, the time boxes and the error below them. The boxes are
 * normal inputs (free cursor, digits only, two at most) with three helpers:
 * two hour digits jump to the minutes, Backspace in an empty minute box goes
 * back to the hour, and leaving a box pads it ('9' → '09'; empty minutes → '00').
 * A time is saved when focus leaves a box, and shows in the value field too.
 */
const TimeRow: React.FC<TimeRowProps> = ({
  time,
  onTime,
  onPendingChange,
  onIssueChange,
  issueCheck,
  onSpinChange,
  input = 'typed',
  timeFormat,
  minuteStep = 1,
  bounds,
  label,
  disabled,
  tokens,
  styles,
  strings,
  testID,
}) => {
  const s = buildTimeStyles(tokens);
  const [values, setValuesState] = useState<TimeEntryValues>(() =>
    formatTimeEntry(time, timeFormat)
  );
  // Handlers read the latest values (a change and a blur can arrive before a re-render).
  const valuesRef = useRef(values);
  const setValues = (next: TimeEntryValues) => {
    valuesRef.current = next;
    setValuesState(next);
  };
  const [focused, setFocused] = useState<TimeKey | null>(null);
  const refs = useRef<Partial<Record<TimeKey, TextInputRef | null>>>({});
  // Set while we move focus hour → minute ourselves (the minutes aren't filled then).
  const jumping = useRef(false);
  // The Confirm check the user has edited past: its error is hidden again.
  const [editedAt, setEditedAt] = useState(-1);
  const markEdited = () => setEditedAt(issueCheck ?? 0);

  // A time set elsewhere (the field, a day tap, a reset) replaces what's shown,
  // unless it is the time this row just saved.
  const lastKey = useRef(timeKey(time));
  useEffect(() => {
    const key = timeKey(time);
    if (key === lastKey.current) return;
    lastKey.current = key;
    // Never overwrite a box being typed in (e.g. a day tapped mid-typing gets
    // 12:00 AM); what's typed is saved when focus leaves, or by Confirm.
    if (focused) return;
    setValues(formatTimeEntry(time, timeFormat));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the time changes from outside
  }, [time?.hour, time?.minute]);

  /** Saves what the boxes hold; `fill` also shows the padded / 00 values in them. */
  const save = (next: TimeEntryValues, fill: boolean) => {
    const done = completeTimeEntry(next, timeFormat);
    setValues(fill ? done.values : next);
    const t = done.parsed.time;
    if (t && timeKey(t) !== lastKey.current) {
      lastKey.current = timeKey(t);
      onTime(t);
    }
  };

  const onChangeBox = (key: TimeKey, raw: string) => {
    const text = cleanBoxText(raw);
    const current = valuesRef.current;
    markEdited();
    const grew = (current[key] ?? '').length < 2 && text.length === 2;
    setValues({ ...current, [key]: text });
    if (key === 'hour' && grew) {
      jumping.current = true;
      refs.current.minute?.focus();
    }
  };

  const onBlurBox = (key: TimeKey) => {
    setFocused((f) => (f === key ? null : f));
    const current = valuesRef.current;
    if (key === 'hour' && jumping.current) {
      // Moving on to the minutes: save the hour (minutes count as 00), keep mm empty.
      jumping.current = false;
      const done = completeTimeEntry(current, timeFormat);
      save({ ...current, hour: done.values.hour }, false);
      return;
    }
    save(current, true);
  };

  const onPeriod = (period: Period) => {
    markEdited();
    const next = { ...valuesRef.current, period };
    if (focused) setValues(next);
    else save(next, true);
  };

  const onBackspace = (key: TimeKey) => {
    if (key === 'minute' && !valuesRef.current.minute)
      refs.current.hour?.focus();
  };

  // What Confirm would save, and why it can't (same rules as saving on leave).
  const effective = completeTimeEntry(values, timeFormat).parsed;
  let issue: TimeEntryIssue | null = effective.issue;
  if (effective.isEmpty) issue = time ? 'INCOMPLETE' : null;
  if (effective.time) issue = checkTime(effective.time, { minuteStep, bounds });
  // The wheel always holds a complete time: only the limits and the step apply.
  if (input === 'wheel')
    issue = time ? checkTime(time, { minuteStep, bounds }) : null;

  const pending =
    input === 'typed' &&
    effective.time &&
    timeKey(effective.time) !== lastKey.current
      ? effective.time
      : null;
  const onPendingRef = useRef(onPendingChange);
  onPendingRef.current = onPendingChange;
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const onTimeRef = useRef(onTime);
  onTimeRef.current = onTime;
  useEffect(() => {
    onPendingRef.current?.(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the pending time is compared by content
  }, [pending?.hour, pending?.minute]);

  const onIssueRef = useRef(onIssueChange);
  onIssueRef.current = onIssueChange;
  useEffect(() => {
    onIssueRef.current?.(issue);
  }, [issue]);
  useEffect(
    () => () => {
      // The row goes away (another day / end selected): keep what was typed.
      if (pendingRef.current) onTimeRef.current(pendingRef.current);
      onIssueRef.current?.(null);
      onPendingRef.current?.(null);
    },
    []
  );

  const revealed =
    issueCheck === undefined
      ? // Instant commit: an unfinished time isn't flagged while it is being typed.
        !(issue === 'INCOMPLETE' && focused)
      : issueCheck > 0 && issueCheck > editedAt;
  const shown = issue && revealed ? issue : null;
  const setRef = useCallback((key: TimeKey, r: TextInputRef | null) => {
    refs.current[key] = r;
  }, []);

  return (
    <View style={s.wrapper} testID={testID}>
      <View style={[s.row, styles?.timeRow]}>
        <Text style={[s.label, styles?.timeLabel]}>{label}</Text>
        {input === 'wheel' ? (
          <TimeWheel
            time={time}
            onTime={(t) => {
              markEdited();
              onTime(t);
            }}
            onSpinChange={(spinning) => onSpinChange?.(spinning)}
            timeFormat={timeFormat}
            minuteStep={minuteStep}
            bounds={bounds}
            disabled={disabled}
            tokens={tokens}
            styles={styles}
            strings={strings}
            testID={testID ? `${testID}-wheel` : undefined}
          />
        ) : (
          <TypedTime
            values={values}
            focused={focused}
            onChangeBox={onChangeBox}
            onFocusBox={setFocused}
            onBlurBox={onBlurBox}
            onBackspace={onBackspace}
            onPeriod={onPeriod}
            setRef={setRef}
            timeFormat={timeFormat}
            bounds={bounds}
            hasError={!!shown}
            disabled={disabled}
            tokens={tokens}
            styles={styles}
            strings={strings}
            testID={testID}
          />
        )}
      </View>
      <FieldMessages
        error={shown ? issueText(shown, strings, minuteStep) : undefined}
        tokens={tokens}
        styles={styles}
        testID={testID}
      />
    </View>
  );
};

export default TimeRow;

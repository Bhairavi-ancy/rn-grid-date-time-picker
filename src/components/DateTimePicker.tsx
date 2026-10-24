import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DateTime } from 'luxon';
import { resolveAdapter } from '../adapters';
import { daysBetween, isSameDay } from '../core/calendarDate';
import { createConstraints } from '../core/constraints';
import {
  createDraft,
  DEFAULT_TIME,
  draftToWire,
  setTime as applyTime,
  validateDraft,
  type DraftOptions,
  type DraftTarget,
} from '../core/draft';
import { resolveCalendarSystem } from '../core/calendarSystem';
import {
  defaultLocale,
  deriveDateFormat,
  deriveTimeFormat,
  normalizeDateFormat,
} from '../core/locale';
import { withSelectionRules } from '../core/selectionRules';
import type { ParsedSegments } from '../core/segments';
import type { TimeEntryIssue } from '../core/timeEntry';
import type {
  CalendarDate,
  DateTimeValue,
  PickerValue,
  Time,
  ValueAdapter,
} from '../core/types';
import Calendar from './calendar/Calendar';
import type { CalendarSelection } from './calendar/selection';
import PickerContainer from './container/PickerContainer';
import {
  formatMultipleText,
  formatRangeText,
  formatValueText,
} from './field/fieldText';
import FieldMessages from './field/FieldMessages';
import RangeFields, { type RangeEnd } from './field/RangeFields';
import ValueField from './field/ValueField';
import { useKeyboardFold } from './hooks/useKeyboardFold';
import { useOpenPicker } from './hooks/useOpenPicker';
import { usePickerDraft } from './hooks/usePickerDraft';
import { useTodayTick } from './hooks/useTodayTick';
import TimeRows, { type PendingTimes } from './time/TimeRows';
import { resolveStrings } from './theme/defaultStrings';
import { buildTokens } from './theme/tokens';
import {
  DEFAULT_YEAR_RANGE,
  type DateTimePickerProps,
  type PickerState,
} from './types';

/**
 * A date & time picker: a value field that opens a sheet (or an inline panel)
 * with a calendar and, for date-time values, a time row. Single, range and
 * multiple selection.
 * Everything comes in through props; the picker keeps no state of its own beyond
 * the draft being edited, and loads data only through `loadHolidays`.
 * onChange (then onBlur) fires exactly once per Confirm, and once with '' on clear;
 * closing, the backdrop and Android back fire nothing.
 */
const DateTimePicker: React.FC<DateTimePickerProps> = (props) => {
  const {
    type,
    mode = 'single',
    value,
    onChange,
    onBlur,
    commitMode = 'confirm',
    valueFormat,
    multiple,
    range,
    presentation = 'sheet',
    visible,
    onOpen,
    onClose,
    showField = true,
    renderSheet,
    sheet: sheetOptions,
    onBeforeOpen,
    label,
    placeholder,
    helperText,
    instruction,
    isMandatory,
    disabled = false,
    readOnly = false,
    allowTyping,
    allowTriggerTyping,
    allowClear,
    errorMessage,
    dateFormat: dateFormatProp,
    renderLabel,
    renderInstruction,
    icons,
    iconProps,
    header,
    title,
    onReset,
    bodyTop,
    bodyBottom,
    footer,
    onConfirm,
    confirmDisabled,
    renderField,
    renderDay,
    renderWeekday,
    renderMonthChip,
    renderYearCell,
    renderMonthCell,
    renderEmptyState,
    renderTimeRow,
    firstDayOfWeek = 7,
    showOutsideDays = true,
    initialView,
    enableMonthSwipe = true,
    calendarSystem,
    showToday = false,
    showHolidays = true,
    onVisibleMonthChange,
    onError,
    validate,
    yearRange = DEFAULT_YEAR_RANGE,
    locale,
    timeZone,
    now,
    timeFormat: timeFormatProp,
    minuteStep: minuteStepProp = 1,
    timeInput = 'typed',
    newDayTime,
    holidays: holidaysProp,
    loadHolidays,
    disableHolidays,
    disabledWeekdays,
    minDate,
    maxDate,
    disabledDates,
    enabledDates,
    timeBounds,
    getConstraints,
    theme,
    styles,
    strings: stringOverrides,
    testID,
  } = props;

  const tokens = useMemo(
    () => buildTokens(theme),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- compared by content: screens often pass a new theme object on every render
    [JSON.stringify(theme ?? {})]
  );
  const strings = useMemo(
    () => resolveStrings(stringOverrides),
    [stringOverrides]
  );
  const loc = useMemo(() => locale ?? defaultLocale(), [locale]);
  const localeDateFormat = useMemo(() => deriveDateFormat(loc), [loc]);
  const dateFormat = useMemo(() => {
    if (dateFormatProp === undefined) return localeDateFormat;
    const normal = normalizeDateFormat(dateFormatProp);
    if (!normal && __DEV__)
      console.warn(
        `rn-calendar-time-picker: dateFormat '${dateFormatProp}' isn't dd, MM and yyyy with one separator; using '${localeDateFormat}'.`
      );
    return normal ?? localeDateFormat;
  }, [dateFormatProp, localeDateFormat]);
  // A zone Luxon doesn't know would make every date invalid: use the device's.
  const zoneValid = useMemo(
    () => !timeZone || DateTime.local().setZone(timeZone).isValid,
    [timeZone]
  );
  const zone =
    (zoneValid ? timeZone : undefined) ?? DateTime.local().zoneName ?? 'UTC';
  // Minutes come in steps of 1 to 60; anything else would break the wheel.
  const stepValid =
    Number.isInteger(minuteStepProp) &&
    minuteStepProp >= 1 &&
    minuteStepProp <= 60;
  const minuteStep = stepValid ? minuteStepProp : 1;
  useEffect(() => {
    if (!__DEV__) return;
    if (!zoneValid)
      console.warn(
        `rn-calendar-time-picker: timeZone '${timeZone}' isn't a known zone; using '${zone}'.`
      );
    if (!stepValid)
      console.warn(
        `rn-calendar-time-picker: minuteStep ${minuteStepProp} isn't a whole number from 1 to 60; using 1.`
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- warns once per bad prop value
  }, [timeZone, minuteStepProp]);
  const isInline = presentation === 'inline';
  // Without a timeFormat prop, follow the locale's 12 / 24-hour clock.
  const localeTimeFormat = useMemo(() => deriveTimeFormat(loc), [loc]);
  const timeFormat = timeFormatProp ?? localeTimeFormat;

  // A custom adapter is read through a ref, so a new adapter object on every
  // render doesn't rebuild the draft being edited.
  const customAdapter = useRef<ValueAdapter | null>(null);
  customAdapter.current = typeof valueFormat === 'object' ? valueFormat : null;
  const adapterKey = typeof valueFormat === 'object' ? 'custom' : valueFormat;
  const adapter = useMemo((): ValueAdapter => {
    if (adapterKey !== 'custom') return resolveAdapter(adapterKey);
    return {
      // Stored values can be anything an API sends: a parse that throws reads as empty.
      parse: (raw, ctx) => {
        try {
          return customAdapter.current?.parse(raw, ctx) ?? null;
        } catch (e) {
          if (__DEV__)
            console.warn(
              `rn-calendar-time-picker: valueFormat.parse threw for '${raw}'; reading it as empty.`,
              e
            );
          return null;
        }
      },
      format: (v, ctx) => customAdapter.current?.format(v, ctx) ?? '',
      formatUnchanged: (raw, ctx) => {
        const current = customAdapter.current;
        return current?.formatUnchanged
          ? current.formatUnchanged(raw, ctx)
          : raw;
      },
    };
  }, [adapterKey]);

  const {
    isOpen: sheetOpen,
    open,
    close,
  } = useOpenPicker({
    disabled,
    readOnly,
    visible,
    onBeforeOpen,
    onOpen,
    onClose,
  });
  const isOpen = isInline || sheetOpen;
  const folded = useKeyboardFold(isOpen);

  const rangeLayout = range?.layout ?? 'singleField';
  const multipleTimeMode = multiple?.timeMode ?? 'shared';
  const draftOptions = useMemo((): DraftOptions => {
    return {
      type,
      zone,
      adapter,
      defaultTime: DEFAULT_TIME,
      multiple: {
        timeMode: multiple?.timeMode,
        maxSelections: multiple?.maxSelections,
      },
      range: {
        allowSameDay: range?.allowSameDay,
        reselect: range?.reselect,
        minDays: range?.minDays,
        maxDays: range?.maxDays,
      },
    };
  }, [
    type,
    zone,
    adapter,
    multiple?.timeMode,
    multiple?.maxSelections,
    range?.allowSameDay,
    range?.reselect,
    range?.minDays,
    range?.maxDays,
  ]);
  const draft = usePickerDraft(mode, value, isOpen, draftOptions);
  const today = useTodayTick(zone, now);

  // Holidays for years not passed in are loaded once per year through `loadHolidays`.
  const [loadedHolidays, setLoadedHolidays] = useState<
    Record<number, string[]>
  >({});
  const requestedYears = useRef(new Set<number>());
  const loadHolidaysFor = useCallback(
    (year: number) => {
      const load = loadHolidays;
      if (!load || requestedYears.current.has(year)) return;
      requestedYears.current.add(year);
      load(year)
        .then((list) =>
          setLoadedHolidays((prev) => {
            return { ...prev, [year]: list };
          })
        )
        .catch(() => requestedYears.current.delete(year));
    },
    [loadHolidays]
  );
  const holidays = useMemo(
    () => [...(holidaysProp ?? []), ...Object.values(loadedHolidays).flat()],
    [holidaysProp, loadedHolidays]
  );

  // Limits are worked out when the picker opens (the screen's own validation
  // after Confirm stays the final check).
  const weekdaysKey = disabledWeekdays?.join(',');
  const constraints = useMemo(() => {
    const nowDate = now?.() ?? new Date();
    const limits = {
      minDate,
      maxDate,
      disabledDates,
      enabledDates,
      timeBounds,
      disabledWeekdays,
      disableHolidays,
    };
    return getConstraints
      ? getConstraints({
          type,
          timeZone: zone,
          now: nowDate,
          today,
          holidays,
          limits,
        })
      : createConstraints({
          type,
          timeZone: zone,
          now: nowDate,
          minDate,
          maxDate,
          isDisabled: disabledDates,
          isEnabled: enabledDates,
          timeBounds,
          disabledWeekdays,
          holidays,
          disableHolidays,
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `isOpen` and `today` refresh the limits on open and at midnight; weekdays are compared by content
  }, [
    isOpen,
    today,
    type,
    zone,
    now,
    holidays,
    minDate,
    maxDate,
    disabledDates,
    enabledDates,
    timeBounds,
    weekdaysKey,
    disableHolidays,
    getConstraints,
  ]);

  const [typingBlocked, setTypingBlocked] = useState(false);
  // Times typed before their day is picked; used when the day is tapped.
  const [pending, setPendingTimes] = useState<PendingTimes>({});
  const setPending = useCallback(
    (key: 'single' | RangeEnd, time: Time) =>
      setPendingTimes((prev) => {
        return { ...prev, [key]: time };
      }),
    []
  );
  const [timeIssue, setTimeIssue] = useState<TimeEntryIssue | null>(null);
  // Times are checked when Confirm is pressed, not while typing: each press
  // with a problem shows the time row's error.
  const [timeCheck, setTimeCheck] = useState(0);
  // The `validate` message and the value it was given for.
  const [validation, setValidation] = useState<{
    message: string;
    key: string;
  } | null>(null);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  // From/To layout: the end that calendar taps fill. perDate: the day the time row edits.
  const [activeEnd, setActiveEnd] = useState<RangeEnd>('from');
  const [activeDay, setActiveDay] = useState<CalendarDate | null>(null);
  const resetSelectionUi = useCallback(() => {
    setPendingTimes({});
    setActiveEnd('from');
    setActiveDay(null);
  }, []);
  useEffect(() => {
    if (!isOpen) return;
    resetSelectionUi();
    setWheelSpinning(false);
    setRowPending({});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the picker opens
  }, [isOpen]);

  // Times still being typed in a row (focus hasn't left the box): Confirm checks
  // and saves the draft with them applied, so the user needn't tap out first.
  const [rowPending, setRowPending] = useState<
    Record<string, { target: DraftTarget; time: Time } | undefined>
  >({});
  const onRowPending = useCallback(
    (rowKey: string, target: DraftTarget, time: Time | null) =>
      setRowPending((prev) => {
        if (!time && !prev[rowKey]) return prev;
        return { ...prev, [rowKey]: time ? { target, time } : undefined };
      }),
    []
  );
  const preview = useMemo(
    () =>
      Object.values(rowPending).reduce(
        (acc, p) => (p ? applyTime(acc, p.time, p.target) : acc),
        draft.draft
      ),
    [draft.draft, rowPending]
  );
  const previewIssue = validateDraft(preview, draftOptions);

  const d = draft.draft;
  // A shared time applies to every picked date.
  const sharedTime =
    preview.mode === 'multiple' &&
    type === 'datetime' &&
    multipleTimeMode === 'shared'
      ? preview.sharedTime
      : null;
  const draftValues: (DateTimeValue | null)[] =
    preview.mode === 'single'
      ? [preview.slot.value]
      : preview.mode === 'range'
        ? [preview.from.value, preview.to.value]
        : preview.slots.map((slot) =>
            slot.value && sharedTime
              ? { ...slot.value, time: sharedTime }
              : slot.value
          );
  // Days that can't be picked block Confirm; a time outside the day's limits
  // is only checked when Confirm is pressed, like the other time problems.
  const datesAllowed = draftValues.every(
    (v) => !v || !constraints.dayStatus(v.date).disabled
  );
  const timesAllowed = draftValues.every(
    (v) => !v || constraints.isValueAllowed(v)
  );
  const timeBlocked = !!timeIssue || !timesAllowed;
  const canConfirm =
    !previewIssue &&
    datesAllowed &&
    !typingBlocked &&
    !wheelSpinning &&
    !confirmDisabled;

  const edited = useRef(false);
  const commit = useCallback(
    (wire: PickerValue) => {
      onChange(wire);
      onBlur?.();
      onConfirm?.(wire);
    },
    [onChange, onBlur, onConfirm]
  );

  const confirm = useCallback(() => {
    if (!canConfirm) return;
    if (timeBlocked) {
      setTimeCheck((n) => n + 1);
      onError?.(timeIssue ?? 'TIME_NOT_ALLOWED', value);
      return;
    }
    const wire = draftToWire(preview, draftOptions);
    const message = validate?.(wire);
    if (message) {
      setValidation({ message, key: JSON.stringify(wire) });
      onError?.('VALIDATION', wire);
      return;
    }
    commit(wire);
    edited.current = false;
    if (!isInline) close();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onError, validate and value are read when Confirm is pressed
  }, [canConfirm, timeBlocked, commit, preview, draftOptions, isInline, close]);

  const clearValue = useCallback(() => {
    draft.clear();
    resetSelectionUi();
    edited.current = false;
    onChange('');
  }, [draft, onChange, resetSelectionUi]);

  const clearDraft = useCallback(() => {
    edited.current = true;
    draft.clear();
    resetSelectionUi();
  }, [draft, resetSelectionUi]);

  // Opening or closing starts without the last `validate` message.
  useEffect(() => setValidation(null), [isOpen]);

  // commitMode 'instant': every complete, allowed edit is saved without a Confirm press.
  const lastInstant = useRef<string | null>(null);
  useEffect(() => {
    if (
      commitMode !== 'instant' ||
      !edited.current ||
      !canConfirm ||
      timeBlocked
    )
      return;
    const wire = draft.toWire();
    const key = JSON.stringify(wire);
    if (key === lastInstant.current) return;
    lastInstant.current = key;
    const message = validate?.(wire);
    if (message) {
      setValidation({ message, key });
      onError?.('VALIDATION', wire);
      return;
    }
    commit(wire);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the draft or its validity changes, not when callbacks are re-created
  }, [commitMode, canConfirm, timeBlocked, draft.draft]);

  // A typed date with no time yet gets one the way a tapped day does: the fixed
  // newDayTime, else a time already typed in the time row, else now.
  const withFilledTime = (
    parsed: ParsedSegments,
    key: 'single' | RangeEnd
  ): DateTimeValue | null =>
    parsed.value ??
    (parsed.dateOnly
      ? {
          date: parsed.dateOnly,
          time: fixedTime ?? pending[key] ?? nowTime(),
        }
      : null);

  const onSheetTyped = (parsed: ParsedSegments) => {
    edited.current = true;
    const typed = withFilledTime(parsed, 'single');
    setTypingBlocked(!parsed.isEmpty && !typed);
    if (typed) draft.setValue(typed, 'single');
    else if (parsed.isEmpty) draft.clear();
  };

  const onRangeTyped = (end: RangeEnd, parsed: ParsedSegments) => {
    edited.current = true;
    const typed = withFilledTime(parsed, end);
    setTypingBlocked(!parsed.isEmpty && !typed);
    if (typed || parsed.isEmpty) draft.setValue(typed, end);
  };

  // A fixed time for every newly picked day (wins over a typed time and over "now").
  const fixedTime = newDayTime ?? null;

  // A day picked on an empty date-time starts at the current time, moved up to
  // the next allowed minute step. An existing time is kept.
  const nowTime = useCallback((): Time => {
    const current = DateTime.fromJSDate(now?.() ?? new Date()).setZone(zone);
    const step = Math.max(1, minuteStep);
    const minutes = current.hour * 60 + Math.ceil(current.minute / step) * step;
    const capped = Math.min(minutes, 23 * 60 + 60 - step);
    return { hour: Math.floor(capped / 60), minute: capped % 60 };
  }, [now, zone, minuteStep]);

  const onSelectDay = useCallback(
    (day: CalendarDate) => {
      edited.current = true;
      setTypingBlocked(false);
      if (d.mode === 'range') {
        if (rangeLayout === 'fromTo') {
          draft.setRangeEnd(
            day,
            activeEnd,
            fixedTime ?? pending[activeEnd] ?? nowTime()
          );
          if (activeEnd === 'from') setActiveEnd('to');
          return;
        }
        // The single field: the first tap is the start, the next one the end.
        const startsOver =
          !d.from.value ||
          (!!d.to.value && range?.reselect !== 'moveNearestEnd');
        const end: RangeEnd = startsOver ? 'from' : 'to';
        draft.selectDay(day, fixedTime ?? pending[end] ?? nowTime());
        return;
      }
      if (d.mode === 'multiple') {
        const perDate = type === 'datetime' && multipleTimeMode === 'perDate';
        const picked = d.slots.some((slot) => isSameDay(slot.value?.date, day));
        // perDate: a tap on a picked day first makes it the one the time row edits.
        if (perDate && picked && !isSameDay(activeDay, day)) {
          setActiveDay(day);
          return;
        }
        draft.selectDay(day, fixedTime ?? nowTime());
        if (perDate) setActiveDay(picked ? null : day);
        return;
      }
      draft.selectDay(day, fixedTime ?? pending.single ?? nowTime());
    },
    [
      d,
      draft,
      nowTime,
      rangeLayout,
      activeEnd,
      activeDay,
      fixedTime,
      pending,
      range?.reselect,
      type,
      multipleTimeMode,
    ]
  );

  // Greying that depends on what's picked: range length, From/To order, the multiple cap.
  const calendarConstraints = useMemo(() => {
    if (d.mode === 'range') {
      const choosingEnd =
        rangeLayout === 'fromTo'
          ? activeEnd === 'to'
          : !!d.from.value && !d.to.value;
      return withSelectionRules(constraints, {
        rangeStart: choosingEnd ? d.from.value?.date : null,
        minDays: range?.minDays,
        maxDays: range?.maxDays,
        blockBeforeStart: rangeLayout === 'fromTo',
      });
    }
    if (d.mode === 'multiple') {
      const max = multiple?.maxSelections;
      return withSelectionRules(constraints, {
        maxReached: max !== undefined && d.slots.length >= max,
        isSelected: (day) =>
          d.slots.some((slot) => isSameDay(slot.value?.date, day)),
      });
    }
    return constraints;
  }, [
    constraints,
    d,
    rangeLayout,
    activeEnd,
    range?.minDays,
    range?.maxDays,
    multiple?.maxSelections,
  ]);

  const selection: CalendarSelection =
    draft.draft.mode === 'single'
      ? { kind: 'single', day: draft.draft.slot.value?.date ?? null }
      : draft.draft.mode === 'range'
        ? {
            kind: 'range',
            from: draft.draft.from.value?.date ?? null,
            to: draft.draft.to.value?.date ?? null,
          }
        : {
            kind: 'multiple',
            days: draft.draft.slots.flatMap((slot) =>
              slot.value ? [slot.value.date] : []
            ),
            joinConsecutive: multiple?.joinConsecutive,
          };

  // Tell the screen once per open when no day can be picked at all.
  const reportedEmpty = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      reportedEmpty.current = false;
      return;
    }
    if (!reportedEmpty.current && constraints.firstSelectable(today) === null) {
      reportedEmpty.current = true;
      onError?.('NOTHING_SELECTABLE', value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- checked on open and when the limits change; `value` is only reported
  }, [isOpen, constraints, today]);

  const handleVisibleMonth = useCallback(
    (year: number, month: number) => {
      loadHolidaysFor(year);
      onVisibleMonthChange?.(year, month);
    },
    [loadHolidaysFor, onVisibleMonthChange]
  );
  useEffect(() => {
    if (!isOpen) return;
    const anchor = selection.kind === 'single' ? selection.day : null;
    loadHolidaysFor((anchor ?? today).year);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per open
  }, [isOpen]);

  // Typing straight into the on-screen field saves on a complete, allowed value.
  // The on-screen field saves when typing pauses (focus leaves it, or its last
  // box fills), so 09:30 isn't saved as 09:03 on the way.
  const onTriggerTyped = useCallback(
    (parsed: ParsedSegments) => {
      if (parsed.value && constraints.isValueAllowed(parsed.value)) {
        const wire = adapter.format(parsed.value, { type, timeZone: zone });
        if (wire && wire !== value) commit(wire);
      }
    },
    [constraints, adapter, type, zone, value, commit]
  );

  // What the on-screen field shows: the saved value, never the draft.
  const savedKey = JSON.stringify(value ?? '');
  const saved = useMemo(
    () => createDraft(mode, value, draftOptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the value is compared by content (`savedKey`)
    [savedKey, mode, draftOptions]
  );
  const savedSingle = saved.mode === 'single' ? saved.slot.value : null;
  const savedText =
    saved.mode === 'range'
      ? formatRangeText(
          saved.from.value,
          saved.to.value,
          type,
          dateFormat,
          timeFormat
        )
      : saved.mode === 'multiple'
        ? formatMultipleText(
            saved.slots.map((slot) => slot.value),
            type,
            dateFormat,
            timeFormat
          )
        : undefined;

  const state: PickerState = {
    type,
    mode,
    value,
    displayText:
      savedText ?? formatValueText(savedSingle, type, dateFormat, timeFormat),
    disabled,
    readOnly,
    isOpen,
    folded,
    canConfirm,
    open,
    close,
    confirm,
    clear: clearValue,
    tokens,
    strings,
  };
  const sheetValue =
    draft.draft.mode === 'single' ? draft.draft.slot.value : null;
  // A time outside the limits is explained under the time row, not here.
  const sheetValueError =
    sheetValue && constraints.dayStatus(sheetValue.date).disabled
      ? strings.errorNotAllowed
      : '';

  let rangeError = '';
  if (d.mode === 'range' && d.from.value && d.to.value) {
    const span = daysBetween(d.from.value.date, d.to.value.date);
    if (
      constraints.dayStatus(d.from.value.date).disabled ||
      constraints.dayStatus(d.to.value.date).disabled
    )
      rangeError = strings.errorNotAllowed;
    else if (previewIssue === 'RANGE_ORDER')
      rangeError = strings.errorRangeOrder;
    else if (previewIssue === 'RANGE_LENGTH')
      rangeError =
        range?.minDays !== undefined && span < range.minDays
          ? strings.errorRangeTooShort(range.minDays)
          : strings.errorRangeTooLong(range?.maxDays ?? span);
  }

  const fieldCommon = {
    type,
    dateFormat,
    timeFormat,
    yearRange,
    renderLabel,
    icons,
    iconProps,
    tokens,
    styles,
    strings,
  };

  const trigger =
    !showField || isInline ? null : renderField ? (
      renderField(state)
    ) : (
      <ValueField
        {...fieldCommon}
        value={savedSingle}
        displayText={savedText}
        allowTyping={mode === 'single' && allowTriggerTyping}
        onTypingDone={onTriggerTyped}
        onPress={open}
        allowClear={allowClear}
        onClear={clearValue}
        label={label}
        isMandatory={isMandatory}
        placeholder={placeholder}
        helperText={helperText}
        instruction={instruction}
        renderInstruction={renderInstruction}
        errorMessage={errorMessage}
        disabled={disabled}
        readOnly={readOnly}
        testID={testID ? `${testID}-trigger` : undefined}
      />
    );

  // With the field hidden, its error still shows above the calendar.
  const sheetFieldError =
    (mode === 'single'
      ? sheetValueError
      : d.mode === 'range'
        ? rangeError
        : undefined) || (isInline ? errorMessage : undefined);
  const sheetField =
    sheetOptions?.showField === false ? (
      <FieldMessages
        error={sheetFieldError || undefined}
        tokens={tokens}
        styles={styles}
        testID={testID ? `${testID}-value` : undefined}
      />
    ) : mode === 'single' ? (
      <ValueField
        {...fieldCommon}
        value={sheetValue}
        placeholder={sheetOptions?.fieldPlaceholder}
        allowTyping={allowTyping}
        onTyped={onSheetTyped}
        allowClear={allowClear}
        onClear={() => {
          edited.current = true;
          draft.clear();
        }}
        errorMessage={sheetValueError || (isInline ? errorMessage : undefined)}
        icon={null}
        active
        testID={testID ? `${testID}-value` : undefined}
      />
    ) : d.mode === 'range' ? (
      <RangeFields
        {...fieldCommon}
        layout={rangeLayout}
        from={d.from.value}
        to={d.to.value}
        placeholder={sheetOptions?.fieldPlaceholder}
        activeEnd={activeEnd}
        onActivate={setActiveEnd}
        allowTyping={allowTyping}
        onTyped={onRangeTyped}
        allowClear={allowClear}
        onClear={clearDraft}
        errorMessage={rangeError || (isInline ? errorMessage : undefined)}
        disabled={disabled}
        testID={testID}
      />
    ) : d.mode === 'multiple' ? (
      <ValueField
        {...fieldCommon}
        value={null}
        displayText={formatMultipleText(
          draftValues,
          type,
          dateFormat,
          timeFormat
        )}
        placeholder={sheetOptions?.fieldPlaceholder}
        allowClear={allowClear}
        onClear={clearDraft}
        errorMessage={isInline ? errorMessage : undefined}
        icon={null}
        active
        testID={testID ? `${testID}-value` : undefined}
      />
    ) : null;

  const calendar = folded ? null : (
    <Calendar
      constraints={calendarConstraints}
      today={today}
      selection={selection}
      onSelectDay={onSelectDay}
      firstDayOfWeek={firstDayOfWeek}
      showOutsideDays={showOutsideDays}
      showHolidays={showHolidays}
      yearRange={yearRange}
      locale={loc}
      calendarSystem={resolveCalendarSystem(calendarSystem)}
      initialView={initialView}
      enableMonthSwipe={enableMonthSwipe}
      showToday={showToday}
      onVisibleMonthChange={handleVisibleMonth}
      renderDay={renderDay}
      renderWeekday={renderWeekday}
      renderMonthChip={renderMonthChip}
      renderYearCell={renderYearCell}
      renderMonthCell={renderMonthCell}
      renderEmptyState={renderEmptyState}
      icons={icons}
      iconProps={iconProps}
      tokens={tokens}
      styles={styles}
      strings={strings}
      testID={testID}
    />
  );

  const timeRow =
    type !== 'datetime' ? null : renderTimeRow ? (
      renderTimeRow(state)
    ) : (
      <TimeRows
        draft={d}
        setTime={draft.setTime}
        pending={pending}
        setPending={setPending}
        onEdit={() => {
          edited.current = true;
        }}
        rangeLayout={rangeLayout}
        activeEnd={activeEnd}
        multipleTimeMode={multipleTimeMode}
        activeDay={activeDay}
        constraints={constraints}
        input={timeInput}
        timeFormat={timeFormat}
        minuteStep={minuteStep}
        dateFormat={dateFormat}
        disabled={disabled || readOnly}
        onIssueChange={setTimeIssue}
        issueCheck={commitMode === 'instant' ? undefined : timeCheck}
        onSpinChange={setWheelSpinning}
        onPendingChange={onRowPending}
        tokens={tokens}
        styles={styles}
        strings={strings}
        testID={testID}
      />
    );

  // Shown while the selection is still the one it was given for.
  const validationMessage =
    validation &&
    (validation.key === JSON.stringify(draft.toWire()) ||
      validation.key === JSON.stringify(draftToWire(preview, draftOptions)))
      ? validation.message
      : null;

  const sheetContent = (
    <>
      {sheetField}
      {calendar}
      {timeRow}
      {validationMessage ? (
        <FieldMessages
          error={validationMessage}
          tokens={tokens}
          styles={{
            ...styles,
            errorText: [styles?.errorText, styles?.validationText],
          }}
          testID={testID ? `${testID}-validation` : undefined}
        />
      ) : null}
    </>
  );

  return (
    <>
      {trigger}
      <PickerContainer
        presentation={presentation}
        isOpen={isOpen}
        onRequestClose={close}
        renderSheet={renderSheet}
        sheet={sheetOptions}
        state={state}
        header={header}
        title={title ?? (isInline ? undefined : strings.titleDate)}
        onReset={onReset}
        bodyTop={bodyTop}
        bodyBottom={bodyBottom}
        footer={footer}
        confirmLabel={strings.confirm}
        confirmDisabled={!canConfirm}
        onConfirm={confirm}
        styles={styles}
        testID={testID}
      >
        {sheetContent}
      </PickerContainer>
    </>
  );
};

export default DateTimePicker;

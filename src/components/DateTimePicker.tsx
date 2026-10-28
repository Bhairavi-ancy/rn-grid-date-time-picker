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
  clearDraft as emptied,
  createDraft,
  DEFAULT_TIME,
  draftToWire,
  setTime as applyTime,
  validateDraft,
  type Draft,
  type DraftOptions,
  type DraftTarget,
} from '../core/draft';
import {
  hijriDateText,
  isHijriSupported,
  resolveCalendarSystem,
  type CalendarSystem,
} from '../core/calendarSystem';
import {
  defaultLocale,
  deriveDateFormat,
  deriveFirstDayOfWeek,
  deriveTimeFormat,
  normalizeDateFormat,
} from '../core/locale';
import { arabicDigits, latinDigits, localeDigits } from '../core/numerals';
import { withSelectionRules } from '../core/selectionRules';
import type { ParsedSegments } from '../core/segments';
import { checkTime, type TimeEntryIssue } from '../core/timeEntry';
import type {
  CalendarDate,
  DateTimeValue,
  PickerValue,
  Time,
  ValueAdapter,
} from '../core/types';
import Calendar from './calendar/Calendar';
import CalendarSwitch from './calendar/CalendarSwitch';
import { localeNames } from './calendar/localeNames';
import { NumeralsContext } from './theme/numerals';
import { firstSelectedDay, type CalendarSelection } from './calendar/selection';
import PickerContainer from './container/PickerContainer';
import {
  formatDateText,
  formatMultipleText,
  formatRangeText,
  formatValueText,
  type DateTextFormatter,
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

/** Same day and time (or both without a time). */
const sameValue = (a: DateTimeValue, b: DateTimeValue): boolean =>
  isSameDay(a.date, b.date) &&
  (a.time?.hour ?? -1) === (b.time?.hour ?? -1) &&
  (a.time?.minute ?? -1) === (b.time?.minute ?? -1);

const ALL_SYSTEMS: CalendarSystem[] = ['gregory', 'hijri', 'dual'];

/** The same kind of selection with nothing in it. */
const emptySelection = (sel: CalendarSelection): CalendarSelection =>
  sel.kind === 'single'
    ? { kind: 'single', day: null }
    : sel.kind === 'range'
      ? { kind: 'range', from: null, to: null }
      : { ...sel, days: [] };

/** Minute steps that divide the hour. */
const MINUTE_STEPS = [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60];

/**
 * A date & time picker: a value field that opens a sheet (or an inline panel)
 * with a calendar and, for date-time values, a time row. Single, range and
 * multiple selection.
 * Everything comes in through props; the picker keeps no state of its own beyond
 * the draft being edited, and loads data only through `loadHolidays`.
 * onChange (then onBlur) fires once per Confirm, once per saved edit with
 * commitMode 'instant' or on-screen typing; onConfirm follows only a Confirm
 * press. Clearing fires onChange('') alone; closing, the backdrop and Android
 * back fire nothing (onClose only).
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
    allowFieldTyping,
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
    firstDayOfWeek: firstDayProp,
    showOutsideDays = true,
    initialView,
    precision: precisionProp = 'day',
    initialVisibleDate,
    enableMonthSwipe = true,
    calendarSystem,
    calendarSwitch,
    onCalendarSystemChange,
    dualDefaultTab = 'gregory',
    renderCalendarSwitch,
    showToday = false,
    showHolidays = true,
    onVisibleMonthChange,
    onError,
    validate,
    yearRange: yearRangeProp = DEFAULT_YEAR_RANGE,
    locale,
    numerals: numeralsProp,
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
  const firstDayOfWeek = firstDayProp ?? deriveFirstDayOfWeek(loc);
  // Month and year picks are for single dates only.
  const precision =
    type === 'date' && mode === 'single' ? precisionProp : 'day';
  // The calendars the switch offers: none for month and year picks (always
  // Gregorian), or when the platform has no Hijri calendar.
  const switchKey = Array.isArray(calendarSwitch)
    ? calendarSwitch.join(',')
    : String(!!calendarSwitch);
  const switchSystems = useMemo((): CalendarSystem[] | null => {
    if (!calendarSwitch || precision !== 'day' || !isHijriSupported())
      return null;
    const list =
      calendarSwitch === true
        ? ALL_SYSTEMS
        : ALL_SYSTEMS.filter((x) => calendarSwitch.includes(x)).sort(
            (a, b) => calendarSwitch.indexOf(a) - calendarSwitch.indexOf(b)
          );
    return list.length > 1 ? list : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the list is compared by content
  }, [switchKey, precision]);
  const startSystem = (): CalendarSystem => {
    const wanted = calendarSystem ?? 'gregory';
    return switchSystems && !switchSystems.includes(wanted)
      ? (switchSystems[0] ?? wanted)
      : wanted;
  };
  // The switch changes this; a new calendarSystem prop starts over from it.
  const [chosenSystem, setChosenSystem] = useState(startSystem);
  useEffect(
    () => setChosenSystem(startSystem()),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the props change
    [calendarSystem, switchKey]
  );
  // Month and year picks are Gregorian whatever the calendar system.
  const system =
    precision === 'day' ? resolveCalendarSystem(chosenSystem) : 'gregory';
  // A dual calendar shows one of its two tabs; each open starts on dualDefaultTab.
  const [dualTab, setDualTab] = useState(dualDefaultTab);
  /** The calendar on screen. */
  const shownSystem = system === 'dual' ? dualTab : system;
  /** The calendar a value from outside counts as picked in. */
  const openingSystem = system === 'dual' ? dualDefaultTab : system;
  // Picks say which calendar they were made in only when one can be Hijri.
  const hijriInPlay = switchSystems !== null || system !== 'gregory';
  /**
   * The digits for one calendar: a Hijri calendar (and a date picked in it)
   * shows Arabic digits (١٢٣) in any language; a Gregorian one shows 0–9.
   * `numerals` sets both.
   */
  const digitsFor = (sys: 'gregory' | 'hijri') => {
    const kind = numeralsProp ?? (sys === 'hijri' ? 'arabic' : 'latin');
    if (kind === 'arabic') return arabicDigits;
    return kind === 'locale' ? localeDigits(loc) : latinDigits;
  };
  const monthNames = useMemo(() => localeNames(loc).monthsLong, [loc]);
  /** A month or year pick shown as text: "March 2026" or "2026". */
  const periodText = (v: DateTimeValue | null): string => {
    if (!v) return '';
    return precision === 'year'
      ? String(v.date.year)
      : `${monthNames[v.date.month - 1]} ${v.date.year}`;
  };
  const localeDateFormat = useMemo(() => deriveDateFormat(loc), [loc]);
  const dateFormat = useMemo(() => {
    if (dateFormatProp === undefined) return localeDateFormat;
    const normal = normalizeDateFormat(dateFormatProp);
    if (!normal && __DEV__)
      console.warn(
        `rn-grid-date-time-picker: dateFormat '${dateFormatProp}' isn't dd, MM and yyyy with one separator; using '${localeDateFormat}'.`
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
  // Minute steps divide the hour, so every hour starts on a step; anything
  // else would break the wheel and the rounding of a new day's time.
  const stepValid = MINUTE_STEPS.includes(minuteStepProp);
  const minuteStep = stepValid ? minuteStepProp : 1;
  // Years stay within 1–9999, the range dates can be written and read in.
  const yearRange = useMemo(
    () => ({
      first: Math.max(1, Math.min(yearRangeProp.first, yearRangeProp.last)),
      last: Math.min(9999, Math.max(yearRangeProp.first, yearRangeProp.last)),
    }),
    [yearRangeProp.first, yearRangeProp.last]
  );
  useEffect(() => {
    if (!__DEV__) return;
    if (!zoneValid)
      console.warn(
        `rn-grid-date-time-picker: timeZone '${timeZone}' isn't a known zone; using '${zone}'.`
      );
    if (!stepValid)
      console.warn(
        `rn-grid-date-time-picker: minuteStep ${minuteStepProp} doesn't divide 60 (${MINUTE_STEPS.join(', ')}); using 1.`
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
              `rn-grid-date-time-picker: valueFormat.parse threw for '${raw}'; reading it as empty.`,
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
  const keyboardUp = useKeyboardFold(isOpen);
  // The picker's own boxes that have focus. Inline, another field on the
  // screen can raise the keyboard, so the calendar folds only for these.
  const [focusedParts, setFocusedParts] = useState<Record<string, boolean>>({});
  const reportFocus = useCallback(
    (part: string, focused: boolean) =>
      setFocusedParts((prev) =>
        !!prev[part] === focused ? prev : { ...prev, [part]: focused }
      ),
    []
  );
  const ownFocus = Object.values(focusedParts).some(Boolean);
  const folded = keyboardUp && (!isInline || ownFocus);

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
    const zonedNow = DateTime.fromJSDate(nowDate).setZone(zone);
    return getConstraints
      ? getConstraints({
          type,
          timeZone: zone,
          now: nowDate,
          nowTime: { hour: zonedNow.hour, minute: zonedNow.minute },
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

  // A typed field that doesn't parse blocks Confirm, per field: one end of a
  // range can't hide the other end's problem.
  const [typingBlocks, setTypingBlocks] = useState<
    Partial<Record<'single' | RangeEnd, boolean>>
  >({});
  const typingBlocked = Object.values(typingBlocks).some(Boolean);
  const setTypingBlock = useCallback(
    (key: 'single' | RangeEnd, blocked: boolean) =>
      setTypingBlocks((prev) =>
        !!prev[key] === blocked ? prev : { ...prev, [key]: blocked }
      ),
    []
  );
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
  // A day in the month the calendar last showed, so a switch to the other
  // calendar opens on the same days. Each open starts from the value again.
  const shownAnchor = useRef<CalendarDate | null>(null);
  // Opening or closing starts fresh: nothing edited, nothing blocked.
  useEffect(() => {
    shownAnchor.current = null;
    edited.current = false;
    setTypingBlocks({});
    setTimeCheck(0);
    setFocusedParts({});
    if (!isOpen) return;
    resetSelectionUi();
    setWheelSpinning(false);
    setRowPending({});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the picker opens or closes
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
  /** The values a draft would save, with a shared time applied. */
  const valuesOf = (dr: Draft): (DateTimeValue | null)[] => {
    if (dr.mode === 'single') return [dr.slot.value];
    if (dr.mode === 'range') return [dr.from.value, dr.to.value];
    const shared =
      type === 'datetime' && multipleTimeMode === 'shared'
        ? dr.sharedTime
        : null;
    return dr.slots.map((slot) =>
      slot.value && shared ? { ...slot.value, time: shared } : slot.value
    );
  };
  const draftValues = valuesOf(preview);
  // A month or year pick stands for the whole period: it can be picked when any
  // day in it can (its saved first day may itself be outside the limits).
  const dayOff = (date: CalendarDate): boolean =>
    precision === 'month'
      ? !constraints.isMonthSelectable(date.year, date.month)
      : precision === 'year'
        ? !constraints.isYearSelectable(date.year)
        : constraints.dayStatus(date).disabled;
  const valueAllowed = (v: DateTimeValue): boolean =>
    precision === 'day' ? constraints.isValueAllowed(v) : !dayOff(v.date);
  // Days that can't be picked block Confirm; a time outside the day's limits
  // is only checked when Confirm is pressed, like the other time problems.
  const datesAllowed = draftValues.every((v) => !v || !dayOff(v.date));
  const timesAllowed = draftValues.every((v) => !v || valueAllowed(v));
  const timeBlocked = !!timeIssue || !timesAllowed;
  const canConfirm =
    !previewIssue &&
    datesAllowed &&
    !typingBlocked &&
    !wheelSpinning &&
    !confirmDisabled;

  const edited = useRef(false);
  // Read when Confirm is pressed or an edit is saved, so a new `validate` or
  // `onError` passed on a later render is the one that runs.
  const latest = useRef({ validate, onError, value });
  latest.current = { validate, onError, value };
  const valueKey = JSON.stringify(value ?? '');

  // A selection belongs to the calendar it was picked in (Gregorian or Hijri):
  // it shows only there, and the field writes it in that calendar. A saved
  // value remembers its calendar; one from outside counts as picked in the
  // calendar the picker opens on.
  const savedSystemRef = useRef<{
    key: string;
    system: 'gregory' | 'hijri';
  } | null>(null);
  const savedSystem =
    savedSystemRef.current?.key === valueKey
      ? savedSystemRef.current.system
      : openingSystem;
  const [draftSystem, setDraftSystem] = useState(savedSystem);
  useEffect(
    () => setDraftSystem(savedSystem),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the draft is rebuilt on open and on a new value
    [isOpen, valueKey]
  );
  useEffect(() => setDualTab(dualDefaultTab), [isOpen, dualDefaultTab]);
  const selectionShown = draftSystem === shownSystem;
  /** Saves a value: with the calendar it was picked in, when one can be Hijri. */
  const emitChange = useCallback(
    (wire: PickerValue, picked: 'gregory' | 'hijri') => {
      savedSystemRef.current = {
        key: JSON.stringify(wire ?? ''),
        system: picked,
      };
      if (hijriInPlay) onChange(wire, { calendarSystem: picked });
      else onChange(wire);
    },
    [hijriInPlay, onChange]
  );

  /**
   * Whether a draft can be saved as it stands: complete, every day allowed,
   * every time allowed and on the minute step, and nothing being typed or
   * spun that doesn't parse yet.
   */
  const canSave = (dr: Draft): boolean =>
    !validateDraft(dr, draftOptions) &&
    valuesOf(dr).every(
      (v) =>
        !v ||
        (!dayOff(v.date) &&
          valueAllowed(v) &&
          (type !== 'datetime' ||
            !v.time ||
            checkTime(v.time, {
              minuteStep,
              bounds: constraints.timeBounds(v.date),
            }) === null))
    ) &&
    !typingBlocked &&
    !wheelSpinning &&
    !confirmDisabled;

  // Every save: Confirm, an 'instant' edit (onConfirm is added by `confirm`).
  const commit = useCallback(
    (wire: PickerValue) => {
      emitChange(wire, draftSystem);
      onBlur?.();
    },
    [emitChange, draftSystem, onBlur]
  );

  const confirm = useCallback(() => {
    if (!canConfirm) return;
    const { validate: check, onError: report, value: saved } = latest.current;
    if (timeBlocked) {
      setTimeCheck((n) => n + 1);
      report?.(timeIssue ?? 'TIME_NOT_ALLOWED', saved);
      return;
    }
    const wire = draftToWire(preview, draftOptions);
    const message = check?.(wire);
    if (message) {
      setValidation({ message, key: JSON.stringify(wire) });
      report?.('VALIDATION', wire);
      return;
    }
    commit(wire);
    onConfirm?.(wire);
    edited.current = false;
    if (!isInline) close();
  }, [
    canConfirm,
    timeBlocked,
    timeIssue,
    commit,
    onConfirm,
    preview,
    draftOptions,
    isInline,
    close,
  ]);

  const clearValue = useCallback(() => {
    draft.clear();
    resetSelectionUi();
    edited.current = false;
    emitChange('', draftSystem);
  }, [draft, emitChange, draftSystem, resetSelectionUi]);

  const clearDraft = useCallback(() => {
    edited.current = true;
    draft.clear();
    resetSelectionUi();
  }, [draft, resetSelectionUi]);

  // × in the field above the calendar. 'instant' saves every edit, so it
  // clears the saved value too (once; an empty value isn't saved again).
  const clearInSheet = useCallback(() => {
    if (commitMode === 'instant' && valueKey !== '""') clearValue();
    else clearDraft();
  }, [commitMode, valueKey, clearValue, clearDraft]);

  // Opening or closing starts without the last `validate` message.
  useEffect(() => setValidation(null), [isOpen]);

  // commitMode 'instant': every complete, allowed edit is saved without a
  // Confirm press, but only while open (closing discards, as with Confirm),
  // and only what the draft holds: a time still being typed isn't saved yet.
  // An edit equal to the saved value isn't saved again; one `validate`
  // rejected waits until the selection or the saved value changes.
  const lastRejected = useRef<string | null>(null);
  useEffect(() => {
    lastRejected.current = null;
  }, [valueKey]);
  useEffect(() => {
    if (commitMode !== 'instant' || !isOpen || !edited.current) return;
    if (timeIssue || !canSave(draft.draft)) return;
    const wire = draft.toWire();
    const key = JSON.stringify(wire);
    if (key === valueKey || key === lastRejected.current) return;
    const message = latest.current.validate?.(wire);
    if (message) {
      lastRejected.current = key;
      setValidation({ message, key });
      latest.current.onError?.('VALIDATION', wire);
      return;
    }
    commit(wire);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- when the draft or what blocks it changes, not when callbacks are re-created
  }, [
    commitMode,
    isOpen,
    draft.draft,
    timeIssue,
    typingBlocked,
    wheelSpinning,
    confirmDisabled,
    constraints,
  ]);

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
    setDraftSystem(shownSystem);
    const typed = withFilledTime(parsed, 'single');
    setTypingBlock('single', !parsed.isEmpty && !typed);
    if (typed) draft.setValue(typed, 'single');
    else if (parsed.isEmpty) draft.clear();
  };

  const onRangeTyped = (end: RangeEnd, parsed: ParsedSegments) => {
    edited.current = true;
    setDraftSystem(shownSystem);
    const typed = withFilledTime(parsed, end);
    setTypingBlock(end, !parsed.isEmpty && !typed);
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
      // A pick in the other calendar starts over: the selection is one calendar's.
      const fresh =
        draftSystem !== shownSystem && valuesOf(d).some((v) => v !== null);
      setDraftSystem(shownSystem);
      const cur = fresh ? emptied(d) : d;
      const end0: RangeEnd = fresh ? 'from' : activeEnd;
      const dayInEdit = fresh ? null : activeDay;
      const times: PendingTimes = fresh ? {} : pending;
      if (fresh) {
        draft.clear();
        resetSelectionUi();
      }
      if (cur.mode === 'range') {
        if (rangeLayout === 'fromTo') {
          // The tapped day replaces whatever was typed in this end only.
          setTypingBlock(end0, false);
          draft.setRangeEnd(day, end0, fixedTime ?? times[end0] ?? nowTime());
          if (end0 === 'from') setActiveEnd('to');
          return;
        }
        // The single field: the first tap is the start, the next one the end.
        const startsOver =
          !cur.from.value ||
          (!!cur.to.value && range?.reselect !== 'moveNearestEnd');
        const end: RangeEnd = startsOver ? 'from' : 'to';
        setTypingBlock('single', false);
        draft.selectDay(day, fixedTime ?? times[end] ?? nowTime());
        return;
      }
      if (cur.mode === 'multiple') {
        const perDate = type === 'datetime' && multipleTimeMode === 'perDate';
        const picked = cur.slots.some((slot) =>
          isSameDay(slot.value?.date, day)
        );
        // perDate: a tap on a picked day first makes it the one the time row edits.
        if (perDate && picked && !isSameDay(dayInEdit, day)) {
          setActiveDay(day);
          return;
        }
        draft.selectDay(day, fixedTime ?? nowTime());
        if (perDate) setActiveDay(picked ? null : day);
        return;
      }
      setTypingBlock('single', false);
      draft.selectDay(day, fixedTime ?? times.single ?? nowTime());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- valuesOf reads only `d` and props listed here
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
      setTypingBlock,
      draftSystem,
      shownSystem,
      resetSelectionUi,
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
      latest.current.onError?.('NOTHING_SELECTABLE', latest.current.value);
    }
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

  // The on-screen field saves when typing pauses (focus leaves it, or its last
  // box fills, or AM/PM is switched after that), so 09:30 isn't saved as 09:03
  // on the way. It runs the same checks as Confirm and shows their message
  // under the field; an emptied field clears the value, and an unchanged one
  // saves nothing.
  const [triggerError, setTriggerError] = useState('');
  useEffect(() => setTriggerError(''), [valueKey]);
  const onTriggerTyped = (parsed: ParsedSegments) => {
    if (parsed.isEmpty) {
      setTriggerError('');
      if (savedSingle) clearValue();
      return;
    }
    const typed = parsed.value;
    // An unfinished entry shows the field's own error.
    if (!typed) return;
    if (savedSingle && sameValue(typed, savedSingle)) {
      setTriggerError('');
      return;
    }
    const typedDayOff = dayOff(typed.date);
    if (typedDayOff || !valueAllowed(typed)) {
      setTriggerError(
        typedDayOff ? strings.errorNotAllowed : strings.errorTimeNotAllowed
      );
      return;
    }
    if (type === 'datetime' && typed.time) {
      const issue = checkTime(typed.time, {
        minuteStep,
        bounds: constraints.timeBounds(typed.date),
      });
      if (issue) {
        setTriggerError(
          issue === 'OFF_STEP'
            ? strings.errorMinuteStep(minuteStep)
            : strings.errorTimeNotAllowed
        );
        return;
      }
    }
    const wire = adapter.format(typed, { type, timeZone: zone });
    if (!wire) return;
    const message = latest.current.validate?.(wire);
    if (message) {
      setTriggerError(message);
      latest.current.onError?.('VALIDATION', wire);
      return;
    }
    setTriggerError('');
    emitChange(wire, openingSystem);
    onBlur?.();
  };

  /** A value's date in the calendar it was picked in: Hijri text, or none for the dateFormat. */
  const dateTextFor = (
    picked: 'gregory' | 'hijri'
  ): DateTextFormatter | undefined =>
    picked === 'hijri'
      ? (v) => hijriDateText(v.date, loc) ?? formatDateText(v, dateFormat)
      : undefined;
  const savedDateText = dateTextFor(savedSystem);
  const draftDateText = dateTextFor(draftSystem);

  // What the on-screen field shows: the saved value, never the draft.
  const savedKey = valueKey;
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
          timeFormat,
          strings.rangeSeparator,
          savedDateText
        )
      : saved.mode === 'multiple'
        ? formatMultipleText(
            saved.slots.map((slot) => slot.value),
            type,
            dateFormat,
            timeFormat,
            savedDateText
          )
        : precision !== 'day'
          ? periodText(savedSingle)
          : undefined;
  const periodPlaceholder =
    precision === 'year'
      ? strings.placeholderYear
      : precision === 'month'
        ? `${strings.placeholderMonth} ${strings.placeholderYear}`
        : undefined;

  // The time a custom renderTimeRow edits, and how it sets it (the same
  // targets as the built-in rows).
  const multipleTarget: DraftTarget | null =
    d.mode !== 'multiple'
      ? null
      : multipleTimeMode === 'shared'
        ? 'shared'
        : activeDay
          ? { day: activeDay }
          : null;
  const draftTime: Time | null =
    d.mode === 'single'
      ? (d.slot.value?.time ?? pending.single ?? null)
      : d.mode === 'multiple'
        ? multipleTarget === 'shared'
          ? d.sharedTime
          : (d.slots.find((slot) => isSameDay(slot.value?.date, activeDay))
              ?.value?.time ?? null)
        : null;
  const setDraftTime = (time: Time, end?: RangeEnd) => {
    edited.current = true;
    if (d.mode === 'single') {
      if (d.slot.value) draft.setTime(time, 'single');
      else setPending('single', time);
      return;
    }
    if (d.mode === 'range') {
      const which =
        end ??
        (rangeLayout === 'fromTo' ? activeEnd : d.to.value ? 'to' : 'from');
      if (d[which].value) draft.setTime(time, which);
      else setPending(which, time);
      return;
    }
    if (multipleTarget) draft.setTime(time, multipleTarget);
  };

  const state: PickerState = {
    type,
    mode,
    value,
    displayText: digitsFor(savedSystem)(
      savedText ??
        formatValueText(
          savedSingle,
          type,
          dateFormat,
          timeFormat,
          savedDateText
        )
    ),
    disabled,
    readOnly,
    isOpen,
    folded,
    canConfirm,
    open,
    close,
    confirm,
    clear: clearValue,
    time: type === 'datetime' ? draftTime : null,
    rangeTimes:
      type === 'datetime' && d.mode === 'range'
        ? {
            from: d.from.value?.time ?? pending.from ?? null,
            to: d.to.value?.time ?? pending.to ?? null,
          }
        : null,
    setTime: setDraftTime,
    tokens,
    strings,
  };
  const sheetValue =
    draft.draft.mode === 'single' ? draft.draft.slot.value : null;
  // A time outside the limits is explained under the time row, not here.
  const sheetValueError =
    sheetValue && dayOff(sheetValue.date) ? strings.errorNotAllowed : '';

  let rangeError = '';
  if (d.mode === 'range' && d.from.value && d.to.value) {
    const length = daysBetween(d.from.value.date, d.to.value.date) + 1;
    if (
      constraints.dayStatus(d.from.value.date).disabled ||
      constraints.dayStatus(d.to.value.date).disabled
    )
      rangeError = strings.errorNotAllowed;
    else if (previewIssue === 'RANGE_ORDER')
      rangeError = strings.errorRangeOrder;
    else if (previewIssue === 'RANGE_LENGTH')
      rangeError =
        range?.minDays !== undefined && length < range.minDays
          ? strings.errorRangeTooShort(range.minDays)
          : strings.errorRangeTooLong(range?.maxDays ?? length);
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
        dateText={savedDateText}
        allowTyping={
          mode === 'single' && precision === 'day' && allowFieldTyping
        }
        onTypingDone={onTriggerTyped}
        onTyped={() => setTriggerError('')}
        onPress={open}
        allowClear={allowClear}
        onClear={clearValue}
        label={label}
        isMandatory={isMandatory}
        placeholder={placeholder ?? periodPlaceholder}
        helperText={helperText}
        instruction={instruction}
        renderInstruction={renderInstruction}
        errorMessage={triggerError || errorMessage}
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
  // The calendar icon at the end of the field above the calendar (sheet.fieldIcon).
  const sheetIcon = sheetOptions?.fieldIcon ? undefined : null;
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
        displayText={precision !== 'day' ? periodText(sheetValue) : undefined}
        dateText={draftDateText}
        placeholder={sheetOptions?.fieldPlaceholder ?? periodPlaceholder}
        allowTyping={allowTyping && precision === 'day'}
        onTyped={onSheetTyped}
        onFocusChange={(f) => reportFocus('value', f)}
        allowClear={allowClear}
        onClear={clearInSheet}
        errorMessage={sheetValueError || (isInline ? errorMessage : undefined)}
        icon={sheetIcon}
        active
        testID={testID ? `${testID}-value` : undefined}
      />
    ) : d.mode === 'range' ? (
      <RangeFields
        {...fieldCommon}
        layout={rangeLayout}
        dateText={draftDateText}
        showIcon={sheetOptions?.fieldIcon}
        from={d.from.value}
        to={d.to.value}
        placeholder={sheetOptions?.fieldPlaceholder}
        activeEnd={activeEnd}
        onActivate={setActiveEnd}
        allowTyping={allowTyping}
        onTyped={onRangeTyped}
        onFocusChange={(end, f) => reportFocus(`value-${end}`, f)}
        allowClear={allowClear}
        onClear={clearInSheet}
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
          timeFormat,
          draftDateText
        )}
        placeholder={sheetOptions?.fieldPlaceholder}
        allowClear={allowClear}
        onClear={clearInSheet}
        errorMessage={isInline ? errorMessage : undefined}
        icon={sheetIcon}
        active
        testID={testID ? `${testID}-value` : undefined}
      />
    ) : null;

  const systemLabels: Record<CalendarSystem, string> = {
    gregory: strings.calendarGregorian,
    hijri: strings.calendarHijri,
    dual: strings.calendarDual,
  };
  const chooseSystem = (next: CalendarSystem) => {
    if (next === system) return;
    setChosenSystem(next);
    if (next === 'dual') setDualTab(dualDefaultTab);
    onCalendarSystemChange?.(next);
  };
  const calendarSwitchNode = !switchSystems ? null : renderCalendarSwitch ? (
    renderCalendarSwitch({
      systems: switchSystems,
      selected: system,
      onSelect: chooseSystem,
      tokens,
      strings,
    })
  ) : (
    <CalendarSwitch
      variant="switch"
      options={switchSystems.map((v) => {
        return { value: v, label: systemLabels[v] };
      })}
      selected={system}
      onSelect={chooseSystem}
      accessibilityLabel={strings.a11yCalendarSystem}
      tokens={tokens}
      styles={styles}
      testID={testID ? `${testID}-calendar-switch` : undefined}
    />
  );
  const dualTabs =
    system !== 'dual' ? null : (
      <CalendarSwitch
        variant="tabs"
        options={[
          { value: 'gregory', label: strings.calendarGregorian },
          { value: 'hijri', label: strings.calendarHijri },
        ]}
        selected={dualTab}
        onSelect={setDualTab}
        accessibilityLabel={strings.a11yCalendarSystem}
        tokens={tokens}
        styles={styles}
        testID={testID ? `${testID}-dual-tabs` : undefined}
      />
    );
  // Another calendar opens on the days the last one showed, else on the
  // selection (shown or not), else where the picker would open.
  const calendarAnchor =
    shownAnchor.current ??
    (selectionShown ? null : firstSelectedDay(selection)) ??
    initialVisibleDate;

  const calendar = folded ? null : (
    <>
      {calendarSwitchNode}
      {dualTabs}
      <Calendar
        key={shownSystem}
        constraints={selectionShown ? calendarConstraints : constraints}
        today={today}
        initialVisibleDate={calendarAnchor}
        selection={selectionShown ? selection : emptySelection(selection)}
        onSelectDay={onSelectDay}
        firstDayOfWeek={firstDayOfWeek}
        showOutsideDays={showOutsideDays}
        showHolidays={showHolidays}
        yearRange={yearRange}
        locale={loc}
        calendarSystem={shownSystem}
        initialView={initialView}
        precision={precision}
        enableMonthSwipe={enableMonthSwipe}
        showToday={showToday}
        onVisibleMonthChange={handleVisibleMonth}
        onAnchorChange={(day) => {
          shownAnchor.current = day;
        }}
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
    </>
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
        onFocusChange={(row, f) => reportFocus(`time-${row}`, f)}
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

  // The field and the time row write the date in the digits of the calendar
  // it was picked in; the calendar uses its own.
  const sheetContent = (
    <>
      <NumeralsContext.Provider value={digitsFor(draftSystem)}>
        {sheetField}
      </NumeralsContext.Provider>
      <NumeralsContext.Provider value={digitsFor(shownSystem)}>
        {calendar}
      </NumeralsContext.Provider>
      <NumeralsContext.Provider value={digitsFor(draftSystem)}>
        {timeRow}
      </NumeralsContext.Provider>
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
    <NumeralsContext.Provider value={digitsFor(savedSystem)}>
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
    </NumeralsContext.Provider>
  );
};

export default DateTimePicker;

import {
  INTER_FONTS,
  type DateTimePickerProps,
} from 'rn-grid-date-time-picker';
import {
  PALETTES,
  RoundClearIcon,
  bodyHint,
  epochAdapter,
  frenchStrings,
  loadHolidays,
  renderCardSheet,
  renderStartHeader,
  serif,
  thisMonth,
  weekdaysOnly,
} from './fixtures';

/** One chip value, or the chips that are on in a multi-select row. */
export type Choice = string | string[];
export type Config = Record<string, Choice>;

export interface Option {
  value: string;
  /** Chip text; the value when left out. */
  label?: string;
  /** A colour dot on the chip. */
  swatch?: string;
  when?: (c: Config) => boolean;
}

/** A row of chips. The first option (or `initial`) is the default. */
export interface Group {
  key: string;
  /** The prop the row sets, shown under the title. */
  label: string;
  /** What the row changes, in plain words. */
  title: string;
  multi?: boolean;
  initial?: Choice;
  hint?: string;
  options: Option[];
  /** Hidden when this returns false, e.g. time options for a date picker. */
  when?: (c: Config) => boolean;
}

export interface Category {
  key: string;
  label: string;
  groups: Group[];
}

const isDateTime = (c: Config) => c.type === 'datetime';
const isSingle = (c: Config) => c.mode === 'single';
const isRange = (c: Config) => c.mode === 'range';
const isMultiple = (c: Config) => c.mode === 'multiple';

const options = (...values: string[]): Option[] =>
  values.map((value) => ({ value }));
const bool = options('false', 'true');

export const CATEGORIES: Category[] = [
  {
    key: 'basics',
    label: 'Basics',
    groups: [
      {
        key: 'type',
        label: 'type',
        title: 'What it picks',
        options: options('date', 'datetime'),
      },
      {
        key: 'mode',
        label: 'mode',
        title: 'Selection',
        options: options('single', 'multiple', 'range'),
      },
      {
        key: 'presentation',
        label: 'presentation',
        title: 'Opens as',
        options: options('sheet', 'inline'),
      },
      {
        key: 'commitMode',
        label: 'commitMode',
        title: 'Saves on',
        options: options('confirm', 'instant'),
      },
      {
        key: 'valueFormat',
        label: 'valueFormat',
        title: 'Value format',
        options: [
          { value: 'iso' },
          { value: 'utc-midnight' },
          { value: 'epoch', label: 'epoch ms (adapter)' },
        ],
      },
    ],
  },
  {
    key: 'field',
    label: 'Field',
    groups: [
      {
        key: 'field',
        label: 'field props',
        title: 'Field options',
        multi: true,
        initial: ['label', 'allowClear'],
        options: [
          { value: 'label' },
          { value: 'placeholder' },
          { value: 'helperText' },
          { value: 'instruction' },
          { value: 'isMandatory' },
          { value: 'errorMessage' },
          { value: 'allowClear' },
          { value: 'allowTyping' },
          { value: 'allowFieldTyping', when: isSingle },
          { value: 'disabled' },
          { value: 'readOnly' },
        ],
      },
      {
        key: 'dateFormat',
        label: 'dateFormat',
        title: 'Date format',
        options: [
          { value: 'locale', label: 'from locale' },
          { value: 'dd/mm/yyyy' },
          { value: 'yyyy-MM-dd' },
          { value: 'DD.MM.YYYY' },
        ],
      },
    ],
  },
  {
    key: 'selection',
    label: 'Range / multiple',
    groups: [
      {
        key: 'rangeLayout',
        label: 'range.layout',
        title: 'Range layout',
        when: isRange,
        options: options('singleField', 'fromTo'),
      },
      {
        key: 'rangeDays',
        label: 'range.minDays / maxDays',
        title: 'Range length',
        when: isRange,
        options: [
          { value: 'any', label: 'any length' },
          { value: '2-7', label: '2 to 7 days' },
        ],
      },
      {
        key: 'rangeReselect',
        label: 'range.reselect',
        title: 'Tapping a third day',
        when: isRange,
        options: options('newRange', 'moveNearestEnd'),
      },
      {
        key: 'allowSameDay',
        label: 'range.allowSameDay',
        title: 'Same-day range',
        when: (c) => isRange(c) && !isDateTime(c),
        options: bool,
      },
      {
        key: 'timeMode',
        label: 'multiple.timeMode',
        title: 'Times',
        when: (c) => isMultiple(c) && isDateTime(c),
        options: options('shared', 'perDate'),
      },
      {
        key: 'maxSelections',
        label: 'multiple.maxSelections',
        title: 'Most dates',
        when: isMultiple,
        options: [{ value: 'none', label: 'no limit' }, ...options('3', '5')],
      },
      {
        key: 'joinConsecutive',
        label: 'multiple.joinConsecutive',
        title: 'Join neighbouring days',
        when: isMultiple,
        options: bool,
      },
    ],
  },
  {
    key: 'calendar',
    label: 'Calendar',
    groups: [
      {
        key: 'calendarSystem',
        label: 'calendarSystem',
        title: 'Calendar',
        options: options('gregory', 'dual', 'hijri'),
      },
      {
        key: 'locale',
        label: 'locale',
        title: 'Locale',
        options: [
          { value: 'device' },
          ...options('en-US', 'en-GB', 'fr-FR', 'de-DE', 'ar-SA'),
        ],
      },
      {
        key: 'strings',
        label: 'strings',
        title: 'Strings',
        options: options('default', 'French'),
      },
      {
        key: 'firstDayOfWeek',
        label: 'firstDayOfWeek',
        title: 'Week starts on',
        options: [
          { value: 'locale', label: 'from locale' },
          { value: '1', label: 'Monday (1)' },
          { value: '6', label: 'Saturday (6)' },
          { value: '7', label: 'Sunday (7)' },
        ],
      },
      {
        key: 'initialView',
        label: 'initialView',
        title: 'Opens on',
        options: options('day', 'month', 'year'),
      },
      {
        key: 'precision',
        label: 'precision',
        title: 'Precision',
        hint: 'Single date pickers only.',
        when: (c) => isSingle(c) && !isDateTime(c),
        options: options('day', 'month', 'year'),
      },
      {
        key: 'showToday',
        label: 'showToday',
        title: 'Today button',
        options: bool,
      },
      {
        key: 'showOutsideDays',
        label: 'showOutsideDays',
        title: 'Days from other months',
        initial: 'true',
        options: bool,
      },
      {
        key: 'enableMonthSwipe',
        label: 'enableMonthSwipe',
        title: 'Swipe between months',
        initial: 'true',
        options: bool,
      },
    ],
  },
  {
    key: 'time',
    label: 'Time',
    groups: [
      {
        key: 'timeInput',
        label: 'timeInput',
        title: 'Time entry',
        when: isDateTime,
        options: options('typed', 'wheel'),
      },
      {
        key: 'timeFormat',
        label: 'timeFormat',
        title: 'Clock',
        when: isDateTime,
        options: [
          { value: 'locale', label: 'from locale' },
          ...options('12h', '24h'),
        ],
      },
      {
        key: 'minuteStep',
        label: 'minuteStep',
        title: 'Minute step',
        when: isDateTime,
        options: options('1', '5', '15', '30'),
      },
      {
        key: 'newDayTime',
        label: 'newDayTime',
        title: 'Time for a new day',
        when: isDateTime,
        options: [{ value: 'none' }, { value: '09:00' }],
      },
      {
        key: 'timeBounds',
        label: 'timeBounds',
        title: 'Allowed hours',
        when: isDateTime,
        options: [
          { value: 'none' },
          { value: '9-17', label: '09:00 to 17:00' },
        ],
      },
    ],
  },
  {
    key: 'limits',
    label: 'Limits',
    groups: [
      {
        key: 'dateLimits',
        label: 'minDate / maxDate',
        title: 'Date limits',
        options: [
          { value: 'none' },
          { value: 'months', label: 'this month and next' },
          { value: 'future', label: 'from today' },
          { value: 'past', label: 'up to today' },
        ],
      },
      {
        key: 'disabledWeekdays',
        label: 'disabledWeekdays',
        title: 'Closed weekdays',
        options: [
          { value: 'none' },
          { value: 'weekend', label: 'Sat + Sun' },
          { value: 'friday', label: 'Fri' },
        ],
      },
      {
        key: 'holidays',
        label: 'loadHolidays / disableHolidays',
        title: 'Holidays',
        hint: '1 Jan, 1 May, 25 Dec and the 15th of this month.',
        options: [
          { value: 'none' },
          { value: 'shown', label: 'shown' },
          { value: 'disabled', label: 'shown + disabled' },
        ],
      },
      {
        key: 'disabledDates',
        label: 'disabledDates',
        title: 'Disabled dates',
        options: [{ value: 'none' }, { value: '13', label: 'every 13th' }],
      },
      {
        key: 'validate',
        label: 'validate',
        title: 'Check on Confirm',
        hint: 'Checked on Confirm: the message shows in the sheet.',
        options: [
          { value: 'none' },
          { value: 'weekdays', label: 'weekdays only' },
        ],
      },
    ],
  },
  {
    key: 'theme',
    label: 'Theme',
    groups: [
      {
        key: 'palette',
        label: 'theme colours',
        title: 'Colours',
        hint: 'Each preset passes a few ThemeTokens; any token can be passed on its own. The JSX below shows the object.',
        options: Object.entries(PALETTES).map(([value, p]) => ({
          value,
          label: p.label,
          swatch: p.swatch,
        })),
      },
      {
        key: 'radius',
        label: 'theme.radius',
        title: 'Corner radius',
        options: [
          { value: 'default', label: '8 (default)' },
          ...options('2', '16'),
        ],
      },
      {
        key: 'font',
        label: 'theme font',
        title: 'Font',
        options: [
          { value: 'system' },
          { value: 'inter', label: 'INTER_FONTS' },
          { value: 'serif', label: 'fontFamily: serif' },
        ],
      },
      {
        key: 'fontSizes',
        label: 'theme.fontSize*',
        title: 'Text size',
        options: options('default', 'larger'),
      },
    ],
  },
  {
    key: 'sheet',
    label: 'Sheet & icons',
    groups: [
      {
        key: 'sheet',
        label: 'sheet / renderSheet',
        title: 'Sheet',
        when: (c) => c.presentation === 'sheet',
        options: [
          { value: 'built-in' },
          { value: 'custom', label: '60%, own header, no field' },
          { value: 'card', label: 'renderSheet: centred card' },
        ],
      },
      {
        key: 'slots',
        label: 'slots',
        title: 'Extra content',
        multi: true,
        options: [
          { value: 'title' },
          { value: 'onReset', label: 'onReset (Reset button)' },
          { value: 'bodyTop' },
        ],
      },
      {
        key: 'icons',
        label: 'icons / iconProps',
        title: 'Icons',
        multi: true,
        options: [
          { value: 'tinted', label: 'iconProps colours' },
          { value: 'clear', label: 'own clear icon' },
          { value: 'noCalendar', label: 'no calendar icon' },
        ],
      },
    ],
  },
];

const GROUPS = new Map(
  CATEGORIES.flatMap((cat) => cat.groups).map((g) => [g.key, g])
);

const defaultOf = (g: Group): Choice =>
  g.initial ?? (g.multi ? [] : g.options[0]!.value);

export const initialConfig = (): Config =>
  Object.fromEntries([...GROUPS.values()].map((g) => [g.key, defaultOf(g)]));

/** A ready-made setup: the chips it changes from the defaults. */
export interface Preset {
  key: string;
  title: string;
  description: string;
  config: Config;
}

export const PRESETS: Preset[] = [
  {
    key: 'simple',
    title: 'Simple date',
    description: 'One date, typed or tapped, with a clear button.',
    config: { field: ['label', 'allowClear', 'allowTyping', 'helperText'] },
  },
  {
    key: 'stay',
    title: 'Hotel stay',
    description: 'From / To fields, 2 to 7 nights, from today.',
    config: {
      mode: 'range',
      rangeLayout: 'fromTo',
      rangeDays: '2-7',
      dateLimits: 'future',
      holidays: 'shown',
      palette: 'emerald',
    },
  },
  {
    key: 'meeting',
    title: 'Book a meeting',
    description: 'Weekdays, 9 to 5, on a 15-minute wheel.',
    config: {
      type: 'datetime',
      timeInput: 'wheel',
      minuteStep: '15',
      timeBounds: '9-17',
      newDayTime: '09:00',
      disabledWeekdays: 'weekend',
      dateLimits: 'future',
      palette: 'violet',
    },
  },
  {
    key: 'shifts',
    title: 'Pick shifts',
    description: 'Up to 5 days, neighbours drawn as one band.',
    config: {
      mode: 'multiple',
      maxSelections: '5',
      joinConsecutive: 'true',
      showToday: 'true',
      palette: 'amber',
    },
  },
  {
    key: 'birthday',
    title: 'Birthday',
    description: 'Opens on the years, nothing after today.',
    config: {
      initialView: 'year',
      dateLimits: 'past',
      dateFormat: 'dd/mm/yyyy',
      palette: 'rose',
    },
  },
  {
    key: 'expiry',
    title: 'Card expiry',
    description: 'Month and year only, from this month on.',
    config: { precision: 'month', dateLimits: 'future', palette: 'mono' },
  },
  {
    key: 'hijri',
    title: 'Hijri',
    description: 'Umm al-Qura months with Arabic names.',
    config: { calendarSystem: 'hijri', locale: 'ar-SA', palette: 'teal' },
  },
  {
    key: 'dark',
    title: 'Dark, inline',
    description: 'Date and time on the page, dark tokens, round corners.',
    config: {
      type: 'datetime',
      presentation: 'inline',
      palette: 'midnight',
      radius: '16',
      showToday: 'true',
    },
  },
];

export const presetConfig = (preset: Preset): Config => ({
  ...initialConfig(),
  ...preset.config,
});

export const isVisible = (item: Group | Option, c: Config) =>
  !item.when || item.when(c);

/** A group's choice, or its default while the group or option is hidden. */
const read = (c: Config, key: string): Choice => {
  const g = GROUPS.get(key)!;
  if (!isVisible(g, c)) return defaultOf(g);
  const v = c[key]!;
  if (!Array.isArray(v)) return v;
  return v.filter((x) => {
    const o = g.options.find((opt) => opt.value === x);
    return o !== undefined && isVisible(o, c);
  });
};

/** Code printed as-is in the generated JSX, e.g. a function's name. */
class Raw {
  constructor(readonly text: string) {}
}
const raw = (text: string) => new Raw(text);

const quote = (s: string) => (s.includes("'") ? JSON.stringify(s) : `'${s}'`);

/** A JS literal for the generated JSX; a `...NAME` key prints as a spread. */
const literal = (v: unknown, indent: string): string => {
  if (v instanceof Raw) return v.text;
  if (typeof v === 'string') return quote(v);
  if (Array.isArray(v))
    return `[${v.map((x) => literal(x, indent)).join(', ')}]`;
  if (v && typeof v === 'object') {
    const inner = indent + '  ';
    const parts = Object.entries(v).map(([k, x]) =>
      k.startsWith('...') ? k : `${k}: ${literal(x, inner)}`
    );
    const flat = `{ ${parts.join(', ')} }`;
    if (flat.length <= 56 && !flat.includes('\n')) return flat;
    return `{\n${parts.map((p) => `${inner}${p},`).join('\n')}\n${indent}}`;
  }
  return String(v);
};

export interface PropEntry {
  name: string;
  value: unknown;
  /** The attribute as it appears in the generated JSX. */
  code: string;
}

const attr = (name: string, code: unknown) => {
  if (code === true) return name;
  if (typeof code === 'string' && !code.includes('"'))
    return `${name}="${code}"`;
  return `${name}={${literal(code, '  ')}}`;
};

const nextMonth =
  thisMonth.month === 12
    ? { year: thisMonth.year + 1, month: 1 }
    : { year: thisMonth.year, month: thisMonth.month + 1 };
const now = new Date();
const todayDate = {
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  day: now.getDate(),
};

/**
 * The picker props for the chosen chips (all but value, onChange and the
 * event handlers), each with its JSX.
 */
export const buildProps = (
  c: Config,
  actions: { onReset: () => void }
): PropEntry[] => {
  const one = (key: string) => read(c, key) as string;
  const has = (key: string, value: string) =>
    (read(c, key) as string[]).includes(value);
  const out: PropEntry[] = [];
  const set = (name: string, value: unknown, code: unknown = value) => {
    out.push({ name, value, code: attr(name, code) });
  };
  const datetime = one('type') === 'datetime';

  set('type', one('type'));
  if (one('mode') !== 'single') set('mode', one('mode'));
  if (one('presentation') !== 'sheet') set('presentation', one('presentation'));
  if (one('commitMode') !== 'confirm') set('commitMode', one('commitMode'));
  if (one('valueFormat') === 'utc-midnight') set('valueFormat', 'utc-midnight');
  if (one('valueFormat') === 'epoch')
    set('valueFormat', epochAdapter, raw('epochAdapter'));

  // Field
  if (has('field', 'label')) set('label', datetime ? 'Starts at' : 'Due date');
  if (has('field', 'placeholder'))
    set('placeholder', datetime ? 'Pick a date and time' : 'Pick a date');
  if (has('field', 'helperText')) set('helperText', 'Your next visit');
  if (has('field', 'instruction'))
    set('instruction', "We'll remind you the day before.");
  for (const flag of [
    'isMandatory',
    'allowClear',
    'allowTyping',
    'allowFieldTyping',
    'disabled',
    'readOnly',
  ])
    if (has('field', flag)) set(flag, true);
  if (has('field', 'errorMessage'))
    set('errorMessage', 'This day is fully booked');
  if (one('dateFormat') !== 'locale') set('dateFormat', one('dateFormat'));

  // Range / multiple
  const range: NonNullable<DateTimePickerProps['range']> = {};
  if (one('rangeLayout') !== 'singleField') range.layout = 'fromTo';
  if (one('rangeDays') === '2-7')
    Object.assign(range, { minDays: 2, maxDays: 7 });
  if (one('rangeReselect') !== 'newRange') range.reselect = 'moveNearestEnd';
  if (one('allowSameDay') === 'true') range.allowSameDay = true;
  if (Object.keys(range).length) set('range', range);

  const multiple: NonNullable<DateTimePickerProps['multiple']> = {};
  if (one('timeMode') !== 'shared') multiple.timeMode = 'perDate';
  if (one('maxSelections') !== 'none')
    multiple.maxSelections = Number(one('maxSelections'));
  if (one('joinConsecutive') === 'true') multiple.joinConsecutive = true;
  if (Object.keys(multiple).length) set('multiple', multiple);

  // Calendar
  if (one('calendarSystem') !== 'gregory')
    set('calendarSystem', one('calendarSystem'));
  if (one('locale') !== 'device') set('locale', one('locale'));
  if (one('strings') === 'French')
    set('strings', frenchStrings, raw('frenchStrings'));
  if (one('firstDayOfWeek') !== 'locale')
    set('firstDayOfWeek', Number(one('firstDayOfWeek')));
  if (one('initialView') !== 'day') set('initialView', one('initialView'));
  if (one('precision') !== 'day') set('precision', one('precision'));
  if (one('showToday') === 'true') set('showToday', true);
  if (one('showOutsideDays') === 'false') set('showOutsideDays', false);
  if (one('enableMonthSwipe') === 'false') set('enableMonthSwipe', false);

  // Time
  if (one('timeInput') !== 'typed') set('timeInput', 'wheel');
  if (one('timeFormat') !== 'locale') set('timeFormat', one('timeFormat'));
  if (one('minuteStep') !== '1') set('minuteStep', Number(one('minuteStep')));
  if (one('newDayTime') !== 'none') set('newDayTime', { hour: 9, minute: 0 });
  if (one('timeBounds') !== 'none')
    set(
      'timeBounds',
      () => ({ min: { hour: 9, minute: 0 }, max: { hour: 17, minute: 0 } }),
      raw(
        '() => ({ min: { hour: 9, minute: 0 }, max: { hour: 17, minute: 0 } })'
      )
    );

  // Limits
  const limits = one('dateLimits');
  if (limits === 'months') {
    set('minDate', { ...thisMonth, day: 1 });
    set('maxDate', {
      ...nextMonth,
      day: new Date(nextMonth.year, nextMonth.month, 0).getDate(),
    });
  }
  if (limits === 'future') set('minDate', todayDate);
  if (limits === 'past') set('maxDate', todayDate);
  if (one('disabledWeekdays') === 'weekend') set('disabledWeekdays', [6, 7]);
  if (one('disabledWeekdays') === 'friday') set('disabledWeekdays', [5]);
  if (one('holidays') !== 'none')
    set('loadHolidays', loadHolidays, raw('loadHolidays'));
  if (one('holidays') === 'disabled') set('disableHolidays', true);
  if (one('disabledDates') !== 'none')
    set(
      'disabledDates',
      (d: { day: number }) => d.day === 13,
      raw('(d) => d.day === 13')
    );
  if (one('validate') !== 'none')
    set('validate', weekdaysOnly, raw('weekdaysOnly'));

  // Theme: the chips merge into one object.
  const theme: Record<string, unknown> = {};
  const themeCode: Record<string, unknown> = {};
  if (one('font') === 'inter') {
    Object.assign(theme, INTER_FONTS);
    themeCode['...INTER_FONTS'] = null;
  }
  if (one('font') === 'serif') theme.fontFamily = serif;
  Object.assign(theme, PALETTES[one('palette')]!.tokens);
  if (one('radius') !== 'default') theme.radius = Number(one('radius'));
  if (one('fontSizes') === 'larger')
    Object.assign(theme, {
      fontSizeSmall: 13,
      fontSizeMedium: 16,
      fontSizeLarge: 18,
    });
  for (const [k, v] of Object.entries(theme))
    if (!(k in INTER_FONTS) || one('font') !== 'inter') themeCode[k] = v;
  if (one('font') === 'serif') themeCode.fontFamily = raw('serif');
  if (Object.keys(theme).length) set('theme', theme, themeCode);

  // Sheet, slots and icons
  if (one('sheet') === 'custom') {
    set('header', renderStartHeader, raw('renderStartHeader'));
    set('sheet', { height: '60%', showField: false, fixedFooter: false });
  }
  if (one('sheet') === 'card')
    set(
      'renderSheet',
      renderCardSheet(PALETTES[one('palette')]!.tokens.background),
      raw('renderCardSheet')
    );
  if (has('slots', 'title')) set('title', 'When are you free?');
  if (has('slots', 'onReset'))
    set('onReset', actions.onReset, raw("() => setValue('')"));
  if (has('slots', 'bodyTop'))
    set(
      'bodyTop',
      bodyHint,
      raw('<Text>Bookings open two weeks ahead.</Text>')
    );
  if (has('icons', 'tinted')) {
    const tint = { color: '#DB2777' };
    set('iconProps', {
      calendar: { ...tint, size: 22, disabledColor: '#F59E0B' },
      clear: { ...tint, size: 18 },
      chevronDown: tint,
      chevronLeft: tint,
      chevronRight: tint,
    });
  }
  const icons: Record<string, unknown> = {};
  const iconsCode: Record<string, unknown> = {};
  if (has('icons', 'clear')) {
    icons.clear = RoundClearIcon;
    iconsCode.clear = raw('RoundClearIcon');
  }
  if (has('icons', 'noCalendar')) icons.calendar = iconsCode.calendar = null;
  if (Object.keys(icons).length) set('icons', icons, iconsCode);

  return out;
};

export const toJsx = (entries: PropEntry[]) =>
  [
    '<DateTimePicker',
    '  value={value}',
    '  onChange={setValue}',
    ...entries.map((e) => `  ${e.code}`),
    '/>',
  ].join('\n');

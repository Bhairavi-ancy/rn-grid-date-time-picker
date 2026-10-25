# Fixes before the first release

Found in the pre-release review of 0.1.0. Each item gives what goes wrong, where to look, how to fix it, and the test that proves the fix. Line numbers are approximate; search for the named function if they've moved.

Work on the `fix/pre-release-review` branch. Tick an item when its fix and its regression test are both in. Delete this file in the last commit before publishing (it isn't in the npm package either way: `files` in `package.json` doesn't include it).

**Status key:** ✅ reproduced in a test or on the Android emulator · 🔎 found by reading the code or React Native's source, not yet reproduced.

## Decisions (settle these first)

- [x] **Q1. Daylight-saving and holiday notices.** **Decided (2026-10-25): remove for 0.1.0. Done.** The README promises them, but nothing renders them. Default: remove them from the README, CHANGELOG and the `dstNotice` / `holidayNotice` style keys for 0.1.0, and add them in a later release.
- [x] **Q2. `renderTimeRow`.** **Decided (2026-10-25): add the draft time and `setTime`. Done: `state.time`, `state.rangeTimes`, `state.setTime(time, end?)`.** It can only show a time today. Default: add the draft time and a `setTime(time)` to `PickerState` so a custom row can change it.
- [x] **Q3. `range.minDays` / `maxDays`.** **Decided (2026-10-25): count calendar days, inclusive.** These currently count nights (`maxDays: 14` allows 15 calendar days). Default: count calendar days, inclusive, and say so in the README.

## Blockers

- [x] **B1. A `maxDate` far in the past leaves nothing selectable.** ✅
  - **What happens:** with `maxDate` more than about 10 years ago (a "must be 18 or older" date-of-birth rule), the calendar shows "No dates are available" and `onError('NOTHING_SELECTABLE')` fires.
  - **Where:** `src/core/constraints.ts`, `firstSelectable` (~line 209). The backward search starts from today, not from `maxDate`, and stops after 3660 days.
  - **Fix:** start the backward loop from the earlier of `from` and `range.max`, the same way the forward loop already clamps to `range.min`.
  - **Test:** `maxDate` = today − 18 years → `firstSelectable(today)` returns `maxDate` (or the nearest selectable day before it), and the calendar renders days.

- [x] **B2. Instant mode: after a clear, picking the same value again isn't saved.** ✅
  - **What happens:** with `commitMode="instant"`, the user picks 25 Oct (saved), clears with ×, opens the picker and picks 25 Oct again. Nothing is saved; the stored value stays `''`. The same happens when the screen sets the value to `''` itself.
  - **Where:** `src/components/DateTimePicker.tsx`, the instant-commit effect (`lastInstant`), around lines 500–520.
  - **Fix:** compare against the saved value, not the last commit, or reset `lastInstant` whenever `value` changes from outside.
  - **Test:** the sequence above ends with `onChange('2026-10-25')` as the last call.

- [x] **B3. Instant mode: closing the sheet calls `onChange` with the old value.** ✅
  - **What happens:** with a saved range of 22–24 Oct, the user taps 27 Oct (range now incomplete) and closes with the backdrop. `onChange`, `onBlur` and `onConfirm` fire with 22–24. A time typed but not yet saved when the sheet closes does the same, and the typed time is lost.
  - **Where:** `DateTimePicker.tsx` (`edited` is never reset), `src/components/hooks/usePickerDraft.ts` (the draft rebuild on open/close), `src/components/time/TimeRow.tsx` (the unmount flush).
  - **Fix:** reset `edited` when the picker opens or closes, and don't count a rebuild or the unmount flush as an edit.
  - **Test:** both scenarios end with no `onChange`, `onBlur` or `onConfirm` call after the close.

- [x] **B4. Instant mode: a time outside the limits can be saved.** 🔎 (the reviewer reproduced it)
  - **What happens:** with `timeBounds` max 10:30 and the current time 10:45, tapping a day sets the draft to 10:45 (blocked). While the user is typing 10:15 into the minutes, the check passes on the typed time, but the draft's 10:45 is what gets saved.
  - **Where:** `DateTimePicker.tsx`. The checks (`timesAllowed`, `timeBlocked`, `canConfirm`) run on `preview`, but the instant effect saves `draft.toWire()`.
  - **Fix:** save `draftToWire(preview, …)`, or run the checks on exactly what gets saved.
  - **Test:** the scenario above saves nothing until the time is allowed, then saves the allowed time.

- [x] **B5. On-screen field, 12-hour: switching AM/PM after the minutes fill isn't saved.** ✅
  - **What happens:** the user types 09:30, which saves 09:30 AM, then taps PM. The field shows PM, but AM stays saved, even after the field loses focus.
  - **Where:** `src/components/field/ValueField.tsx` (`onTypingDone` fires only when segment focus goes from set to none) and `SegmentedInput.tsx` (`renderPeriod`).
  - **Fix:** also save when the AM/PM choice changes while no segment is focused.
  - **Test:** type a full time, tap PM, expect `onChange` with the PM value.

- [x] **B6. On-screen field: deleting every digit doesn't clear the value.** ✅
  - **What happens:** the field looks empty and the × disappears, but the old date is still saved and submitted with the form.
  - **Where:** `DateTimePicker.tsx`, `onTriggerTyped`, which ignores `parsed.isEmpty`.
  - **Fix:** an empty field calls `clearValue()`, the same as ×.
  - **Test:** delete every segment, then leave the field → `onChange('')`.

- [x] **B7. On-screen field: typing skips `validate` and the minute step, and focus alone rewrites the value.** ✅
  - **What happens:**
    - typed values are saved without calling `validate`;
    - an off-step time (09:07 with `minuteStep={15}`) is saved;
    - `onConfirm` fires without a Confirm press;
    - just focusing a box and leaving it calls `onChange`, rewriting a stored string such as `…04:30:00Z` as `…04:30:00.000Z`.
  - **Where:** `DateTimePicker.tsx`, `onTriggerTyped`.
  - **Fix:**
    - run the same checks as Confirm: the step, the limits, then `validate`;
    - show any message under the field;
    - skip saving when the typed value equals the saved value;
    - use the adapter's `formatUnchanged` when nothing changed;
    - don't call `onConfirm` here.
  - **Test:** `validate` returning a message blocks the save and shows the message; an off-step time isn't saved; focus and blur with no edit calls nothing.

- [x] **B8. iOS: the Done bar only appears on the first box.** 🔎 (from React Native 0.88's iOS source) **Fixed in code; still to check on the iOS simulator.**
  - **What happens:** every segment and time box shares one `inputAccessoryViewID`. React Native's current iOS implementation attaches an accessory view to the first matching input only, so after the day (or hour) box the number pad has no Done key, and the keyboard can't be closed. Other pickers on the same screen share the same ID too.
  - **Where:** `src/components/field/KeyboardDoneBar.tsx`, `SegmentedInput.tsx`, `src/components/time/TypedTime.tsx`.
  - **Fix:** remove `InputAccessoryView` (it's also deprecated in 0.88). On each TextInput, set `returnKeyType="done"` and `inputAccessoryViewButtonLabel={strings.done}` (React Native then adds a Done toolbar per input), and handle `onSubmitEditing` to close the keyboard.
  - **Test:** in the iOS simulator, every box shows Done, and Done closes the keyboard. In Jest, check each TextInput has the props.

## Should fix

- [x] **F1. `'utc-midnight'` dates with an offset move to another day.** ✅
  - **What happens:** `'2026-10-24T00:00:00+05:30'` reads as 23 Oct, and an untouched Confirm saves `'2026-10-23T00:00:00.000Z'`. The README says this format is never shifted by a zone.
  - **Where:** `src/adapters/utcMidnight.ts`, `fromWire` for the date type (~line 69), and `formatUnchanged` (~line 108).
  - **Fix:** for dates, read the calendar date as written (`setZone: true`, or the first 10 characters).
  - **Test:** offsets +05:30, −05:00 and Z all give 24 Oct, and an unchanged Confirm returns the input.

- [x] **F2. A 12-hour typed field can't be emptied by deleting its digits.** ✅
  - **What happens:** after deleting every digit, `period` still holds AM or PM, so the field isn't treated as empty. Confirm stays off and errors show. Tapping AM/PM on an empty field does the same.
  - **Where:** `src/core/segments.ts`, `parseSegments`, the `isEmpty` check (~line 193).
  - **Fix:** leave `period` out of the `isEmpty` check.
  - **Test:** delete every digit of a 12-hour value → `isEmpty: true`, and the draft clears.

- [x] **F3. From/To typing: a valid end can hide an invalid one.** 🔎 (reviewer reproduced)
  - **What happens:** one `typingBlocked` flag covers both ends. An invalid From (31-02) followed by a valid To enables Confirm, which saves a From date the user never meant (the last parsable one).
  - **Where:** `DateTimePicker.tsx`, `onRangeTyped`.
  - **Fix:** keep one blocked flag per end.
  - **Test:** the scenario above keeps Confirm off until From is valid.

- [x] **F4. Multiple dates with a time per date: a time being typed can land on the wrong day.** 🔎 (reviewer reproduced)
  - **What happens:** rows target slots by array index. Adding a day that sorts earlier while a time is being typed moves the typed time onto another date.
  - **Where:** `src/components/time/TimeRows.tsx`, `TimeRow.tsx` (the unmount flush), `DateTimePicker.tsx` (around lines 405–420).
  - **Fix:** target slots by date, not index.
  - **Test:** type a time for 20 Oct, tap 5 Oct, Confirm → 20 Oct has the typed time and 10 Oct keeps its own.

- [x] **F5. Confirm can use an outdated `validate`, `onError` and `value`.** 🔎 (reviewer reproduced)
  - **Where:** `DateTimePicker.tsx`, `confirm`. These are deliberately left out of the `useCallback` deps, so the first ones are kept.
  - **Fix:** read them through refs.
  - **Test:** change `validate` between renders and expect the new one to run.

- [x] **F6. Confirm can stay disabled after closing and reopening.** 🔎 (reviewer reproduced)
  - **What happens:** type an invalid date in the sheet, close and reopen. The field shows the valid saved value, but Confirm stays off.
  - **Where:** `DateTimePicker.tsx`. `typingBlocked` isn't reset when the picker opens.
  - **Fix:** reset `typingBlocked` (and the time-check counter) on open.
  - **Test:** the scenario above has Confirm enabled after reopening.

- [x] **F7. An inline calendar folds away when any other field on the screen opens the keyboard.** 🔎
  - **Where:** `DateTimePicker.tsx` (`useKeyboardFold(isInline || sheetOpen)`) and `src/components/hooks/useKeyboardFold.ts`.
  - **Fix:** fold only while one of the picker's own boxes is focused.
  - **Test:** an inline picker plus a separate TextInput; focusing the other input leaves the calendar shown.

- [ ] **F8. Tapping from one box to another briefly leaves no box focused.** 🔎 **Checked on the Android emulator (2026-10-25): doesn't happen.** Logging the field's focus while tapping from box to box showed no moment without focus; Android delivers the blur and the next focus in one render. It only shows in Jest, where each event is fired separately. Check on iOS before deciding whether to change anything.
  - **What happens:** the old box blurs before the new one focuses, with a render in between where nothing is focused. In that moment:
    - the on-screen field saves part-way;
    - the error border and text flash, and screen readers may announce them;
    - a value waiting to be shown can overwrite what's being typed.
  - **Where:** `SegmentedInput.tsx` (`onBlur`), `ValueField.tsx` (`onTypingDone`), `src/components/hooks/useTypedSegments.ts`.
  - **Fix:** defer the blur until it's clear no other box took focus (a microtask, or `TextInput.State.currentlyFocusedInput()`).
  - **Test:** a blur followed straight away by a focus on another box doesn't save and doesn't show an error.

- [x] **F9. Two remaining fast-typing edge cases.** 🔎 (the reviewer has failing tests)
  - **(a) A late focus event pads a digit that already arrived.** `src/core/segmentEditor.ts` `moveFocus` pads a box even when focusing the box that's already focused, so month "1" becomes "01" and the next digit gives "02" instead of "12". Fix: ignore `focus` for the box already focused.
  - **(b) A render between two keystrokes can replay a character.** `SegmentedInput.tsx` `sinceRender` is cleared on every render; if the native box ignored the reset, the next change replays a digit. Fix: keep each box's last native text across renders, or use `onChange`'s `eventCount`.
  - **Test:** both scenarios as tests, plus a burst-typing check on the Android emulator with a hardware keyboard.

- [x] **F10. Focusing and leaving a box without editing still reports a change.** 🔎 (reviewer reproduced)
  - **What happens:** focus and blur rebuild `parsed`, so `onTyped` fires. With `commitMode="instant"` inline, that calls `onChange` and `onConfirm` with an unchanged value, and re-renders the whole picker on every box change.
  - **Where:** `segmentEditor.ts` (focus/blur) and `useTypedSegments.ts`.
  - **Fix:** keep the same `parsed` object when the values didn't change.
  - **Test:** focus then blur → no `onTyped`, no `onChange`.

- [x] **F11. Time row: Backspace from the minutes back into the hour fills the minutes with "00".** 🔎 (reviewer reproduced)
  - **What happens:** the minute box's blur saves 09:00. When the row then jumps back to the minutes, the box is already full, and `maxLength={2}` drops the minutes the user types.
  - **Where:** `TimeRow.tsx` (`onBlurBox`, `onBackspace`) and `TypedTime.tsx`.
  - **Fix:** don't fill the minutes when Backspace moves to the hour. Use `selectTextOnFocus`, or replace a full box's text instead of relying on `maxLength`.
  - **Test:** clear the minutes, Backspace, retype the hour, type the minutes → the typed minutes are kept.

- [x] **F12. On iOS, error messages aren't announced.** 🔎
  - **Where:** `src/components/field/FieldMessages.tsx`. `accessibilityLiveRegion` only works on Android.
  - **Fix:** call `AccessibilityInfo.announceForAccessibility` when the error text changes.
  - **Test:** mock `AccessibilityInfo` and expect a call when an error appears.

- [x] **F13. The README's `getConstraints` example takes the minimum hour from the device zone.** 🔎
  - **Where:** `README.md`, the `getConstraints` example (Limits & greying). `ctx.now.getHours()` is device-zone time, while `ctx.today` is in `timeZone`. Also, `CreateConstraintsOptions.timeZone` and `now` are accepted but never read.
  - **Fix:** add `nowTime` (the time in `timeZone`) to `ConstraintContext` and use it in the example. Either use or remove the unused options.

- [x] **F14. The notices from Q1.** Whichever way Q1 is decided, make the README, CHANGELOG and style keys match what renders.

- [x] **F15. On-screen typing outside the limits.** Check first: the two reviews disagree.
  - **What one review found:** typing 22-10-2026 with `minDate` 23 Oct saves nothing and shows no error, so the field looks saved. The other says an error does show.
  - **Fix if it's real:** show `errorNotAllowed`, and reset the field to the saved value when it loses focus.

- [x] **F16. Open the calendar on a chosen month when there's no value.**
  - **What's missing:** with no value, the calendar opens on today's month, and there's no way to open it elsewhere without selecting something (for example a date-of-birth picker opening in 2000). `now` moves "today" and the limits too, so it isn't a substitute.
  - **Where:** `src/components/types.ts`, `DateTimePicker.tsx`, `src/components/calendar/Calendar.tsx` (`initialMonth`).
  - **Fix:** add `initialVisibleDate?: CalendarDate`. When there's no value, the calendar opens on that month (clamped to `yearRange` and the limits), with nothing selected.
  - **Test:** no value plus `initialVisibleDate` 2000-01-01 shows January 2000; with a value, the value's month wins.

## Minor

- [x] **M1. Range length.** Apply Q3 to `src/core/draft.ts` and `src/core/selectionRules.ts`. Also grey out the start day as an end when `minDays ≥ 1`, so tapping it again can't create a range that's too short.
- [x] **M2. Peer dependencies.** Set `react: ">=18"` and `react-native: ">=0.71"` (the code uses `gap` and `columnGap`) in `package.json`, and in the README's Install section.
- [x] **M3. Hijri month names with an extended locale.** `src/core/calendarSystem.ts` (~line 139) appends `-u-ca-islamic-umalqura` even to locales that already have `-u-…`, such as `'ar-SA-u-nu-arab'`, and falls back to English. Merge it into the existing extension instead.
- [x] **M4. Years below 100 and above 9999.**
  - In `calendarSystem.ts`, `Date.UTC` treats two-digit years as 19xx.
  - In `calendarDate.ts` and `src/adapters/iso.ts`, years above 9999 don't round-trip.
  - Fix: use `setUTCFullYear`, and clamp `yearRange` to 1–9999.
- [x] **M5. `normalizeDateFormat` accepts any separator.** `src/core/locale.ts` allows newlines, tabs and letters; allow only `/`, `-`, `.`, space and `,`. A `dateFormat` that isn't a string throws; treat it as missing.
- [x] **M6. The selected month chip can scroll out of view.** `src/components/calendar/CalendarHeader.tsx` assumes 60 pt chips; Hijri names and large text are wider, and RTL offsets are wrong. Measure the chips with `onLayout`.
- [x] **M7. README says the time boxes use `fontSizeLarge`.** The code uses `fontSizeMedium` (`src/components/time/timeStyles.ts`). Fix the README.
- [x] **M8. `wheelRowSelected` / `wheelRowDisabled` style the text, not the row.** `src/components/time/Wheel.tsx`. Apply them to the row View, and add `wheelTextSelected` / `wheelTextDisabled` for the text.
- [x] **M9. Screen-reader details.**
  - Day cells announce "selected" / "unavailable" twice (`DayGrid.tsx`, `DayCell.tsx`).
  - From and To segments read the same; add the end to the label (`SegmentedInput.tsx`).
  - The AM/PM switch has no disabled state.
  - The AM/PM options use `selected` rather than `checked` (`TypedTime.tsx`).
- [x] **M10. Android: one Backspace could delete twice.** `SegmentedInput.tsx` `onKeyPress` checks the latest state; if `onChangeText` arrived first, it also deletes in the previous box. Check the box's own rendered text instead. Low likelihood on number pads.
- [x] **M11. A new day's time can be off-step with a step that doesn't divide 60.** `DateTimePicker.tsx` `nowTime`: step 7 at 10:57 gives 11:03. Round within the hour, or accept only steps that divide 60 (1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60).
- [x] **M12. Doc comments that no longer match.** `DateTimePicker.tsx` (~line 68) and `types.ts` (`onChange`) say `onChange` fires only on Confirm or clear; it also fires on instant saves and on-screen typing. The README says `onClose` fires for Close, the backdrop and Back; it also fires after Confirm.
- [x] **M13. Template files in the example.** `example/.claude/settings.json` and `example/AGENTS.md` came from the Expo template; remove them if you don't want them in the repo.

## Commit plan

The order: commit what exists now on `main` and push it, make the fixes on `fix/pre-release-review`, merge with a pull request, then publish 0.1.0 from a GitHub release.

- **Version:** stays `0.1.0` (`package.json` and the CHANGELOG heading). The release tag must be `v0.1.0`. `npm publish` uses the version in `package.json`, not the tag.
- **Each commit:** run `corepack yarn lint && corepack yarn typecheck && corepack yarn test:tz` and `bash scripts/scrub-check.sh` before committing. Commit messages are just the message: no `Co-Authored-By` or other trailer lines.
- **Never committed:** `BUILD_PLAN.md`, `.plan/` and `.source/` (excluded in `.git/info/exclude`), plus `lib/` and `node_modules/` (in `.gitignore`).

### Step 1: the baseline on `main` (7 commits, 123 files)

Everything is staged as one block, so unstage it first, then add each group. Check `git status` after each step.

```sh
git rm -r --cached -q .
```

| # | Commit message | Files |
|---|---|---|
| 1 | `chore: scaffold library tooling` | `package.json`, `yarn.lock`, `.yarnrc.yml`, `.yarn/`, `tsconfig.json`, `tsconfig.build.json`, `babel.config.mjs`, `eslint.config.mjs`, `turbo.json`, `.editorconfig`, `.gitattributes`, `.gitignore`, `.nvmrc`, `.watchmanconfig` |
| 2 | `feat(core): calendar, time-zone, limits and typing logic` | `src/core/` (with its tests) |
| 3 | `feat(adapters): iso and utc-midnight value formats` | `src/adapters/` (with its tests) |
| 4 | `feat: DateTimePicker components, icons and theme` | `src/components/` (with its tests), `src/icons/`, `src/index.tsx` |
| 5 | `chore(example): Expo playground` | `example/` |
| 6 | `docs: README, changelog and project docs` | `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `LICENSE` |
| 7 | `ci: checks, release workflow and scrub check` | `.github/`, `scripts/scrub-check.sh` |

```sh
git add package.json yarn.lock .yarnrc.yml .yarn tsconfig.json tsconfig.build.json babel.config.mjs eslint.config.mjs turbo.json .editorconfig .gitattributes .gitignore .nvmrc .watchmanconfig
git commit -m "chore: scaffold library tooling"
git add src/core && git commit -m "feat(core): calendar, time-zone, limits and typing logic"
git add src/adapters && git commit -m "feat(adapters): iso and utc-midnight value formats"
git add src/components src/icons src/index.tsx && git commit -m "feat: DateTimePicker components, icons and theme"
git add example && git commit -m "chore(example): Expo playground"
git add README.md CHANGELOG.md CONTRIBUTING.md CODE_OF_CONDUCT.md LICENSE && git commit -m "docs: README, changelog and project docs"
git add .github scripts && git commit -m "ci: checks, release workflow and scrub check"
git status   # only FIXES.md left, untracked
```

Only the 7th commit is expected to build on its own; the earlier ones are an import split for readability.

### Step 2: push `main`

```sh
git push -u origin main
```

Wait for the CI workflow to pass on GitHub. If the repo is public, the code is visible from here on. Make it private until Step 6 if you'd rather nobody sees it yet.

### Step 3: the fix branch

```sh
git switch -c fix/pre-release-review
git add FIXES.md && git commit -m "docs: add pre-release fix list"
git push -u origin fix/pre-release-review
```

### Step 4: the fixes (one commit per area, each with its regression tests)

Settle Q1–Q3 before commit 4.2. Tick each item above as its commit lands, and push after each commit so CI checks it.

| # | Commit message | Items | Files |
|---|---|---|---|
| 4.1 | `docs: add pre-release fix list` | — | `FIXES.md` (done in Step 3) |
| 4.2 | `fix(core): limits search, empty 12-hour field, range length, edge inputs` | B1, F2, M1, M3, M4, M5, M11 | `src/core/constraints.ts`, `segments.ts`, `draft.ts`, `selectionRules.ts`, `calendarSystem.ts`, `calendarDate.ts`, `locale.ts`, `src/components/DateTimePicker.tsx` (`nowTime`), `src/core/__tests__/` |
| 4.3 | `fix(adapters): keep utc-midnight dates on the written day` | F1, M4 | `src/adapters/utcMidnight.ts`, `iso.ts`, `src/adapters/__tests__/` |
| 4.4 | `fix(picker): instant mode, Confirm and reopen state` | B2, B3, B4, F3, F4, F5, F6, F7, F13 (`nowTime` in the context), F16 | `src/components/DateTimePicker.tsx`, `hooks/usePickerDraft.ts`, `hooks/useKeyboardFold.ts`, `time/TimeRow.tsx`, `time/TimeRows.tsx`, `types.ts`, `src/components/__tests__/` |
| 4.5 | `fix(field): on-screen typing saves, focus hops, fast input` | B5, B6, B7, F8, F9, F10, F15, M10 | `field/ValueField.tsx`, `field/SegmentedInput.tsx`, `src/core/segmentEditor.ts`, `hooks/useTypedSegments.ts`, `DateTimePicker.tsx` (`onTriggerTyped`), tests |
| 4.6 | `fix(time): Backspace into the hour, wheel style keys` | F11, M8 | `time/TimeRow.tsx`, `time/TypedTime.tsx`, `time/Wheel.tsx`, `theme/styleKeys.ts`, tests |
| 4.7 | `fix(ios): Done toolbar on every box, announce errors` | B8, F12 | `field/KeyboardDoneBar.tsx` (removed), `field/SegmentedInput.tsx`, `time/TypedTime.tsx`, `field/FieldMessages.tsx`, tests |
| 4.8 | `feat: let renderTimeRow set the time` | Q2 | `types.ts`, `DateTimePicker.tsx`, tests, README (`renderTimeRow`) |
| 4.9 | `fix(a11y): day announcements, labels, month chip scroll` | M6, M9 | `calendar/DayGrid.tsx`, `calendar/DayCell.tsx`, `calendar/CalendarHeader.tsx`, `field/SegmentedInput.tsx`, `time/TypedTime.tsx`, tests |
| 4.10 | `docs: notices, constraints example, peer ranges` | Q1 / F14, F13, M2, M7, M12 | `README.md`, `CHANGELOG.md`, `package.json` (peer ranges), `types.ts` (comments), `theme/styleKeys.ts` |
| 4.11 | `chore(example): drop Expo template files` | M13 | `example/.claude/settings.json`, `example/AGENTS.md` (removed) |

For each commit:

```sh
corepack yarn lint && corepack yarn typecheck && corepack yarn test:tz && bash scripts/scrub-check.sh
git add <the files above>
git commit -m "<message>"
git push
```

### Step 5: check, then merge

1. Run every step in "When every item is done" below, including the device checks.
2. Last commit on the branch:

   ```sh
   git rm FIXES.md
   # set the date under "## [0.1.0]" in CHANGELOG.md to the release day
   git add CHANGELOG.md
   git commit -m "chore: remove fix list, set release date"
   git push
   ```

3. Open a pull request from `fix/pre-release-review` into `main`, wait for CI to pass, and merge.

### Step 6: publish 0.1.0

1. In the GitHub repo settings, add the secrets `NPM_TOKEN` (an npm automation token) and `SCRUB_PATTERNS` (the same terms as `.git/info/scrub-patterns`).
2. On `main`, publish a GitHub release with the tag `v0.1.0`. The Release workflow lints, tests, runs the scrub check, builds and runs `npm publish --provenance --access public`.
3. Check that https://www.npmjs.com/package/rn-calendar-time-picker shows 0.1.0, then install it in the app from npm instead of the local tarball.

## When every item is done

1. `corepack yarn lint && corepack yarn typecheck && corepack yarn test:tz && corepack yarn prepare && bash scripts/scrub-check.sh`
2. `npm pack --pack-destination .plan`, then repeat the RN 0.86 consumer check (type-check and runtime test).
3. On a device or simulator:
   - **iOS simulator** (`corepack yarn example ios`): every box shows Done (B8); typing and the keyboard over the time row.
   - **Android emulator with a docked keyboard:** in Device Manager, edit the AVD, turn off "Enable keyboard input" and cold-boot. Check the time row and Confirm stay above the keyboard.
   - **Android with a hardware keyboard:** burst-type the whole date-time (F9).
4. Update `CHANGELOG.md` for the fixes and set the release date.
5. Delete this file.

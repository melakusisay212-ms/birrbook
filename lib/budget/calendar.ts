import type { EthDate, Month } from "./types";

/** English transliterations of the 13 Ethiopian calendar months. */
export const MONTH_NAMES = [
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miyazya",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagume",
] as const;

/** Amharic names of the 13 Ethiopian calendar months. */
export const MONTH_AMHARIC = [
  "መስከረም",
  "ጥቅምት",
  "ኅዳር",
  "ታኅሣሥ",
  "ጥር",
  "የካቲት",
  "መጋቢት",
  "ሚያዝያ",
  "ግንቦት",
  "ሰኔ",
  "ሐምሌ",
  "ነሐሴ",
  "ጳጉሜን",
] as const;

/*
 * Julian day number of 1 Meskerem 1 (29 August 8 in the Julian calendar).
 * JDNs represent civil days here, matching the standard Gregorian-to-JDN
 * arithmetic below. Keeping conversion in integers avoids a September-date
 * shortcut that ceases to work outside a small modern-year window.
 */
const ETHIOPIAN_EPOCH_JDN = 1_724_221;
const MIN_YEAR = 1;
const MAX_YEAR = 9_999;

function isYearInRange(year: number): boolean {
  return Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR;
}

/** Ethiopian leap years are the years whose remainder is 3 when divided by 4. */
function isEthiopianLeapYear(year: number): boolean {
  return year % 4 === 3;
}

/** Returns the number of days in an Ethiopian calendar month, or 0 if invalid. */
export function daysInMonth(year: number, month: number): number {
  if (
    !isYearInRange(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 13
  ) {
    return 0;
  }
  if (month <= 12) return 30;
  return isEthiopianLeapYear(year) ? 6 : 5;
}

/** True only for real Ethiopian dates in the supported 0001–9999 range. */
export function isValidEthDate(date: EthDate): boolean {
  return (
    isYearInRange(date.year) &&
    Number.isInteger(date.month) &&
    Number.isInteger(date.day) &&
    date.day >= 1 &&
    date.day <= daysInMonth(date.year, date.month)
  );
}

function assertValidEthDate(date: EthDate): void {
  if (!isValidEthDate(date)) {
    throw new RangeError(
      `Invalid Ethiopian date: ${date.year}-${date.month}-${date.day}`,
    );
  }
}

function isGregorianLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function gregorianDaysInMonth(year: number, month: number): number {
  const lengths = [
    31,
    isGregorianLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return lengths[month - 1] ?? 0;
}

/** Proleptic Gregorian calendar date to (integer) Julian day number. */
function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const adjustedYear = year + 4_800 - a;
  const adjustedMonth = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * adjustedMonth + 2) / 5) +
    365 * adjustedYear +
    Math.floor(adjustedYear / 4) -
    Math.floor(adjustedYear / 100) +
    Math.floor(adjustedYear / 400) -
    32_045
  );
}

/** Integer JDN to a proleptic Gregorian calendar date. */
function jdnToGregorian(jdn: number): {
  year: number;
  month: number;
  day: number;
} {
  const a = jdn + 32_044;
  const b = Math.floor((4 * a + 3) / 146_097);
  const c = a - Math.floor((146_097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1_461);
  const e = c - Math.floor((1_461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: 100 * b + d - 4_800 + Math.floor(m / 10),
  };
}

function padYear(year: number): string {
  return String(year).padStart(4, "0");
}

function formatGregorian({
  year,
  month,
  day,
}: {
  year: number;
  month: number;
  day: number;
}): string {
  return `${padYear(year)}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Converts a validated Ethiopian date to a proleptic Gregorian ISO date. */
export function ethToISO(date: EthDate): string {
  assertValidEthDate(date);
  const jdn =
    ETHIOPIAN_EPOCH_JDN -
    1 +
    365 * (date.year - 1) +
    Math.floor(date.year / 4) +
    30 * (date.month - 1) +
    date.day;
  return formatGregorian(jdnToGregorian(jdn));
}

function parseISODate(iso: string): {
  year: number;
  month: number;
  day: number;
} {
  // ethToISO can legitimately create a five-digit Gregorian year for Ethiopian
  // year 9999, so accept four or more digits here. CSV imports impose YYYY-MM-DD.
  const match = /^(\d{4,})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new RangeError(`Invalid Gregorian ISO date: ${iso}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isSafeInteger(year) ||
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > gregorianDaysInMonth(year, month)
  ) {
    throw new RangeError(`Invalid Gregorian ISO date: ${iso}`);
  }
  return { year, month, day };
}

/** Converts a strict proleptic Gregorian ISO date to its Ethiopian calendar date. */
export function isoToEth(iso: string): EthDate {
  const gregorian = parseISODate(iso);
  const elapsed =
    gregorianToJdn(gregorian.year, gregorian.month, gregorian.day) -
    ETHIOPIAN_EPOCH_JDN;

  // Four Ethiopian years are always 1,461 days. This decomposition also works
  // for pre-epoch Gregorian input because Math.floor gives a non-negative rem.
  const cycles = Math.floor(elapsed / 1_461);
  const dayInCycle = elapsed - cycles * 1_461;
  let year = cycles * 4 + 1;
  let dayOfYear = dayInCycle;
  if (dayOfYear >= 1_096) {
    year += 3;
    dayOfYear -= 1_096;
  } else if (dayOfYear >= 730) {
    year += 2;
    dayOfYear -= 730;
  } else if (dayOfYear >= 365) {
    year += 1;
    dayOfYear -= 365;
  }

  return {
    year,
    month: Math.floor(dayOfYear / 30) + 1,
    day: (dayOfYear % 30) + 1,
  };
}

/** Ethiopian YYYY-MM key used for budget entries. */
export function monthKey(month: Month): string {
  if (
    !isYearInRange(month.year) ||
    !Number.isInteger(month.month) ||
    month.month < 1 ||
    month.month > 13
  ) {
    throw new RangeError(
      `Invalid Ethiopian month: ${month.year}-${month.month}`,
    );
  }
  return `${padYear(month.year)}-${String(month.month).padStart(2, "0")}`;
}

/** Moves an Ethiopian month by an integer offset, including Pagume as month 13. */
export function shiftMonth(month: Month, offset: number): Month {
  // Validate through monthKey so this module has one definition of a valid month.
  monthKey(month);
  if (!Number.isInteger(offset))
    throw new RangeError(`Month offset must be an integer: ${offset}`);
  const index = (month.year - 1) * 13 + (month.month - 1) + offset;
  const year = Math.floor(index / 13) + 1;
  const result = { year, month: (((index % 13) + 13) % 13) + 1 };
  monthKey(result);
  return result;
}

/** Formats a Gregorian ISO date as a readable Ethiopian calendar date. */
export function formatEthDate(iso: string): string {
  const date = isoToEth(iso);
  return `${MONTH_NAMES[date.month - 1]} ${date.day}, ${date.year}`;
}

function gregorianDisplay(iso: string): {
  year: number;
  month: string;
  day: number;
} {
  const { year, month, day } = parseISODate(iso);
  const names = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return { year, month: names[month - 1], day };
}

/** Human-readable inclusive Gregorian range covered by an Ethiopian month. */
export function gregorianRange(month: Month): string {
  const start = gregorianDisplay(ethToISO({ ...month, day: 1 }));
  const end = gregorianDisplay(
    ethToISO({ ...month, day: daysInMonth(month.year, month.month) }),
  );
  if (start.year === end.year) {
    if (start.month === end.month)
      return `${start.month} ${start.day}–${end.day}, ${start.year}`;
    return `${start.month} ${start.day} – ${end.month} ${end.day}, ${start.year}`;
  }
  return `${start.month} ${start.day}, ${start.year} – ${end.month} ${end.day}, ${end.year}`;
}

/** Ethiopian date for the current civil day in Africa/Addis_Ababa. */
export function todayEth(): EthDate {
  const now = new Date();
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Addis_Ababa",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const values = Object.fromEntries(
      parts
        .filter(
          (part) =>
            part.type === "year" ||
            part.type === "month" ||
            part.type === "day",
        )
        .map((part) => [part.type, part.value]),
    ) as Record<"year" | "month" | "day", string>;
    return isoToEth(`${values.year}-${values.month}-${values.day}`);
  } catch {
    // Useful on older JS engines that do not ship time-zone data. The local
    // civil date is a preferable fallback to UTC because this is a client app.
    return isoToEth(
      `${padYear(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    );
  }
}

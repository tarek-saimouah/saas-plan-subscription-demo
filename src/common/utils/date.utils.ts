/**
 * Returns the first timestamp of a day.
 * @param date - The date as Date object.
 * @returns First timestamp of a day as Date object.
 */
export function getStartOfDay(date: Date): Date {
  const startOfDay = new Date(date).setHours(0, 0, 0, 0);
  return new Date(startOfDay);
}

/**
 * Returns the last timestamp of a day.
 * @param date - The date as Date object.
 * @returns Last timestamp of a day as Date object.
 */
export function getEndOfDay(date: Date): Date {
  const endofDay = new Date(date).setHours(23, 59, 59, 999);
  return new Date(endofDay);
}

/**
 * Add days to Date object.
 * @param date - The date as Date object.
 * @param days - The number of days to add.
 * @returns Date object.
 */
export function addDaysToDate(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Returns the first day of month.
 * @param date - The date as Date object.
 * @returns First day of month as Date object.
 */
export function getFirstDateOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Returns the last day of month.
 * @param date - The date as Date object.
 * @returns Last day of month as Date object.
 */
export function getLastDateOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Returns array of dates between two Date objects.
 * @param startTime - The start time as a Date object.
 * @param endTime - The end time as a Date object.
 * @returns Array of Date objects between two Date objects.
 */
export function getDatesInRange(startDate: Date, endDate: Date): Date[] {
  const date = new Date(startDate.getTime());
  const dates: Date[] = [];

  while (date <= endDate) {
    dates.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }

  return dates;
}

/**
 * Calculates the duration in seconds between two Date objects.
 * @param startTime - The start time as a Date object.
 * @param endTime - The end time as a Date object.
 * @returns The duration in seconds as a number.
 */
export function getDurationInSeconds(startTime: Date, endTime: Date): number {
  // Calculate the difference in milliseconds
  const differenceInMilliseconds = endTime.getTime() - startTime.getTime();

  // Convert milliseconds to seconds
  const durationInSeconds = differenceInMilliseconds / 1000;

  return durationInSeconds;
}

/**
 * Calculates the duration in minutes between two Date objects.
 * @param startTime - The start time as a Date object.
 * @param endTime - The end time as a Date object.
 * @returns The duration in minutes as a number.
 */
export function getDurationInMinutes(startTime: Date, endTime: Date): number {
  // Calculate the difference in milliseconds
  const differenceInMilliseconds = endTime.getTime() - startTime.getTime();

  // Convert milliseconds to minutes
  const durationInMinutes = differenceInMilliseconds / (1000 * 60);

  return durationInMinutes;
}

/**
 * Calculates the duration in days between two Date objects.
 * @param startTime - The start time as a Date object.
 * @param endTime - The end time as a Date object.
 * @returns The duration in days as a number.
 */
export function getDurationInDays(startTime: Date, endTime: Date): number {
  // Calculate the difference in milliseconds
  const differenceInMilliseconds = endTime.getTime() - startTime.getTime();

  // Convert milliseconds to days
  const durationInDays = differenceInMilliseconds / (1000 * 60 * 60 * 24);

  return durationInDays;
}

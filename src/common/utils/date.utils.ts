export function getFirstDateOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getLastDateOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function getDatesInRange(startDate: Date, endDate: Date): Date[] {
  const date = new Date(startDate.getTime());
  const dates: Date[] = [];

  while (date <= endDate) {
    dates.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }

  return dates;
}

// Helper function to convert minutes since midnight to a Date object
export function convertMinutesToDate(
  minutes: number,
  referenceDate: Date,
  toUtc: boolean = false,
): Date {
  // Create a new date object based on the reference date
  const date = new Date(referenceDate);

  // If converting to UTC, adjust minutes by the current timezone offset
  if (toUtc) {
    const offset = date.getTimezoneOffset(); // Offset in minutes
    minutes += offset; // Adjust minutes to UTC
    if (minutes < 0) {
      minutes += 1440; // Ensure minutes are positive
    } else if (minutes >= 1440) {
      minutes -= 1440; // Wrap around if exceeding 24 hours
    }
  }

  // Set hours and minutes on the date object
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

// Helper function to convert Date to minutes since midnight
export function convertDateToMinutes(
  date: Date,
  isUtc: boolean = false,
): number {
  let minutes = date.getHours() * 60 + date.getMinutes(); // Calculate total minutes

  // If converting to UTC, adjust for the current timezone offset
  if (isUtc) {
    const offset = date.getTimezoneOffset(); // Offset in minutes
    minutes -= offset; // Adjust minutes to UTC
    if (minutes < 0) {
      minutes += 1440; // Ensure minutes are positive
    } else if (minutes >= 1440) {
      minutes -= 1440; // Wrap around if exceeding 24 hours
    }
  }

  return minutes; // Return total minutes
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

/**
 * Convert day time in minutes to 24 hours string format.
 * @param minutes - minutes as a number.
 * @returns 24 hours string format 'HH:MM'.
 */
export function convertMinutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  // Format with leading zeros if necessary
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

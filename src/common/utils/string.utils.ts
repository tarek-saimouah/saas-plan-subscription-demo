export function generateRandomNumericCode(length: number): string {
  const NUMBERS = '0123456789';

  let result = '';

  for (let i = 0; i < length; i++) {
    result += NUMBERS.charAt(Math.floor(Math.random() * NUMBERS.length));
  }

  if (result.length < length) {
    result = result.padEnd(length, '0');
  }

  // in (local, development, staging) env return 1111

  return process.env.NODE_ENV === 'local' ||
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'staging'
    ? new String('1').repeat(length)
    : result;
}

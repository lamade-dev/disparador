export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  let number = digits;

  if (number.startsWith('0')) number = number.slice(1);
  if (number.startsWith('55') && number.length >= 12) return number.length <= 13 ? number : null;

  if (number.length === 10) {
    const ddd = parseInt(number.slice(0, 2), 10);
    if (ddd >= 11 && ddd <= 99) {
      const localPart = number.slice(2);
      const firstDigit = parseInt(localPart[0], 10);
      if (firstDigit >= 6 && firstDigit <= 9) {
        number = number.slice(0, 2) + '9' + number.slice(2);
      }
    }
  }

  if (number.length === 11) {
    return '55' + number;
  }

  if (number.length === 8 || number.length === 9) {
    return null;
  }

  return null;
}

export function isValidPhone(phone: string): boolean {
  return /^55\d{10,11}$/.test(phone);
}

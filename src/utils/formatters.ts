export const formatCurrency = (amount: number, currency = 'USD'): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    // Fallback for unsupported currencies
    const symbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      MDL: 'L'
    };
    const symbol = symbols[currency] || currency;
    return `${symbol}${amount.toFixed(2)}`;
  }
};
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const datePart = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
  const weekdayPart = new Intl.DateTimeFormat('en-US', {
    weekday: 'short'
  }).format(date);
  return `${datePart} - ${weekdayPart}`;
};
export const formatShortDate = (dateString: string): string => {
  const date = new Date(dateString);
  const datePart = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date);
  const weekdayPart = new Intl.DateTimeFormat('en-US', {
    weekday: 'short'
  }).format(date);
  return `${datePart} - ${weekdayPart}`;
};
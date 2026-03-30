const creditFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCreditAmount(value: number) {
  return creditFormatter.format(value);
}

export function formatEuroAmount(value: number) {
  return `EUR ${decimalFormatter.format(value)}`;
}

export function formatEuroRatePerHundredCredits(
  totalPrice: number,
  credits: number,
) {
  if (credits <= 0) return formatEuroAmount(0);
  return formatEuroAmount((totalPrice / credits) * 100);
}

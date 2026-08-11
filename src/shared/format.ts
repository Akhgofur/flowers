export function formatSum(value: number): string {
  const roundedValue = Math.round(value);
  const sign = roundedValue < 0 ? "-" : "";
  const digits = Math.abs(roundedValue)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  return `${sign}${digits} so'm`;
}

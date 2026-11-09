export function calcMrp(costPrice, profitPct) {
  return Math.round(costPrice * (1 + profitPct / 100));
}

export function calcActualProfit(costPrice, mrp) {
  const profit = mrp - costPrice;
  const pct = costPrice > 0 ? (profit / costPrice) * 100 : 0;
  return { profit, pct };
}

export function calcPaymentStatus(payment, total) {
  const paid = payment.cash + payment.upi + payment.card;
  if (paid >= total) return "Paid";
  if (paid > 0) return "Partially Paid";
  return "Pending";
}

export type CurrencyCode = "VND";

export type Money = {
  amount: number;
  currency: CurrencyCode;
};

export function vnd(amount: number): Money {
  return { amount, currency: "VND" };
}

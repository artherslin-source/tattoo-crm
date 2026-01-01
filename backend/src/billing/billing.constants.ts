export const BILL_TYPE_APPOINTMENT = "APPOINTMENT" as const;
export const BILL_TYPE_WALK_IN = "WALK_IN" as const;
export const BILL_TYPE_OTHER = "OTHER" as const;
export const BILL_TYPE_STORED_VALUE_TOPUP = "STORED_VALUE_TOPUP" as const;

export type BillType =
  | typeof BILL_TYPE_APPOINTMENT
  | typeof BILL_TYPE_WALK_IN
  | typeof BILL_TYPE_OTHER
  | typeof BILL_TYPE_STORED_VALUE_TOPUP
  | (string & {});

export const PAYMENT_METHODS_CASHFLOW = ["CASH", "CARD", "TRANSFER"] as const;
export type CashflowPaymentMethod = (typeof PAYMENT_METHODS_CASHFLOW)[number];



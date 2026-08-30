export type DataViewState =
  | "loading"
  | "ready"
  | "empty"
  | "insufficient_data"
  | "error";

export type DataMaturity = "new" | "building" | "established";

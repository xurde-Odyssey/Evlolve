export type EvolveServerErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "INVALID_ACTIVITY"
  | "DUPLICATE_SUBMISSION"
  | "CAPACITY_EXCEEDED"
  | "COMMITMENT_LOCKED"
  | "ENGINE_CLOSEOUT_ALREADY_PROCESSED"
  | "SUPABASE_NOT_CONFIGURED";

export type EvolveServerActionResult<TData> =
  | {
      ok: true;
      data: TData;
    }
  | {
      ok: false;
      code: EvolveServerErrorCode;
      message: string;
    };

export function errorResult<TData>(
  code: EvolveServerErrorCode,
  message: string,
): EvolveServerActionResult<TData> {
  return {
    ok: false,
    code,
    message,
  };
}

export function successResult<TData>(data: TData): EvolveServerActionResult<TData> {
  return {
    ok: true,
    data,
  };
}

import type { ApiError, ApiFieldErrors } from "@/types/api";

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}

export function getApiFieldError(
  fieldErrors: ApiFieldErrors | undefined,
  field: string,
) {
  return fieldErrors?.[field]?.join(" ");
}

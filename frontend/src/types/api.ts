export type ApiFieldErrors = Record<string, string[]>;

export type ApiErrorData =
  | string
  | string[]
  | Record<string, unknown>
  | null
  | undefined;

export type ApiError = {
  status: number;
  message: string;
  data: ApiErrorData;
  fieldErrors?: ApiFieldErrors;
};

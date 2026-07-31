import axios from 'axios';

type ErrorMessageOptions = {
  fallback: string;
  unauthorized?: string;
  forbidden?: string;
  notFound?: string;
  conflict?: string;
  validation?: string;
};

const collectMessages = (value: unknown): string[] => {
  if (typeof value === 'string') {
    const message = value.trim();
    return message ? [message] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectMessages);
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(collectMessages);
  }

  return [];
};

export function getApiErrorMessage(
  error: unknown,
  options: ErrorMessageOptions,
): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error && error.message.trim()
      ? error.message
      : options.fallback;
  }

  const status = error.response?.status;
  const data = error.response?.data as
    | Record<string, unknown>
    | string
    | unknown[]
    | undefined;

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    const validationMessages = collectMessages(record.errors);

    if (validationMessages.length > 0) {
      return Array.from(new Set(validationMessages)).join('\n');
    }

    for (const key of ['message', 'error', 'detail', 'title']) {
      const messages = collectMessages(record[key]);
      if (messages.length > 0) {
        return messages[0];
      }
    }
  }

  const directMessages = collectMessages(data);
  if (directMessages.length > 0) {
    return directMessages[0];
  }

  if (error.code === 'ECONNABORTED') {
    return 'The SwiftCare service is taking longer than usual to start. Wait a moment and try again.';
  }

  if (!error.response) {
    return 'The SwiftCare service could not be reached. Check your internet connection; the free server may still be starting.';
  }

  if (status === 400 || status === 422) {
    return options.validation ?? 'Please review the information and try again.';
  }

  if (status === 401) {
    return options.unauthorized ?? 'Your session is no longer valid. Please sign in again.';
  }

  if (status === 403) {
    return options.forbidden ?? 'You do not have permission to perform this action.';
  }

  if (status === 404) {
    return options.notFound ?? 'The requested information could not be found.';
  }

  if (status === 409) {
    return options.conflict ?? 'This action conflicts with the current record state. Refresh and try again.';
  }

  if (status === 429) {
    return 'Too many requests were sent. Wait a moment and try again.';
  }

  if (status === 502 || status === 503 || status === 504) {
    return 'The SwiftCare service is starting up. Wait a moment and try again.';
  }

  if (status && status >= 500) {
    return 'The SwiftCare server encountered a problem. Please try again shortly.';
  }

  return options.fallback;
}

export function isAuthenticationError(error: unknown): boolean {
  return axios.isAxiosError(error) &&
    (error.response?.status === 401 || error.response?.status === 403);
}

export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}

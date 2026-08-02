import axios from 'axios';

type ErrorMessageOptions = {
  fallback: string;
  unauthorized?: string;
  forbidden?: string;
  notFound?: string;
  conflict?: string;
  validation?: string;
};

const HTML_PATTERN = /<!doctype\s+html|<html[\s>]|<head[\s>]|<body[\s>]/i;

const isUsableMessage = (value: string): boolean => {
  const trimmed = value.trim();

  return (
    trimmed.length > 0 &&
    trimmed.length <= 500 &&
    !HTML_PATTERN.test(trimmed)
  );
};

const collectMessages = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return isUsableMessage(value) ? [value.trim()] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectMessages);
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(
      collectMessages,
    );
  }

  return [];
};

export function getApiErrorMessage(
  error: unknown,
  options: ErrorMessageOptions,
): string {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error && isUsableMessage(error.message)) {
      return error.message.trim();
    }

    return options.fallback;
  }

  const status = error.response?.status;

  // Handle infrastructure failures before reading the response body.
  // Render often returns a full HTML page for 502/503 responses, and that
  // must never be shown inside the mobile UI.
  if (error.code === 'ECONNABORTED') {
    return 'The SwiftCare service is taking longer than usual to start. Keep this screen open, then try again.';
  }

  if (!error.response) {
    return 'The SwiftCare service could not be reached. Check your internet connection and try again.';
  }

  if (status === 502 || status === 503 || status === 504) {
    return 'The SwiftCare service is waking up. Please wait about a minute, then tap Try Again.';
  }

  if (status && status >= 500) {
    return 'The SwiftCare server encountered a temporary problem. Please try again shortly.';
  }

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

  return options.fallback;
}

export function isAuthenticationError(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    (error.response?.status === 401 || error.response?.status === 403)
  );
}

export function isNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;

  return (
    !error.response ||
    error.code === 'ECONNABORTED' ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

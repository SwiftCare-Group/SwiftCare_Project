import axios, { AxiosError } from 'axios';

export type BackendService =
  | 'identity'
  | 'appointment'
  | 'clinical'
  | 'symptom'
  | 'subscription'
  | 'notification';

type ServiceStartupState =
  | 'idle'
  | 'starting'
  | 'ready'
  | 'failed';

type StartupListener = (
  service: BackendService,
  state: ServiceStartupState,
) => void;

const API_PATH = '/api/v1';

const SERVICE_HEALTH_ENDPOINTS: Record<
  BackendService,
  string
> = {
  identity: '/system/identity-health',
  appointment: '/system/appointment-health',
  clinical: '/system/clinical-health',
  symptom: '/system/symptom-health',
  subscription: '/system/subscription-health',
  notification: '/system/notification-health',
};

const SERVICE_READY_TTL_MS = 2 * 60_000;
const HEALTH_REQUEST_TIMEOUT_MS = 180_000;
const RETRY_DELAY_MS = 20_000;
const RATE_LIMIT_DELAY_MS = 45_000;
const MAX_STARTUP_DURATION_MS = 5 * 60_000;

const readyUntil = new Map<BackendService, number>();

const startupPromises = new Map<
  BackendService,
  Promise<void>
>();

const listeners = new Set<StartupListener>();

let apiBaseUrl = '';

const wait = (milliseconds: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

const stripTrailingSlash = (value: string): string =>
  value.replace(/\/+$/, '');

export function configureServiceStartupManager(
  baseUrl: string,
): void {
  const normalized = stripTrailingSlash(baseUrl.trim());

  apiBaseUrl = normalized.endsWith(API_PATH)
    ? normalized
    : `${normalized}${API_PATH}`;
}

const healthClient = axios.create({
  timeout: HEALTH_REQUEST_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
    'Cache-Control': 'no-cache',
  },
});

function notifyListeners(
  service: BackendService,
  state: ServiceStartupState,
): void {
  listeners.forEach(listener => {
    try {
      listener(service, state);
    } catch {
      // Listener failures must not break service startup.
    }
  });
}

export function subscribeToServiceStartup(
  listener: StartupListener,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function isRecentlyReady(
  service: BackendService,
): boolean {
  const expiry = readyUntil.get(service);

  return expiry !== undefined && expiry > Date.now();
}

function markReady(service: BackendService): void {
  readyUntil.set(
    service,
    Date.now() + SERVICE_READY_TTL_MS,
  );

  notifyListeners(service, 'ready');
}

export function markServiceUnavailable(
  service: BackendService,
): void {
  readyUntil.delete(service);
  notifyListeners(service, 'idle');
}

function getRetryDelay(error: AxiosError): number {
  if (error.response?.status !== 429) {
    return RETRY_DELAY_MS;
  }

  const retryAfter =
    error.response.headers?.['retry-after'];

  const retryAfterSeconds = Number(retryAfter);

  if (
    Number.isFinite(retryAfterSeconds) &&
    retryAfterSeconds > 0
  ) {
    return retryAfterSeconds * 1000;
  }

  return RATE_LIMIT_DELAY_MS;
}

async function startService(
  service: BackendService,
): Promise<void> {
  if (!apiBaseUrl) {
    throw new Error(
      'Service startup manager has not been configured.',
    );
  }

  notifyListeners(service, 'starting');

  const startedAt = Date.now();
  const healthUrl =
    `${apiBaseUrl}${SERVICE_HEALTH_ENDPOINTS[service]}`;

  let attempt = 0;

  while (
    Date.now() - startedAt <
    MAX_STARTUP_DURATION_MS
  ) {
    attempt += 1;

    try {
      if (__DEV__) {
        console.log(
          `[Service startup] ${service}: checking readiness, attempt ${attempt}`,
        );
      }

      const response = await healthClient.get(
        healthUrl,
        {
          validateStatus: () => true,
        },
      );

      if (
        response.status >= 200 &&
        response.status < 300
      ) {
        markReady(service);

        if (__DEV__) {
          console.log(
            `[Service startup] ${service}: READY`,
          );
        }

        return;
      }

      if (__DEV__) {
        console.warn(
          `[Service startup] ${service}: health returned ${response.status}`,
        );
      }

      const delayMs =
        response.status === 429
          ? RATE_LIMIT_DELAY_MS
          : RETRY_DELAY_MS;

      await wait(delayMs);
    } catch (error) {
      const axiosError = error as AxiosError;
      const delayMs = getRetryDelay(axiosError);

      if (__DEV__) {
        console.warn(
          `[Service startup] ${service}: readiness check failed`,
          {
            status: axiosError.response?.status,
            code: axiosError.code,
            message: axiosError.message,
            retryInMs: delayMs,
          },
        );
      }

      await wait(delayMs);
    }
  }

  notifyListeners(service, 'failed');

  throw new Error(
    `The ${service} service did not start within five minutes.`,
  );
}

export async function ensureServiceStarted(
  service: BackendService,
): Promise<void> {
  if (isRecentlyReady(service)) {
    return;
  }

  const existingStartup =
    startupPromises.get(service);

  if (existingStartup) {
    await existingStartup;
    return;
  }

  const startupPromise = startService(service);

  startupPromises.set(service, startupPromise);

  try {
    await startupPromise;
  } finally {
    startupPromises.delete(service);
  }
}
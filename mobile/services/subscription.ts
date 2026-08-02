import axios from 'axios';

import api from './api';

export type PremiumEntitlement = {
  isPremium: boolean;
  status: string | null;
  expiresAt: string | null;
};

type SubscriptionStatusResponse = {
  status?: unknown;
  expiresAt?: unknown;
};

export async function getPremiumEntitlement(): Promise<PremiumEntitlement> {
  try {
    const response = await api.get<SubscriptionStatusResponse>(
      '/subscriptions/status'
    );
    const status =
      typeof response.data?.status === 'string'
        ? response.data.status.toUpperCase()
        : null;
    const expiresAt =
      typeof response.data?.expiresAt === 'string'
        ? response.data.expiresAt
        : null;
    return {
      // The status endpoint expires stale subscriptions on the server before
      // returning, avoiding device-clock and timezone errors in entitlement.
      isPremium: status === 'ACTIVE',
      status,
      expiresAt,
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return {
        isPremium: false,
        status: null,
        expiresAt: null,
      };
    }

    throw error;
  }
}
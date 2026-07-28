import type { Href } from 'expo-router';

export type SwiftCareRole =
  | 'PATIENT'
  | 'DOCTOR'
  | 'PHARMACIST'
  | 'LAB_TECHNICIAN'
  | 'ADMIN';

const VALID_ROLES = new Set<SwiftCareRole>([
  'PATIENT',
  'DOCTOR',
  'PHARMACIST',
  'LAB_TECHNICIAN',
  'ADMIN',
]);

export function normalizeRole(value: unknown): SwiftCareRole | null {
  const role = String(value ?? '').trim().toUpperCase() as SwiftCareRole;
  return VALID_ROLES.has(role) ? role : null;
}

export function homeRouteForRole(role: SwiftCareRole): Href {
  switch (role) {
    case 'ADMIN':
      return '/(admin)/dashboard';
    case 'DOCTOR':
      return '/(doctor)/queue';
    case 'PHARMACIST':
      return '/(pharmacist)/dispense';
    case 'LAB_TECHNICIAN':
      return '/(lab)/dashboard';
    case 'PATIENT':
    default:
      return '/(patient)/home';
  }
}

export function isStaffRole(role: SwiftCareRole): boolean {
  return role !== 'PATIENT';
}

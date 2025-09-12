export type LockProviderType = 'WEBHOOK' | 'DB' | 'RABBITMQ';

export interface LockEntity {
  id: string;
  name: string;
  providerType: LockProviderType;
  providerConfig: Record<string, any>;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LockGroup {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  members?: { id: string; lockId: string; groupId: string }[];
}

export interface CreateAccessLinkDto {
  note?: string;
  validFrom: string; // ISO
  validTo: string; // ISO
  allowedLockIds?: string[];
  allowedGroupIds?: string[];
  maxUses?: number;
  requirePin?: boolean;
}

export interface AccessLink {
  id: string;
  slug: string;
  validFrom: string;
  validTo: string;
  allowedLockIds: string[];
  allowedGroupIds: string[];
  maxUses?: number;
  usedCount: number;
  requirePin: boolean;
  revoked: boolean;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccessEvent {
  id: string;
  accessLinkId: string;
  lockId: string;
  action: 'OPEN' | 'STATUS';
  providerType: string;
  result: 'SUCCESS' | 'FAILED';
  message?: string;
  ip?: string;
  userAgent?: string;
  traceId?: string;
  createdAt: string;
}

// Public View
export interface PublicLockItem {
  id: string;
  name: string;
  state?: 'OPEN' | 'CLOSED' | 'UNKNOWN';
}

export interface PublicLocksResponse {
  locks: PublicLockItem[];
  validTo?: string; // ISO
  validFrom?: string; // ISO
}


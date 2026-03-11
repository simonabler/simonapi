export type SignpackStatus = 'UPLOADED' | 'SIGNED' | 'EXPIRED' | 'DELETED';

export interface SignpackMeta {
  id: string;
  status: SignpackStatus;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  hasSigned: boolean;
  destroyedAt: string | null;
}

export interface SignpackCreateResult {
  id: string;
  token: string;
  status: SignpackStatus;
  expiresAt: string | null;
  links: {
    meta: string;
    original: string;
    signed: string;
    sign: string;
    bundle: string;
    destroy: string;
  };
}

export interface SignpackSignResult {
  id: string;
  status: SignpackStatus;
}

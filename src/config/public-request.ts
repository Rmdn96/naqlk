export const PUBLIC_REQUEST_CONSENT_VERSION = "public-request-v1";
export const PUBLIC_REQUEST_DRAFT_VERSION = 2;
export const PUBLIC_REQUEST_MAX_FILES = 4;
export const PUBLIC_REQUEST_MAX_FILE_BYTES = 8 * 1024 * 1024;
export const PUBLIC_REQUEST_MAX_TOTAL_FILE_BYTES = 24 * 1024 * 1024;

export const PUBLIC_REQUEST_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type PublicRequestMimeType = (typeof PUBLIC_REQUEST_ALLOWED_MIME_TYPES)[number];

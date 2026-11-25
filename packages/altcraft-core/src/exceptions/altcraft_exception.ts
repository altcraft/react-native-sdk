/**
 * Exception thrown by the Altcraft SDK modules.
 *
 * Mirrors the native bridge reject codes (e.g. `SDK_ERROR`,
 * `ALTCRAFT_INIT_INVALID_CONFIG`, `ALTCRAFT_INIT_ERROR`).
 */
export class AltcraftException extends Error {
  /** Error code from the native bridge. */
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AltcraftException';
    this.code = code;
  }
}

/** Thrown when the SDK configuration is invalid. */
export const ALTCRAFT_INIT_INVALID_CONFIG = 'ALTCRAFT_INIT_INVALID_CONFIG';

/** Thrown when SDK initialization fails. */
export const ALTCRAFT_INIT_ERROR = 'ALTCRAFT_INIT_ERROR';

/** Generic native bridge error code. */
export const SDK_ERROR = 'SDK_ERROR';

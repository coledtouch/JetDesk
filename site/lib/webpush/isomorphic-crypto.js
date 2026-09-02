/* Workers/browser only: WebCrypto is always global here (vendored from @block65/webcrypto-web-push, MIT). */
export const crypto = globalThis.crypto;
export const CryptoKey = globalThis.CryptoKey;

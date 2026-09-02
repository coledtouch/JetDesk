/* base64 <-> ArrayBuffer without the base64-arraybuffer dependency */
function decodeBase64(str) {
    const bin = atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out.buffer;
}
function encodeBase64(arr) {
    const bytes = arr instanceof ArrayBuffer ? new Uint8Array(arr) : new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
}
export { decodeBase64, encodeBase64 };
export function decodeBase64Url(str) {
    return decodeBase64(str.replace(/-/g, '+').replace(/_/g, '/'));
}
export function encodeBase64Url(arr) {
    return encodeBase64(arr)
        .replace(/\//g, '_')
        .replace(/\+/g, '-')
        .replace(/=+$/, '');
}
export function base64UrlToObject(str) {
    return JSON.parse(new TextDecoder().decode(decodeBase64Url(str)));
}
export function objectToBase64Url(obj) {
    return encodeBase64Url(new TextEncoder().encode(JSON.stringify(obj)));
}

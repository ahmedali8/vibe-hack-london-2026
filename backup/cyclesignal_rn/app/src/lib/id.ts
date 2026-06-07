// Small URL-safe id generator. nanoid in RN requires a crypto polyfill; this avoids
// that native dependency while remaining collision-safe for a single-device app.
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-';

export function createId(size = 12): string {
  let id = '';
  for (let i = 0; i < size; i++) {
    id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return id;
}

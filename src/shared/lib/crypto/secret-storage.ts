import { load, type Store } from '@tauri-apps/plugin-store';

/**
 * Cifrado/descifrado de secretos (ej. API key de PeruAPI).
 *
 * ## Modelo de amenaza que mitigamos
 * - Usuario hace backup del `.sqlite` y lo sube a un repo / drive: el atacante
 *   ve `ciphertext+iv` en `app_settings.value`, sin la KEK no puede descifrar.
 * - Usuario comparte el archivo de DB con un contador sin pensarlo: igual,
 *   secreto no recuperable solo con el .sqlite.
 *
 * ## Lo que NO mitigamos (sería deshonesto decir lo contrario)
 * - Atacante con acceso completo al disco del usuario: la KEK vive en otro
 *   archivo del app data dir (`secrets.store`) — lo puede leer si está local.
 *   Para protegernos de ese caso haría falta un secret store del sistema
 *   operativo (Keychain en macOS, Credential Manager en Windows). Tauri ofrece
 *   `tauri-plugin-stronghold` pero requiere agregar dependencia Rust + un
 *   passphrase del usuario. Dejado para más adelante.
 * - Atacante con control del proceso en runtime: puede leer la KEK desde
 *   memoria. No hay defensa razonable contra esto en una webview.
 *
 * ## Diseño
 * - **KEK** (key encryption key): 256 bits aleatorios generados en el primer
 *   uso. Persistida vía `@tauri-apps/plugin-store` en un archivo separado del
 *   .sqlite. Nunca sale de la app.
 * - **Cifrado**: AES-GCM 256 con IV aleatorio de 12 bytes por secreto.
 * - **Formato persistido**: `"enc:v1:" + base64(iv) + ":" + base64(ciphertext)`.
 *   El prefijo permite distinguir secretos cifrados de valores legacy en
 *   plaintext y migrarlos en el primer acceso.
 */

const KEK_STORE_FILE = 'secrets.store';
const KEK_KEY = 'kek_v1_b64';
const ENC_PREFIX = 'enc:v1:';

let cachedKey: CryptoKey | null = null;
let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = load(KEK_STORE_FILE, { autoSave: true, defaults: {} });
  }
  return storePromise;
}

function bytesToB64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function getOrCreateKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const store = await getStore();
  let kekB64 = await store.get<string>(KEK_KEY);

  if (!kekB64) {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    kekB64 = bytesToB64(raw);
    await store.set(KEK_KEY, kekB64);
  }

  const keyBytes = b64ToBytes(kekB64);
  cachedKey = await crypto.subtle.importKey(
    'raw',
    keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
  return cachedKey;
}

/**
 * Cifra un string. Devuelve un blob auto-contenido (prefijo + iv + ciphertext)
 * que se puede pasar tal cual a `decryptSecret`.
 */
export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ptBytes = new TextEncoder().encode(plaintext);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, ptBytes as BufferSource);
  return `${ENC_PREFIX}${bytesToB64(iv)}:${bytesToB64(new Uint8Array(ct))}`;
}

/**
 * Descifra un blob generado por `encryptSecret`. Si el input no tiene el prefijo
 * (valor legacy en plaintext), lo devuelve tal cual para que el caller migre.
 */
export async function decryptSecret(blob: string): Promise<string> {
  if (!blob.startsWith(ENC_PREFIX)) {
    // Legacy: el valor está sin cifrar (DB pre-migración). Devolverlo para que el
    // caller lo re-encripte y persista.
    return blob;
  }
  // Formato: "enc:v1:<ivB64>:<ctB64>" — 4 partes al hacer split.
  const parts = blob.split(':');
  if (parts.length !== 4 || parts[0] !== 'enc' || parts[1] !== 'v1') {
    throw new Error('Secreto cifrado con formato inválido');
  }
  const ivB64 = parts[2];
  const ctB64 = parts[3];
  const key = await getOrCreateKey();
  const ivBytes = b64ToBytes(ivB64);
  const ctBytes = b64ToBytes(ctB64);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes as BufferSource },
    key,
    ctBytes as BufferSource
  );
  return new TextDecoder().decode(pt);
}

/** True si el blob ya está cifrado. */
export function isEncrypted(blob: string): boolean {
  return blob.startsWith(ENC_PREFIX);
}

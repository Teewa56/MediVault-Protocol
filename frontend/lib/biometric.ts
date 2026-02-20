import { keccak256, toBytes, toHex } from "viem";

/**
 * Generates a biometric commitment hash using WebAuthn.
 *
 * Flow:
 * 1. Create a WebAuthn credential (or get assertion from existing one)
 * 2. Extract the credential ID (stable per device/user)
 * 3. keccak256 hash it → bytes32 commitment stored on-chain
 *
 * The raw biometric never leaves the device — only the hash goes on-chain.
 */

export type BiometricResult = {
  commitment: `0x${string}`;  // bytes32 for on-chain storage
  credentialId: string;        // base64url, stored locally for future assertions
};

/**
 * Register a new biometric credential and return the on-chain commitment.
 * Call this once during vault setup.
 */
export async function registerBiometric(
    userId: string,
    userName: string
): Promise<BiometricResult> {
    if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn is not supported in this browser.");
    }

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = toBytes(userId as `0x${string}`).slice(0, 32);

    const credential = await navigator.credentials.create({
        publicKey: {
        challenge,
        rp: { name: "MediVault Protocol", id: window.location.hostname },
        user: {
            id: userIdBytes,
            name: userName,
            displayName: userName,
        },
        pubKeyCredParams: [
            { alg: -7,   type: "public-key" }, // ES256
            { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
            userVerification: "required",
            residentKey: "preferred",
        },
        timeout: 60000,
        },
    }) as PublicKeyCredential | null;

    if (!credential) throw new Error("Biometric registration cancelled.");

    const credentialId = bufferToBase64Url(credential.rawId);
    const commitment = deriveCommitment(credential.rawId);

    return { commitment, credentialId };
}

/**
 * Authenticate with an existing biometric credential.
 * Used by hospital terminal to generate the hash for payment verification.
 */
export async function authenticateBiometric(
    credentialId: string
): Promise<`0x${string}`> {
    if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn is not supported in this browser.");
    }

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credentialIdBuffer = base64UrlToBuffer(credentialId);

    const assertion = await navigator.credentials.get({
        publicKey: {
        challenge,
        allowCredentials: [
            {
            id: credentialIdBuffer,
            type: "public-key",
            },
        ],
        userVerification: "required",
        timeout: 60000,
        },
    }) as PublicKeyCredential | null;

    if (!assertion) throw new Error("Biometric authentication cancelled.");

    return deriveCommitment(assertion.rawId);
}

/**
 * Derives a deterministic bytes32 commitment from a WebAuthn credential ID.
 * keccak256(credentialId) — same input always yields same hash.
 */
function deriveCommitment(rawId: ArrayBuffer): `0x${string}` {
    const bytes = new Uint8Array(rawId);
    return keccak256(toHex(bytes));
}


function bufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let str = "";
    bytes.forEach((b) => (str += String.fromCharCode(b)));
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        buffer[i] = binary.charCodeAt(i);
    }
    return buffer.buffer;
}

/**
 * Check if WebAuthn is available in the current environment.
 */
export function isBiometricAvailable(): boolean {
    return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

/**
 * Formats a bytes32 commitment for display (truncated).
 */
export function formatCommitment(commitment: `0x${string}`): string {
    return `${commitment.slice(0, 10)}...${commitment.slice(-8)}`;
}

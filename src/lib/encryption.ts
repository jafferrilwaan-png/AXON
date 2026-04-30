import CryptoJS from 'crypto-js';

// Fallback for development, should be VITE_AXON_ENCRYPTION_KEY in production
const SECRET_KEY = import.meta.env.VITE_AXON_ENCRYPTION_KEY || 'axon-secure-vault-key-2026';

export const encryptPatientData = (data: any): string | null => {
  try {
    const jsonString = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
  } catch (error) {
    console.error("Encryption failed:", error);
    return null;
  }
};

export const decryptPatientData = (ciphertext: string): any | null => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error("Decryption failed. Invalid key or corrupted data.");
    return null;
  }
};

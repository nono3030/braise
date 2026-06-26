import crypto from 'crypto';

// La clé de chiffrement doit faire 32 octets (256 bits)
// En production, cette clé DOIT être stockée dans les variables d'environnement (.env)
// Par exemple: process.env.ENCRYPTION_KEY
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'braise-super-secret-key-mustbe32'; 
const IV_LENGTH = 16; // Pour AES, c'est toujours 16

if (ENCRYPTION_KEY.length !== 32) {
    throw new Error('ENCRYPTION_KEY doit comporter exactement 32 caractères');
}

/**
 * Chiffre un mot de passe en texte clair avec AES-256-CBC
 */
export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // Retourne le vecteur d'initialisation et le texte chiffré séparés par ":"
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Déchiffre un mot de passe chiffré
 */
export function decrypt(text: string): string {
    const textParts = text.split(':');
    const ivHex = textParts.shift();
    if (!ivHex) throw new Error('Format invalide');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

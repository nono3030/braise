import 'dotenv/config'; // Charge les variables du fichier .env
import { sendEmail } from './workers/smtp_worker';
import { processImapInbox } from './workers/imap_worker';
import { encrypt } from './utils/encryption';
import crypto from 'crypto';

/**
 * ============================================================================
 * CONFIGURATION DU POC (Proof of Concept)
 * Insérez vos identifiants de test ici pour valider l'envoi et la réception.
 * ============================================================================
 */
const TEST_SENDER_EMAIL = 'arnaud.lavesque@propulse-lab.com'; // <-- CHANGEZ ICI
const TEST_SENDER_APP_PASSWORD = 'pxec bjjn rvgt wuio'; // <-- CHANGEZ ICI

const TEST_RECEIVER_EMAIL = 'arnaud.lavesque@gmail.com'; // <-- CHANGEZ ICI
const TEST_RECEIVER_APP_PASSWORD = 'idqz bwvm sjrm haip'; // <-- CHANGEZ ICI

// L'interaction ID simule ce qui serait généré par la base de données
const interactionId = 'test-004-ai';

async function runPOC() {
    console.log('--- Démarrage du POC Braise ---');
    console.log('Clé API chargée :', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 4) + '...' : 'NON DÉFINIE');

    try {
        // 1. Chiffrement des mots de passe (comme s'ils venaient de la base de données)
        console.log('Chiffrement des mots de passe d\'application...');
        const encryptedSenderPass = encrypt(TEST_SENDER_APP_PASSWORD);
        const encryptedReceiverPass = encrypt(TEST_RECEIVER_APP_PASSWORD);

        // 2. Test SMTP (Envoi d'un email avec le Header)
        console.log('\n--- 1. Test SMTP ---');
        console.log(`Envoi d'un email de ${TEST_SENDER_EMAIL} vers ${TEST_RECEIVER_EMAIL}`);
        const smtpResult = await sendEmail({
            senderEmail: TEST_SENDER_EMAIL,
            senderAppPasswordEncrypted: encryptedSenderPass,
            receiverEmail: TEST_RECEIVER_EMAIL,
            interactionId: interactionId
            // subject et body ne sont pas fournis, l'IA les générera
        });
        console.log('Succès SMTP ! ID du message:', smtpResult.messageId);

        // Attendre un peu que l'email arrive
        console.log('\nAttente de 5 secondes avant de vérifier l\'IMAP...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 3. Test IMAP (Recherche et lecture)
        console.log('\n--- 2. Test IMAP ---');
        console.log(`Vérification de la boîte de réception de ${TEST_RECEIVER_EMAIL}`);
        await processImapInbox({
            receiverEmail: TEST_RECEIVER_EMAIL,
            receiverAppPasswordEncrypted: encryptedReceiverPass,
            interactionId: interactionId
        });
        console.log('Succès IMAP ! POC terminé.');

    } catch (error) {
        console.error('\nERREUR LORS DU POC:', error);
    }
}

// Exécuter le POC
runPOC();

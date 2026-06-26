import { ImapFlow } from 'imapflow';
import { Worker, Job } from 'bullmq';
import { decrypt } from '../utils/encryption';
import { generateReplyEmail } from '../utils/ai_generator';
import { sendEmail } from './smtp_worker';

// Interface pour les données du worker IMAP
export interface ImapJobData {
    receiverEmail: string;
    receiverAppPasswordEncrypted: string;
    interactionId: string; // L'ID P2P spécifique à chercher
}

const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

/**
 * Connecte en IMAP, cherche l'email spécifique et le déplace.
 */
export async function processImapInbox(data: ImapJobData) {
    const appPassword = decrypt(data.receiverAppPasswordEncrypted);

    // Configuration IMAP générique
    const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: {
            user: data.receiverEmail,
            pass: appPassword,
        },
        logger: false,
        // Pas de socketTimeout custom — le défaut imapflow (illimité) est plus sûr
        // car les commandes IMAP sur Gmail peuvent prendre du temps
    });

    try {
        await client.connect();

        // Dossiers à fouiller : INBOX et Spam
        const foldersToSearch = ['INBOX', '[Gmail]/Spam', 'Spam', 'Junk'];
        let emailFound = false;
        // Données pour la réponse éventuelle (envoyée APRÈS déconnexion IMAP)
        let pendingReply: { fromEmail: string; subject: string; messageId: string } | null = null;

        for (const folder of foldersToSearch) {
            if (emailFound) break;

            try {
                const lock = await client.getMailboxLock(folder);
                try {
                    console.log(`[IMAP Worker] Recherche dans ${folder} (messages des 15 dernières min)...`);

                    // Étape 1 : SEARCH SINCE (rapide, filtré par date) → liste d'UIDs récents
                    const since = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes
                    const recentUids = await client.search({ since }, { uid: true });

                    if (!recentUids || recentUids.length === 0) {
                        console.log(`[IMAP Worker] Aucun message récent dans ${folder}.`);
                    }

                    // Étape 2 : fetchOne sur chaque UID récent pour vérifier le header X-Braise-ID
                    let targetUid: number | null = null;
                    for (const uid of (recentUids || [])) {
                        const msg = await client.fetchOne(
                            String(uid),
                            { headers: ['x-braise-id', 'message-id', 'subject', 'from'] },
                            { uid: true }
                        );
                        const raw = msg?.headers instanceof Buffer
                            ? msg.headers.toString('utf-8')
                            : String(msg?.headers || '');
                        if (raw.toLowerCase().includes(data.interactionId.toLowerCase())) {
                            targetUid = uid;
                            break;
                        }
                    }

                    if (targetUid !== null) {
                        console.log(`[IMAP Worker] ✅ Email trouvé ! (Folder: ${folder}, UID: ${targetUid}, ID: ${data.interactionId})`);

                        // On a déjà le msg avec tous les headers depuis le loop ci-dessus
                        // fetchOne à nouveau pour avoir message-id, subject, from proprement
                        const msg2 = await client.fetchOne(
                            String(targetUid),
                            { headers: ['message-id', 'subject', 'from'] },
                            { uid: true }
                        );

                        // Parser les headers (Buffer brut)
                        const rawHeaders = msg2?.headers instanceof Buffer
                            ? msg2.headers.toString('utf-8')
                            : String(msg2?.headers || '');

                        const getHeader = (raw: string, name: string): string => {
                            const match = raw.match(new RegExp(`^${name}:\\s*(.+)`, 'im'));
                            return match ? match[1].trim() : '';
                        };

                        const messageId = getHeader(rawHeaders, 'message-id');
                        const subject   = getHeader(rawHeaders, 'subject') || 'Re: ';
                        const fromStr   = getHeader(rawHeaders, 'from');
                        const fromEmailMatch = fromStr.match(/<([^>]+)>/) || [null, fromStr.trim()];
                        const fromEmail = fromEmailMatch[1] || fromStr.trim();

                        // Appliquer les flags via l'UID (STORE UID)
                        const flagsToAdd = ['\\Seen'];
                        const isFlagged = Math.random() < 0.5;
                        if (isFlagged) flagsToAdd.push('\\Flagged');

                        await client.messageFlagsAdd(String(targetUid), flagsToAdd, { uid: true });
                        console.log(`[IMAP Worker] ✅ Action: Marqué 'Lu' (Seen)${isFlagged ? " et 'Important' (Flagged)" : ""}.`);
                        console.log(`[IMAP Worker] 📋 Message-ID: ${messageId || '(non trouvé)'}`);
                        console.log(`[IMAP Worker] 📋 Sujet: ${subject}`);
                        console.log(`[IMAP Worker] 📋 De: ${fromEmail || '(non trouvé)'}`);

                        // Planifier la réponse éventuelle (30%) — envoyée APRÈS logout IMAP
                        if (Math.random() < 0.3 && fromEmail) {
                            pendingReply = { fromEmail, subject, messageId };
                            console.log(`[IMAP Worker] 🎲 Réponse planifiée vers ${fromEmail} (sera envoyée après déconnexion IMAP).`);
                        }

                        emailFound = true;
                    } else {
                        console.log(`[IMAP Worker] ❌ Introuvable dans ${folder}.`);
                    }
                } finally {
                    lock.release();
                }
            } catch (err) {
                // Ignore si le dossier n'existe pas (ex: 'Spam' vs '[Gmail]/Spam')
            }
        }

        if (!emailFound) {
            console.log(`[IMAP Worker] ❌ L'email avec l'ID ${data.interactionId} est introuvable après la recherche complète.`);
        }

        await client.logout();

        // Envoi de la réponse APRÈS déconnexion IMAP (évite le timeout croisé)
        if (pendingReply) {
            try {
                const replyContent = await generateReplyEmail(pendingReply.subject);
                await sendEmail({
                    senderEmail: data.receiverEmail,
                    senderAppPasswordEncrypted: data.receiverAppPasswordEncrypted,
                    receiverEmail: pendingReply.fromEmail,
                    interactionId: data.interactionId + '-reply',
                    subject: replyContent.subject,
                    body: replyContent.body,
                    inReplyTo: pendingReply.messageId,
                    references: pendingReply.messageId,
                });
                console.log(`[IMAP Worker] ✅ Réponse envoyée avec succès (Thread créé).`);
            } catch (replyErr) {
                console.error(`[IMAP Worker] Erreur lors de l'envoi de la réponse:`, replyErr);
            }
        }

        return emailFound;
    } catch (error) {
        console.error('[IMAP Worker] Erreur:', error);
        throw error;
    }
}

// Initialisation du Worker BullMQ (désactivé si on lance juste le POC)
export let imapWorker: Worker | null = null;
if (process.env.START_WORKERS === 'true') {
    imapWorker = new Worker('imapQueue', async (job: Job<ImapJobData>) => {
        console.log(`[IMAP Worker] Traitement du job ${job.id} pour ${job.data.receiverEmail}...`);
        try {
            const result = await processImapInbox(job.data);
            console.log(`[IMAP Worker] Job terminé avec succès.`);
            return result;
        } catch (error) {
            throw error;
        }
    }, { connection });
    console.log('[IMAP Worker] Démarré et en attente de jobs...');
}

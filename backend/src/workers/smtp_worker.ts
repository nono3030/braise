import nodemailer from 'nodemailer';
import { Worker, Job } from 'bullmq';
import { decrypt } from '../utils/encryption';
import { generateNewEmail } from '../utils/ai_generator';

// Interface pour les données attendues par le worker SMTP
export interface SmtpJobData {
    senderEmail: string;
    senderAppPasswordEncrypted: string;
    receiverEmail: string;
    interactionId: string;
    senderTheme?: string;
    subject?: string;
    body?: string;
    inReplyTo?: string;
    references?: string;
}

// Configuration de la file d'attente (nécessite Redis)
const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

/**
 * Envoie un email en injectant le header personnalisé X-Braise-ID.
 */
export async function sendEmail(data: SmtpJobData) {
    const appPassword = decrypt(data.senderAppPasswordEncrypted);

    // Configuration SMTP générique (Gmail, Outlook, etc.)
    // À ajuster selon le fournisseur via une logique de détection
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        connectionTimeout: 20_000,
        auth: {
            user: data.senderEmail,
            pass: appPassword,
        },
    });

    let finalSubject = data.subject;
    let finalBody = data.body;

    // Si on n'a pas fourni de contenu (ce qui est le cas pour un nouvel email), on le génère avec l'IA
    if (!finalSubject || !finalBody) {
        const generated = await generateNewEmail(data.senderTheme);
        finalSubject = generated.subject;
        finalBody = generated.body;
    }

    const firstNames = ['Thomas', 'Marie', 'Nicolas', 'Camille', 'Julien', 'Sophie', 'Pierre', 'Claire', 'Antoine', 'Laura', 'Maxime', 'Lucie'];
    const lastNames  = ['Martin', 'Bernard', 'Dubois', 'Robert', 'Richard', 'Simon', 'Laurent', 'Michel', 'Garcia', 'David', 'Petit', 'Moreau'];
    const displayName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;

    const info = await transporter.sendMail({
        from: `"${displayName}" <${data.senderEmail}>`,
        to: data.receiverEmail,
        subject: finalSubject,
        text: finalBody,
        inReplyTo: data.inReplyTo,
        references: data.references,
        headers: {
            // Le header essentiel pour l'identification P2P
            'X-Braise-ID': data.interactionId,
        },
    });

    return info;
}

// Initialisation du Worker BullMQ (désactivé si on lance juste le POC)
export let smtpWorker: Worker | null = null;
if (process.env.START_WORKERS === 'true') {
    smtpWorker = new Worker('smtpQueue', async (job: Job<SmtpJobData>) => {
        console.log(`[SMTP Worker] Traitement du job ${job.id} pour ${job.data.senderEmail}...`);
        try {
            const info = await sendEmail(job.data);
            console.log(`[SMTP Worker] Email envoyé avec succès: ${info.messageId}`);
            return info;
        } catch (error) {
            console.error(`[SMTP Worker] Erreur d'envoi d'email:`, error);
            throw error; // BullMQ gérera les retentatives en cas d'échec
        }
    }, { connection });
    console.log('[SMTP Worker] Démarré et en attente de jobs...');
}

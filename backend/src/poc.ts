import 'dotenv/config';
import { sendEmail } from './workers/smtp_worker';
import { processImapInbox } from './workers/imap_worker';
import { supabase, Account } from './utils/database';

async function runCycle() {
    console.log('--- Démarrage du cycle Braise ---');

    // 1. Récupérer les comptes actifs depuis Supabase
    const { data: accounts, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('status', 'active');

    if (error) {
        console.error('Erreur Supabase:', error.message);
        return;
    }

    if (!accounts || accounts.length < 2) {
        console.error(`❌ Il faut au moins 2 comptes actifs pour lancer un cycle. Trouvé : ${accounts?.length ?? 0}`);
        return;
    }

    console.log(`✅ ${accounts.length} comptes actifs trouvés.`);

    // 2. Former des paires aléatoires (sender ≠ receiver)
    const shuffled = [...accounts].sort(() => Math.random() - 0.5) as Account[];
    const sender   = shuffled[0];
    const receiver = shuffled[1];

    console.log(`📨 Paire : ${sender.email} → ${receiver.email}`);

    // 3. Créer l'interaction en DB avec status "pending" → récupérer l'ID
    const { data: interaction, error: insertError } = await supabase
        .from('interactions')
        .insert({ sender_id: sender.id, receiver_id: receiver.id, status_detected: 'pending' })
        .select('id')
        .single();

    if (insertError || !interaction) {
        console.error('Erreur création interaction:', insertError?.message);
        return;
    }

    const interactionId: string = interaction.id;
    console.log(`🔑 Interaction ID (= X-Braise-ID) : ${interactionId}`);

    try {
        // 4. Envoi SMTP — les mots de passe sont déjà chiffrés dans la DB
        console.log('\n--- SMTP ---');
        const smtpResult = await sendEmail({
            senderEmail: sender.email,
            senderAppPasswordEncrypted: sender.app_password_encrypted,
            receiverEmail: receiver.email,
            interactionId,
        });
        console.log('✅ Email envoyé. MessageID:', smtpResult.messageId);

        // 5. Incrémenter le compteur journalier de l'expéditeur
        await supabase
            .from('accounts')
            .update({ current_daily_emails: sender.current_daily_emails + 1 })
            .eq('id', sender.id);

        // 6. Attendre que l'email arrive (30 s en prod, 5 s en dev)
        const waitMs = parseInt(process.env.IMAP_WAIT_MS ?? '5000');
        console.log(`\nAttente de ${waitMs / 1000} s avant vérification IMAP…`);
        await new Promise(resolve => setTimeout(resolve, waitMs));

        // 7. Vérification IMAP
        console.log('\n--- IMAP ---');
        const result = await processImapInbox({
            receiverEmail: receiver.email,
            receiverAppPasswordEncrypted: receiver.app_password_encrypted,
            interactionId,
        });

        // 8. Déterminer le statut final
        let statusDetected: 'Inbox' | 'Spam' | 'NotFound' = 'NotFound';
        if (result.found) {
            const f = result.folder?.toLowerCase() ?? '';
            statusDetected = (f.includes('spam') || f.includes('junk')) ? 'Spam' : 'Inbox';
        }

        console.log(`\n📊 Résultat : ${statusDetected} (dossier: ${result.folder ?? 'introuvable'})`);

        // 9. Mettre à jour l'interaction en DB
        await supabase
            .from('interactions')
            .update({ status_detected: statusDetected })
            .eq('id', interactionId);

        console.log('✅ Interaction mise à jour en base. Cycle terminé.');

    } catch (err) {
        // En cas d'erreur, marquer l'interaction comme NotFound
        await supabase
            .from('interactions')
            .update({ status_detected: 'NotFound' })
            .eq('id', interactionId);

        console.error('\n❌ Erreur pendant le cycle:', err);
    }
}

runCycle();

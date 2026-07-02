import 'dotenv/config';
import { setDefaultResultOrder } from 'dns';
setDefaultResultOrder('ipv4first'); // Railway ne supporte pas IPv6 sortant
import { supabase, Account } from './utils/database';
import { sendEmail } from './workers/smtp_worker';
import { processImapInbox } from './workers/imap_worker';

const HOUR_START = 8;
const HOUR_END   = 22;
const IMAP_WAIT  = parseInt(process.env.IMAP_WAIT_MS ?? '90000'); // 90s par défaut en prod

// ---------- Calculs ----------

function dailyVolume(account: Account, startVol: number, increment: number, maxVol: number): number {
    const dayNum = Math.max(0, Math.floor(
        (Date.now() - new Date(account.created_at).getTime()) / 86_400_000
    ));
    // Plafond = min(paramètre warmup, limite du compte)
    const cap = Math.min(maxVol, account.max_daily_emails);
    return Math.min(startVol + increment * dayNum, cap);
}

const MIN_SPACING_MS = 8 * 60_000; // 8 min minimum entre deux envois

function getWindow(): { winStart: number; winEnd: number; inWindow: boolean } {
    const now = Date.now();
    const winStart = (() => {
        const d = new Date();
        d.setHours(HOUR_START, 0, 0, 0);
        return Math.max(d.getTime(), now + 5_000);
    })();
    const winEnd = (() => {
        const d = new Date();
        d.setHours(HOUR_END, 0, 0, 0);
        return d.getTime();
    })();
    return { winStart, winEnd, inWindow: winStart < winEnd };
}

// Répartit n jobs uniformément dans la fenêtre restante avec jitter
function spreadDelays(n: number, winStart: number, winEnd: number): number[] {
    const now      = Date.now();
    const duration = winEnd - winStart;
    const slot     = duration / n;
    return Array.from({ length: n }, (_, i) => {
        const base   = winStart + slot * i + slot * 0.1;
        const jitter = Math.random() * slot * 0.8;
        return Math.round(base + jitter - now);
    });
}

// ---------- Exécution d'un cycle ----------

async function runCycle(sender: Account, receiver: Account): Promise<void> {
    console.log(`\n[Worker] 🔥 ${sender.email} → ${receiver.email}`);

    const { data: interaction, error: ie } = await supabase
        .from('interactions')
        .insert({ sender_id: sender.id, receiver_id: receiver.id, status_detected: 'pending' })
        .select('id')
        .single();

    if (ie || !interaction) throw new Error(`Interaction insert: ${ie?.message}`);
    const interactionId: string = interaction.id;

    // SMTP
    let mail: Awaited<ReturnType<typeof sendEmail>>;
    try {
        mail = await sendEmail({
            senderEmail:                sender.email,
            senderAppPasswordEncrypted: sender.app_password_encrypted,
            receiverEmail:              receiver.email,
            interactionId,
            senderTheme:                sender.theme,
        });
        console.log(`[Worker] ✅ SMTP: ${mail.messageId}`);
    } catch (smtpErr: any) {
        console.warn(`[Worker] ⚠️  SMTP échoué (${smtpErr.message}) — interaction annulée.`);
        await supabase.from('interactions').update({ status_detected: 'NotFound' }).eq('id', interactionId);
        return;
    }

    // Incrémenter compteur journalier
    const { data: acc } = await supabase.from('accounts').select('current_daily_emails').eq('id', sender.id).single();
    await supabase.from('accounts')
        .update({ current_daily_emails: (acc?.current_daily_emails ?? 0) + 1 })
        .eq('id', sender.id);

    // Attente IMAP
    console.log(`[Worker] ⏳ Attente ${IMAP_WAIT / 1000}s avant vérification IMAP…`);
    await new Promise(r => setTimeout(r, IMAP_WAIT));

    // IMAP
    const result = await processImapInbox({
        receiverEmail:              receiver.email,
        receiverAppPasswordEncrypted: receiver.app_password_encrypted,
        interactionId,
    });

    const folder = result.folder?.toLowerCase() ?? '';
    const status = result.found
        ? ((folder.includes('spam') || folder.includes('junk')) ? 'Spam' : 'Inbox')
        : 'NotFound';

    await supabase.from('interactions').update({
        status_detected: status,
        source_folder:   result.folder ?? null,
        was_flagged:     result.wasFlagged ?? false,
        reply_sent:      result.replySent  ?? false,
    }).eq('id', interactionId);
    console.log(`[Worker] 📊 ${status} (dossier : ${result.folder ?? 'introuvable'})`);
}

// ---------- Planification du jour ----------

async function scheduleDay(isNewDay = false): Promise<void> {
    console.log(`\n[Scheduler] 📅 Planification — ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`);

    // Remettre les compteurs à zéro UNIQUEMENT au début d'une nouvelle journée
    if (isNewDay) {
        await supabase.from('accounts').update({ current_daily_emails: 0 }).eq('status', 'active');
        console.log(`[Scheduler] 🔄 Compteurs journaliers remis à zéro.`);
    }

    // Lire les paramètres de chauffe depuis Supabase (fallback sur env vars)
    const { data: ws } = await supabase.from('warmup_settings').select('*').limit(1).single();
    const startVol  = ws?.start_vol  ?? parseInt(process.env.START_VOL  ?? '2');
    const increment = ws?.increment  ?? parseInt(process.env.INCREMENT   ?? '1');
    const maxVol    = ws?.max_vol    ?? parseInt(process.env.MAX_VOL     ?? '40');
    const weekend   = ws?.weekend    ?? false;

    console.log(`[Scheduler] ⚙️  Paramètres : J1=${startVol} +${increment}/j max=${maxVol} week-end=${weekend}`);

    // Ignorer si on est le week-end et que l'option est désactivée
    const dayOfWeek = new Date().getDay();
    if (!weekend && (dayOfWeek === 0 || dayOfWeek === 6)) {
        console.log(`[Scheduler] 📅 Week-end détecté et option désactivée — aucun envoi aujourd'hui.`);
        return;
    }

    const { data: accounts, error } = await supabase
        .from('accounts').select('*').eq('status', 'active');

    if (error || !accounts || accounts.length < 2) {
        console.log(`[Scheduler] ⚠️  Pas assez de comptes actifs (${accounts?.length ?? 0}/2). En attente du prochain cycle.`);
        return;
    }

    const accs   = accounts as Account[];
    const avgVol = Math.round(accs.reduce((s, a) => s + dailyVolume(a, startVol, increment, maxVol), 0) / accs.length);
    const target = Math.max(1, avgVol);

    // Compter les emails déjà envoyés aujourd'hui pour ne pas redoubler
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count: sentToday } = await supabase
        .from('interactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay.toISOString())
        .neq('status_detected', 'pending');

    const alreadySent = sentToday ?? 0;
    const remaining   = Math.max(0, target - alreadySent);

    console.log(`[Scheduler] 📧 Objectif : ${target} email(s)/j — déjà envoyés aujourd'hui : ${alreadySent} — restants : ${remaining}`);

    if (remaining === 0) {
        console.log(`[Scheduler] ✅ Quota du jour atteint, rien à planifier.`);
        return;
    }

    const { winStart, winEnd, inWindow } = getWindow();

    if (!inWindow) {
        console.log(`[Scheduler] 🌙 Hors fenêtre (après ${HOUR_END}h) — ${remaining} job(s) reportés à demain.`);
        return;
    }

    // Combien de jobs tiennent dans le temps restant avec l'espacement minimum ?
    const windowRemaining = winEnd - winStart;
    const maxFit = Math.max(1, Math.floor(windowRemaining / MIN_SPACING_MS));
    const jobsToSchedule = Math.min(remaining, maxFit);

    if (jobsToSchedule < remaining) {
        console.log(`[Scheduler] ⚠️  Fenêtre trop courte pour ${remaining} jobs — ${jobsToSchedule} envoyés aujourd'hui, ${remaining - jobsToSchedule} perdus.`);
    }

    // Récupérer les dernières paires pour éviter les doublons consécutifs
    const { data: recentPairs } = await supabase
        .from('interactions')
        .select('sender_id, receiver_id')
        .order('created_at', { ascending: false })
        .limit(accs.length * 3);
    const recentSet = new Set(recentPairs?.map(p => `${p.sender_id}-${p.receiver_id}`) ?? []);

    function pickPair(): [Account, Account] {
        const shuffled = [...accs].sort(() => Math.random() - 0.5);
        // Chercher une paire non utilisée récemment
        for (let a = 0; a < shuffled.length; a++) {
            for (let b = 0; b < shuffled.length; b++) {
                if (a !== b && !recentSet.has(`${shuffled[a].id}-${shuffled[b].id}`)) {
                    recentSet.add(`${shuffled[a].id}-${shuffled[b].id}`); // éviter aussi les doublons dans ce batch
                    return [shuffled[a], shuffled[b]];
                }
            }
        }
        // Fallback si toutes les paires ont été utilisées (petit réseau)
        return [shuffled[0], shuffled[1]];
    }

    const delays = spreadDelays(jobsToSchedule, winStart, winEnd);

    for (let i = 0; i < jobsToSchedule; i++) {
        const [sender, receiver] = pickPair();
        const delay    = delays[i];
        const eta      = new Date(Date.now() + delay).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        console.log(`[Scheduler]   Job ${i + 1}/${jobsToSchedule}: ${sender.email} → ${receiver.email} @ ${eta} (dans ${Math.round(delay / 60_000)} min)`);

        setTimeout(() => {
            runCycle(sender, receiver).catch(err =>
                console.error(`[Worker] ❌ Erreur cycle:`, err.message)
            );
        }, delay);
    }

    console.log(`[Scheduler] ✅ ${jobsToSchedule} job(s) répartis uniformément jusqu'à ${HOUR_END}h.`);
}

// ---------- Re-déclenchement quotidien à 8h ----------

function scheduleNextRun(): void {
    const now   = Date.now();
    const next8 = (() => {
        const d = new Date();
        d.setHours(HOUR_START, 0, 0, 0);
        if (d.getTime() <= now) d.setDate(d.getDate() + 1);
        return d;
    })();
    const ms = next8.getTime() - now;
    const h  = (ms / 3_600_000).toFixed(1);
    console.log(`\n[Scheduler] ⏰ Prochain cycle demain à ${HOUR_START}h (dans ${h}h)`);
    setTimeout(async () => {
        await scheduleDay(true); // isNewDay = true → reset compteurs
        scheduleNextRun();
    }, ms);
}

// ---------- Démarrage ----------

async function cleanupStalePending(): Promise<void> {
    const cutoff = new Date(Date.now() - 10 * 60_000); // pending depuis > 10 min
    const { data } = await supabase
        .from('interactions')
        .update({ status_detected: 'NotFound' })
        .eq('status_detected', 'pending')
        .lt('created_at', cutoff.toISOString())
        .select('id');
    if (data && data.length > 0) {
        console.log(`[Scheduler] 🧹 ${data.length} interaction(s) pending bloquée(s) → NotFound.`);
    }
}

async function main() {
    console.log('🔥 Braise Scheduler (sans Redis)');
    console.log(`   Fenêtre    : ${HOUR_START}h – ${HOUR_END}h`);
    console.log(`   Délai IMAP : ${IMAP_WAIT / 1000}s`);
    console.log(`   Paramètres : lus depuis Supabase (warmup_settings)\n`);

    await cleanupStalePending();
    await scheduleDay();
    scheduleNextRun();
}

// Empêcher les erreurs résiduelles d'imapflow (NoConnection, ECONNRESET) de tuer le process
process.on('uncaughtException', (err: any) => {
    if (err?.code === 'NoConnection' || err?.code === 'ECONNRESET') return;
    console.error('[Scheduler] ❌ Exception non capturée:', err.message);
});

main().catch(console.error);

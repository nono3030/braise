import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

export interface GeneratedEmail {
    subject: string;
    body: string;
}

// ---------- Fallback statique quand pas de thématique ni d'IA ----------

const GENERIC_EMAILS = [
    { subject: 'Demande de devis pour votre prestation', body: 'Bonjour,\n\nNous cherchons un prestataire pour un projet à court terme. Pourriez-vous nous faire parvenir une proposition ?\n\nCordialement,' },
    { subject: 'Disponibilité pour un échange cette semaine ?', body: 'Bonjour,\n\nJe souhaiterais échanger avec vous sur une opportunité de collaboration. Avez-vous un créneau de 20 minutes cette semaine ?\n\nBien à vous,' },
    { subject: 'Suite à notre dernière conversation', body: 'Bonjour,\n\nJe reviens vers vous suite à notre échange de la semaine dernière. Avez-vous eu le temps d\'y réfléchir ?\n\nCordialement,' },
    { subject: 'Question concernant votre offre', body: 'Bonjour,\n\nJ\'ai consulté votre site et j\'aurais quelques questions avant de prendre une décision. Seriez-vous disponible pour en discuter ?\n\nBien à vous,' },
    { subject: 'Proposition de partenariat', body: 'Bonjour,\n\nNous pensons qu\'il y a une belle complémentarité entre nos activités. Seriez-vous ouvert à explorer une collaboration ?\n\nCordialement,' },
];

const GENERIC_REPLIES = [
    'Bonjour,\n\nMerci pour votre message. Je reviens vers vous avec une réponse détaillée d\'ici demain.\n\nCordialement,',
    'Bonjour,\n\nBien reçu. Je transmets à la personne en charge et vous contacte rapidement.\n\nBien à vous,',
    'Bonjour,\n\nMerci de votre retour. Je suis disponible jeudi ou vendredi si vous souhaitez en discuter.\n\nCordialement,',
];

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ---------- Fallback avec thématique libre ----------

function themedFallbackEmail(theme: string): GeneratedEmail {
    const templates = [
        { subject: `Question sur ${theme}`, body: `Bonjour,\n\nJe me permets de vous contacter au sujet de ${theme}. J'aurais quelques questions avant d'aller plus loin. Seriez-vous disponible cette semaine ?\n\nCordialement,` },
        { subject: `Opportunité de collaboration — ${theme}`, body: `Bonjour,\n\nNous travaillons dans le domaine de ${theme} et pensons qu'il y a une belle synergie possible. Seriez-vous ouvert à un échange ?\n\nBien à vous,` },
        { subject: `Demande de devis — ${theme}`, body: `Bonjour,\n\nNous avons un projet en cours autour de ${theme} et cherchons un partenaire de confiance. Pourriez-vous nous faire une proposition ?\n\nCordialement,` },
        { subject: `Retour sur notre projet ${theme}`, body: `Bonjour,\n\nJe reviens vers vous concernant notre projet lié à ${theme}. Avez-vous pu avancer de votre côté ?\n\nBien à vous,` },
    ];
    return pick(templates);
}

function themedFallbackReply(originalSubject: string, theme?: string): GeneratedEmail {
    const subject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;
    return { subject, body: pick(GENERIC_REPLIES) };
}

// ---------- Fonctions principales ----------

export async function generateNewEmail(theme?: string): Promise<GeneratedEmail> {
    if (!apiKey) {
        return theme ? themedFallbackEmail(theme) : pick(GENERIC_EMAILS);
    }

    const prompt = theme
        ? `Tu rédiges un email professionnel court en français (30-80 mots) dans le domaine: "${theme}". Email naturel et varié (demande de collaboration, question, prise de contact, retour sur un échange...). Renvoie UNIQUEMENT un JSON valide sans markdown: {"subject":"...","body":"..."}`
        : `Rédige un email professionnel court en français (30-80 mots), naturel et varié (devis, question, partenariat...). Renvoie UNIQUEMENT un JSON valide sans markdown: {"subject":"...","body":"..."}`;

    try {
        const result  = await model.generateContent(prompt);
        const cleaned = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (err: any) {
        console.warn('[AI Generator] ⚠️  Gemini indisponible — fallback thématique.', err?.status ?? err?.message ?? '');
        return theme ? themedFallbackEmail(theme) : pick(GENERIC_EMAILS);
    }
}

export async function generateReplyEmail(originalSubject: string, theme?: string): Promise<GeneratedEmail> {
    if (!apiKey) return themedFallbackReply(originalSubject, theme);

    const prompt = theme
        ? `Réponds à cet email (15-40 mots, français professionnel) dans le domaine "${theme}": "${originalSubject}". Renvoie UNIQUEMENT un JSON: {"subject":"Re: ${originalSubject}","body":"..."}`
        : `Réponds à cet email (15-40 mots, français professionnel): "${originalSubject}". Renvoie UNIQUEMENT un JSON: {"subject":"Re: ${originalSubject}","body":"..."}`;

    try {
        const result  = await model.generateContent(prompt);
        const cleaned = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (err: any) {
        console.warn('[AI Generator] ⚠️  Gemini indisponible — fallback thématique.', err?.status ?? err?.message ?? '');
        return themedFallbackReply(originalSubject, theme);
    }
}

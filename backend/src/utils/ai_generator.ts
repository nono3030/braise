import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

export interface GeneratedEmail {
    subject: string;
    body: string;
    theme?: string;
}

// ---------- Bibliothèque de thématiques ----------

const THEMES = [
    {
        name: 'saas',
        subjects: [
            'Demande de démo de votre solution',
            'Question sur votre offre Pro',
            'Intégration avec nos outils existants',
            'Retour sur votre période d\'essai',
            'Tarification pour une équipe de 15 personnes',
        ],
        bodies: [
            'Bonjour,\n\nNous évaluons actuellement plusieurs solutions SaaS pour notre équipe. Votre produit a retenu notre attention. Seriez-vous disponible pour une démo de 30 minutes cette semaine ?\n\nCordialement,',
            'Bonjour,\n\nJ\'ai testé votre outil pendant quelques jours et j\'ai quelques questions sur les intégrations disponibles avec Slack et Notion. Pouvez-vous me renseigner ?\n\nBien à vous,',
            'Bonjour,\n\nNous sommes intéressés par votre offre mais j\'aimerais comprendre la politique de facturation pour les utilisateurs supplémentaires. Avez-vous un créneau pour en discuter ?\n\nCordialement,',
            'Bonjour,\n\nNotre période d\'essai se termine bientôt. Avant de prendre une décision, j\'aurais besoin de quelques précisions sur vos garanties de disponibilité et votre support.\n\nMerci d\'avance,',
        ],
        replies: [
            'Bonjour,\n\nMerci pour votre retour ! Je reviens vers vous avec les informations demandées dans la journée.\n\nBien à vous,',
            'Bonjour,\n\nAvec plaisir, je vous propose un créneau jeudi à 14h ou vendredi matin. Dites-moi ce qui vous convient.\n\nCordialement,',
        ],
    },
    {
        name: 'agence',
        subjects: [
            'Demande de devis pour une campagne SEO',
            'Refonte de notre site web — proposition',
            'Collaboration sur un projet de contenu',
            'Audit de notre stratégie digitale',
            'Partenariat agence — opportunité',
        ],
        bodies: [
            'Bonjour,\n\nNous cherchons une agence pour prendre en charge notre stratégie de contenu et notre référencement naturel. Pourriez-vous nous faire parvenir une proposition ?\n\nCordialement,',
            'Bonjour,\n\nNotre site actuel ne convertit plus aussi bien qu\'avant. Nous souhaitons le refondre d\'ici le prochain trimestre. Êtes-vous disponibles pour un premier échange ?\n\nBien à vous,',
            'Bonjour,\n\nJ\'ai consulté votre portfolio et vos résultats sont impressionnants. Nous aurions un projet de campagne email à confier. Quelles sont vos disponibilités ?\n\nCordialement,',
            'Bonjour,\n\nNous souhaitons auditer notre présence digitale avant la rentrée. Proposez-vous ce type de prestation ? Si oui, quels sont vos tarifs habituels ?\n\nMerci,',
        ],
        replies: [
            'Bonjour,\n\nMerci pour votre intérêt ! Je vous prépare une proposition adaptée à votre contexte et vous la transmets d\'ici vendredi.\n\nCordialement,',
            'Bonjour,\n\nAvec plaisir. Je vous propose un appel découverte de 20 minutes pour mieux cerner vos besoins. Quand êtes-vous disponible ?\n\nBien à vous,',
        ],
    },
    {
        name: 'ecommerce',
        subjects: [
            'Partenariat fournisseur — produits complémentaires',
            'Question sur votre programme de revendeurs',
            'Commande groupée — conditions tarifaires',
            'Opportunité de co-marketing',
            'Retour sur notre dernière commande',
        ],
        bodies: [
            'Bonjour,\n\nNous gérons une boutique en ligne dans le secteur de la maison et nous pensons que vos produits compléteraient parfaitement notre catalogue. Pouvez-vous nous présenter vos conditions grossistes ?\n\nCordialement,',
            'Bonjour,\n\nNous serions intéressés par votre programme revendeur. Quelles sont les conditions d\'accès et les remises pratiquées pour un volume d\'environ 200 unités par mois ?\n\nBien à vous,',
            'Bonjour,\n\nNous envisageons une opération promotionnelle conjointe en septembre. Seriez-vous ouverts à une collaboration de co-branding ? Je serais ravi d\'en discuter.\n\nCordialement,',
        ],
        replies: [
            'Bonjour,\n\nMerci pour votre message. Je vous transmets notre grille tarifaire revendeur et nos conditions en pièce jointe.\n\nBien à vous,',
            'Bonjour,\n\nC\'est une idée intéressante. Je transmets votre proposition à notre responsable partenariats et reviens vers vous rapidement.\n\nCordialement,',
        ],
    },
    {
        name: 'recrutement',
        subjects: [
            'Opportunité de mission freelance — dev React',
            'Profil senior disponible — mars',
            'Mise en relation — poste de direction',
            'Candidature spontanée — marketing',
            'Recherche de prestataire tech pour projet',
        ],
        bodies: [
            'Bonjour,\n\nJe me permets de vous contacter car j\'ai vu que vous recrutiez dans le domaine du développement web. J\'accompagne plusieurs profils seniors disponibles dès le mois prochain. Cela pourrait-il vous intéresser ?\n\nCordialement,',
            'Bonjour,\n\nNous avons un besoin urgent pour un profil marketing digital senior, idéalement avec une expérience en B2B SaaS. Avez-vous des candidats correspondant à ce profil en ce moment ?\n\nBien à vous,',
            'Bonjour,\n\nJe me permets de vous adresser ma candidature spontanée. Fort d\'une expérience de 5 ans en growth marketing, je cherche à rejoindre une équipe ambitieuse. Auriez-vous 20 minutes pour échanger ?\n\nCordialement,',
        ],
        replies: [
            'Bonjour,\n\nMerci pour votre message. Votre profil correspond effectivement à ce que nous cherchons. Je vous propose un échange téléphonique en début de semaine prochaine.\n\nCordialement,',
            'Bonjour,\n\nMerci de votre contact. Nous n\'avons pas de besoin immédiat mais je conserve votre message pour nos prochains recrutements.\n\nBien à vous,',
        ],
    },
    {
        name: 'consulting',
        subjects: [
            'Accompagnement transformation digitale',
            'Devis mission de conseil — Q3',
            'Disponibilité pour une mission de 3 mois',
            'Retour sur notre atelier stratégique',
            'Proposition d\'accompagnement PME',
        ],
        bodies: [
            'Bonjour,\n\nNous traversons une phase de transformation et cherchons un consultant externe pour nous accompagner sur la structuration de nos processus internes. Seriez-vous disponible pour en discuter ?\n\nCordialement,',
            'Bonjour,\n\nSuite à notre atelier de la semaine dernière, je reviens vers vous pour obtenir une proposition de mission plus formelle. Pouvez-vous me faire parvenir votre approche et vos tarifs ?\n\nBien à vous,',
            'Bonjour,\n\nNous avons un projet de restructuration organisationnelle pour le prochain trimestre. Avez-vous de la disponibilité pour une mission d\'environ 3 mois à temps partiel ?\n\nCordialement,',
        ],
        replies: [
            'Bonjour,\n\nMerci pour votre confiance. Je vous adresse une proposition détaillée d\'ici mercredi avec mon approche et les livrables envisagés.\n\nCordialement,',
            'Bonjour,\n\nAvec plaisir. J\'ai effectivement de la disponibilité sur cette période. Je vous propose un appel de cadrage jeudi ou vendredi.\n\nBien à vous,',
        ],
    },
];

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function staticEmail(): GeneratedEmail {
    const theme = pickRandom(THEMES);
    return {
        subject: pickRandom(theme.subjects),
        body:    pickRandom(theme.bodies),
        theme:   theme.name,
    };
}

function staticReply(originalSubject: string): GeneratedEmail {
    const theme = pickRandom(THEMES);
    const subject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;
    return {
        subject,
        body:  pickRandom(theme.replies),
        theme: theme.name,
    };
}

// ---------- API Gemini (avec fallback thématique) ----------

export async function generateNewEmail(): Promise<GeneratedEmail> {
    if (!apiKey) return staticEmail();

    const theme = pickRandom(THEMES);
    const prompt = `Tu es un professionnel français dans le domaine "${theme.name}". Génère un email professionnel court en français (30-80 mots), naturel et varié (demande de devis, question, prise de contact...). Renvoie UNIQUEMENT un JSON valide: {"subject":"...","body":"..."}. Pas de markdown.`;

    try {
        const result = await model.generateContent(prompt);
        const cleaned = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return { ...JSON.parse(cleaned), theme: theme.name };
    } catch (error: any) {
        console.warn('[AI Generator] ⚠️  Gemini indisponible — fallback thématique.', error?.status ?? error?.message ?? '');
        return staticEmail();
    }
}

export async function generateReplyEmail(originalSubject: string): Promise<GeneratedEmail> {
    if (!apiKey) return staticReply(originalSubject);

    const prompt = `Génère une réponse professionnelle courte en français (15-40 mots) à l'email: "${originalSubject}". Renvoie UNIQUEMENT un JSON valide: {"subject":"Re: ${originalSubject}","body":"..."}. Pas de markdown.`;

    try {
        const result = await model.generateContent(prompt);
        const cleaned = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (error: any) {
        console.warn('[AI Generator] ⚠️  Gemini indisponible — fallback thématique.', error?.status ?? error?.message ?? '');
        return staticReply(originalSubject);
    }
}

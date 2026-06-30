import { GoogleGenerativeAI } from '@google/generative-ai';

// Vérification de la clé d'API
const apiKey = process.env.GEMINI_API_KEY || '';
if (!apiKey) {
    console.warn('[AI Generator] AVERTISSEMENT: Variable GEMINI_API_KEY manquante. Veuillez la configurer pour la production.');
}

// Initialisation de Gemini
// Même si la clé est vide (pour le POC), on initialise pour éviter des erreurs bloquantes, 
// les appels API échoueront simplement.
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

export interface GeneratedEmail {
    subject: string;
    body: string;
}

/**
 * Génère un email aléatoire professionnel (nouveau thread).
 */
export async function generateNewEmail(): Promise<GeneratedEmail> {
    if (!apiKey) {
        // Fallback sécurisé pour le POC si la clé n'est pas renseignée
        return {
            subject: 'Demande d\'information',
            body: 'Bonjour,\n\nJe souhaiterais obtenir plus de détails concernant vos services. Pourrions-nous échanger cette semaine ?\n\nCordialement,'
        };
    }

    const prompt = `Génère un email professionnel court en français (entre 30 et 80 mots). 
    Le sujet doit être concis. L'email doit sembler naturel (demande de devis, question sur un produit, prise de rendez-vous, etc.).
    Renvoie UNIQUEMENT un objet JSON valide avec deux clés: "subject" et "body". Ne mets pas de bloc markdown, juste le JSON pur.`;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        
        // Nettoyer la réponse au cas où le modèle renvoie du markdown
        const cleanedResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedResponse) as GeneratedEmail;
    } catch (error: any) {
        console.warn('[AI Generator] ⚠️  Erreur API Gemini — fallback contenu statique.', error?.status ?? error?.message ?? '');
        const subjects = [
            'Demande de devis pour votre prestation',
            'Question concernant votre offre de services',
            'Prise de contact suite à votre présentation',
            'Disponibilité pour un échange cette semaine ?',
        ];
        const bodies = [
            'Bonjour,\n\nJe reviens vers vous suite à notre échange. Pourriez-vous me faire parvenir votre proposition commerciale ?\n\nCordialement,',
            'Bonjour,\n\nJe souhaiterais obtenir plus d\'informations concernant vos services. Seriez-vous disponible pour un appel cette semaine ?\n\nBien à vous,',
            'Bonjour,\n\nMerci pour votre message. Je serais ravi d\'en discuter plus en détail. Quand êtes-vous disponible ?\n\nCordialement,',
        ];
        return {
            subject: subjects[Math.floor(Math.random() * subjects.length)],
            body: bodies[Math.floor(Math.random() * bodies.length)],
        };
    }
}

/**
 * Génère une réponse courte à un email existant.
 */
export async function generateReplyEmail(originalSubject: string): Promise<GeneratedEmail> {
    if (!apiKey) {
        // Fallback
        return {
            subject: originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`,
            body: 'Bonjour,\n\nMerci pour votre retour. C\'est noté de mon côté.\n\nBien à vous,'
        };
    }

    const prompt = `Un email a été reçu avec le sujet: "${originalSubject}". 
    Génère une réponse professionnelle courte en français (entre 15 et 40 mots). 
    Le sujet doit commencer par "Re: " suivi du sujet original (s'il ne l'a pas déjà).
    Renvoie UNIQUEMENT un objet JSON valide avec deux clés: "subject" et "body". Ne mets pas de bloc markdown, juste le JSON pur.`;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        
        const cleanedResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedResponse) as GeneratedEmail;
    } catch (error: any) {
        console.warn('[AI Generator] ⚠️  Erreur API Gemini — fallback contenu statique.', error?.status ?? error?.message ?? '');
        return {
            subject: originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`,
            body: 'Bonjour,\n\nMerci pour votre message. C\'est bien noté de mon côté. Je reviendrai vers vous rapidement.\n\nBien à vous,',
        };
    }
}

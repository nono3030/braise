-- Schema pour Braise - SaaS de Warm-up d'emails
-- Conçu pour PostgreSQL (Supabase)

-- Table des comptes (Accounts)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    app_password_encrypted TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
    max_daily_emails INTEGER DEFAULT 50,
    current_daily_emails INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des interactions (Interactions P2P)
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    status_detected VARCHAR(50) DEFAULT 'pending' CHECK (status_detected IN ('pending', 'Inbox', 'Spam', 'NotFound')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des paramètres de chauffe
CREATE TABLE IF NOT EXISTS warmup_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_vol INTEGER DEFAULT 2,
    increment INTEGER DEFAULT 1,
    max_vol INTEGER DEFAULT 40,
    weekend BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_warmup_settings_updated_at
    BEFORE UPDATE ON warmup_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Index pour accélérer les requêtes
CREATE INDEX idx_interactions_sender ON interactions(sender_id);
CREATE INDEX idx_interactions_receiver ON interactions(receiver_id);
CREATE INDEX idx_interactions_status ON interactions(status_detected);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

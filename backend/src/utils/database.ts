import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type AccountStatus = 'active' | 'paused' | 'error';
export type InteractionStatus = 'pending' | 'Inbox' | 'Spam' | 'NotFound';

export interface Account {
  id: string;
  email: string;
  app_password_encrypted: string;
  status: AccountStatus;
  max_daily_emails: number;
  current_daily_emails: number;
  created_at: string;
  updated_at: string;
  theme?: string;
}

export interface Interaction {
  id: string;
  sender_id: string;
  receiver_id: string;
  status_detected: InteractionStatus;
  created_at: string;
}

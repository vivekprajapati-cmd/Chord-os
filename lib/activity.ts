import { createAdminClient } from '@/lib/supabase/admin';

type LogParams = {
  actor_name: string;
  actor_email: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  description: string;
  metadata?: Record<string, unknown>;
};

export async function logActivity(params: LogParams) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('activity_logs').insert(params);
    if (error) console.error('[activity] insert failed:', error.message, JSON.stringify(params));
  } catch (e) {
    console.error('[activity] unexpected error:', e);
  }
}

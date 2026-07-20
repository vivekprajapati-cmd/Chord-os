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
  const admin = createAdminClient();
  await admin.from('activity_logs').insert(params);
}

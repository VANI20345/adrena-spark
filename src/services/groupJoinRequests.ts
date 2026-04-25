import { supabase } from '@/integrations/supabase/client';

export type RequestGroupJoinResult =
  | {
      ok: true;
      code: 'submitted' | 'resubmitted' | 'already_pending';
      status?: 'pending';
      request_id?: string;
    }
  | {
      ok: false;
      code:
        | 'not_authenticated'
        | 'group_not_found'
        | 'no_approval_required'
        | 'already_member'
        | 'cooldown_active'
        | 'invalid_previous_status'
        | string;
      status?: string;
      cooldown_seconds?: number;
      next_allowed_at?: string;
    };

export async function requestGroupJoin(params: {
  groupId: string;
  message?: string | null;
  admissionAnswers?: unknown | null;
  cooldownSeconds?: number;
}): Promise<RequestGroupJoinResult> {
  const { groupId, message = null, admissionAnswers = null, cooldownSeconds = 86400 } = params;

  const { data, error } = await supabase.rpc('request_group_join', {
    p_group_id: groupId,
    p_message: message,
    // Supabase RPC expects Json; our UI payload is already JSON-serializable.
    p_admission_answers: admissionAnswers as any,
    p_cooldown_seconds: cooldownSeconds,
  });

  if (error) {
    // Normalize RPC errors to the same shape
    return {
      ok: false,
      code: error.code || 'rpc_error',
    };
  }

  return (data || { ok: false, code: 'empty_response' }) as RequestGroupJoinResult;
}

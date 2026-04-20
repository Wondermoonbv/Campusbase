import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeedbackForm {
  id: string;
  evenement_id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  short_code: string | null;
  created_at: string | null;
  created_by: string | null;
  feedback_mail_sent: boolean | null;
  feedback_mail_sent_at: string | null;
}

export interface FeedbackResponse {
  id: string;
  form_id: string;
  respondent_name: string;
  respondent_email: string | null;
  audience_relevance: number | null;
  conversation_quality: number | null;
  profiles_met: string[] | null;
  employer_awareness: number | null;
  interest_level: number | null;
  effort_vs_return: number | null;
  participate_again: number | null;
  participate_again_reason: string | null;
  comments: string | null;
  submitted_at: string | null;
}

export function useEventFeedbackForm(eventId: string | undefined) {
  const qc = useQueryClient();

  const formQuery = useQuery({
    queryKey: ["feedback_forms", eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data, error } = await supabase
        .from("feedback_forms")
        .select("id, evenement_id, title, description, is_active, short_code, created_at, created_by, feedback_mail_sent, feedback_mail_sent_at")
        .eq("evenement_id", eventId)
        .maybeSingle();
      if (error) throw error;
      return data as FeedbackForm | null;
    },
    enabled: !!eventId,
  });

  const createForm = useMutation({
    mutationFn: async (payload: { evenement_id: string; title: string; description?: string; created_by?: string }) => {
      const { data, error } = await supabase
        .from("feedback_forms")
        .insert({
          evenement_id: payload.evenement_id,
          title: payload.title,
          description: payload.description ?? "",
          created_by: payload.created_by ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as FeedbackForm;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feedback_forms", eventId] }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ formId, isActive }: { formId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("feedback_forms")
        .update({ is_active: isActive })
        .eq("id", formId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feedback_forms", eventId] }),
  });

  return { form: formQuery.data ?? null, isLoading: formQuery.isLoading, createForm, toggleActive };
}

export function useFeedbackResponses(formId: string | undefined) {
  return useQuery({
    queryKey: ["feedback_responses", formId],
    queryFn: async () => {
      if (!formId) return [];
      const { data, error } = await supabase
        .from("feedback_responses")
        .select("id, form_id, respondent_name, respondent_email, audience_relevance, conversation_quality, profiles_met, employer_awareness, interest_level, effort_vs_return, participate_again, participate_again_reason, comments, submitted_at")
        .eq("form_id", formId)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FeedbackResponse[];
    },
    enabled: !!formId,
  });
}

export function useAllFeedbackData() {
  const formsQuery = useQuery({
    queryKey: ["feedback_forms_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_forms")
        .select("id, evenement_id, title, is_active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FeedbackForm[];
    },
  });

  const responsesQuery = useQuery({
    queryKey: ["feedback_responses_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_responses")
        .select("id, form_id, audience_relevance, conversation_quality, profiles_met, employer_awareness, interest_level, effort_vs_return, participate_again, participate_again_reason, comments, respondent_name, respondent_email, submitted_at")
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FeedbackResponse[];
    },
  });

  return {
    forms: formsQuery.data ?? [],
    responses: responsesQuery.data ?? [],
    isLoading: formsQuery.isLoading || responsesQuery.isLoading,
  };
}

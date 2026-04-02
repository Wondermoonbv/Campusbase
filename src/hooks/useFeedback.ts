import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeedbackForm {
  id: string;
  evenement_id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string | null;
  created_by: string | null;
}

export interface FeedbackResponse {
  id: string;
  form_id: string;
  respondent_name: string;
  respondent_email: string | null;
  overall_rating: number | null;
  organization_rating: number | null;
  relevance_rating: number | null;
  stand_rating: number | null;
  would_recommend: boolean | null;
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
        .select("id, evenement_id, title, description, is_active, created_at, created_by")
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
        .select("id, form_id, respondent_name, respondent_email, overall_rating, organization_rating, relevance_rating, stand_rating, would_recommend, comments, submitted_at")
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
        .select("id, form_id, overall_rating, organization_rating, relevance_rating, stand_rating, would_recommend, comments, respondent_name, submitted_at")
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

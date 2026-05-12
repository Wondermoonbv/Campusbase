export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ambassadeurs: {
        Row: {
          access_token: string | null
          created_at: string | null
          department: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          notes: string | null
          phone: string | null
          token_expires_at: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          department?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          phone?: string | null
          token_expires_at?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          phone?: string | null
          token_expires_at?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      contacten: {
        Row: {
          department: string | null
          email: string | null
          id: string
          linkedin_url: string | null
          name: string
          notes: string | null
          organisatie_id: string | null
          phone: string | null
          role: string | null
        }
        Insert: {
          department?: string | null
          email?: string | null
          id?: string
          linkedin_url?: string | null
          name: string
          notes?: string | null
          organisatie_id?: string | null
          phone?: string | null
          role?: string | null
        }
        Update: {
          department?: string | null
          email?: string | null
          id?: string
          linkedin_url?: string | null
          name?: string
          notes?: string | null
          organisatie_id?: string | null
          phone?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacten_school_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacten_school_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties_public"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_evenementen: {
        Row: {
          contract_id: string
          event_id: string
        }
        Insert: {
          contract_id: string
          event_id: string
        }
        Update: {
          contract_id?: string
          event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_evenementen_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_evenementen_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "evenementen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_evenementen_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "evenementen_public"
            referencedColumns: ["id"]
          },
        ]
      }
      contracten: {
        Row: {
          contract_type: string
          description: string | null
          document_url: string | null
          end_date: string
          id: string
          notes: string | null
          organisatie_id: string
          renewal_date: string | null
          start_date: string
          status: string
          value: number | null
        }
        Insert: {
          contract_type?: string
          description?: string | null
          document_url?: string | null
          end_date: string
          id?: string
          notes?: string | null
          organisatie_id: string
          renewal_date?: string | null
          start_date: string
          status?: string
          value?: number | null
        }
        Update: {
          contract_type?: string
          description?: string | null
          document_url?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          organisatie_id?: string
          renewal_date?: string | null
          start_date?: string
          status?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracten_school_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracten_school_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties_public"
            referencedColumns: ["id"]
          },
        ]
      }
      evenementen: {
        Row: {
          booth_number: string | null
          booth_size: string | null
          budget: number | null
          date: string
          description: string | null
          elia_contact: string | null
          end_time: string | null
          event_language:
            | Database["public"]["Enums"]["event_language_enum"]
            | null
          follow_up_status:
            | Database["public"]["Enums"]["follow_up_status_enum"]
            | null
          id: string
          location: string | null
          locker_code: string | null
          max_ambassadeurs: number | null
          name: string
          notes: string | null
          organisator_id: string | null
          parking_info: string | null
          region: Database["public"]["Enums"]["region_enum"] | null
          registration_type:
            | Database["public"]["Enums"]["registration_type_enum"]
            | null
          requires_booth_builder: boolean | null
          setup_date: string | null
          setup_time: string | null
          short_code: string
          stand_type: string | null
          start_time: string | null
          status: string
          target_level: Database["public"]["Enums"]["target_level_enum"] | null
          team_members: string[] | null
          teardown_time: string | null
          type: string
        }
        Insert: {
          booth_number?: string | null
          booth_size?: string | null
          budget?: number | null
          date: string
          description?: string | null
          elia_contact?: string | null
          end_time?: string | null
          event_language?:
            | Database["public"]["Enums"]["event_language_enum"]
            | null
          follow_up_status?:
            | Database["public"]["Enums"]["follow_up_status_enum"]
            | null
          id?: string
          location?: string | null
          locker_code?: string | null
          max_ambassadeurs?: number | null
          name: string
          notes?: string | null
          organisator_id?: string | null
          parking_info?: string | null
          region?: Database["public"]["Enums"]["region_enum"] | null
          registration_type?:
            | Database["public"]["Enums"]["registration_type_enum"]
            | null
          requires_booth_builder?: boolean | null
          setup_date?: string | null
          setup_time?: string | null
          short_code?: string
          stand_type?: string | null
          start_time?: string | null
          status?: string
          target_level?: Database["public"]["Enums"]["target_level_enum"] | null
          team_members?: string[] | null
          teardown_time?: string | null
          type?: string
        }
        Update: {
          booth_number?: string | null
          booth_size?: string | null
          budget?: number | null
          date?: string
          description?: string | null
          elia_contact?: string | null
          end_time?: string | null
          event_language?:
            | Database["public"]["Enums"]["event_language_enum"]
            | null
          follow_up_status?:
            | Database["public"]["Enums"]["follow_up_status_enum"]
            | null
          id?: string
          location?: string | null
          locker_code?: string | null
          max_ambassadeurs?: number | null
          name?: string
          notes?: string | null
          organisator_id?: string | null
          parking_info?: string | null
          region?: Database["public"]["Enums"]["region_enum"] | null
          registration_type?:
            | Database["public"]["Enums"]["registration_type_enum"]
            | null
          requires_booth_builder?: boolean | null
          setup_date?: string | null
          setup_time?: string | null
          short_code?: string
          stand_type?: string | null
          start_time?: string | null
          status?: string
          target_level?: Database["public"]["Enums"]["target_level_enum"] | null
          team_members?: string[] | null
          teardown_time?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "evenementen_school_id_fkey"
            columns: ["organisator_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evenementen_school_id_fkey"
            columns: ["organisator_id"]
            isOneToOne: false
            referencedRelation: "organisaties_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_contactpersonen: {
        Row: {
          contact_id: string
          created_at: string | null
          event_id: string
          id: string
          notities: string | null
          rol: Database["public"]["Enums"]["contactpersoon_rol"]
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          event_id: string
          id?: string
          notities?: string | null
          rol: Database["public"]["Enums"]["contactpersoon_rol"]
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          event_id?: string
          id?: string
          notities?: string | null
          rol?: Database["public"]["Enums"]["contactpersoon_rol"]
        }
        Relationships: [
          {
            foreignKeyName: "event_contactpersonen_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_contactpersonen_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "evenementen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_contactpersonen_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "evenementen_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_inschrijvingen: {
        Row: {
          ambassadeur_id: string
          bevestigd_op: string | null
          confirmation_snapshot: Json | null
          evenement_id: string
          id: string
          ingeschreven_op: string | null
          notities: string | null
          reminder_sent_at: string | null
          status: string
        }
        Insert: {
          ambassadeur_id: string
          bevestigd_op?: string | null
          confirmation_snapshot?: Json | null
          evenement_id: string
          id?: string
          ingeschreven_op?: string | null
          notities?: string | null
          reminder_sent_at?: string | null
          status?: string
        }
        Update: {
          ambassadeur_id?: string
          bevestigd_op?: string | null
          confirmation_snapshot?: Json | null
          evenement_id?: string
          id?: string
          ingeschreven_op?: string | null
          notities?: string | null
          reminder_sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_inschrijvingen_ambassadeur_id_fkey"
            columns: ["ambassadeur_id"]
            isOneToOne: false
            referencedRelation: "ambassadeurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_inschrijvingen_ambassadeur_id_fkey"
            columns: ["ambassadeur_id"]
            isOneToOne: false
            referencedRelation: "ambassadeurs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_inschrijvingen_evenement_id_fkey"
            columns: ["evenement_id"]
            isOneToOne: false
            referencedRelation: "evenementen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_inschrijvingen_evenement_id_fkey"
            columns: ["evenement_id"]
            isOneToOne: false
            referencedRelation: "evenementen_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_opleidingen: {
        Row: {
          event_id: string
          opleiding_id: string
        }
        Insert: {
          event_id: string
          opleiding_id: string
        }
        Update: {
          event_id?: string
          opleiding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_opleidingen_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "evenementen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_opleidingen_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "evenementen_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_opleidingen_opleiding_id_fkey"
            columns: ["opleiding_id"]
            isOneToOne: false
            referencedRelation: "opleidingen"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_forms: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          evenement_id: string
          feedback_mail_sent: boolean | null
          feedback_mail_sent_at: string | null
          id: string
          is_active: boolean | null
          short_code: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          evenement_id: string
          feedback_mail_sent?: boolean | null
          feedback_mail_sent_at?: string | null
          id?: string
          is_active?: boolean | null
          short_code?: string
          title?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          evenement_id?: string
          feedback_mail_sent?: boolean | null
          feedback_mail_sent_at?: string | null
          id?: string
          is_active?: boolean | null
          short_code?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_forms_evenement_id_fkey"
            columns: ["evenement_id"]
            isOneToOne: false
            referencedRelation: "evenementen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_forms_evenement_id_fkey"
            columns: ["evenement_id"]
            isOneToOne: false
            referencedRelation: "evenementen_public"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_responses: {
        Row: {
          audience_relevance: number | null
          comments: string | null
          conversation_quality: number | null
          effort_vs_return: number | null
          employer_awareness: number | null
          form_id: string
          id: string
          interest_level: number | null
          participate_again: number | null
          participate_again_reason: string | null
          profiles_met: string[] | null
          respondent_email: string | null
          respondent_name: string
          submitted_at: string | null
        }
        Insert: {
          audience_relevance?: number | null
          comments?: string | null
          conversation_quality?: number | null
          effort_vs_return?: number | null
          employer_awareness?: number | null
          form_id: string
          id?: string
          interest_level?: number | null
          participate_again?: number | null
          participate_again_reason?: string | null
          profiles_met?: string[] | null
          respondent_email?: string | null
          respondent_name: string
          submitted_at?: string | null
        }
        Update: {
          audience_relevance?: number | null
          comments?: string | null
          conversation_quality?: number | null
          effort_vs_return?: number | null
          employer_awareness?: number | null
          form_id?: string
          id?: string
          interest_level?: number | null
          participate_again?: number | null
          participate_again_reason?: string | null
          profiles_met?: string[] | null
          respondent_email?: string | null
          respondent_name?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "feedback_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      opleidingen: {
        Row: {
          faculty: string | null
          field_of_study: string | null
          id: string
          name: string
          organisatie_id: string
          student_count: number | null
          study_level: string
        }
        Insert: {
          faculty?: string | null
          field_of_study?: string | null
          id?: string
          name: string
          organisatie_id: string
          student_count?: number | null
          study_level?: string
        }
        Update: {
          faculty?: string | null
          field_of_study?: string | null
          id?: string
          name?: string
          organisatie_id?: string
          student_count?: number | null
          study_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "opleidingen_school_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opleidingen_school_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties_public"
            referencedColumns: ["id"]
          },
        ]
      }
      organisaties: {
        Row: {
          city: string
          created_at: string | null
          id: string
          language: string
          name: string
          notes: string | null
          province: string
          school_type: string
          status: string
          type: Database["public"]["Enums"]["organisatie_type"]
          website: string | null
        }
        Insert: {
          city: string
          created_at?: string | null
          id?: string
          language?: string
          name: string
          notes?: string | null
          province: string
          school_type?: string
          status?: string
          type?: Database["public"]["Enums"]["organisatie_type"]
          website?: string | null
        }
        Update: {
          city?: string
          created_at?: string | null
          id?: string
          language?: string
          name?: string
          notes?: string | null
          province?: string
          school_type?: string
          status?: string
          type?: Database["public"]["Enums"]["organisatie_type"]
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          email: string
          first_name: string
          id: string
          last_name: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          email?: string
          first_name?: string
          id: string
          last_name?: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
        }
        Relationships: []
      }
      taken: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          event_id: string | null
          id: string
          organisatie_id: string | null
          priority: string
          status: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          organisatie_id?: string | null
          priority?: string
          status?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          organisatie_id?: string | null
          priority?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "taken_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "evenementen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taken_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "evenementen_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taken_school_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taken_school_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      ambassadeurs_safe: {
        Row: {
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          token_expires_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          token_expires_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          token_expires_at?: string | null
        }
        Relationships: []
      }
      evenementen_public: {
        Row: {
          date: string | null
          end_time: string | null
          id: string | null
          location: string | null
          max_ambassadeurs: number | null
          name: string | null
          setup_time: string | null
          short_code: string | null
          start_time: string | null
          status: string | null
          teardown_time: string | null
        }
        Insert: {
          date?: string | null
          end_time?: string | null
          id?: string | null
          location?: string | null
          max_ambassadeurs?: number | null
          name?: string | null
          setup_time?: string | null
          short_code?: string | null
          start_time?: string | null
          status?: string | null
          teardown_time?: string | null
        }
        Update: {
          date?: string | null
          end_time?: string | null
          id?: string | null
          location?: string | null
          max_ambassadeurs?: number | null
          name?: string | null
          setup_time?: string | null
          short_code?: string | null
          start_time?: string | null
          status?: string | null
          teardown_time?: string | null
        }
        Relationships: []
      }
      event_inschrijvingen_public: {
        Row: {
          ambassadeur_id: string | null
          evenement_id: string | null
          id: string | null
          status: string | null
        }
        Insert: {
          ambassadeur_id?: string | null
          evenement_id?: string | null
          id?: string | null
          status?: string | null
        }
        Update: {
          ambassadeur_id?: string | null
          evenement_id?: string | null
          id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_inschrijvingen_ambassadeur_id_fkey"
            columns: ["ambassadeur_id"]
            isOneToOne: false
            referencedRelation: "ambassadeurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_inschrijvingen_ambassadeur_id_fkey"
            columns: ["ambassadeur_id"]
            isOneToOne: false
            referencedRelation: "ambassadeurs_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_inschrijvingen_evenement_id_fkey"
            columns: ["evenement_id"]
            isOneToOne: false
            referencedRelation: "evenementen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_inschrijvingen_evenement_id_fkey"
            columns: ["evenement_id"]
            isOneToOne: false
            referencedRelation: "evenementen_public"
            referencedColumns: ["id"]
          },
        ]
      }
      organisaties_public: {
        Row: {
          city: string | null
          id: string | null
          name: string | null
          province: string | null
          type: Database["public"]["Enums"]["organisatie_type"] | null
        }
        Insert: {
          city?: string | null
          id?: string | null
          name?: string | null
          province?: string | null
          type?: Database["public"]["Enums"]["organisatie_type"] | null
        }
        Update: {
          city?: string | null
          id?: string | null
          name?: string | null
          province?: string | null
          type?: Database["public"]["Enums"]["organisatie_type"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invite_user: {
        Args: {
          user_email: string
          user_full_name: string
          user_password: string
          user_role?: string
        }
        Returns: Json
      }
      log_audit: {
        Args: {
          p_action: string
          p_changes?: Json
          p_entity_id: string
          p_entity_name: string
          p_entity_type: string
        }
        Returns: undefined
      }
      reset_user_password: {
        Args: { new_password: string; target_email: string }
        Returns: Json
      }
      rotate_ambassador_token: {
        Args: { p_ambassador_id: string }
        Returns: Json
      }
      soft_delete_user: { Args: { target_user_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer" | "standenbouwer"
      contactpersoon_rol: "event_ter_plaatse" | "administratief" | "anders"
      event_language_enum: "nl" | "fr" | "en" | "meertalig"
      follow_up_status_enum: "to_do" | "in_orde" | "nvt"
      organisatie_type:
        | "school"
        | "studentenvereniging"
        | "werkgeversorganisatie"
        | "overheid"
        | "andere"
      region_enum:
        | "brussel"
        | "antwerpen"
        | "vlaams_brabant"
        | "west_vlaanderen"
        | "limburg"
        | "oost_vlaanderen"
        | "waals_brabant"
        | "henegouwen"
      registration_type_enum: "partnership" | "ad_hoc"
      target_level_enum: "bachelor" | "master" | "beide" | "graduaat"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "editor", "viewer", "standenbouwer"],
      contactpersoon_rol: ["event_ter_plaatse", "administratief", "anders"],
      event_language_enum: ["nl", "fr", "en", "meertalig"],
      follow_up_status_enum: ["to_do", "in_orde", "nvt"],
      organisatie_type: [
        "school",
        "studentenvereniging",
        "werkgeversorganisatie",
        "overheid",
        "andere",
      ],
      region_enum: [
        "brussel",
        "antwerpen",
        "vlaams_brabant",
        "west_vlaanderen",
        "limburg",
        "oost_vlaanderen",
        "waals_brabant",
        "henegouwen",
      ],
      registration_type_enum: ["partnership", "ad_hoc"],
      target_level_enum: ["bachelor", "master", "beide", "graduaat"],
    },
  },
} as const

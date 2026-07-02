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
      attachments: {
        Row: {
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      contactmoment_collegas: {
        Row: {
          contactmoment_id: string
          profile_id: string
        }
        Insert: {
          contactmoment_id: string
          profile_id: string
        }
        Update: {
          contactmoment_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contactmoment_collegas_contactmoment_id_fkey"
            columns: ["contactmoment_id"]
            isOneToOne: false
            referencedRelation: "contactmomenten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contactmoment_collegas_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contactmoment_contacten: {
        Row: {
          contact_id: string
          contactmoment_id: string
        }
        Insert: {
          contact_id: string
          contactmoment_id: string
        }
        Update: {
          contact_id?: string
          contactmoment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contactmoment_contacten_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contactmoment_contacten_contactmoment_id_fkey"
            columns: ["contactmoment_id"]
            isOneToOne: false
            referencedRelation: "contactmomenten"
            referencedColumns: ["id"]
          },
        ]
      }
      contactmomenten: {
        Row: {
          bron: string
          contact_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notities: string | null
          occurred_at: string
          onderwerp: string
          organisatie_id: string
          type: string
        }
        Insert: {
          bron?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notities?: string | null
          occurred_at?: string
          onderwerp: string
          organisatie_id: string
          type?: string
        }
        Update: {
          bron?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notities?: string | null
          occurred_at?: string
          onderwerp?: string
          organisatie_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "contactmomenten_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contactmomenten_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contactmomenten_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contactmomenten_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties_public"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_deliverables: {
        Row: {
          aantal: number | null
          contract_id: string
          created_at: string
          deadline: string | null
          evaluatie: string | null
          geleverd_op: string | null
          geschatte_waarde: number | null
          id: string
          kanaal: string | null
          notities: string | null
          omschrijving: string | null
          status: string
          type: string
          updated_at: string
          waarde_score: number | null
        }
        Insert: {
          aantal?: number | null
          contract_id: string
          created_at?: string
          deadline?: string | null
          evaluatie?: string | null
          geleverd_op?: string | null
          geschatte_waarde?: number | null
          id?: string
          kanaal?: string | null
          notities?: string | null
          omschrijving?: string | null
          status?: string
          type: string
          updated_at?: string
          waarde_score?: number | null
        }
        Update: {
          aantal?: number | null
          contract_id?: string
          created_at?: string
          deadline?: string | null
          evaluatie?: string | null
          geleverd_op?: string | null
          geschatte_waarde?: number | null
          id?: string
          kanaal?: string | null
          notities?: string | null
          omschrijving?: string | null
          status?: string
          type?: string
          updated_at?: string
          waarde_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_deliverables_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_deliverables_type_fkey"
            columns: ["type"]
            isOneToOne: false
            referencedRelation: "deliverable_types"
            referencedColumns: ["slug"]
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
          {
            foreignKeyName: "contract_evenementen_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_bezetting"
            referencedColumns: ["evenement_id"]
          },
        ]
      }
      contracten: {
        Row: {
          contract_type: string
          description: string | null
          document_status: string | null
          document_url: string | null
          end_date: string
          id: string
          import_metadata: Json | null
          invoice_status: string
          notes: string | null
          organisatie_id: string
          renewal_date: string | null
          start_date: string
          status: string
          value: number | null
          verantwoordelijke_id: string | null
        }
        Insert: {
          contract_type?: string
          description?: string | null
          document_status?: string | null
          document_url?: string | null
          end_date: string
          id?: string
          import_metadata?: Json | null
          invoice_status?: string
          notes?: string | null
          organisatie_id: string
          renewal_date?: string | null
          start_date: string
          status?: string
          value?: number | null
          verantwoordelijke_id?: string | null
        }
        Update: {
          contract_type?: string
          description?: string | null
          document_status?: string | null
          document_url?: string | null
          end_date?: string
          id?: string
          import_metadata?: Json | null
          invoice_status?: string
          notes?: string | null
          organisatie_id?: string
          renewal_date?: string | null
          start_date?: string
          status?: string
          value?: number | null
          verantwoordelijke_id?: string | null
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
          {
            foreignKeyName: "contracten_verantwoordelijke_id_fkey"
            columns: ["verantwoordelijke_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_types: {
        Row: {
          actief: boolean
          created_at: string
          label: string
          slug: string
          volgorde: number
        }
        Insert: {
          actief?: boolean
          created_at?: string
          label: string
          slug: string
          volgorde?: number
        }
        Update: {
          actief?: boolean
          created_at?: string
          label?: string
          slug?: string
          volgorde?: number
        }
        Relationships: []
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
          import_metadata: Json | null
          invoice_status: string
          location: string | null
          locker_code: string | null
          max_ambassadeurs: number | null
          name: string
          notes: string | null
          organisator_id: string | null
          parking_info: string | null
          programma: string | null
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
          import_metadata?: Json | null
          invoice_status?: string
          location?: string | null
          locker_code?: string | null
          max_ambassadeurs?: number | null
          name: string
          notes?: string | null
          organisator_id?: string | null
          parking_info?: string | null
          programma?: string | null
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
          import_metadata?: Json | null
          invoice_status?: string
          location?: string | null
          locker_code?: string | null
          max_ambassadeurs?: number | null
          name?: string
          notes?: string | null
          organisator_id?: string | null
          parking_info?: string | null
          programma?: string | null
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
          {
            foreignKeyName: "event_contactpersonen_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_bezetting"
            referencedColumns: ["evenement_id"]
          },
        ]
      }
      event_inschrijvingen: {
        Row: {
          ambassadeur_id: string
          bevestigd_op: string | null
          briefing_sent_at: string | null
          confirmation_snapshot: Json | null
          evenement_id: string
          feedback_request_sent_at: string | null
          feedback_response_id: string | null
          id: string
          ingeschreven_op: string | null
          notities: string | null
          reminder_sent_at: string | null
          status: string
        }
        Insert: {
          ambassadeur_id: string
          bevestigd_op?: string | null
          briefing_sent_at?: string | null
          confirmation_snapshot?: Json | null
          evenement_id: string
          feedback_request_sent_at?: string | null
          feedback_response_id?: string | null
          id?: string
          ingeschreven_op?: string | null
          notities?: string | null
          reminder_sent_at?: string | null
          status?: string
        }
        Update: {
          ambassadeur_id?: string
          bevestigd_op?: string | null
          briefing_sent_at?: string | null
          confirmation_snapshot?: Json | null
          evenement_id?: string
          feedback_request_sent_at?: string | null
          feedback_response_id?: string | null
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
          {
            foreignKeyName: "event_inschrijvingen_evenement_id_fkey"
            columns: ["evenement_id"]
            isOneToOne: false
            referencedRelation: "event_bezetting"
            referencedColumns: ["evenement_id"]
          },
          {
            foreignKeyName: "event_inschrijvingen_feedback_response_id_fkey"
            columns: ["feedback_response_id"]
            isOneToOne: false
            referencedRelation: "feedback_responses"
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
            foreignKeyName: "event_opleidingen_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_bezetting"
            referencedColumns: ["evenement_id"]
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
      event_organisaties: {
        Row: {
          event_id: string
          organisatie_id: string
        }
        Insert: {
          event_id: string
          organisatie_id: string
        }
        Update: {
          event_id?: string
          organisatie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_organisaties_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "evenementen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_organisaties_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "evenementen_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_organisaties_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_bezetting"
            referencedColumns: ["evenement_id"]
          },
          {
            foreignKeyName: "event_organisaties_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_organisaties_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisaties_public"
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
          {
            foreignKeyName: "feedback_forms_evenement_id_fkey"
            columns: ["evenement_id"]
            isOneToOne: false
            referencedRelation: "event_bezetting"
            referencedColumns: ["evenement_id"]
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
          bron: string
          extern_id: string | null
          faculty: string | null
          field_of_study: string | null
          id: string
          is_stem: boolean
          name: string
          onderwijstaal: string | null
          organisatie_id: string
          student_count: number | null
          study_level: string
          su_nummer: string | null
        }
        Insert: {
          bron?: string
          extern_id?: string | null
          faculty?: string | null
          field_of_study?: string | null
          id?: string
          is_stem?: boolean
          name: string
          onderwijstaal?: string | null
          organisatie_id: string
          student_count?: number | null
          study_level?: string
          su_nummer?: string | null
        }
        Update: {
          bron?: string
          extern_id?: string | null
          faculty?: string | null
          field_of_study?: string | null
          id?: string
          is_stem?: boolean
          name?: string
          onderwijstaal?: string | null
          organisatie_id?: string
          student_count?: number | null
          study_level?: string
          su_nummer?: string | null
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
          bron: string
          city: string
          created_at: string | null
          email: string | null
          heeft_stem: boolean
          id: string
          instellingsnummer: string | null
          is_nationaal: boolean
          kbo_nummer: string | null
          language: string
          last_synced_at: string | null
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          onderwijsniveau: string | null
          parent_id: string | null
          postal_code: string | null
          province: string
          scholengemeenschap: string | null
          scholengemeenschap_nr: string | null
          school_type: string
          schoolbestuur: string | null
          schoolbestuur_nr: string | null
          status: string
          street: string | null
          taalstelsel: string | null
          telefoon: string | null
          type: Database["public"]["Enums"]["organisatie_type"]
          verbonden_instelling_id: string | null
          vestigingseenheidsnummer: string | null
          website: string | null
          zoektermen: string | null
        }
        Insert: {
          bron?: string
          city: string
          created_at?: string | null
          email?: string | null
          heeft_stem?: boolean
          id?: string
          instellingsnummer?: string | null
          is_nationaal?: boolean
          kbo_nummer?: string | null
          language?: string
          last_synced_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          onderwijsniveau?: string | null
          parent_id?: string | null
          postal_code?: string | null
          province: string
          scholengemeenschap?: string | null
          scholengemeenschap_nr?: string | null
          school_type?: string
          schoolbestuur?: string | null
          schoolbestuur_nr?: string | null
          status?: string
          street?: string | null
          taalstelsel?: string | null
          telefoon?: string | null
          type?: Database["public"]["Enums"]["organisatie_type"]
          verbonden_instelling_id?: string | null
          vestigingseenheidsnummer?: string | null
          website?: string | null
          zoektermen?: string | null
        }
        Update: {
          bron?: string
          city?: string
          created_at?: string | null
          email?: string | null
          heeft_stem?: boolean
          id?: string
          instellingsnummer?: string | null
          is_nationaal?: boolean
          kbo_nummer?: string | null
          language?: string
          last_synced_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          onderwijsniveau?: string | null
          parent_id?: string | null
          postal_code?: string | null
          province?: string
          scholengemeenschap?: string | null
          scholengemeenschap_nr?: string | null
          school_type?: string
          schoolbestuur?: string | null
          schoolbestuur_nr?: string | null
          status?: string
          street?: string | null
          taalstelsel?: string | null
          telefoon?: string | null
          type?: Database["public"]["Enums"]["organisatie_type"]
          verbonden_instelling_id?: string | null
          vestigingseenheidsnummer?: string | null
          website?: string | null
          zoektermen?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organisaties_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisaties_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "organisaties_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisaties_verbonden_instelling_id_fkey"
            columns: ["verbonden_instelling_id"]
            isOneToOne: false
            referencedRelation: "organisaties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisaties_verbonden_instelling_id_fkey"
            columns: ["verbonden_instelling_id"]
            isOneToOne: false
            referencedRelation: "organisaties_public"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "taken_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_bezetting"
            referencedColumns: ["evenement_id"]
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
      event_bezetting: {
        Row: {
          actief: number | null
          afgemeld: number | null
          bevestigd: number | null
          date: string | null
          elia_contact: string | null
          evenement_id: string | null
          location: string | null
          max_ambassadeurs: number | null
          name: string | null
          onbevestigd: number | null
          open_plaatsen: number | null
          status: string | null
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
          {
            foreignKeyName: "event_inschrijvingen_evenement_id_fkey"
            columns: ["evenement_id"]
            isOneToOne: false
            referencedRelation: "event_bezetting"
            referencedColumns: ["evenement_id"]
          },
        ]
      }
      opleidingen_per_richting: {
        Row: {
          aantal_scholen: number | null
          field_of_study: string | null
          graden: string[] | null
          is_stem: boolean | null
          name: string | null
          niveau: string | null
        }
        Relationships: []
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
      organisatie_ids_met_opleiding: {
        Args: { zoek: string }
        Returns: {
          id: string
        }[]
      }
      organisaties_met_opleiding: {
        Args: { zoek: string }
        Returns: {
          bron: string
          city: string
          created_at: string | null
          email: string | null
          heeft_stem: boolean
          id: string
          instellingsnummer: string | null
          is_nationaal: boolean
          kbo_nummer: string | null
          language: string
          last_synced_at: string | null
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          onderwijsniveau: string | null
          parent_id: string | null
          postal_code: string | null
          province: string
          scholengemeenschap: string | null
          scholengemeenschap_nr: string | null
          school_type: string
          schoolbestuur: string | null
          schoolbestuur_nr: string | null
          status: string
          street: string | null
          taalstelsel: string | null
          telefoon: string | null
          type: Database["public"]["Enums"]["organisatie_type"]
          verbonden_instelling_id: string | null
          vestigingseenheidsnummer: string | null
          website: string | null
          zoektermen: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "organisaties"
          isOneToOne: false
          isSetofReturn: true
        }
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
        | "luik"
        | "luxemburg"
        | "namen"
      registration_type_enum: "partnership" | "ad_hoc"
      target_level_enum:
        | "bachelor"
        | "master"
        | "beide"
        | "graduaat"
        | "a2"
        | "experienced"
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
        "luik",
        "luxemburg",
        "namen",
      ],
      registration_type_enum: ["partnership", "ad_hoc"],
      target_level_enum: [
        "bachelor",
        "master",
        "beide",
        "graduaat",
        "a2",
        "experienced",
      ],
    },
  },
} as const

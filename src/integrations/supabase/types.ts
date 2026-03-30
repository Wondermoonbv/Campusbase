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
      contacten: {
        Row: {
          department: string | null
          email: string | null
          id: string
          linkedin_url: string | null
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          school_id: string
        }
        Insert: {
          department?: string | null
          email?: string | null
          id?: string
          linkedin_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          school_id: string
        }
        Update: {
          department?: string | null
          email?: string | null
          id?: string
          linkedin_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacten_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "scholen"
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
          renewal_date: string | null
          school_id: string
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
          renewal_date?: string | null
          school_id: string
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
          renewal_date?: string | null
          school_id?: string
          start_date?: string
          status?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracten_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "scholen"
            referencedColumns: ["id"]
          },
        ]
      }
      evenementen: {
        Row: {
          budget: number | null
          date: string
          description: string | null
          elia_contact: string | null
          end_time: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          responsible: string | null
          school_id: string | null
          setup_date: string | null
          setup_time: string | null
          stand_size: string | null
          stand_type: string | null
          start_time: string | null
          status: string
          team_members: string[] | null
          type: string
        }
        Insert: {
          budget?: number | null
          date: string
          description?: string | null
          elia_contact?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          responsible?: string | null
          school_id?: string | null
          setup_date?: string | null
          setup_time?: string | null
          stand_size?: string | null
          stand_type?: string | null
          start_time?: string | null
          status?: string
          team_members?: string[] | null
          type?: string
        }
        Update: {
          budget?: number | null
          date?: string
          description?: string | null
          elia_contact?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          responsible?: string | null
          school_id?: string | null
          setup_date?: string | null
          setup_time?: string | null
          stand_size?: string | null
          stand_type?: string | null
          start_time?: string | null
          status?: string
          team_members?: string[] | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "evenementen_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "scholen"
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
            foreignKeyName: "event_opleidingen_opleiding_id_fkey"
            columns: ["opleiding_id"]
            isOneToOne: false
            referencedRelation: "opleidingen"
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
          school_id: string
          student_count: number | null
          study_level: string
        }
        Insert: {
          faculty?: string | null
          field_of_study?: string | null
          id?: string
          name: string
          school_id: string
          student_count?: number | null
          study_level?: string
        }
        Update: {
          faculty?: string | null
          field_of_study?: string | null
          id?: string
          name?: string
          school_id?: string
          student_count?: number | null
          study_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "opleidingen_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "scholen"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          email: string
          first_name: string
          id: string
          last_name: string
        }
        Insert: {
          avatar_url?: string | null
          email?: string
          first_name?: string
          id: string
          last_name?: string
        }
        Update: {
          avatar_url?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
        }
        Relationships: []
      }
      scholen: {
        Row: {
          city: string
          created_at: string | null
          id: string
          language: string
          name: string
          notes: string | null
          province: string
          status: string
          type: string
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
          status?: string
          type?: string
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
          status?: string
          type?: string
          website?: string | null
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
          priority: string
          school_id: string | null
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
          priority?: string
          school_id?: string | null
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
          priority?: string
          school_id?: string | null
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
            foreignKeyName: "taken_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "scholen"
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
      [_ in never]: never
    }
    Functions: {
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
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer"
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
      app_role: ["admin", "editor", "viewer"],
    },
  },
} as const

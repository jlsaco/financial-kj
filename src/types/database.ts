export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      category_budgets: {
        Row: {
          category: Database["public"]["Enums"]["category"]
          monthly_budget: number
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["category"]
          monthly_budget: number
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["category"]
          monthly_budget?: number
          updated_at?: string
        }
        Relationships: []
      }
      finance_records: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["category"]
          created_at: string
          date: string
          id: string
          name: string
          recurring_event_id: string | null
          type: Database["public"]["Enums"]["record_type"]
          updated_at: string
          user_id: Database["public"]["Enums"]["user_id"]
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["category"]
          created_at?: string
          date: string
          id?: string
          name: string
          recurring_event_id?: string | null
          type: Database["public"]["Enums"]["record_type"]
          updated_at?: string
          user_id: Database["public"]["Enums"]["user_id"]
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["category"]
          created_at?: string
          date?: string
          id?: string
          name?: string
          recurring_event_id?: string | null
          type?: Database["public"]["Enums"]["record_type"]
          updated_at?: string
          user_id?: Database["public"]["Enums"]["user_id"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_finance_records_recurring_event"
            columns: ["recurring_event_id"]
            isOneToOne: false
            referencedRelation: "recurring_events"
            referencedColumns: ["id"]
          },
        ]
      }
      month_payment_configs: {
        Row: {
          amount: number
          id: string
          is_paid: boolean
          month: number
          note: string | null
          paid_date: string | null
          record_id: string | null
          recurring_event_id: string
          year: number
        }
        Insert: {
          amount: number
          id?: string
          is_paid?: boolean
          month: number
          note?: string | null
          paid_date?: string | null
          record_id?: string | null
          recurring_event_id: string
          year: number
        }
        Update: {
          amount?: number
          id?: string
          is_paid?: boolean
          month?: number
          note?: string | null
          paid_date?: string | null
          record_id?: string | null
          recurring_event_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "month_payment_configs_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "finance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "month_payment_configs_recurring_event_id_fkey"
            columns: ["recurring_event_id"]
            isOneToOne: false
            referencedRelation: "recurring_events"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_events: {
        Row: {
          category: Database["public"]["Enums"]["category"]
          created_at: string
          day_of_month: number
          default_amount: number
          id: string
          is_active: boolean
          name: string
          user_id: Database["public"]["Enums"]["user_id"]
        }
        Insert: {
          category: Database["public"]["Enums"]["category"]
          created_at?: string
          day_of_month: number
          default_amount: number
          id?: string
          is_active?: boolean
          name: string
          user_id: Database["public"]["Enums"]["user_id"]
        }
        Update: {
          category?: Database["public"]["Enums"]["category"]
          created_at?: string
          day_of_month?: number
          default_amount?: number
          id?: string
          is_active?: boolean
          name?: string
          user_id?: Database["public"]["Enums"]["user_id"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      category:
        | "movilidad"
        | "alimentacion-salud"
        | "hogar-entretenimiento"
        | "deuda"
        | "servicios"
      record_type: "gasto" | "ingreso"
      user_id: "jose" | "karen" | "bot-correos"
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

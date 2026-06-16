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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_devices: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          device_name: string
          id: string
          last_used_at: string | null
          revoked_at: string | null
          token_hash: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          device_name: string
          id?: string
          last_used_at?: string | null
          revoked_at?: string | null
          token_hash: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          device_name?: string
          id?: string
          last_used_at?: string | null
          revoked_at?: string | null
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_devices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_pair_codes: {
        Row: {
          claimed_at: string | null
          claimed_device_id: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_device_id?: string | null
          code: string
          company_id: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
        }
        Update: {
          claimed_at?: string | null
          claimed_device_id?: string | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_pair_codes_claimed_device_id_fkey"
            columns: ["claimed_device_id"]
            isOneToOne: false
            referencedRelation: "api_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_pair_codes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_request_log: {
        Row: {
          company_id: string
          created_at: string
          device_id: string | null
          duration_ms: number | null
          id: string
          method: string
          path: string
          status: number
        }
        Insert: {
          company_id: string
          created_at?: string
          device_id?: string | null
          duration_ms?: number | null
          id?: string
          method: string
          path: string
          status: number
        }
        Update: {
          company_id?: string
          created_at?: string
          device_id?: string | null
          duration_ms?: number | null
          id?: string
          method?: string
          path?: string
          status?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_request_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_request_log_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "api_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string
          created_at: string
          default_due_days: number
          gstin: string | null
          id: string
          name: string
          onboarding_completed: boolean
          phone: string
          plan: string
          plan_expires_at: string | null
          status: string
          upi_id: string | null
        }
        Insert: {
          address?: string
          created_at?: string
          default_due_days?: number
          gstin?: string | null
          id?: string
          name: string
          onboarding_completed?: boolean
          phone?: string
          plan?: string
          plan_expires_at?: string | null
          status?: string
          upi_id?: string | null
        }
        Update: {
          address?: string
          created_at?: string
          default_due_days?: number
          gstin?: string | null
          id?: string
          name?: string
          onboarding_completed?: boolean
          phone?: string
          plan?: string
          plan_expires_at?: string | null
          status?: string
          upi_id?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string
          area: string
          company_id: string
          created_at: string
          credit_limit: number
          default_due_days: number | null
          external_ref: string | null
          gstin: string | null
          id: string
          local_id: string | null
          name: string
          outstanding: number
          phone: string
          source: string
          synced: boolean
        }
        Insert: {
          address?: string
          area?: string
          company_id: string
          created_at?: string
          credit_limit?: number
          default_due_days?: number | null
          external_ref?: string | null
          gstin?: string | null
          id?: string
          local_id?: string | null
          name: string
          outstanding?: number
          phone?: string
          source?: string
          synced?: boolean
        }
        Update: {
          address?: string
          area?: string
          company_id?: string
          created_at?: string
          credit_limit?: number
          default_due_days?: number | null
          external_ref?: string | null
          gstin?: string | null
          id?: string
          local_id?: string | null
          name?: string
          outstanding?: number
          phone?: string
          source?: string
          synced?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_otps: {
        Row: {
          company_id: string
          created_at: string | null
          customer_id: string
          expires_at: string
          id: string
          invoice_id: string
          otp_code: string
          verified: boolean | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          customer_id: string
          expires_at: string
          id?: string
          invoice_id: string
          otp_code: string
          verified?: boolean | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          customer_id?: string
          expires_at?: string
          id?: string
          invoice_id?: string
          otp_code?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_otps_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_otps_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_otps_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          bill_image_url: string | null
          company_id: string
          created_at: string
          customer_id: string
          customer_name: string
          delivered_by: string | null
          delivery_confirmed_at: string | null
          delivery_location: Json | null
          description: string | null
          due_date: string
          due_date_source: string
          external_ref: string | null
          id: string
          invoice_date: string
          invoice_number: string
          local_id: string | null
          otp_verified: boolean | null
          paid_amount: number
          source: string
          status: string
          synced: boolean
        }
        Insert: {
          amount?: number
          bill_image_url?: string | null
          company_id: string
          created_at?: string
          customer_id: string
          customer_name: string
          delivered_by?: string | null
          delivery_confirmed_at?: string | null
          delivery_location?: Json | null
          description?: string | null
          due_date: string
          due_date_source?: string
          external_ref?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          local_id?: string | null
          otp_verified?: boolean | null
          paid_amount?: number
          source?: string
          status?: string
          synced?: boolean
        }
        Update: {
          amount?: number
          bill_image_url?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string
          customer_name?: string
          delivered_by?: string | null
          delivery_confirmed_at?: string | null
          delivery_location?: Json | null
          description?: string | null
          due_date?: string
          due_date_source?: string
          external_ref?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          local_id?: string | null
          otp_verified?: boolean | null
          paid_amount?: number
          source?: string
          status?: string
          synced?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_delivered_by_fkey"
            columns: ["delivered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          collected_by: string
          company_id: string
          created_at: string
          customer_name: string
          date: string
          external_ref: string | null
          id: string
          invoice_id: string
          local_id: string | null
          mode: string
          notes: string | null
          source: string
          synced: boolean
        }
        Insert: {
          amount?: number
          collected_by?: string
          company_id: string
          created_at?: string
          customer_name: string
          date?: string
          external_ref?: string | null
          id?: string
          invoice_id: string
          local_id?: string | null
          mode?: string
          notes?: string | null
          source?: string
          synced?: boolean
        }
        Update: {
          amount?: number
          collected_by?: string
          company_id?: string
          created_at?: string
          customer_name?: string
          date?: string
          external_ref?: string | null
          id?: string
          invoice_id?: string
          local_id?: string | null
          mode?: string
          notes?: string | null
          source?: string
          synced?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          id: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          company_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_type: string
          quantity: number
          raw: Json | null
          razorpay_plan_id: string | null
          razorpay_subscription_id: string | null
          short_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          company_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type: string
          quantity?: number
          raw?: Json | null
          razorpay_plan_id?: string | null
          razorpay_subscription_id?: string | null
          short_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: string
          quantity?: number
          raw?: Json | null
          razorpay_plan_id?: string | null
          razorpay_subscription_id?: string | null
          short_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      company_has_active_plan: {
        Args: { _company_id: string }
        Returns: boolean
      }
      current_user_can_write: { Args: never; Returns: boolean }
      get_device_by_token_hash: {
        Args: { _token_hash: string }
        Returns: {
          company_id: string
          device_id: string
        }[]
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "owner"
        | "manager"
        | "staff"
        | "collection_staff"
        | "delivery_staff"
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
      app_role: [
        "owner",
        "manager",
        "staff",
        "collection_staff",
        "delivery_staff",
      ],
    },
  },
} as const

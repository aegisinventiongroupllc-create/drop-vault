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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      creator_media: {
        Row: {
          bucket: string
          created_at: string
          creator_id: string
          id: string
          media_type: string
          storage_path: string
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          bucket: string
          created_at?: string
          creator_id: string
          id?: string
          media_type?: string
          storage_path: string
          title?: string
          updated_at?: string
          views?: number
        }
        Update: {
          bucket?: string
          created_at?: string
          creator_id?: string
          id?: string
          media_type?: string
          storage_path?: string
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      creator_wallets: {
        Row: {
          created_at: string
          id: string
          ltc_address: string | null
          pending_balance: number
          total_earned: number
          total_paid: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ltc_address?: string | null
          pending_balance?: number
          total_earned?: number
          total_paid?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ltc_address?: string | null
          pending_balance?: number
          total_earned?: number
          total_paid?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_consents: {
        Row: {
          consent_text: string
          consent_type: string
          created_at: string
          email: string | null
          id: string
          ip_address: string | null
          terms_version: string
          user_agent: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          consent_text: string
          consent_type?: string
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          terms_version?: string
          user_agent?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          consent_text?: string
          consent_type?: string
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          terms_version?: string
          user_agent?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      market_demand: {
        Row: {
          created_at: string
          id: string
          keyword: string
          search_count: number
          user_email: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          keyword: string
          search_count?: number
          user_email?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          keyword?: string
          search_count?: number
          user_email?: string | null
        }
        Relationships: []
      }
      payout_batches: {
        Row: {
          admin_user_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          nowpayments_batch_id: string | null
          payout_details: Json | null
          status: string
          total_amount: number
          total_creators: number
        }
        Insert: {
          admin_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          nowpayments_batch_id?: string | null
          payout_details?: Json | null
          status?: string
          total_amount?: number
          total_creators?: number
        }
        Update: {
          admin_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          nowpayments_batch_id?: string | null
          payout_details?: Json | null
          status?: string
          total_amount?: number
          total_creators?: number
        }
        Relationships: []
      }
      power_weeks: {
        Row: {
          active: boolean
          created_at: string
          creator_id: string
          ends_at: string
          id: string
          milestone_followers: number
          split_creator: number
          split_platform: number
          started_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          creator_id: string
          ends_at: string
          id?: string
          milestone_followers: number
          split_creator?: number
          split_platform?: number
          started_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          creator_id?: string
          ends_at?: string
          id?: string
          milestone_followers?: number
          split_creator?: number
          split_platform?: number
          started_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_usd: number
          buyer_id: string | null
          created_at: string
          creator_id: string
          creator_share_percent: number
          creator_share_usd: number
          entry_tax: number
          id: string
          payment_id: string | null
          platform_commission: number
          platform_share_usd: number
          status: string
        }
        Insert: {
          amount_usd: number
          buyer_id?: string | null
          created_at?: string
          creator_id: string
          creator_share_percent?: number
          creator_share_usd: number
          entry_tax?: number
          id?: string
          payment_id?: string | null
          platform_commission?: number
          platform_share_usd: number
          status?: string
        }
        Update: {
          amount_usd?: number
          buyer_id?: string | null
          created_at?: string
          creator_id?: string
          creator_share_percent?: number
          creator_share_usd?: number
          entry_tax?: number
          id?: string
          payment_id?: string | null
          platform_commission?: number
          platform_share_usd?: number
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
    }
    Enums: {
      app_role: "admin" | "creator" | "customer"
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
      app_role: ["admin", "creator", "customer"],
    },
  },
} as const

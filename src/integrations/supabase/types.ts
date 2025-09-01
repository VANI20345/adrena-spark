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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          booking_reference: string
          created_at: string
          discount_amount: number | null
          event_id: string
          id: string
          payment_id: string | null
          points_used: number | null
          quantity: number
          status: string
          total_amount: number
          updated_at: string
          user_id: string
          vat_amount: number
        }
        Insert: {
          booking_reference: string
          created_at?: string
          discount_amount?: number | null
          event_id: string
          id?: string
          payment_id?: string | null
          points_used?: number | null
          quantity?: number
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
          vat_amount: number
        }
        Update: {
          booking_reference?: string
          created_at?: string
          discount_amount?: number | null
          event_id?: string
          id?: string
          payment_id?: string | null
          points_used?: number | null
          quantity?: number
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          description_ar: string | null
          icon: string | null
          id: string
          name: string
          name_ar: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          icon?: string | null
          id?: string
          name: string
          name_ar: string
        }
        Update: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          icon?: string | null
          id?: string
          name?: string
          name_ar?: string
        }
        Relationships: []
      }
      event_groups: {
        Row: {
          created_at: string
          created_by: string
          current_members: number | null
          event_id: string
          group_id_external: string | null
          group_link: string | null
          group_name: string
          group_type: string
          id: string
          max_members: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          current_members?: number | null
          event_id: string
          group_id_external?: string | null
          group_link?: string | null
          group_name: string
          group_type: string
          id?: string
          max_members?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          current_members?: number | null
          event_id?: string
          group_id_external?: string | null
          group_link?: string | null
          group_name?: string
          group_type?: string
          id?: string
          max_members?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cancellation_policy: string | null
          category_id: string | null
          created_at: string
          current_attendees: number | null
          description: string | null
          description_ar: string | null
          difficulty_level: string | null
          end_date: string
          featured: boolean | null
          id: string
          image_url: string | null
          latitude: number | null
          license_document_url: string | null
          location: string
          location_ar: string
          longitude: number | null
          max_attendees: number | null
          organizer_id: string
          points_required: number | null
          price: number | null
          requires_license: boolean | null
          start_date: string
          status: string | null
          title: string
          title_ar: string
          updated_at: string
        }
        Insert: {
          cancellation_policy?: string | null
          category_id?: string | null
          created_at?: string
          current_attendees?: number | null
          description?: string | null
          description_ar?: string | null
          difficulty_level?: string | null
          end_date: string
          featured?: boolean | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          license_document_url?: string | null
          location: string
          location_ar: string
          longitude?: number | null
          max_attendees?: number | null
          organizer_id: string
          points_required?: number | null
          price?: number | null
          requires_license?: boolean | null
          start_date: string
          status?: string | null
          title: string
          title_ar: string
          updated_at?: string
        }
        Update: {
          cancellation_policy?: string | null
          category_id?: string | null
          created_at?: string
          current_attendees?: number | null
          description?: string | null
          description_ar?: string | null
          difficulty_level?: string | null
          end_date?: string
          featured?: boolean | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          license_document_url?: string | null
          location?: string
          location_ar?: string
          longitude?: number | null
          max_attendees?: number | null
          organizer_id?: string
          points_required?: number | null
          price?: number | null
          requires_license?: boolean | null
          start_date?: string
          status?: string | null
          title?: string
          title_ar?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_ledger: {
        Row: {
          created_at: string
          description: string
          expires_at: string | null
          id: string
          points: number
          reference_id: string | null
          reference_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          points: number
          reference_id?: string | null
          reference_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          booking_confirmations: boolean
          created_at: string
          email_notifications: boolean
          event_reminders: boolean
          event_updates: boolean
          follower_activity: boolean
          id: string
          marketing_emails: boolean
          sms_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_confirmations?: boolean
          created_at?: string
          email_notifications?: boolean
          event_reminders?: boolean
          event_updates?: boolean
          follower_activity?: boolean
          id?: string
          marketing_emails?: boolean
          sms_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_confirmations?: boolean
          created_at?: string
          email_notifications?: boolean
          event_reminders?: boolean
          event_updates?: boolean
          follower_activity?: boolean
          id?: string
          marketing_emails?: boolean
          sms_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          email_sent: boolean
          id: string
          message: string
          read: boolean
          sms_sent: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          email_sent?: boolean
          id?: string
          message: string
          read?: boolean
          sms_sent?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          email_sent?: boolean
          id?: string
          message?: string
          read?: boolean
          sms_sent?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          completed_at: string | null
          created_at: string
          currency: string
          id: string
          payment_method: string
          payment_provider: string
          provider_payment_id: string | null
          status: string
        }
        Insert: {
          amount: number
          booking_id: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_method: string
          payment_provider: string
          provider_payment_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string
          payment_provider?: string
          provider_payment_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auto_redeem_points: boolean | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          points_balance: number | null
          total_points_earned: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_redeem_points?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          points_balance?: number | null
          total_points_earned?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_redeem_points?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          points_balance?: number | null
          total_points_earned?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          reason: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string | null
          comment: string | null
          created_at: string
          event_id: string | null
          helpful_count: number | null
          id: string
          rating: number
          service_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          event_id?: string | null
          helpful_count?: number | null
          id?: string
          rating: number
          service_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          event_id?: string | null
          helpful_count?: number | null
          id?: string
          rating?: number
          service_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          created_at: string
          event_id: string
          id: string
          message: string | null
          negotiated_price: number | null
          organizer_id: string
          provider_id: string
          requested_price: number | null
          response_message: string | null
          service_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          message?: string | null
          negotiated_price?: number | null
          organizer_id: string
          provider_id: string
          requested_price?: number | null
          response_message?: string | null
          service_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          message?: string | null
          negotiated_price?: number | null
          organizer_id?: string
          provider_id?: string
          requested_price?: number | null
          response_message?: string | null
          service_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          description_ar: string | null
          duration_minutes: number | null
          featured: boolean | null
          id: string
          image_url: string | null
          location: string | null
          location_ar: string | null
          name: string
          name_ar: string
          price: number
          provider_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          duration_minutes?: number | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          location?: string | null
          location_ar?: string | null
          name: string
          name_ar: string
          price: number
          provider_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          duration_minutes?: number | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          location?: string | null
          location_ar?: string | null
          name?: string
          name_ar?: string
          price?: number
          provider_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          booking_id: string
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string
          holder_name: string
          id: string
          qr_code: string
          status: string
          ticket_number: string
        }
        Insert: {
          booking_id: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          holder_name: string
          id?: string
          qr_code: string
          status?: string
          ticket_number: string
        }
        Update: {
          booking_id?: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          holder_name?: string
          id?: string
          qr_code?: string
          status?: string
          ticket_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          balance: number
          id: string
          total_earned: number
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          reference_id: string | null
          reference_type: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type?: string
          user_id?: string
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
      app_role: "attendee" | "organizer" | "provider" | "admin"
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
      app_role: ["attendee", "organizer", "provider", "admin"],
    },
  },
} as const

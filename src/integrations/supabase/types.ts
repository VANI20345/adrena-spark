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
      admin_activity_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_admin_activity_logs_admin"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_admin_activity_logs_admin"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "suspended_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_group_assignments: {
        Row: {
          admin_id: string
          created_at: string | null
          group_count: number
          id: string
          updated_at: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string | null
          group_count?: number
          id?: string
          updated_at?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string | null
          group_count?: number
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
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
            foreignKeyName: "fk_bookings_event_id"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color_end: string | null
          color_start: string | null
          created_at: string
          description: string | null
          description_ar: string | null
          event_count: number | null
          icon: string | null
          icon_name: string | null
          id: string
          name: string
          name_ar: string
        }
        Insert: {
          color_end?: string | null
          color_start?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          event_count?: number | null
          icon?: string | null
          icon_name?: string | null
          id?: string
          name: string
          name_ar: string
        }
        Update: {
          color_end?: string | null
          color_start?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          event_count?: number | null
          icon?: string | null
          icon_name?: string | null
          id?: string
          name?: string
          name_ar?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          name_ar: string
          region: string | null
          region_ar: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          name_ar: string
          region?: string | null
          region_ar?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          name_ar?: string
          region?: string | null
          region_ar?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          description_ar: string | null
          event_specific: string | null
          id: string
          is_active: boolean | null
          max_discount: number | null
          min_amount: number | null
          type: string
          usage_limit: number | null
          used_count: number | null
          user_specific: string | null
          valid_from: string | null
          valid_until: string | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          event_specific?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_amount?: number | null
          type: string
          usage_limit?: number | null
          used_count?: number | null
          user_specific?: string | null
          valid_from?: string | null
          valid_until?: string | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          event_specific?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_amount?: number | null
          type?: string
          usage_limit?: number | null
          used_count?: number | null
          user_specific?: string | null
          valid_from?: string | null
          valid_until?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_event_specific_fkey"
            columns: ["event_specific"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_bookmarks: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      event_groups: {
        Row: {
          archived_at: string | null
          assigned_admin_id: string | null
          auto_delete_at: string | null
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
          archived_at?: string | null
          assigned_admin_id?: string | null
          auto_delete_at?: string | null
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
          archived_at?: string | null
          assigned_admin_id?: string | null
          auto_delete_at?: string | null
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
          {
            foreignKeyName: "fk_event_groups_event_id"
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
            foreignKeyName: "fk_events_category_id"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          is_muted: boolean
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          is_muted?: boolean
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          is_muted?: boolean
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_group_members_group_id"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "event_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "event_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "suspended_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_group_messages_group_id"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "event_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "event_groups"
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
            foreignKeyName: "fk_payments_booking_id"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
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
          suspended: boolean | null
          suspended_at: string | null
          suspended_by: string | null
          suspended_until: string | null
          suspension_reason: string | null
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
          suspended?: boolean | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
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
          suspended?: boolean | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          total_points_earned?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rating_summaries: {
        Row: {
          average_rating: number | null
          entity_id: string
          entity_type: string
          id: string
          rating_1: number | null
          rating_2: number | null
          rating_3: number | null
          rating_4: number | null
          rating_5: number | null
          total_reviews: number | null
          updated_at: string | null
        }
        Insert: {
          average_rating?: number | null
          entity_id: string
          entity_type: string
          id?: string
          rating_1?: number | null
          rating_2?: number | null
          rating_3?: number | null
          rating_4?: number | null
          rating_5?: number | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Update: {
          average_rating?: number | null
          entity_id?: string
          entity_type?: string
          id?: string
          rating_1?: number | null
          rating_2?: number | null
          rating_3?: number | null
          rating_4?: number | null
          rating_5?: number | null
          total_reviews?: number | null
          updated_at?: string | null
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
            foreignKeyName: "fk_refunds_booking_id"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      regional_groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          name_ar: string
          region: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          name_ar: string
          region: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          name_ar?: string
          region?: string
          updated_at?: string | null
        }
        Relationships: []
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
            foreignKeyName: "fk_reviews_booking_id"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reviews_event_id"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reviews_service_id"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_bookings: {
        Row: {
          booking_date: string
          booking_reference: string
          created_at: string
          id: string
          payment_id: string | null
          provider_id: string
          service_date: string
          service_id: string
          special_requests: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_date: string
          booking_reference?: string
          created_at?: string
          id?: string
          payment_id?: string | null
          provider_id: string
          service_date: string
          service_id: string
          special_requests?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_date?: string
          booking_reference?: string
          created_at?: string
          id?: string
          payment_id?: string | null
          provider_id?: string
          service_date?: string
          service_id?: string
          special_requests?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          created_at: string
          display_order: number | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
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
            foreignKeyName: "fk_service_requests_event_id"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_service_requests_service_id"
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
            foreignKeyName: "fk_services_provider"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_services_provider"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "suspended_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      site_statistics: {
        Row: {
          description_ar: string | null
          description_en: string | null
          display_order: number | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          stat_key: string
          stat_value_ar: string
          stat_value_en: string
          updated_at: string | null
        }
        Insert: {
          description_ar?: string | null
          description_en?: string | null
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          stat_key: string
          stat_value_ar: string
          stat_value_en: string
          updated_at?: string | null
        }
        Update: {
          description_ar?: string | null
          description_en?: string | null
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          stat_key?: string
          stat_value_ar?: string
          stat_value_en?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          level: string
          message: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          level: string
          message: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          level?: string
          message?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      tickets: {
        Row: {
          booking_id: string
          check_in_method: string | null
          checked_in_at: string | null
          checked_in_by: string | null
          checked_in_location: string | null
          created_at: string
          holder_name: string
          id: string
          qr_code: string
          status: string
          ticket_number: string
        }
        Insert: {
          booking_id: string
          check_in_method?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_in_location?: string | null
          created_at?: string
          holder_name: string
          id?: string
          qr_code: string
          status?: string
          ticket_number: string
        }
        Update: {
          booking_id?: string
          check_in_method?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_in_location?: string | null
          created_at?: string
          holder_name?: string
          id?: string
          qr_code?: string
          status?: string
          ticket_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tickets_booking_id"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
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
          pending_earnings: number | null
          total_earned: number
          total_service_revenue: number | null
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          pending_earnings?: number | null
          total_earned?: number
          total_service_revenue?: number | null
          total_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          pending_earnings?: number | null
          total_earned?: number
          total_service_revenue?: number | null
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
      suspended_users: {
        Row: {
          full_name: string | null
          suspended: boolean | null
          suspended_at: string | null
          suspended_by: string | null
          suspended_by_name: string | null
          suspended_until: string | null
          suspension_reason: string | null
          suspension_status: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_admin_to_group: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      check_in_attendee: {
        Args: { location?: string; organizer_id: string; ticket_id: string }
        Returns: Json
      }
      delete_user_completely: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      increment_event_attendees: {
        Args: { event_id: string; increment_by: number }
        Returns: undefined
      }
      log_system_event: {
        Args: { p_details?: Json; p_level: string; p_message: string }
        Returns: string
      }
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

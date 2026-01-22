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
      activity_logs: {
        Row: {
          activity_type: string
          actor_id: string
          created_at: string | null
          entity_data: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          is_admin_action: boolean | null
          visibility: string | null
        }
        Insert: {
          activity_type: string
          actor_id: string
          created_at?: string | null
          entity_data?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          is_admin_action?: boolean | null
          visibility?: string | null
        }
        Update: {
          activity_type?: string
          actor_id?: string
          created_at?: string | null
          entity_data?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          is_admin_action?: boolean | null
          visibility?: string | null
        }
        Relationships: []
      }
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
            referencedRelation: "profile_counts"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "profiles_complete"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_admin_activity_logs_admin"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
      badges: {
        Row: {
          badge_type: string
          created_at: string
          description: string | null
          description_ar: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string
          points_reward: number | null
          rarity: string | null
          requirement_type: string | null
          requirement_value: number | null
        }
        Insert: {
          badge_type?: string
          created_at?: string
          description?: string | null
          description_ar?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar: string
          points_reward?: number | null
          rarity?: string | null
          requirement_type?: string | null
          requirement_value?: number | null
        }
        Update: {
          badge_type?: string
          created_at?: string
          description?: string | null
          description_ar?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string
          points_reward?: number | null
          rarity?: string | null
          requirement_type?: string | null
          requirement_value?: number | null
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
            referencedRelation: "event_attendee_counts"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "fk_bookings_event_id"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
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
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post_counts"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          admin_notes: string | null
          category: string
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string
        }
        Insert: {
          admin_notes?: string | null
          category: string
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          participant_1: string
          participant_2: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1: string
          participant_2: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1?: string
          participant_2?: string
          updated_at?: string
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
            referencedRelation: "event_attendee_counts"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "coupons_event_specific_fkey"
            columns: ["event_specific"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_service_details: {
        Row: {
          created_at: string | null
          discount_percentage: number | null
          id: string
          original_price: number
          service_id: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          original_price: number
          service_id: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          original_price?: number
          service_id?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_service_details_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: true
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_service_details_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: true
            referencedRelation: "services_complete"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_reports: {
        Row: {
          additional_details: string | null
          admin_notes: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          additional_details?: string | null
          admin_notes?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          additional_details?: string | null
          admin_notes?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_interests: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          interest_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          interest_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          interest_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_interests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_attendee_counts"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_interests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_interests_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_interests_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "category_counts"
            referencedColumns: ["category_id"]
          },
        ]
      }
      event_schedules: {
        Row: {
          created_at: string
          day_description: string | null
          end_time: string
          event_id: string
          id: string
          schedule_date: string
          start_time: string
        }
        Insert: {
          created_at?: string
          day_description?: string | null
          end_time: string
          event_id: string
          id?: string
          schedule_date: string
          start_time: string
        }
        Update: {
          created_at?: string
          day_description?: string | null
          end_time?: string
          event_id?: string
          id?: string
          schedule_date?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_schedules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_attendee_counts"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_schedules_event_id_fkey"
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
          detail_images: string[] | null
          difficulty_level: string | null
          end_date: string
          featured: boolean | null
          group_id: string | null
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
          detail_images?: string[] | null
          difficulty_level?: string | null
          end_date: string
          featured?: boolean | null
          group_id?: string | null
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
          detail_images?: string[] | null
          difficulty_level?: string | null
          end_date?: string
          featured?: boolean | null
          group_id?: string | null
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
            foreignKeyName: "events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "event_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_counts"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_events_category_id"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_events_category_id"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_counts"
            referencedColumns: ["category_id"]
          },
        ]
      }
      follow_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          requester_id: string
          responded_at: string | null
          status: string
          target_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          requester_id: string
          responded_at?: string | null
          status?: string
          target_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          requester_id?: string
          responded_at?: string | null
          status?: string
          target_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      group_chat_messages: {
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
            foreignKeyName: "group_chat_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "event_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_chat_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_counts"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "group_chat_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_interests: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          interest_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          interest_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          interest_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_interests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "event_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_interests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_counts"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "group_interests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_interests_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "interest_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_interests_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "user_interests"
            referencedColumns: ["id"]
          },
        ]
      }
      group_join_request_history: {
        Row: {
          action: string
          admission_answers: Json | null
          created_at: string
          group_id: string
          id: string
          message: string | null
          request_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          admission_answers?: Json | null
          created_at?: string
          group_id: string
          id?: string
          message?: string | null
          request_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          admission_answers?: Json | null
          created_at?: string
          group_id?: string
          id?: string
          message?: string | null
          request_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_join_request_history_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "event_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_join_request_history_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_counts"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "group_join_request_history_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_join_request_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "group_join_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      group_join_requests: {
        Row: {
          admission_answers: Json | null
          created_at: string
          group_id: string
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admission_answers?: Json | null
          created_at?: string
          group_id: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admission_answers?: Json | null
          created_at?: string
          group_id?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_join_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "event_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_join_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_counts"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "group_join_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memberships: {
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
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_counts"
            referencedColumns: ["user_id"]
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
            referencedRelation: "profiles_complete"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "event_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_counts"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_message_attachments: {
        Row: {
          created_at: string
          file_name: string | null
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "group_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          admission_questions: Json | null
          archived_at: string | null
          assigned_admin_id: string | null
          auto_delete_at: string | null
          category_id: string | null
          city_id: string | null
          created_at: string
          created_by: string
          current_members: number | null
          description: string | null
          description_ar: string | null
          equipment: string[] | null
          event_id: string | null
          gender_restriction: string | null
          group_id_external: string | null
          group_link: string | null
          group_name: string
          id: string
          image_url: string | null
          join_mode: string | null
          location_restriction: string | null
          max_age: number | null
          max_members: number | null
          min_age: number | null
          requires_approval: boolean
          visibility: string
        }
        Insert: {
          admission_questions?: Json | null
          archived_at?: string | null
          assigned_admin_id?: string | null
          auto_delete_at?: string | null
          category_id?: string | null
          city_id?: string | null
          created_at?: string
          created_by: string
          current_members?: number | null
          description?: string | null
          description_ar?: string | null
          equipment?: string[] | null
          event_id?: string | null
          gender_restriction?: string | null
          group_id_external?: string | null
          group_link?: string | null
          group_name: string
          id?: string
          image_url?: string | null
          join_mode?: string | null
          location_restriction?: string | null
          max_age?: number | null
          max_members?: number | null
          min_age?: number | null
          requires_approval?: boolean
          visibility?: string
        }
        Update: {
          admission_questions?: Json | null
          archived_at?: string | null
          assigned_admin_id?: string | null
          auto_delete_at?: string | null
          category_id?: string | null
          city_id?: string | null
          created_at?: string
          created_by?: string
          current_members?: number | null
          description?: string | null
          description_ar?: string | null
          equipment?: string[] | null
          event_id?: string | null
          gender_restriction?: string | null
          group_id_external?: string | null
          group_link?: string | null
          group_name?: string
          id?: string
          image_url?: string | null
          join_mode?: string | null
          location_restriction?: string | null
          max_age?: number | null
          max_members?: number | null
          min_age?: number | null
          requires_approval?: boolean
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_groups_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "profile_counts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_groups_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_groups_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles_complete"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_groups_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_counts"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "event_groups_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_counts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_complete"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_attendee_counts"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_groups_location_restriction_fkey"
            columns: ["location_restriction"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      interest_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          name_ar: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          name_ar: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          name_ar?: string
        }
        Relationships: []
      }
      leaderboard_entries: {
        Row: {
          created_at: string
          events_attended: number | null
          groups_joined: number | null
          id: string
          period_end: string
          period_start: string
          period_type: string
          points: number
          posts_created: number | null
          rank: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          events_attended?: number | null
          groups_joined?: number | null
          id?: string
          period_end: string
          period_start: string
          period_type: string
          points?: number
          posts_created?: number | null
          rank?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          events_attended?: number | null
          groups_joined?: number | null
          id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          points?: number
          posts_created?: number | null
          rank?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
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
      poll_options: {
        Row: {
          created_at: string
          id: string
          option_order: number
          option_text: string
          post_id: string
          votes_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          option_order?: number
          option_text: string
          post_id: string
          votes_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          option_order?: number
          option_text?: string
          post_id?: string
          votes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_options_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post_counts"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "poll_options_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_option_counts"
            referencedColumns: ["option_id"]
          },
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post_counts"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post_counts"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string
          group_id: string
          id: string
          likes_count: number | null
          media_type: string | null
          media_urls: string[] | null
          post_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string
          group_id: string
          id?: string
          likes_count?: number | null
          media_type?: string | null
          media_urls?: string[] | null
          post_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          likes_count?: number | null
          media_type?: string | null
          media_urls?: string[] | null
          post_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "event_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_counts"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_plans: {
        Row: {
          available_tickets: number
          created_at: string
          event_id: string
          id: string
          plan_name: string | null
          plan_name_ar: string | null
          price: number
          ticket_limit: number
          updated_at: string
        }
        Insert: {
          available_tickets?: number
          created_at?: string
          event_id: string
          id?: string
          plan_name?: string | null
          plan_name_ar?: string | null
          price?: number
          ticket_limit?: number
          updated_at?: string
        }
        Update: {
          available_tickets?: number
          created_at?: string
          event_id?: string
          id?: string
          plan_name?: string | null
          plan_name_ar?: string | null
          price?: number
          ticket_limit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_plans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_attendee_counts"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "pricing_plans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_contacts: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          city: string | null
          created_at: string
          display_id: string
          followers_count: number | null
          following_count: number | null
          full_name: string | null
          gender: string | null
          id: string
          interests: string[] | null
          last_activity: string | null
          updated_at: string
          user_id: string
          warning_count: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          display_id: string
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          gender?: string | null
          id?: string
          interests?: string[] | null
          last_activity?: string | null
          updated_at?: string
          user_id: string
          warning_count?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          display_id?: string
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          gender?: string | null
          id?: string
          interests?: string[] | null
          last_activity?: string | null
          updated_at?: string
          user_id?: string
          warning_count?: number | null
        }
        Relationships: []
      }
      provider_verifications: {
        Row: {
          commercial_registration_url: string | null
          created_at: string | null
          id: string
          id_document_url: string | null
          license_url: string | null
          rejection_reason: string | null
          service_types: string[] | null
          updated_at: string | null
          user_id: string
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          commercial_registration_url?: string | null
          created_at?: string | null
          id?: string
          id_document_url?: string | null
          license_url?: string | null
          rejection_reason?: string | null
          service_types?: string[] | null
          updated_at?: string | null
          user_id: string
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          commercial_registration_url?: string | null
          created_at?: string | null
          id?: string
          id_document_url?: string | null
          license_url?: string | null
          rejection_reason?: string | null
          service_types?: string[] | null
          updated_at?: string | null
          user_id?: string
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
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
      referral_rewards: {
        Row: {
          booking_id: string | null
          created_at: string
          credited_at: string | null
          id: string
          referred_id: string
          referrer_id: string
          reward_amount: number | null
          reward_status: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          credited_at?: string | null
          id?: string
          referred_id: string
          referrer_id: string
          reward_amount?: number | null
          reward_status?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          credited_at?: string | null
          id?: string
          referred_id?: string
          referrer_id?: string
          reward_amount?: number | null
          reward_status?: string | null
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
      reported_messages: {
        Row: {
          additional_details: string | null
          admin_notes: string | null
          created_at: string | null
          id: string
          message_content: string
          message_id: string
          message_type: string
          reason: string
          reported_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          sender_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          additional_details?: string | null
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          message_content: string
          message_id: string
          message_type: string
          reason: string
          reported_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          additional_details?: string | null
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          message_content?: string
          message_id?: string
          message_type?: string
          reason?: string
          reported_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_id?: string
          status?: string
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
            referencedRelation: "event_attendee_counts"
            referencedColumns: ["event_id"]
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
          {
            foreignKeyName: "fk_reviews_service_id"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_complete"
            referencedColumns: ["id"]
          },
        ]
      }
      service_bookings: {
        Row: {
          booking_date: string
          booking_reference: string
          created_at: string
          end_time: string | null
          id: string
          payment_id: string | null
          provider_id: string
          quantity: number
          service_date: string
          service_id: string
          special_requests: string | null
          start_time: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_date: string
          booking_reference?: string
          created_at?: string
          end_time?: string | null
          id?: string
          payment_id?: string | null
          provider_id: string
          quantity?: number
          service_date: string
          service_id: string
          special_requests?: string | null
          start_time?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_date?: string
          booking_reference?: string
          created_at?: string
          end_time?: string | null
          id?: string
          payment_id?: string | null
          provider_id?: string
          quantity?: number
          service_date?: string
          service_id?: string
          special_requests?: string | null
          start_time?: string | null
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
            referencedRelation: "event_attendee_counts"
            referencedColumns: ["event_id"]
          },
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
          {
            foreignKeyName: "fk_service_requests_service_id"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_complete"
            referencedColumns: ["id"]
          },
        ]
      }
      service_schedules: {
        Row: {
          availability_type: string | null
          available_forever: boolean | null
          available_from: string | null
          available_to: string | null
          booking_duration_minutes: number | null
          created_at: string | null
          id: string
          service_id: string
          updated_at: string | null
          weekly_schedule: Json | null
        }
        Insert: {
          availability_type?: string | null
          available_forever?: boolean | null
          available_from?: string | null
          available_to?: string | null
          booking_duration_minutes?: number | null
          created_at?: string | null
          id?: string
          service_id: string
          updated_at?: string | null
          weekly_schedule?: Json | null
        }
        Update: {
          availability_type?: string | null
          available_forever?: boolean | null
          available_from?: string | null
          available_to?: string | null
          booking_duration_minutes?: number | null
          created_at?: string | null
          id?: string
          service_id?: string
          updated_at?: string | null
          weekly_schedule?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "service_schedules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_schedules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_complete"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          availability_type: string | null
          available_forever: boolean | null
          available_from: string | null
          available_to: string | null
          booking_duration_minutes: number | null
          category_id: string | null
          city_id: string | null
          created_at: string
          current_capacity: number | null
          description: string | null
          description_ar: string | null
          detail_images: string[] | null
          discount_percentage: number | null
          duration_minutes: number | null
          duration_per_set: number | null
          end_date: string | null
          featured: boolean | null
          id: string
          image_url: string | null
          is_free: boolean | null
          location: string | null
          location_ar: string | null
          max_capacity: number | null
          name: string
          name_ar: string
          number_of_sets: number | null
          original_price: number | null
          price: number
          provided_services: string[] | null
          provider_id: string
          service_type: string | null
          start_date: string | null
          status: string | null
          thumbnail_url: string | null
          trainer_name: string | null
          training_level: string | null
          updated_at: string
          weekly_schedule: Json | null
        }
        Insert: {
          availability_type?: string | null
          available_forever?: boolean | null
          available_from?: string | null
          available_to?: string | null
          booking_duration_minutes?: number | null
          category_id?: string | null
          city_id?: string | null
          created_at?: string
          current_capacity?: number | null
          description?: string | null
          description_ar?: string | null
          detail_images?: string[] | null
          discount_percentage?: number | null
          duration_minutes?: number | null
          duration_per_set?: number | null
          end_date?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          is_free?: boolean | null
          location?: string | null
          location_ar?: string | null
          max_capacity?: number | null
          name: string
          name_ar: string
          number_of_sets?: number | null
          original_price?: number | null
          price: number
          provided_services?: string[] | null
          provider_id: string
          service_type?: string | null
          start_date?: string | null
          status?: string | null
          thumbnail_url?: string | null
          trainer_name?: string | null
          training_level?: string | null
          updated_at?: string
          weekly_schedule?: Json | null
        }
        Update: {
          availability_type?: string | null
          available_forever?: boolean | null
          available_from?: string | null
          available_to?: string | null
          booking_duration_minutes?: number | null
          category_id?: string | null
          city_id?: string | null
          created_at?: string
          current_capacity?: number | null
          description?: string | null
          description_ar?: string | null
          detail_images?: string[] | null
          discount_percentage?: number | null
          duration_minutes?: number | null
          duration_per_set?: number | null
          end_date?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          is_free?: boolean | null
          location?: string | null
          location_ar?: string | null
          max_capacity?: number | null
          name?: string
          name_ar?: string
          number_of_sets?: number | null
          original_price?: number | null
          price?: number
          provided_services?: string[] | null
          provider_id?: string
          service_type?: string | null
          start_date?: string | null
          status?: string | null
          thumbnail_url?: string | null
          trainer_name?: string | null
          training_level?: string | null
          updated_at?: string
          weekly_schedule?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_services_provider"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profile_counts"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "profiles_complete"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_services_provider"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
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
      support_tickets: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          resolved_at: string | null
          status: string
          subject: string
          target_user_id: string | null
          ticket_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          resolved_at?: string | null
          status?: string
          subject: string
          target_user_id?: string | null
          ticket_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          target_user_id?: string | null
          ticket_type?: string
          updated_at?: string
          user_id?: string
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
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_admin_reply: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin_reply?: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin_reply?: boolean | null
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
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
      training_service_details: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          duration_per_set: number | null
          id: string
          max_capacity: number | null
          number_of_sets: number | null
          provided_services: string[] | null
          service_id: string
          trainer_name: string | null
          training_level: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          duration_per_set?: number | null
          id?: string
          max_capacity?: number | null
          number_of_sets?: number | null
          provided_services?: string[] | null
          service_id: string
          trainer_name?: string | null
          training_level?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          duration_per_set?: number | null
          id?: string
          max_capacity?: number | null
          number_of_sets?: number | null
          provided_services?: string[] | null
          service_id?: string
          trainer_name?: string | null
          training_level?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_service_details_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: true
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_service_details_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: true
            referencedRelation: "services_complete"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sets: {
        Row: {
          available_spots: number
          booked_spots: number | null
          created_at: string | null
          end_time: string
          id: string
          service_id: string | null
          set_date: string
          start_time: string
        }
        Insert: {
          available_spots: number
          booked_spots?: number | null
          created_at?: string | null
          end_time: string
          id?: string
          service_id?: string | null
          set_date: string
          start_time: string
        }
        Update: {
          available_spots?: number
          booked_spots?: number | null
          created_at?: string | null
          end_time?: string
          id?: string
          service_id?: string | null
          set_date?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sets_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sets_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services_complete"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          entity_data: Json | null
          entity_id: string
          entity_type: string
          id: string
          user_id: string
          visibility: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          entity_data?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
          visibility?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          entity_data?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
          visibility?: string | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_gamification: {
        Row: {
          auto_redeem_points: boolean | null
          created_at: string | null
          id: string
          is_shield_member: boolean | null
          points_balance: number | null
          referral_code: string | null
          referral_count: number | null
          referred_by: string | null
          total_points_earned: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_redeem_points?: boolean | null
          created_at?: string | null
          id?: string
          is_shield_member?: boolean | null
          points_balance?: number | null
          referral_code?: string | null
          referral_count?: number | null
          referred_by?: string | null
          total_points_earned?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_redeem_points?: boolean | null
          created_at?: string | null
          id?: string
          is_shield_member?: boolean | null
          points_balance?: number | null
          referral_code?: string | null
          referral_count?: number | null
          referred_by?: string | null
          total_points_earned?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_privacy_settings: {
        Row: {
          activity_visibility: string | null
          allow_friend_requests: boolean | null
          created_at: string | null
          id: string
          interests_visibility: string | null
          profile_visibility: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_visibility?: string | null
          allow_friend_requests?: boolean | null
          created_at?: string | null
          id?: string
          interests_visibility?: string | null
          profile_visibility?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_visibility?: string | null
          allow_friend_requests?: boolean | null
          created_at?: string | null
          id?: string
          interests_visibility?: string | null
          profile_visibility?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: []
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
      user_suspensions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          lifted_at: string | null
          lifted_by: string | null
          reason: string
          suspended_at: string | null
          suspended_by: string | null
          suspended_until: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lifted_at?: string | null
          lifted_by?: string | null
          reason: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_until?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lifted_at?: string | null
          lifted_by?: string | null
          reason?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_until?: string | null
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
      user_warnings: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          admin_id: string
          content: string
          created_at: string | null
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          admin_id: string
          content: string
          created_at?: string | null
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          admin_id?: string
          content?: string
          created_at?: string | null
          id?: string
          reason?: string
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
      admin_activity_logs_view: {
        Row: {
          action: string | null
          admin_id: string | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
        }
        Insert: {
          action?: string | null
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
        }
        Update: {
          action?: string | null
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
        }
        Relationships: []
      }
      category_counts: {
        Row: {
          category_id: string | null
          event_count: number | null
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string | null
          id: string | null
          read_at: string | null
          sender_id: string | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string | null
          read_at?: string | null
          sender_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string | null
          read_at?: string | null
          sender_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendee_counts: {
        Row: {
          current_attendees: number | null
          event_id: string | null
        }
        Relationships: []
      }
      event_bookmarks: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      event_groups: {
        Row: {
          admission_questions: Json | null
          archived_at: string | null
          assigned_admin_id: string | null
          auto_delete_at: string | null
          category_id: string | null
          city_id: string | null
          created_at: string | null
          created_by: string | null
          current_members: number | null
          description: string | null
          description_ar: string | null
          equipment: string[] | null
          event_id: string | null
          gender_restriction: string | null
          group_id_external: string | null
          group_link: string | null
          group_name: string | null
          id: string | null
          image_url: string | null
          join_mode: string | null
          location_restriction: string | null
          max_age: number | null
          max_members: number | null
          min_age: number | null
          requires_approval: boolean | null
          visibility: string | null
        }
        Insert: {
          admission_questions?: Json | null
          archived_at?: string | null
          assigned_admin_id?: string | null
          auto_delete_at?: string | null
          category_id?: string | null
          city_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_members?: number | null
          description?: string | null
          description_ar?: string | null
          equipment?: string[] | null
          event_id?: string | null
          gender_restriction?: string | null
          group_id_external?: string | null
          group_link?: string | null
          group_name?: string | null
          id?: string | null
          image_url?: string | null
          join_mode?: string | null
          location_restriction?: string | null
          max_age?: number | null
          max_members?: number | null
          min_age?: number | null
          requires_approval?: boolean | null
          visibility?: string | null
        }
        Update: {
          admission_questions?: Json | null
          archived_at?: string | null
          assigned_admin_id?: string | null
          auto_delete_at?: string | null
          category_id?: string | null
          city_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_members?: number | null
          description?: string | null
          description_ar?: string | null
          equipment?: string[] | null
          event_id?: string | null
          gender_restriction?: string | null
          group_id_external?: string | null
          group_link?: string | null
          group_name?: string | null
          id?: string | null
          image_url?: string | null
          join_mode?: string | null
          location_restriction?: string | null
          max_age?: number | null
          max_members?: number | null
          min_age?: number | null
          requires_approval?: boolean | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_groups_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "profile_counts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_groups_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_groups_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles_complete"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_groups_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_counts"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "event_groups_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_counts"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_complete"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_attendee_counts"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_groups_location_restriction_fkey"
            columns: ["location_restriction"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      group_counts: {
        Row: {
          group_id: string | null
          member_count: number | null
        }
        Relationships: []
      }
      group_posts: {
        Row: {
          comments_count: number | null
          content: string | null
          created_at: string | null
          group_id: string | null
          id: string | null
          likes_count: number | null
          media_type: string | null
          media_urls: string[] | null
          post_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          comments_count?: number | null
          content?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string | null
          likes_count?: number | null
          media_type?: string | null
          media_urls?: string[] | null
          post_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          comments_count?: number | null
          content?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string | null
          likes_count?: number | null
          media_type?: string | null
          media_urls?: string[] | null
          post_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "event_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_counts"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_option_counts: {
        Row: {
          option_id: string | null
          votes_count: number | null
        }
        Relationships: []
      }
      post_counts: {
        Row: {
          comments_count: number | null
          likes_count: number | null
          post_id: string | null
        }
        Relationships: []
      }
      profile_counts: {
        Row: {
          followers_count: number | null
          following_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
      profiles_complete: {
        Row: {
          activity_visibility: string | null
          address: string | null
          allow_friend_requests: boolean | null
          auto_redeem_points: boolean | null
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          city: string | null
          commercial_registration_url: string | null
          created_at: string | null
          display_id: string | null
          email: string | null
          followers_count: number | null
          following_count: number | null
          full_name: string | null
          gender: string | null
          id: string | null
          id_document_url: string | null
          interests: string[] | null
          interests_visibility: string | null
          is_shield_member: boolean | null
          last_activity: string | null
          license_url: string | null
          phone: string | null
          points_balance: number | null
          profile_visibility: string | null
          referral_code: string | null
          referral_count: number | null
          referred_by: string | null
          rejection_reason: string | null
          service_types: string[] | null
          suspended: boolean | null
          suspended_at: string | null
          suspended_by: string | null
          suspended_until: string | null
          suspension_reason: string | null
          total_points_earned: number | null
          updated_at: string | null
          user_id: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
          warning_count: number | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          activity_visibility: string | null
          allow_friend_requests: boolean | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          display_id: string | null
          followers_count: number | null
          following_count: number | null
          full_name: string | null
          id: string | null
          interests: string[] | null
          interests_visibility: string | null
          is_shield_member: boolean | null
          last_activity: string | null
          profile_visibility: string | null
          updated_at: string | null
          user_id: string | null
          verification_status: string | null
        }
        Relationships: []
      }
      services_complete: {
        Row: {
          availability_type: string | null
          available_forever: boolean | null
          available_from: string | null
          available_to: string | null
          booking_duration_minutes: number | null
          category_id: string | null
          city_id: string | null
          created_at: string | null
          current_capacity: number | null
          description: string | null
          description_ar: string | null
          detail_discount_percentage: number | null
          detail_duration_minutes: number | null
          detail_duration_per_set: number | null
          detail_images: string[] | null
          detail_max_capacity: number | null
          detail_number_of_sets: number | null
          detail_original_price: number | null
          detail_provided_services: string[] | null
          detail_trainer_name: string | null
          detail_training_level: string | null
          detail_valid_from: string | null
          detail_valid_until: string | null
          discount_percentage: number | null
          duration_minutes: number | null
          duration_per_set: number | null
          end_date: string | null
          featured: boolean | null
          id: string | null
          image_url: string | null
          is_free: boolean | null
          location: string | null
          location_ar: string | null
          max_capacity: number | null
          name: string | null
          name_ar: string | null
          number_of_sets: number | null
          original_price: number | null
          price: number | null
          provided_services: string[] | null
          provider_id: string | null
          schedule_availability_type: string | null
          schedule_available_forever: boolean | null
          schedule_available_from: string | null
          schedule_available_to: string | null
          schedule_booking_duration_minutes: number | null
          schedule_weekly_schedule: Json | null
          service_type: string | null
          start_date: string | null
          status: string | null
          thumbnail_url: string | null
          trainer_name: string | null
          training_level: string | null
          updated_at: string | null
          weekly_schedule: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_services_provider"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profile_counts"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "profiles_complete"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_services_provider"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      suspended_users: {
        Row: {
          suspended: boolean | null
          suspended_at: string | null
          suspended_by: string | null
          suspended_until: string | null
          suspension_reason: string | null
          user_id: string | null
        }
        Insert: {
          suspended?: boolean | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          user_id?: string | null
        }
        Update: {
          suspended?: boolean | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_activities_view: {
        Row: {
          activity_type: string | null
          created_at: string | null
          entity_data: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          user_id: string | null
          visibility: string | null
        }
        Insert: {
          activity_type?: string | null
          created_at?: string | null
          entity_data?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          user_id?: string | null
          visibility?: string | null
        }
        Update: {
          activity_type?: string | null
          created_at?: string | null
          entity_data?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          user_id?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string | null
          follower_id: string | null
          following_id: string | null
          id: string | null
        }
        Insert: {
          created_at?: string | null
          follower_id?: string | null
          following_id?: string | null
          id?: string | null
        }
        Update: {
          created_at?: string | null
          follower_id?: string | null
          following_id?: string | null
          id?: string | null
        }
        Relationships: []
      }
      user_interests: {
        Row: {
          created_at: string | null
          id: string | null
          name: string | null
          name_ar: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          name_ar?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          name_ar?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_admin_to_group: { Args: never; Returns: string }
      can_view_full_profile: {
        Args: { _target_user_id: string }
        Returns: boolean
      }
      can_view_profile: { Args: { target_user_id: string }; Returns: boolean }
      check_in_attendee: {
        Args: { location?: string; organizer_id: string; ticket_id: string }
        Returns: Json
      }
      delete_user_completely: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      generate_display_id: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_mutual_followers: {
        Args: { user_a: string; user_b: string }
        Returns: {
          avatar_url: string
          display_id: string
          full_name: string
          user_id: string
        }[]
      }
      get_suspended_users: {
        Args: never
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          suspended: boolean
          suspended_at: string
          suspended_by: string
          suspended_until: string
          suspension_reason: string
          user_id: string
          warning_count: number
        }[]
      }
      get_verification_status: {
        Args: { target_user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_event_attendees: {
        Args: { event_id: string; increment_by: number }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_group_chat_admin: {
        Args: { p_chat_id: string; p_user_id: string }
        Returns: boolean
      }
      is_group_chat_member: {
        Args: { p_chat_id: string; p_user_id: string }
        Returns: boolean
      }
      is_user_suspended: { Args: { target_user_id: string }; Returns: boolean }
      log_system_event: {
        Args: { p_details?: Json; p_level: string; p_message: string }
        Returns: string
      }
      request_group_join: {
        Args: {
          p_admission_answers?: Json
          p_cooldown_seconds?: number
          p_group_id: string
          p_message?: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "attendee" | "organizer" | "provider" | "admin"
      friend_request_status: "pending" | "accepted" | "rejected" | "cancelled"
      friendship_status: "pending" | "accepted" | "blocked"
      profile_visibility: "public" | "friends_only" | "private"
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
      friend_request_status: ["pending", "accepted", "rejected", "cancelled"],
      friendship_status: ["pending", "accepted", "blocked"],
      profile_visibility: ["public", "friends_only", "private"],
    },
  },
} as const

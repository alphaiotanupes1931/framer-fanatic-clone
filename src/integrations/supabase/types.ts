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
      artist_inquiries: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          intent: string
          message: string
          sender_email: string
          sender_id: string | null
          sender_name: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          intent: string
          message: string
          sender_email: string
          sender_id?: string | null
          sender_name: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          intent?: string
          message?: string
          sender_email?: string
          sender_id?: string | null
          sender_name?: string
        }
        Relationships: []
      }
      close_friends: {
        Row: {
          created_at: string
          friend_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          user_id?: string
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          cleared_at: string | null
          conversation_id: string
          joined_at: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          cleared_at?: string | null
          conversation_id: string
          joined_at?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          cleared_at?: string | null
          conversation_id?: string
          joined_at?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          cleared_at_a: string | null
          cleared_at_b: string | null
          created_at: string
          created_by: string | null
          id: string
          is_group: boolean
          last_message_at: string
          last_message_preview: string | null
          last_read_at_a: string
          last_read_at_b: string
          title: string | null
          user_a: string | null
          user_b: string | null
        }
        Insert: {
          cleared_at_a?: string | null
          cleared_at_b?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string
          last_message_preview?: string | null
          last_read_at_a?: string
          last_read_at_b?: string
          title?: string | null
          user_a?: string | null
          user_b?: string | null
        }
        Update: {
          cleared_at_a?: string | null
          cleared_at_b?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string
          last_message_preview?: string | null
          last_read_at_a?: string
          last_read_at_b?: string
          title?: string | null
          user_a?: string | null
          user_b?: string | null
        }
        Relationships: []
      }
      ephemeral_stories: {
        Row: {
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          media_type: string
          media_url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          user_id?: string
        }
        Relationships: []
      }
      event_promoters: {
        Row: {
          commission_rate: number
          created_at: string
          email: string
          event_id: string
          id: string
          name: string
          organizer_id: string
          promoter_user_id: string | null
          referral_code: string
          status: string
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          email: string
          event_id: string
          id?: string
          name: string
          organizer_id: string
          promoter_user_id?: string | null
          referral_code?: string
          status?: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          email?: string
          event_id?: string
          id?: string
          name?: string
          organizer_id?: string
          promoter_user_id?: string | null
          referral_code?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_promoters_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_saves: {
        Row: {
          created_at: string
          event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_saves_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          capacity: number | null
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_exhibition: boolean
          is_published: boolean
          latitude: number | null
          location: string | null
          longitude: number | null
          neighborhood: string | null
          organization_id: string | null
          price_cents: number
          starts_at: string
          status: string
          title: string
          updated_at: string
          user_id: string
          venue_name: string | null
          video_url: string | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_exhibition?: boolean
          is_published?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          neighborhood?: string | null
          organization_id?: string | null
          price_cents?: number
          starts_at: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          venue_name?: string | null
          video_url?: string | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_exhibition?: boolean
          is_published?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          neighborhood?: string | null
          organization_id?: string | null
          price_cents?: number
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          venue_name?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invite_url: string | null
          invited_by: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invite_url?: string | null
          invited_by?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invite_url?: string | null
          invited_by?: string | null
        }
        Relationships: []
      }
      marketplace_listings: {
        Row: {
          category: string
          condition: string
          created_at: string
          description: string | null
          id: string
          location: string | null
          neighborhood: string | null
          photos: string[]
          price_cents: number
          seller_id: string
          status: string
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          category?: string
          condition?: string
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          neighborhood?: string | null
          photos?: string[]
          price_cents?: number
          seller_id: string
          status?: string
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          neighborhood?: string | null
          photos?: string[]
          price_cents?: number
          seller_id?: string
          status?: string
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          deleted_for: string[]
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          deleted_for?: string[]
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          deleted_for?: string[]
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      neighborhoods: {
        Row: {
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          region: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          region: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          region?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          email_digest: boolean
          event_reminders: boolean
          new_follower: boolean
          new_message: boolean
          post_comments: boolean
          post_likes: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email_digest?: boolean
          event_reminders?: boolean
          new_follower?: boolean
          new_message?: boolean
          post_comments?: boolean
          post_likes?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email_digest?: boolean
          event_reminders?: boolean
          new_follower?: boolean
          new_message?: boolean
          post_comments?: boolean
          post_likes?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          metadata: Json | null
          target_id: string | null
          target_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          org_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          org_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_dues_payments: {
        Row: {
          amount_cents: number
          buyer_total_cents: number
          created_at: string
          id: string
          interval: string
          member_id: string
          org_id: string
          owner_id: string
          owner_net_cents: number
          period_end: string | null
          period_start: string | null
          platform_fee_cents: number
          status: string
          stripe_checkout_session_id: string | null
          stripe_fee_cents: number
          stripe_payment_intent_id: string | null
          tier_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          buyer_total_cents: number
          created_at?: string
          id?: string
          interval: string
          member_id: string
          org_id: string
          owner_id: string
          owner_net_cents: number
          period_end?: string | null
          period_start?: string | null
          platform_fee_cents: number
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_fee_cents: number
          stripe_payment_intent_id?: string | null
          tier_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          buyer_total_cents?: number
          created_at?: string
          id?: string
          interval?: string
          member_id?: string
          org_id?: string
          owner_id?: string
          owner_net_cents?: number
          period_end?: string | null
          period_start?: string | null
          platform_fee_cents?: number
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_fee_cents?: number
          stripe_payment_intent_id?: string | null
          tier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_dues_payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_dues_payments_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "organization_dues_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_dues_tiers: {
        Row: {
          amount_cents: number
          created_at: string
          description: string | null
          id: string
          interval: string
          is_active: boolean
          name: string
          org_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          description?: string | null
          id?: string
          interval?: string
          is_active?: boolean
          name: string
          org_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          description?: string | null
          id?: string
          interval?: string
          is_active?: boolean
          name?: string
          org_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_dues_tiers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_followers: {
        Row: {
          created_at: string
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_followers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_posts: {
        Row: {
          author_id: string
          bg_color: string | null
          body: string | null
          created_at: string
          font_size: string | null
          id: string
          kind: string
          link_url: string | null
          media_url: string | null
          media_urls: Json
          org_id: string
          text_color: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          author_id: string
          bg_color?: string | null
          body?: string | null
          created_at?: string
          font_size?: string | null
          id?: string
          kind: string
          link_url?: string | null
          media_url?: string | null
          media_urls?: Json
          org_id: string
          text_color?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          author_id?: string
          bg_color?: string | null
          body?: string | null
          created_at?: string
          font_size?: string | null
          id?: string
          kind?: string
          link_url?: string | null
          media_url?: string | null
          media_urls?: Json
          org_id?: string
          text_color?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_posts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_price_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          price_cents: number | null
          price_label: string | null
          section: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          price_cents?: number | null
          price_label?: string | null
          section?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          price_cents?: number | null
          price_label?: string | null
          section?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_price_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_support_tiers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          interval: string
          join_url: string | null
          name: string
          organization_id: string
          price_cents: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          interval?: string
          join_url?: string | null
          name: string
          organization_id: string
          price_cents?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          interval?: string
          join_url?: string | null
          name?: string
          organization_id?: string
          price_cents?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_support_tiers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          hours: Json | null
          id: string
          mission: string | null
          name: string
          neighborhood: string | null
          owner_id: string
          phone: string | null
          slug: string
          subtype: string | null
          tagline: string | null
          type: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          hours?: Json | null
          id?: string
          mission?: string | null
          name: string
          neighborhood?: string | null
          owner_id: string
          phone?: string | null
          slug: string
          subtype?: string | null
          tagline?: string | null
          type: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          hours?: Json | null
          id?: string
          mission?: string | null
          name?: string
          neighborhood?: string | null
          owner_id?: string
          phone?: string | null
          slug?: string
          subtype?: string | null
          tagline?: string | null
          type?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      podcast_episodes: {
        Row: {
          audio_url: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          episode_number: number | null
          id: string
          published_at: string | null
          title: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          episode_number?: number | null
          id?: string
          published_at?: string | null
          title: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          episode_number?: number | null
          id?: string
          published_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_saves: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          bg_color: string | null
          category: string | null
          comments_count: number
          content: string
          created_at: string
          excluded_user_ids: string[]
          featured: boolean
          featured_at: string | null
          font_size: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          is_pinned: boolean
          likes_count: number
          media_urls: string[]
          music_url: string | null
          neighborhood: string | null
          pin_order: number | null
          post_type: string
          tag: string | null
          text_color: string | null
          user_id: string
          video_url: string | null
          visibility: string
        }
        Insert: {
          bg_color?: string | null
          category?: string | null
          comments_count?: number
          content: string
          created_at?: string
          excluded_user_ids?: string[]
          featured?: boolean
          featured_at?: string | null
          font_size?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_pinned?: boolean
          likes_count?: number
          media_urls?: string[]
          music_url?: string | null
          neighborhood?: string | null
          pin_order?: number | null
          post_type?: string
          tag?: string | null
          text_color?: string | null
          user_id: string
          video_url?: string | null
          visibility?: string
        }
        Update: {
          bg_color?: string | null
          category?: string | null
          comments_count?: number
          content?: string
          created_at?: string
          excluded_user_ids?: string[]
          featured?: boolean
          featured_at?: string | null
          font_size?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_pinned?: boolean
          likes_count?: number
          media_urls?: string[]
          music_url?: string | null
          neighborhood?: string | null
          pin_order?: number | null
          post_type?: string
          tag?: string | null
          text_color?: string | null
          user_id?: string
          video_url?: string | null
          visibility?: string
        }
        Relationships: []
      }
      profile_sections: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link_url: string | null
          media_url: string | null
          order_index: number
          parent_id: string | null
          subtitle: string | null
          title: string | null
          updated_at: string
          user_id: string
          year: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link_url?: string | null
          media_url?: string | null
          order_index?: number
          parent_id?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          year?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link_url?: string | null
          media_url?: string | null
          order_index?: number
          parent_id?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_sections_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profile_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_wall_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          profile_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned: boolean
          banner_url: string | null
          bio: string | null
          category: string | null
          city: string | null
          created_at: string
          display_name: string | null
          email: string | null
          geo_lat: number | null
          geo_lng: number | null
          hidden_from_showcase: boolean
          id: string
          in_baltimore: boolean
          is_baltimore_verified: boolean
          is_founder: boolean
          last_seen_at: string | null
          latitude: number | null
          longitude: number | null
          must_reset_password: boolean
          neighborhood: string | null
          neighborhood_names: string[]
          onboarded: boolean
          referred_by: string | null
          role: string
          stripe_account_id: string | null
          stripe_account_status: string | null
          stripe_charges_enabled: boolean
          updated_at: string
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          banned?: boolean
          banner_url?: string | null
          bio?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          hidden_from_showcase?: boolean
          id: string
          in_baltimore?: boolean
          is_baltimore_verified?: boolean
          is_founder?: boolean
          last_seen_at?: string | null
          latitude?: number | null
          longitude?: number | null
          must_reset_password?: boolean
          neighborhood?: string | null
          neighborhood_names?: string[]
          onboarded?: boolean
          referred_by?: string | null
          role?: string
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          stripe_charges_enabled?: boolean
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          banned?: boolean
          banner_url?: string | null
          bio?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          hidden_from_showcase?: boolean
          id?: string
          in_baltimore?: boolean
          is_baltimore_verified?: boolean
          is_founder?: boolean
          last_seen_at?: string | null
          latitude?: number | null
          longitude?: number | null
          must_reset_password?: boolean
          neighborhood?: string | null
          neighborhood_names?: string[]
          onboarded?: boolean
          referred_by?: string | null
          role?: string
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          stripe_charges_enabled?: boolean
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      stories: {
        Row: {
          comments_count: number
          content: string | null
          cover_url: string | null
          created_at: string
          excerpt: string | null
          featured: boolean
          featured_at: string | null
          format: string
          id: string
          likes_count: number
          read_minutes: number | null
          status: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          comments_count?: number
          content?: string | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          featured_at?: string | null
          format?: string
          id?: string
          likes_count?: number
          read_minutes?: number | null
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          comments_count?: number
          content?: string | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          featured_at?: string | null
          format?: string
          id?: string
          likes_count?: number
          read_minutes?: number | null
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      story_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_comments_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_likes: {
        Row: {
          created_at: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_likes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_saves: {
        Row: {
          created_at: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_saves_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          category: string
          created_at: string
          description: string | null
          event_id: string
          id: string
          max_per_buyer: number | null
          name: string
          perks: string[]
          price_cents: number
          quantity: number | null
          sale_ends_at: string | null
          sale_starts_at: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          max_per_buyer?: number | null
          name: string
          perks?: string[]
          price_cents?: number
          quantity?: number | null
          sale_ends_at?: string | null
          sale_starts_at?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          max_per_buyer?: number | null
          name?: string
          perks?: string[]
          price_cents?: number
          quantity?: number | null
          sale_ends_at?: string | null
          sale_starts_at?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          artist_id: string
          artist_net_cents: number
          buyer_id: string
          buyer_total_cents: number
          created_at: string
          event_id: string
          id: string
          platform_tax_cents: number
          status: string
          stripe_checkout_session_id: string | null
          stripe_fee_cents: number
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          artist_id: string
          artist_net_cents: number
          buyer_id: string
          buyer_total_cents: number
          created_at?: string
          event_id: string
          id?: string
          platform_tax_cents: number
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_fee_cents?: number
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          artist_id?: string
          artist_net_cents?: number
          buyer_id?: string
          buyer_total_cents?: number
          created_at?: string
          event_id?: string
          id?: string
          platform_tax_cents?: number
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_fee_cents?: number
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
      videos: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          featured: boolean
          id: string
          thumbnail_url: string | null
          title: string
          user_id: string
          video_url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          thumbnail_url?: string | null
          title: string
          user_id: string
          video_url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          thumbnail_url?: string | null
          title?: string
          user_id?: string
          video_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          category: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          in_baltimore: boolean | null
          is_baltimore_verified: boolean | null
          is_founder: boolean | null
          last_seen_at: string | null
          neighborhood: string | null
          neighborhood_names: string[] | null
          role: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          category?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          in_baltimore?: boolean | null
          is_baltimore_verified?: boolean | null
          is_founder?: boolean | null
          last_seen_at?: string | null
          neighborhood?: string | null
          neighborhood_names?: string[] | null
          role?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          category?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          in_baltimore?: boolean | null
          is_baltimore_verified?: boolean | null
          is_founder?: boolean | null
          last_seen_at?: string | null
          neighborhood?: string | null
          neighborhood_names?: string[] | null
          role?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_delete_event: { Args: { _id: string }; Returns: undefined }
      admin_delete_organization: { Args: { _id: string }; Returns: undefined }
      admin_delete_profile: { Args: { _id: string }; Returns: undefined }
      admin_list_events: {
        Args: never
        Returns: {
          host_name: string
          id: string
          starts_at: string
          title: string
          user_id: string
        }[]
      }
      admin_list_organizations: {
        Args: never
        Returns: {
          id: string
          name: string
          slug: string
          type: string
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          avatar_url: string
          banned: boolean
          created_at: string
          display_name: string
          email: string
          hidden_from_showcase: boolean
          id: string
          in_baltimore: boolean
          is_admin: boolean
          last_seen_at: string
          neighborhood: string
          role: string
          username: string
        }[]
      }
      admin_set_banned: {
        Args: { _banned: boolean; _user_id: string }
        Returns: undefined
      }
      admin_set_showcase_hidden: {
        Args: { _hidden: boolean; _user_id: string }
        Returns: undefined
      }
      admin_toggle_content_pin: {
        Args: { _content_id: string; _content_type: string; _pinned: boolean }
        Returns: undefined
      }
      admin_update_profile: {
        Args: {
          _avatar_url?: string
          _bio?: string
          _display_name?: string
          _neighborhood?: string
          _user_id: string
          _username?: string
        }
        Returns: undefined
      }
      admin_upsert_site_content: { Args: { _rows: Json }; Returns: number }
      generate_unique_username: {
        Args: { _base: string; _self: string }
        Returns: string
      }
      get_actors_minimal: {
        Args: { _ids: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_caller: { Args: never; Returns: boolean }
      is_conversation_member: {
        Args: { _conv: string; _uid: string }
        Returns: boolean
      }
      public_artists: {
        Args: { lim?: number; search?: string; sort_by?: string }
        Returns: {
          avatar_url: string
          bio: string
          category: string
          created_at: string
          display_name: string
          id: string
          in_baltimore: boolean
          neighborhood: string
          role: string
          username: string
        }[]
      }
      public_creators: {
        Args: { lim?: number }
        Returns: {
          avatar_url: string
          category: string
          display_name: string
          id: string
          role: string
          username: string
        }[]
      }
      public_profile_by_username: {
        Args: { _username: string }
        Returns: {
          avatar_url: string
          banner_url: string
          bio: string
          category: string
          display_name: string
          id: string
          neighborhood: string
          role: string
          username: string
          website: string
        }[]
      }
      public_profiles_by_ids: {
        Args: { _ids: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          is_founder: boolean
          neighborhood: string
          username: string
        }[]
      }
      public_rotating_stories: {
        Args: { lim?: number }
        Returns: {
          author_avatar: string
          author_name: string
          author_username: string
          cover_url: string
          created_at: string
          excerpt: string
          id: string
          title: string
        }[]
      }
      resolve_referrer: { Args: { _username: string }; Returns: string }
      search_all_users: {
        Args: { lim?: number; q?: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          username: string
        }[]
      }
      search_creators: {
        Args: { lim?: number; q?: string }
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          id: string
          in_baltimore: boolean
          neighborhood: string
          role: string
          username: string
        }[]
      }
      slugify_username: { Args: { s: string }; Returns: string }
      titlecase_name: { Args: { s: string }; Returns: string }
      top_creators: {
        Args: { lim?: number }
        Returns: {
          avatar_url: string
          category: string
          display_name: string
          id: string
          is_founder: boolean
          role: string
          score: number
          username: string
        }[]
      }
      touch_last_seen: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "attendee" | "artist" | "admin" | "resident" | "visitor"
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
      app_role: ["attendee", "artist", "admin", "resident", "visitor"],
    },
  },
} as const

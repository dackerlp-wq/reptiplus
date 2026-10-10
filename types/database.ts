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
      address: {
        Row: {
          city: string | null
          company: string | null
          country: string
          created_at: string
          customer_id: string
          dic: string | null
          full_name: string | null
          ico: string | null
          id: string
          is_default: boolean
          label: string | null
          phone: string | null
          postal_code: string | null
          street: string | null
          type: Database["public"]["Enums"]["address_type"]
        }
        Insert: {
          city?: string | null
          company?: string | null
          country?: string
          created_at?: string
          customer_id: string
          dic?: string | null
          full_name?: string | null
          ico?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          type?: Database["public"]["Enums"]["address_type"]
        }
        Update: {
          city?: string | null
          company?: string | null
          country?: string
          created_at?: string
          customer_id?: string
          dic?: string | null
          full_name?: string | null
          ico?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          type?: Database["public"]["Enums"]["address_type"]
        }
        Relationships: [
          {
            foreignKeyName: "address_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
        ]
      }
      app_setting: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      article: {
        Row: {
          body: string | null
          body_i18n: Json | null
          category_id: string | null
          cover_url: string | null
          created_at: string
          excerpt: string | null
          excerpt_i18n: Json | null
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          title: string
          title_i18n: Json | null
        }
        Insert: {
          body?: string | null
          body_i18n?: Json | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          excerpt_i18n?: Json | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          title: string
          title_i18n?: Json | null
        }
        Update: {
          body?: string | null
          body_i18n?: Json | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          excerpt_i18n?: Json | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          title_i18n?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "article_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category"
            referencedColumns: ["id"]
          },
        ]
      }
      brand: {
        Row: {
          created_at: string
          description: string | null
          description_i18n: Json | null
          id: string
          is_published: boolean
          logo_url: string | null
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_i18n?: Json | null
          id?: string
          is_published?: boolean
          logo_url?: string | null
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          description_i18n?: Json | null
          id?: string
          is_published?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      cart: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          reminder_sent_at: string | null
          session_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          reminder_sent_at?: string | null
          session_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          reminder_sent_at?: string | null
          session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_item: {
        Row: {
          added_at: string
          cart_id: string
          id: string
          product_id: string
          qty: number
          variant_id: string | null
        }
        Insert: {
          added_at?: string
          cart_id: string
          id?: string
          product_id: string
          qty?: number
          variant_id?: string | null
        }
        Update: {
          added_at?: string
          cart_id?: string
          id?: string
          product_id?: string
          qty?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_item_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "cart"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_item_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_item_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variant"
            referencedColumns: ["id"]
          },
        ]
      }
      category: {
        Row: {
          created_at: string
          description: string | null
          description_i18n: Json | null
          id: string
          image_url: string | null
          is_published: boolean
          name: string
          name_i18n: Json | null
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_i18n?: Json | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          name: string
          name_i18n?: Json | null
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          description_i18n?: Json | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          name?: string
          name_i18n?: Json | null
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "category_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "category"
            referencedColumns: ["id"]
          },
        ]
      }
      claim: {
        Row: {
          admin_note: string | null
          bank_account: string | null
          created_at: string
          customer_id: string | null
          email: string
          id: string
          items: string
          locale: string
          name: string
          order_id: string | null
          order_number: string
          phone: string | null
          reason: string | null
          resolved_at: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          bank_account?: string | null
          created_at?: string
          customer_id?: string | null
          email: string
          id?: string
          items: string
          locale?: string
          name: string
          order_id?: string | null
          order_number: string
          phone?: string | null
          reason?: string | null
          resolved_at?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          bank_account?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string
          id?: string
          items?: string
          locale?: string
          name?: string
          order_id?: string | null
          order_number?: string
          phone?: string | null
          reason?: string | null
          resolved_at?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
        ]
      }
      customer: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      discount_code: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          min_order: number | null
          type: Database["public"]["Enums"]["discount_type"]
          usage_limit: number | null
          used_count: number
          valid_from: string | null
          valid_to: string | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          min_order?: number | null
          type: Database["public"]["Enums"]["discount_type"]
          usage_limit?: number | null
          used_count?: number
          valid_from?: string | null
          valid_to?: string | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          min_order?: number | null
          type?: Database["public"]["Enums"]["discount_type"]
          usage_limit?: number | null
          used_count?: number
          valid_from?: string | null
          valid_to?: string | null
          value?: number
        }
        Relationships: []
      }
      gift_voucher: {
        Row: {
          balance: number
          code: string
          created_at: string
          created_by: string | null
          id: string
          message: string | null
          note: string | null
          order_id: string | null
          recipient_email: string | null
          recipient_name: string | null
          status: string
          updated_at: string
          valid_to: string | null
          value: number
        }
        Insert: {
          balance: number
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string | null
          note?: string | null
          order_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          status?: string
          updated_at?: string
          valid_to?: string | null
          value: number
        }
        Update: {
          balance?: number
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string | null
          note?: string | null
          order_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          status?: string
          updated_at?: string
          valid_to?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "gift_voucher_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_voucher_redemption: {
        Row: {
          amount: number
          amount_czk: number
          created_at: string
          id: string
          order_id: string
          voucher_id: string
        }
        Insert: {
          amount: number
          amount_czk: number
          created_at?: string
          id?: string
          order_id: string
          voucher_id: string
        }
        Update: {
          amount?: number
          amount_czk?: number
          created_at?: string
          id?: string
          order_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_voucher_redemption_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_voucher_redemption_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "gift_voucher"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice: {
        Row: {
          buyer: Json
          created_at: string
          created_by: string | null
          currency: string
          due_date: string | null
          exchange_rate: number | null
          id: string
          issued_at: string
          items: Json
          note: string | null
          number: string
          order_id: string
          paid_at: string | null
          payment_method: string | null
          related_invoice_id: string | null
          seller: Json
          subtotal: number
          taxable_date: string
          total: number
          type: string
          variable_symbol: string | null
          vat_breakdown: Json
          vat_total: number
          vat_total_czk: number | null
        }
        Insert: {
          buyer: Json
          created_at?: string
          created_by?: string | null
          currency: string
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          issued_at?: string
          items: Json
          note?: string | null
          number: string
          order_id: string
          paid_at?: string | null
          payment_method?: string | null
          related_invoice_id?: string | null
          seller: Json
          subtotal: number
          taxable_date?: string
          total: number
          type: string
          variable_symbol?: string | null
          vat_breakdown?: Json
          vat_total: number
          vat_total_czk?: number | null
        }
        Update: {
          buyer?: Json
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          issued_at?: string
          items?: Json
          note?: string | null
          number?: string
          order_id?: string
          paid_at?: string | null
          payment_method?: string | null
          related_invoice_id?: string | null
          seller?: Json
          subtotal?: number
          taxable_date?: string
          total?: number
          type?: string
          variable_symbol?: string | null
          vat_breakdown?: Json
          vat_total?: number
          vat_total_czk?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_related_invoice_id_fkey"
            columns: ["related_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_counter: {
        Row: {
          last_number: number
          series: string
          year: number
        }
        Insert: {
          last_number?: number
          series: string
          year: number
        }
        Update: {
          last_number?: number
          series?: string
          year?: number
        }
        Relationships: []
      }
      ledx_inquiry: {
        Row: {
          anonymized_at: string | null
          cct: string | null
          created_at: string
          email: string
          follow_up_at: string | null
          handled: boolean
          id: string
          ip_hash: string | null
          locale: string
          model: string | null
          name: string
          phone: string | null
          pocet: number | null
          poznamka: string | null
          quote_amount: number | null
          quote_currency: string | null
          quote_number: string | null
          quote_valid_until: string | null
          rada: string | null
          status: string
          stmivani: string | null
          uhel: string | null
          updated_at: string
        }
        Insert: {
          anonymized_at?: string | null
          cct?: string | null
          created_at?: string
          email: string
          follow_up_at?: string | null
          handled?: boolean
          id?: string
          ip_hash?: string | null
          locale?: string
          model?: string | null
          name: string
          phone?: string | null
          pocet?: number | null
          poznamka?: string | null
          quote_amount?: number | null
          quote_currency?: string | null
          quote_number?: string | null
          quote_valid_until?: string | null
          rada?: string | null
          status?: string
          stmivani?: string | null
          uhel?: string | null
          updated_at?: string
        }
        Update: {
          anonymized_at?: string | null
          cct?: string | null
          created_at?: string
          email?: string
          follow_up_at?: string | null
          handled?: boolean
          id?: string
          ip_hash?: string | null
          locale?: string
          model?: string | null
          name?: string
          phone?: string | null
          pocet?: number | null
          poznamka?: string | null
          quote_amount?: number | null
          quote_currency?: string | null
          quote_number?: string | null
          quote_valid_until?: string | null
          rada?: string | null
          status?: string
          stmivani?: string | null
          uhel?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ledx_inquiry_event: {
        Row: {
          author_email: string | null
          author_id: string | null
          body: string | null
          created_at: string
          id: string
          inquiry_id: string
          meta: Json
          type: string
        }
        Insert: {
          author_email?: string | null
          author_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          inquiry_id: string
          meta?: Json
          type: string
        }
        Update: {
          author_email?: string | null
          author_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          inquiry_id?: string
          meta?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledx_inquiry_event_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "ledx_inquiry"
            referencedColumns: ["id"]
          },
        ]
      }
      ledx_line: {
        Row: {
          created_at: string
          detail_lead: string | null
          detail_pills: Json
          form_cct: Json
          form_cct_fixed: string | null
          form_models: Json
          form_uhel: Json
          id: string
          images: Json
          is_published: boolean
          landing_desc: string | null
          landing_pills: Json
          models: Json
          models_note: string | null
          name: string
          params: Json
          slug: string
          sort_order: number
          subtitle: string | null
          tagline: string | null
          translations: Json
          uses: Json
          uses_title: string | null
        }
        Insert: {
          created_at?: string
          detail_lead?: string | null
          detail_pills?: Json
          form_cct?: Json
          form_cct_fixed?: string | null
          form_models?: Json
          form_uhel?: Json
          id?: string
          images?: Json
          is_published?: boolean
          landing_desc?: string | null
          landing_pills?: Json
          models?: Json
          models_note?: string | null
          name: string
          params?: Json
          slug: string
          sort_order?: number
          subtitle?: string | null
          tagline?: string | null
          translations?: Json
          uses?: Json
          uses_title?: string | null
        }
        Update: {
          created_at?: string
          detail_lead?: string | null
          detail_pills?: Json
          form_cct?: Json
          form_cct_fixed?: string | null
          form_models?: Json
          form_uhel?: Json
          id?: string
          images?: Json
          is_published?: boolean
          landing_desc?: string | null
          landing_pills?: Json
          models?: Json
          models_note?: string | null
          name?: string
          params?: Json
          slug?: string
          sort_order?: number
          subtitle?: string | null
          tagline?: string | null
          translations?: Json
          uses?: Json
          uses_title?: string | null
        }
        Relationships: []
      }
      newsletter_subscriber: {
        Row: {
          confirmed_at: string | null
          created_at: string
          customer_id: string | null
          discount_code_id: string | null
          email: string
          id: string
          is_confirmed: boolean
          locale: string
          source: string | null
          token: string | null
          unsubscribed_at: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          customer_id?: string | null
          discount_code_id?: string | null
          email: string
          id?: string
          is_confirmed?: boolean
          locale?: string
          source?: string | null
          token?: string | null
          unsubscribed_at?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          customer_id?: string | null
          discount_code_id?: string | null
          email?: string
          id?: string
          is_confirmed?: boolean
          locale?: string
          source?: string | null
          token?: string | null
          unsubscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_subscriber_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_subscriber_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_code"
            referencedColumns: ["id"]
          },
        ]
      }
      order: {
        Row: {
          admin_note: string | null
          billing_address: Json | null
          carrier_shipment_id: string | null
          comgate_ref: string | null
          created_at: string
          currency: string
          customer_id: string | null
          discount: number
          discount_code_id: string | null
          email: string
          id: string
          label_printed_at: string | null
          locale: string
          note: string | null
          number: string
          payment_fee: number
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          refunded_amount: number
          refunded_at: string | null
          shipping: number
          shipping_address: Json | null
          shipping_method: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          tracking_number: string | null
          tracking_status: string | null
          tracking_url: string | null
          updated_at: string
          voucher_amount: number
          voucher_id: string | null
        }
        Insert: {
          admin_note?: string | null
          billing_address?: Json | null
          carrier_shipment_id?: string | null
          comgate_ref?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount?: number
          discount_code_id?: string | null
          email: string
          id?: string
          label_printed_at?: string | null
          locale?: string
          note?: string | null
          number: string
          payment_fee?: number
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          refunded_amount?: number
          refunded_at?: string | null
          shipping?: number
          shipping_address?: Json | null
          shipping_method?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_number?: string | null
          tracking_status?: string | null
          tracking_url?: string | null
          updated_at?: string
          voucher_amount?: number
          voucher_id?: string | null
        }
        Update: {
          admin_note?: string | null
          billing_address?: Json | null
          carrier_shipment_id?: string | null
          comgate_ref?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount?: number
          discount_code_id?: string | null
          email?: string
          id?: string
          label_printed_at?: string | null
          locale?: string
          note?: string | null
          number?: string
          payment_fee?: number
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          refunded_amount?: number
          refunded_at?: string | null
          shipping?: number
          shipping_address?: Json | null
          shipping_method?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_number?: string | null
          tracking_status?: string | null
          tracking_url?: string | null
          updated_at?: string
          voucher_amount?: number
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_code"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "gift_voucher"
            referencedColumns: ["id"]
          },
        ]
      }
      order_event: {
        Row: {
          author_email: string | null
          author_id: string | null
          body: string | null
          created_at: string
          id: string
          meta: Json
          order_id: string
          type: string
        }
        Insert: {
          author_email?: string | null
          author_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          meta?: Json
          order_id: string
          type: string
        }
        Update: {
          author_email?: string | null
          author_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          meta?: Json
          order_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_event_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item: {
        Row: {
          id: string
          line_total: number
          name: string
          order_id: string
          product_id: string | null
          qty: number
          sku: string | null
          unit_price: number
          variant_id: string | null
          vat_rate: number
        }
        Insert: {
          id?: string
          line_total: number
          name: string
          order_id: string
          product_id?: string | null
          qty: number
          sku?: string | null
          unit_price: number
          variant_id?: string | null
          vat_rate?: number
        }
        Update: {
          id?: string
          line_total?: number
          name?: string
          order_id?: string
          product_id?: string | null
          qty?: number
          sku?: string | null
          unit_price?: number
          variant_id?: string | null
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_item_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variant"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_method: {
        Row: {
          code: string
          created_at: string
          fee_czk: number
          fee_eur: number | null
          id: string
          is_active: boolean
          name_i18n: Json
          provider: Database["public"]["Enums"]["payment_provider"]
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          fee_czk?: number
          fee_eur?: number | null
          id?: string
          is_active?: boolean
          name_i18n?: Json
          provider?: Database["public"]["Enums"]["payment_provider"]
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          fee_czk?: number
          fee_eur?: number | null
          id?: string
          is_active?: boolean
          name_i18n?: Json
          provider?: Database["public"]["Enums"]["payment_provider"]
          sort_order?: number
        }
        Relationships: []
      }
      product: {
        Row: {
          brand_id: string | null
          category_id: string | null
          compare_at_czk: number | null
          compare_at_eur: number | null
          created_at: string
          description: string | null
          description_i18n: Json | null
          ean: string | null
          id: string
          is_featured: boolean
          is_gift_voucher: boolean
          is_published: boolean
          low_stock_notified_at: string | null
          low_stock_threshold: number | null
          name: string
          name_i18n: Json | null
          price_czk: number
          price_eur: number | null
          purchase_price_czk: number | null
          search_vector: unknown
          short_description: string | null
          short_description_i18n: Json
          sku: string | null
          slug: string
          stock_qty: number
          updated_at: string
          vat_rate: number
        }
        Insert: {
          brand_id?: string | null
          category_id?: string | null
          compare_at_czk?: number | null
          compare_at_eur?: number | null
          created_at?: string
          description?: string | null
          description_i18n?: Json | null
          ean?: string | null
          id?: string
          is_featured?: boolean
          is_gift_voucher?: boolean
          is_published?: boolean
          low_stock_notified_at?: string | null
          low_stock_threshold?: number | null
          name: string
          name_i18n?: Json | null
          price_czk?: number
          price_eur?: number | null
          purchase_price_czk?: number | null
          search_vector?: unknown
          short_description?: string | null
          short_description_i18n?: Json
          sku?: string | null
          slug: string
          stock_qty?: number
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          brand_id?: string | null
          category_id?: string | null
          compare_at_czk?: number | null
          compare_at_eur?: number | null
          created_at?: string
          description?: string | null
          description_i18n?: Json | null
          ean?: string | null
          id?: string
          is_featured?: boolean
          is_gift_voucher?: boolean
          is_published?: boolean
          low_stock_notified_at?: string | null
          low_stock_threshold?: number | null
          name?: string
          name_i18n?: Json | null
          price_czk?: number
          price_eur?: number | null
          purchase_price_czk?: number | null
          search_vector?: unknown
          short_description?: string | null
          short_description_i18n?: Json
          sku?: string | null
          slug?: string
          stock_qty?: number
          updated_at?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attribute: {
        Row: {
          id: string
          key: string
          key_i18n: Json
          product_id: string
          sort_order: number
          value: string
          value_i18n: Json
        }
        Insert: {
          id?: string
          key: string
          key_i18n?: Json
          product_id: string
          sort_order?: number
          value: string
          value_i18n?: Json
        }
        Update: {
          id?: string
          key?: string
          key_i18n?: Json
          product_id?: string
          sort_order?: number
          value?: string
          value_i18n?: Json
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
        ]
      }
      product_image: {
        Row: {
          alt: string | null
          id: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt?: string | null
          id?: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt?: string | null
          id?: string
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_image_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price_history: {
        Row: {
          id: string
          price_czk: number
          price_eur: number | null
          product_id: string
          recorded_at: string
        }
        Insert: {
          id?: string
          price_czk: number
          price_eur?: number | null
          product_id: string
          recorded_at?: string
        }
        Update: {
          id?: string
          price_czk?: number
          price_eur?: number | null
          product_id?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
        ]
      }
      product_upsell: {
        Row: {
          id: string
          product_id: string
          sort_order: number
          upsell_product_id: string
        }
        Insert: {
          id?: string
          product_id: string
          sort_order?: number
          upsell_product_id: string
        }
        Update: {
          id?: string
          product_id?: string
          sort_order?: number
          upsell_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_upsell_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_upsell_upsell_product_id_fkey"
            columns: ["upsell_product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variant: {
        Row: {
          attributes: Json
          id: string
          image_url: string | null
          name: string
          name_i18n: Json
          price_czk: number | null
          price_eur: number | null
          product_id: string
          sku: string | null
          sort_order: number
          stock_qty: number
        }
        Insert: {
          attributes?: Json
          id?: string
          image_url?: string | null
          name: string
          name_i18n?: Json
          price_czk?: number | null
          price_eur?: number | null
          product_id: string
          sku?: string | null
          sort_order?: number
          stock_qty?: number
        }
        Update: {
          attributes?: Json
          id?: string
          image_url?: string | null
          name?: string
          name_i18n?: Json
          price_czk?: number | null
          price_eur?: number | null
          product_id?: string
          sku?: string | null
          sort_order?: number
          stock_qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
        ]
      }
      review: {
        Row: {
          body: string | null
          created_at: string
          customer_id: string | null
          id: string
          is_approved: boolean
          product_id: string
          rating: number
          title: string | null
          verified_purchase: boolean
        }
        Insert: {
          body?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          is_approved?: boolean
          product_id: string
          rating: number
          title?: string | null
          verified_purchase?: boolean
        }
        Update: {
          body?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          is_approved?: boolean
          product_id?: string
          rating?: number
          title?: string | null
          verified_purchase?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "review_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_method: {
        Row: {
          carrier: Database["public"]["Enums"]["carrier"]
          code: string
          created_at: string
          id: string
          is_active: boolean
          name_i18n: Json
          pickup_point: boolean
          price_czk: number
          price_eur: number | null
          sort_order: number
        }
        Insert: {
          carrier?: Database["public"]["Enums"]["carrier"]
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_i18n?: Json
          pickup_point?: boolean
          price_czk?: number
          price_eur?: number | null
          sort_order?: number
        }
        Update: {
          carrier?: Database["public"]["Enums"]["carrier"]
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_i18n?: Json
          pickup_point?: boolean
          price_czk?: number
          price_eur?: number | null
          sort_order?: number
        }
        Relationships: []
      }
      stock_alert: {
        Row: {
          created_at: string
          customer_id: string | null
          email: string
          id: string
          locale: string
          notified_at: string | null
          product_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          email: string
          id?: string
          locale?: string
          notified_at?: string | null
          product_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          email?: string
          id?: string
          locale?: string
          notified_at?: string | null
          product_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_alert_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alert_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alert_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variant"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movement: {
        Row: {
          author: string | null
          created_at: string
          delta: number
          id: string
          note: string | null
          order_id: string | null
          product_id: string
          qty_after: number | null
          source: string | null
          type: string
          variant_id: string | null
        }
        Insert: {
          author?: string | null
          created_at?: string
          delta: number
          id?: string
          note?: string | null
          order_id?: string | null
          product_id: string
          qty_after?: number | null
          source?: string | null
          type: string
          variant_id?: string | null
        }
        Update: {
          author?: string | null
          created_at?: string
          delta?: number
          id?: string
          note?: string | null
          order_id?: string | null
          product_id?: string
          qty_after?: number | null
          source?: string | null
          type?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movement_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movement_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movement_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variant"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_item: {
        Row: {
          added_at: string
          customer_id: string
          id: string
          product_id: string
        }
        Insert: {
          added_at?: string
          customer_id: string
          id?: string
          product_id: string
        }
        Update: {
          added_at?: string
          customer_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_item_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_item_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      product_sales: {
        Row: {
          product_id: string | null
          sold: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_item_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_edit_order_items: {
        Args: { p_items: Json; p_order_id: string }
        Returns: undefined
      }
      apply_stock_change: {
        Args: {
          p_author?: string
          p_delta: number
          p_note?: string
          p_product_id: string
          p_set_qty: number
          p_source?: string
          p_type: string
          p_variant_id: string
        }
        Returns: number
      }
      cancel_unpaid_order: { Args: { p_order_id: string }; Returns: boolean }
      cleanup_abandoned_carts: { Args: { p_days?: number }; Returns: number }
      next_invoice_number: {
        Args: { p_series: string; p_year: number }
        Returns: number
      }
      place_order: { Args: { payload: Json }; Returns: string }
      stock_ctx: { Args: never; Returns: Json }
      stock_ctx_type: { Args: { ctx: Json }; Returns: string }
    }
    Enums: {
      address_type: "billing" | "shipping"
      carrier: "ppl" | "zasilkovna" | "balikovna" | "personal" | "other"
      discount_type: "percent" | "fixed"
      order_status:
        | "new"
        | "paid"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      payment_provider: "comgate" | "cod" | "bank_transfer"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      user_role: "customer" | "staff" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      address_type: ["billing", "shipping"],
      carrier: ["ppl", "zasilkovna", "balikovna", "personal", "other"],
      discount_type: ["percent", "fixed"],
      order_status: [
        "new",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      payment_provider: ["comgate", "cod", "bank_transfer"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      user_role: ["customer", "staff", "admin"],
    },
  },
} as const

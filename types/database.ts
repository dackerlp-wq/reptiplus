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
      ledx_line: {
        Row: {
          id: string
          slug: string
          sort_order: number
          is_published: boolean
          name: string
          subtitle: string | null
          tagline: string | null
          landing_desc: string | null
          landing_pills: Json
          detail_lead: string | null
          detail_pills: Json
          models_note: string | null
          models: Json
          params: Json
          uses_title: string | null
          uses: Json
          images: Json
          form_models: Json
          form_cct: Json
          form_cct_fixed: string | null
          form_uhel: Json
          translations: Json
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          sort_order?: number
          is_published?: boolean
          name: string
          subtitle?: string | null
          tagline?: string | null
          landing_desc?: string | null
          landing_pills?: Json
          detail_lead?: string | null
          detail_pills?: Json
          models_note?: string | null
          models?: Json
          params?: Json
          uses_title?: string | null
          uses?: Json
          images?: Json
          form_models?: Json
          form_cct?: Json
          form_cct_fixed?: string | null
          form_uhel?: Json
          translations?: Json
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          sort_order?: number
          is_published?: boolean
          name?: string
          subtitle?: string | null
          tagline?: string | null
          landing_desc?: string | null
          landing_pills?: Json
          detail_lead?: string | null
          detail_pills?: Json
          models_note?: string | null
          models?: Json
          params?: Json
          uses_title?: string | null
          uses?: Json
          images?: Json
          form_models?: Json
          form_cct?: Json
          form_cct_fixed?: string | null
          form_uhel?: Json
          translations?: Json
          created_at?: string
        }
        Relationships: []
      }
      ledx_inquiry: {
        Row: {
          id: string
          rada: string | null
          model: string | null
          cct: string | null
          uhel: string | null
          pocet: number | null
          stmivani: string | null
          poznamka: string | null
          name: string
          email: string
          phone: string | null
          handled: boolean
          locale: string
          ip_hash: string | null
          status: string
          quote_amount: number | null
          quote_currency: string | null
          quote_valid_until: string | null
          quote_number: string | null
          follow_up_at: string | null
          updated_at: string
          anonymized_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          rada?: string | null
          model?: string | null
          cct?: string | null
          uhel?: string | null
          pocet?: number | null
          stmivani?: string | null
          poznamka?: string | null
          name: string
          email: string
          phone?: string | null
          handled?: boolean
          locale?: string
          ip_hash?: string | null
          status?: string
          quote_amount?: number | null
          quote_currency?: string | null
          quote_valid_until?: string | null
          quote_number?: string | null
          follow_up_at?: string | null
          updated_at?: string
          anonymized_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          rada?: string | null
          model?: string | null
          cct?: string | null
          uhel?: string | null
          pocet?: number | null
          stmivani?: string | null
          poznamka?: string | null
          name?: string
          email?: string
          phone?: string | null
          handled?: boolean
          locale?: string
          ip_hash?: string | null
          status?: string
          quote_amount?: number | null
          quote_currency?: string | null
          quote_valid_until?: string | null
          quote_number?: string | null
          follow_up_at?: string | null
          updated_at?: string
          anonymized_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      ledx_inquiry_event: {
        Row: {
          id: string
          inquiry_id: string
          type: string
          body: string | null
          meta: Json
          author_id: string | null
          author_email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          inquiry_id: string
          type: string
          body?: string | null
          meta?: Json
          author_id?: string | null
          author_email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          inquiry_id?: string
          type?: string
          body?: string | null
          meta?: Json
          author_id?: string | null
          author_email?: string | null
          created_at?: string
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
      address: {
        Row: {
          city: string | null
          company: string | null
          country: string
          customer_id: string
          full_name: string | null
          id: string
          is_default: boolean
          phone: string | null
          postal_code: string | null
          street: string | null
          type: Database["public"]["Enums"]["address_type"]
          ico: string | null
          dic: string | null
          label: string | null
          created_at: string
        }
        Insert: {
          city?: string | null
          company?: string | null
          country?: string
          customer_id: string
          full_name?: string | null
          id?: string
          is_default?: boolean
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          type?: Database["public"]["Enums"]["address_type"]
          ico?: string | null
          dic?: string | null
          label?: string | null
          created_at?: string
        }
        Update: {
          city?: string | null
          company?: string | null
          country?: string
          customer_id?: string
          full_name?: string | null
          id?: string
          is_default?: boolean
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          type?: Database["public"]["Enums"]["address_type"]
          ico?: string | null
          dic?: string | null
          label?: string | null
          created_at?: string
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
          session_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          session_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
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
      newsletter_subscriber: {
        Row: {
          created_at: string
          email: string
          id: string
          is_confirmed: boolean
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_confirmed?: boolean
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_confirmed?: boolean
          source?: string | null
        }
        Relationships: []
      }
      order_event: {
        Row: {
          id: string
          order_id: string
          type: string
          body: string | null
          meta: Json
          author_id: string | null
          author_email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          type: string
          body?: string | null
          meta?: Json
          author_id?: string | null
          author_email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          type?: string
          body?: string | null
          meta?: Json
          author_id?: string | null
          author_email?: string | null
          created_at?: string
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
      invoice: {
        Row: {
          id: string
          number: string
          type: string
          order_id: string
          related_invoice_id: string | null
          issued_at: string
          taxable_date: string
          due_date: string | null
          paid_at: string | null
          currency: string
          subtotal: number
          vat_total: number
          total: number
          vat_breakdown: Json
          exchange_rate: number | null
          vat_total_czk: number | null
          seller: Json
          buyer: Json
          items: Json
          payment_method: string | null
          variable_symbol: string | null
          note: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          number: string
          type: string
          order_id: string
          related_invoice_id?: string | null
          issued_at?: string
          taxable_date?: string
          due_date?: string | null
          paid_at?: string | null
          currency: string
          subtotal: number
          vat_total: number
          total: number
          vat_breakdown?: Json
          exchange_rate?: number | null
          vat_total_czk?: number | null
          seller: Json
          buyer: Json
          items: Json
          payment_method?: string | null
          variable_symbol?: string | null
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          number?: string
          type?: string
          order_id?: string
          related_invoice_id?: string | null
          issued_at?: string
          taxable_date?: string
          due_date?: string | null
          paid_at?: string | null
          currency?: string
          subtotal?: number
          vat_total?: number
          total?: number
          vat_breakdown?: Json
          exchange_rate?: number | null
          vat_total_czk?: number | null
          seller?: Json
          buyer?: Json
          items?: Json
          payment_method?: string | null
          variable_symbol?: string | null
          note?: string | null
          created_by?: string | null
          created_at?: string
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
          series: string
          year: number
          last_number: number
        }
        Insert: {
          series: string
          year: number
          last_number?: number
        }
        Update: {
          series?: string
          year?: number
          last_number?: number
        }
        Relationships: []
      }
      stock_alert: {
        Row: {
          id: string
          product_id: string
          variant_id: string | null
          email: string
          customer_id: string | null
          locale: string
          created_at: string
          notified_at: string | null
        }
        Insert: {
          id?: string
          product_id: string
          variant_id?: string | null
          email: string
          customer_id?: string | null
          locale?: string
          created_at?: string
          notified_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          variant_id?: string | null
          email?: string
          customer_id?: string | null
          locale?: string
          created_at?: string
          notified_at?: string | null
        }
        Relationships: [
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
          {
            foreignKeyName: "stock_alert_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
        ]
      }
      order: {
        Row: {
          admin_note: string | null
          billing_address: Json | null
          comgate_ref: string | null
          created_at: string
          currency: string
          customer_id: string | null
          discount: number
          discount_code_id: string | null
          email: string
          id: string
          note: string | null
          number: string
          payment_fee: number
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipping: number
          shipping_address: Json | null
          shipping_method: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          tracking_number: string | null
          carrier_shipment_id: string | null
          tracking_url: string | null
          tracking_status: string | null
          label_printed_at: string | null
          refunded_amount: number
          refunded_at: string | null
          updated_at: string
          locale: string
        }
        Insert: {
          admin_note?: string | null
          billing_address?: Json | null
          comgate_ref?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount?: number
          discount_code_id?: string | null
          email: string
          id?: string
          note?: string | null
          number: string
          payment_fee?: number
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping?: number
          shipping_address?: Json | null
          shipping_method?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_number?: string | null
          carrier_shipment_id?: string | null
          tracking_url?: string | null
          tracking_status?: string | null
          label_printed_at?: string | null
          refunded_amount?: number
          refunded_at?: string | null
          updated_at?: string
          locale?: string
        }
        Update: {
          admin_note?: string | null
          billing_address?: Json | null
          comgate_ref?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount?: number
          discount_code_id?: string | null
          email?: string
          id?: string
          note?: string | null
          number?: string
          payment_fee?: number
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping?: number
          shipping_address?: Json | null
          shipping_method?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_number?: string | null
          carrier_shipment_id?: string | null
          tracking_url?: string | null
          tracking_status?: string | null
          label_printed_at?: string | null
          refunded_amount?: number
          refunded_at?: string | null
          updated_at?: string
          locale?: string
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
          is_published: boolean
          name: string
          name_i18n: Json | null
          price_czk: number
          price_eur: number | null
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
          is_published?: boolean
          name: string
          name_i18n?: Json | null
          price_czk?: number
          price_eur?: number | null
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
          is_published?: boolean
          name?: string
          name_i18n?: Json | null
          price_czk?: number
          price_eur?: number | null
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
        Relationships: []
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
      product_price_history: {
        Row: {
          id: string
          product_id: string
          price_czk: number
          price_eur: number | null
          recorded_at: string
        }
        Insert: {
          id?: string
          product_id: string
          price_czk: number
          price_eur?: number | null
          recorded_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          price_czk?: number
          price_eur?: number | null
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
          price_czk: number
          price_eur: number | null
          pickup_point: boolean
          sort_order: number
        }
        Insert: {
          carrier?: Database["public"]["Enums"]["carrier"]
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_i18n?: Json
          price_czk?: number
          price_eur?: number | null
          pickup_point?: boolean
          sort_order?: number
        }
        Update: {
          carrier?: Database["public"]["Enums"]["carrier"]
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_i18n?: Json
          price_czk?: number
          price_eur?: number | null
          pickup_point?: boolean
          sort_order?: number
        }
        Relationships: []
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
        Relationships: []
      }
    }
    Functions: {
      place_order: {
        Args: { payload: Json }
        Returns: string
      }
      admin_edit_order_items: {
        Args: { p_order_id: string; p_items: Json }
        Returns: undefined
      }
      next_invoice_number: {
        Args: { p_series: string; p_year: number }
        Returns: number
      }
      cleanup_abandoned_carts: {
        Args: { p_days?: number }
        Returns: number
      }
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

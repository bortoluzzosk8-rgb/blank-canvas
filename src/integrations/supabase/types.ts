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
      asset_categories: {
        Row: {
          created_at: string | null
          franchise_id: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          franchise_id?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          franchise_id?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_categories_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          category_id: string | null
          created_at: string | null
          current_value: number | null
          description: string | null
          expense_id: string | null
          franchise_id: string | null
          id: string
          name: string
          notes: string | null
          purchase_date: string
          purchase_value: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          expense_id?: string | null
          franchise_id?: string | null
          id?: string
          name: string
          notes?: string | null
          purchase_date: string
          purchase_value: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          expense_id?: string | null
          franchise_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          purchase_date?: string
          purchase_value?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          cart_created: boolean
          cep: string | null
          cidade: string | null
          cnpj: string | null
          cpf: string | null
          created_at: string
          email: string | null
          empresa: string | null
          endereco: string | null
          estado: string | null
          franchise_id: string | null
          id: string
          is_client: boolean
          last_access: string
          name: string
          phone: string
          rg: string | null
          user_id: string | null
          whatsapp_sent: boolean
        }
        Insert: {
          cart_created?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          empresa?: string | null
          endereco?: string | null
          estado?: string | null
          franchise_id?: string | null
          id?: string
          is_client?: boolean
          last_access?: string
          name: string
          phone: string
          rg?: string | null
          user_id?: string | null
          whatsapp_sent?: boolean
        }
        Update: {
          cart_created?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          empresa?: string | null
          endereco?: string | null
          estado?: string | null
          franchise_id?: string | null
          id?: string
          is_client?: boolean
          last_access?: string
          name?: string
          phone?: string
          rg?: string | null
          user_id?: string | null
          whatsapp_sent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "clients_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          bank: string | null
          closing_day: number | null
          created_at: string | null
          credit_limit: number | null
          due_day: number | null
          franchise_id: string | null
          id: string
          last_digits: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          bank?: string | null
          closing_day?: number | null
          created_at?: string | null
          credit_limit?: number | null
          due_day?: number | null
          franchise_id?: string | null
          id?: string
          last_digits?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          bank?: string | null
          closing_day?: number | null
          created_at?: string | null
          credit_limit?: number | null
          due_day?: number | null
          franchise_id?: string | null
          id?: string
          last_digits?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string | null
          email: string | null
          franchise_id: string | null
          id: string
          name: string
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          franchise_id?: string | null
          id?: string
          name: string
          phone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          franchise_id?: string | null
          id?: string
          name?: string
          phone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_archive: {
        Row: {
          deleted_at: string
          deleted_by: string | null
          franchise_id: string
          id: string
          maintenance_history: Json | null
          manufacture_date: string | null
          notes: string | null
          original_code: string
          product_code_id: string
          product_name: string
          product_value: number
          reason: string
        }
        Insert: {
          deleted_at?: string
          deleted_by?: string | null
          franchise_id: string
          id?: string
          maintenance_history?: Json | null
          manufacture_date?: string | null
          notes?: string | null
          original_code: string
          product_code_id: string
          product_name: string
          product_value: number
          reason: string
        }
        Update: {
          deleted_at?: string
          deleted_by?: string | null
          franchise_id?: string
          id?: string
          maintenance_history?: Json | null
          manufacture_date?: string | null
          notes?: string | null
          original_code?: string
          product_code_id?: string
          product_name?: string
          product_value?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_archive_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_movement_history: {
        Row: {
          from_franchise_id: string | null
          id: string
          moved_at: string
          moved_by: string | null
          notes: string | null
          product_code_id: string
          to_franchise_id: string
        }
        Insert: {
          from_franchise_id?: string | null
          id?: string
          moved_at?: string
          moved_by?: string | null
          notes?: string | null
          product_code_id: string
          to_franchise_id: string
        }
        Update: {
          from_franchise_id?: string | null
          id?: string
          moved_at?: string
          moved_by?: string | null
          notes?: string | null
          product_code_id?: string
          to_franchise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_movement_history_from_franchise_id_fkey"
            columns: ["from_franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_movement_history_product_code_id_fkey"
            columns: ["product_code_id"]
            isOneToOne: false
            referencedRelation: "product_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_movement_history_to_franchise_id_fkey"
            columns: ["to_franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_status: {
        Row: {
          created_at: string
          id: string
          maintenance_note: string | null
          product_code_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          maintenance_note?: string | null
          product_code_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          maintenance_note?: string | null
          product_code_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_status_product_code_id_fkey"
            columns: ["product_code_id"]
            isOneToOne: false
            referencedRelation: "product_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string | null
          franchise_id: string | null
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          franchise_id?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          franchise_id?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          asset_id: string | null
          category: string
          created_at: string | null
          credit_card_id: string | null
          description: string
          due_date: string | null
          expense_date: string
          franchise_id: string | null
          id: string
          installment_number: number | null
          installments: number | null
          notes: string | null
          parent_expense_id: string | null
          payment_method: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          asset_id?: string | null
          category: string
          created_at?: string | null
          credit_card_id?: string | null
          description: string
          due_date?: string | null
          expense_date: string
          franchise_id?: string | null
          id?: string
          installment_number?: number | null
          installments?: number | null
          notes?: string | null
          parent_expense_id?: string | null
          payment_method?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          asset_id?: string | null
          category?: string
          created_at?: string | null
          credit_card_id?: string | null
          description?: string
          due_date?: string | null
          expense_date?: string
          franchise_id?: string | null
          id?: string
          installment_number?: number | null
          installments?: number | null
          notes?: string | null
          parent_expense_id?: string | null
          payment_method?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_parent_expense_id_fkey"
            columns: ["parent_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      franchises: {
        Row: {
          address: string | null
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          cep: string | null
          city: string
          cnpj: string | null
          created_at: string
          email: string | null
          equilibrio_inicial: number | null
          franqueado_percentage: number | null
          franqueadora_percentage: number | null
          id: string
          name: string
          next_due_date: string | null
          parent_franchise_id: string | null
          payment_method: string | null
          phone: string | null
          state: string | null
          status: string
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          cep?: string | null
          city: string
          cnpj?: string | null
          created_at?: string
          email?: string | null
          equilibrio_inicial?: number | null
          franqueado_percentage?: number | null
          franqueadora_percentage?: number | null
          id?: string
          name: string
          next_due_date?: string | null
          parent_franchise_id?: string | null
          payment_method?: string | null
          phone?: string | null
          state?: string | null
          status?: string
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          cep?: string | null
          city?: string
          cnpj?: string | null
          created_at?: string
          email?: string | null
          equilibrio_inicial?: number | null
          franqueado_percentage?: number | null
          franqueadora_percentage?: number | null
          id?: string
          name?: string
          next_due_date?: string | null
          parent_franchise_id?: string | null
          payment_method?: string | null
          phone?: string | null
          state?: string | null
          status?: string
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "franchises_parent_franchise_id_fkey"
            columns: ["parent_franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_archive: {
        Row: {
          code: string
          deleted_at: string
          deleted_by: string | null
          franchise_id: string
          id: string
          image_url: string[] | null
          manufacture_date: string | null
          name: string
          notes: string | null
          original_item_id: string | null
          reason: string
          rental_value: number | null
          value: number
        }
        Insert: {
          code: string
          deleted_at?: string
          deleted_by?: string | null
          franchise_id: string
          id?: string
          image_url?: string[] | null
          manufacture_date?: string | null
          name: string
          notes?: string | null
          original_item_id?: string | null
          reason: string
          rental_value?: number | null
          value: number
        }
        Update: {
          code?: string
          deleted_at?: string
          deleted_by?: string | null
          franchise_id?: string
          id?: string
          image_url?: string[] | null
          manufacture_date?: string | null
          name?: string
          notes?: string | null
          original_item_id?: string | null
          reason?: string
          rental_value?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_archive_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          blocks_reservations: boolean | null
          code: string
          created_at: string
          franchise_id: string | null
          id: string
          image_url: string[] | null
          maintenance_note: string | null
          manufacture_date: string | null
          name: string
          notes: string | null
          rental_value: number | null
          status: string
          updated_at: string
          value: number
        }
        Insert: {
          blocks_reservations?: boolean | null
          code: string
          created_at?: string
          franchise_id?: string | null
          id?: string
          image_url?: string[] | null
          maintenance_note?: string | null
          manufacture_date?: string | null
          name: string
          notes?: string | null
          rental_value?: number | null
          status?: string
          updated_at?: string
          value?: number
        }
        Update: {
          blocks_reservations?: boolean | null
          code?: string
          created_at?: string
          franchise_id?: string | null
          id?: string
          image_url?: string[] | null
          maintenance_note?: string | null
          manufacture_date?: string | null
          name?: string
          notes?: string | null
          rental_value?: number | null
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          from_franchise_id: string | null
          id: string
          item_id: string
          moved_at: string
          moved_by: string | null
          notes: string | null
          to_franchise_id: string
        }
        Insert: {
          from_franchise_id?: string | null
          id?: string
          item_id: string
          moved_at?: string
          moved_by?: string | null
          notes?: string | null
          to_franchise_id: string
        }
        Update: {
          from_franchise_id?: string | null
          id?: string
          item_id?: string
          moved_at?: string
          moved_by?: string | null
          notes?: string | null
          to_franchise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_from_franchise_id_fkey"
            columns: ["from_franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_to_franchise_id_fkey"
            columns: ["to_franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_installments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          franchise_id: string | null
          id: string
          installment_number: number
          loan_id: string
          payment_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          franchise_id?: string | null
          id?: string
          installment_number: number
          loan_id: string
          payment_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          franchise_id?: string | null
          id?: string
          installment_number?: number
          loan_id?: string
          payment_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_installments_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_installments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          created_at: string
          due_day: number
          first_due_date: string
          franchise_id: string | null
          id: string
          installment_amount: number
          installments: number
          name: string
          notes: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_day: number
          first_due_date: string
          franchise_id?: string | null
          id?: string
          installment_amount: number
          installments: number
          name: string
          notes?: string | null
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_day?: number
          first_due_date?: string
          franchise_id?: string | null
          id?: string
          installment_amount?: number
          installments?: number
          name?: string
          notes?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_assignments: {
        Row: {
          assignment_date: string
          assignment_type: string
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          franchise_id: string | null
          id: string
          notes: string | null
          order_position: number | null
          payment_amount: number | null
          payment_status: string | null
          sale_id: string | null
          scheduled_time: string
          status: string
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          assignment_date: string
          assignment_type: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          franchise_id?: string | null
          id?: string
          notes?: string | null
          order_position?: number | null
          payment_amount?: number | null
          payment_status?: string | null
          sale_id?: string | null
          scheduled_time: string
          status?: string
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          assignment_date?: string
          assignment_type?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          franchise_id?: string | null
          id?: string
          notes?: string | null
          order_position?: number | null
          payment_amount?: number | null
          payment_status?: string | null
          sale_id?: string | null
          scheduled_time?: string
          status?: string
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logistics_assignments_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_assignments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "logistics_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_vehicles: {
        Row: {
          color: string | null
          created_at: string | null
          franchise_id: string | null
          id: string
          is_active: boolean | null
          name: string
          plate: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          franchise_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          plate?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          franchise_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          plate?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logistics_vehicles_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      monitors: {
        Row: {
          address: string | null
          created_at: string | null
          franchise_id: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          franchise_id?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          franchise_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monitors_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      product_codes: {
        Row: {
          code: string
          created_at: string | null
          franchise_id: string | null
          id: string
          product_id: string
          purchase_id: string
          sale_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          franchise_id?: string | null
          id?: string
          product_id: string
          purchase_id: string
          sale_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          franchise_id?: string | null
          id?: string
          product_id?: string
          purchase_id?: string
          sale_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_codes_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_codes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_codes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_codes_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_codes_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          cost_price: number
          created_at: string
          description: string | null
          display_order: number | null
          franchise_id: string
          id: string
          image_url: string[] | null
          lead_time_days: number | null
          name: string
          sale_price: number
          stock_qty: number
          updated_at: string
          visible: boolean
        }
        Insert: {
          category_id?: string | null
          cost_price: number
          created_at?: string
          description?: string | null
          display_order?: number | null
          franchise_id: string
          id?: string
          image_url?: string[] | null
          lead_time_days?: number | null
          name: string
          sale_price: number
          stock_qty?: number
          updated_at?: string
          visible?: boolean
        }
        Update: {
          category_id?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          display_order?: number | null
          franchise_id?: string
          id?: string
          image_url?: string[] | null
          lead_time_days?: number | null
          name?: string
          sale_price?: number
          stock_qty?: number
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          franchise_id: string | null
          id: string
          installment_dates: Json | null
          installments: number | null
          notes: string | null
          payment_method: string | null
          product: string
          product_id: string | null
          purchase_date: string
          quantity: number
          supplier: string
          total_value: number
          unit_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          franchise_id?: string | null
          id?: string
          installment_dates?: Json | null
          installments?: number | null
          notes?: string | null
          payment_method?: string | null
          product: string
          product_id?: string | null
          purchase_date: string
          quantity: number
          supplier: string
          total_value: number
          unit_value: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          franchise_id?: string | null
          id?: string
          installment_dates?: Json | null
          installments?: number | null
          notes?: string | null
          payment_method?: string | null
          product?: string
          product_id?: string | null
          purchase_date?: string
          quantity?: number
          supplier?: string
          total_value?: number
          unit_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string | null
          product_code_id: string | null
          product_id: string | null
          product_name: string
          quantity: number
          sale_id: string
          total_value: number
          unit_value: number
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          product_code_id?: string | null
          product_id?: string | null
          product_name: string
          quantity?: number
          sale_id: string
          total_value: number
          unit_value: number
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          product_code_id?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string
          total_value?: number
          unit_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_code_id_fkey"
            columns: ["product_code_id"]
            isOneToOne: false
            referencedRelation: "product_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_monitoring_slots: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          monitor_id: string | null
          monitors_quantity: number
          sale_id: string
          start_time: string | null
          total_value: number
          unit_value: number
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          monitor_id?: string | null
          monitors_quantity?: number
          sale_id: string
          start_time?: string | null
          total_value?: number
          unit_value?: number
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          monitor_id?: string | null
          monitors_quantity?: number
          sale_id?: string
          start_time?: string | null
          total_value?: number
          unit_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_monitoring_slots_monitor_id_fkey"
            columns: ["monitor_id"]
            isOneToOne: false
            referencedRelation: "monitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_monitoring_slots_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payments: {
        Row: {
          amount: number
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          asaas_status: string | null
          boleto_barcode: string | null
          boleto_url: string | null
          card_fee: number | null
          created_at: string | null
          due_date: string | null
          id: string
          installments: number | null
          notes: string | null
          payment_date: string | null
          payment_link: string | null
          payment_method: string
          payment_type: string
          pix_expiration_date: string | null
          pix_qrcode: string | null
          pix_qrcode_image: string | null
          receipt_url: string | null
          received_by: string | null
          sale_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_status?: string | null
          boleto_barcode?: string | null
          boleto_url?: string | null
          card_fee?: number | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          installments?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_link?: string | null
          payment_method: string
          payment_type: string
          pix_expiration_date?: string | null
          pix_qrcode?: string | null
          pix_qrcode_image?: string | null
          receipt_url?: string | null
          received_by?: string | null
          sale_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_status?: string | null
          boleto_barcode?: string | null
          boleto_url?: string | null
          card_fee?: number | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          installments?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_link?: string | null
          payment_method?: string
          payment_type?: string
          pix_expiration_date?: string | null
          pix_qrcode?: string | null
          pix_qrcode_image?: string | null
          receipt_url?: string | null
          received_by?: string | null
          sale_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          address_observation: string | null
          client_id: string | null
          client_name: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          delivery_address: string | null
          delivery_cep: string | null
          delivery_city: string | null
          delivery_date: string | null
          delivery_state: string | null
          discount_value: number | null
          down_payment: number | null
          franchise_id: string | null
          freight_value: number | null
          id: string
          installment_dates: Json | null
          installments: number | null
          monitor_id: string | null
          monitoring_end_time: string | null
          monitoring_start_time: string | null
          monitoring_value: number | null
          monitors_names: string | null
          monitors_quantity: number | null
          notes: string | null
          party_start_time: string | null
          payment_method: string | null
          product: string | null
          product_code_id: string | null
          product_id: string | null
          quantity: number | null
          rental_end_date: string | null
          rental_start_date: string | null
          rental_type: string
          return_date: string | null
          return_time: string | null
          sale_date: string
          status: string
          total_value: number
          unit_value: number | null
          updated_at: string
          with_monitoring: boolean | null
        }
        Insert: {
          address_observation?: string | null
          client_id?: string | null
          client_name: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          delivery_address?: string | null
          delivery_cep?: string | null
          delivery_city?: string | null
          delivery_date?: string | null
          delivery_state?: string | null
          discount_value?: number | null
          down_payment?: number | null
          franchise_id?: string | null
          freight_value?: number | null
          id?: string
          installment_dates?: Json | null
          installments?: number | null
          monitor_id?: string | null
          monitoring_end_time?: string | null
          monitoring_start_time?: string | null
          monitoring_value?: number | null
          monitors_names?: string | null
          monitors_quantity?: number | null
          notes?: string | null
          party_start_time?: string | null
          payment_method?: string | null
          product?: string | null
          product_code_id?: string | null
          product_id?: string | null
          quantity?: number | null
          rental_end_date?: string | null
          rental_start_date?: string | null
          rental_type?: string
          return_date?: string | null
          return_time?: string | null
          sale_date: string
          status?: string
          total_value: number
          unit_value?: number | null
          updated_at?: string
          with_monitoring?: boolean | null
        }
        Update: {
          address_observation?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          delivery_address?: string | null
          delivery_cep?: string | null
          delivery_city?: string | null
          delivery_date?: string | null
          delivery_state?: string | null
          discount_value?: number | null
          down_payment?: number | null
          franchise_id?: string | null
          freight_value?: number | null
          id?: string
          installment_dates?: Json | null
          installments?: number | null
          monitor_id?: string | null
          monitoring_end_time?: string | null
          monitoring_start_time?: string | null
          monitoring_value?: number | null
          monitors_names?: string | null
          monitors_quantity?: number | null
          notes?: string | null
          party_start_time?: string | null
          payment_method?: string | null
          product?: string | null
          product_code_id?: string | null
          product_id?: string | null
          quantity?: number | null
          rental_end_date?: string | null
          rental_start_date?: string | null
          rental_type?: string
          return_date?: string | null
          return_time?: string | null
          sale_date?: string
          status?: string
          total_value?: number
          unit_value?: number | null
          updated_at?: string
          with_monitoring?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_monitor_id_fkey"
            columns: ["monitor_id"]
            isOneToOne: false
            referencedRelation: "monitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_code_id_fkey"
            columns: ["product_code_id"]
            isOneToOne: false
            referencedRelation: "product_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          catalog_header_title: string | null
          catalog_subtitle: string | null
          catalog_title: string | null
          company_address: string | null
          company_cep: string | null
          company_city: string | null
          company_cnpj: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          company_signature_url: string | null
          company_state: string | null
          contract_clauses: string | null
          contract_template: string | null
          contract_title: string | null
          created_at: string
          franchise_id: string | null
          id: string
          logo_url: string | null
          max_installments: number
          monthly_interest: number
          primary_color: string | null
          receipt_notes: string | null
          receipt_template: string | null
          receipt_title: string | null
          secondary_color: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          catalog_header_title?: string | null
          catalog_subtitle?: string | null
          catalog_title?: string | null
          company_address?: string | null
          company_cep?: string | null
          company_city?: string | null
          company_cnpj?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_signature_url?: string | null
          company_state?: string | null
          contract_clauses?: string | null
          contract_template?: string | null
          contract_title?: string | null
          created_at?: string
          franchise_id?: string | null
          id?: string
          logo_url?: string | null
          max_installments?: number
          monthly_interest?: number
          primary_color?: string | null
          receipt_notes?: string | null
          receipt_template?: string | null
          receipt_title?: string | null
          secondary_color?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          catalog_header_title?: string | null
          catalog_subtitle?: string | null
          catalog_title?: string | null
          company_address?: string | null
          company_cep?: string | null
          company_city?: string | null
          company_cnpj?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_signature_url?: string | null
          company_state?: string | null
          contract_clauses?: string | null
          contract_template?: string | null
          contract_title?: string | null
          created_at?: string
          franchise_id?: string | null
          id?: string
          logo_url?: string | null
          max_installments?: number
          monthly_interest?: number
          primary_color?: string | null
          receipt_notes?: string | null
          receipt_template?: string | null
          receipt_title?: string | null
          secondary_color?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: true
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          asaas_payment_id: string
          billing_type: string
          boleto_barcode: string | null
          boleto_url: string | null
          created_at: string | null
          due_date: string
          franchise_id: string
          id: string
          payment_date: string | null
          pix_expiration_date: string | null
          pix_qrcode: string | null
          pix_qrcode_image: string | null
          status: string
          updated_at: string | null
          value: number
        }
        Insert: {
          asaas_payment_id: string
          billing_type: string
          boleto_barcode?: string | null
          boleto_url?: string | null
          created_at?: string | null
          due_date: string
          franchise_id: string
          id?: string
          payment_date?: string | null
          pix_expiration_date?: string | null
          pix_qrcode?: string | null
          pix_qrcode_image?: string | null
          status?: string
          updated_at?: string | null
          value: number
        }
        Update: {
          asaas_payment_id?: string
          billing_type?: string
          boleto_barcode?: string | null
          boleto_url?: string | null
          created_at?: string | null
          due_date?: string
          franchise_id?: string
          id?: string
          payment_date?: string | null
          pix_expiration_date?: string | null
          pix_qrcode?: string | null
          pix_qrcode_image?: string | null
          status?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      system_updates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          is_active: boolean | null
          published_at: string
          title: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          published_at?: string
          title: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          published_at?: string
          title?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      user_franchises: {
        Row: {
          created_at: string
          franchise_id: string
          id: string
          name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          franchise_id: string
          id?: string
          name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          franchise_id?: string
          id?: string
          name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_franchises_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
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
      user_sessions: {
        Row: {
          device_info: string | null
          id: string
          last_seen_at: string | null
          logged_in_at: string | null
          session_token: string
          user_id: string
        }
        Insert: {
          device_info?: string | null
          id?: string
          last_seen_at?: string | null
          logged_in_at?: string | null
          session_token: string
          user_id: string
        }
        Update: {
          device_info?: string | null
          id?: string
          last_seen_at?: string | null
          logged_in_at?: string | null
          session_token?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicle_driver_assignments: {
        Row: {
          assignment_date: string
          created_at: string | null
          driver_id: string
          franchise_id: string | null
          id: string
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          assignment_date: string
          created_at?: string | null
          driver_id: string
          franchise_id?: string | null
          id?: string
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          assignment_date?: string
          created_at?: string | null
          driver_id?: string
          franchise_id?: string | null
          id?: string
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_driver_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_driver_assignments_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_driver_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "logistics_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      stock_summary: {
        Row: {
          category_id: string | null
          cost_price: number | null
          franchise_id: string | null
          id: string | null
          image_url: string[] | null
          product_name: string | null
          sale_price: number | null
          stock_balance: number | null
          stock_value: number | null
          total_purchased: number | null
          total_sold: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      belongs_to_user_tenant: {
        Args: { record_franchise_id: string }
        Returns: boolean
      }
      check_item_availability: {
        Args: {
          p_exclude_sale_id?: string
          p_inventory_item_id: string
          p_party_start_time: string
          p_rental_start_date: string
          p_return_date: string
        }
        Returns: {
          conflicting_client_name: string
          conflicting_end_date: string
          conflicting_franchise_city: string
          conflicting_franchise_name: string
          conflicting_party_time: string
          conflicting_sale_id: string
          conflicting_start_date: string
          is_available: boolean
        }[]
      }
      get_lead_temperature: {
        Args: { p_cart_created: boolean; p_whatsapp_sent: boolean }
        Returns: string
      }
      get_user_franchise_id: { Args: { _user_id: string }; Returns: string }
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
        | "admin"
        | "user"
        | "franqueadora"
        | "franqueado"
        | "vendedor"
        | "motorista"
        | "super_admin"
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
        "admin",
        "user",
        "franqueadora",
        "franqueado",
        "vendedor",
        "motorista",
        "super_admin",
      ],
    },
  },
} as const

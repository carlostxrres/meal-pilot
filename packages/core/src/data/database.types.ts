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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      dietary_requirement: {
        Row: {
          description: string | null
          id: string
          maximum: number | null
          meal_id: string | null
          minimum: number | null
          name: string
          owner_id: string
          period: Database["public"]["Enums"]["requirement_period"]
          scope_category_id: string | null
          scope_ingredient_id: string | null
          scope_nutrient_column: string | null
          scope_type: Database["public"]["Enums"]["requirement_scope_type"]
          strictness: Database["public"]["Enums"]["requirement_strictness"]
          tolerance_margin: number
          unit: string
          week_reset_day: Database["public"]["Enums"]["weekday"] | null
        }
        Insert: {
          description?: string | null
          id?: string
          maximum?: number | null
          meal_id?: string | null
          minimum?: number | null
          name: string
          owner_id: string
          period: Database["public"]["Enums"]["requirement_period"]
          scope_category_id?: string | null
          scope_ingredient_id?: string | null
          scope_nutrient_column?: string | null
          scope_type: Database["public"]["Enums"]["requirement_scope_type"]
          strictness: Database["public"]["Enums"]["requirement_strictness"]
          tolerance_margin?: number
          unit: string
          week_reset_day?: Database["public"]["Enums"]["weekday"] | null
        }
        Update: {
          description?: string | null
          id?: string
          maximum?: number | null
          meal_id?: string | null
          minimum?: number | null
          name?: string
          owner_id?: string
          period?: Database["public"]["Enums"]["requirement_period"]
          scope_category_id?: string | null
          scope_ingredient_id?: string | null
          scope_nutrient_column?: string | null
          scope_type?: Database["public"]["Enums"]["requirement_scope_type"]
          strictness?: Database["public"]["Enums"]["requirement_strictness"]
          tolerance_margin?: number
          unit?: string
          week_reset_day?: Database["public"]["Enums"]["weekday"] | null
        }
        Relationships: [
          {
            foreignKeyName: "dietary_requirement_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dietary_requirement_scope_category_id_fkey"
            columns: ["scope_category_id"]
            isOneToOne: false
            referencedRelation: "ingredient_category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dietary_requirement_scope_ingredient_id_fkey"
            columns: ["scope_ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
        ]
      }
      dish: {
        Row: {
          dish_type: string
          id: string
          meal_id: string
          name: string
          owner_id: string
        }
        Insert: {
          dish_type: string
          id?: string
          meal_id: string
          name: string
          owner_id: string
        }
        Update: {
          dish_type?: string
          id?: string
          meal_id?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dish_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meal"
            referencedColumns: ["id"]
          },
        ]
      }
      dish_ingredient: {
        Row: {
          dish_id: string
          id: string
          ingredient_id: string
          quantity: number
        }
        Insert: {
          dish_id: string
          id?: string
          ingredient_id: string
          quantity: number
        }
        Update: {
          dish_id?: string
          id?: string
          ingredient_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "dish_ingredient_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dish"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_ingredient_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient: {
        Row: {
          base_unit: Database["public"]["Enums"]["base_unit"]
          calcium_mg_per_100: number | null
          carbs_g_per_100: number | null
          fat_g_per_100: number | null
          fiber_g_per_100: number | null
          home_inventory: number
          id: string
          iron_mg_per_100: number | null
          kcal_per_100: number | null
          name: string
          office_inventory: number
          omega3_g_per_100: number | null
          opened_shelf_life_days: number | null
          owner_id: string
          protein_g_per_100: number | null
          recommended_time: Database["public"]["Enums"]["time_of_day"]
          saturated_fat_g_per_100: number | null
          sodium_mg_per_100: number | null
          storage_type: Database["public"]["Enums"]["storage_type"]
          sugar_g_per_100: number | null
          vitamin_c_mg_per_100: number | null
        }
        Insert: {
          base_unit: Database["public"]["Enums"]["base_unit"]
          calcium_mg_per_100?: number | null
          carbs_g_per_100?: number | null
          fat_g_per_100?: number | null
          fiber_g_per_100?: number | null
          home_inventory?: number
          id?: string
          iron_mg_per_100?: number | null
          kcal_per_100?: number | null
          name: string
          office_inventory?: number
          omega3_g_per_100?: number | null
          opened_shelf_life_days?: number | null
          owner_id: string
          protein_g_per_100?: number | null
          recommended_time?: Database["public"]["Enums"]["time_of_day"]
          saturated_fat_g_per_100?: number | null
          sodium_mg_per_100?: number | null
          storage_type: Database["public"]["Enums"]["storage_type"]
          sugar_g_per_100?: number | null
          vitamin_c_mg_per_100?: number | null
        }
        Update: {
          base_unit?: Database["public"]["Enums"]["base_unit"]
          calcium_mg_per_100?: number | null
          carbs_g_per_100?: number | null
          fat_g_per_100?: number | null
          fiber_g_per_100?: number | null
          home_inventory?: number
          id?: string
          iron_mg_per_100?: number | null
          kcal_per_100?: number | null
          name?: string
          office_inventory?: number
          omega3_g_per_100?: number | null
          opened_shelf_life_days?: number | null
          owner_id?: string
          protein_g_per_100?: number | null
          recommended_time?: Database["public"]["Enums"]["time_of_day"]
          saturated_fat_g_per_100?: number | null
          sodium_mg_per_100?: number | null
          storage_type?: Database["public"]["Enums"]["storage_type"]
          sugar_g_per_100?: number | null
          vitamin_c_mg_per_100?: number | null
        }
        Relationships: []
      }
      ingredient_category: {
        Row: {
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      ingredient_category_link: {
        Row: {
          category_id: string
          ingredient_id: string
        }
        Insert: {
          category_id: string
          ingredient_id: string
        }
        Update: {
          category_id?: string
          ingredient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_category_link_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ingredient_category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_category_link_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
        ]
      }
      meal: {
        Row: {
          id: string
          name: string
          owner_id: string
          usual_end_time: string
          usual_start_time: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          usual_end_time: string
          usual_start_time: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          usual_end_time?: string
          usual_start_time?: string
        }
        Relationships: []
      }
      meal_log: {
        Row: {
          confirmed: boolean
          date: string
          dish_id: string
          id: string
          meal_id: string
          owner_id: string
        }
        Insert: {
          confirmed?: boolean
          date: string
          dish_id: string
          id?: string
          meal_id: string
          owner_id: string
        }
        Update: {
          confirmed?: boolean
          date?: string
          dish_id?: string
          id?: string
          meal_id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_log_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dish"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_log_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meal"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_log: {
        Row: {
          accumulated: number
          fulfilled: boolean
          id: string
          period_end: string
          period_start: string
          requirement_id: string
        }
        Insert: {
          accumulated?: number
          fulfilled?: boolean
          id?: string
          period_end: string
          period_start: string
          requirement_id: string
        }
        Update: {
          accumulated?: number
          fulfilled?: boolean
          id?: string
          period_end?: string
          period_start?: string
          requirement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirement_log_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "dietary_requirement"
            referencedColumns: ["id"]
          },
        ]
      }
      supplement: {
        Row: {
          frequency: Database["public"]["Enums"]["supplement_frequency"]
          id: string
          ingredient_id: string
          meal_id: string
          name: string
          owner_id: string
          relative_timing: Database["public"]["Enums"]["relative_timing_type"]
          relative_timing_hours: number | null
        }
        Insert: {
          frequency: Database["public"]["Enums"]["supplement_frequency"]
          id?: string
          ingredient_id: string
          meal_id: string
          name: string
          owner_id: string
          relative_timing: Database["public"]["Enums"]["relative_timing_type"]
          relative_timing_hours?: number | null
        }
        Update: {
          frequency?: Database["public"]["Enums"]["supplement_frequency"]
          id?: string
          ingredient_id?: string
          meal_id?: string
          name?: string
          owner_id?: string
          relative_timing?: Database["public"]["Enums"]["relative_timing_type"]
          relative_timing_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplement_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplement_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meal"
            referencedColumns: ["id"]
          },
        ]
      }
      supplement_day: {
        Row: {
          day_of_week: Database["public"]["Enums"]["weekday"]
          supplement_id: string
        }
        Insert: {
          day_of_week: Database["public"]["Enums"]["weekday"]
          supplement_id: string
        }
        Update: {
          day_of_week?: Database["public"]["Enums"]["weekday"]
          supplement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplement_day_supplement_id_fkey"
            columns: ["supplement_id"]
            isOneToOne: false
            referencedRelation: "supplement"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      base_unit: "g" | "ml" | "unit"
      relative_timing_type:
        | "before_fasting_ends"
        | "right_after_meal"
        | "hours_after"
      requirement_period: "day" | "week"
      requirement_scope_type: "ingredient" | "ingredient_category" | "nutrient"
      requirement_strictness: "mandatory" | "advisory"
      storage_type: "pantry" | "fridge" | "freezer"
      supplement_frequency: "daily" | "specific_days"
      time_of_day: "morning" | "midday" | "afternoon" | "any"
      weekday: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      base_unit: ["g", "ml", "unit"],
      relative_timing_type: [
        "before_fasting_ends",
        "right_after_meal",
        "hours_after",
      ],
      requirement_period: ["day", "week"],
      requirement_scope_type: ["ingredient", "ingredient_category", "nutrient"],
      requirement_strictness: ["mandatory", "advisory"],
      storage_type: ["pantry", "fridge", "freezer"],
      supplement_frequency: ["daily", "specific_days"],
      time_of_day: ["morning", "midday", "afternoon", "any"],
      weekday: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    },
  },
} as const

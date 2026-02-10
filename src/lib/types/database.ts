export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      activity_log: {
        Row: {
          action: string
          actor_id: string
          actor_type: Database["public"]["Enums"]["actor_type"]
          created_at: string
          detail: Json | null
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id: string
          actor_type: Database["public"]["Enums"]["actor_type"]
          created_at?: string
          detail?: Json | null
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string
          actor_type?: Database["public"]["Enums"]["actor_type"]
          created_at?: string
          detail?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actor_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      actor_registry: {
        Row: {
          active: boolean
          capabilities: string[] | null
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["actor_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          capabilities?: string[] | null
          created_at?: string
          id: string
          name: string
          type: Database["public"]["Enums"]["actor_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          capabilities?: string[] | null
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["actor_type"]
          updated_at?: string
        }
        Relationships: []
      }
      backlog_item: {
        Row: {
          captured_via: string | null
          component: string | null
          created_at: string
          data_origin: Database["public"]["Enums"]["data_origin"]
          description: string | null
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          project_id: string
          promoted_to_task_id: string | null
          search_vector: unknown
          size: Database["public"]["Enums"]["size_estimate"] | null
          source_id: string | null
          status: Database["public"]["Enums"]["backlog_status"]
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          captured_via?: string | null
          component?: string | null
          created_at?: string
          data_origin?: Database["public"]["Enums"]["data_origin"]
          description?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          project_id: string
          promoted_to_task_id?: string | null
          search_vector?: unknown
          size?: Database["public"]["Enums"]["size_estimate"] | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["backlog_status"]
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          captured_via?: string | null
          component?: string | null
          created_at?: string
          data_origin?: Database["public"]["Enums"]["data_origin"]
          description?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          project_id?: string
          promoted_to_task_id?: string | null
          search_vector?: unknown
          size?: Database["public"]["Enums"]["size_estimate"] | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["backlog_status"]
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backlog_item_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backlog_item_promoted_to_task_id_fkey"
            columns: ["promoted_to_task_id"]
            isOneToOne: false
            referencedRelation: "task"
            referencedColumns: ["id"]
          },
        ]
      }
      connector: {
        Row: {
          config: Json
          connector_type: string
          created_at: string
          field_mapping: Json | null
          id: string
          last_sync_at: string | null
          project_id: string
          status: Database["public"]["Enums"]["connector_status"]
          sync_frequency: Database["public"]["Enums"]["sync_frequency"] | null
          updated_at: string
        }
        Insert: {
          config?: Json
          connector_type: string
          created_at?: string
          field_mapping?: Json | null
          id?: string
          last_sync_at?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["connector_status"]
          sync_frequency?: Database["public"]["Enums"]["sync_frequency"] | null
          updated_at?: string
        }
        Update: {
          config?: Json
          connector_type?: string
          created_at?: string
          field_mapping?: Json | null
          id?: string
          last_sync_at?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["connector_status"]
          sync_frequency?: Database["public"]["Enums"]["sync_frequency"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connector_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      phase: {
        Row: {
          completed_at: string | null
          created_at: string
          deadline_at: string | null
          description: string | null
          handoff_notes: string | null
          id: string
          name: string
          plan_id: string
          project_id: string
          sort_order: number
          started_at: string | null
          status: Database["public"]["Enums"]["phase_status"]
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deadline_at?: string | null
          description?: string | null
          handoff_notes?: string | null
          id?: string
          name: string
          plan_id: string
          project_id: string
          sort_order: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["phase_status"]
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deadline_at?: string | null
          description?: string | null
          handoff_notes?: string | null
          id?: string
          name?: string
          plan_id?: string
          project_id?: string
          sort_order?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["phase_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phase_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phase_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      plan: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          project_id: string
          status: Database["public"]["Enums"]["plan_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_id: string
          status?: Database["public"]["Enums"]["plan_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          status?: Database["public"]["Enums"]["plan_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "actor_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      project: {
        Row: {
          blockers: string[] | null
          categories: string[]
          created_at: string
          current_phase_id: string | null
          current_stage: string | null
          description: string | null
          focus: string | null
          health_override: Database["public"]["Enums"]["project_health"] | null
          health_reason: string | null
          id: string
          name: string
          owner_id: string
          pending_decisions: string[] | null
          project_type: Database["public"]["Enums"]["project_type"]
          status: Database["public"]["Enums"]["project_status"]
          tags: string[] | null
          updated_at: string
          workflow_type: Database["public"]["Enums"]["workflow_type"]
        }
        Insert: {
          blockers?: string[] | null
          categories: string[]
          created_at?: string
          current_phase_id?: string | null
          current_stage?: string | null
          description?: string | null
          focus?: string | null
          health_override?: Database["public"]["Enums"]["project_health"] | null
          health_reason?: string | null
          id?: string
          name: string
          owner_id: string
          pending_decisions?: string[] | null
          project_type: Database["public"]["Enums"]["project_type"]
          status?: Database["public"]["Enums"]["project_status"]
          tags?: string[] | null
          updated_at?: string
          workflow_type: Database["public"]["Enums"]["workflow_type"]
        }
        Update: {
          blockers?: string[] | null
          categories?: string[]
          created_at?: string
          current_phase_id?: string | null
          current_stage?: string | null
          description?: string | null
          focus?: string | null
          health_override?: Database["public"]["Enums"]["project_health"] | null
          health_reason?: string | null
          id?: string
          name?: string
          owner_id?: string
          pending_decisions?: string[] | null
          project_type?: Database["public"]["Enums"]["project_type"]
          status?: Database["public"]["Enums"]["project_status"]
          tags?: string[] | null
          updated_at?: string
          workflow_type?: Database["public"]["Enums"]["workflow_type"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_project_current_phase"
            columns: ["current_phase_id"]
            isOneToOne: false
            referencedRelation: "phase"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "actor_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      project_display_id_seq: {
        Row: {
          next_val: number
          project_id: string
        }
        Insert: {
          next_val?: number
          project_id: string
        }
        Update: {
          next_val?: number
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_display_id_seq_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      task: {
        Row: {
          acceptance_criteria: string | null
          blocked_reason: string | null
          completed_at: string | null
          created_at: string
          data_origin: Database["public"]["Enums"]["data_origin"]
          deadline_at: string | null
          depends_on: string[] | null
          description: string | null
          display_id: number
          id: string
          notes: string | null
          outcome: string | null
          owner_id: string | null
          owner_type: Database["public"]["Enums"]["owner_type"] | null
          phase_id: string | null
          plan_id: string | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          project_id: string
          search_vector: unknown
          size: Database["public"]["Enums"]["size_estimate"] | null
          sort_order: number | null
          source_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          validation_status:
            | Database["public"]["Enums"]["validation_status"]
            | null
        }
        Insert: {
          acceptance_criteria?: string | null
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string
          data_origin?: Database["public"]["Enums"]["data_origin"]
          deadline_at?: string | null
          depends_on?: string[] | null
          description?: string | null
          display_id: number
          id?: string
          notes?: string | null
          outcome?: string | null
          owner_id?: string | null
          owner_type?: Database["public"]["Enums"]["owner_type"] | null
          phase_id?: string | null
          plan_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          project_id: string
          search_vector?: unknown
          size?: Database["public"]["Enums"]["size_estimate"] | null
          sort_order?: number | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_status?:
            | Database["public"]["Enums"]["validation_status"]
            | null
        }
        Update: {
          acceptance_criteria?: string | null
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string
          data_origin?: Database["public"]["Enums"]["data_origin"]
          deadline_at?: string | null
          depends_on?: string[] | null
          description?: string | null
          display_id?: number
          id?: string
          notes?: string | null
          outcome?: string | null
          owner_id?: string | null
          owner_type?: Database["public"]["Enums"]["owner_type"] | null
          phase_id?: string | null
          plan_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          project_id?: string
          search_vector?: unknown
          size?: Database["public"]["Enums"]["size_estimate"] | null
          sort_order?: number | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_status?:
            | Database["public"]["Enums"]["validation_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "task_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "actor_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phase"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "actor_registry"
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
      actor_type: "human" | "agent" | "system" | "connector"
      backlog_status:
        | "captured"
        | "triaged"
        | "prioritized"
        | "promoted"
        | "archived"
      connector_status: "active" | "paused" | "error"
      data_origin: "synced" | "native"
      owner_type: "human" | "agent"
      phase_status: "pending" | "active" | "completed"
      plan_status: "draft" | "approved" | "in_progress" | "completed"
      priority_level: "P1" | "P2" | "P3"
      project_health: "green" | "yellow" | "red"
      project_status: "active" | "paused" | "completed" | "archived"
      project_type: "connected" | "native"
      size_estimate: "S" | "M" | "L"
      sync_frequency: "on_demand" | "on_commit" | "hourly" | "daily"
      task_status: "pending" | "in_progress" | "blocked" | "done"
      validation_status: "not_validated" | "passed" | "failed"
      workflow_type: "flat" | "planned"
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
      actor_type: ["human", "agent", "system", "connector"],
      backlog_status: [
        "captured",
        "triaged",
        "prioritized",
        "promoted",
        "archived",
      ],
      connector_status: ["active", "paused", "error"],
      data_origin: ["synced", "native"],
      owner_type: ["human", "agent"],
      phase_status: ["pending", "active", "completed"],
      plan_status: ["draft", "approved", "in_progress", "completed"],
      priority_level: ["P1", "P2", "P3"],
      project_health: ["green", "yellow", "red"],
      project_status: ["active", "paused", "completed", "archived"],
      project_type: ["connected", "native"],
      size_estimate: ["S", "M", "L"],
      sync_frequency: ["on_demand", "on_commit", "hourly", "daily"],
      task_status: ["pending", "in_progress", "blocked", "done"],
      validation_status: ["not_validated", "passed", "failed"],
      workflow_type: ["flat", "planned"],
    },
  },
} as const


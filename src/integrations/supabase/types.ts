export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      ai_requests: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          address: string | null;
          company: string | null;
          created_at: string;
          default_hourly_rate: number;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          address?: string | null;
          company?: string | null;
          created_at?: string;
          default_hourly_rate?: number;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          address?: string | null;
          company?: string | null;
          created_at?: string;
          default_hourly_rate?: number;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      deliverables: {
        Row: {
          created_at: string;
          description: string | null;
          feedback: string | null;
          file_name: string;
          file_path: string;
          id: string;
          project_id: string;
          reviewed_at: string | null;
          status: string;
          title: string;
          user_id: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          feedback?: string | null;
          file_name: string;
          file_path: string;
          id?: string;
          project_id: string;
          reviewed_at?: string | null;
          status?: string;
          title: string;
          user_id?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          feedback?: string | null;
          file_name?: string;
          file_path?: string;
          id?: string;
          project_id?: string;
          reviewed_at?: string | null;
          status?: string;
          title?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "deliverables_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_items: {
        Row: {
          amount: number;
          description: string;
          id: string;
          invoice_id: string;
          quantity: number;
          rate: number;
          time_log_id: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          description: string;
          id?: string;
          invoice_id: string;
          quantity: number;
          rate: number;
          time_log_id?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          description?: string;
          id?: string;
          invoice_id?: string;
          quantity?: number;
          rate?: number;
          time_log_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_items_time_log_id_fkey";
            columns: ["time_log_id"];
            isOneToOne: false;
            referencedRelation: "time_logs";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          client_id: string;
          created_at: string;
          due_date: string;
          id: string;
          invoice_number: string;
          issue_date: string;
          notes: string | null;
          paid_at: string | null;
          status: Database["public"]["Enums"]["invoice_status"];
          subtotal: number;
          tax: number;
          tax_rate: number;
          total: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          due_date: string;
          id?: string;
          invoice_number: string;
          issue_date?: string;
          notes?: string | null;
          paid_at?: string | null;
          status?: Database["public"]["Enums"]["invoice_status"];
          subtotal?: number;
          tax?: number;
          tax_rate?: number;
          total?: number;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          due_date?: string;
          id?: string;
          invoice_number?: string;
          issue_date?: string;
          notes?: string | null;
          paid_at?: string | null;
          status?: Database["public"]["Enums"]["invoice_status"];
          subtotal?: number;
          tax?: number;
          tax_rate?: number;
          total?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          project_id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          project_id: string;
          sender_id?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          project_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          kind: string;
          link: string | null;
          read: boolean;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          link?: string | null;
          read?: boolean;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          link?: string | null;
          read?: boolean;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          address: string | null;
          business_name: string | null;
          created_at: string;
          default_hourly_rate: number;
          email: string | null;
          id: string;
          name: string;
          notify_deliverables: boolean;
          notify_messages: boolean;
          notify_payments: boolean;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          business_name?: string | null;
          created_at?: string;
          default_hourly_rate?: number;
          email?: string | null;
          id: string;
          name?: string;
          notify_deliverables?: boolean;
          notify_messages?: boolean;
          notify_payments?: boolean;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          business_name?: string | null;
          created_at?: string;
          default_hourly_rate?: number;
          email?: string | null;
          id?: string;
          name?: string;
          notify_deliverables?: boolean;
          notify_messages?: boolean;
          notify_payments?: boolean;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_orders: {
        Row: {
          assigned_at: string | null;
          budget: number;
          created_at: string;
          deadline: string | null;
          description: string | null;
          freelancer_id: string | null;
          hourly_rate: number | null;
          id: string;
          name: string;
          project_id: string | null;
          status: Database["public"]["Enums"]["project_order_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          assigned_at?: string | null;
          budget?: number;
          created_at?: string;
          deadline?: string | null;
          description?: string | null;
          freelancer_id?: string | null;
          hourly_rate?: number | null;
          id?: string;
          name: string;
          project_id?: string | null;
          status?: Database["public"]["Enums"]["project_order_status"];
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          assigned_at?: string | null;
          budget?: number;
          created_at?: string;
          deadline?: string | null;
          description?: string | null;
          freelancer_id?: string | null;
          hourly_rate?: number | null;
          id?: string;
          name?: string;
          project_id?: string | null;
          status?: Database["public"]["Enums"]["project_order_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_orders_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          budget: number;
          client_id: string;
          created_at: string;
          deadline: string | null;
          description: string | null;
          hourly_rate: number | null;
          id: string;
          name: string;
          shared_with_client: boolean;
          start_date: string | null;
          status: Database["public"]["Enums"]["project_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          budget?: number;
          client_id: string;
          created_at?: string;
          deadline?: string | null;
          description?: string | null;
          hourly_rate?: number | null;
          id?: string;
          name: string;
          shared_with_client?: boolean;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          budget?: number;
          client_id?: string;
          created_at?: string;
          deadline?: string | null;
          description?: string | null;
          hourly_rate?: number | null;
          id?: string;
          name?: string;
          shared_with_client?: boolean;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          plan: Database["public"]["Enums"]["plan_tier"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          plan?: Database["public"]["Enums"]["plan_tier"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          plan?: Database["public"]["Enums"]["plan_tier"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          client_visible: boolean;
          created_at: string;
          description: string | null;
          due_date: string | null;
          estimated_hours: number | null;
          id: string;
          phase: string | null;
          priority: Database["public"]["Enums"]["task_priority"];
          project_id: string;
          source: string;
          status: Database["public"]["Enums"]["task_status"];
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          client_visible?: boolean;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          estimated_hours?: number | null;
          id?: string;
          phase?: string | null;
          priority?: Database["public"]["Enums"]["task_priority"];
          project_id: string;
          source?: string;
          status?: Database["public"]["Enums"]["task_status"];
          title: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          client_visible?: boolean;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          estimated_hours?: number | null;
          id?: string;
          phase?: string | null;
          priority?: Database["public"]["Enums"]["task_priority"];
          project_id?: string;
          source?: string;
          status?: Database["public"]["Enums"]["task_status"];
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      time_logs: {
        Row: {
          billable: boolean;
          billable_amount: number;
          billed: boolean;
          created_at: string;
          description: string | null;
          duration_minutes: number;
          end_time: string;
          hourly_rate: number;
          id: string;
          invoice_id: string | null;
          project_id: string;
          start_time: string;
          user_id: string;
        };
        Insert: {
          billable?: boolean;
          billable_amount?: number;
          billed?: boolean;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number;
          end_time: string;
          hourly_rate?: number;
          id?: string;
          invoice_id?: string | null;
          project_id: string;
          start_time: string;
          user_id?: string;
        };
        Update: {
          billable?: boolean;
          billable_amount?: number;
          billed?: boolean;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number;
          end_time?: string;
          hourly_rate?: number;
          id?: string;
          invoice_id?: string | null;
          project_id?: string;
          start_time?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "time_logs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          role_locked: boolean;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          role_locked?: boolean;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          role_locked?: boolean;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_access_project: { Args: { _pid: string }; Returns: boolean };
      can_access_project_path: { Args: { _name: string }; Returns: boolean };
      client_invoice_items: {
        Args: { _invoice_id: string };
        Returns: {
          amount: number;
          description: string;
          quantity: number;
          rate: number;
        }[];
      };
      client_invoice_pdf_allowed: {
        Args: { _invoice_id: string };
        Returns: boolean;
      };
      client_invoices: {
        Args: never;
        Returns: {
          client_name: string;
          due_date: string;
          freelancer_address: string;
          freelancer_business: string;
          freelancer_email: string;
          freelancer_name: string;
          id: string;
          invoice_number: string;
          issue_date: string;
          notes: string;
          paid_at: string;
          status: Database["public"]["Enums"]["invoice_status"];
          subtotal: number;
          tax: number;
          tax_rate: number;
          total: number;
        }[];
      };
      client_project_ids: { Args: never; Returns: string[] };
      client_projects: {
        Args: never;
        Returns: {
          deadline: string;
          description: string;
          done_tasks: number;
          freelancer_name: string;
          id: string;
          name: string;
          start_date: string;
          status: Database["public"]["Enums"]["project_status"];
          total_tasks: number;
        }[];
      };
      client_tasks: {
        Args: never;
        Returns: {
          description: string;
          due_date: string;
          id: string;
          phase: string;
          priority: Database["public"]["Enums"]["task_priority"];
          project_id: string;
          project_name: string;
          status: Database["public"]["Enums"]["task_status"];
          title: string;
        }[];
      };
      client_user_ids: { Args: { _client_id: string }; Returns: string[] };
      create_invoice: {
        Args: {
          _client_id: string;
          _due_date: string;
          _from: string;
          _notes: string;
          _tax_rate: number;
          _to: string;
        };
        Returns: string;
      };
      accept_project_order: {
        Args: { _order_id: string };
        Returns: string;
      };
      current_plan: {
        Args: { _uid: string };
        Returns: Database["public"]["Enums"]["plan_tier"];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      my_role: { Args: never; Returns: Database["public"]["Enums"]["app_role"] };
      my_verified_email: { Args: never; Returns: string };
      owns_project_path: { Args: { _name: string }; Returns: boolean };
      review_deliverable: {
        Args: { _decision: string; _feedback: string; _id: string };
        Returns: undefined;
      };
      set_my_plan: {
        Args: { _plan: Database["public"]["Enums"]["plan_tier"] };
        Returns: undefined;
      };
      set_my_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "freelancer" | "client";
      invoice_status: "DRAFT" | "SENT" | "PAID" | "OVERDUE";
      plan_tier: "FREE" | "PRO";
      project_order_status: "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
      project_status: "ACTIVE" | "COMPLETED" | "ON_HOLD";
      task_priority: "LOW" | "MEDIUM" | "HIGH";
      task_status: "TODO" | "IN_PROGRESS" | "COMPLETED";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["freelancer", "client"],
      invoice_status: ["DRAFT", "SENT", "PAID", "OVERDUE"],
      plan_tier: ["FREE", "PRO"],
      project_status: ["ACTIVE", "COMPLETED", "ON_HOLD"],
      task_priority: ["LOW", "MEDIUM", "HIGH"],
      task_status: ["TODO", "IN_PROGRESS", "COMPLETED"],
    },
  },
} as const;

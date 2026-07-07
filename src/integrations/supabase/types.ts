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
      admin_audit_log: {
        Row: {
          acao: string
          admin_id: string
          created_at: string
          dados_anteriores: Json | null
          id: string
          motivo: string | null
          registro_id: string
          tabela: string
        }
        Insert: {
          acao: string
          admin_id: string
          created_at?: string
          dados_anteriores?: Json | null
          id?: string
          motivo?: string | null
          registro_id: string
          tabela: string
        }
        Update: {
          acao?: string
          admin_id?: string
          created_at?: string
          dados_anteriores?: Json | null
          id?: string
          motivo?: string | null
          registro_id?: string
          tabela?: string
        }
        Relationships: []
      }
      admin_config: {
        Row: {
          chave: string
          id: string
          updated_at: string
          updated_by: string | null
          valor: string
        }
        Insert: {
          chave: string
          id?: string
          updated_at?: string
          updated_by?: string | null
          valor: string
        }
        Update: {
          chave?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
          valor?: string
        }
        Relationships: []
      }
      assinaturas: {
        Row: {
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          asaas_subscription_id: string | null
          cancelado_em: string | null
          created_at: string
          id: string
          motivo_cancelamento: string | null
          plano: string
          proximo_vencimento: string | null
          status: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          cancelado_em?: string | null
          created_at?: string
          id?: string
          motivo_cancelamento?: string | null
          plano: string
          proximo_vencimento?: string | null
          status?: string
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          cancelado_em?: string | null
          created_at?: string
          id?: string
          motivo_cancelamento?: string | null
          plano?: string
          proximo_vencimento?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      colaborador_jornadas: {
        Row: {
          colaborador_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          jornada_id: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          id?: string
          jornada_id: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          jornada_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_jornadas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_jornadas_jornada_id_fkey"
            columns: ["jornada_id"]
            isOneToOne: false
            referencedRelation: "jornadas_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores: {
        Row: {
          ativo: boolean
          cargo: string | null
          cpf: string | null
          created_at: string
          data_admissao: string | null
          data_demissao: string | null
          email: string | null
          empresa_id: string
          foto_url: string | null
          id: string
          matricula: string | null
          nome_completo: string
          setor_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_demissao?: string | null
          email?: string | null
          empresa_id: string
          foto_url?: string | null
          id?: string
          matricula?: string | null
          nome_completo: string
          setor_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_demissao?: string | null
          email?: string | null
          empresa_id?: string
          foto_url?: string | null
          id?: string
          matricula?: string | null
          nome_completo?: string
          setor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_eventos: {
        Row: {
          admin_id: string | null
          created_at: string
          descricao: string | null
          id: string
          tipo: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          tipo: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          admin_user_id: string | null
          ativo: boolean
          cnpj: string | null
          created_at: string
          email_contato: string | null
          id: string
          logo_url: string | null
          max_colaboradores: number
          nome: string
          plano: string
          telefone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          admin_user_id?: string | null
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          email_contato?: string | null
          id?: string
          logo_url?: string | null
          max_colaboradores?: number
          nome: string
          plano?: string
          telefone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          admin_user_id?: string | null
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          email_contato?: string | null
          id?: string
          logo_url?: string | null
          max_colaboradores?: number
          nome?: string
          plano?: string
          telefone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      jornada_config: {
        Row: {
          adicional_noturno: boolean
          banco_horas_ativo: boolean
          banco_horas_limite_horas: number | null
          created_at: string
          dias_trabalho: string[]
          horario_entrada: string
          horario_saida: string
          id: string
          intervalo_minutos: number
          tolerancia_minutos: number
          updated_at: string
          user_id: string
        }
        Insert: {
          adicional_noturno?: boolean
          banco_horas_ativo?: boolean
          banco_horas_limite_horas?: number | null
          created_at?: string
          dias_trabalho?: string[]
          horario_entrada?: string
          horario_saida?: string
          id?: string
          intervalo_minutos?: number
          tolerancia_minutos?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          adicional_noturno?: boolean
          banco_horas_ativo?: boolean
          banco_horas_limite_horas?: number | null
          created_at?: string
          dias_trabalho?: string[]
          horario_entrada?: string
          horario_saida?: string
          id?: string
          intervalo_minutos?: number
          tolerancia_minutos?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jornadas_empresa: {
        Row: {
          adicional_noturno: boolean
          banco_horas_ativo: boolean
          carga_semanal_horas: number | null
          created_at: string
          domingo_entrada: string | null
          domingo_intervalo: number | null
          domingo_saida: string | null
          empresa_id: string
          escala_descricao: string | null
          escala_horas_folga: number | null
          escala_horas_trabalho: number | null
          folgas_flexiveis_semana: number | null
          he_percentual_dia_util: number
          he_percentual_feriado: number
          id: string
          nome: string
          quarta_entrada: string | null
          quarta_intervalo: number | null
          quarta_saida: string | null
          quinta_entrada: string | null
          quinta_intervalo: number | null
          quinta_saida: string | null
          sabado_entrada: string | null
          sabado_intervalo: number | null
          sabado_saida: string | null
          segunda_entrada: string | null
          segunda_intervalo: number | null
          segunda_saida: string | null
          sexta_entrada: string | null
          sexta_intervalo: number | null
          sexta_saida: string | null
          terca_entrada: string | null
          terca_intervalo: number | null
          terca_saida: string | null
          tipo: string
          tolerancia_minutos: number
        }
        Insert: {
          adicional_noturno?: boolean
          banco_horas_ativo?: boolean
          carga_semanal_horas?: number | null
          created_at?: string
          domingo_entrada?: string | null
          domingo_intervalo?: number | null
          domingo_saida?: string | null
          empresa_id: string
          escala_descricao?: string | null
          escala_horas_folga?: number | null
          escala_horas_trabalho?: number | null
          folgas_flexiveis_semana?: number | null
          he_percentual_dia_util?: number
          he_percentual_feriado?: number
          id?: string
          nome: string
          quarta_entrada?: string | null
          quarta_intervalo?: number | null
          quarta_saida?: string | null
          quinta_entrada?: string | null
          quinta_intervalo?: number | null
          quinta_saida?: string | null
          sabado_entrada?: string | null
          sabado_intervalo?: number | null
          sabado_saida?: string | null
          segunda_entrada?: string | null
          segunda_intervalo?: number | null
          segunda_saida?: string | null
          sexta_entrada?: string | null
          sexta_intervalo?: number | null
          sexta_saida?: string | null
          terca_entrada?: string | null
          terca_intervalo?: number | null
          terca_saida?: string | null
          tipo: string
          tolerancia_minutos?: number
        }
        Update: {
          adicional_noturno?: boolean
          banco_horas_ativo?: boolean
          carga_semanal_horas?: number | null
          created_at?: string
          domingo_entrada?: string | null
          domingo_intervalo?: number | null
          domingo_saida?: string | null
          empresa_id?: string
          escala_descricao?: string | null
          escala_horas_folga?: number | null
          escala_horas_trabalho?: number | null
          folgas_flexiveis_semana?: number | null
          he_percentual_dia_util?: number
          he_percentual_feriado?: number
          id?: string
          nome?: string
          quarta_entrada?: string | null
          quarta_intervalo?: number | null
          quarta_saida?: string | null
          quinta_entrada?: string | null
          quinta_intervalo?: number | null
          quinta_saida?: string | null
          sabado_entrada?: string | null
          sabado_intervalo?: number | null
          sabado_saida?: string | null
          segunda_entrada?: string | null
          segunda_intervalo?: number | null
          segunda_saida?: string | null
          sexta_entrada?: string | null
          sexta_intervalo?: number | null
          sexta_saida?: string | null
          terca_entrada?: string | null
          terca_intervalo?: number | null
          terca_saida?: string | null
          tipo?: string
          tolerancia_minutos?: number
        }
        Relationships: [
          {
            foreignKeyName: "jornadas_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_registros: {
        Row: {
          created_at: string
          data_hora: string
          data_hora_original: string
          foi_editado: boolean
          id: string
          justificativa: string | null
          origem: string
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_hora: string
          data_hora_original?: string
          foi_editado?: boolean
          id?: string
          justificativa?: string | null
          origem?: string
          tipo: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_hora?: string
          data_hora_original?: string
          foi_editado?: boolean
          id?: string
          justificativa?: string | null
          origem?: string
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      premium_access: {
        Row: {
          created_at: string
          id: string
          motivo: string
          user_id: string
          valido_ate: string
        }
        Insert: {
          created_at?: string
          id?: string
          motivo: string
          user_id: string
          valido_ate: string
        }
        Update: {
          created_at?: string
          id?: string
          motivo?: string
          user_id?: string
          valido_ate?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_notes: string | null
          avatar_url: string | null
          bloqueado: boolean
          carga_horaria_diaria: number
          created_at: string
          email: string
          id: string
          nome_completo: string | null
          onboarding_concluido: boolean
          profissao: string | null
          referral_code: string | null
          referral_count: number
          referred_by: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          avatar_url?: string | null
          bloqueado?: boolean
          carga_horaria_diaria?: number
          created_at?: string
          email: string
          id: string
          nome_completo?: string | null
          onboarding_concluido?: boolean
          profissao?: string | null
          referral_code?: string | null
          referral_count?: number
          referred_by?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          avatar_url?: string | null
          bloqueado?: boolean
          carga_horaria_diaria?: number
          created_at?: string
          email?: string
          id?: string
          nome_completo?: string | null
          onboarding_concluido?: boolean
          profissao?: string | null
          referral_code?: string | null
          referral_count?: number
          referred_by?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      setores: {
        Row: {
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "setores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_plans: {
        Row: {
          cancelado_em: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          id: string
          motivo_cancelamento: string | null
          plano: string
          updated_at: string
          user_id: string
          valor_cobrado: number | null
        }
        Insert: {
          cancelado_em?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          motivo_cancelamento?: string | null
          plano?: string
          updated_at?: string
          user_id: string
          valor_cobrado?: number | null
        }
        Update: {
          cancelado_em?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          motivo_cancelamento?: string | null
          plano?: string
          updated_at?: string
          user_id?: string
          valor_cobrado?: number | null
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aplicar_indicacao: { Args: { _codigo: string }; Returns: undefined }
      generate_referral_code: { Args: { nome: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      verificar_recompensas_premium: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "superadmin" | "user"
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
      app_role: ["superadmin", "user"],
    },
  },
} as const

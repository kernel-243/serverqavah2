export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          created_at: string
          nom: string
          prenom: string
          sexe: string
          date_naissance: string | null
          adresse: string | null
          email: string
          indicatif: string
          telephone: string
          salarie: boolean
          type_emploi: string | null
          revenu_mensuel: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          nom: string
          prenom: string
          sexe: string
          date_naissance?: string | null
          adresse?: string | null
          email: string
          indicatif: string
          telephone: string
          salarie: boolean
          type_emploi?: string | null
          revenu_mensuel?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          nom?: string
          prenom?: string
          sexe?: string
          date_naissance?: string | null
          adresse?: string | null
          email?: string
          indicatif?: string
          telephone?: string
          salarie?: boolean
          type_emploi?: string | null
          revenu_mensuel?: number | null
        }
      }
      contracts: {
        Row: {
          id: string
          created_at: string
          client_id: string
          ville: string
          commune: string
          terrain: string
          total: number
          date_contrat: string
          date_debut: string
          date_fin: string
        }
        Insert: {
          id?: string
          created_at?: string
          client_id: string
          ville: string
          commune: string
          terrain: string
          total: number
          date_contrat: string
          date_debut: string
          date_fin: string
        }
        Update: {
          id?: string
          created_at?: string
          client_id?: string
          ville?: string
          commune?: string
          terrain?: string
          total?: number
          date_contrat?: string
          date_debut?: string
          date_fin?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}


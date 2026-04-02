// ══════════════════════════════════════════════════
// Supabase Database Types
// يُولَّد تلقائياً بأمر: npm run db:types
// ══════════════════════════════════════════════════

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:            string
          username:      string
          name:          string | null
          phone:         string | null
          plan:          string
          plan_period:   string | null
          status:        string
          expires_at:    string | null
          created_at:    string
          updated_at:    string
          last_login_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      subscriptions: {
        Row: {
          id:             string
          user_id:        string
          plan:           string
          period:         string
          amount:         number | null
          vat:            number | null
          total:          number | null
          status:         string
          payment_ref:    string | null
          payment_method: string | null
          starts_at:      string | null
          expires_at:     string | null
          created_at:     string
          updated_at:     string
        }
        Insert: Omit<Database['public']['Tables']['subscriptions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>
      }
      subscription_codes: {
        Row: {
          code:         string
          plan:         string
          note:         string | null
          expiry:       string | null
          active:       boolean
          created_at:   string
          last_used_at: string | null
          used_by:      string | null
          created_by:   string | null
        }
        Insert: Omit<Database['public']['Tables']['subscription_codes']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['subscription_codes']['Insert']>
      }
      portfolio: {
        Row: {
          id:         string
          user_id:    string
          ticker:     string
          name:       string
          qty:        number
          avg_price:  number
          sector:     string | null
          added_at:   string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['portfolio']['Row'], 'id' | 'added_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['portfolio']['Insert']>
      }
      watchlist: {
        Row: {
          id:       string
          user_id:  string
          ticker:   string
          name:     string
          added_at: string
        }
        Insert: Omit<Database['public']['Tables']['watchlist']['Row'], 'id' | 'added_at'>
        Update: Partial<Database['public']['Tables']['watchlist']['Insert']>
      }
      analysis_history: {
        Row: {
          id:              number
          user_id:         string | null
          text_snippet:    string
          headline:        string | null
          sector:          string | null
          sentiment_dir:   string | null
          sentiment_score: number | null
          confidence:      number | null
          used_ai:         boolean
          market:          string
          stocks_json:     Json | null
          keywords:        string[] | null
          created_at:      string
        }
        Insert: Omit<Database['public']['Tables']['analysis_history']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['analysis_history']['Insert']>
      }
    }
    Views:   Record<string, never>
    Functions: Record<string, never>
    Enums:   Record<string, never>
  }
}

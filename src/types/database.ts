/**
 * Tipos de la base de datos (migraciones 0001 del Sprint 1).
 *
 * Escritos a mano con el mismo formato que genera Supabase. En cuanto tengáis Supabase local,
 * sustituid este archivo por el generado:
 *   npx supabase gen types typescript --local > src/types/database.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_kind: string;
          avatar_value: string;
          is_anonymous: boolean;
          phone: string | null;
          paypal_username: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          avatar_kind?: string;
          avatar_value?: string;
          is_anonymous?: boolean;
          phone?: string | null;
          paypal_username?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_kind?: string;
          avatar_value?: string;
          is_anonymous?: boolean;
          phone?: string | null;
          paypal_username?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      cars: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          photo_path: string | null;
          nfc_code: string;
          consumption_l_100km: number;
          fuel_type: string;
          seats: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          photo_path?: string | null;
          nfc_code: string;
          consumption_l_100km: number;
          fuel_type: string;
          seats?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          photo_path?: string | null;
          nfc_code?: string;
          consumption_l_100km?: number;
          fuel_type?: string;
          seats?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      sessions: {
        Row: {
          id: string;
          car_id: string;
          host_id: string;
          status: string;
          join_mode: string;
          consumption_l_100km: number;
          fuel_price_eur_l: number | null;
          destination_name: string | null;
          destination_lat: number | null;
          destination_lon: number | null;
          started_at: string | null;
          ended_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          car_id: string;
          host_id: string;
          status?: string;
          join_mode?: string;
          consumption_l_100km: number;
          fuel_price_eur_l?: number | null;
          destination_name?: string | null;
          destination_lat?: number | null;
          destination_lon?: number | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          car_id?: string;
          host_id?: string;
          status?: string;
          join_mode?: string;
          consumption_l_100km?: number;
          fuel_price_eur_l?: number | null;
          destination_name?: string | null;
          destination_lat?: number | null;
          destination_lon?: number | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sessions_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sessions_host_id_fkey';
            columns: ['host_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      session_members: {
        Row: {
          session_id: string;
          user_id: string;
          role: string;
          status: string;
          seat: number | null;
          display_name: string;
          avatar_kind: string;
          avatar_value: string;
          joined_at: string;
          left_at: string | null;
        };
        Insert: {
          session_id: string;
          user_id: string;
          role?: string;
          status?: string;
          seat?: number | null;
          display_name: string;
          avatar_kind?: string;
          avatar_value: string;
          joined_at?: string;
          left_at?: string | null;
        };
        Update: {
          session_id?: string;
          user_id?: string;
          role?: string;
          status?: string;
          seat?: number | null;
          display_name?: string;
          avatar_kind?: string;
          avatar_value?: string;
          joined_at?: string;
          left_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'session_members_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'session_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      start_session: {
        Args: { p_car_id: string; p_join_mode?: string };
        Returns: string;
      };
      get_session_preview: {
        Args: { p_nfc_code: string };
        Returns: Json;
      };
      join_session: {
        Args: {
          p_nfc_code: string;
          p_display_name: string;
          p_avatar_kind: string;
          p_avatar_value: string;
          p_seat: number | null;
        };
        Returns: Json;
      };
      is_member: { Args: { p_session_id: string }; Returns: boolean };
      is_admin: { Args: { p_session_id: string }; Returns: boolean };
      is_host: { Args: { p_session_id: string }; Returns: boolean };
      shares_session: { Args: { p_user_id: string }; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type ProfileRow = Tables<'profiles'>;
export type CarRow = Tables<'cars'>;
export type SessionRow = Tables<'sessions'>;
export type SessionMemberRow = Tables<'session_members'>;

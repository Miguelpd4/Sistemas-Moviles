/**
 * Tipos de la base de datos (migraciones del Sprint 1 y coche_modelo).
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
          make: string | null;
          model: string | null;
          version: string | null;
          color: string | null;
          model_image_url: string | null;
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
          make?: string | null;
          model?: string | null;
          version?: string | null;
          color?: string | null;
          model_image_url?: string | null;
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
          make?: string | null;
          model?: string | null;
          version?: string | null;
          color?: string | null;
          model_image_url?: string | null;
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
      music_queue: {
        Row: {
          id: string;
          session_id: string;
          source: string;
          track_id: string;
          title: string;
          artist: string;
          album_art_url: string | null;
          duration_ms: number;
          added_by: string;
          status: string;
          created_at: string;
          started_at: string | null;
          ended_at: string | null;
          dj_round_id: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          source?: string;
          track_id: string;
          title: string;
          artist: string;
          album_art_url?: string | null;
          duration_ms: number;
          added_by: string;
          status?: string;
          created_at?: string;
          started_at?: string | null;
          ended_at?: string | null;
          dj_round_id?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          source?: string;
          track_id?: string;
          title?: string;
          artist?: string;
          album_art_url?: string | null;
          duration_ms?: number;
          added_by?: string;
          status?: string;
          created_at?: string;
          started_at?: string | null;
          ended_at?: string | null;
          dj_round_id?: string | null;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          session_id: string;
          paid_by: string;
          kind: string;
          description: string | null;
          amount_cents: number;
          receipt_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          paid_by: string;
          kind: string;
          description?: string | null;
          amount_cents: number;
          receipt_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          paid_by?: string;
          kind?: string;
          description?: string | null;
          amount_cents?: number;
          receipt_path?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          session_id: string;
          from_user: string;
          to_user: string;
          amount_cents: number;
          status: string;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          from_user: string;
          to_user: string;
          amount_cents: number;
          status?: string;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          from_user?: string;
          to_user?: string;
          amount_cents?: number;
          status?: string;
          paid_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      queue_votes: {
        Row: {
          queue_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          queue_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          queue_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      trip_points: {
        Row: {
          id: number;
          session_id: string;
          lat: number;
          lon: number;
          accuracy_m: number | null;
          speed_mps: number | null;
          recorded_at: string;
        };
        Insert: {
          id?: number;
          session_id: string;
          lat: number;
          lon: number;
          accuracy_m?: number | null;
          speed_mps?: number | null;
          recorded_at: string;
        };
        Update: {
          id?: number;
          session_id?: string;
          lat?: number;
          lon?: number;
          accuracy_m?: number | null;
          speed_mps?: number | null;
          recorded_at?: string;
        };
        Relationships: [];
      };
      trip_metrics: {
        Row: {
          session_id: string;
          distance_m: number;
          duration_s: number;
          start_lat: number | null;
          start_lon: number | null;
          last_lat: number | null;
          last_lon: number | null;
          end_lat: number | null;
          end_lon: number | null;
          updated_at: string;
        };
        Insert: {
          session_id: string;
          distance_m?: number;
          duration_s?: number;
          start_lat?: number | null;
          start_lon?: number | null;
          last_lat?: number | null;
          last_lon?: number | null;
          end_lat?: number | null;
          end_lon?: number | null;
          updated_at?: string;
        };
        Update: {
          session_id?: string;
          distance_m?: number;
          duration_s?: number;
          start_lat?: number | null;
          start_lon?: number | null;
          last_lat?: number | null;
          last_lon?: number | null;
          end_lat?: number | null;
          end_lon?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      game_rounds: {
        Row: {
          id: string;
          session_id: string;
          game: string;
          status: string;
          payload: Json;
          created_by: string;
          created_at: string;
          ends_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          game: string;
          status?: string;
          payload?: Json;
          created_by: string;
          created_at?: string;
          ends_at?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          game?: string;
          status?: string;
          payload?: Json;
          created_by?: string;
          created_at?: string;
          ends_at?: string | null;
        };
        Relationships: [];
      };
      game_round_secrets: {
        Row: {
          round_id: string;
          solution: Json;
        };
        Insert: {
          round_id: string;
          solution: Json;
        };
        Update: {
          round_id?: string;
          solution?: Json;
        };
        Relationships: [];
      };
      game_answers: {
        Row: {
          round_id: string;
          user_id: string;
          answer: Json;
          points: number;
          created_at: string;
        };
        Insert: {
          round_id: string;
          user_id: string;
          answer: Json;
          points?: number;
          created_at?: string;
        };
        Update: {
          round_id?: string;
          user_id?: string;
          answer?: Json;
          points?: number;
          created_at?: string;
        };
        Relationships: [];
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
      review_join: { Args: { p_session_id: string; p_user_id: string; p_accept: boolean }; Returns: undefined };
      set_copilot: { Args: { p_session_id: string; p_user_id: string | null }; Returns: undefined };
      set_join_mode: { Args: { p_session_id: string; p_join_mode: string }; Returns: undefined };
      leave_session: { Args: { p_session_id: string }; Returns: undefined };
      vote_skip: { Args: { p_queue_id: string }; Returns: Json };
      skip_song: { Args: { p_queue_id: string }; Returns: undefined };
      mark_payment_paid: { Args: { p_payment_id: string }; Returns: undefined };
      bingo_mark: { Args: { p_round_id: string; p_item: string }; Returns: Json };
      submit_plate: { Args: { p_round_id: string; p_plate: string }; Returns: number };
      plate_matches: { Args: { p_challenge: Json; p_plate: string }; Returns: boolean };
      set_destination: {
        Args: { p_session_id: string; p_name: string | null; p_lat: number | null; p_lon: number | null };
        Returns: undefined;
      };
      start_trip: {
        Args: { p_session_id: string; p_fuel_price: number; p_lat: number; p_lon: number };
        Returns: undefined;
      };
      end_trip: {
        Args: { p_session_id: string; p_distance_m: number; p_lat: number | null; p_lon: number | null };
        Returns: undefined;
      };
      create_round: {
        Args: { p_session_id: string; p_game: string; p_payload: Json; p_solution?: Json | null; p_seconds?: number | null };
        Returns: string;
      };
      submit_answer: { Args: { p_round_id: string; p_answer: Json }; Returns: undefined };
      reveal_round: { Args: { p_round_id: string }; Returns: undefined };
      close_round: { Args: { p_round_id: string }; Returns: undefined };
      start_guess_who: { Args: { p_session_id: string; p_seconds?: number }; Returns: string };
      start_song_quiz: { Args: { p_session_id: string; p_seconds?: number }; Returns: string };
      get_song_clip: { Args: { p_round_id: string }; Returns: Json };
      start_dj_round: { Args: { p_session_id: string }; Returns: string };
      add_dj_song: {
        Args: {
          p_round_id: string;
          p_track_id: string;
          p_title: string;
          p_artist: string;
          p_album_art_url: string | null;
          p_duration_ms: number;
        };
        Returns: string;
      };
      skip_dj_turn: { Args: { p_round_id: string }; Returns: undefined };
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
export type MusicQueueRow = Tables<'music_queue'>;
export type QueueVoteRow = Tables<'queue_votes'>;
export type ExpenseRow = Tables<'expenses'>;
export type PaymentRow = Tables<'payments'>;
export type TripMetricsRow = Tables<'trip_metrics'>;
export type GameRoundRow = Tables<'game_rounds'>;
export type GameAnswerRow = Tables<'game_answers'>;

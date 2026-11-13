/**
 * Máquina de estados de la entrada tipo Kahoot (S1-06). Es un reductor puro: el hook
 * `useJoinFlow` hace las llamadas de red y le pasa los resultados como acciones.
 *
 * cargando → bienvenida → perfil → asiento → enviando → (dentro | pendiente)
 * Además: error (no hay viaje o falla la red), rechazado.
 */
import type { AvatarKind } from './avatars';
import type { MemberStatus, SessionPreview } from '../types/session';

export type JoinStep =
  | 'cargando'
  | 'bienvenida'
  | 'perfil'
  | 'asiento'
  | 'enviando'
  | 'pendiente'
  | 'rechazado'
  | 'dentro'
  | 'error';

export type JoinState = {
  step: JoinStep;
  preview: SessionPreview | null;
  name: string;
  avatarKind: AvatarKind;
  avatarValue: string;
  seat: number | null;
  /** Error que impide seguir (paso `error`). */
  error: string | null;
  /** Aviso no bloqueante, por ejemplo «ese asiento ya está cogido». */
  notice: string | null;
};

export type JoinAction =
  | { type: 'preview_loaded'; preview: SessionPreview; defaultName: string; avatarKind: AvatarKind; avatarValue: string }
  | { type: 'load_failed'; message: string }
  | { type: 'retry' }
  | { type: 'start' }
  | { type: 'set_name'; name: string }
  | { type: 'set_avatar'; kind: AvatarKind; value: string }
  | { type: 'profile_done' }
  | { type: 'set_seat'; seat: number | null }
  | { type: 'back' }
  | { type: 'submit' }
  | { type: 'join_result'; status: Extract<MemberStatus, 'pendiente' | 'dentro'> }
  | { type: 'seat_taken'; preview: SessionPreview; message: string }
  | { type: 'join_failed'; message: string }
  | { type: 'status_changed'; status: MemberStatus }
  | { type: 'show_notice'; message: string };

export const initialJoinState: JoinState = {
  step: 'cargando',
  preview: null,
  name: '',
  avatarKind: 'preset',
  avatarValue: 'avatar-01',
  seat: null,
  error: null,
  notice: null,
};

export function isValidName(name: string): boolean {
  const length = name.trim().length;
  return length >= 1 && length <= 30;
}

function stepForStatus(status: MemberStatus | null): JoinStep {
  switch (status) {
    case 'dentro':
      return 'dentro';
    case 'pendiente':
      return 'pendiente';
    case 'rechazado':
      return 'rechazado';
    default:
      return 'bienvenida';
  }
}

export function joinReducer(state: JoinState, action: JoinAction): JoinState {
  switch (action.type) {
    case 'preview_loaded':
      return {
        ...state,
        step: stepForStatus(action.preview.my_status),
        preview: action.preview,
        name: state.name === '' ? action.defaultName : state.name,
        avatarKind: action.avatarKind,
        avatarValue: action.avatarValue,
        error: null,
      };
    case 'load_failed':
      return { ...state, step: 'error', error: action.message };
    case 'retry':
      return { ...state, step: 'cargando', error: null, notice: null };
    case 'start':
      return state.step === 'bienvenida' ? { ...state, step: 'perfil', notice: null } : state;
    case 'set_name':
      return { ...state, name: action.name.slice(0, 30) };
    case 'set_avatar':
      return { ...state, avatarKind: action.kind, avatarValue: action.value };
    case 'profile_done':
      if (state.step !== 'perfil') return state;
      return isValidName(state.name)
        ? { ...state, step: 'asiento', notice: null }
        : { ...state, notice: 'Escribe un nombre de 1 a 30 caracteres.' };
    case 'set_seat':
      return { ...state, seat: action.seat, notice: null };
    case 'back':
      if (state.step === 'asiento') return { ...state, step: 'perfil', notice: null };
      if (state.step === 'perfil') return { ...state, step: 'bienvenida', notice: null };
      return state;
    case 'submit':
      return state.step === 'asiento' ? { ...state, step: 'enviando', notice: null } : state;
    case 'join_result':
      return { ...state, step: action.status === 'dentro' ? 'dentro' : 'pendiente', notice: null };
    case 'seat_taken':
      return { ...state, step: 'asiento', preview: action.preview, seat: null, notice: action.message };
    case 'join_failed':
      return { ...state, step: 'asiento', notice: action.message };
    case 'status_changed':
      if (action.status === 'dentro') return { ...state, step: 'dentro' };
      if (action.status === 'rechazado') return { ...state, step: 'rechazado' };
      return state;
    case 'show_notice':
      return { ...state, notice: action.message };
    default:
      return state;
  }
}

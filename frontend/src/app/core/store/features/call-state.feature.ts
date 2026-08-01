import { computed, Signal } from '@angular/core';
import { signalStoreFeature, withComputed, withState } from '@ngrx/signals';

// For mutation methods (create/update/delete via HttpClient). Reads go
// through httpResource instead — see resource-call-state.ts — so this stays
// scoped to the write side of a store, not shared with the read side.
export type CallState = {
  callStateStatus: 'pending' | 'loading' | 'loaded' | { error: string };
};

export const initialCallState: CallState = {
  callStateStatus: 'pending',
};

export type CallStateSignals = {
  loading: Signal<boolean>;
  loaded: Signal<boolean>;
  error: Signal<string | null>;
  status: Signal<'pending' | 'loading' | 'loaded' | 'error'>;
};

export function withCallState() {
  return signalStoreFeature(
    withState<CallState>(initialCallState),
    withComputed(({ callStateStatus }) => ({
      loading: computed(() => callStateStatus() === 'loading'),
      loaded: computed(() => callStateStatus() === 'loaded'),
      error: computed(() => deriveCallStateError(callStateStatus())),
      status: computed(() => deriveCallStateStatus(callStateStatus())),
    })),
  );
}

export function setLoading(): { callStateStatus: 'loading' } {
  return { callStateStatus: 'loading' };
}

export function setLoaded(): { callStateStatus: 'loaded' } {
  return { callStateStatus: 'loaded' };
}

export function setError(error: string): { callStateStatus: { error: string } } {
  return { callStateStatus: { error } };
}

function deriveCallStateError(status: CallState['callStateStatus']): string | null {
  return typeof status === 'object' ? status.error : null;
}

function deriveCallStateStatus(
  status: CallState['callStateStatus'],
): 'pending' | 'loading' | 'loaded' | 'error' {
  return typeof status === 'object' ? 'error' : status;
}

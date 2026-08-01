import { computed, Resource, ResourceStatus } from '@angular/core';
import { CallStateSignals } from './call-state.feature';

// Maps an httpResource's own status/loading/error signals onto the same
// CallStateSignals shape withCallState() produces, so a store's read side
// (httpResource) and write side (withCallState + rxMethod) expose a
// consistent loading/loaded/error/status API to components either way.
export function resourceCallState(resource: Resource<unknown>): CallStateSignals {
  return {
    loading: computed(() => resource.isLoading()),
    loaded: computed(
      () => resource.status() === 'resolved' || resource.status() === 'local',
    ),
    error: computed(() => resource.error()?.message ?? null),
    status: computed(() => deriveResourceStatus(resource.status())),
  };
}

function deriveResourceStatus(
  status: ResourceStatus,
): 'pending' | 'loading' | 'loaded' | 'error' {
  switch (status) {
    case 'error':
      return 'error';
    case 'loading':
    case 'reloading':
      return 'loading';
    case 'resolved':
    case 'local':
      return 'loaded';
    default:
      return 'pending';
  }
}

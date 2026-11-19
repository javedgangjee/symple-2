import { failureKind } from './firebase-auth-source';

describe('failureKind', () => {
  it('M1: the codes for a wrong email or password give the kind "wrong"', () => {
    for (const code of [
      'auth/invalid-credential',
      'auth/wrong-password',
      'auth/user-not-found',
      'auth/invalid-email',
    ]) {
      expect(failureKind({ code }), code).toBe('wrong');
    }
  });

  it('M2: the code for a network failure gives the kind "network"', () => {
    expect(failureKind({ code: 'auth/network-request-failed' })).toBe('network');
  });

  it('M3: the code for too many requests gives the kind "too-many"', () => {
    expect(failureKind({ code: 'auth/too-many-requests' })).toBe('too-many');
  });

  it('M4: the code for a disabled account gives the kind "disabled"', () => {
    expect(failureKind({ code: 'auth/user-disabled' })).toBe('disabled');
  });

  it('M5: any other code, and an error with no code, give the kind "unknown"', () => {
    expect(failureKind({ code: 'auth/internal-error' })).toBe('unknown');
    expect(failureKind(new Error('No code.'))).toBe('unknown');
  });
});

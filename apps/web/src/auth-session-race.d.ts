export interface AuthSessionResolver<T> {
  onEvent(session: T | null): void;
  onInitial(session: T | null): void;
  dispose(): void;
}
export function createAuthSessionResolver<T>(commit: (session: T | null) => void): AuthSessionResolver<T>;

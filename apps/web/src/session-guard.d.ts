export type RequestTicket = Readonly<{ owner: string; sequence: number }>;
export interface SessionRequestGuard {
  setOwner(nextOwner: string | null | undefined): void;
  begin(requestOwner: string | null | undefined): RequestTicket | null;
  isCurrent(ticket: RequestTicket | null | undefined): boolean;
  cancel(): void;
}
export function createSessionRequestGuard(): SessionRequestGuard;

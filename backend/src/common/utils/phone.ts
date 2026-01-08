export function normalizePhoneDigits(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  if (!/^\d{10,15}$/.test(digits)) return null;
  return digits;
}

export function formatContactMergeNote(input: {
  source: 'public' | 'admin';
  normalizedPhone: string;
  submittedName?: string | null;
  submittedEmail?: string | null;
  submittedBranchId?: string | null;
  submittedOwnerArtistId?: string | null;
  submittedNotes?: string | null;
}) {
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const ts = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(
    now.getMinutes(),
  )}`;

  const parts: string[] = [];
  parts.push(`[${ts}] source=${input.source}`);
  parts.push(`phone=${input.normalizedPhone}`);
  if (input.submittedBranchId) parts.push(`branchId=${input.submittedBranchId}`);
  if (input.submittedOwnerArtistId) parts.push(`ownerArtistId=${input.submittedOwnerArtistId}`);
  if (input.submittedName) parts.push(`name=${input.submittedName}`);
  if (input.submittedEmail) parts.push(`email=${input.submittedEmail}`);
  if (input.submittedNotes && input.submittedNotes.trim()) parts.push(`notes=${input.submittedNotes.trim()}`);

  return parts.join(' | ');
}



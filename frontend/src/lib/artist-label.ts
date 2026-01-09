export function formatArtistLabel(input: {
  displayName?: string | null;
  userName?: string | null;
  branchName?: string | null;
}): string {
  const name = (input.displayName || input.userName || "").trim() || "未命名";
  const branch = (input.branchName || "").trim() || "無分店";
  return `${name}（${branch}）`;
}


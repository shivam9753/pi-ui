export function getDisplayName(entity: any): string {
  if (!entity) return 'Unknown';
  return entity.name || entity.username || entity.email || 'Unknown';
}

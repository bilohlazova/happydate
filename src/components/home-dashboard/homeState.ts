export function shouldShowHomeEmptyState(isEmpty: boolean, errorCount: number): boolean {
  return isEmpty && errorCount === 0;
}

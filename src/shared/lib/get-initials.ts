/**
 * Extract initials from a full name or email address.
 *
 * - Name provided: first letter of first word + first letter of last word, uppercase, max 2 chars
 * - Name empty, email provided: first character of email, uppercased
 * - Both empty: "?"
 */
export function getInitials(
  name: string | null | undefined,
  email?: string | null
): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0][0].toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  if (email && email.length > 0) {
    return email[0].toUpperCase();
  }

  return '?';
}

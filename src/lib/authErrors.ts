/**
 * Maps Firebase Auth error codes to user-friendly messages.
 * Falls back to a generic message for unknown errors.
 */
export function getAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  const messages: Record<string, string> = {
    "auth/email-already-in-use":
      "An account with this email already exists. Try logging in instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Invalid email or password. Please try again.",
    "auth/user-not-found": "No account found with this email. Please sign up first.",
    "auth/weak-password": "Password is too weak. Use at least 6 characters.",
    "auth/user-disabled": "This account has been disabled. Contact support.",
    "auth/too-many-requests":
      "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed":
      "Network error. Check your connection and try again.",
    "auth/popup-closed-by-user": "Sign-in popup was closed before completion.",
    "auth/popup-blocked":
      "Sign-in popup was blocked. Allow popups for this site and try again.",
    "auth/account-exists-with-different-credential":
      "An account already exists with this email using a different sign-in method.",
    "auth/operation-not-allowed": "This sign-in method is not enabled. Contact support.",
  };

  if (code && messages[code]) {
    return messages[code];
  }

  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "";

  return message || "Something went wrong. Please try again.";
}

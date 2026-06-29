/** Shared Clerk appearance for auth pages — keeps the card centered with the header. */
export const authClerkAppearance = {
  elements: {
    rootBox: "w-full mx-auto flex justify-center",
    cardBox: "w-full max-w-none",
    card: "w-full shadow-sm",
  },
} as const;

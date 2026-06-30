export function getMarketingUrl(): string {
  return process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://studybuddy.al";
}

export function marketingContactUrl(): string {
  return `${getMarketingUrl()}/contact`;
}

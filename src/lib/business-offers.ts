export function businessOfferTabs(offer: string | null | undefined): string[] {
  if (offer === "Product") return ["Products"];
  if (offer === "Service") return ["Services"];
  if (offer === "Both") return ["Products", "Services"];
  return ["Services"];
}
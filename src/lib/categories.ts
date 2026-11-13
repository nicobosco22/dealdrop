// The only categories DealDrop has, with the names shown on screen.
// (The rules that sort a product into one of these come in the next build step.)

import type { Category } from "@/sources/types";

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "technology", label: "Technology" },
  { id: "house", label: "House Items" },
  { id: "furniture", label: "Furniture" },
  { id: "lego", label: "LEGO" },
];

/** Only Technology has subcategories. */
export const TECH_SUBCATEGORIES: { id: string; label: string }[] = [
  { id: "monitors", label: "Monitors" },
  { id: "gaming-gear", label: "Gaming gear" },
  { id: "consoles", label: "Consoles & handhelds" },
  { id: "pc-parts", label: "PC parts" },
  { id: "computers", label: "Laptops, desktops, tablets" },
  { id: "tv-video", label: "TVs, soundbars, streaming" },
  { id: "audio", label: "Audio" },
  { id: "dj-gear", label: "DJ equipment" },
  { id: "phones-wearables", label: "Phones & wearables" },
  { id: "smart-home", label: "Smart home & Wi-Fi" },
  { id: "appliances", label: "Appliances" },
];

export function isCategory(value: string): value is Category {
  return CATEGORIES.some((c) => c.id === value);
}

export function subcategoryLabel(id: string | null): string {
  return TECH_SUBCATEGORIES.find((s) => s.id === id)?.label ?? "";
}

// Reads key specs out of a product title, for the cards and the spec filters.
// Only what the title clearly says is recorded. Nothing is guessed:
// a missing spec is simply left out.

export type Specs = {
  // Monitors
  sizeInches?: number;
  resolution?: "1080p" | "1440p" | "4K" | "5K" | "8K";
  refreshHz?: number;
  panel?: "OLED" | "IPS" | "VA" | "TN" | "Mini-LED";
  ultrawide?: boolean;
  // Mice, keyboards, headsets, controllers
  connection?: "wired" | "wireless";
  dpi?: number;
  // Graphics cards
  gpuModel?: string;
  vramGb?: number;
};

function monitorSpecs(text: string): Specs {
  const specs: Specs = {};

  // Size: 27", 27-inch, 34 in, 31.5 inches
  const size = /(\d{2}(?:\.\d{1,2})?)\s*(?:"|”|''|-?\s?inch(?:es)?\b|-?\s?in\b|-?\s?class\b)/.exec(text);
  if (size) {
    const inches = Number(size[1]);
    if (inches >= 10 && inches <= 100) specs.sizeInches = inches;
  }

  if (/\b(8k|7680\s?x\s?4320)\b/.test(text)) specs.resolution = "8K";
  else if (/\b(5k|5120\s?x\s?(2880|2160|1440))\b/.test(text)) specs.resolution = "5K";
  else if (/\b(4k|uhd|2160p|3840\s?x\s?2160)\b/.test(text)) specs.resolution = "4K";
  else if (/\b(wqhd|uwqhd|qhd|1440p|2k|2560\s?x\s?1440|3440\s?x\s?1440)\b/.test(text)) specs.resolution = "1440p";
  else if (/\b(fhd|full hd|1080p|1920\s?x\s?1080|2560\s?x\s?1080)\b/.test(text)) specs.resolution = "1080p";

  const hz = /(\d{2,3})\s?hz\b/.exec(text);
  if (hz) {
    const value = Number(hz[1]);
    if (value >= 50 && value <= 1000) specs.refreshHz = value;
  }

  if (/\b(qd-?oled|w-?oled|oled)\b/.test(text)) specs.panel = "OLED";
  else if (/\bmini-?led\b/.test(text)) specs.panel = "Mini-LED";
  else if (/\b(nano ?ips|ips)\b/.test(text)) specs.panel = "IPS";
  else if (/\bva\b/.test(text)) specs.panel = "VA";
  else if (/\btn\b/.test(text)) specs.panel = "TN";

  if (/\b(ultra-?wide|21:9|32:9|3440\s?x\s?1440|5120\s?x\s?1440|2560\s?x\s?1080|uwqhd)\b/.test(text)) {
    specs.ultrawide = true;
  }
  return specs;
}

function connectionSpec(text: string): Specs["connection"] {
  // "Wireless" wins when both appear, because wireless gear usually also works with a cable.
  if (/\b(wireless|bluetooth|2\.4 ?g(hz)?|lightspeed|hyperspeed|slipstream)\b/.test(text)) return "wireless";
  if (/\b(wired|usb(-[ac])? cable|corded)\b/.test(text)) return "wired";
  return undefined;
}

function gearSpecs(text: string): Specs {
  const specs: Specs = {};
  const connection = connectionSpec(text);
  if (connection) specs.connection = connection;

  // DPI: "26,000 DPI", "25600DPI", "26K DPI"
  const dpiK = /(\d{1,2}(?:\.\d)?)\s?k\s?dpi\b/.exec(text);
  const dpi = /(\d{1,2},?\d{3})\s?dpi\b/.exec(text);
  if (dpiK) specs.dpi = Math.round(Number(dpiK[1]) * 1000);
  else if (dpi) specs.dpi = Number(dpi[1].replace(",", ""));
  return specs;
}

function gpuSpecs(text: string): Specs {
  const specs: Specs = {};
  const nvidia = /\b(rtx|gtx)\s?(\d{3,4})(\s?ti)?(\s?super)?\b/.exec(text);
  const amd = /\brx\s?(\d{4})(\s?xtx|\s?xt|\s?gre)?\b/.exec(text);
  const intel = /\barc\s?([ab]\d{3})\b/.exec(text);

  if (nvidia) {
    specs.gpuModel = `${nvidia[1].toUpperCase()} ${nvidia[2]}${nvidia[3] ? " Ti" : ""}${nvidia[4] ? " SUPER" : ""}`;
  } else if (amd) {
    specs.gpuModel = `RX ${amd[1]}${amd[2] ? ` ${amd[2].trim().toUpperCase()}` : ""}`;
  } else if (intel) {
    specs.gpuModel = `Arc ${intel[1].toUpperCase()}`;
  }

  if (specs.gpuModel) {
    const vram = /(\d{1,2})\s?gb\b/.exec(text);
    if (vram) {
      const gb = Number(vram[1]);
      if (gb >= 2 && gb <= 48) specs.vramGb = gb;
    }
  }
  return specs;
}

/** Pull the specs that matter for this subcategory out of the title. Null if there are none. */
export function extractSpecs(subcategory: string | null, title: string): Specs | null {
  const text = title.toLowerCase();
  let specs: Specs = {};
  if (subcategory === "monitors") specs = monitorSpecs(text);
  else if (subcategory === "gaming-gear") specs = gearSpecs(text);
  else if (subcategory === "pc-parts") specs = gpuSpecs(text);
  return Object.keys(specs).length ? specs : null;
}

/** Short labels to show on a card, for example ["27″", "1440p", "165 Hz", "IPS"]. */
export function specLabels(specs: Specs | null | undefined): string[] {
  if (!specs) return [];
  const labels: string[] = [];
  if (specs.sizeInches) labels.push(`${specs.sizeInches}″`);
  if (specs.resolution) labels.push(specs.resolution);
  if (specs.ultrawide) labels.push("Ultrawide");
  if (specs.refreshHz) labels.push(`${specs.refreshHz} Hz`);
  if (specs.panel) labels.push(specs.panel);
  if (specs.gpuModel) labels.push(specs.gpuModel);
  if (specs.vramGb) labels.push(`${specs.vramGb} GB`);
  if (specs.connection) labels.push(specs.connection === "wireless" ? "Wireless" : "Wired");
  if (specs.dpi) labels.push(`${specs.dpi.toLocaleString("en-US")} DPI`);
  return labels;
}

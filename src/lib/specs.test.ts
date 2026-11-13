import { describe, expect, it } from "vitest";
import { extractSpecs, specLabels } from "./specs";

describe("monitor specs", () => {
  it("reads size, resolution, refresh rate and panel", () => {
    expect(extractSpecs("monitors", 'LG UltraGear 27" QHD 165Hz IPS Gaming Monitor')).toEqual({
      sizeInches: 27,
      resolution: "1440p",
      refreshHz: 165,
      panel: "IPS",
    });
  });

  it("reads other ways of writing the same things", () => {
    expect(extractSpecs("monitors", "Dell 31.5-inch 4K UHD 60 Hz VA Monitor")).toEqual({
      sizeInches: 31.5,
      resolution: "4K",
      refreshHz: 60,
      panel: "VA",
    });
    expect(extractSpecs("monitors", "Alienware 34 inch QD-OLED 3440x1440 175Hz Curved Monitor")).toEqual({
      sizeInches: 34,
      resolution: "1440p",
      refreshHz: 175,
      panel: "OLED",
      ultrawide: true,
    });
    expect(extractSpecs("monitors", "Acer 24 in. Full HD 100Hz Monitor")).toMatchObject({
      sizeInches: 24,
      resolution: "1080p",
      refreshHz: 100,
    });
  });

  it("leaves out anything the title does not say", () => {
    expect(extractSpecs("monitors", "Samsung Odyssey G5 Gaming Monitor")).toBeNull();
    expect(extractSpecs("monitors", "ASUS 27-inch Monitor")).toEqual({ sizeInches: 27 });
  });

  it("does not mistake other numbers for a size or refresh rate", () => {
    const specs = extractSpecs("monitors", "BenQ PD2705U 27\" 4K Monitor, 99% sRGB, 65W USB-C");
    expect(specs).toEqual({ sizeInches: 27, resolution: "4K" });
  });
});

describe("gaming gear specs", () => {
  it("reads wireless and DPI for a mouse", () => {
    expect(extractSpecs("gaming-gear", "Razer DeathAdder V3 Pro Wireless Gaming Mouse, 30K DPI")).toEqual({
      connection: "wireless",
      dpi: 30000,
    });
    expect(extractSpecs("gaming-gear", "Logitech G502 HERO Wired Gaming Mouse 25,600 DPI")).toEqual({
      connection: "wired",
      dpi: 25600,
    });
  });

  it("treats brand names for wireless tech as wireless", () => {
    expect(extractSpecs("gaming-gear", "Logitech G Pro X Superlight 2 Lightspeed Mouse")).toEqual({
      connection: "wireless",
    });
  });

  it("says nothing when the title says nothing", () => {
    expect(extractSpecs("gaming-gear", "SteelSeries QcK Mouse Pad")).toBeNull();
  });
});

describe("graphics card specs", () => {
  it("reads the model and memory", () => {
    expect(extractSpecs("pc-parts", "MSI GeForce RTX 5070 Ti 16GB Graphics Card")).toEqual({
      gpuModel: "RTX 5070 Ti",
      vramGb: 16,
    });
    expect(extractSpecs("pc-parts", "ASUS Dual RTX 4070 SUPER OC 12 GB")).toEqual({
      gpuModel: "RTX 4070 SUPER",
      vramGb: 12,
    });
    expect(extractSpecs("pc-parts", "Sapphire Pulse Radeon RX 7800 XT 16GB")).toEqual({
      gpuModel: "RX 7800 XT",
      vramGb: 16,
    });
    expect(extractSpecs("pc-parts", "Intel Arc B580 12GB")).toEqual({ gpuModel: "Arc B580", vramGb: 12 });
  });

  it("does not read drive or RAM sizes as graphics memory", () => {
    expect(extractSpecs("pc-parts", "Samsung 990 Pro 2TB NVMe SSD")).toBeNull();
    expect(extractSpecs("pc-parts", "Corsair Vengeance 32GB DDR5")).toBeNull();
  });
});

describe("other categories", () => {
  it("has no specs", () => {
    expect(extractSpecs("appliances", "Ninja Air Fryer 27 inch 60Hz")).toBeNull();
    expect(extractSpecs(null, "LEGO Star Wars 75375")).toBeNull();
  });
});

describe("specLabels", () => {
  it("makes short labels for a card", () => {
    expect(specLabels({ sizeInches: 27, resolution: "1440p", refreshHz: 165, panel: "IPS" })).toEqual([
      "27″",
      "1440p",
      "165 Hz",
      "IPS",
    ]);
    expect(specLabels({ connection: "wireless", dpi: 30000 })).toEqual(["Wireless", "30,000 DPI"]);
    expect(specLabels(null)).toEqual([]);
  });
});

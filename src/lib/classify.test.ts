import { describe, expect, it } from "vitest";
import { classifyProduct } from "./classify";

/** Short way to write "this title lands here". "skip" means it is not shown at all. */
function place(title: string, brand?: string): string {
  const p = classifyProduct({ title, brand });
  if (!p) return "skip";
  return p.subcategory ? `${p.category} > ${p.subcategory}` : p.category;
}

describe("technology subcategories", () => {
  it.each([
    ['LG UltraGear 27" QHD 165Hz IPS Gaming Monitor', "technology > monitors"],
    ["Samsung Odyssey G9 49-inch OLED Curved Ultrawide Monitor", "technology > monitors"],
    ['15.6" Portable Monitor for Laptop, 1080P USB-C', "technology > monitors"],
    ["Logitech G502 X Lightspeed Wireless Gaming Mouse", "technology > gaming-gear"],
    ["Wireless Mouse for Laptop, 2.4G Slim", "technology > gaming-gear"],
    ["Keychron K2 Wireless Mechanical Keyboard", "technology > gaming-gear"],
    ["SteelSeries QcK Heavy XXL Mouse Pad", "technology > gaming-gear"],
    ["HyperX Cloud III Gaming Headset for PC, PS5", "technology > gaming-gear"],
    ["Xbox Wireless Controller - Carbon Black", "technology > gaming-gear"],
    ["Sony DualSense Wireless Controller for PS5", "technology > gaming-gear"],
    ["Elgato HD60 X Capture Card", "technology > gaming-gear"],
    ["Blue Yeti USB Microphone", "technology > gaming-gear"],
    ["Logitech C920x HD Pro Webcam", "technology > gaming-gear"],
    ["Secretlab Titan Evo Gaming Chair", "technology > gaming-gear"],
    ["PlayStation 5 Slim Console - Disc Edition", "technology > consoles-games"],
    ["Nintendo Switch 2 + Mario Kart World Bundle", "technology > consoles-games"],
    ["ASUS ROG Ally X Handheld Gaming PC", "technology > consoles-games"],
    ["The Legend of Zelda: Tears of the Kingdom - Nintendo Switch", "technology > consoles-games"],
    ["MSI GeForce RTX 5070 Ti 16GB Graphics Card", "technology > pc-parts"],
    ["AMD Ryzen 7 9800X3D 8-Core Processor", "technology > pc-parts"],
    ["Corsair Vengeance 32GB (2x16GB) DDR5 6000MHz", "technology > pc-parts"],
    ["Samsung 990 Pro 2TB NVMe M.2 SSD", "technology > pc-parts"],
    ["ASUS ROG Strix B650E-F Motherboard", "technology > pc-parts"],
    ["Corsair RM850x 850W Power Supply", "technology > pc-parts"],
    ["NZXT H5 Flow Mid-Tower Case", "technology > pc-parts"],
    ["Noctua NH-D15 CPU Cooler", "technology > pc-parts"],
    ['ASUS TUF Gaming Laptop 15.6" RTX 4060, 16GB RAM, 1TB SSD, RGB Keyboard', "technology > computers"],
    ["Dell XPS Desktop PC Intel Core i7, 32GB, RTX 4070", "technology > computers"],
    ["Apple iPad Air 11-inch (M3) Wi-Fi 128GB", "technology > computers"],
    ['Samsung 65" Class OLED S90D 4K Smart TV', "technology > tv-video"],
    ["Sonos Beam Gen 2 Soundbar", "technology > tv-video"],
    ["Roku Streaming Stick 4K", "technology > tv-video"],
    ["Sony WH-1000XM5 Wireless Noise Canceling Headphones", "technology > audio"],
    ["Apple AirPods Pro 2", "technology > audio"],
    ["JBL Flip 6 Portable Bluetooth Speaker", "technology > audio"],
    ["Samsung Galaxy S25 Ultra 256GB Unlocked", "technology > phones-wearables"],
    ["Apple Watch Series 10 GPS 46mm", "technology > phones-wearables"],
    ["Ring Video Doorbell Wired", "technology > smart-home"],
    ["TP-Link Deco BE63 Mesh WiFi 7 System", "technology > smart-home"],
    ["Kasa Smart Plug Mini 4-Pack", "technology > smart-home"],
    ["Wyze Cam v4 Indoor/Outdoor Security Camera", "technology > smart-home"],
  ])("%s -> %s", (title, expected) => {
    expect(place(title)).toBe(expected);
  });
});

describe("appliances go in Tech, not House", () => {
  it.each([
    ["Toshiba 1.2 Cu Ft Countertop Microwave Oven", "technology > appliances"],
    ["Ninja Air Fryer Pro 4-in-1", "technology > appliances"],
    ["LG Front Load Washer 4.5 cu ft", "technology > appliances"],
    ["Samsung Electric Dryer with Steam", "technology > appliances"],
    ["Bosch 300 Series Dishwasher", "technology > appliances"],
    ["KitchenAid Artisan 5-Qt Stand Mixer", "technology > appliances"],
    ["Keurig K-Elite Coffee Maker", "technology > appliances"],
    ["Vitamix 5200 Blender", "technology > appliances"],
    ["iRobot Roomba j7+ Robot Vacuum", "technology > appliances"],
    ["Dyson V15 Detect Cordless Vacuum", "technology > appliances"],
    ["Levoit Core 300 Air Purifier", "technology > appliances"],
    ["Frigidaire 18 cu ft Top Freezer Refrigerator", "technology > appliances"],
  ])("%s -> %s", (title, expected) => {
    expect(place(title)).toBe(expected);
  });

  it("is not fooled by words like microwave-safe", () => {
    expect(place("Pyrex Microwave-Safe Glass Mixing Bowls, Set of 3")).toBe("house");
    expect(place("Dishwasher Safe Nonstick Frying Pan 12-inch")).toBe("house");
    expect(place("Lodge 6 Quart Enameled Dutch Oven")).toBe("house");
  });

  it("skips things that only sound like appliances", () => {
    expect(place("Sun Joe Electric Pressure Washer 2030 PSI")).toBe("skip");
    expect(place("Revlon One-Step Hair Dryer")).toBe("skip");
    expect(place("Air Fryer Parchment Liners 100 count")).toBe("skip");
    expect(place("Replacement HEPA Filter for Levoit Air Purifier")).toBe("skip");
  });
});

describe("furniture and house items", () => {
  it.each([
    ["FlexiSpot Electric Standing Desk 55 x 28", "furniture"],
    ["Herman Miller Aeron Office Chair", "furniture"],
    ["Sectional Sofa Couch with Chaise", "furniture"],
    ["Zinus 12 Inch Green Tea Memory Foam Mattress, Queen", "furniture"],
    ["IKEA-style 6 Drawer Dresser", "furniture"],
    ["5-Tier Bookshelf", "furniture"],
    ["Walker Edison TV Stand for TVs up to 65 inches", "furniture"],
    ["Round Coffee Table with Storage", "furniture"],
    ["Queen Sheet Set 1800 Thread Count", "house"],
    ["Cotton Bath Towels 6-Pack", "house"],
    ["T-fal 12-Piece Nonstick Cookware Set", "house"],
    ["Mattress Topper Queen 3 Inch Gel Memory Foam", "house"],
    ["LED Desk Lamp with USB Port", "house"],
    ["Area Rug 5x7 Modern Abstract", "house"],
    ["O-Cedar Spin Mop and Bucket", "house"],
    ["Plastic Storage Bins with Lids 6-Pack", "house"],
  ])("%s -> %s", (title, expected) => {
    expect(place(title)).toBe(expected);
  });
});

describe("LEGO is the only toy", () => {
  it("accepts real LEGO sets", () => {
    expect(place("LEGO Star Wars Millennium Falcon 75375")).toBe("lego");
    expect(place("LEGO Technic McLaren P1 42172", "LEGO")).toBe("lego");
    expect(place("LEGO Icons Bonsai Tree Building Set 10281")).toBe("lego");
  });

  it("rejects knockoffs and compatible bricks", () => {
    expect(place("Building Blocks Compatible with LEGO, 1000 Pieces")).toBe("skip");
    expect(place("Mould King Technic Car, LEGO-compatible")).toBe("skip");
    expect(place("Space Shuttle Brick Set like LEGO")).toBe("skip");
    expect(place("City Police Station Building Toy - Not LEGO")).toBe("skip");
    expect(place("Classic Baseplates for LEGO 10x10 4-Pack")).toBe("skip");
    expect(place("COBI Tiger Tank 2500 Piece Brick Set")).toBe("skip");
  });

  it("rejects a title that says LEGO when the store says another brand", () => {
    expect(place("LEGO Star Wars X-Wing Display Model", "BriksMax")).toBe("skip");
    expect(place("LEGO City Fire Truck", "Sluban")).toBe("skip");
  });

  it("rejects LEGO add-ons that are not sets", () => {
    expect(place("LED Light Kit for LEGO Eiffel Tower 10307")).toBe("skip");
    expect(place("Acrylic Display Case for LEGO Titanic")).toBe("skip");
    expect(place("LEGO Storage Brick 8 - Red")).toBe("skip");
    expect(place("LEGO Ninjago Kids Backpack")).toBe("skip");
  });

  it("puts LEGO video games with games", () => {
    expect(place("LEGO Star Wars: The Skywalker Saga - PS5")).toBe("technology > consoles-games");
  });

  it("skips every other toy", () => {
    expect(place("Hot Wheels 20-Car Gift Pack")).toBe("skip");
    expect(place("Barbie Dreamhouse")).toBe("skip");
    expect(place("Mega Bloks Big Building Bag 80 Pieces")).toBe("skip");
    expect(place("Monopoly Board Game")).toBe("skip");
  });
});

describe("add-ons and unrelated things are skipped", () => {
  it.each([
    ["iPhone 16 Pro Case with MagSafe"],
    ["Apple iPhone Air MagSafe Battery"],
    ["Moment Pro Camera II iPhone App"],
    ["Dual Monitor Arm Desk Mount"],
    ["Baby Monitor with Camera and Audio"],
    ["Laptop Sleeve 15.6 inch"],
    ["PS5 Controller Charging Station"],
    ['TV Wall Mount for 32-85" TVs'],
    ["Men's Running Shoes"],
    ["DeWalt Plunge Router 2-1/4 HP"],
    ["Dog Bed Large Orthopedic"],
    [""],
  ])("%s -> skip", (title) => {
    expect(place(title)).toBe("skip");
  });
});

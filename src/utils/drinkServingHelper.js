/**
 * drinkServingHelper.js
 * Utility for parsing and formatting drink portion measurements:
 * - Detects whether drinks are served as shots (single, double, multiple shots)
 *   or as a full bottle (or half bottle).
 * - Accurately calculates total shots served and bottle counts.
 */

/**
 * Checks if a string or category indicates a spirit/liquor product
 */
export const isSpiritOrLiquor = (item) => {
  if (!item) return false;
  const name = String(item.product_name || item.name || "").toLowerCase();
  const cat = String(item.category_name || item.category || item.category_type || "").toLowerCase();
  const unit = String(item.unit || "").toLowerCase();
  const notes = String(item.notes || "").toLowerCase();

  if (unit.includes("shot") || (item.is_shot_item === true && Number(item.shots_capacity) > 0)) {
    return true;
  }

  if (notes.includes("shot") || notes.includes("bottle")) {
    return true;
  }

  // Non-spirit checks
  if (cat.includes("beer") || cat.includes("soft") || cat.includes("water") || name.includes("beer") || name.includes("water")) {
    return false;
  }

  const spiritKeywords = [
    "whiskey", "whisky", "vodka", "gin", "rum", "tequila", "brandy", "cognac",
    "liqueur", "spirit", "scotch", "bourbon", "jameson", "chivas", "black label",
    "red label", "blue label", "jack daniel", "hennessy", "jagermeister", "campari"
  ];

  return spiritKeywords.some((k) => name.includes(k) || cat.includes(k));
};

/**
 * Parses serving portion details for any item
 * @param {Object} item - order item with name, notes, unit, quantity, etc.
 */
export const parseItemPortion = (item) => {
  if (!item) {
    return {
      quantity: 1,
      isDrink: false,
      isShot: false,
      isBottle: false,
      isFullBottle: false,
      isHalfBottle: false,
      shotsPerUnit: 0,
      totalShots: 0,
      bottleCount: 0,
      displayServing: "1x",
      portionName: "",
      badgeClass: "text-slate-700 bg-slate-100 border-slate-200",
    };
  }

  const rawQty = Number(item.quantity || item.qty || 1);
  const qty = isNaN(rawQty) || rawQty <= 0 ? 1 : rawQty;
  const name = String(item.product_name || item.name || "").trim();
  const notes = String(item.notes || "").trim();
  const unit = String(item.unit || "").trim().toLowerCase();
  const combinedText = `${name} ${notes}`.toLowerCase();

  const isSpirit = isSpiritOrLiquor(item);
  const shotsCapacity = Number(item.shots_capacity || item.shotsCapacity || 30);

  // 1. FULL BOTTLE CHECK
  const isFullBottleMatch =
    combinedText.includes("full bottle") ||
    combinedText.includes("1 full bottle") ||
    (unit === "bottle" && isSpirit && !combinedText.includes("shot") && !combinedText.includes("half"));

  if (isFullBottleMatch) {
    const totalShots = qty * shotsCapacity;
    const bottleStr = qty === 1 ? "1 Full Bottle" : `${qty} Full Bottles`;
    return {
      quantity: qty,
      isDrink: true,
      isShot: false,
      isBottle: true,
      isFullBottle: true,
      isHalfBottle: false,
      shotsPerUnit: shotsCapacity,
      totalShots,
      bottleCount: qty,
      displayServing: `${bottleStr}${shotsCapacity > 0 ? ` (${totalShots} Shots)` : ""}`,
      portionName: "Full Bottle",
      badgeClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
    };
  }

  // 2. HALF BOTTLE CHECK
  const isHalfBottleMatch =
    combinedText.includes("half bottle") ||
    unit === "half-bottle" ||
    unit === "half_bottle";

  if (isHalfBottleMatch && !combinedText.includes("single shot") && !combinedText.includes("double shot")) {
    const halfShots = Math.max(1, Math.round(shotsCapacity / 2));
    const totalShots = qty * halfShots;
    const bottleStr = qty === 1 ? "1 Half Bottle" : `${qty} Half Bottles`;
    return {
      quantity: qty,
      isDrink: true,
      isShot: false,
      isBottle: true,
      isFullBottle: false,
      isHalfBottle: true,
      shotsPerUnit: halfShots,
      totalShots,
      bottleCount: qty * 0.5,
      displayServing: `${bottleStr} (${totalShots} Shots)`,
      portionName: "Half Bottle",
      badgeClass: "text-amber-700 bg-amber-50 border-amber-200",
    };
  }

  // 3. DOUBLE SHOT CHECK
  if (combinedText.includes("double shot") || combinedText.includes("2 shots") || combinedText.includes("double")) {
    const shotsPerUnit = 2;
    const totalShots = qty * shotsPerUnit;
    return {
      quantity: qty,
      isDrink: true,
      isShot: true,
      isBottle: false,
      isFullBottle: false,
      isHalfBottle: false,
      shotsPerUnit,
      totalShots,
      bottleCount: Number((totalShots / shotsCapacity).toFixed(2)),
      displayServing: qty > 1 ? `${totalShots} Shots (${qty}x Double Shot)` : "2 Shots (Double)",
      portionName: "Double Shot",
      badgeClass: "text-purple-700 bg-purple-50 border-purple-200",
    };
  }

  // 4. SINGLE SHOT CHECK
  if (combinedText.includes("single shot") || combinedText.includes("1 shots") || combinedText.includes("1 shot")) {
    const shotsPerUnit = 1;
    const totalShots = qty * shotsPerUnit;
    return {
      quantity: qty,
      isDrink: true,
      isShot: true,
      isBottle: false,
      isFullBottle: false,
      isHalfBottle: false,
      shotsPerUnit,
      totalShots,
      bottleCount: Number((totalShots / shotsCapacity).toFixed(2)),
      displayServing: qty > 1 ? `${totalShots} Shots (${qty}x Single Shot)` : "1 Shot",
      portionName: "Single Shot",
      badgeClass: "text-blue-700 bg-blue-50 border-blue-200",
    };
  }

  // 5. GENERIC SHOT UNIT OR IS_SHOT_ITEM
  if (unit === "shot" || unit.includes("shot") || item.is_shot_item === true) {
    const shotsPerUnit = 1;
    const totalShots = qty * shotsPerUnit;
    return {
      quantity: qty,
      isDrink: true,
      isShot: true,
      isBottle: false,
      isFullBottle: false,
      isHalfBottle: false,
      shotsPerUnit,
      totalShots,
      bottleCount: Number((totalShots / shotsCapacity).toFixed(2)),
      displayServing: totalShots === 1 ? "1 Shot" : `${totalShots} Shots`,
      portionName: "Shot",
      badgeClass: "text-indigo-700 bg-indigo-50 border-indigo-200",
    };
  }

  // 6. STANDARD BOTTLE (e.g. Beer, Wine, Soft drinks)
  if (unit === "bottle" || combinedText.includes("bottle")) {
    const bottleStr = qty === 1 ? "1 Bottle" : `${qty} Bottles`;
    return {
      quantity: qty,
      isDrink: true,
      isShot: false,
      isBottle: true,
      isFullBottle: false,
      isHalfBottle: false,
      shotsPerUnit: 0,
      totalShots: 0,
      bottleCount: qty,
      displayServing: bottleStr,
      portionName: "Bottle",
      badgeClass: "text-cyan-700 bg-cyan-50 border-cyan-200",
    };
  }

  // 7. DEFAULT FOOD / OTHER UNITS
  const unitStr = unit && unit !== "pcs" ? unit : "";
  const displayServing = unitStr ? `${qty} ${unitStr}` : `${qty}x`;
  return {
    quantity: qty,
    isDrink: false,
    isShot: false,
    isBottle: false,
    isFullBottle: false,
    isHalfBottle: false,
    shotsPerUnit: 0,
    totalShots: 0,
    bottleCount: 0,
    displayServing,
    portionName: unitStr || "Standard",
    badgeClass: "text-slate-700 bg-slate-100 border-slate-200",
  };
};

/**
 * Format a single line item summary string for tables and receipts
 * Example: "1 Full Bottle (30 Shots)" or "2 Shots (Double)" or "3 Bottles"
 */
export const formatServingDetail = (item) => {
  const parsed = parseItemPortion(item);
  return parsed.displayServing;
};

/**
 * Aggregates a list of orders or order items for a specific product
 * To calculate total shots served and total full bottles served.
 */
export const summarizeProductServings = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      totalOrders: 0,
      totalUnitsSold: 0,
      totalShotsServed: 0,
      totalFullBottles: 0,
      totalHalfBottles: 0,
      servingSummary: "0 units",
    };
  }

  let totalQty = 0;
  let totalShots = 0;
  let fullBottles = 0;
  let halfBottles = 0;
  let isShotDrink = false;
  let isBottleDrink = false;

  items.forEach((it) => {
    const parsed = parseItemPortion(it);
    totalQty += parsed.quantity;

    if (parsed.isShot) {
      isShotDrink = true;
      totalShots += parsed.totalShots;
    }
    if (parsed.isFullBottle) {
      isBottleDrink = true;
      fullBottles += parsed.quantity;
      totalShots += parsed.totalShots;
    }
    if (parsed.isHalfBottle) {
      isBottleDrink = true;
      halfBottles += parsed.quantity;
      totalShots += parsed.totalShots;
    }
    if (parsed.isBottle && !parsed.isFullBottle && !parsed.isHalfBottle) {
      isBottleDrink = true;
    }
  });

  let servingSummary = `${totalQty} Units`;

  if (isShotDrink || fullBottles > 0 || halfBottles > 0) {
    const parts = [];
    if (fullBottles > 0) {
      parts.push(`${fullBottles} Full Bottle${fullBottles > 1 ? "s" : ""}`);
    }
    if (halfBottles > 0) {
      parts.push(`${halfBottles} Half Bottle${halfBottles > 1 ? "s" : ""}`);
    }
    const looseShots = totalShots - (fullBottles * 30) - (halfBottles * 15);
    if (looseShots > 0) {
      parts.push(`${looseShots} Shot${looseShots > 1 ? "s" : ""}`);
    }

    if (parts.length > 0) {
      servingSummary = `${parts.join(" + ")} (${totalShots} Total Shots)`;
    } else if (totalShots > 0) {
      servingSummary = `${totalShots} Shot${totalShots > 1 ? "s" : ""}`;
    }
  } else if (isBottleDrink) {
    servingSummary = `${totalQty} Bottle${totalQty > 1 ? "s" : ""}`;
  }

  return {
    totalOrders: items.length,
    totalUnitsSold: totalQty,
    totalShotsServed: totalShots,
    totalFullBottles: fullBottles,
    totalHalfBottles: halfBottles,
    servingSummary,
  };
};

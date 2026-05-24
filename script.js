// TEAM INSPIRE FINAL PRODUCTION ENGINE

const MOQ = {
  A4: 2,
  A5: 4,
  A6: 8
};

const RATES = {

  inner: {

    NS: {

      "70": { A6: 1.25, A5: 2.50, A4: 4.00 },
      "80": { A6: 1.25, A5: 2.50, A4: 4.00 },
      "100": { A6: 1.25, A5: 2.50, A4: 4.00 },
      "120": { A6: 1.95, A5: 3.20, A4: 4.70 }

    },

    Maplitho: {

      "70": { A6: 1.25, A5: 2.50, A4: 4.00 },
      "80": { A6: 1.25, A5: 2.50, A4: 4.00 },
      "100": { A6: 1.25, A5: 2.50, A4: 4.00 },
      "120": { A6: 1.95, A5: 3.20, A4: 4.70 }

    },

    "Art Paper": {

      "130": { A6: 1.125, A5: 2.25, A4: 4.50 },
      "170": { A6: 1.225, A5: 2.45, A4: 4.90 }

    }

  },

  cover: {

    "170": { A6: 5, A5: 9, A4: 18 },
    "250": { A6: 5, A5: 9, A4: 18 },
    "300": { A6: 5, A5: 9, A4: 18 }

  },

  binding: {

    "Centre Stapling": { A6: 3, A5: 5, A4: 7 },
    "Perfect Binding": { A6: 4, A5: 5, A4: 8 },
    "Spiral Binding": { A6: 4, A5: 5, A4: 8 }

  },

  hardBinding: [

    { upto: 100, rate: 140 },
    { upto: 200, rate: 90 },
    { upto: 300, rate: 85 },
    { upto: 1000, rate: 72 }

  ]

};

const state = {

  size: "A4",
  quantity: 4,

  paperType: "NS",
  gsm: "80",

  cover: "250",
  lamination: "Matte",

  binding: "Perfect Binding",

  bwPages: 40,
  colorPages: 12,
  plainPages: 8,

  priorityProduction: false

};

function totalPages() {

  return (
    Number(state.bwPages) +
    Number(state.colorPages) +
    Number(state.plainPages)
  );

}

function getMOQ() {

  return MOQ[state.size];

}

function normalizeQty(value) {

  const step = getMOQ();

  value = Number(value) || step;

  value = Math.max(step, value);

  return Math.ceil(value / step) * step;

}

function calculatePrinting() {

  let bw = 0;
  let color = 0;
  let plain = 0;

  const qty = state.quantity;

  const rate =
    RATES.inner[state.paperType][state.gsm][state.size];

  bw =
    state.bwPages *
    qty *
    rate;

  color =
    state.colorPages *
    qty *
    rate;

  plain =
    state.plainPages *
    qty *
    rate;

  return {
    bw,
    color,
    plain
  };

}

function calculateBinding() {

  const qty = state.quantity;

  if (state.binding === "Hard Binding") {

    for (const tier of RATES.hardBinding) {

      if (qty <= tier.upto) {

        return qty * tier.rate;

      }

    }

  }

  let value =
    qty *
    RATES.binding[state.binding][state.size];

  if (
    state.binding === "Perfect Binding" &&
    qty < 100
  ) {

    const pages = totalPages();

    if (pages <= 500) {

      value = Math.max(value, 500);

    }

    if (
      pages >= 501 &&
      pages <= 1000
    ) {

      value = Math.max(value, 600);

    }

  }

  return value;

}

function calculateCover() {

  let amount =
    state.quantity *
    RATES.cover[state.cover][state.size];

  if (state.lamination === "None") {

    amount -= state.quantity * 0.5;

  }

  return amount;

}

function calculatePriority(base) {

  if (!state.priorityProduction) {
    return 0;
  }

  return base * 0.35;

}

function calculateGrandTotal() {

  const printing =
    calculatePrinting();

  const binding =
    calculateBinding();

  const cover =
    calculateCover();

  const subtotal =
    printing.bw +
    printing.color +
    printing.plain +
    binding +
    cover;

  const priority =
    calculatePriority(subtotal);

  const grand =
    subtotal + priority;

  return {

    bw: printing.bw,
    color: printing.color,
    plain: printing.plain,

    binding,
    cover,
    priority,

    grand,

    perBook:
      grand / state.quantity

  };

}

function currency(value) {

  return "₹" +
    Number(value)
      .toFixed(2);

}

function animateValue(element, finalValue) {

  const duration = 650;

  const start = 0;

  const startTime =
    performance.now();

  function update(now) {

    const progress =
      Math.min(
        (now - startTime) / duration,
        1
      );

    const current =
      start +
      ((finalValue - start) * progress);

    element.innerText =
      currency(current);

    if (progress < 1) {

      requestAnimationFrame(update);

    }

  }

  requestAnimationFrame(update);

}

function updateBreakdown() {

  const result =
    calculateGrandTotal();

  const mapping = {

    bwBreakdown:
      result.bw,

    colorBreakdown:
      result.color,

    plainBreakdown:
      result.plain,

    bindingBreakdown:
      result.binding,

    coverBreakdown:
      result.cover,

    priorityBreakdown:
      result.priority,

    perBookBreakdown:
      result.perBook

  };

  Object.entries(mapping)
    .forEach(([id, value]) => {

      const el =
        document.getElementById(id);

      if (el) {

        el.innerText =
          currency(value);

      }

    });

  const grand =
    document.getElementById("grandTotal");

  if (grand) {

    grand.classList.remove("spin-update");

    void grand.offsetWidth;

    grand.classList.add("spin-update");

    animateValue(
      grand,
      result.grand
    );

  }

}

function updateRestrictions() {

  const pages =
    totalPages();

  document
    .querySelectorAll("[data-gsm='70']")
    .forEach(el => {

      el.style.display =
        pages < 70
          ? "none"
          : "flex";

    });

  document
    .querySelectorAll("[data-cover='170'],[data-cover='300']")
    .forEach(el => {

      el.style.display =
        pages < 70
          ? "none"
          : "flex";

    });

}

function syncQtyInput() {

  const input =
    document.getElementById("qtyInput");

  if (input) {

    input.value =
      state.quantity;

  }

}

function increaseQty() {

  state.quantity +=
    getMOQ();

  syncQtyInput();

  updateBreakdown();

}

function decreaseQty() {

  state.quantity =
    Math.max(
      getMOQ(),
      state.quantity - getMOQ()
    );

  syncQtyInput();

  updateBreakdown();

}

function generateWhatsAppQuote() {

  const result =
    calculateGrandTotal();

  const message = `
*TEAM INSPIRE DIGITAL MEDIA*

Quotation Summary

Book Size : ${state.size}
Quantity : ${state.quantity}

Paper Type : ${state.paperType}
Paper GSM : ${state.gsm}

Binding : ${state.binding}
Lamination : ${state.lamination}

--------------------------------

B/W Printing : ${currency(result.bw)}
Color Printing : ${currency(result.color)}
Plain Sheets : ${currency(result.plain)}

Binding : ${currency(result.binding)}
Cover : ${currency(result.cover)}

Priority Production : ${currency(result.priority)}

--------------------------------

Per Book Rate : ${currency(result.perBook)}

Grand Total : ${currency(result.grand)}

--------------------------------

Terms & Conditions

• MOQ restrictions apply
• Priority production adds 35%
• Final production subject to approval

Phone :
+91 90371 16229

Mail :
teaminspirepod@gmail.com
`;

  window.open(
    "https://wa.me/?text=" +
    encodeURIComponent(message),
    "_blank"
  );

}

document.addEventListener(
  "DOMContentLoaded",
  () => {

    updateBreakdown();

    updateRestrictions();

    const plus =
      document.getElementById("qtyPlus");

    const minus =
      document.getElementById("qtyMinus");

    const input =
      document.getElementById("qtyInput");

    if (plus) {

      plus.addEventListener(
        "click",
        increaseQty
      );

    }

    if (minus) {

      minus.addEventListener(
        "click",
        decreaseQty
      );

    }

    if (input) {

      input.addEventListener(
        "blur",
        e => {

          state.quantity =
            normalizeQty(
              e.target.value
            );

          syncQtyInput();

          updateBreakdown();

        }
      );

    }

    const quoteBtn =
      document.querySelector(".btn");

    if (quoteBtn) {

      quoteBtn.addEventListener(
        "click",
        generateWhatsAppQuote
      );

    }

  }
);

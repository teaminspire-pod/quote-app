const state = {
  size: null,
  quantity: 0,

  printing: {
    bw: 0,
    multi: 0,
    plain: 0
  },

  paperType: null,
  paperThickness: null,
  coverThickness: '250 GSM',
  binding: null,
  expressPrinting: false
};

function getTotalPages() {
  return (
    Number(state.printing.bw) +
    Number(state.printing.multi) +
    Number(state.printing.plain)
  );
}

function validateQuantity() {
  if (!state.size) return false;

  const rules = MOQ_RULES[state.size];

  if (state.quantity < rules.min) {
    return false;
  }

  return state.quantity % rules.step === 0;
}

function getPrintingCost() {
  const size = state.size;
  const gsm = state.paperThickness;

  const bwCost =
    state.printing.bw *
    (PRINT_RATES.bw[gsm]?.[size] || 0);

  const plainCost =
    state.printing.plain *
    (PRINT_RATES.plain[gsm]?.[size] || 0);

  const multiCost =
    state.printing.multi *
    (PRINT_RATES.multi[gsm]?.[size] || 0);

  return bwCost + plainCost + multiCost;
}

function getCoverCost() {
  return COVER_RATES[state.coverThickness]?.[state.size] || 0;
}

function getBindingCost() {
  if (state.binding === 'Hard Binding') {
    for (const tier of HARD_BINDING_TIERS) {
      if (state.quantity <= tier.max) {
        return tier.rate;
      }
    }
  }

  let standardRate =
    BINDING_RATES[state.binding]?.[state.size] || 0;

  if (
    state.binding === 'Perfect Binding' &&
    state.quantity < 100
  ) {
    const totalPages = getTotalPages();

    const minimumCharge =
      totalPages <= 599 ? 500 : 600;

    const standardTotal =
      standardRate * state.quantity;

    if (standardTotal < minimumCharge) {
      return minimumCharge / state.quantity;
    }
  }

  return standardRate;
}

function getManufacturingSubtotal() {
  const printing = getPrintingCost();
  const cover = getCoverCost();
  const binding = getBindingCost();

  return printing + cover + binding;
}

function getExpressCharge() {
  if (!state.expressPrinting) return 0;

  return getManufacturingSubtotal() * 0.35;
}

function calculatePerBookRate() {
  return (
    getManufacturingSubtotal() +
    getExpressCharge()
  );
}

function calculateGrandTotal() {
  return calculatePerBookRate() * state.quantity;
}

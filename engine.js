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
  coverThickness: '250',
  binding: null,

  expressPrinting: false
};

function getTotalPages() {
  return (
    state.printing.bw +
    state.printing.multi +
    state.printing.plain
  );
}

function validateQuantity() {
  if (!state.size) return false;

  const rules = MOQ_RULES[state.size];

  if (state.quantity < rules.min) return false;

  return state.quantity % rules.step === 0;
}

function calculateGrandTotal() {
  return 0;
}

const MOQ_RULES = {
  A4: { min: 4, step: 2 },
  A5: { min: 4, step: 4 },
  A6: { min: 8, step: 8 }
};

const PRINT_RATES = {
  bw: {},
  multi: {},
  plain: {}
};

const BINDING_RATES = {
  centreStapling: {},
  perfectBinding: {},
  spiralBinding: {},
  hardBinding: [
    { max: 100, rate: 140 },
    { max: 200, rate: 90 },
    { max: 300, rate: 85 },
    { max: 1000, rate: 72 }
  ]
};

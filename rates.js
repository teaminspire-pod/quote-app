const MOQ_RULES = { A4: { min: 4, step: 2 },

A5: { min: 4, step: 4 },

A6: { min: 8, step: 8 } };

const BW_PRINT_RATES = {

'70 GSM': { A6: 0.16, A5: 0.32, A4: 0.64 },

'80 GSM': { A6: 0.18, A5: 0.36, A4: 0.72 },

'100 GSM': { A6: 0.19, A5: 0.38, A4: 0.76 },

'120 GSM': { A6: 0.20, A5: 0.40, A4: 0.80 }

};

const PLAIN_SHEET_RATES = {

'70 GSM': { A6: 0.125, A5: 0.25, A4: 0.50 },

'80 GSM': { A6: 0.135, A5: 0.27, A4: 0.54 },

'100 GSM': { A6: 0.14, A5: 0.28, A4: 0.56 },

'120 GSM': { A6: 0.15, A5: 0.30, A4: 0.60 }

};

const MULTI_COLOR_RATES = {

'70 GSM': { A6: 1.10, A5: 1.80, A4: 3.55 },

'80 GSM': { A6: 1.10, A5: 1.80, A4: 3.55 },

'100 GSM': { A6: 1.10, A5: 1.80, A4: 3.55 },

'120 GSM': { A6: 1.11, A5: 1.85, A4: 3.70 },

'130 GSM': { A6: 1.13, A5: 1.875, A4: 3.75 },

'170 GSM': { A6: 1.16, A5: 1.918, A4: 3.835 }

};

const COVER_RATES = {

'170 GSM': { A6: 6, A5: 9, A4: 18 },

'250 GSM': { A6: 6, A5: 9, A4: 18 },

'300 GSM': { A6: 6, A5: 9, A4: 18 }

};

const BINDING_RATES = {

'Centre Stapling': { A6: 3, A5: 5, A4: 7 },

'Perfect Binding': { A6: 4, A5: 5, A4: 8 },

'Spiral Binding': { A6: 7, A5: 10, A4: 12 }

};

const HARD_BINDING_RATES = [

{ maxQuantity: 100, rate: 140 },

{ maxQuantity: 200, rate: 90 },

{ maxQuantity: 300, rate: 85 },

{ maxQuantity: 1000, rate: 72 }

];

const DESIGN_RATES = {

coverDesign: 2500,

publishingLayout: 4500,

customLayout: { A6: 175, A5: 350, A4: 450 },

basicLayout: 35,

dtp: 25,

proofReading: 30

};

const EXPRESS_PRINTING_SURCHARGE = 0.35;

const PERFECT_BINDING_MINIMUM = {

below500Pages: 500,

from501To1000Pages: 600

};

const PAGE_VISIBILITY_RULES = {

minimumPagesFor70GSM: 70,

minimumPagesFor170Cover: 70,

minimumPagesFor300Cover: 70

};

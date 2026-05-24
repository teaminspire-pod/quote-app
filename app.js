const state = { size: 'A4', quantity: 4,

paperType: 'Natural Shade (NS)', paperThickness: '80 GSM', coverThickness: '250 GSM',

binding: 'Perfect Binding',

bwPages: 0, colorPages: 0, plainPages: 0,

expressPrinting: false };

const dom = { quantityInput: document.querySelector('.stepper input'),

totalPages: document.querySelector('.total-pages strong'),

grandTotal: document.querySelector('.total-value'),

breakdownRows: document.querySelectorAll('.break-row strong'),

validation: document.querySelector('.validation'),

expressCheckbox: document.querySelector('.express-toggle input') };

function totalInnerPages() { return ( Number(state.bwPages) + Number(state.colorPages) + Number(state.plainPages) ); }

function getMOQRule() { return MOQ_RULES[state.size]; }

function validateQuantity() {

const rule = getMOQRule();

const valid = state.quantity >= rule.min && state.quantity % rule.step === 0;

if (valid) { dom.validation.innerText = ''; } else { dom.validation.innerText = ${state.size} supports minimum ${rule.min} quantity and multiples of ${rule.step}.; }

return valid; }

function increaseQuantity() {

const step = getMOQRule().step;

state.quantity += step;

dom.quantityInput.value = state.quantity;

updateAll(); }

function decreaseQuantity() {

const rule = getMOQRule();

if (state.quantity - rule.step < rule.min) { return; }

state.quantity -= rule.step;

dom.quantityInput.value = state.quantity;

updateAll(); }

function getBWPrintingCost() {

const rate = BW_PRINT_RATES[state.paperThickness]?.[state.size] || 0;

return ( state.bwPages * rate * state.quantity ); }

function getColorPrintingCost() {

const rate = MULTI_COLOR_RATES[state.paperThickness]?.[state.size] || 0;

return ( state.colorPages * rate * state.quantity ); }

function getPlainSheetCost() {

const rate = PLAIN_SHEET_RATES[state.paperThickness]?.[state.size] || 0;

return ( state.plainPages * rate * state.quantity ); }

function getCoverCost() {

const rate = COVER_RATES[state.coverThickness]?.[state.size] || 0;

return rate * state.quantity; }

function getBindingCost() {

if (state.binding === 'Hard Binding') {

for (const tier of HARD_BINDING_RATES) {

  if (state.quantity <= tier.maxQuantity) {

    return tier.rate * state.quantity;
  }
}

}

const normalRate = BINDING_RATES[state.binding]?.[state.size] || 0;

let totalBinding = normalRate * state.quantity;

if ( state.binding === 'Perfect Binding' && state.quantity < 100 ) {

const pages = totalInnerPages();

const minimumCharge =
  pages <= 500
    ? PERFECT_BINDING_MINIMUM.below500Pages
    : PERFECT_BINDING_MINIMUM.from501To1000Pages;

if (totalBinding < minimumCharge) {
  totalBinding = minimumCharge;
}

}

return totalBinding; }

function getManufacturingTotal() {

return ( getBWPrintingCost() + getColorPrintingCost() + getPlainSheetCost() + getBindingCost() + getCoverCost() ); }

function getExpressCharge() {

if (!state.expressPrinting) { return 0; }

return ( getManufacturingTotal() * EXPRESS_PRINTING_SURCHARGE ); }

function getGrandTotal() {

return ( getManufacturingTotal() + getExpressCharge() ); }

function getPerBookRate() {

if (state.quantity <= 0) { return 0; }

return getGrandTotal() / state.quantity; }

function animateTotal(element, finalValue) {

let start = 0;

const duration = 400;

const increment = finalValue / (duration / 16);

function update() {

start += increment;

if (start >= finalValue) {

  element.innerText =
    `₹${Math.round(finalValue).toLocaleString('en-IN')}`;

  return;
}

element.innerText =
  `₹${Math.round(start).toLocaleString('en-IN')}`;

requestAnimationFrame(update);

}

update(); }

function updateVisibilityRules() {

const pages = totalInnerPages();

const artPaperBtn = [...document.querySelectorAll('.segment-btn')] .find(btn => btn.innerText.includes('Art'));

if (state.colorPages > 0) { artPaperBtn.classList.remove('hidden'); } else { artPaperBtn.classList.add('hidden'); }

const gsm70 = [...document.querySelectorAll('.segment-btn')] .find(btn => btn.innerText.includes('70 GSM'));

const cover170 = [...document.querySelectorAll('.segment-btn')] .find(btn => btn.innerText === '170 GSM');

const cover300 = [...document.querySelectorAll('.segment-btn')] .find(btn => btn.innerText === '300 GSM');

if (pages < 70) {

gsm70?.classList.add('hidden');

cover170?.classList.add('hidden');

cover300?.classList.add('hidden');

} else {

gsm70?.classList.remove('hidden');

cover170?.classList.remove('hidden');

cover300?.classList.remove('hidden');

} }

function updateBreakdown() {

const values = [ getBWPrintingCost(), getColorPrintingCost(), getPlainSheetCost(), getBindingCost(), getCoverCost(), getPerBookRate() ];

dom.breakdownRows.forEach((row, index) => {

row.innerText =
  `₹${values[index].toFixed(2)}`;

}); }

function updateAll() {

validateQuantity();

updateVisibilityRules();

dom.totalPages.innerText = totalInnerPages();

updateBreakdown();

animateTotal( dom.grandTotal, getGrandTotal() ); }

function activateSegment(group, clickedButton) {

document .querySelectorAll(group) .forEach(btn => btn.classList.remove('active'));

clickedButton.classList.add('active'); }

const sizeButtons = document.querySelectorAll('.card:nth-child(2) .segment-btn');

sizeButtons.forEach(btn => {

btn.addEventListener('click', () => {

activateSegment(
  '.card:nth-child(2) .segment-btn',
  btn
);

state.size = btn.innerText;

const rule = getMOQRule();

state.quantity = rule.min;

dom.quantityInput.value = state.quantity;

updateAll();

}); });

const quantityButtons = document.querySelectorAll('.stepper button');

quantityButtons[0].addEventListener('click', decreaseQuantity);

quantityButtons[1].addEventListener('click', increaseQuantity);

const printingInputs = document.querySelectorAll('.input-row input');

printingInputs[0].addEventListener('input', e => {

state.bwPages = Number(e.target.value);

updateAll(); });

printingInputs[1].addEventListener('input', e => {

state.colorPages = Number(e.target.value);

updateAll(); });

printingInputs[2].addEventListener('input', e => {

state.plainPages = Number(e.target.value);

updateAll(); });

const paperButtons = document.querySelectorAll('.card:nth-child(5) .segment-btn');

paperButtons.forEach(btn => {

btn.addEventListener('click', () => {

activateSegment(
  '.card:nth-child(5) .segment-btn',
  btn
);

state.paperType = btn.innerText;

updateAll();

}); });

const gsmButtons = document.querySelectorAll('.card:nth-child(6) .segment-btn');

gsmButtons.forEach(btn => {

btn.addEventListener('click', () => {

activateSegment(
  '.card:nth-child(6) .segment-btn',
  btn
);

state.paperThickness = btn.innerText;

updateAll();

}); });

const coverButtons = document.querySelectorAll('.card:nth-child(7) .segment-btn');

coverButtons.forEach(btn => {

btn.addEventListener('click', () => {

activateSegment(
  '.card:nth-child(7) .segment-btn',
  btn
);

state.coverThickness = btn.innerText;

updateAll();

}); });

const bindingButtons = document.querySelectorAll('.card:nth-child(8) .segment-btn');

bindingButtons.forEach(btn => {

btn.addEventListener('click', () => {

activateSegment(
  '.card:nth-child(8) .segment-btn',
  btn
);

state.binding = btn.innerText;

updateAll();

}); });

dom.expressCheckbox.addEventListener('change', e => {

state.expressPrinting = e.target.checked;

updateAll(); });

function generateQuote() {

const quote = ` Team Inspire Digital Media

Quotation

Book Size : ${state.size} Quantity : ${state.quantity}

Paper Type : ${state.paperType} Paper Thickness : ${state.paperThickness} Cover Thickness : ${state.coverThickness} Binding : ${state.binding}

B/W Printing : ₹${getBWPrintingCost().toFixed(2)} Color Printing : ₹${getColorPrintingCost().toFixed(2)} Plain Sheets : ₹${getPlainSheetCost().toFixed(2)} Binding : ₹${getBindingCost().toFixed(2)} Cover : ₹${getCoverCost().toFixed(2)}

Per Book Rate : ₹${getPerBookRate().toFixed(2)} Grand Total : ₹${getGrandTotal().toFixed(2)}

Express Printing : ${state.expressPrinting ? 'Enabled' : 'Disabled'}

Priority production scheduling with faster turnaround. Additional 35% manufacturing surcharge applies.

Team Inspire Digital Media +91 90371 16229 teaminspirepod@gmail.com `;

window.open( https://wa.me/?text=${encodeURIComponent(quote)}, '_blank' ); }

document .querySelector('.generate-btn') .addEventListener('click', generateQuote);

updateAll();

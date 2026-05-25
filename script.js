// --- MASTER RATE & POLICY DICTIONARY (Updated) ---
const RATES = {
    bw: {
        "70": { "A6": 0.16, "A5": 0.32, "A4": 0.64 },
        "80": { "A6": 0.18, "A5": 0.36, "A4": 0.72 },
        "100": { "A6": 0.19, "A5": 0.38, "A4": 0.76 },
        "120": { "A6": 0.20, "A5": 0.40, "A4": 0.80 }
    },
    plain: {
        "70": { "A6": 0.125, "A5": 0.25, "A4": 0.50 },
        "80": { "A6": 0.135, "A5": 0.27, "A4": 0.54 },
        "100": { "A6": 0.14, "A5": 0.28, "A4": 0.56 },
        "120": { "A6": 0.15, "A5": 0.30, "A4": 0.60 }
    },
    color: {
        standard: {
            "70": { "A6": 1.10, "A5": 1.80, "A4": 3.55 },
            "80": { "A6": 1.10, "A5": 1.80, "A4": 3.55 },
            "100": { "A6": 1.10, "A5": 1.80, "A4": 3.55 },
            "120": { "A6": 1.11, "A5": 1.85, "A4": 3.70 }
        },
        art: {
            "130": { "A6": 1.13, "A5": 1.875, "A4": 3.75 },
            "170": { "A6": 1.16, "A5": 1.918, "A4": 3.835 }
        }
    },
    cover: {
        "170 GSM": { "A6": 6.00, "A5": 9.00, "A4": 18.00 },
        "250 GSM": { "A6": 6.00, "A5": 9.00, "A4": 18.00 },
        "300 GSM": { "A6": 6.00, "A5": 9.00, "A4": 18.00 }
    },
    binding: {
        "Centre Stapling": { "A6": 3.00, "A5": 5.00, "A4": 7.00 },
        "Perfect Binding": { "A6": 4.00, "A5": 5.00, "A4": 8.00 },
        "Spiral Binding": { "A6": 7.00, "A5": 10.00, "A4": 12.00 }
    },
    hardBindingTiers: [
        { max: 100, rate: 140 },
        { max: 200, rate: 90 },
        { max: 300, rate: 85 },
        { max: 1000, rate: 72 }
    ],
    design: {
        cover: 2500,
        publishing: 4500,
        customLayout: { "A6": 175, "A5": 350, "A4": 450 },
        basicLayout: 35,
        dtp: 25,
        proofing: 30
    }
};

let currentTotal = 0;
let exportData = {}; 
const form = document.getElementById('quoteForm');
let debounceTimer;
let isInternalUpdate = false;
let currentUnit = 'CM';

const dimData = {
    'A4': { 'CM': '21.0 × 29.7 CM', 'MM': '210 × 297 MM', 'IN': '8.27 × 11.69 IN' },
    'A5': { 'CM': '14.0 × 21.5 CM', 'MM': '140 × 215 MM', 'IN': '5.50 × 8.50 IN' },
    'A6': { 'CM': '10.5 × 14.8 CM', 'MM': '105 × 148 MM', 'IN': '4.13 × 5.83 IN' }
};

document.addEventListener('DOMContentLoaded', () => {
    triggerSizeHintAnimation();
    loadDraft();
    attachListeners();
    renderPrintInputs();
    handlePaperLogic();
    triggerDebounce();
});

// Precision rounding for floating point errors
function preciseRound(num) {
    return Math.round(num * 100) / 100;
}

// Logic to calculate proper MOQ Multiple
function getValidQty(qty, size) {
    let requiredMultiple = (size === 'A6') ? 8 : (size === 'A5') ? 4 : 2;
    let minimumQty = (size === 'A6') ? 8 : 4;
    if (qty < minimumQty) return minimumQty;
    if (qty % requiredMultiple !== 0) return Math.ceil(qty / requiredMultiple) * requiredMultiple;
    return qty;
}

// Validation logic for exact keyboard UX
function forceValidationOnBlur() {
    const qtyInput = document.getElementById('bookQty');
    let displayQty = parseInt(qtyInput.value) || 0;
    
    const sizeInput = document.querySelector('input[name="masterSize"]:checked');
    if (!sizeInput) return;
    
    let calcQty = getValidQty(displayQty, sizeInput.value);

    if (displayQty !== calcQty) {
        qtyInput.value = calcQty;
        showToast(`Quantity auto-adjusted to strict factory multiple.`);
    }

    triggerSizeHintAnimation(); // Resets hint styling
    triggerDebounce();
    saveDraft();
}

function attachListeners() {
    const qtyInput = document.getElementById('bookQty');
    qtyInput.addEventListener('blur', forceValidationOnBlur);

    form.addEventListener('input', (e) => {
        if(e.target.id === 'bookQty') {
            triggerDebounce();
            return; 
        }
        handlePaperLogic();
        triggerDebounce();
        saveDraft();
    });
    
    form.addEventListener('change', (e) => {
        if(e.target.id === 'bookQty') return; 
        if(e.target.classList.contains('print-type-cb')) {
            renderPrintInputs();
        }
        handlePaperLogic();
        triggerDebounce();
        saveDraft();
    });
    
    document.getElementById('toggleDesign').addEventListener('change', (e) => {
        document.getElementById('designDrawer').classList.toggle('open', e.target.checked);
    });

    document.querySelectorAll('.shareActionBtn').forEach(btn => {
        btn.addEventListener('click', processExport);
    });

    document.querySelectorAll('input[name="masterSize"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            triggerDebounce();
            forceValidationOnBlur(); 
        });
    });
}

function triggerDebounce() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculateEngine, 150);
}

function toggleDimFormat() {
    if(currentUnit === 'CM') currentUnit = 'MM';
    else if(currentUnit === 'MM') currentUnit = 'IN';
    else currentUnit = 'CM';
    
    document.getElementById('dimFormatBtn').innerText = `Unit: ${currentUnit}`;
    triggerSizeHintAnimation();
}

function triggerSizeHintAnimation() {
    const sizeInput = document.querySelector('input[name="masterSize"]:checked');
    if (!sizeInput) return;
    const size = sizeInput.value;
    
    const hintDisplay = document.getElementById('sizeHintDisplay');
    if(hintDisplay) {
        hintDisplay.style.opacity = 0;
        hintDisplay.style.transform = 'translateY(4px)';
        setTimeout(() => {
            hintDisplay.innerText = dimData[size][currentUnit];
            hintDisplay.style.opacity = 1;
            hintDisplay.style.transform = 'translateY(0)';
        }, 200);
    }
    
    const hintQty = document.getElementById('qtyHint');
    if (hintQty) {
        let reqMult = (size === 'A6') ? 8 : (size === 'A5') ? 4 : 2;
        let minQty = (size === 'A6') ? 8 : 4;
        hintQty.innerText = `MOQ: ${minQty} (Must be a multiple of ${reqMult})`;
        hintQty.classList.remove('calculating');
    }
}

// --- VISIBILITY & SAFETY LOCKS ---
function handlePaperLogic() {
    try {
        if (isInternalUpdate) return;
        isInternalUpdate = true;

        const innerPages = getTotalInnerPages();
        const checkedPrintTypes = Array.from(document.querySelectorAll('.print-type-cb:checked')).map(cb => cb.value);
        const isMultiColorSelected = checkedPrintTypes.includes("Multi Color");

        const typeArtInput = document.getElementById('typeArt');
        const artLabel = document.querySelector('label[for="typeArt"]');

        const gsm70 = document.getElementById('gsm70');
        const gsm80 = document.getElementById('gsm80');
        const gsm100 = document.getElementById('gsm100');
        const gsm120 = document.getElementById('gsm120');
        const gsm130 = document.getElementById('gsm130');
        const gsm170 = document.getElementById('gsm170');

        const gsm70Label = document.querySelector('label[for="gsm70"]');
        const gsm80Label = document.querySelector('label[for="gsm80"]');
        const gsm100Label = document.querySelector('label[for="gsm100"]');
        const gsm120Label = document.querySelector('label[for="gsm120"]');
        const gsm130Label = document.querySelector('label[for="gsm130"]');
        const gsm170Label = document.querySelector('label[for="gsm170"]');

        const cover170Label = document.querySelector('label[for="cover170"]');
        const cover170Input = document.getElementById('cover170');
        
        const cover300Label = document.querySelector('label[for="cover300"]');
        const cover300Input = document.getElementById('cover300');

        function show(el) { if (el) el.classList.remove('smooth-hidden'); }
        function hide(el) { if (el) el.classList.add('smooth-hidden'); }

        if (isMultiColorSelected) {
            show(artLabel);
        } else {
            hide(artLabel);
            if (typeArtInput && typeArtInput.checked) {
                document.getElementById('typeNS').checked = true;
            }
        }

        const bwCb = document.querySelector('.print-type-cb[value="Black & White"]');
        const plainCb = document.querySelector('.print-type-cb[value="Plain (without print)"]');
        const multiCb = document.querySelector('.print-type-cb[value="Multi Color"]');
        const bwLabel = bwCb ? bwCb.closest('.checkbox-group') : null;
        const plainLabel = plainCb ? plainCb.closest('.checkbox-group') : null;

        if (typeArtInput && typeArtInput.checked) {
            let changed = false;
            if (multiCb && !multiCb.checked) { multiCb.checked = true; changed = true; }
            if (bwCb) { bwCb.checked = false; bwCb.disabled = true; bwLabel.classList.add('smooth-hidden'); bwLabel.style.display = 'none'; changed = true; }
            if (plainCb) { plainCb.checked = false; plainCb.disabled = true; plainLabel.classList.add('smooth-hidden'); plainLabel.style.display = 'none'; changed = true; }
            if(changed) renderPrintInputs(); 
        } else {
            if (bwCb) { bwCb.disabled = false; bwLabel.classList.remove('smooth-hidden'); bwLabel.style.display = 'flex'; }
            if (plainCb) { plainCb.disabled = false; plainLabel.classList.remove('smooth-hidden'); plainLabel.style.display = 'flex'; }
            if (bwCb && plainCb && multiCb && !bwCb.checked && !plainCb.checked && !multiCb.checked) {
                bwCb.checked = true;
                renderPrintInputs();
            }
        }

        if (typeArtInput && typeArtInput.checked) {
            show(gsm130Label); show(gsm170Label);
            hide(gsm70Label); hide(gsm80Label); hide(gsm100Label); hide(gsm120Label);
            if (gsm70) gsm70.checked = false; 
            if (gsm80) gsm80.checked = false; 
            if (gsm100) gsm100.checked = false; 
            if (gsm120) gsm120.checked = false;
            if (gsm130 && gsm170 && !gsm130.checked && !gsm170.checked) gsm130.checked = true;
        } else {
            hide(gsm130Label); hide(gsm170Label);
            show(gsm80Label); show(gsm100Label); show(gsm120Label);
            if (gsm130) gsm130.checked = false; 
            if (gsm170) gsm170.checked = false;
            
            if (innerPages >= 70) show(gsm70Label);
            if (gsm70 && gsm80 && gsm100 && gsm120 && !gsm70.checked && !gsm80.checked && !gsm100.checked && !gsm120.checked) {
                gsm80.checked = true;
            }
        }

        if (innerPages > 0 && innerPages < 70) {
            hide(gsm70Label);
            if (gsm70 && gsm70.checked && gsm80) gsm80.checked = true;
            if (gsm70) gsm70.checked = false;

            hide(cover170Label);
            hide(cover300Label);
            if ((cover170Input && cover170Input.checked) || (cover300Input && cover300Input.checked)) {
                document.getElementById('cover250').checked = true;
            }
        } else {
            if (!typeArtInput || !typeArtInput.checked) show(gsm70Label);
            show(cover170Label);
            show(cover300Label);
        }

        isInternalUpdate = false;
    } catch(err) {
        console.error("Paper Logic Error:", err);
        isInternalUpdate = false;
    }
}

function renderPrintInputs() {
    const checkedBoxes = Array.from(document.querySelectorAll('.print-type-cb:checked')).map(cb => cb.value);
    const container = document.getElementById('printInputsContainer');
    if (!container) return;
    
    if (checkedBoxes.length > 0) {
        let newHtml = '';
        checkedBoxes.forEach(type => {
            let safeId = "subpg_" + type.replace(/[^a-zA-Z]/g, "");
            let existingVal = document.getElementById(safeId) ? document.getElementById(safeId).value : "";
            
            newHtml += `
                <div class="floating-input" style="width: 100%;">
                    <input type="number" id="${safeId}" class="standard-input sub-print-input" placeholder="0" data-type="${type}" value="${existingVal}" min="0" inputmode="numeric" pattern="[0-9]*">
                    <label>${type} (Pgs)</label>
                </div>
            `;
        });
        container.innerHTML = newHtml;
        
        document.querySelectorAll('.sub-print-input').forEach(inp => {
            inp.addEventListener('input', () => {
                handlePaperLogic();
                triggerDebounce();
                saveDraft();
            });
        });
    } else {
        container.innerHTML = '<span style="color:var(--primary); font-size: 0.85rem; font-weight:700;">Please select at least one print type.</span>';
    }
}

function getTotalInnerPages() {
    let total = 0;
    document.querySelectorAll('.sub-print-input').forEach(inp => {
        total += parseInt(inp.value) || 0;
    });
    return total;
}

const successIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
const errorIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    document.getElementById('toastMsg').innerText = msg;
    document.getElementById('toastIcon').innerHTML = isError ? errorIcon : successIcon;
    toast.style.background = isError ? "var(--primary)" : "var(--text-main)";
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}

function lockState(isLocked, isOffset = false, msg = "") {
    const shareBtns = document.querySelectorAll('.shareActionBtn');
    const deskTotal = document.getElementById('grandTotalDisplayDesk');
    const mobTotal = document.getElementById('grandTotalDisplayMob');
    const gtLabels = [document.getElementById('gtLabelDesk'), document.getElementById('gtLabelMob')];
    
    if (isOffset) {
        document.body.classList.add('offset-mode');
        shareBtns.forEach(b => { b.disabled = true; b.innerText = "Contact Factory"; });
        if (deskTotal) deskTotal.innerText = "FACTORY QUOTE";
        if (mobTotal) mobTotal.innerText = "FACTORY QUOTE";
        gtLabels.forEach(l => { if (l) l.style.color = "var(--offset-color)"; });
        return;
    }

    document.body.classList.remove('offset-mode');
    gtLabels.forEach(l => { if (l) l.style.color = "#A1A1AA"; });

    if (isLocked) {
        shareBtns.forEach(b => { b.disabled = true; b.innerText = "Generate Quote"; });
        if (deskTotal) { deskTotal.innerText = "—"; deskTotal.classList.add('error-state'); }
        if (mobTotal) { mobTotal.innerText = "—"; mobTotal.style.color = "var(--primary)"; }
        const bdScroll = document.getElementById('bdScrollArea');
        if (bdScroll) bdScroll.innerHTML = `<div style="color:var(--primary); font-weight:800; text-align:center; padding: 20px;">${msg}</div>`;
    } else {
        shareBtns.forEach(b => { b.disabled = false; b.innerText = "Generate Quote"; });
        if (deskTotal) deskTotal.classList.remove('error-state');
        if (mobTotal) mobTotal.style.color = "var(--text-main)";
    }
}

function getPageRate(printType, gsm, size, paperType) {
    if (printType === "Black & White") return RATES.bw[gsm]?.[size] || 0;
    if (printType === "Plain (without print)") return RATES.plain[gsm]?.[size] || 0;
    if (printType === "Multi Color") {
        if (paperType === "Art Paper") return RATES.color.art[gsm]?.[size] || 0;
        else return RATES.color.standard[gsm]?.[size] || 0;
    }
    return 0;
}

function calculateEngine() {
    const qtyInput = document.getElementById('bookQty');
    let displayQtyText = qtyInput.value;
    if (displayQtyText.trim() === '') displayQtyText = '0';
    let displayQty = parseInt(displayQtyText) || 0;
    
    const sizeInput = document.querySelector('input[name="masterSize"]:checked');
    if (!sizeInput) return;
    const size = sizeInput.value;

    let calcQty = getValidQty(displayQty, size);
    
    const hintQty = document.getElementById('qtyHint');
    if (displayQty !== calcQty && displayQty > 0) {
        hintQty.innerText = `Calculating for ${calcQty} copies (Batch multiple)`;
        hintQty.classList.add('calculating');
    } else {
        triggerSizeHintAnimation();
    }

    let qty = calcQty;
    let innerPages = getTotalInnerPages();
    
    if (qty === 0) return;
    if (qty > 1000) return lockState(true, true);

    const checkedTypes = Array.from(document.querySelectorAll('.print-type-cb:checked')).map(cb => cb.value);
    if (checkedTypes.length === 0 || innerPages === 0) {
        if (document.getElementById('grandTotalDisplayDesk')) document.getElementById('grandTotalDisplayDesk').innerText = "—";
        if (document.getElementById('grandTotalDisplayMob')) document.getElementById('grandTotalDisplayMob').innerText = "—";
        if (document.getElementById('bdScrollArea')) document.getElementById('bdScrollArea').innerHTML = "";
        return lockState(true, false, "Please enter inner page counts.");
    }

    const paperGsmInput = document.querySelector('input[name="paperGsm"]:checked');
    const paperTypeInput = document.querySelector('input[name="paperType"]:checked');
    const bindingStyleInput = document.querySelector('input[name="bindingStyle"]:checked');
    
    if (!paperGsmInput || !paperTypeInput || !bindingStyleInput) return;

    const paperGsm = paperGsmInput.value;
    const paperType = paperTypeInput.value;
    const bindingStyle = bindingStyleInput.value;
    const emergency = document.getElementById('emergencyCharge')?.checked || false;
    const paperKey = `${paperGsm} GSM ${paperType}`;

    let innerTotalPerBook = 0;
    let printBreakdownDetails = []; 
    let innerLinesHTML = '';
    let delayIter = 1;

    function getCascadeLine(label, val) {
        const line = `<div class="bd-row cascade-row" style="animation-delay: ${delayIter * 0.05}s"><span class="bd-label">${label}</span><span class="bd-value">₹${val.toFixed(2)}</span></div>`;
        delayIter++; return line;
    }

    const subInputs = document.querySelectorAll('.sub-print-input');
    subInputs.forEach(inp => {
        let pgs = parseInt(inp.value) || 0;
        let t = inp.getAttribute('data-type');
        if (pgs > 0) {
            printBreakdownDetails.push(`${pgs} Pgs ${t}`);
            let rate = getPageRate(t, paperGsm, size, paperType);
            let subCost = preciseRound(pgs * rate);
            innerTotalPerBook += subCost;
            innerLinesHTML += getCascadeLine(`Inner: ${t}`, subCost);
        }
    });

    lockState(false);

    const coverGsmInput = document.querySelector('input[name="coverGsm"]:checked');
    let coverCostPerBook = 0;
    if (coverGsmInput) {
        coverCostPerBook = RATES.cover[coverGsmInput.value]?.[size] ?? 0;
    }
    
    const laminationInput = document.querySelector('input[name="lamination"]:checked');
    if (laminationInput && laminationInput.value === "No Lamination") {
        coverCostPerBook = preciseRound(coverCostPerBook - 0.50); 
    }
    
    let bindingCostPerBook = 0;
    if (bindingStyle === 'Hard Binding') {
        for (let tier of RATES.hardBindingTiers) {
            if (qty <= tier.max) { bindingCostPerBook = tier.rate; break; }
        }
    } else if (bindingStyle === 'Perfect Binding' && qty < 100) {
        let standardRate = RATES.binding[bindingStyle]?.[size] ?? 0;
        let totalStandardBindingCost = preciseRound(qty * standardRate);
        
        let minCharge = 0;
        if (innerPages <= 500) minCharge = 500;
        else if (innerPages <= 1000) minCharge = 600;

        if (totalStandardBindingCost < minCharge) {
            bindingCostPerBook = preciseRound(minCharge / qty); 
        } else {
            bindingCostPerBook = standardRate;
        }
    } else {
        bindingCostPerBook = RATES.binding[bindingStyle]?.[size] ?? 0;
    }

    const mfgSubtotal = preciseRound(innerTotalPerBook + coverCostPerBook + bindingCostPerBook);
    const emergencySurcharge = emergency ? preciseRound(mfgSubtotal * 0.35) : 0;
    const perBookFinal = preciseRound(mfgSubtotal + emergencySurcharge);
    const totalManufacturing = preciseRound(perBookFinal * qty);

    let totalDesign = 0;
    let designLinesHTML = '';
    
    function getDesignLine(label, val) {
        const line = `<div class="bd-row bd-indent cascade-row" style="animation-delay: ${delayIter * 0.05}s"><span class="bd-label">${label}</span><span class="bd-value">₹${val.toFixed(2)}</span></div>`;
        delayIter++; return line;
    }

    const toggleDesignCb = document.getElementById('toggleDesign');
    if (toggleDesignCb && toggleDesignCb.checked) {
        if (document.getElementById('pubPackage') && document.getElementById('pubPackage').checked) {
            totalDesign += RATES.design.publishing;
            designLinesHTML += getDesignLine('Publishing Package', RATES.design.publishing);
        }
        if (document.getElementById('coverDesign') && document.getElementById('coverDesign').checked) {
            totalDesign += RATES.design.cover;
            designLinesHTML += getDesignLine('Cover Design', RATES.design.cover);
        }
        let cPgs = parseInt(document.getElementById('designPages').value) || 0;
        if (cPgs > 0) {
            let cost = preciseRound(cPgs * RATES.design.customLayout[size]);
            totalDesign += cost; designLinesHTML += getDesignLine(`Custom Layout (${cPgs})`, cost);
        }
        let lPgs = parseInt(document.getElementById('layoutPages').value) || 0;
        if (lPgs > 0) {
            let cost = preciseRound(lPgs * RATES.design.basicLayout);
            totalDesign += cost; designLinesHTML += getDesignLine(`Basic Layout (${lPgs})`, cost);
        }
        let dPgs = parseInt(document.getElementById('dtpPages').value) || 0;
        if (dPgs > 0) {
            let cost = preciseRound(dPgs * RATES.design.dtp);
            totalDesign += cost; designLinesHTML += getDesignLine(`DTP (${dPgs})`, cost);
        }
        let pPgs = parseInt(document.getElementById('proofingPages').value) || 0;
        if (pPgs > 0) {
            let cost = preciseRound(pPgs * RATES.design.proofing);
            totalDesign += cost; designLinesHTML += getDesignLine(`Proof Reading (${pPgs})`, cost);
        }
    }

    const grandTotal = preciseRound(totalManufacturing + totalDesign);

    let bdHtml = innerLinesHTML;
    bdHtml += getCascadeLine('Cover Stock & Lam', coverCostPerBook);
    bdHtml += getCascadeLine('Binding Style', bindingCostPerBook);
    
    bdHtml += `<div class="bd-subtotal bd-row cascade-row" style="animation-delay: ${delayIter * 0.05}s"><span class="bd-label">Manufacturing Total</span><span class="bd-value">₹${mfgSubtotal.toFixed(2)}</span></div>`;
    delayIter++;
    
    if (emergency) {
        bdHtml += `<div class="bd-row bd-emergency cascade-row" style="animation-delay: ${delayIter * 0.05}s"><span class="bd-label">Priority Production (+35%)</span><span class="bd-value">+₹${emergencySurcharge.toFixed(2)}</span></div>`;
        delayIter++;
    }
    
    bdHtml += `<div class="bd-row cascade-row" style="margin-top:12px; font-weight:800; color:var(--text-main); font-size:1.05rem; animation-delay: ${delayIter * 0.05}s"><span class="bd-label">Final Unit Rate</span><span>₹${perBookFinal.toFixed(2)}</span></div>`;
    delayIter++;
    
    if (totalDesign > 0) {
        bdHtml += `<div class="cascade-row" style="margin: 20px 0; border-top: 1px dashed var(--border); animation-delay: ${delayIter * 0.05}s"></div>`; delayIter++;
        bdHtml += `<div class="bd-row cascade-row" style="animation-delay: ${delayIter * 0.05}s"><span class="bd-label" style="color:var(--text-main);">Pre-Press Fees (Total)</span><span class="bd-value">₹${totalDesign.toLocaleString('en-IN')}</span></div>`; delayIter++;
        bdHtml += designLinesHTML;
    }
    
    const scrollArea = document.getElementById('bdScrollArea');
    if (scrollArea) scrollArea.innerHTML = bdHtml;

    exportData = {
        sizeText: `${size} (${dimData[size]['MM']})`,
        qty: calcQty, innerPages, paperKey, 
        printBreakdownStr: printBreakdownDetails.join(", "),
        bindingStyle,
        coverGsm: coverGsmInput ? coverGsmInput.value : "250 GSM",
        lamination: laminationInput ? laminationInput.value : "Matt",
        emergency, designActive: toggleDesignCb ? toggleDesignCb.checked : false,
        perBookMfgRate: perBookFinal.toFixed(2), 
        totalDesignFees: totalDesign,
        grandTotal: grandTotal
    };

    updateTotalDOM(grandTotal);
}

function updateTotalDOM(newTotal) {
    if (newTotal !== currentTotal) {
        const deskTotal = document.getElementById('grandTotalDisplayDesk');
        const mobTotal = document.getElementById('grandTotalDisplayMob');
        if (deskTotal) animateValue(deskTotal, currentTotal, newTotal, 500);
        if (mobTotal) animateValue(mobTotal, currentTotal, newTotal, 500);
        currentTotal = newTotal;
    }
}

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 4);
        const currentVal = Math.floor(start + (end - start) * easeOut);
        obj.innerText = `₹${currentVal.toLocaleString('en-IN')}`;
        if (progress < 1) window.requestAnimationFrame(step);
        else obj.innerText = `₹${end.toLocaleString('en-IN')}`;
    };
    window.requestAnimationFrame(step);
}

function saveDraft() {
    const data = {};
    new FormData(form).forEach((value, key) => {
        if(data[key]) {
            if(!Array.isArray(data[key])) data[key] = [data[key]];
            data[key].push(value);
        } else data[key] = value;
    });
    
    ['bookQty', 'designPages', 'layoutPages', 'dtpPages', 'proofingPages'].forEach(id => {
        const el = document.getElementById(id);
        if (el) data[id] = el.value;
    });
    
    document.querySelectorAll('.sub-print-input').forEach(inp => data[inp.id] = inp.value);

    ['emergencyCharge', 'toggleDesign', 'coverDesign', 'pubPackage'].forEach(id => {
        const el = document.getElementById(id);
        if (el) data[id] = el.checked;
    });

    data['checkedPrintTypes'] = Array.from(document.querySelectorAll('.print-type-cb:checked')).map(cb => cb.value);
    localStorage.setItem('ti_premium_quote_draft', JSON.stringify(data));
}

function loadDraft() {
    const cache = localStorage.getItem('ti_premium_quote_draft');
    if (!cache) return;
    try {
        const data = JSON.parse(cache);
        if(data['checkedPrintTypes']) {
            document.querySelectorAll('.print-type-cb').forEach(cb => cb.checked = data['checkedPrintTypes'].includes(cb.value));
            renderPrintInputs(); 
        }
        Object.keys(data).forEach(key => {
            let el = document.getElementById(key);
            if (!el && form.elements[key]) el = form.elements[key]; 
            if (el && el.length && !el.options) el.forEach(r => { if(r.value === data[key]) r.checked = true; });
            else if (el) {
                if (el.type === 'checkbox' && key !== 'checkedPrintTypes') el.checked = data[key];
                else if (el.type !== 'checkbox') el.value = data[key];
            }
        });
        const dDrawer = document.getElementById('designDrawer');
        const tDesign = document.getElementById('toggleDesign');
        if (dDrawer && tDesign) dDrawer.classList.toggle('open', tDesign.checked);
    } catch (e) {}
}

function resetApp() {
    form.reset();
    document.querySelectorAll('.print-type-cb').forEach(cb => cb.checked = false);
    const bwBtn = document.querySelector('.print-type-cb[value="Black & White"]');
    if (bwBtn) bwBtn.checked = true;
    
    localStorage.removeItem('ti_premium_quote_draft');
    document.querySelectorAll('.drawer').forEach(d => d.classList.remove('open'));
    renderPrintInputs();
    currentTotal = 0;
    triggerSizeHintAnimation();
    calculateEngine();
    showToast("Draft cleared. Fresh template loaded.");
}

async function processExport() {
    const btns = document.querySelectorAll('.shareActionBtn');
    btns.forEach(b => b.classList.add('is-loading'));
    
    let msg = `*Team Inspire Digital Media*\n*Quotation*\n\n`;
    msg += `*Specifications:*\n`;
    msg += `Book Size: ${exportData.sizeText}\n`;
    msg += `Quantity: ${exportData.qty} Copies\n`;
    msg += `Total Inner Pages: ${exportData.innerPages} Pages\n`;
    msg += `Text Stock: ${exportData.paperKey}\n`;
    msg += `Print Configuration: ${exportData.printBreakdownStr}\n`;
    msg += `Cover Stock: ${exportData.coverGsm}\n`;
    msg += `Lamination: ${exportData.lamination}\n`;
    msg += `Binding: ${exportData.bindingStyle}\n\n`;

    if (exportData.emergency) msg += `*Priority Production (+35%)*\n_(Priority production scheduling with faster turnaround. Additional 35% manufacturing surcharge applies.)_\n\n`;

    msg += `*Unit Production Cost: ₹${exportData.perBookMfgRate}/-*\n\n`;

    if (exportData.designActive) {
        msg += `*Design & Publishing Services:*\n`;
        if (document.getElementById('pubPackage') && document.getElementById('pubPackage').checked) msg += `• Publishing Package Included\n`;
        if (document.getElementById('coverDesign') && document.getElementById('coverDesign').checked) msg += `• Cover Design Generation\n`;
        
        const cPgs = parseInt(document.getElementById('designPages')?.value) || 0;
        const lPgs = parseInt(document.getElementById('layoutPages')?.value) || 0;
        const dPgs = parseInt(document.getElementById('dtpPages')?.value) || 0;
        const pPgs = parseInt(document.getElementById('proofingPages')?.value) || 0;

        if (cPgs > 0) msg += `• Custom Layout (${cPgs} Pgs)\n`;
        if (lPgs > 0) msg += `• Basic Layout (${lPgs} Pgs)\n`;
        if (dPgs > 0) msg += `• DTP (${dPgs} Pgs)\n`;
        if (pPgs > 0) msg += `• Proof Reading (${pPgs} Pgs)\n`;
        
        if (exportData.totalDesignFees > 0) {
            msg += `\n_One-Time Service Fees: ₹${exportData.totalDesignFees.toLocaleString('en-IN')}/-_\n\n`;
        }
    }

    msg += `*Estimated Grand Total: ₹${exportData.grandTotal.toLocaleString('en-IN')}/-*\n\n`;

    msg += `*Terms & Conditions:*\n`;
    msg += `• Standard production turnaround is approximately 3–5 working days.\n`;
    msg += `• 50% payment advance for work confirmation and balance amount before delivery.\n`;
    msg += `• Shipping and delivery charges will be billed separately.\n`;
    msg += `• Priority Production is available with an additional 35% charge.\n`;
    msg += `• Final content verification, including spelling and formatting accuracy, remains the client’s responsibility.\n`;
    msg += `• Delivery timelines may vary depending on courier operations, holidays, and regional logistics conditions.\n`;
    msg += `• Shipping charges are determined based on parcel weight, destination, and selected logistics partner.\n`;
    msg += `• Any manufacturing defects or transit damages must be reported within 5 days of delivery for verification and resolution.\n\n`;
    msg += `Mail: teaminspirepod@gmail.com\nPh: +91 90371 16229`;

    setTimeout(async () => {
        btns.forEach(b => { b.classList.remove('is-loading'); b.classList.add('is-success'); });
        try {
            await navigator.clipboard.writeText(msg);
            showToast("Quote Copied to Clipboard!");
            if (navigator.share) await navigator.share({ title: 'Team Inspire Quote', text: msg });
            else window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        } catch (err) { console.log("Share skipped or failed.", err); }
        setTimeout(() => { btns.forEach(b => { b.classList.remove('is-success'); }); }, 1000);
    }, 600);
}

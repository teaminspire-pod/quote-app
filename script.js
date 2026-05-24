// --- BUSINESS LOGIC CONSTANTS ---
const A5_RATES = { 
    "70 GSM Natural Shade (NS)": { "Single Color": 0.32, "Plain (without print)": 0.25 }, 
    "80 GSM Natural Shade (NS)": { "Single Color": 0.36, "Plain (without print)": 0.27 }, 
    "100 GSM Natural Shade (NS)": { "Single Color": 0.38, "Plain (without print)": 0.28 }, 
    "120 GSM Natural Shade (NS)": { "Single Color": 0.40, "Plain (without print)": 0.30 }, 
    "70 GSM Maplitho(white)": { "Single Color": 0.32, "Plain (without print)": 0.25 }, 
    "80 GSM Maplitho(white)": { "Single Color": 0.36, "Plain (without print)": 0.27 },
    "100 GSM Maplitho(white)": { "Single Color": 0.38, "Plain (without print)": 0.28 },
    "120 GSM Maplitho(white)": { "Single Color": 0.40, "Plain (without print)": 0.30 },
    "130 GSM Art Paper": { "Multi Color": 2.25 },
    "170 GSM Art Paper": { "Multi Color": 2.45 }
};

const PRICING = {
    colorPages: {
        "Standard": { "A6": 1.25, "A5": 2.50, "A4": 4.00 },
        "130 GSM Art Paper": { "A6": 1.125, "A5": 2.25, "A4": 4.50 },
        "170 GSM Art Paper": { "A6": 1.225, "A5": 2.45, "A4": 4.90 }
    },
    cover: {
        "170 GSM": { "A6": 5.00, "A5": 9.00, "A4": 18.00 },
        "250 GSM": { "A6": 5.00, "A5": 9.00, "A4": 18.00 },
        "300 GSM": { "A6": 5.00, "A5": 9.00, "A4": 18.00 }
    },
    binding: {
        "Centre Stapling": { "A6": 3.00, "A5": 5.00, "A4": 7.00 },
        "Perfect Binding": { "A6": 4.00, "A5": 5.00, "A4": 8.00 },
        "Spiral Binding": { "A6": 4.00, "A5": 5.00, "A4": 8.00 }
    },
    hardBindingTiers: [
        { max: 100, rate: 140 },
        { max: 200, rate: 90 },
        { max: 300, rate: 85 },
        { max: 1000, rate: 72 }
    ],
    design: {
        cover: 2500,
        inner: { "A6": 175, "A5": 350, "A4": 450 },
        basicLayout: 35,
        dtp: 25,
        proofing: 30
    },
    publishing: 3500
};

let currentTotal = 0;
let exportData = {}; 
const form = document.getElementById('quoteForm');
let debounceTimer;
let isInternalUpdate = false;

let currentUnit = 'CM';
const dimData = {
    'A4': { 'CM': '21 x 29.7 CM', 'MM': '210 x 297 MM', 'IN': '8.27 x 11.69 IN' },
    'A5': { 'CM': '14 x 21.5 CM', 'MM': '140 x 215 MM', 'IN': '5.5 x 8.5 IN' },
    'A6': { 'CM': '10.5 x 14.8 CM', 'MM': '105 x 148 MM', 'IN': '4.1 x 5.8 IN' }
};

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('input[type="number"]').forEach(inp => {
        inp.addEventListener('input', () => {
            let val = parseInt(inp.value) || 0;
            if (val < 0) val = 0;
            inp.value = Math.floor(val);
        });
    });

    loadDraft();
    attachListeners();
    updateSizeHintDirect();
    renderPrintInputs();
    handlePaperLogic();
    triggerDebounce();
});

function attachListeners() {
    form.addEventListener('input', (e) => {
        if(e.target.classList.contains('print-type-cb')) {
            renderPrintInputs();
        }
        handlePaperLogic();
        triggerDebounce();
        saveDraft();
    });
    
    form.addEventListener('change', (e) => {
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
}

function triggerDebounce() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculateEngine, 180);
}

// --- VISIBILITY & HIDING RULES (Refactored for Safety) ---
function handlePaperLogic() {
    try {
        if (isInternalUpdate) return;
        isInternalUpdate = true;

        const innerPages = parseInt(document.getElementById('innerPages').value) || 0;
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

        function show(el) { if (el) el.classList.remove('smooth-hidden'); }
        function hide(el) { if (el) el.classList.add('smooth-hidden'); }

        // ART PAPER VISIBILITY (Only if Multi Color is selected)
        if (isMultiColorSelected) {
            show(artLabel);
        } else {
            hide(artLabel);
            if (typeArtInput && typeArtInput.checked) {
                document.getElementById('typeNS').checked = true;
            }
        }

        const bwCb = document.querySelector('.print-type-cb[value="Single Color"]');
        const plainCb = document.querySelector('.print-type-cb[value="Plain (without print)"]');
        const multiCb = document.querySelector('.print-type-cb[value="Multi Color"]');

        const bwLabel = bwCb ? bwCb.closest('.checkbox-group') : null;
        const plainLabel = plainCb ? plainCb.closest('.checkbox-group') : null;

        if (typeArtInput && typeArtInput.checked) {
            if (multiCb && !multiCb.checked) multiCb.checked = true;
            if (bwCb) { bwCb.checked = false; bwCb.disabled = true; bwLabel.classList.add('smooth-hidden'); bwLabel.style.display = 'none'; }
            if (plainCb) { plainCb.checked = false; plainCb.disabled = true; plainLabel.classList.add('smooth-hidden'); plainLabel.style.display = 'none'; }
        } else {
            if (bwCb) { bwCb.disabled = false; bwLabel.classList.remove('smooth-hidden'); bwLabel.style.display = 'flex'; }
            if (plainCb) { plainCb.disabled = false; plainLabel.classList.remove('smooth-hidden'); plainLabel.style.display = 'flex'; }
            if (bwCb && plainCb && multiCb && !bwCb.checked && !plainCb.checked && !multiCb.checked) {
                bwCb.checked = true;
            }
        }

        // ART PAPER GSM LOGIC
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
            
            if (innerPages >= 70) {
                show(gsm70Label);
            }
            if (gsm70 && gsm80 && gsm100 && gsm120 && !gsm70.checked && !gsm80.checked && !gsm100.checked && !gsm120.checked) {
                gsm80.checked = true;
            }
        }

        // HIDE 70 GSM & 170 GSM COVER BELOW 70 PAGES
        if (innerPages < 70) {
            hide(gsm70Label);
            if (gsm70 && gsm70.checked) {
                if (gsm80) gsm80.checked = true;
            }
            if (gsm70) gsm70.checked = false;

            hide(cover170Label);
            if (cover170Input && cover170Input.checked) {
                document.getElementById('cover250').checked = true;
            }
        } else {
            if (!typeArtInput || !typeArtInput.checked) show(gsm70Label);
            show(cover170Label);
        }

        isInternalUpdate = false;
        renderPrintInputs();

    } catch(err) {
        console.error("Paper Logic Error:", err);
        isInternalUpdate = false;
    }
}

// --- DIMENSION ANIMATION LOGIC ---
function toggleDimFormat() {
    if (currentUnit === 'CM') currentUnit = 'MM';
    else if (currentUnit === 'MM') currentUnit = 'IN';
    else currentUnit = 'CM';
    document.getElementById('dimFormatBtn').innerText = `Unit: ${currentUnit}`;
    triggerSizeHintAnimation();
}

function updateSizeHintDirect() {
    const sizeInput = document.querySelector('input[name="masterSize"]:checked');
    if (sizeInput) {
        document.getElementById('sizeHintDisplay').innerText = dimData[sizeInput.value][currentUnit];
    }
}

function triggerSizeHintAnimation() {
    const hintEl = document.getElementById('sizeHintDisplay');
    const sizeInput = document.querySelector('input[name="masterSize"]:checked');
    if (!hintEl || !sizeInput) return;
    
    const newText = dimData[sizeInput.value][currentUnit];

    hintEl.style.opacity = '0';
    hintEl.style.transform = 'translateY(5px)';
    
    setTimeout(() => {
        hintEl.innerText = newText;
        hintEl.style.opacity = '1';
        hintEl.style.transform = 'translateY(0)';
    }, 300);
}

// --- DYNAMIC PRINT TYPE UI ---
function renderPrintInputs() {
    const checkedBoxes = Array.from(document.querySelectorAll('.print-type-cb:checked')).map(cb => cb.value);
    const drawer = document.getElementById('printBreakdownDrawer');
    const container = document.getElementById('printInputsContainer');
    if (!drawer || !container) return;
    
    if (checkedBoxes.length > 1) {
        container.innerHTML = '';
        checkedBoxes.forEach(type => {
            let safeId = "subpg_" + type.replace(/[^a-zA-Z]/g, "");
            container.innerHTML += `
                <div>
                    <span class="standard-label">${type} (Pgs)</span>
                    <input type="number" id="${safeId}" class="standard-input sub-print-input" placeholder="0" data-type="${type}">
                </div>
            `;
        });
        drawer.classList.add('open');
    } else {
        drawer.classList.remove('open');
    }
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

function calculateEngine() {
    const qtyInput = document.getElementById('bookQty');
    let qty = parseInt(qtyInput.value) || 0;
    let innerPages = parseInt(document.getElementById('innerPages').value) || 0;
    
    if (qty < 4) {
        qtyInput.classList.add('input-error');
        return lockState(true, false, "Minimum Order Quantity is 4.");
    } else if (qty > 1000) {
        qtyInput.classList.remove('input-error');
        return lockState(true, true);
    }
    qtyInput.classList.remove('input-error');

    const checkedTypes = Array.from(document.querySelectorAll('.print-type-cb:checked')).map(cb => cb.value);
    if (checkedTypes.length === 0) {
        if (document.getElementById('grandTotalDisplayDesk')) document.getElementById('grandTotalDisplayDesk').innerText = "—";
        if (document.getElementById('grandTotalDisplayMob')) document.getElementById('grandTotalDisplayMob').innerText = "—";
        if (document.getElementById('bdScrollArea')) document.getElementById('bdScrollArea').innerHTML = "";
        return;
    }

    const sizeInput = document.querySelector('input[name="masterSize"]:checked');
    const paperGsmInput = document.querySelector('input[name="paperGsm"]:checked');
    const paperTypeInput = document.querySelector('input[name="paperType"]:checked');
    const bindingStyleInput = document.querySelector('input[name="bindingStyle"]:checked');
    
    if (!sizeInput || !paperGsmInput || !paperTypeInput || !bindingStyleInput) return;

    const size = sizeInput.value;
    const paperGsm = paperGsmInput.value;
    const paperType = paperTypeInput.value;
    const bindingStyle = bindingStyleInput.value;
    
    const emergencyCb = document.getElementById('emergencyCharge');
    const emergency = emergencyCb ? emergencyCb.checked : false;
    
    const paperKey = `${paperGsm} GSM ${paperType}`;
    const sizeMult = (size === 'A4') ? 2 : (size === 'A6') ? 0.5 : 1;

    let innerTotalPerBook = 0;
    let printBreakdownDetails = []; 
    const bdBox = document.getElementById('printBreakdownBox');
    const errMsg = document.getElementById('printErrorMsg');

    if (checkedTypes.length === 1) {
        if (bdBox) bdBox.classList.remove('print-validation-error');
        if (errMsg) errMsg.classList.remove('visible');
        let t = checkedTypes[0];
        printBreakdownDetails.push(`${innerPages} Pgs ${t}`);
        
        if (t === "Single Color") {
            if (!A5_RATES[paperKey] || !A5_RATES[paperKey]["Single Color"]) return lockState(true, false, "Invalid Single Color combination.");
            innerTotalPerBook = innerPages * A5_RATES[paperKey]["Single Color"] * sizeMult;
        } else if (t === "Plain (without print)") {
            if (!A5_RATES[paperKey] || !A5_RATES[paperKey]["Plain (without print)"]) return lockState(true, false, "Invalid Plain paper combination.");
            innerTotalPerBook = innerPages * A5_RATES[paperKey]["Plain (without print)"] * sizeMult;
        } else if (t === "Multi Color") {
            let colorRateObj = PRICING.colorPages[paperKey] || PRICING.colorPages["Standard"];
            innerTotalPerBook = innerPages * colorRateObj[size];
        }
    } else {
        let subCost = 0;
        const subInputs = document.querySelectorAll('.sub-print-input');
        
        if (subInputs.length === 2) {
            const first = subInputs[0];
            const second = subInputs[1];
            if (!first.dataset.bound) {
                first.dataset.bound = "true";
                second.dataset.bound = "true";
                first.addEventListener('input', () => {
                    let val = parseInt(first.value) || 0;
                    if (val > innerPages) val = innerPages;
                    first.value = val;
                    second.value = innerPages - val;
                });
                second.addEventListener('input', () => {
                    let val = parseInt(second.value) || 0;
                    if (val > innerPages) val = innerPages;
                    second.value = val;
                    first.value = innerPages - val;
                });
            }
            if ((!first.value || first.value === "0") && (!second.value || second.value === "0")) {
                first.value = innerPages;
                second.value = 0;
            }
        }

        let sumSubPages = 0;
        subInputs.forEach(inp => {
            let pgs = parseInt(inp.value) || 0;
            let t = inp.getAttribute('data-type');
            sumSubPages += pgs;
            if (pgs > 0) printBreakdownDetails.push(`${pgs} Pgs ${t}`);

            if (t === "Single Color") subCost += pgs * (A5_RATES[paperKey]?.["Single Color"] || 0) * sizeMult;
            else if (t === "Plain (without print)") subCost += pgs * (A5_RATES[paperKey]?.["Plain (without print)"] || 0) * sizeMult;
            else if (t === "Multi Color") {
                let cObj = PRICING.colorPages[paperKey] || PRICING.colorPages["Standard"];
                subCost += pgs * cObj[size];
            }
        });

        if (sumSubPages !== innerPages) {
            if (document.activeElement && document.activeElement.classList.contains('sub-print-input')) return;
            if (bdBox) bdBox.classList.add('print-validation-error');
            if (errMsg) {
                errMsg.classList.add('visible');
                errMsg.innerText = `Page split (${sumSubPages}) must equal Total Pages (${innerPages})`;
            }
            return lockState(true, false, `Print Page mismatch (${sumSubPages}/${innerPages})`);
        } else {
            if (bdBox) bdBox.classList.remove('print-validation-error');
            if (errMsg) errMsg.classList.remove('visible');
            innerTotalPerBook = subCost;
        }
    }

    lockState(false);

    // --- COVER & LAMINATION LOGIC ---
    const coverGsmInput = document.querySelector('input[name="coverGsm"]:checked');
    let coverCostPerBook = 0;
    if (coverGsmInput) {
        coverCostPerBook = PRICING.cover[coverGsmInput.value]?.[size] ?? 0;
    }
    
    const laminationInput = document.querySelector('input[name="lamination"]:checked');
    if (laminationInput && laminationInput.value === "No Lamination") {
        coverCostPerBook -= 0.50; // -₹0.50 discount
    }
    
    // --- BINDING MINIMUM CHARGE LOGIC ---
    let bindingCostPerBook = 0;
    if (bindingStyle === 'Hardbinding') {
        for (let tier of PRICING.hardBindingTiers) {
            if (qty <= tier.max) { bindingCostPerBook = tier.rate; break; }
        }
    } else if (bindingStyle === 'Perfect Binding' && qty < 100) {
        let standardRate = PRICING.binding[bindingStyle]?.[size] ?? 0;
        let totalStandardBindingCost = qty * standardRate;
        
        let minCharge = 0;
        if (innerPages <= 599) minCharge = 500;
        else if (innerPages <= 1000) minCharge = 600;

        if (totalStandardBindingCost < minCharge) {
            bindingCostPerBook = minCharge / qty; 
        } else {
            bindingCostPerBook = standardRate;
        }
    } else {
        bindingCostPerBook = PRICING.binding[bindingStyle]?.[size] ?? 0;
    }

    const mfgSubtotal = innerTotalPerBook + coverCostPerBook + bindingCostPerBook;
    const emergencySurcharge = emergency ? (mfgSubtotal * 0.35) : 0;
    const perBookFinal = mfgSubtotal + emergencySurcharge;
    const totalManufacturing = perBookFinal * qty;

    let totalDesign = 0;
    let designLinesHTML = '';
    let delayIter = 1;
    function getCascadeLine(label, val) {
        const line = `<div class="bd-row bd-indent cascade-row" style="animation-delay: ${delayIter * 0.05}s"><span class="bd-label">${label}</span><span class="bd-value">₹${val}</span></div>`;
        delayIter++; return line;
    }

    const toggleDesignCb = document.getElementById('toggleDesign');
    if (toggleDesignCb && toggleDesignCb.checked) {
        if (document.getElementById('pubPackage') && document.getElementById('pubPackage').checked) {
            totalDesign += PRICING.publishing;
            designLinesHTML += getCascadeLine('Publishing Package', PRICING.publishing);
        }
        if (document.getElementById('coverDesign') && document.getElementById('coverDesign').checked) {
            totalDesign += PRICING.design.cover;
            designLinesHTML += getCascadeLine('Cover Design', PRICING.design.cover);
        }
        let cPgs = parseInt(document.getElementById('designPages').value) || 0;
        if (cPgs > 0) {
            let cost = cPgs * PRICING.design.inner[size];
            totalDesign += cost; designLinesHTML += getCascadeLine(`Custom Layout (${cPgs})`, cost);
        }
        let lPgs = parseInt(document.getElementById('layoutPages').value) || 0;
        if (lPgs > 0) {
            let cost = lPgs * PRICING.design.basicLayout;
            totalDesign += cost; designLinesHTML += getCascadeLine(`Basic Layout (${lPgs})`, cost);
        }
        let dPgs = parseInt(document.getElementById('dtpPages').value) || 0;
        if (dPgs > 0) {
            let cost = dPgs * PRICING.design.dtp;
            totalDesign += cost; designLinesHTML += getCascadeLine(`DTP (${dPgs})`, cost);
        }
        let pPgs = parseInt(document.getElementById('proofingPages').value) || 0;
        if (pPgs > 0) {
            let cost = pPgs * PRICING.design.proofing;
            totalDesign += cost; designLinesHTML += getCascadeLine(`Proof Reading (${pPgs})`, cost);
        }
    }

    const grandTotal = totalManufacturing + totalDesign;

    let bdHtml = `
        <div class="bd-row cascade-row" style="animation-delay: 0.05s"><span class="bd-label">Inner Printing</span><span class="bd-value">Included</span></div>
        <div class="bd-subtotal bd-row cascade-row" style="animation-delay: 0.1s"><span class="bd-label">Manufacturing Total</span><span class="bd-value">Included in Unit Rate</span></div>
    `;
    if (emergency) bdHtml += `<div class="bd-row bd-emergency cascade-row" style="animation-delay: 0.15s"><span class="bd-label">Emergency Priority Service (+35%)</span><span class="bd-value">+₹${emergencySurcharge.toFixed(2)}</span></div>`;
    
    bdHtml += `<div class="bd-row cascade-row" style="margin-top:12px; font-weight:800; color:var(--text-main); font-size:1.05rem; animation-delay: 0.2s"><span class="bd-label">Final Unit Rate</span><span>₹${perBookFinal.toFixed(2)}</span></div>`;
    bdHtml += `<div class="cascade-row" style="margin: 20px 0; border-top: 1px dashed var(--border); animation-delay: 0.25s"></div>`;
    bdHtml += `<div class="bd-row cascade-row" style="animation-delay: 0.3s"><span class="bd-label" style="color:var(--text-main);">Pre-Press Fees (Total)</span><span class="bd-value">₹${totalDesign.toLocaleString('en-IN')}</span></div>`;
    
    bdHtml += designLinesHTML;
    
    const scrollArea = document.getElementById('bdScrollArea');
    if (scrollArea) scrollArea.innerHTML = bdHtml;

    exportData = {
        sizeText: `${size} (${dimData[size][currentUnit]})`,
        qty, innerPages, paperKey, 
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
    
    ['bookQty', 'innerPages', 'designPages', 'layoutPages', 'dtpPages', 'proofingPages'].forEach(id => {
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
    const singleColorBtn = document.querySelector('.print-type-cb[value="Single Color"]');
    if (singleColorBtn) singleColorBtn.checked = true;
    
    localStorage.removeItem('ti_premium_quote_draft');
    document.querySelectorAll('.drawer').forEach(d => d.classList.remove('open'));
    renderPrintInputs();
    currentTotal = 0;
    updateSizeHintDirect();
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
    msg += `Cover Stock: ${exportData.coverGsm} Art Paper\n`;
    msg += `Lamination: ${exportData.lamination}\n`;
    msg += `Binding: ${exportData.bindingStyle}\n\n`;

    if (exportData.emergency) msg += `*Emergency Priority Service (+35%)*\n_(Fast-track production with guaranteed print readiness within 24 hours from order confirmation, followed by same-day dispatch. If we are unable to complete the order within the committed priority timeline, the additional emergency priority charges will be fully refundable.)_\n\n`;

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
    msg += `• Emergency Priority Service is available with an additional 35% charge.\n`;
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

// --- MASTER RATE & POLICY DICTIONARY ---
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
        "70": { "A6": 1.25, "A5": 2.50, "A4": 4.00 },
        "80": { "A6": 1.25, "A5": 2.50, "A4": 4.00 },
        "100": { "A6": 1.25, "A5": 2.50, "A4": 4.00 },
        "120": { "A6": 1.95, "A5": 3.20, "A4": 4.70 },
        "130": { "A6": 1.125, "A5": 2.25, "A4": 4.50 },
        "170": { "A6": 1.225, "A5": 2.45, "A4": 4.90 }
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
        publishing: 3500,
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

const dimData = {
    'A4': { 'CM': '21.0 × 29.7', 'MM': '210 × 297', 'IN': '8.27 × 11.69' },
    'A5': { 'CM': '14.0 × 21.5', 'MM': '140 × 215', 'IN': '5.50 × 8.50' },
    'A6': { 'CM': '10.5 × 14.8', 'MM': '105 × 148', 'IN': '4.13 × 5.83' }
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

    document.querySelectorAll('input[name="masterSize"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const size = e.target.value;
            const qtyInput = document.getElementById('bookQty');
            qtyInput.min = (size === 'A6') ? '8' : '4';
            qtyInput.step = (size === 'A6') ? '8' : (size === 'A5') ? '4' : '2';
            triggerDebounce();
        });
    });
}

function triggerDebounce() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculateEngine, 180);
}

// Dimension Window specific animation
function triggerSizeHintAnimation() {
    const sizeInput = document.querySelector('input[name="masterSize"]:checked');
    if (!sizeInput) return;
    const size = sizeInput.value;
    
    const win = document.getElementById('dimWindow');
    if(win) {
        win.classList.add('dim-updating');
        setTimeout(() => {
            document.getElementById('dimMM').innerText = dimData[size]['MM'];
            document.getElementById('dimCM').innerText = dimData[size]['CM'];
            document.getElementById('dimIN').innerText = dimData[size]['IN'];
            win.classList.remove('dim-updating');
        }, 200);
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

        // ART PAPER VISIBILITY
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

        // ART PAPER MULTI-COLOR LOCK
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

        // GSM LOGIC
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

        // HIDE 70 GSM INNER & 170/300 GSM COVER BELOW 70 PAGES
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
                <div>
                    <span class="standard-label">${type} (Pgs)</span>
                    <input type="number" id="${safeId}" class="standard-input sub-print-input" placeholder="0" data-type="${type}" value="${existingVal}" min="0">
                </div>
            `;
        });
        container.innerHTML = newHtml;
        
        // Re-bind listeners for newly injected additive inputs
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

function getPageRate(printType, gsm, size) {
    if (printType === "Single Color") return RATES.bw[gsm]?.[size] || 0;
    if (printType === "Plain (without print)") return RATES.plain[gsm]?.[size] || 0;
    if (printType === "Multi Color") return RATES.color[gsm]?.[size] || 0;
    return 0;
}

function calculateEngine() {
    const qtyInput = document.getElementById('bookQty');
    let qty = parseInt(qtyInput.value) || 0;
    let innerPages = getTotalInnerPages();
    
    if (qty === 0) return;

    const sizeInput = document.querySelector('input[name="masterSize"]:checked');
    if (!sizeInput) return;
    const size = sizeInput.value;

    // --- MOQ & AUTO-ROUNDING LOGIC ---
    let originalQty = qty;
    let requiredMultiple = (size === 'A6') ? 8 : (size === 'A5') ? 4 : 2;
    let minimumQty = (size === 'A6') ? 8 : 4;

    if (qty < minimumQty) {
        qty = minimumQty;
    } else if (qty % requiredMultiple !== 0) {
        qty = Math.ceil(qty / requiredMultiple) * requiredMultiple;
    }

    if (originalQty !== qty) {
        qtyInput.value = qty;
        showToast(`Quantity auto-adjusted to ${size} batch multiple (${requiredMultiple}).`);
    }

    if (qty > 1000) {
        qtyInput.classList.remove('input-error');
        return lockState(true, true);
    }
    qtyInput.classList.remove('input-error');

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
    
    const emergencyCb = document.getElementById('emergencyCharge');
    const emergency = emergencyCb ? emergencyCb.checked : false;
    
    const paperKey = `${paperGsm} GSM ${paperType}`;

    let innerTotalPerBook = 0;
    let printBreakdownDetails = []; 

    const subInputs = document.querySelectorAll('.sub-print-input');
    subInputs.forEach(inp => {
        let pgs = parseInt(inp.value) || 0;
        let t = inp.getAttribute('data-type');
        if (pgs > 0) printBreakdownDetails.push(`${pgs} Pgs ${t}`);

        let rate = getPageRate(t, paperGsm, size);
        innerTotalPerBook += pgs * rate;
    });

    lockState(false);

    // --- COVER & LAMINATION LOGIC ---
    const coverGsmInput = document.querySelector('input[name="coverGsm"]:checked');
    let coverCostPerBook = 0;
    if (coverGsmInput) {
        coverCostPerBook = RATES.cover[coverGsmInput.value]?.[size] ?? 0;
    }
    
    const laminationInput = document.querySelector('input[name="lamination"]:checked');
    if (laminationInput && laminationInput.value === "No Lamination") {
        coverCostPerBook -= 0.50; // Discount
    }
    
    // --- BINDING LOGIC ---
    let bindingCostPerBook = 0;
    if (bindingStyle === 'Hardbinding') {
        for (let tier of RATES.hardBindingTiers) {
            if (qty <= tier.max) { bindingCostPerBook = tier.rate; break; }
        }
    } else if (bindingStyle === 'Perfect Binding' && qty < 100) {
        let standardRate = RATES.binding[bindingStyle]?.[size] ?? 0;
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
        bindingCostPerBook = RATES.binding[bindingStyle]?.[size] ?? 0;
    }

    const mfgSubtotal = innerTotalPerBook + coverCostPerBook + bindingCostPerBook;
    const emergencySurcharge = emergency ? (mfgSubtotal * 0.35) : 0;
    const perBookFinal = mfgSubtotal + emergencySurcharge;
    const totalManufacturing = perBookFinal * qty;

    // --- DESIGN & PUBLISHING FEES ---
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
            totalDesign += RATES.design.publishing;
            designLinesHTML += getCascadeLine('Publishing Package', RATES.design.publishing);
        }
        if (document.getElementById('coverDesign') && document.getElementById('coverDesign').checked) {
            totalDesign += RATES.design.cover;
            designLinesHTML += getCascadeLine('Cover Design', RATES.design.cover);
        }
        let cPgs = parseInt(document.getElementById('designPages').value) || 0;
        if (cPgs > 0) {
            let cost = cPgs * RATES.design.customLayout[size];
            totalDesign += cost; designLinesHTML += getCascadeLine(`Custom Layout (${cPgs})`, cost);
        }
        let lPgs = parseInt(document.getElementById('layoutPages').value) || 0;
        if (lPgs > 0) {
            let cost = lPgs * RATES.design.basicLayout;
            totalDesign += cost; designLinesHTML += getCascadeLine(`Basic Layout (${lPgs})`, cost);
        }
        let dPgs = parseInt(document.getElementById('dtpPages').value) || 0;
        if (dPgs > 0) {
            let cost = dPgs * RATES.design.dtp;
            totalDesign += cost; designLinesHTML += getCascadeLine(`DTP (${dPgs})`, cost);
        }
        let pPgs = parseInt(document.getElementById('proofingPages').value) || 0;
        if (pPgs > 0) {
            let cost = pPgs * RATES.design.proofing;
            totalDesign += cost; designLinesHTML += getCascadeLine(`Proof Reading (${pPgs})`, cost);
        }
    }

    const grandTotal = totalManufacturing + totalDesign;

    // --- RENDER INTERNAL BREAKDOWN ---
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

    // --- PREPARE EXPORT DATA ---
    exportData = {
        sizeText: `${size} (${dimData[size]['MM']} MM)`,
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

// --- DRAFT CACHING ---
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
    const singleColorBtn = document.querySelector('.print-type-cb[value="Single Color"]');
    if (singleColorBtn) singleColorBtn.checked = true;
    
    localStorage.removeItem('ti_premium_quote_draft');
    document.querySelectorAll('.drawer').forEach(d => d.classList.remove('open'));
    renderPrintInputs();
    currentTotal = 0;
    triggerSizeHintAnimation();
    calculateEngine();
    showToast("Draft cleared. Fresh template loaded.");
}

// --- EXPORT TO WHATSAPP ---
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

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
        handlePaperLogic();
        triggerDebounce();
        saveDraft();
    });
    
    form.addEventListener('change', (e) => {
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

        function show(el) { if (el) el.classList.remove('smooth-hidden'); }
        function hide(el) { if (el) el.classList.add('smooth-hidden'); }

        // ART PAPER VISIBILITY
        if (isMultiColorSelected) {
            show(artLabel);
        } else {
            hide(artLabel);
            if (typeArtInput && typeArtInput.checked) {
                document.getElementById('typeNS').checked = true;
                triggerDebounce();
            }
        }

        // ART PAPER PRINT TYPE LOCK
        const bwCb = document.querySelector('.print-type-cb[value="Single Color"]');
        const plainCb = document.querySelector('.print-type-cb[value="Plain (without print)"]');
        const multiCb = document.querySelector('.print-type-cb[value="Multi Color"]');

        const bwLabel = bwCb.closest('.checkbox-group');
        const plainLabel = plainCb.closest('.checkbox-group');

        if (typeArtInput && typeArtInput.checked) {
            if (!multiCb.checked) multiCb.checked = true;
            bwCb.checked = false;
            plainCb.checked = false;
            bwCb.disabled = true;
            plainCb.disabled = true;
            bwLabel.classList.add('smooth-hidden');
            bwLabel.style.display = 'none';
            plainLabel.classList.add('smooth-hidden');
            plainLabel.style.display = 'none';
        } else {
            bwCb.disabled = false;
            plainCb.disabled = false;
            bwLabel.classList.remove('smooth-hidden');
            bwLabel.style.display = 'flex';
            plainLabel.classList.remove('smooth-hidden');
            plainLabel.style.display = 'flex';
            if (!bwCb.checked && !plainCb.checked && !multiCb.checked) {
                bwCb.checked = true;
            }
        }

        // ART PAPER GSM LOGIC
        if (typeArtInput && typeArtInput.checked) {
            show(gsm130Label);
            show(gsm170Label);
            hide(gsm70Label);
            hide(gsm80Label);
            hide(gsm100Label);
            hide(gsm120Label);
            gsm70.checked = false;
            gsm80.checked = false;
            gsm100.checked = false;
            gsm120.checked = false;
            if (!gsm130.checked && !gsm170.checked) gsm130.checked = true;
        } else {
            hide(gsm130Label);
            hide(gsm170Label);
            show(gsm80Label);
            show(gsm100Label);
            show(gsm120Label);
            gsm130.checked = false;
            gsm170.checked = false;
            if (innerPages >= 70) show(gsm70Label);
            if (!gsm70.checked && !gsm80.checked && !gsm100.checked && !gsm120.checked) {
                gsm80.checked = true;
                requestAnimationFrame(() => triggerDebounce());
            }
            triggerDebounce();
        }

        // HIDE 70 GSM BELOW 70 PAGES
        if (innerPages < 70) {
            hide(gsm70Label);
            if (gsm70.checked) {
                gsm80.checked = true;
                requestAnimationFrame(() => triggerDebounce());
            }
            gsm70.checked = false;
            hide(cover170Label);
            if (document.getElementById('cover170').checked) {
                document.getElementById('cover250').checked = true;
            }
        } else {
            if (!typeArtInput || !typeArtInput.checked) show(gsm70Label);
            show(cover170Label);
        }

        isInternalUpdate = false;
        renderPrintInputs();

    } catch(err) {
        console.error(err);
        isInternalUpdate = false;
    }
}

function toggleDimFormat() {
    if (currentUnit === 'CM') currentUnit = 'MM';
    else if (currentUnit === 'MM') currentUnit = 'IN';
    else currentUnit = 'CM';
    document.getElementById('dimFormatBtn').innerText = `Unit: ${currentUnit}`;
    triggerSizeHintAnimation();
}

function updateSizeHintDirect() {
    const size = document.querySelector('input[name="masterSize"]:checked').value;
    document.getElementById('sizeHintDisplay').innerText = dimData[size][currentUnit];
}

function triggerSizeHintAnimation() {
    const hintEl = document.getElementById('sizeHintDisplay');
    const size = document.querySelector('input[name="masterSize"]:checked').value;
    const newText = dimData[size][currentUnit];

    hintEl.style.opacity = '0';
    hintEl.style.transform = 'translateY(5px)';
    
    setTimeout(() => {
        hintEl.innerText = newText;
        hintEl.style.opacity = '1';
        hintEl.style.transform = 'translateY(0)';
    }, 300);
}

function renderPrintInputs() {
    const checkedBoxes = Array.from(document.querySelectorAll('.print-type-cb:checked')).map(cb => cb.value);
    const drawer = document.getElementById('printBreakdownDrawer');
    const container = document.getElementById('printInputsContainer');
    
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
        shareBtns.forEach(b => { b.disabled = true; b.querySelector('.btn-text').innerText = "Contact Factory"; });
        deskTotal.innerText = "FACTORY QUOTE";
        mobTotal.innerText = "FACTORY QUOTE";
        gtLabels.forEach(l => l.style.color = "var(--offset-color)");
        return;
    }

    document.body.classList.remove('offset-mode');
    gtLabels.forEach(l => l.style.color = "#A1A1AA");

    if (isLocked) {
        shareBtns.forEach(b => { b.disabled = true; b.querySelector('.btn-text').innerText = "Generate Quote"; });
        deskTotal.innerText = "—";
        mobTotal.innerText = "—";
        deskTotal.classList.add('error-state');
        mobTotal.style.color = "var(--primary)";
        document.getElementById('bdScrollArea').innerHTML = `<div style="color:var(--primary); font-weight:800; text-align:center; padding: 20px;">${msg}</div>`;
    } else {
        shareBtns.forEach(b => { b.disabled = false; b.querySelector('.btn-text').innerText = "Generate Quote"; });
        deskTotal.classList.remove('error-state');
        mobTotal.style.color = "var(--text-main)";
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
    if (checkedTypes.length === 0 || innerPages === 0) {
        return lockState(true, false, "Please fill required fields.");
    }

    const size = document.querySelector('input[name="masterSize"]:checked').value;
    const paperGsm = document.querySelector('input[name="paperGsm"]:checked').value;
    const paperType = document.querySelector('input[name="paperType"]:checked').value;
    const bindingStyle = document.querySelector('input[name="bindingStyle"]:checked').value;
    const emergency = document.getElementById('emergencyCharge').checked;
    const paperKey = `${paperGsm} GSM ${paperType}`;
    const sizeMult = (size === 'A4') ? 2 : (size === 'A6') ? 0.5 : 1;

    let innerTotalPerBook = 0;
    let printBreakdownDetails = []; 
    const bdBox = document.getElementById('printBreakdownBox');
    const errMsg = document.getElementById('printErrorMsg');

    if (checkedTypes.length === 1) {
        bdBox.classList.remove('print-validation-error');
        errMsg.classList.remove('visible');
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
            bdBox.classList.add('print-validation-error');
            errMsg.classList.add('visible');
            errMsg.innerText = `Page split (${sumSubPages}) must equal Total Pages (${innerPages})`;
            return lockState(true, false, `Print Page mismatch (${sumSubPages}/${innerPages})`);
        } else {
            bdBox.classList.remove('print-validation-error');
            errMsg.classList.remove('visible');
            innerTotalPerBook = subCost;
        }
    }

    lockState(false);

    const selectedCoverGsm = document.querySelector('input[name="coverGsm"]:checked').value;
    let coverCostPerBook = PRICING.cover[selectedCoverGsm]?.[size] ?? 0;
    
    let bindingCostPerBook = 0;
    if (bindingStyle === 'Hardbinding') {
        for (let tier of PRICING.hardBindingTiers) {
            if (qty <= tier.max) { bindingCostPerBook = tier.rate; break; }
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

    if (document.getElementById('toggleDesign').checked) {
        if (document.getElementById('pubPackage').checked) {
            totalDesign += PRICING.publishing;
            designLinesHTML += getCascadeLine('Publishing Package', PRICING.publishing);
        }
        if (document.getElementById('coverDesign').checked) {
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

    // THERMAL PRINT CASCADE BUILDER
    let d = 1;
    let bdHtml = `
        <div class="bd-row cascade-row" style="animation-delay: 0.05s"><span class="bd-label">Inner Printing</span><span class="bd-value">Included</span></div>
        <div class="bd-subtotal bd-row cascade-row" style="animation-delay: 0.1s"><span class="bd-label">Manufacturing Total</span><span class="bd-value">Included in Unit Rate</span></div>
    `;
    if (emergency) bdHtml += `<div class="bd-row bd-emergency cascade-row" style="animation-delay: 0.15s"><span class="bd-label">Emergency Priority Service (+35%)</span><span class="bd-value">+₹${emergencySurcharge.toFixed(2)}</span></div>`;
    
    bdHtml += `<div class="bd-row cascade-row" style="margin-top:12px; font-weight:800; color:var(--text-main); font-size:1.05rem; animation-delay: 0.2s"><span class="bd-label">Final Unit Rate</span><span>₹${perBookFinal.toFixed(2)}</span></div>`;
    bdHtml += `<div class="cascade-row" style="margin: 20px 0; border-top: 1px dashed var(--border); animation-delay: 0.25s"></div>`;
    bdHtml += `<div class="bd-row cascade-row" style="animation-delay: 0.3s"><span class="bd-label" style="color:var(--text-main);">Pre-Press Fees (Total)</span><span class="bd-value">₹${totalDesign.toLocaleString('en-IN')}</span></div>`;
    
    bdHtml += designLinesHTML;
    document.getElementById('bdScrollArea').innerHTML = bdHtml;

    exportData = {
        sizeText: `${size} (${dimData[size][currentUnit]})`,
        qty, innerPages, paperKey, 
        printBreakdownStr: printBreakdownDetails.join(", "),
        bindingStyle,
        coverGsm: document.querySelector('input[name="coverGsm"]:checked').value,
        lamination: document.querySelector('input[name="lamination"]:checked').value,
        emergency, designActive: document.getElementById('toggleDesign').checked,
        perBookMfgRate: perBookFinal.toFixed(2), 
        totalDesignFees: totalDesign,
        grandTotal: grandTotal
    };

    updateTotalDOM(grandTotal);
}

function updateTotalDOM(newTotal) {
    if (newTotal !== currentTotal) {
        animateValue(document.getElementById('grandTotalDisplayDesk'), currentTotal, newTotal, 500);
        animateValue(document.getElementById('grandTotalDisplayMob'), currentTotal, newTotal, 500);
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
        data[id] = document.getElementById(id).value;
    });
    
    document.querySelectorAll('.sub-print-input').forEach(inp => data[inp.id] = inp.value);

    ['emergencyCharge', 'toggleDesign', 'coverDesign', 'pubPackage'].forEach(id => {
        data[id] = document.getElementById(id).checked;
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
        document.getElementById('designDrawer').classList.toggle('open', document.getElementById('toggleDesign').checked);
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
        if (document.getElementById('pubPackage').checked) msg += `• Publishing Package Included\n`;
        if (document.getElementById('coverDesign').checked) msg += `• Cover Design Generation\n`;
        
        const cPgs = parseInt(document.getElementById('designPages').value) || 0;
        const lPgs = parseInt(document.getElementById('layoutPages').value) || 0;
        const dPgs = parseInt(document.getElementById('dtpPages').value) || 0;
        const pPgs = parseInt(document.getElementById('proofingPages').value) || 0;

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

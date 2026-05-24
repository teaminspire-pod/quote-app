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
        "170": { "A6": 5.00, "A5": 9.00, "A4": 18.00 },
        "250": { "A6": 5.00, "A5": 9.00, "A4": 18.00 },
        "300": { "A6": 5.00, "A5": 9.00, "A4": 18.00 }
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

let exportData = {};
let isInternalUpdate = false;

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('quoteForm');
    
    // Bind change events to calculation engine
    form.addEventListener('change', (e) => {
        if (e.target.classList.contains('print-type-cb')) {
            renderDynamicInputs();
        }
        if (e.target.id === 'toggleDesign') {
            document.getElementById('designDrawer').classList.toggle('open', e.target.checked);
        }
        runEngineCycle();
    });

    form.addEventListener('input', (e) => {
        if (e.target.type === 'number') runEngineCycle();
    });

    document.getElementById('exportBtn').addEventListener('click', processExport);

    renderDynamicInputs();
    runEngineCycle();
});

function renderDynamicInputs() {
    const checkedBoxes = Array.from(document.querySelectorAll('.print-type-cb:checked')).map(cb => cb.value);
    const container = document.getElementById('dynamicPageInputs');
    
    let newHtml = '';
    checkedBoxes.forEach(type => {
        let safeId = "dyn_" + type.replace(/[^a-zA-Z]/g, "");
        let existingVal = document.getElementById(safeId) ? document.getElementById(safeId).value : "";
        if (checkedBoxes.length === 1 && existingVal === "") existingVal = "100";
        
        newHtml += `
            <div class="dynamic-row">
                <label>${type} Pages:</label>
                <input type="number" id="${safeId}" class="sub-print-input num-input" value="${existingVal}" data-type="${type}" min="0">
            </div>
        `;
    });
    
    if (newHtml === '') newHtml = '<div style="color:var(--primary); font-weight:bold;">⚠️ Select at least one print type.</div>';
    container.innerHTML = newHtml;
}

function getTotalInnerPages() {
    let total = 0;
    document.querySelectorAll('.sub-print-input').forEach(inp => {
        total += parseInt(inp.value) || 0;
    });
    return total;
}

function handlePaperLogic() {
    if (isInternalUpdate) return;
    isInternalUpdate = true;

    const innerPages = getTotalInnerPages();
    const checkedPrintTypes = Array.from(document.querySelectorAll('.print-type-cb:checked')).map(cb => cb.value);
    const isMultiColorSelected = checkedPrintTypes.includes("Multi Color");
    
    const typeArtInput = document.getElementById('typeArt');
    const labelTypeArt = document.getElementById('labelTypeArt');
    
    // UI Elements
    const labelGsm70 = document.getElementById('labelGsm70');
    const labelGsm80 = document.getElementById('labelGsm80');
    const labelGsm100 = document.getElementById('labelGsm100');
    const labelGsm120 = document.getElementById('labelGsm120');
    const labelGsm130 = document.getElementById('labelGsm130');
    const labelGsm170 = document.getElementById('labelGsm170');
    const labelCover170 = document.getElementById('labelCover170');

    // 1. Art Paper Visibility
    if (isMultiColorSelected) {
        labelTypeArt.classList.remove('smooth-hidden');
    } else {
        labelTypeArt.classList.add('smooth-hidden');
        if (typeArtInput.checked) document.getElementById('typeNS').checked = true;
    }

    const bwCb = document.getElementById('ptBW');
    const plainCb = document.getElementById('ptPlain');

    // 2. Art Paper Constraints
    if (typeArtInput && typeArtInput.checked) {
        if (bwCb) { bwCb.checked = false; bwCb.disabled = true; document.querySelector('label[for="ptBW"]').classList.add('smooth-hidden'); }
        if (plainCb) { plainCb.checked = false; plainCb.disabled = true; document.querySelector('label[for="ptPlain"]').classList.add('smooth-hidden'); }
        
        labelGsm130.classList.remove('smooth-hidden');
        labelGsm170.classList.remove('smooth-hidden');
        labelGsm70.classList.add('smooth-hidden');
        labelGsm80.classList.add('smooth-hidden');
        labelGsm100.classList.add('smooth-hidden');
        labelGsm120.classList.add('smooth-hidden');
        
        if (!document.getElementById('gsm130').checked && !document.getElementById('gsm170').checked) {
            document.getElementById('gsm130').checked = true;
        }
    } else {
        if (bwCb) { bwCb.disabled = false; document.querySelector('label[for="ptBW"]').classList.remove('smooth-hidden'); }
        if (plainCb) { plainCb.disabled = false; document.querySelector('label[for="ptPlain"]').classList.remove('smooth-hidden'); }
        
        labelGsm130.classList.add('smooth-hidden');
        labelGsm170.classList.add('smooth-hidden');
        labelGsm80.classList.remove('smooth-hidden');
        labelGsm100.classList.remove('smooth-hidden');
        labelGsm120.classList.remove('smooth-hidden');
    }

    // 3. Page Count Constraints (Hide 70gsm & 170gsm cover if pages < 70)
    if (innerPages > 0 && innerPages < 70) {
        labelGsm70.classList.add('smooth-hidden');
        if (document.getElementById('gsm70').checked) document.getElementById('gsm80').checked = true;
        labelCover170.classList.add('smooth-hidden');
        if (document.getElementById('cover170').checked) document.getElementById('cover250').checked = true;
    } else {
        if (!typeArtInput.checked) labelGsm70.classList.remove('smooth-hidden');
        labelCover170.classList.remove('smooth-hidden');
    }

    isInternalUpdate = false;
}

function getPageRate(printType, gsm, size) {
    if (printType === "Black & White") return RATES.bw[gsm]?.[size] || 0;
    if (printType === "Plain (without print)") return RATES.plain[gsm]?.[size] || 0;
    if (printType === "Multi Color") return RATES.color[gsm]?.[size] || 0;
    return 0;
}

function triggerComputationAnimation() {
    const totalDisp = document.getElementById('grandTotalDisplayDesk');
    totalDisp.classList.remove('calculating');
    void totalDisp.offsetWidth; // Force DOM reflow
    totalDisp.classList.add('calculating');
}

function runEngineCycle() {
    handlePaperLogic();
    
    let qty = parseInt(document.getElementById('bookQty').value) || 0;
    let innerPages = getTotalInnerPages();
    
    if (qty < 4 || qty > 1000) {
        document.getElementById('grandTotalDisplayDesk').innerText = qty > 1000 ? "FACTORY QUOTE" : "—";
        document.getElementById('bdScrollArea').innerHTML = '';
        triggerComputationAnimation();
        return;
    }

    const size = document.querySelector('input[name="masterSize"]:checked').value;
    const paperGsm = document.querySelector('input[name="paperGsm"]:checked').value;
    const bindingStyle = document.querySelector('input[name="bindingStyle"]:checked').value;
    const emergency = document.getElementById('emergencyCharge').checked;

    let innerTotalPerBook = 0;
    let breakdownHtmlBlocks = [];

    // Additive Interior Calculation
    document.querySelectorAll('.sub-print-input').forEach(inp => {
        let pgs = parseInt(inp.value) || 0;
        let t = inp.getAttribute('data-type');
        let rate = getPageRate(t, paperGsm, size);
        let blockCost = pgs * rate;
        innerTotalPerBook += blockCost;
        if (pgs > 0) {
            breakdownHtmlBlocks.push(`<div class="bd-row"><span>└ ${pgs}x ${t}</span><span>₹${blockCost.toFixed(2)}</span></div>`);
        }
    });

    // Cover Calculation
    const coverGsm = document.querySelector('input[name="coverGsm"]:checked').value;
    let coverCostPerBook = RATES.cover[coverGsm]?.[size] || 0;
    const lamination = document.querySelector('input[name="lamination"]:checked').value;
    if (lamination === "No Lamination") coverCostPerBook -= 0.50;
    
    // Binding Calculation
    let bindingCostPerBook = 0;
    if (bindingStyle === 'Hardbinding') {
        for (let tier of RATES.hardBindingTiers) {
            if (qty <= tier.max) { bindingCostPerBook = tier.rate; break; }
        }
    } else if (bindingStyle === 'Perfect Binding' && qty < 100) {
        let stdRate = RATES.binding[bindingStyle][size];
        let totalStd = qty * stdRate;
        let minCharge = innerPages <= 599 ? 500 : 600;
        bindingCostPerBook = totalStd < minCharge ? (minCharge / qty) : stdRate;
    } else {
        bindingCostPerBook = RATES.binding[bindingStyle][size];
    }

    // Subtotals
    const mfgSubtotal = innerTotalPerBook + coverCostPerBook + bindingCostPerBook;
    const emergencySurcharge = emergency ? (mfgSubtotal * 0.35) : 0;
    const perBookFinal = mfgSubtotal + emergencySurcharge;
    const totalManufacturing = perBookFinal * qty;

    // Design Services
    let totalDesign = 0;
    if (document.getElementById('toggleDesign').checked) {
        if (document.getElementById('pubPackage').checked) totalDesign += RATES.design.publishing;
        if (document.getElementById('coverDesign').checked) totalDesign += RATES.design.cover;
        totalDesign += (parseInt(document.getElementById('designPages').value) || 0) * RATES.design.customLayout[size];
        totalDesign += (parseInt(document.getElementById('layoutPages').value) || 0) * RATES.design.basicLayout;
        totalDesign += (parseInt(document.getElementById('dtpPages').value) || 0) * RATES.design.dtp;
        totalDesign += (parseInt(document.getElementById('proofingPages').value) || 0) * RATES.design.proofing;
    }

    const grandTotal = totalManufacturing + totalDesign;
    
    // Display updates
    document.getElementById('grandTotalDisplayDesk').innerText = `₹${Math.floor(grandTotal).toLocaleString('en-IN')}`;
    triggerComputationAnimation();

    document.getElementById('bdScrollArea').innerHTML = `
        <div class="breakdown-header">Unit Cost Breakdown</div>
        <div class="bd-row highlight"><span>Interior Print Subtotal</span><span>₹${innerTotalPerBook.toFixed(2)}</span></div>
        ${breakdownHtmlBlocks.join('')}
        <div class="bd-row"><span>Cover & Lamination</span><span>₹${coverCostPerBook.toFixed(2)}</span></div>
        <div class="bd-row"><span>${bindingStyle}</span><span>₹${bindingCostPerBook.toFixed(2)}</span></div>
        ${emergency ? `<div class="bd-row" style="color: #ff6b6b;"><span>Emergency Surcharge</span><span>+₹${(mfgSubtotal * 0.35).toFixed(2)}</span></div>` : ''}
        <div class="bd-row highlight" style="margin-top:10px; border-top:1px solid rgba(255,255,255,0.2); padding-top:10px;">
            <span>Final Unit Rate</span><span>₹${perBookFinal.toFixed(2)}</span>
        </div>
        <div class="bd-row"><span>Manufacturing (${qty} qty)</span><span>₹${totalManufacturing.toFixed(2)}</span></div>
        <div class="bd-row"><span>Pre-Press Services</span><span>₹${totalDesign.toLocaleString('en-IN')}</span></div>
    `;

    exportData = {
        totalManufacturing,
        totalDesign,
        emergency,
        emergencySurcharge: emergencySurcharge * qty,
        grandTotal,
        qty
    };
}

async function processExport() {
    if (!exportData.grandTotal) return;
    
    let msg = `*Team Inspire POD - Quote Estimate*\n\n`;
    msg += `*Summary of Costs (${exportData.qty} Copies):*\n`;
    msg += `• Manufacturing: ₹${exportData.totalManufacturing.toFixed(2)}\n`;
    msg += `• Pre-Press Services: ₹${exportData.totalDesign.toFixed(2)}\n`;
    
    if (exportData.emergency) {
        msg += `• Priority Surcharge: +₹${exportData.emergencySurcharge.toFixed(2)}\n`;
    }
    
    msg += `\n*Estimated Grand Total: ₹${Math.floor(exportData.grandTotal).toLocaleString('en-IN')}/-*\n\n`;
    msg += `_Note: This is a preliminary estimate subject to final file verification._`;

    try {
        await navigator.clipboard.writeText(msg);
        showToast("Summary Quote Copied!");
        if (navigator.share) {
            await navigator.share({ title: 'Quote', text: msg });
        } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        }
    } catch (err) {
        console.log("Export Error", err);
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

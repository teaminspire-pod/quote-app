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
        { max: 100, rate: 140 }, { max: 200, rate: 90 }, { max: 300, rate: 85 }, { max: 1000, rate: 72 }
    ],
    design: {
        cover: 2500, publishing: 3500,
        customLayout: { "A6": 175, "A5": 350, "A4": 450 },
        basicLayout: 35, dtp: 25, proofing: 30
    }
};

const DIMENSIONS = {
    "A4": { mm: "210 × 297", cm: "21.0 × 29.7", in: "8.27 × 11.69" },
    "A5": { mm: "148 × 210", cm: "14.8 × 21.0", in: "5.83 × 8.27" },
    "A6": { mm: "105 × 148", cm: "10.5 × 14.8", in: "4.13 × 5.83" }
};

let exportData = {};
let currentAnimatedTotal = 0;
let animationFrameId = null;

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('quoteForm');
    
    // Dimension Update Listener
    document.querySelectorAll('input[name="masterSize"]').forEach(radio => {
        radio.addEventListener('change', updateDimensionWindow);
    });

    // Form Engine Listeners
    form.addEventListener('change', (e) => {
        if (e.target.classList.contains('print-type-cb')) renderDynamicInputs();
        if (e.target.id === 'toggleDesign') document.getElementById('designDrawer').classList.toggle('logic-hidden', !e.target.checked);
        runEngineCycle();
    });

    form.addEventListener('input', (e) => {
        if (e.target.type === 'number') runEngineCycle();
    });

    document.getElementById('exportBtn').addEventListener('click', processExport);

    renderDynamicInputs();
    runEngineCycle();
});

function updateDimensionWindow(e) {
    const size = e.target.value;
    const win = document.getElementById('dimWindow');
    
    win.classList.add('dim-updating');
    
    setTimeout(() => {
        document.getElementById('dimMM').innerText = DIMENSIONS[size].mm;
        document.getElementById('dimCM').innerText = DIMENSIONS[size].cm;
        document.getElementById('dimIN').innerText = DIMENSIONS[size].in;
        win.classList.remove('dim-updating');
    }, 150);
}

function renderDynamicInputs() {
    const checkedBoxes = Array.from(document.querySelectorAll('.print-type-cb:checked')).map(cb => cb.value);
    const container = document.getElementById('dynamicPageInputs');
    
    let newHtml = '';
    checkedBoxes.forEach(type => {
        let safeId = "dyn_" + type.replace(/[^a-zA-Z]/g, "");
        let existingVal = document.getElementById(safeId) ? document.getElementById(safeId).value : "";
        if (checkedBoxes.length === 1 && existingVal === "") existingVal = "100";
        
        let displayLabel = type === "Black & White" ? "B&W Pages" : type === "Multi Color" ? "Color Pages" : "Plain Pages";
        
        newHtml += `
            <div class="dynamic-row">
                <label>${displayLabel}</label>
                <input type="number" id="${safeId}" class="sub-print-input heavy-input minor" value="${existingVal}" data-type="${type}" min="0">
            </div>
        `;
    });
    
    if (newHtml === '') newHtml = '<div style="color:var(--red); font-weight:bold; font-size:0.9rem;">⚠️ Select at least one interior type.</div>';
    container.innerHTML = newHtml;
}

function getTotalInnerPages() {
    return Array.from(document.querySelectorAll('.sub-print-input')).reduce((sum, inp) => sum + (parseInt(inp.value) || 0), 0);
}

function handlePaperLogic() {
    const innerPages = getTotalInnerPages();
    const isMultiColorSelected = Array.from(document.querySelectorAll('.print-type-cb:checked')).map(cb => cb.value).includes("Multi Color");
    
    const typeArtInput = document.getElementById('typeArt');
    const labelTypeArt = document.getElementById('labelTypeArt');
    
    const bwCb = document.getElementById('ptBW');
    const plainCb = document.getElementById('ptPlain');

    // Art Paper Availability
    labelTypeArt.classList.toggle('logic-hidden', !isMultiColorSelected);
    if (!isMultiColorSelected && typeArtInput.checked) document.getElementById('typeNS').checked = true;

    // Art Paper Constraints (Disable BW/Plain, Force High GSM)
    if (typeArtInput && typeArtInput.checked) {
        if (bwCb) { bwCb.checked = false; bwCb.disabled = true; document.querySelector('label[for="ptBW"]').classList.add('logic-hidden'); }
        if (plainCb) { plainCb.checked = false; plainCb.disabled = true; document.querySelector('label[for="ptPlain"]').classList.add('logic-hidden'); }
        
        ['130', '170'].forEach(gsm => document.getElementById(`labelGsm${gsm}`).classList.remove('logic-hidden'));
        ['70', '80', '100', '120'].forEach(gsm => document.getElementById(`labelGsm${gsm}`).classList.add('logic-hidden'));
        
        if (!document.getElementById('gsm130').checked && !document.getElementById('gsm170').checked) document.getElementById('gsm130').checked = true;
    } else {
        if (bwCb) { bwCb.disabled = false; document.querySelector('label[for="ptBW"]').classList.remove('logic-hidden'); }
        if (plainCb) { plainCb.disabled = false; document.querySelector('label[for="ptPlain"]').classList.remove('logic-hidden'); }
        
        ['130', '170'].forEach(gsm => document.getElementById(`labelGsm${gsm}`).classList.add('logic-hidden'));
        ['80', '100', '120'].forEach(gsm => document.getElementById(`labelGsm${gsm}`).classList.remove('logic-hidden'));
    }

    // Low Page Count Constraints
    if (innerPages > 0 && innerPages < 70) {
        document.getElementById('labelGsm70').classList.add('logic-hidden');
        if (document.getElementById('gsm70').checked) document.getElementById('gsm80').checked = true;
        document.getElementById('labelCover170').classList.add('logic-hidden');
        if (document.getElementById('cover170').checked) document.getElementById('cover250').checked = true;
    } else {
        if (!typeArtInput.checked) document.getElementById('labelGsm70').classList.remove('logic-hidden');
        document.getElementById('labelCover170').classList.remove('logic-hidden');
    }
}

function animateNumber(targetId, startVal, endVal, duration) {
    const obj = document.getElementById(targetId);
    let startTimestamp = null;
    
    if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentVal = Math.floor(progress * (endVal - startVal) + startVal);
        
        obj.innerHTML = `₹${currentVal.toLocaleString('en-IN')}`;
        
        if (progress < 1) {
            animationFrameId = window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = `₹${Math.floor(endVal).toLocaleString('en-IN')}`;
            currentAnimatedTotal = endVal;
        }
    };
    animationFrameId = window.requestAnimationFrame(step);
}

function runEngineCycle() {
    handlePaperLogic();
    
    let qty = parseInt(document.getElementById('bookQty').value) || 0;
    let innerPages = getTotalInnerPages();
    
    if (qty < 4 || qty > 1000) {
        document.getElementById('grandTotalDisplayDesk').innerText = qty > 1000 ? "FACTORY" : "—";
        return;
    }

    const size = document.querySelector('input[name="masterSize"]:checked').value;
    const paperGsm = document.querySelector('input[name="paperGsm"]:checked').value;
    const bindingStyle = document.querySelector('input[name="bindingStyle"]:checked').value;
    const emergency = document.getElementById('emergencyCharge').checked;

    let innerTotalPerBook = 0;
    document.querySelectorAll('.sub-print-input').forEach(inp => {
        let pgs = parseInt(inp.value) || 0;
        let t = inp.getAttribute('data-type');
        let dict = t === "Black & White" ? "bw" : t === "Plain (without print)" ? "plain" : "color";
        let rate = RATES[dict][paperGsm]?.[size] || 0;
        innerTotalPerBook += pgs * rate;
    });

    const coverGsm = document.querySelector('input[name="coverGsm"]:checked').value;
    let coverCostPerBook = RATES.cover[coverGsm]?.[size] || 0;
    if (document.querySelector('input[name="lamination"]:checked').value === "No Lamination") coverCostPerBook -= 0.50;
    
    let bindingCostPerBook = 0;
    if (bindingStyle === 'Hardbinding') {
        for (let tier of RATES.hardBindingTiers) {
            if (qty <= tier.max) { bindingCostPerBook = tier.rate; break; }
        }
    } else if (bindingStyle === 'Perfect Binding' && qty < 100) {
        let totalStd = qty * RATES.binding[bindingStyle][size];
        let minCharge = innerPages <= 599 ? 500 : 600;
        bindingCostPerBook = totalStd < minCharge ? (minCharge / qty) : RATES.binding[bindingStyle][size];
    } else {
        bindingCostPerBook = RATES.binding[bindingStyle][size];
    }

    const mfgSubtotal = innerTotalPerBook + coverCostPerBook + bindingCostPerBook;
    const emergencySurcharge = emergency ? (mfgSubtotal * 0.35) : 0;
    const totalManufacturing = (mfgSubtotal + emergencySurcharge) * qty;

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
    
    animateNumber('grandTotalDisplayDesk', currentAnimatedTotal, grandTotal, 350);

    exportData = { totalManufacturing, totalDesign, emergency, emergencySurcharge: emergencySurcharge * qty, grandTotal, qty };
}

async function processExport() {
    if (!exportData.grandTotal) return;
    
    let msg = `*Team Inspire POD - Quote Estimate*\n\n*Summary of Costs (${exportData.qty} Copies):*\n• Manufacturing: ₹${exportData.totalManufacturing.toFixed(2)}\n• Pre-Press Services: ₹${exportData.totalDesign.toFixed(2)}\n`;
    if (exportData.emergency) msg += `• Priority Surcharge: +₹${exportData.emergencySurcharge.toFixed(2)}\n`;
    msg += `\n*Estimated Grand Total: ₹${Math.floor(exportData.grandTotal).toLocaleString('en-IN')}/-*\n\n_Note: This is a preliminary estimate subject to final file verification._`;

    try {
        await navigator.clipboard.writeText(msg);
        const toast = document.getElementById('toast');
        document.getElementById('toastMsg').innerText = "Quote Copied to Clipboard!";
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
        
        if (navigator.share) await navigator.share({ title: 'Quote', text: msg });
        else window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    } catch (err) { console.log(err); }
}

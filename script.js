// ===============================
// TEAM INSPIRE - STABILIZED ENGINE
// MOBILE FIRST - SAFE BUILD
// ===============================

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
        customLayout: {
            "A6": 175,
            "A5": 350,
            "A4": 450
        },
        basicLayout: 35,
        dtp: 25,
        proofing: 30
    }
};

// ===============================
// GLOBALS
// ===============================

let currentTotal = 0;
let debounceTimer = null;
let currentUnit = 'CM';
let exportData = {};
let isRenderingInputs = false;

const MAX_QTY = 1000;
const MAX_PAGES = 2000;

const form = document.getElementById('quoteForm');

const dimData = {
    'A4': {
        'CM': '21.0 × 29.7 CM',
        'MM': '210 × 297 MM',
        'IN': '8.27 × 11.69 IN'
    },

    'A5': {
        'CM': '14.0 × 21.5 CM',
        'MM': '140 × 215 MM',
        'IN': '5.50 × 8.50 IN'
    },

    'A6': {
        'CM': '10.5 × 14.8 CM',
        'MM': '105 × 148 MM',
        'IN': '4.13 × 5.83 IN'
    }
};

// ===============================
// INIT
// ===============================

document.addEventListener('DOMContentLoaded', () => {

    try {
        renderPrintInputs();
        loadDraft();
        attachListeners();
        triggerSizeHintAnimation();
        handlePaperLogic();
        calculateEngine();
    }

    catch (err) {
        console.error(err);
        showToast("Initialization failed.", true);
    }
});

// ===============================
// HELPERS
// ===============================

function preciseRound(num) {

    if (isNaN(num)) return 0;

    return Math.round((num + Number.EPSILON) * 100) / 100;
}

function safeInt(value) {

    const parsed = parseInt(value);

    if (isNaN(parsed)) return 0;

    return parsed;
}

function getMOQ(size) {

    if (size === 'A6') return 8;

    if (size === 'A5') return 4;

    return 2;
}

function getValidQty(qty, size) {

    qty = safeInt(qty);

    if (qty <= 0) return 0;

    const multiple = getMOQ(size);

    if (qty < multiple) return multiple;

    return Math.ceil(qty / multiple) * multiple;
}

function getTotalInnerPages() {

    let total = 0;

    document.querySelectorAll('.sub-print-input').forEach(input => {

        total += safeInt(input.value);
    });

    return total;
}

// ===============================
// TOAST
// ===============================

const successIcon = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<path d="M20 6L9 17l-5-5"/>
</svg>
`;

const errorIcon = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
<circle cx="12" cy="12" r="10"/>
<line x1="12" y1="8" x2="12" y2="12"/>
<line x1="12" y1="16" x2="12.01" y2="16"/>
</svg>
`;

function showToast(message, isError = false) {

    const toast = document.getElementById('toast');

    if (!toast) return;

    document.getElementById('toastMsg').innerText = message;

    document.getElementById('toastIcon').innerHTML =
        isError ? errorIcon : successIcon;

    toast.style.background =
        isError ? 'var(--primary)' : 'var(--text-main)';

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3200);
}

// ===============================
// LISTENERS
// ===============================

function attachListeners() {

    if (!form) return;

    form.addEventListener('input', (e) => {

        if (
            e.target.classList.contains('sub-print-input') ||
            e.target.id === 'bookQty'
        ) {
            triggerDebounce();
        }

        handlePaperLogic();
        saveDraft();
    });

    form.addEventListener('change', (e) => {

        if (e.target.classList.contains('print-type-cb')) {

            renderPrintInputs();
        }

        handlePaperLogic();

        triggerDebounce();

        saveDraft();
    });

    document.querySelectorAll('.shareActionBtn').forEach(btn => {

        btn.addEventListener('click', processExport);
    });

    const qtyInput = document.getElementById('bookQty');

    if (qtyInput) {

        qtyInput.addEventListener('blur', () => {

            const size =
                document.querySelector('input[name="masterSize"]:checked')?.value || 'A5';

            let qty = safeInt(qtyInput.value);

            qty = getValidQty(qty, size);

            if (qty > MAX_QTY) qty = MAX_QTY;

            qtyInput.value = qty;

            updateQtyHint(size);

            calculateEngine();
        });
    }
}

// ===============================
// SIZE HINT
// ===============================

function toggleDimFormat() {

    if (currentUnit === 'CM') currentUnit = 'MM';

    else if (currentUnit === 'MM') currentUnit = 'IN';

    else currentUnit = 'CM';

    const btn = document.getElementById('dimFormatBtn');

    if (btn) {

        btn.innerText = `Unit: ${currentUnit}`;
    }

    triggerSizeHintAnimation();
}

function triggerSizeHintAnimation() {

    const size =
        document.querySelector('input[name="masterSize"]:checked')?.value || 'A5';

    const display = document.getElementById('sizeHintDisplay');

    if (!display) return;

    display.innerText = dimData[size][currentUnit];

    updateQtyHint(size);
}

function updateQtyHint(size) {

    const hint = document.getElementById('qtyHint');

    if (!hint) return;

    const multiple = getMOQ(size);

    hint.innerText =
        `MOQ: ${multiple} (Must be a multiple of ${multiple})`;
}

// ===============================
// DEBOUNCE
// ===============================

function triggerDebounce() {

    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {

        calculateEngine();

    }, 120);
}

// ===============================
// PAPER LOGIC
// ===============================

function handlePaperLogic() {

    try {

        const checkedTypes = Array.from(
            document.querySelectorAll('.print-type-cb:checked')
        ).map(cb => cb.value);

        const multiSelected =
            checkedTypes.includes("Multi Color");

        const typeArt = document.getElementById('typeArt');

        const artLabel =
            document.querySelector('label[for="typeArt"]');

        if (multiSelected) {

            artLabel?.classList.remove('smooth-hidden');
        }

        else {

            artLabel?.classList.add('smooth-hidden');

            if (typeArt?.checked) {

                document.getElementById('typeNS').checked = true;
            }
        }

        const innerPages = getTotalInnerPages();

        const gsm70Label =
            document.querySelector('label[for="gsm70"]');

        const cover170 =
            document.querySelector('label[for="cover170"]');

        const cover300 =
            document.querySelector('label[for="cover300"]');

        if (innerPages > 0 && innerPages < 70) {

            gsm70Label?.classList.add('smooth-hidden');

            cover170?.classList.add('smooth-hidden');

            cover300?.classList.add('smooth-hidden');
        }

        else {

            gsm70Label?.classList.remove('smooth-hidden');

            cover170?.classList.remove('smooth-hidden');

            cover300?.classList.remove('smooth-hidden');
        }
    }

    catch (err) {

        console.error(err);
    }
}

// ===============================
// PRINT INPUTS
// ===============================

function renderPrintInputs() {

    if (isRenderingInputs) return;

    isRenderingInputs = true;

    const container =
        document.getElementById('printInputsContainer');

    if (!container) return;

    const checked = Array.from(
        document.querySelectorAll('.print-type-cb:checked')
    ).map(cb => cb.value);

    if (checked.length === 0) {

        container.innerHTML =
            `<span style="color:var(--primary);font-weight:700;">Select print type.</span>`;

        isRenderingInputs = false;

        return;
    }

    let html = '';

    checked.forEach(type => {

        const safeId =
            "subpg_" + type.replace(/[^a-zA-Z]/g, "");

        html += `
        <div>
            <span class="standard-label">${type} (Pages)</span>

            <input
                type="number"
                id="${safeId}"
                class="standard-input sub-print-input"
                data-type="${type}"
                placeholder="0"
                min="0"
                max="${MAX_PAGES}"
            >
        </div>
        `;
    });

    container.innerHTML = html;

    isRenderingInputs = false;
}

// ===============================
// PAGE RATE
// ===============================

function getPageRate(printType, gsm, size, paperType) {

    if (printType === "Black & White") {

        return RATES.bw[gsm]?.[size] || 0;
    }

    if (printType === "Plain (without print)") {

        return RATES.plain[gsm]?.[size] || 0;
    }

    if (printType === "Multi Color") {

        if (paperType === "Art Paper") {

            return RATES.color.art[gsm]?.[size] || 0;
        }

        return RATES.color.standard[gsm]?.[size] || 0;
    }

    return 0;
}

// ===============================
// MAIN ENGINE
// ===============================

function calculateEngine() {

    try {

        const qtyInput = document.getElementById('bookQty');

        const size =
            document.querySelector('input[name="masterSize"]:checked')?.value || 'A5';

        let displayQty = safeInt(qtyInput?.value);

        if (displayQty < 0) displayQty = 0;

        if (displayQty > MAX_QTY) {

            lockState(
                true,
                true,
                "Factory quote required above 1000 quantity."
            );

            return;
        }

        const qty = getValidQty(displayQty, size);

        let innerPages = getTotalInnerPages();

        if (innerPages > MAX_PAGES) {

            lockState(
                true,
                false,
                "Maximum 2000 pages allowed."
            );

            return;
        }

        if (qty === 0 || innerPages === 0) {

            lockState(
                true,
                false,
                "Enter quantity and page counts."
            );

            return;
        }

        const paperGsm =
            document.querySelector('input[name="paperGsm"]:checked')?.value;

        const paperType =
            document.querySelector('input[name="paperType"]:checked')?.value;

        const bindingStyle =
            document.querySelector('input[name="bindingStyle"]:checked')?.value;

        if (!paperGsm || !paperType || !bindingStyle) {

            lockState(true, false, "Select required options.");

            return;
        }

        // ===============================
        // INNER PAGE COST
        // ===============================

        let innerTotalPerBook = 0;

        let breakdownHTML = '';

        let printBreakdown = [];

        document.querySelectorAll('.sub-print-input').forEach(input => {

            const pages = safeInt(input.value);

            if (pages <= 0) return;

            const type = input.dataset.type;

            const rate =
                getPageRate(type, paperGsm, size, paperType);

            const cost =
                preciseRound(rate * pages);

            innerTotalPerBook += cost;

            printBreakdown.push(`${pages} Pgs ${type}`);

            breakdownHTML += `
            <div class="bd-row cascade-row">
                <span class="bd-label">${type}</span>
                <span class="bd-value">₹${cost.toFixed(2)}</span>
            </div>
            `;
        });

        // ===============================
        // COVER
        // ===============================

        const coverGsm =
            document.querySelector('input[name="coverGsm"]:checked')?.value;

        let coverCost =
            RATES.cover[coverGsm]?.[size] || 0;

        const lamination =
            document.querySelector('input[name="lamination"]:checked')?.value;

        if (lamination === 'No Lamination') {

            coverCost = preciseRound(coverCost - 0.50);
        }

        // ===============================
        // BINDING
        // ===============================

        let bindingCost = 0;

        let bindingLabel = bindingStyle;

        if (bindingStyle === 'Hard Binding') {

            for (const tier of RATES.hardBindingTiers) {

                if (qty <= tier.max) {

                    bindingCost = tier.rate;

                    break;
                }
            }
        }

        else {

            bindingCost =
                RATES.binding[bindingStyle]?.[size] || 0;
        }

        // ===============================
        // PERFECT BINDING MINIMUM
        // ===============================

        if (
            bindingStyle === 'Perfect Binding' &&
            qty < 100
        ) {

            const standardTotal =
                preciseRound(bindingCost * qty);

            let minimumCharge = 0;

            if (innerPages <= 500) {

                minimumCharge = 500;
            }

            else {

                minimumCharge = 600;
            }

            if (standardTotal < minimumCharge) {

                bindingCost =
                    preciseRound(minimumCharge / qty);

                bindingLabel =
                    `Perfect Binding (Min ₹${minimumCharge})`;
            }
        }

        // ===============================
        // PRIORITY
        // ===============================

        const priority =
            document.getElementById('emergencyCharge')?.checked;

        const manufacturingSubtotal =
            preciseRound(
                innerTotalPerBook +
                coverCost +
                bindingCost
            );

        const surcharge =
            priority
                ? preciseRound(manufacturingSubtotal * 0.35)
                : 0;

        const finalPerBook =
            preciseRound(manufacturingSubtotal + surcharge);

        const manufacturingTotal =
            preciseRound(finalPerBook * qty);

        // ===============================
        // DESIGN
        // ===============================

        let designTotal = 0;

        const designEnabled =
            document.getElementById('toggleDesign')?.checked;

        if (designEnabled) {

            if (document.getElementById('coverDesign')?.checked) {

                designTotal += RATES.design.cover;
            }

            if (document.getElementById('pubPackage')?.checked) {

                designTotal += RATES.design.publishing;
            }

            const customPages =
                safeInt(document.getElementById('designPages')?.value);

            const basicPages =
                safeInt(document.getElementById('layoutPages')?.value);

            const dtpPages =
                safeInt(document.getElementById('dtpPages')?.value);

            const proofPages =
                safeInt(document.getElementById('proofingPages')?.value);

            designTotal +=
                customPages * RATES.design.customLayout[size];

            designTotal +=
                basicPages * RATES.design.basicLayout;

            designTotal +=
                dtpPages * RATES.design.dtp;

            designTotal +=
                proofPages * RATES.design.proofing;
        }

        // ===============================
        // GRAND TOTAL
        // ===============================

        const grandTotal =
            preciseRound(manufacturingTotal + designTotal);

        // ===============================
        // BREAKDOWN
        // ===============================

        breakdownHTML += `
        <div class="bd-row cascade-row">
            <span class="bd-label">Cover</span>
            <span class="bd-value">₹${coverCost.toFixed(2)}</span>
        </div>

        <div class="bd-row cascade-row">
            <span class="bd-label">${bindingLabel}</span>
            <span class="bd-value">₹${bindingCost.toFixed(2)}</span>
        </div>
        `;

        if (priority) {

            breakdownHTML += `
            <div class="bd-row bd-emergency cascade-row">
                <span class="bd-label">Priority Production (+35%)</span>
                <span class="bd-value">+₹${surcharge.toFixed(2)}</span>
            </div>
            `;
        }

        breakdownHTML += `
        <div class="bd-subtotal bd-row cascade-row">
            <span class="bd-label">Per Book Rate</span>
            <span class="bd-value">₹${finalPerBook.toFixed(2)}</span>
        </div>
        `;

        document.getElementById('bdScrollArea').innerHTML =
            breakdownHTML;

        // ===============================
        // EXPORT DATA
        // ===============================

        exportData = {

            qty,
            innerPages,
            size,

            paperType,
            paperGsm,

            printBreakdown:
                printBreakdown.join(', '),

            bindingStyle,
            coverGsm,
            lamination,

            priority,

            finalPerBook,
            grandTotal,

            manufacturingTotal,
            designTotal,

            surcharge,

            innerTotalPerBook,
            coverCost,
            bindingCost
        };

        updateTotalDOM(grandTotal);

        lockState(false);
    }

    catch (err) {

        console.error(err);

        lockState(
            true,
            false,
            "Calculation error detected."
        );
    }
}

// ===============================
// LOCK STATE
// ===============================

function lockState(
    isLocked,
    isOffset = false,
    message = ""
) {

    const buttons =
        document.querySelectorAll('.shareActionBtn');

    const desktopTotal =
        document.getElementById('grandTotalDisplayDesk');

    const mobileTotal =
        document.getElementById('grandTotalDisplayMob');

    if (isLocked) {

        buttons.forEach(btn => {

            btn.disabled = true;
        });

        if (desktopTotal) {

            desktopTotal.innerText = "—";
        }

        if (mobileTotal) {

            mobileTotal.innerText = "—";
        }

        if (message) {

            document.getElementById('bdScrollArea').innerHTML =
                `
                <div style="padding:20px;color:var(--primary);font-weight:800;text-align:center;">
                    ${message}
                </div>
                `;
        }

        return;
    }

    buttons.forEach(btn => {

        btn.disabled = false;
    });
}

// ===============================
// TOTAL UPDATE
// ===============================

function updateTotalDOM(total) {

    currentTotal = total;

    const desktop =
        document.getElementById('grandTotalDisplayDesk');

    const mobile =
        document.getElementById('grandTotalDisplayMob');

    const formatted =
        `₹${total.toLocaleString('en-IN')}`;

    if (desktop) desktop.innerText = formatted;

    if (mobile) mobile.innerText = formatted;
}

// ===============================
// STORAGE
// ===============================

function saveDraft() {

    try {

        const data = {};

        document.querySelectorAll('input').forEach(input => {

            if (input.type === 'radio') {

                if (input.checked) {

                    data[input.name] = input.value;
                }
            }

            else if (input.type === 'checkbox') {

                data[input.id] = input.checked;
            }

            else {

                data[input.id] = input.value;
            }
        });

        localStorage.setItem(
            'ti_premium_quote_draft',
            JSON.stringify(data)
        );
    }

    catch (err) {

        console.error(err);
    }
}

function loadDraft() {

    try {

        const cache =
            localStorage.getItem('ti_premium_quote_draft');

        if (!cache) return;

        const data = JSON.parse(cache);

        Object.keys(data).forEach(key => {

            const el =
                document.getElementById(key);

            if (!el) return;

            if (el.type === 'checkbox') {

                el.checked = data[key];
            }

            else {

                el.value = data[key];
            }
        });
    }

    catch (err) {

        console.error(err);
    }
}

// ===============================
// RESET
// ===============================

function resetApp() {

    localStorage.removeItem('ti_premium_quote_draft');

    window.location.reload();
}

// ===============================
// EXPORT
// ===============================

async function processExport() {

    try {

        const snapshot =
            JSON.parse(JSON.stringify(exportData));

        if (!snapshot.qty) {

            showToast("Nothing to export.", true);

            return;
        }

        let msg = '';

        msg += `*TEAM INSPIRE DIGITAL MEDIA*\n`;
        msg += `*Quotation*\n\n`;

        msg += `*Specifications*\n`;

        msg += `• Size: ${snapshot.size}\n`;

        msg += `• Quantity: ${snapshot.qty}\n`;

        msg += `• Inner Pages: ${snapshot.innerPages}\n`;

        msg += `• Paper: ${snapshot.paperGsm} GSM ${snapshot.paperType}\n`;

        msg += `• Printing: ${snapshot.printBreakdown}\n`;

        msg += `• Binding: ${snapshot.bindingStyle}\n`;

        msg += `• Cover: ${snapshot.coverGsm}\n`;

        msg += `• Lamination: ${snapshot.lamination}\n\n`;

        msg += `*Manufacturing Breakdown*\n`;

        msg += `• Inner Pages: ₹${snapshot.innerTotalPerBook.toFixed(2)}\n`;

        msg += `• Cover: ₹${snapshot.coverCost.toFixed(2)}\n`;

        msg += `• Binding: ₹${snapshot.bindingCost.toFixed(2)}\n`;

        if (snapshot.priority) {

            msg += `• Priority Production (+35%): +₹${snapshot.surcharge.toFixed(2)}\n`;
        }

        msg += `\n*Per Book Rate:* ₹${snapshot.finalPerBook.toFixed(2)}\n`;

        msg += `*Estimated Grand Total:* ₹${snapshot.grandTotal.toLocaleString('en-IN')}\n\n`;

        msg += `*Terms & Conditions*\n`;

        msg += `• Priority Production includes additional 35% manufacturing surcharge.\n`;

        msg += `• Shipping charges extra.\n`;

        msg += `• 50% advance required.\n`;

        msg += `• Final proof approval is customer responsibility.\n\n`;

        msg += `Mail: teaminspirepod@gmail.com\n`;

        msg += `Ph: +91 90371 16229`;

        await navigator.clipboard.writeText(msg);

        showToast("Quote copied.");

        window.open(
            `https://wa.me/?text=${encodeURIComponent(msg)}`,
            '_blank'
        );
    }

    catch (err) {

        console.error(err);

        showToast("Export failed.", true);
    }
                            }

// =====================================================
// TEAM INSPIRE — STABILIZED CORE ENGINE (PATCH VERSION)
// =====================================================

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
    ]
};


// =====================================================
// GLOBALS
// =====================================================

let currentTotal = 0;
let debounceTimer = null;
let isInternalUpdate = false;

const form = document.getElementById('quoteForm');


// =====================================================
// BOOT
// =====================================================

document.addEventListener('DOMContentLoaded', () => {

    renderPrintInputs();

    attachListeners();

    handlePaperLogic();

    calculateEngine();
});


// =====================================================
// HELPERS
// =====================================================

function preciseRound(num) {

    return Math.round(num * 100) / 100;
}


function showToast(msg, isError = false) {

    const toast = document.getElementById('toast');

    if (!toast) return;

    const msgEl = document.getElementById('toastMsg');

    if (msgEl) {
        msgEl.innerText = msg;
    }

    toast.style.background =
        isError ? "var(--primary)" : "var(--text-main)";

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}


function triggerDebounce() {

    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
        calculateEngine();
    }, 120);
}


function getValidQty(qty, size) {

    let requiredMultiple = 2;
    let minimumQty = 4;

    if (size === "A5") {
        requiredMultiple = 4;
    }

    if (size === "A6") {
        requiredMultiple = 8;
        minimumQty = 8;
    }

    if (qty < minimumQty) {
        qty = minimumQty;
    }

    if (qty % requiredMultiple !== 0) {
        qty =
            Math.ceil(qty / requiredMultiple) *
            requiredMultiple;
    }

    if (qty > 1000) {
        qty = 1000;
    }

    return qty;
}


// =====================================================
// INPUTS
// =====================================================

function renderPrintInputs() {

    const container =
        document.getElementById('printInputsContainer');

    if (!container) return;

    // CREATE ONLY ONCE
    if (!container.dataset.initialized) {

        container.innerHTML = `

            <div id="wrap_bw">
                <span class="standard-label">
                    Black & White (Pgs)
                </span>

                <input
                    type="number"
                    id="subpg_BlackWhite"
                    class="standard-input sub-print-input"
                    placeholder="0"
                    data-type="Black & White"
                    min="0"
                    max="2000"
                >
            </div>

            <div id="wrap_color">
                <span class="standard-label">
                    Multi Color (Pgs)
                </span>

                <input
                    type="number"
                    id="subpg_MultiColor"
                    class="standard-input sub-print-input"
                    placeholder="0"
                    data-type="Multi Color"
                    min="0"
                    max="2000"
                >
            </div>

            <div id="wrap_plain">
                <span class="standard-label">
                    Plain (without print) (Pgs)
                </span>

                <input
                    type="number"
                    id="subpg_Plain"
                    class="standard-input sub-print-input"
                    placeholder="0"
                    data-type="Plain (without print)"
                    min="0"
                    max="2000"
                >
            </div>
        `;

        container.dataset.initialized = "true";
    }

    // SHOW/HIDE ONLY
    const bwChecked =
        document.querySelector('.print-type-cb[value="Black & White"]')?.checked;

    const colorChecked =
        document.querySelector('.print-type-cb[value="Multi Color"]')?.checked;

    const plainChecked =
        document.querySelector('.print-type-cb[value="Plain (without print)"]')?.checked;

    document.getElementById('wrap_bw').style.display =
        bwChecked ? 'block' : 'none';

    document.getElementById('wrap_color').style.display =
        colorChecked ? 'block' : 'none';

    document.getElementById('wrap_plain').style.display =
        plainChecked ? 'block' : 'none';
}


// =====================================================
// LISTENERS
// =====================================================

function attachListeners() {

    // PAGE INPUTS
    document.addEventListener('input', (e) => {

        if (e.target.classList.contains('sub-print-input')) {

            let val = parseInt(e.target.value);

            if (isNaN(val)) val = 0;

            if (val < 0) val = 0;

            if (val > 2000) {

                val = 2000;

                showToast(
                    "Maximum pages allowed is 2000",
                    true
                );
            }

            e.target.value = val;

            triggerDebounce();

            return;
        }
    });

    // FORM INPUTS
    form.addEventListener('change', () => {

        handlePaperLogic();

        renderPrintInputs();

        triggerDebounce();
    });

    // QTY
    const qtyInput =
        document.getElementById('bookQty');

    if (qtyInput) {

        qtyInput.addEventListener('blur', () => {

            const size =
                document.querySelector(
                    'input[name="masterSize"]:checked'
                )?.value || "A5";

            let val = parseInt(qtyInput.value);

            if (isNaN(val)) {
                val = 0;
            }

            val = getValidQty(val, size);

            qtyInput.value = val;

            triggerDebounce();
        });
    }
}


// =====================================================
// PAPER LOGIC
// =====================================================

function handlePaperLogic() {

    try {

        if (isInternalUpdate) return;

        isInternalUpdate = true;

        const checkedPrintTypes =
            Array.from(
                document.querySelectorAll('.print-type-cb:checked')
            ).map(cb => cb.value);

        const isMultiColorSelected =
            checkedPrintTypes.includes("Multi Color");

        const typeArtInput =
            document.getElementById('typeArt');

        const artLabel =
            document.querySelector('label[for="typeArt"]');

        const gsm70 =
            document.getElementById('gsm70');

        const gsm80 =
            document.getElementById('gsm80');

        const gsm100 =
            document.getElementById('gsm100');

        const gsm120 =
            document.getElementById('gsm120');

        const gsm130 =
            document.getElementById('gsm130');

        const gsm170 =
            document.getElementById('gsm170');

        const gsm70Label =
            document.querySelector('label[for="gsm70"]');

        const gsm80Label =
            document.querySelector('label[for="gsm80"]');

        const gsm100Label =
            document.querySelector('label[for="gsm100"]');

        const gsm120Label =
            document.querySelector('label[for="gsm120"]');

        const gsm130Label =
            document.querySelector('label[for="gsm130"]');

        const gsm170Label =
            document.querySelector('label[for="gsm170"]');

        // SHOW/HIDE ART OPTION
        if (isMultiColorSelected) {

            artLabel.classList.remove('smooth-hidden');

        } else {

            artLabel.classList.add('smooth-hidden');

            if (typeArtInput.checked) {

                document.getElementById('typeNS').checked = true;
            }
        }

        // ART PAPER RULES
        if (typeArtInput.checked) {

            // FORCE CLEANUP
            gsm70.checked = false;
            gsm80.checked = false;
            gsm100.checked = false;
            gsm120.checked = false;

            gsm70Label.classList.add('smooth-hidden');
            gsm80Label.classList.add('smooth-hidden');
            gsm100Label.classList.add('smooth-hidden');
            gsm120Label.classList.add('smooth-hidden');

            gsm130Label.classList.remove('smooth-hidden');
            gsm170Label.classList.remove('smooth-hidden');

            // FORCE MULTICOLOR
            const multiCb =
                document.querySelector(
                    '.print-type-cb[value="Multi Color"]'
                );

            multiCb.checked = true;

            // DISABLE BW/PLAIN
            const bwWrap =
                document.querySelector(
                    '.print-type-cb[value="Black & White"]'
                )?.closest('.checkbox-group');

            const plainWrap =
                document.querySelector(
                    '.print-type-cb[value="Plain (without print)"]'
                )?.closest('.checkbox-group');

            if (bwWrap) {
                bwWrap.style.display = 'none';
            }

            if (plainWrap) {
                plainWrap.style.display = 'none';
            }

            if (!gsm130.checked && !gsm170.checked) {
                gsm130.checked = true;
            }

        } else {

            gsm130Label.classList.add('smooth-hidden');
            gsm170Label.classList.add('smooth-hidden');

            gsm70Label.classList.remove('smooth-hidden');
            gsm80Label.classList.remove('smooth-hidden');
            gsm100Label.classList.remove('smooth-hidden');
            gsm120Label.classList.remove('smooth-hidden');

            const bwWrap =
                document.querySelector(
                    '.print-type-cb[value="Black & White"]'
                )?.closest('.checkbox-group');

            const plainWrap =
                document.querySelector(
                    '.print-type-cb[value="Plain (without print)"]'
                )?.closest('.checkbox-group');

            if (bwWrap) {
                bwWrap.style.display = 'flex';
            }

            if (plainWrap) {
                plainWrap.style.display = 'flex';
            }
        }

        isInternalUpdate = false;

    } catch (err) {

        console.error(err);

        isInternalUpdate = false;
    }
}


// =====================================================
// TOTAL PAGES
// =====================================================

function getTotalInnerPages() {

    let total = 0;

    document
        .querySelectorAll('.sub-print-input')
        .forEach(inp => {

            const wrapper =
                inp.parentElement;

            if (wrapper.style.display === 'none') {
                return;
            }

            let val = parseInt(inp.value);

            if (!isNaN(val)) {
                total += val;
            }
        });

    return total;
}


// =====================================================
// PAGE RATE
// =====================================================

function getPageRate(
    printType,
    gsm,
    size,
    paperType
) {

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


// =====================================================
// ENGINE
// =====================================================

function calculateEngine() {

    const qtyInput =
        document.getElementById('bookQty');

    let qty = parseInt(qtyInput.value);

    if (isNaN(qty)) qty = 0;

    const size =
        document.querySelector(
            'input[name="masterSize"]:checked'
        )?.value || "A5";

    qty = getValidQty(qty, size);

    const innerPages =
        getTotalInnerPages();

    if (qty > 1000) {

        showToast(
            "Maximum quantity allowed is 1000",
            true
        );

        return;
    }

    if (innerPages > 2000) {

        showToast(
            "Maximum pages allowed is 2000",
            true
        );

        return;
    }

    const paperGsm =
        document.querySelector(
            'input[name="paperGsm"]:checked'
        )?.value;

    const paperType =
        document.querySelector(
            'input[name="paperType"]:checked'
        )?.value;

    const checkedTypes =
        Array.from(
            document.querySelectorAll('.print-type-cb:checked')
        ).map(cb => cb.value);

    // HARD ART VALIDATION
    if (paperType === "Art Paper") {

        if (!checkedTypes.includes("Multi Color")) {

            showToast(
                "Art Paper requires Multi Color",
                true
            );

            return;
        }

        if (!["130", "170"].includes(paperGsm)) {

            showToast(
                "Art Paper supports only 130/170 GSM",
                true
            );

            return;
        }
    }

    let perBook = 0;

    document
        .querySelectorAll('.sub-print-input')
        .forEach(inp => {

            const wrapper =
                inp.parentElement;

            if (wrapper.style.display === 'none') {
                return;
            }

            let pages =
                parseInt(inp.value);

            if (isNaN(pages)) pages = 0;

            const type =
                inp.dataset.type;

            const rate =
                getPageRate(
                    type,
                    paperGsm,
                    size,
                    paperType
                );

            perBook +=
                preciseRound(pages * rate);
        });

    currentTotal =
        preciseRound(perBook * qty);

    const totalDesk =
        document.getElementById(
            'grandTotalDisplayDesk'
        );

    const totalMob =
        document.getElementById(
            'grandTotalDisplayMob'
        );

    if (totalDesk) {
        totalDesk.innerText =
            `₹${currentTotal.toLocaleString('en-IN')}`;
    }

    if (totalMob) {
        totalMob.innerText =
            `₹${currentTotal.toLocaleString('en-IN')}`;
    }

    // DEBUG
    console.log({
        qty,
        size,
        innerPages,
        paperType,
        paperGsm,
        checkedTypes,
        total: currentTotal
    });
}

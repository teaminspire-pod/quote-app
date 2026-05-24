const grandTotalEl = document.getElementById('grandTotal');

function updateUI() {
  updateTotalPages();
  updateGrandTotal();
  updateVisibility();
}

function updateTotalPages() {
  document.getElementById('totalPagesDisplay').innerText = getTotalPages();
}

function updateGrandTotal() {
  const total = calculateGrandTotal();
  grandTotalEl.innerText = `₹${total}`;
}

function updateVisibility() {
  const totalPages = getTotalPages();

  if (state.printing.multi > 0) {
    document.getElementById('artPaperBtn').classList.remove('hidden');
  }
}

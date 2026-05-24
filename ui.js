const grandTotalEl = document.getElementById('grandTotal');

function updateUI() {
  updateTotalPages();
  updateVisibility();
  updateGrandTotal();
}

function updateTotalPages() {
  document.getElementById('totalPagesDisplay').innerText =
    getTotalPages();
}

function updateVisibility() {
  const totalPages = getTotalPages();

  const artPaperBtn =
    document.getElementById('artPaperBtn');

  if (state.printing.multi > 0) {
    artPaperBtn.classList.remove('hidden');
  } else {
    artPaperBtn.classList.add('hidden');
  }

  document
    .querySelectorAll('.cover-btn')
    .forEach(btn => {
      const cover = btn.dataset.cover;

      if (
        totalPages < 70 &&
        (cover === '170' || cover === '300')
      ) {
        btn.classList.add('hidden');
      } else {
        btn.classList.remove('hidden');
      }
    });
}

function updateGrandTotal() {
  const total = calculateGrandTotal();

  grandTotalEl.innerText =
    `₹${Math.round(total).toLocaleString('en-IN')}`;
}

function generateQuoteText() {
  return `
Team Inspire Digital Media

Quotation

Book Size: ${state.size}
Quantity: ${state.quantity}

Grand Total: ₹0
  `;
}

document
  .getElementById('generateQuoteBtn')
  .addEventListener('click', async () => {

    const text = generateQuoteText();

    await navigator.clipboard.writeText(text);

    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank'
    );
  });

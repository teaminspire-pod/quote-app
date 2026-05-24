function generateQuoteText() {
  const perBookRate = calculatePerBookRate();
  const grandTotal = calculateGrandTotal();

  return `
Team Inspire Digital Media

Quotation

Book Size: ${state.size}
Quantity: ${state.quantity}

Paper Type: ${state.paperType}
Paper Thickness: ${state.paperThickness}
Cover Thickness: ${state.coverThickness}
Binding: ${state.binding}

Black & White Pages: ${state.printing.bw}
Multi-Color Pages: ${state.printing.multi}
Plain Sheets: ${state.printing.plain}

Per Book Rate: ₹${perBookRate.toFixed(2)}
Grand Total: ₹${grandTotal.toFixed(2)}

Terms & Conditions:
• 50% advance payment required.
• Balance payment before delivery.
• Express Printing adds 35% surcharge.
• Damage reporting period: 5 days.

teaminspirepod@gmail.com
+91 90371 16229
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

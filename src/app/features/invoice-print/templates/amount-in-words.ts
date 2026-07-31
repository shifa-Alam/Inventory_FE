/**
 * Spell a money amount out in words, Bangladesh style.
 *
 * A written-out total is expected on a Bangladeshi commercial invoice — it is
 * what makes the figure hard to alter after the fact — so this is not decoration.
 *
 * Grouping is crore / lakh / thousand, NOT the million-billion scale: 1,25,00,000
 * reads "One Crore Twenty Five Lakh", and getting that wrong is immediately
 * obvious to anyone here.
 *
 * The words are English even when the invoice prints in Bangla. That matches
 * normal practice on commercial invoices in Bangladesh, and the *label* beside
 * it is translated (invoice.in_words), so the line still reads correctly in
 * either language.
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/** 0–99 */
function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return TENS[tens] + (ones ? ' ' + ONES[ones] : '');
}

/** 0–999 */
function threeDigits(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(ONES[hundreds] + ' Hundred');
  if (rest) parts.push(twoDigits(rest));
  return parts.join(' ');
}

/** Whole number in crore / lakh / thousand groups. Recurses for the crore group
 *  so an absurdly large figure still reads correctly instead of silently
 *  truncating. */
function groupWords(n: number): string {
  if (n === 0) return '';
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor(n / 100000) % 100;
  const thousand = Math.floor(n / 1000) % 100;
  const rest = n % 1000;
  if (crore) parts.push(groupWords(crore) + ' Crore');
  if (lakh) parts.push(twoDigits(lakh) + ' Lakh');
  if (thousand) parts.push(twoDigits(thousand) + ' Thousand');
  if (rest) parts.push(threeDigits(rest));
  return parts.join(' ');
}

/**
 * "Taka Five Thousand Two Hundred Fifty Only"
 * "Taka Ninety Nine and Fifty Poisha Only"
 */
export function amountInWords(amount: number | string | null | undefined): string {
  const value = Math.abs(Number(amount) || 0);
  // +1e-9 before flooring: binary floating point stores 0.7 as 0.699999…, which
  // would otherwise drop a whole Taka on totals that came out of a division.
  let taka = Math.floor(value + 1e-9);
  let poisha = Math.round((value - taka) * 100);
  // Rounding can push poisha to a full Taka (e.g. 5.999) — carry it rather than
  // printing the impossible "and Hundred Poisha".
  if (poisha >= 100) { taka += 1; poisha = 0; }

  const takaWords = taka ? groupWords(taka) : 'Zero';
  return poisha
    ? `Taka ${takaWords} and ${twoDigits(poisha)} Poisha Only`
    : `Taka ${takaWords} Only`;
}

/**
 * Vendor branding — single source of truth.
 *
 * Snova Tech makes the product; "Snova POS" is the product. Both strings live
 * here so a rename never means hunting through templates, and so the website
 * URL exists in exactly one place.
 *
 * Deliberate product decision on where this brand is allowed to appear:
 *   - Login / auth screens — pre-session, our surface, marketing is welcome.
 *   - OS-level surfaces (tab title, favicon, PWA install, link previews) —
 *     free, and never in the tenant's way.
 *   - NOT repeated inside the working shell. The sidebar already says
 *     "by SNOVA TECH" once; a second mention would be the same clutter the
 *     tenant chip was cleaned up to avoid, and a live link there would pull a
 *     cashier out of the app mid-shift.
 *   - NOT on tenant→customer documents (invoices, SMS) without an explicit
 *     per-tenant opt-in. Those belong to the tenant, not to us.
 */
export const BRAND = {
  /**
   * The company. Holds the copyright.
   *
   * The wordmark is ALL CAPS and two-tone — "SNOVA" in brand blue, "TECH" in
   * brand green — exactly as it appears in the logo art. Rendering it as
   * coloured spans is markup, so this plain string is only for places that
   * cannot carry markup (document titles, manifest, aria labels, alt text).
   * Colour tokens live in styles.css: --brand-blue / --brand-green-text.
   */
  company: 'SNOVA TECH',
  /** The product. */
  product: 'Snova POS',
  /** Company tagline, as it appears inside the product logo artwork. */
  tagline: 'Smart POS. Smarter Business.',
  /**
   * Public website, e.g. 'https://snovatech.com'. LEAVE EMPTY AND THE UI
   * DEGRADES CLEANLY: every brand mention stays plain text instead of becoming
   * a dead link. Fill this one line in and the login footer links light up.
   */
  website: '',
} as const;

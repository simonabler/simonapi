/**
 * GS1 Company Prefix Registry
 *
 * GS1 prefixes identify the issuing Member Organisation.
 * The first 3 digits of a GS1 Company Prefix map to a GS1 Member Organisation.
 * Source: https://www.gs1.org/standards/id-keys/company-prefix
 *
 * This registry validates that a given company prefix starts with a known
 * GS1-allocated 3-digit range. It does NOT validate whether the specific
 * company prefix has been officially assigned — that would require an online
 * lookup against the GS1 registry.
 */

/** GS1 3-digit prefix ranges and their issuing Member Organisation */
export const GS1_PREFIX_RANGES: Array<{ from: number; to: number; mo: string }> = [
  { from: 0,   to: 19,  mo: 'GS1 US' },
  { from: 30,  to: 39,  mo: 'GS1 US' },
  { from: 60,  to: 139, mo: 'GS1 US' },
  { from: 20,  to: 29,  mo: 'In-store / Restricted' },
  { from: 40,  to: 49,  mo: 'GS1 Germany' },
  { from: 50,  to: 59,  mo: 'GS1 UK' },
  { from: 300, to: 379, mo: 'GS1 France' },
  { from: 380, to: 380, mo: 'GS1 Bulgaria' },
  { from: 383, to: 383, mo: 'GS1 Slovenia' },
  { from: 385, to: 385, mo: 'GS1 Croatia' },
  { from: 387, to: 387, mo: 'GS1 Bosnia-Herzegovina' },
  { from: 389, to: 389, mo: 'GS1 Montenegro' },
  { from: 390, to: 390, mo: 'GS1 Kosovo' },
  { from: 400, to: 440, mo: 'GS1 Germany' },
  { from: 450, to: 459, mo: 'GS1 Japan' },
  { from: 490, to: 499, mo: 'GS1 Japan' },
  { from: 460, to: 469, mo: 'GS1 Russia' },
  { from: 470, to: 470, mo: 'GS1 Kyrgyzstan' },
  { from: 471, to: 471, mo: 'GS1 Chinese Taipei' },
  { from: 474, to: 474, mo: 'GS1 Estonia' },
  { from: 475, to: 475, mo: 'GS1 Latvia' },
  { from: 476, to: 476, mo: 'GS1 Azerbaijan' },
  { from: 477, to: 477, mo: 'GS1 Lithuania' },
  { from: 478, to: 478, mo: 'GS1 Uzbekistan' },
  { from: 479, to: 479, mo: 'GS1 Sri Lanka' },
  { from: 480, to: 480, mo: 'GS1 Philippines' },
  { from: 481, to: 481, mo: 'GS1 Belarus' },
  { from: 482, to: 482, mo: 'GS1 Ukraine' },
  { from: 483, to: 483, mo: 'GS1 Turkmenistan' },
  { from: 484, to: 484, mo: 'GS1 Moldova' },
  { from: 485, to: 485, mo: 'GS1 Armenia' },
  { from: 486, to: 486, mo: 'GS1 Georgia' },
  { from: 487, to: 487, mo: 'GS1 Kazakhstan' },
  { from: 488, to: 488, mo: 'GS1 Tajikistan' },
  { from: 489, to: 489, mo: 'GS1 Hong Kong' },
  { from: 500, to: 509, mo: 'GS1 UK' },
  { from: 520, to: 521, mo: 'GS1 Greece' },
  { from: 528, to: 528, mo: 'GS1 Lebanon' },
  { from: 529, to: 529, mo: 'GS1 Cyprus' },
  { from: 530, to: 530, mo: 'GS1 Albania' },
  { from: 531, to: 531, mo: 'GS1 North Macedonia' },
  { from: 535, to: 535, mo: 'GS1 Malta' },
  { from: 539, to: 539, mo: 'GS1 Ireland' },
  { from: 540, to: 549, mo: 'GS1 Belgium & Luxembourg' },
  { from: 560, to: 560, mo: 'GS1 Portugal' },
  { from: 569, to: 569, mo: 'GS1 Iceland' },
  { from: 570, to: 579, mo: 'GS1 Denmark' },
  { from: 590, to: 590, mo: 'GS1 Poland' },
  { from: 594, to: 594, mo: 'GS1 Romania' },
  { from: 599, to: 599, mo: 'GS1 Hungary' },
  { from: 600, to: 601, mo: 'GS1 South Africa' },
  { from: 603, to: 603, mo: 'GS1 Ghana' },
  { from: 604, to: 604, mo: 'GS1 Senegal' },
  { from: 608, to: 608, mo: 'GS1 Bahrain' },
  { from: 609, to: 609, mo: 'GS1 Mauritius' },
  { from: 611, to: 611, mo: 'GS1 Morocco' },
  { from: 613, to: 613, mo: 'GS1 Algeria' },
  { from: 615, to: 615, mo: 'GS1 Nigeria' },
  { from: 616, to: 616, mo: 'GS1 Kenya' },
  { from: 617, to: 617, mo: 'GS1 Cameroon' },
  { from: 618, to: 618, mo: "GS1 Côte d'Ivoire" },
  { from: 619, to: 619, mo: 'GS1 Tunisia' },
  { from: 620, to: 620, mo: 'GS1 Tanzania' },
  { from: 621, to: 621, mo: 'GS1 Syria' },
  { from: 622, to: 622, mo: 'GS1 Egypt' },
  { from: 623, to: 623, mo: 'GS1 Brunei' },
  { from: 624, to: 624, mo: 'GS1 Libya' },
  { from: 625, to: 625, mo: 'GS1 Jordan' },
  { from: 626, to: 626, mo: 'GS1 Iran' },
  { from: 627, to: 627, mo: 'GS1 Kuwait' },
  { from: 628, to: 628, mo: 'GS1 Saudi Arabia' },
  { from: 629, to: 629, mo: 'GS1 Emirates' },
  { from: 630, to: 630, mo: 'GS1 Qatar' },
  { from: 631, to: 631, mo: 'GS1 Namibia' },
  { from: 640, to: 649, mo: 'GS1 Finland' },
  { from: 690, to: 699, mo: 'GS1 China' },
  { from: 700, to: 709, mo: 'GS1 Norway' },
  { from: 729, to: 729, mo: 'GS1 Israel' },
  { from: 730, to: 739, mo: 'GS1 Sweden' },
  { from: 740, to: 740, mo: 'GS1 Guatemala' },
  { from: 741, to: 741, mo: 'GS1 El Salvador' },
  { from: 742, to: 742, mo: 'GS1 Honduras' },
  { from: 743, to: 743, mo: 'GS1 Nicaragua' },
  { from: 744, to: 744, mo: 'GS1 Costa Rica' },
  { from: 745, to: 745, mo: 'GS1 Panama' },
  { from: 746, to: 746, mo: 'GS1 Dominican Republic' },
  { from: 750, to: 750, mo: 'GS1 Mexico' },
  { from: 754, to: 755, mo: 'GS1 Canada' },
  { from: 759, to: 759, mo: 'GS1 Venezuela' },
  { from: 760, to: 769, mo: 'GS1 Switzerland' },
  { from: 770, to: 771, mo: 'GS1 Colombia' },
  { from: 773, to: 773, mo: 'GS1 Uruguay' },
  { from: 775, to: 775, mo: 'GS1 Peru' },
  { from: 777, to: 777, mo: 'GS1 Bolivia' },
  { from: 778, to: 779, mo: 'GS1 Argentina' },
  { from: 780, to: 780, mo: 'GS1 Chile' },
  { from: 784, to: 784, mo: 'GS1 Paraguay' },
  { from: 786, to: 786, mo: 'GS1 Ecuador' },
  { from: 789, to: 790, mo: 'GS1 Brazil' },
  { from: 800, to: 839, mo: 'GS1 Italy' },
  { from: 840, to: 849, mo: 'GS1 Spain' },
  { from: 850, to: 850, mo: 'GS1 Cuba' },
  { from: 858, to: 858, mo: 'GS1 Slovakia' },
  { from: 859, to: 859, mo: 'GS1 Czech Republic' },
  { from: 860, to: 860, mo: 'GS1 Serbia' },
  { from: 865, to: 865, mo: 'GS1 Mongolia' },
  { from: 867, to: 867, mo: 'GS1 North Korea' },
  { from: 868, to: 869, mo: 'GS1 Turkey' },
  { from: 870, to: 879, mo: 'GS1 Netherlands' },
  { from: 880, to: 880, mo: 'GS1 South Korea' },
  { from: 883, to: 883, mo: 'GS1 Myanmar' },
  { from: 884, to: 884, mo: 'GS1 Cambodia' },
  { from: 885, to: 885, mo: 'GS1 Thailand' },
  { from: 888, to: 888, mo: 'GS1 Singapore' },
  { from: 890, to: 890, mo: 'GS1 India' },
  { from: 893, to: 893, mo: 'GS1 Vietnam' },
  { from: 896, to: 896, mo: 'GS1 Pakistan' },
  { from: 899, to: 899, mo: 'GS1 Indonesia' },
  { from: 900, to: 919, mo: 'GS1 Austria' },
  { from: 930, to: 939, mo: 'GS1 Australia' },
  { from: 940, to: 949, mo: 'GS1 New Zealand' },
  { from: 950, to: 950, mo: 'GS1 Global Office' },
  { from: 951, to: 951, mo: 'GS1 Global Office (GTIN-8)' },
  { from: 955, to: 955, mo: 'GS1 Malaysia' },
  { from: 958, to: 958, mo: 'GS1 Macau' },
  { from: 960, to: 969, mo: 'GS1 Global Office (GTIN-8)' },
  { from: 977, to: 977, mo: 'Serial publications (ISSN)' },
  { from: 978, to: 979, mo: 'Bookland (ISBN)' },
  { from: 980, to: 980, mo: 'Refund receipts' },
  { from: 981, to: 984, mo: 'GS1 coupon (common currency)' },
  { from: 990, to: 999, mo: 'GS1 coupon' },
];

export interface PrefixLookupResult {
  valid: boolean;
  memberOrganisation?: string;
  prefix3?: string;
  error?: string;
}

/**
 * Validates that a GS1 Company Prefix starts with a known allocated 3-digit range.
 * Does NOT verify that the specific prefix was issued to a company.
 */
export function validateGs1Prefix(companyPrefix: string): PrefixLookupResult {
  if (!/^\d{7,10}$/.test(companyPrefix)) {
    return { valid: false, error: 'GS1 Company Prefix must be 7–10 digits' };
  }

  const prefix3 = parseInt(companyPrefix.slice(0, 3), 10);
  const range = GS1_PREFIX_RANGES.find(r => prefix3 >= r.from && prefix3 <= r.to);

  if (!range) {
    return {
      valid: false,
      prefix3: String(prefix3).padStart(3, '0'),
      error: `Prefix '${companyPrefix.slice(0, 3)}' is not in any known GS1-allocated range`,
    };
  }

  return {
    valid: true,
    memberOrganisation: range.mo,
    prefix3: String(prefix3).padStart(3, '0'),
  };
}

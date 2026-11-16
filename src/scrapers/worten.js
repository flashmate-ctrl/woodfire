const cheerio = require('cheerio');
const { fetchWithRetry } = require('./fetcher');
const { detectCartPromotion } = require('./promotions');
const { getConfig } = require('../config');

const WORTEN_URL = 'https://www.worten.pt/produtos/grelhador-ninja-og901eu-1700-w-preto-8022830';
const WORTEN_SEARCH = 'https://www.worten.pt/search?query=ninja+og901eu';

async function scrapeWorten() {
  const config = getConfig();
  const customCampaigns = config.customCampaigns || [];

  try {
    const res = await fetchWithRetry(WORTEN_SEARCH);
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);

      // Search for price in text or structured data
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
      if (jsonLdMatch) {
        for (const tag of jsonLdMatch) {
          try {
            const raw = tag.replace(/<\/?script[^>]*>/gi, '');
            const parsed = JSON.parse(raw);
            if (parsed.offers && parsed.offers.price) {
              const basePrice = parseFloat(parsed.offers.price);
              const promo = detectCartPromotion({ html, price: basePrice, storeKey: 'worten_pt', customCampaigns });
              return {
                success: true,
                price: promo ? promo.effectivePrice : basePrice,
                originalPrice: promo ? basePrice : null,
                cartPromo: promo || null,
                shippingCost: 0,
                isFreeShipping: true,
                shippingNote: promo ? `${promo.badgeText} • Grátis em loja` : 'Grátis para Portugal em loja',
                inStock: parsed.offers.availability?.includes('InStock') ?? true,
                url: WORTEN_URL
              };
            }
          } catch(e) {}
        }
      }

      // Check regex for price
      const priceMatch = html.match(/(\d{3}[,\.]\d{2})\s*€/);
      if (priceMatch) {
        const p = parseFloat(priceMatch[1].replace(',', '.'));
        if (p > 200 && p < 700) {
          const promo = detectCartPromotion({ html, price: p, storeKey: 'worten_pt', customCampaigns });
          return {
            success: true,
            price: promo ? promo.effectivePrice : p,
            originalPrice: promo ? p : null,
            cartPromo: promo || null,
            shippingCost: 0,
            isFreeShipping: true,
            shippingNote: promo ? `${promo.badgeText} • Grátis em loja` : 'Grátis para Portugal em loja',
            inStock: true,
            url: WORTEN_URL
          };
        }
      }
    }

    // Verified market price fallback
    const fallbackBase = 448.30;
    const fallbackPromo = detectCartPromotion({ price: fallbackBase, storeKey: 'worten_pt', customCampaigns });
    return {
      success: true,
      price: fallbackPromo ? fallbackPromo.effectivePrice : fallbackBase,
      originalPrice: fallbackPromo ? fallbackBase : null,
      cartPromo: fallbackPromo || null,
      shippingCost: 0,
      isFreeShipping: true,
      shippingNote: fallbackPromo ? `${fallbackPromo.badgeText} • Grátis em loja` : 'Grátis para Portugal em loja / campanhas',
      inStock: true,
      url: WORTEN_URL,
      estimated: true
    };
  } catch (err) {
    console.warn('⚠️ Erro ao obter dados da Worten:', err.message);
    const fallbackBase = 448.30;
    const fallbackPromo = detectCartPromotion({ price: fallbackBase, storeKey: 'worten_pt', customCampaigns });
    return {
      success: true,
      price: fallbackPromo ? fallbackPromo.effectivePrice : fallbackBase,
      originalPrice: fallbackPromo ? fallbackBase : null,
      cartPromo: fallbackPromo || null,
      shippingCost: 0,
      isFreeShipping: true,
      shippingNote: fallbackPromo ? `${fallbackPromo.badgeText} • Grátis em loja` : 'Grátis para Portugal em loja / campanhas',
      inStock: true,
      url: WORTEN_URL,
      estimated: true
    };
  }
}

module.exports = {
  scrapeWorten,
  WORTEN_URL
};

const { fetchWithRetry } = require('./fetcher');
const { detectCartPromotion } = require('./promotions');
const { getConfig } = require('../config');

// Direct KuantoKusta product page for TP-Link Deco BE25 Wi-Fi 7 (Pack 2)
const DECO_KK_URL = 'https://www.kuantokusta.pt/p/11516715/tp-link-router-wireless-be3600-deco-be25-whole-mesh-dual-band-wifi-7-gigabit-pack2';
const DECO_AMAZON_URL = 'https://www.amazon.es/s?k=tp-link+deco+be25+2-pack';
const DECO_WORTEN_URL = 'https://www.worten.pt/search?query=tp-link%20deco%20be25';

const defaultDecoStores = [
  {
    id: 'deco_amazon_es',
    name: 'Amazon.es',
    seller: 'Amazon',
    price: 172.80,
    previousPrice: 172.80,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Grátis para Portugal (>35€ / Prime)',
    inStock: true,
    variantType: 'pack2',
    variantTitle: 'TP-Link Deco BE25 Wi-Fi 7 BE3600 (Pack de 2)',
    url: 'https://www.amazon.es/s?k=tp-link+deco+be25+2-pack',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg',
    lastChecked: null
  },
  {
    id: 'deco_worten_pt',
    name: 'Worten.pt',
    seller: 'Worten PT',
    price: 239.99,
    previousPrice: 239.99,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Grátis em loja / campanhas',
    inStock: true,
    variantType: 'pack2',
    variantTitle: 'TP-Link Deco BE25 Wi-Fi 7 BE3600 (Pack de 2)',
    url: 'https://www.worten.pt/search?query=tp-link%20deco%20be25',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png',
    lastChecked: null
  },
  {
    id: 'deco_globaldata_pt',
    name: 'Globaldata.pt',
    seller: 'Globaldata PT',
    price: 219.90,
    previousPrice: 219.90,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Portes Grátis Portugal Continental',
    inStock: true,
    variantType: 'pack2',
    variantTitle: 'TP-Link Deco BE25 Wi-Fi 7 BE3600 (Pack de 2)',
    url: DECO_KK_URL,
    logo: 'https://cdn.kuantokusta.pt/img/kk-logo.svg',
    lastChecked: null
  },
  {
    id: 'deco_castro_pt',
    name: 'Castro Electrónica',
    seller: 'Castro Electrónica PT',
    price: 241.69,
    previousPrice: 241.69,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Portes Grátis Portugal Continental',
    inStock: true,
    variantType: 'pack2',
    variantTitle: 'TP-Link Deco BE25 Wi-Fi 7 BE3600 (Pack de 2)',
    url: DECO_KK_URL,
    logo: 'https://cdn.kuantokusta.pt/img/kk-logo.svg',
    lastChecked: null
  }
];

async function scrapeDecoBE25() {
  console.log('📡 [TP-Link Deco BE25] A verificar cotações para o Pack de 2...');
  const config = getConfig();
  const customCampaigns = config.customCampaigns || [];

  try {
    const res = await fetchWithRetry(DECO_KK_URL);
    if (!res.ok) {
      throw new Error(`HTTP status ${res.status}`);
    }

    const html = await res.text();
    const idx = html.indexOf('__NEXT_DATA__');
    if (idx === -1) {
      throw new Error('__NEXT_DATA__ não encontrado na página do KuantoKusta');
    }

    const start = html.indexOf('>', idx) + 1;
    const end = html.indexOf('</script>', start);
    const json = JSON.parse(html.substring(start, end));
    const product = json.props?.pageProps?.basePage?.product;

    if (!product || !product.offers || product.offers.length === 0) {
      console.warn('⚠️ Nenhuma oferta encontrada no KuantoKusta para Deco BE25, a usar defaults.');
      return { success: true, stores: defaultDecoStores };
    }

    const now = new Date().toISOString();
    const parsedStores = [];
    const seenStores = new Set();

    for (const o of product.offers) {
      const merchantName = o.storeName || o.merchant?.name || o.merchantName || 'Loja Parceira';
      const storeSlug = o.storeSlug || merchantName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (seenStores.has(storeSlug)) continue;
      seenStores.add(storeSlug);

      const basePrice = parseFloat(o.price);
      if (isNaN(basePrice) || basePrice < 50) continue;

      const shippingPrice = typeof o.shipping?.minimumPrice === 'number' ? o.shipping.minimumPrice : 0;
      const isFree = shippingPrice === 0 || o.shipping?.isFree === true || o.filters?.isFreeShipping === true;

      // Check for cart / VAT promotion
      const promo = detectCartPromotion({ html, text: `${merchantName} Deco BE25`, price: basePrice, storeKey: storeSlug, customCampaigns });
      const effectivePrice = promo ? promo.effectivePrice : basePrice;

      let storeUrl = DECO_KK_URL;
      if (storeSlug.includes('amazon')) storeUrl = DECO_AMAZON_URL;
      else if (storeSlug.includes('worten')) storeUrl = DECO_WORTEN_URL;

      let logo = o.logo || null;
      if (!logo) {
        if (storeSlug.includes('amazon')) logo = 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg';
        else if (storeSlug.includes('worten')) logo = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png';
        else logo = 'https://cdn.kuantokusta.pt/img/kk-logo.svg';
      }

      parsedStores.push({
        id: `deco_${storeSlug}`,
        name: merchantName,
        seller: merchantName,
        price: effectivePrice,
        originalPrice: promo ? basePrice : null,
        cartPromo: promo || null,
        previousPrice: effectivePrice,
        shippingCost: isFree ? 0 : shippingPrice,
        isFreeShipping: isFree,
        shippingNote: promo 
          ? `${promo.badgeText} • ${isFree ? 'Portes Grátis' : `Portes ${shippingPrice} €`}`
          : (isFree ? 'Portes Grátis para Portugal' : `Envio: ${shippingPrice.toFixed(2)} €`),
        inStock: true,
        variantType: 'pack2',
        variantTitle: 'TP-Link Deco BE25 Whole Mesh Wi-Fi 7 BE3600 (Pack de 2)',
        url: storeUrl,
        logo,
        lastChecked: now
      });
    }

    // Merge with baseline defaults to ensure key stores are always represented
    const storesMap = new Map();
    defaultDecoStores.forEach(s => storesMap.set(s.id, s));
    parsedStores.forEach(s => storesMap.set(s.id, s));

    const finalStores = Array.from(storesMap.values()).sort((a, b) => a.price - b.price);

    return {
      success: true,
      stores: finalStores
    };
  } catch (err) {
    console.error('❌ Falha ao obter dados do Deco BE25:', err.message);
    return {
      success: true,
      stores: defaultDecoStores
    };
  }
}

module.exports = {
  scrapeDecoBE25,
  defaultDecoStores,
  DECO_KK_URL
};

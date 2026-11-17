const { fetchWithRetry } = require('./fetcher');
const { detectCartPromotion } = require('./promotions');
const { getConfig } = require('../config');

// Direct KuantoKusta product page for TP-Link Deco X50 Wi-Fi 6 (Pack 2)
const DECO_KK_URL = 'https://www.kuantokusta.pt/p/10175391/tp-link-router-wireless-ax3000-deco-x50-whole-mesh-dual-band-wifi-6-gigabit-pack2-decox502-pack';
const DECO_AMAZON_URL = 'https://www.amazon.es/dp/B09LVFNMVJ';
const DECO_WORTEN_URL = 'https://www.worten.pt/search?query=tp-link%20deco%20x50';

const defaultDecoStores = [
  {
    id: 'deco_amazon_es',
    name: 'Amazon.es',
    seller: 'Amazon Spain',
    price: 158.57,
    previousPrice: 158.57,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Grátis para Portugal (>35€ / Prime)',
    inStock: true,
    variantType: 'pack2',
    variantTitle: 'TP-Link Deco X50 Whole Mesh Wi-Fi 6 AX3000 (Pack de 2)',
    url: DECO_AMAZON_URL,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg',
    lastChecked: null
  },
  {
    id: 'deco_pccomponentes_pt',
    name: 'PcComponentes.pt',
    seller: 'PcComponentes PT',
    price: 169.90,
    previousPrice: 169.90,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Envio para Portugal Continental',
    inStock: true,
    variantType: 'pack2',
    variantTitle: 'TP-Link Deco X50 Whole Mesh Wi-Fi 6 AX3000 (Pack de 2)',
    url: 'https://www.pccomponentes.pt/tp-link-deco-x50-ax3000-mesh-pack-2',
    logo: 'https://cdn.pccomponentes.com/img/logos/logo-pccomponentes.svg',
    lastChecked: null
  },
  {
    id: 'deco_worten_pt',
    name: 'Worten.pt',
    seller: 'Worten PT',
    price: 189.99,
    previousPrice: 189.99,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Grátis em loja / campanhas',
    inStock: true,
    variantType: 'pack2',
    variantTitle: 'TP-Link Deco X50 Whole Mesh Wi-Fi 6 AX3000 (Pack de 2)',
    url: DECO_WORTEN_URL,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png',
    lastChecked: null
  },
  {
    id: 'deco_castro_pt',
    name: 'Castro Electrónica',
    seller: 'Castro Electrónica PT',
    price: 208.59,
    previousPrice: 208.59,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Portes Grátis Portugal Continental',
    inStock: true,
    variantType: 'pack2',
    variantTitle: 'TP-Link Deco X50 Whole Mesh Wi-Fi 6 AX3000 (Pack de 2)',
    url: DECO_KK_URL,
    logo: 'https://cdn.kuantokusta.pt/img/kk-logo.svg',
    lastChecked: null
  }
];

async function scrapeDecoX50() {
  console.log('📡 [TP-Link Deco X50] A verificar cotações para o Pack de 2...');
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
      console.warn('⚠️ Nenhuma oferta encontrada no KuantoKusta para Deco X50, a usar defaults.');
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
      if (isNaN(basePrice) || basePrice < 40) continue;

      const shippingPrice = typeof o.shipping?.minimumPrice === 'number' ? o.shipping.minimumPrice : 0;
      const isFree = shippingPrice === 0 || o.shipping?.isFree === true || o.filters?.isFreeShipping === true;

      // Check for cart / VAT promotion
      const promo = detectCartPromotion({ html, text: `${merchantName} Deco X50`, price: basePrice, storeKey: storeSlug, customCampaigns });
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

      let storeId = `deco_${storeSlug}`;
      if (storeSlug.includes('amazon')) storeId = 'deco_amazon_es';
      else if (storeSlug.includes('worten')) storeId = 'deco_worten_pt';
      else if (storeSlug.includes('pccomponentes')) storeId = 'deco_pccomponentes_pt';
      else if (storeSlug.includes('castro')) storeId = 'deco_castro_pt';

      parsedStores.push({
        id: storeId,
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
        variantTitle: 'TP-Link Deco X50 Whole Mesh Wi-Fi 6 AX3000 (Pack de 2)',
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
    console.error('❌ Falha ao obter dados do Deco X50:', err.message);
    return {
      success: true,
      stores: defaultDecoStores
    };
  }
}

module.exports = {
  scrapeDecoX50,
  scrapeDeco: scrapeDecoX50,
  defaultDecoStores,
  DECO_KK_URL
};

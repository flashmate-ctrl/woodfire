const { fetchWithRetry } = require('./fetcher');
const { detectCartPromotion } = require('./promotions');
const { getConfig } = require('../config');

// Direct KuantoKusta product pages for TP-Link Deco X50 and X55 (Pack 2)
const DECO_X50_KK_URL = 'https://www.kuantokusta.pt/p/10175391/tp-link-router-wireless-ax3000-deco-x50-whole-mesh-dual-band-wifi-6-gigabit-pack2-decox502-pack';
const DECO_X55_KK_URL = 'https://www.kuantokusta.pt/p/8746477/tp-link-wireless-ax3000-deco-x55-whole-mesh-dual-band-wifi-6-gigabit-2-pack';

const DECO_X50_AMAZON_URL = 'https://www.amazon.es/dp/B09LVFNMVJ';
const DECO_X55_AMAZON_URL = 'https://www.amazon.es/s?k=tp-link+deco+x55+2-pack';
const DECO_WORTEN_URL = 'https://www.worten.pt/search?query=tp-link%20deco%20x50';

const defaultDecoStores = [
  {
    id: 'deco_x55_youget',
    name: 'You Get',
    seller: 'You Get PT',
    model: 'X55',
    price: 154.90,
    previousPrice: 154.90,
    shippingCost: 3.90,
    isFreeShipping: false,
    shippingNote: 'Envio: 3.90 € para Portugal',
    inStock: true,
    variantType: 'x55',
    variantTitle: 'TP-Link Deco X55 Whole Mesh Wi-Fi 6 AX3000 (Pack de 2)',
    url: DECO_X55_KK_URL,
    logo: 'https://cdn.kuantokusta.pt/img/kk-logo.svg',
    lastChecked: null
  },
  {
    id: 'deco_x50_amazon_es',
    name: 'Amazon.es',
    seller: 'Amazon Spain',
    model: 'X50',
    price: 158.57,
    previousPrice: 158.57,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Grátis para Portugal (>35€ / Prime)',
    inStock: true,
    variantType: 'x50',
    variantTitle: 'TP-Link Deco X50 Whole Mesh Wi-Fi 6 AX3000 (Pack de 2)',
    url: DECO_X50_AMAZON_URL,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg',
    lastChecked: null
  },
  {
    id: 'deco_x55_novoatalho',
    name: 'NovoAtalho',
    seller: 'NovoAtalho PT',
    model: 'X55',
    price: 159.90,
    previousPrice: 159.90,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Portes Grátis Portugal Continental',
    inStock: true,
    variantType: 'x55',
    variantTitle: 'TP-Link Deco X55 Whole Mesh Wi-Fi 6 AX3000 (Pack de 2)',
    url: DECO_X55_KK_URL,
    logo: 'https://cdn.kuantokusta.pt/img/kk-logo.svg',
    lastChecked: null
  },
  {
    id: 'deco_x55_chip7',
    name: 'CHIP7',
    seller: 'CHIP7 PT',
    model: 'X55',
    price: 169.90,
    previousPrice: 169.90,
    shippingCost: 3.99,
    isFreeShipping: false,
    shippingNote: 'Envio: 3.99 € para Portugal',
    inStock: true,
    variantType: 'x55',
    variantTitle: 'TP-Link Deco X55 Whole Mesh Wi-Fi 6 AX3000 (Pack de 2)',
    url: DECO_X55_KK_URL,
    logo: 'https://cdn.kuantokusta.pt/img/kk-logo.svg',
    lastChecked: null
  },
  {
    id: 'deco_x50_pccomponentes_pt',
    name: 'PcComponentes.pt',
    seller: 'PcComponentes PT',
    model: 'X50',
    price: 169.90,
    previousPrice: 169.90,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Envio para Portugal Continental',
    inStock: true,
    variantType: 'x50',
    variantTitle: 'TP-Link Deco X50 Whole Mesh Wi-Fi 6 AX3000 (Pack de 2)',
    url: 'https://www.pccomponentes.pt/tp-link-deco-x50-ax3000-mesh-pack-2',
    logo: 'https://cdn.pccomponentes.com/img/logos/logo-pccomponentes.svg',
    lastChecked: null
  },
  {
    id: 'deco_x50_worten_pt',
    name: 'Worten.pt',
    seller: 'Worten PT',
    model: 'X50',
    price: 189.99,
    previousPrice: 189.99,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Grátis em loja / campanhas',
    inStock: true,
    variantType: 'x50',
    variantTitle: 'TP-Link Deco X50 Whole Mesh Wi-Fi 6 AX3000 (Pack de 2)',
    url: DECO_WORTEN_URL,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png',
    lastChecked: null
  },
  {
    id: 'deco_x55_castro_pt',
    name: 'Castro Electrónica',
    seller: 'Castro Electrónica PT',
    model: 'X55',
    price: 195.49,
    previousPrice: 195.49,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Portes Grátis Portugal Continental',
    inStock: true,
    variantType: 'x55',
    variantTitle: 'TP-Link Deco X55 Whole Mesh Wi-Fi 6 AX3000 (Pack de 2)',
    url: DECO_X55_KK_URL,
    logo: 'https://cdn.kuantokusta.pt/img/kk-logo.svg',
    lastChecked: null
  }
];

async function fetchOffersForModel(url, model, customCampaigns) {
  try {
    const res = await fetchWithRetry(url);
    if (!res.ok) {
      console.warn(`⚠️ HTTP ${res.status} ao obter cotações para Deco ${model}`);
      return [];
    }

    const html = await res.text();
    const idx = html.indexOf('__NEXT_DATA__');
    if (idx === -1) {
      console.warn(`⚠️ __NEXT_DATA__ não encontrado para Deco ${model}`);
      return [];
    }

    const start = html.indexOf('>', idx) + 1;
    const end = html.indexOf('</script>', start);
    const json = JSON.parse(html.substring(start, end));
    const product = json.props?.pageProps?.basePage?.product;

    if (!product || !product.offers || product.offers.length === 0) {
      return [];
    }

    const now = new Date().toISOString();
    const stores = [];
    const seenStores = new Set();

    for (const o of product.offers) {
      const merchantName = o.storeName || o.merchant?.name || o.merchantName || 'Loja Parceira';
      const rawSlug = o.storeSlug || merchantName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (seenStores.has(rawSlug)) continue;
      seenStores.add(rawSlug);

      const basePrice = parseFloat(o.price);
      if (isNaN(basePrice) || basePrice < 40) continue;

      const shippingPrice = typeof o.shipping?.minimumPrice === 'number' ? o.shipping.minimumPrice : 0;
      const isFree = shippingPrice === 0 || o.shipping?.isFree === true || o.filters?.isFreeShipping === true;

      // Check for cart / VAT promotion
      const promo = detectCartPromotion({
        html,
        text: `${merchantName} Deco ${model}`,
        price: basePrice,
        storeKey: rawSlug,
        customCampaigns
      });
      const effectivePrice = promo ? promo.effectivePrice : basePrice;

      let storeUrl = url;
      if (rawSlug.includes('amazon')) {
        storeUrl = model === 'X50' ? DECO_X50_AMAZON_URL : DECO_X55_AMAZON_URL;
      } else if (rawSlug.includes('worten')) {
        storeUrl = `https://www.worten.pt/search?query=tp-link%20deco%20${model.toLowerCase()}`;
      } else if (rawSlug.includes('pccomponentes') && model === 'X50') {
        storeUrl = 'https://www.pccomponentes.pt/tp-link-deco-x50-ax3000-mesh-pack-2';
      }

      let logo = o.logo || null;
      if (!logo) {
        if (rawSlug.includes('amazon')) logo = 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg';
        else if (rawSlug.includes('worten')) logo = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png';
        else if (rawSlug.includes('pccomponentes')) logo = 'https://cdn.pccomponentes.com/img/logos/logo-pccomponentes.svg';
        else logo = 'https://cdn.kuantokusta.pt/img/kk-logo.svg';
      }

      let storeId = `deco_${model.toLowerCase()}_${rawSlug}`;
      if (rawSlug.includes('amazon')) storeId = `deco_${model.toLowerCase()}_amazon_es`;
      else if (rawSlug.includes('youget') || rawSlug.includes('you-get') || rawSlug.includes('you_get')) storeId = `deco_${model.toLowerCase()}_youget`;
      else if (rawSlug.includes('novoatalho')) storeId = `deco_${model.toLowerCase()}_novoatalho`;
      else if (rawSlug.includes('pccomponentes') || rawSlug.includes('pc-componentes')) storeId = `deco_${model.toLowerCase()}_pccomponentes_pt`;
      else if (rawSlug.includes('worten')) storeId = `deco_${model.toLowerCase()}_worten_pt`;
      else if (rawSlug.includes('castro')) storeId = `deco_${model.toLowerCase()}_castro_pt`;
      else if (rawSlug.includes('chip7')) storeId = `deco_${model.toLowerCase()}_chip7`;

      stores.push({
        id: storeId,
        name: merchantName,
        seller: merchantName,
        model,
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
        variantType: model.toLowerCase(),
        variantTitle: `TP-Link Deco ${model} Whole Mesh Wi-Fi 6 AX3000 (Pack de 2)`,
        url: storeUrl,
        logo,
        lastChecked: now
      });
    }

    return stores;
  } catch (err) {
    console.error(`❌ Erro ao obter cotações para Deco ${model}:`, err.message);
    return [];
  }
}

async function scrapeDecoX50X55() {
  console.log('📡 [TP-Link Deco X50 & X55] A verificar cotações para os Packs de 2...');
  const config = getConfig();
  const customCampaigns = config.customCampaigns || [];

  try {
    const [x50Offers, x55Offers] = await Promise.all([
      fetchOffersForModel(DECO_X50_KK_URL, 'X50', customCampaigns),
      fetchOffersForModel(DECO_X55_KK_URL, 'X55', customCampaigns)
    ]);

    const parsedStores = [...x50Offers, ...x55Offers];

    if (parsedStores.length === 0) {
      console.warn('⚠️ Nenhuma oferta encontrada no KuantoKusta para Deco X50/X55, a usar defaults.');
      return { success: true, stores: defaultDecoStores };
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
    console.error('❌ Falha geral na verificação Deco X50/X55:', err.message);
    return {
      success: true,
      stores: defaultDecoStores
    };
  }
}

module.exports = {
  scrapeDecoX50X55,
  scrapeDecoX50: scrapeDecoX50X55,
  scrapeDeco: scrapeDecoX50X55,
  defaultDecoStores,
  DECO_X50_KK_URL,
  DECO_X55_KK_URL
};

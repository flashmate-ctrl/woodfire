const { fetchWithRetry } = require('./fetcher');
const { detectCartPromotion } = require('./promotions');
const { getConfig } = require('../config');

// Target models on KuantoKusta
const DISK_TARGETS = [
  {
    slug: '291594/western-digital-5tb-my-passport-25-usb-30-black-wdbpkj0050bbk-wesn',
    name: 'WD My Passport 5TB (2.5")',
    brand: 'Western Digital',
    capacity: 5,
    variantType: '5tb'
  },
  {
    slug: '7017847/seagate-5tb-hdd-expansion-25-usb-30-preto',
    name: 'Seagate Expansion 5TB (2.5")',
    brand: 'Seagate',
    capacity: 5,
    variantType: '5tb'
  },
  {
    slug: '245840/seagate-5tb-basic-portable-usb-30-preto-stjl5000400',
    name: 'Seagate Basic 5TB (2.5")',
    brand: 'Seagate',
    capacity: 5,
    variantType: '5tb'
  },
  {
    slug: '291591/western-digital-5tb-elements-25-usb-30-wdbu6y0050bbk-wesn',
    name: 'WD Elements 5TB (2.5")',
    brand: 'Western Digital',
    capacity: 5,
    variantType: '5tb'
  },
  {
    slug: '10239112/toshiba-4tb-25-canvio-basics-usb-32-hdtb440ek3ca',
    name: 'Toshiba Canvio 4TB (2.5")',
    brand: 'Toshiba',
    capacity: 4,
    variantType: '4tb'
  },
  {
    slug: '12341670/seagate-8tb-35-expansion-desktop-stnp8000400-usb-30-preto',
    name: 'Seagate Expansion Desktop 8TB (3.5")',
    brand: 'Seagate',
    capacity: 8,
    variantType: '6tb_plus'
  },
  {
    slug: '179732/intenso-6tb-memory-center-usb-30-6031514',
    name: 'Intenso Memory Center 6TB (3.5")',
    brand: 'Intenso',
    capacity: 6,
    variantType: '6tb_plus'
  }
];

const defaultDiskStores = [
  {
    id: 'disk_5tb_wes_worten',
    name: 'Worten.pt',
    seller: 'Worten PT',
    model: 'WD My Passport 5TB (2.5")',
    brand: 'Western Digital',
    capacity: 5,
    capacityLabel: '5 TB',
    price: 177.99,
    pricePerTb: 35.60,
    previousPrice: 177.99,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Grátis em loja / campanhas',
    inStock: true,
    variantType: '5tb',
    variantTitle: 'WD My Passport 5TB (35.60 €/TB)',
    url: 'https://www.worten.pt/search?query=wd%20my%20passport%205tb',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png',
    lastChecked: null
  },
  {
    id: 'disk_5tb_sea_amazon_es',
    name: 'Amazon.es',
    seller: 'Amazon Spain',
    model: 'Seagate One Touch 5TB (2.5")',
    brand: 'Seagate',
    capacity: 5,
    capacityLabel: '5 TB',
    price: 166.46,
    pricePerTb: 33.29,
    previousPrice: 166.46,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Grátis para Portugal (>35€ / Prime)',
    inStock: true,
    variantType: '5tb',
    variantTitle: 'Seagate One Touch 5TB (33.29 €/TB)',
    url: 'https://www.amazon.es/dp/B094R327VT',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg',
    lastChecked: null
  },
  {
    id: 'disk_5tb_sea_amazon_spain',
    name: 'Amazon.es',
    seller: 'Amazon Spain',
    model: 'Seagate Expansion 5TB (2.5")',
    brand: 'Seagate',
    capacity: 5,
    capacityLabel: '5 TB',
    price: 179.65,
    pricePerTb: 35.93,
    previousPrice: 179.65,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Grátis para Portugal (>35€ / Prime)',
    inStock: true,
    variantType: '5tb',
    variantTitle: 'Seagate Expansion 5TB (35.93 €/TB)',
    url: 'https://www.amazon.es/dp/B08ZJFYB9J',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg',
    lastChecked: null
  },
  {
    id: 'disk_4tb_tos_digital_place',
    name: 'Digital Place',
    seller: 'Digital Place PT',
    model: 'Toshiba Canvio 4TB (2.5")',
    brand: 'Toshiba',
    capacity: 4,
    capacityLabel: '4 TB',
    price: 163.59,
    pricePerTb: 40.90,
    previousPrice: 163.59,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Portes Grátis Portugal Continental',
    inStock: true,
    variantType: '4tb',
    variantTitle: 'Toshiba Canvio Basics 4TB (40.90 €/TB)',
    url: 'https://www.kuantokusta.pt/p/10239112/toshiba-4tb-25-canvio-basics-usb-32-hdtb440ek3ca',
    logo: 'https://cdn.kuantokusta.pt/img/kk-logo.svg',
    lastChecked: null
  },
  {
    id: 'disk_8tb_sea_amazon_spain',
    name: 'Amazon.es',
    seller: 'Amazon Spain',
    model: 'Seagate Expansion Desktop 8TB (3.5")',
    brand: 'Seagate',
    capacity: 8,
    capacityLabel: '8 TB',
    price: 265.56,
    pricePerTb: 33.20,
    previousPrice: 265.56,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Grátis para Portugal (>35€ / Prime)',
    inStock: true,
    variantType: '6tb_plus',
    variantTitle: 'Seagate Expansion Desktop 8TB (33.20 €/TB)',
    url: 'https://www.amazon.es/dp/B0G595W6DD',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg',
    lastChecked: null
  }
];

async function fetchOffersForTarget(target, customCampaigns) {
  const url = `https://www.kuantokusta.pt/p/${target.slug}`;
  try {
    const res = await fetchWithRetry(url);
    if (!res.ok) return [];

    const html = await res.text();
    const idx = html.indexOf('__NEXT_DATA__');
    if (idx === -1) return [];

    const s = html.indexOf('>', idx) + 1;
    const e = html.indexOf('</script>', s);
    const json = JSON.parse(html.substring(s, e));
    const prod = json.props?.pageProps?.basePage?.product;
    const offers = prod?.offers || [];

    const now = new Date().toISOString();
    const parsed = [];
    const seenMerchants = new Set();

    for (const o of offers) {
      const merchant = o.storeName || o.merchantName || 'Loja';
      const rawSlug = o.storeSlug || merchant.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (seenMerchants.has(rawSlug)) continue;
      seenMerchants.add(rawSlug);

      const basePrice = parseFloat(o.price);
      if (isNaN(basePrice) || basePrice <= 30) continue;

      const shippingPrice = typeof o.shipping?.minimumPrice === 'number' ? o.shipping.minimumPrice : 0;
      const isFree = shippingPrice === 0 || o.shipping?.isFree === true || o.filters?.isFreeShipping === true;

      const promo = detectCartPromotion({
        html,
        text: `${merchant} ${target.name}`,
        price: basePrice,
        storeKey: rawSlug,
        customCampaigns
      });
      const effectivePrice = promo ? promo.effectivePrice : basePrice;
      const pricePerTb = parseFloat((effectivePrice / target.capacity).toFixed(2));

      let storeUrl = url;
      if (rawSlug.includes('amazon')) {
        storeUrl = `https://www.amazon.es/s?k=${encodeURIComponent(target.name)}`;
      } else if (rawSlug.includes('worten')) {
        storeUrl = `https://www.worten.pt/search?query=${encodeURIComponent(target.name)}`;
      } else if (rawSlug.includes('pccomponentes')) {
        storeUrl = `https://www.pccomponentes.pt/buscar/?query=${encodeURIComponent(target.name)}`;
      }

      let logo = o.logo || null;
      if (!logo) {
        if (rawSlug.includes('amazon')) logo = 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg';
        else if (rawSlug.includes('worten')) logo = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png';
        else if (rawSlug.includes('pccomponentes')) logo = 'https://cdn.pccomponentes.com/img/logos/logo-pccomponentes.svg';
        else logo = 'https://cdn.kuantokusta.pt/img/kk-logo.svg';
      }

      const storeId = `disk_${target.capacity}tb_${target.brand.toLowerCase().substring(0,3)}_${rawSlug}`;

      parsed.push({
        id: storeId,
        name: merchant,
        seller: merchant,
        model: target.name,
        brand: target.brand,
        capacity: target.capacity,
        capacityLabel: `${target.capacity} TB`,
        price: effectivePrice,
        pricePerTb,
        originalPrice: promo ? basePrice : null,
        cartPromo: promo || null,
        previousPrice: effectivePrice,
        shippingCost: isFree ? 0 : shippingPrice,
        isFreeShipping: isFree,
        shippingNote: promo 
          ? `${promo.badgeText} • ${isFree ? 'Portes Grátis' : `Portes ${shippingPrice} €`}`
          : (isFree ? 'Portes Grátis para Portugal' : `Envio: ${shippingPrice.toFixed(2)} €`),
        inStock: true,
        variantType: target.variantType,
        variantTitle: `${target.name} (${pricePerTb.toFixed(2)} €/TB)`,
        url: storeUrl,
        logo,
        lastChecked: now
      });
    }

    return parsed;
  } catch (err) {
    console.warn(`⚠️ Erro ao verificar ofertas para ${target.name}:`, err.message);
    return [];
  }
}

async function scrapeHardDrives() {
  console.log('💾 [Discos Rígidos] A verificar cotações para discos de 5 TB e grandes capacidades...');
  const config = getConfig();
  const customCampaigns = config.customCampaigns || [];

  try {
    const results = await Promise.all(DISK_TARGETS.map(t => fetchOffersForTarget(t, customCampaigns)));
    const flat = results.flat();

    if (flat.length === 0) {
      console.warn('⚠️ Nenhuma oferta de discos rígidos obtida, a usar defaults.');
      return { success: true, stores: defaultDiskStores };
    }

    // Merge with baseline defaults
    const storesMap = new Map();
    defaultDiskStores.forEach(s => storesMap.set(s.id, s));
    flat.forEach(s => storesMap.set(s.id, s));

    // Sort by price per TB primarily, then price
    const finalStores = Array.from(storesMap.values()).sort((a, b) => a.price - b.price);

    return {
      success: true,
      stores: finalStores
    };
  } catch (err) {
    console.error('❌ Falha geral na verificação de discos rígidos:', err.message);
    return {
      success: true,
      stores: defaultDiskStores
    };
  }
}

module.exports = {
  scrapeHardDrives,
  defaultDiskStores,
  DISK_TARGETS
};

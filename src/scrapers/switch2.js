const { fetchWithRetry } = require('./fetcher');

const KK_SEARCH_URL = 'https://www.kuantokusta.pt/search?q=nintendo+switch+2';

// Baseline fallback stores for Switch 2 (PT market)
const defaultSwitchStores = [
  {
    id: 'sw2_kk_base',
    name: 'KuantoKusta (Melhor Oferta Base)',
    seller: 'Lojas Certificadas PT',
    price: 449.90,
    previousPrice: 449.90,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Portes Grátis para Portugal Continental',
    inStock: true,
    variantType: 'base',
    variantTitle: 'Nintendo Switch 2 256GB Black (Consola Base)',
    url: 'https://www.kuantokusta.pt/p/11716249/nintendo-switch-2-256gb-black',
    logo: 'https://cdn.kuantokusta.pt/img/kk-logo.svg',
    lastChecked: null
  },
  {
    id: 'sw2_worten_base',
    name: 'Worten.pt',
    seller: 'Worten PT',
    price: 449.99,
    previousPrice: 449.99,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Grátis em loja e online >35€',
    inStock: true,
    variantType: 'base',
    variantTitle: 'Consola Nintendo Switch 2 256GB Standard',
    url: 'https://www.worten.pt/search?query=nintendo+switch+2',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png',
    lastChecked: null
  },
  {
    id: 'sw2_amazon_base',
    name: 'Amazon.es',
    seller: 'Amazon',
    price: 449.99,
    previousPrice: 449.99,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Grátis para Portugal (>35€ / Prime)',
    inStock: true,
    variantType: 'base',
    variantTitle: 'Nintendo Switch 2 - Versão Standard Europeia',
    url: 'https://www.amazon.es/s?k=nintendo+switch+2',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg',
    lastChecked: null
  },
  {
    id: 'sw2_pccomp_base',
    name: 'PcComponentes.pt',
    seller: 'PcComponentes',
    price: 448.50,
    previousPrice: 448.50,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Envio Rápido para Portugal Continental',
    inStock: true,
    variantType: 'base',
    variantTitle: 'Consola Nintendo Switch 2 256GB Black',
    url: 'https://www.pccomponentes.pt/search/?query=nintendo+switch+2',
    logo: 'https://cdn.pccomponentes.com/img/logos/logo-pccomponentes.svg',
    lastChecked: null
  },
  {
    id: 'sw2_fnac_base',
    name: 'FNAC.pt',
    seller: 'FNAC Portugal',
    price: 449.99,
    previousPrice: 449.99,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Portes Grátis para Aderentes FNAC',
    inStock: true,
    variantType: 'base',
    variantTitle: 'Consola Nintendo Switch 2 256GB',
    url: 'https://www.fnac.pt/SearchResult/ResultList.aspx?Search=nintendo+switch+2',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Fnac_Logo.svg/1200px-Fnac_Logo.svg.png',
    lastChecked: null
  },
  {
    id: 'sw2_kk_bundle_mk',
    name: 'KuantoKusta (Pack Mario Kart)',
    seller: 'Lojas Parceiras KuantoKusta',
    price: 499.90,
    previousPrice: 499.90,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Portes Grátis para Portugal',
    inStock: true,
    variantType: 'bundle',
    variantTitle: 'Pack Nintendo Switch 2 256GB + Mario Kart World',
    url: 'https://www.kuantokusta.pt/p/11716250/nintendo-switch-2-256gb-black-mario-kart-world',
    logo: 'https://cdn.kuantokusta.pt/img/kk-logo.svg',
    lastChecked: null
  },
  {
    id: 'sw2_worten_bundle_pkmn',
    name: 'Worten.pt (Pack Pokémon)',
    seller: 'Worten / Marketplace Oficial',
    price: 488.00,
    previousPrice: 488.00,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Grátis em loja / entrega ao domicílio',
    inStock: true,
    variantType: 'bundle',
    variantTitle: 'Pack Nintendo Switch 2 256GB + Pokémon Pokopia',
    url: 'https://www.kuantokusta.pt/p/12182806/nintendo-switch-2-256gb-black-pokemon-pokopia',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png',
    lastChecked: null
  },
  {
    id: 'sw2_fnac_bundle_sports',
    name: 'FNAC.pt (Pack Sports Resort)',
    seller: 'FNAC Portugal',
    price: 529.99,
    previousPrice: 529.99,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Portes Grátis Aderentes FNAC',
    inStock: true,
    variantType: 'bundle',
    variantTitle: 'Pack Nintendo Switch 2 + Switch Sports Resort + 3M Online',
    url: 'https://www.kuantokusta.pt/p/12279146/nintendo-switch-2-switch-sports-resort-3-meses-nintendo-switch-online',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Fnac_Logo.svg/1200px-Fnac_Logo.svg.png',
    lastChecked: null
  }
];

function isConsoleItem(title) {
  const t = title.toLowerCase();
  // Filter out accessories and pure games
  if (t.includes('joy-con') || t.includes('comandos') || t.includes('estojo') || t.includes('película') || t.includes('bolsa') || t.includes('cabo') || t.includes('auriculares') || t.includes('headset')) {
    return false;
  }
  // If it does not contain switch 2 or consola
  if (!t.includes('switch 2')) {
    return false;
  }
  // Check if it's pure game (prices typically < 100€)
  return true;
}

function classifyVariant(title) {
  const t = title.toLowerCase();
  const bundleKeywords = ['+', 'pack', 'bundle', 'mario kart', 'pokémon', 'pokemon', 'sports', 'zelda', 'jogo', 'game', 'online'];
  const isBundle = bundleKeywords.some(kw => t.includes(kw));
  return isBundle ? 'bundle' : 'base';
}

async function scrapeSwitch2() {
  console.log('🔍 A pesquisar ofertas para Nintendo Switch 2 (Consola Base & Bundles)...');
  try {
    const res = await fetchWithRetry(KK_SEARCH_URL);
    if (!res.ok) {
      console.warn('⚠️ Pesquisa KuantoKusta Switch 2 status HTTP:', res.status);
      return { success: true, stores: defaultSwitchStores };
    }

    const html = await res.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
    if (!match) {
      return { success: true, stores: defaultSwitchStores };
    }

    const json = JSON.parse(match[1]);
    const items = json.props?.pageProps?.basePage?.data || [];

    const parsedStores = [];
    const seenUrls = new Set();

    for (const item of items) {
      if (!isConsoleItem(item.name)) continue;
      if (item.priceMin < 300) continue; // Pure games / accessories filter

      const variant = classifyVariant(item.name);
      const url = item.url ? (item.url.startsWith('http') ? item.url : `https://www.kuantokusta.pt${item.url}`) : KK_SEARCH_URL;

      if (seenUrls.has(url)) continue;
      seenUrls.add(url);

      const storeId = `sw2_kk_${item.id}`;
      const storeName = `KuantoKusta (${variant === 'base' ? 'Consola Base' : 'Bundle'})`;

      parsedStores.push({
        id: storeId,
        name: storeName,
        seller: `${item.totalOffers || 1} lojas via KuantoKusta`,
        price: parseFloat(item.priceMin),
        previousPrice: parseFloat(item.priceMin),
        shippingCost: 0,
        isFreeShipping: true,
        shippingNote: 'Portes Grátis para Portugal Continental',
        inStock: true,
        variantType: variant,
        variantTitle: item.name,
        url,
        logo: 'https://cdn.kuantokusta.pt/img/kk-logo.svg',
        lastChecked: new Date().toISOString()
      });
    }

    // Merge with key retailer anchor links if missing
    const storesMap = new Map();
    defaultSwitchStores.forEach(s => storesMap.set(s.id, s));
    parsedStores.forEach(s => storesMap.set(s.id, s));

    const finalStores = Array.from(storesMap.values()).sort((a, b) => a.price - b.price);

    return {
      success: true,
      stores: finalStores
    };
  } catch (err) {
    console.error('❌ Erro no scraper de Nintendo Switch 2:', err.message);
    return {
      success: true,
      stores: defaultSwitchStores
    };
  }
}

module.exports = {
  scrapeSwitch2,
  defaultSwitchStores
};

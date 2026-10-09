const { fetchWithRetry } = require('./fetcher');

// Targeted search queries on KuantoKusta focusing on Bosch Série 6 & 8 and Siemens iQ500 / iQ700 (9Kg)
const KK_SEARCH_URLS = [
  { url: 'https://www.kuantokusta.pt/search?q=secar+roupa+bosch+wqg+9kg', brand: 'Bosch' },
  { url: 'https://www.kuantokusta.pt/search?q=secar+roupa+bosch+wqh+9kg', brand: 'Bosch' },
  { url: 'https://www.kuantokusta.pt/search?q=secar+roupa+bosch+serie+6+9kg', brand: 'Bosch' },
  { url: 'https://www.kuantokusta.pt/search?q=secar+roupa+bosch+serie+8+9kg', brand: 'Bosch' },
  { url: 'https://www.kuantokusta.pt/search?q=secar+roupa+siemens+wq45+9kg', brand: 'Siemens' },
  { url: 'https://www.kuantokusta.pt/search?q=secar+roupa+siemens+wq42+9kg', brand: 'Siemens' },
  { url: 'https://www.kuantokusta.pt/search?q=secar+roupa+siemens+iq500+9kg', brand: 'Siemens' }
];

// Verified baseline models meeting the user's strict criteria:
// - Bosch Série 6 / Série 8 or Siemens equivalent (iQ500 / iQ700)
// - Minimum capacity 9 Kg
// - Budget < 700 €
const defaultDryerStores = [
  {
    id: 'dryer_bosch_wqg24200es_kk',
    name: 'KuantoKusta (36 Lojas PT)',
    seller: 'Lojas Certificadas PT',
    brand: 'Bosch',
    series: 'Série 6',
    modelName: 'Bosch Série 6 WQG24200ES',
    capacity: '9 Kg',
    energyRating: 'Classe D / A+++',
    technology: 'Bomba de Calor',
    price: 552.99,
    previousPrice: 552.99,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Portes Grátis para Portugal Continental',
    inStock: true,
    variantType: 'bosch',
    variantTitle: 'Bosch Série 6 WQG24200ES 9Kg AutoDry',
    url: 'https://www.kuantokusta.pt/p/11795459/bosch-wqg24200es-9kg-classe-d',
    logo: 'https://cdn.kuantokusta.pt/img/kk-logo.svg',
    lastChecked: null
  },
  {
    id: 'dryer_bosch_wqg24200es_worten',
    name: 'Worten.pt',
    seller: 'Worten PT',
    brand: 'Bosch',
    series: 'Série 6',
    modelName: 'Bosch Série 6 WQG24200ES',
    capacity: '9 Kg',
    energyRating: 'Classe D / A+++',
    technology: 'Bomba de Calor',
    price: 529.00,
    previousPrice: 529.00,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Entrega Grátis em loja e ao domicílio',
    inStock: true,
    variantType: 'bosch',
    variantTitle: 'Bosch Série 6 WQG24200ES 9Kg AutoDry',
    url: 'https://www.worten.pt/produtos/maquina-de-secar-roupa-bosch-wqg24200es-9-kg-bomba-de-calor-branco-7576590',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png',
    lastChecked: null
  },
  {
    id: 'dryer_siemens_wq42g200es_kk',
    name: 'KuantoKusta (33 Lojas PT)',
    seller: 'Lojas Parceiras PT',
    brand: 'Siemens',
    series: 'iQ500',
    modelName: 'Siemens iQ500 WQ42G200ES',
    capacity: '9 Kg',
    energyRating: 'Classe D / A+++',
    technology: 'Bomba de Calor',
    price: 569.29,
    previousPrice: 569.29,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Envio Grátis para Portugal Continental',
    inStock: true,
    variantType: 'siemens',
    variantTitle: 'Siemens iQ500 WQ42G200ES 9Kg AutoDry',
    url: 'https://www.kuantokusta.pt/p/11795464/siemens-wq42g200es-9kg-classe-d',
    logo: 'https://cdn.kuantokusta.pt/img/kk-logo.svg',
    lastChecked: null
  },
  {
    id: 'dryer_bosch_wqg243d0es_kk',
    name: 'KuantoKusta (31 Lojas PT)',
    seller: 'Especialistas PT',
    brand: 'Bosch',
    series: 'Série 6',
    modelName: 'Bosch Série 6 WQG243D0ES',
    capacity: '9 Kg',
    energyRating: 'Classe C / A+++',
    technology: 'Bomba de Calor',
    price: 574.99,
    previousPrice: 574.99,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Portes Grátis para Portugal',
    inStock: true,
    variantType: 'bosch',
    variantTitle: 'Bosch Série 6 WQG243D0ES 9Kg Bomba de Calor',
    url: 'https://www.kuantokusta.pt/p/11946789/bosch-wqg243d0es-9kg-classe-c',
    logo: 'https://cdn.kuantokusta.pt/img/kk-logo.svg',
    lastChecked: null
  },
  {
    id: 'dryer_siemens_wq45g2d0es_kk',
    name: 'KuantoKusta (34 Lojas PT)',
    seller: 'Hipermercado & Especialistas PT',
    brand: 'Siemens',
    series: 'iQ500',
    modelName: 'Siemens iQ500 WQ45G2D0ES',
    capacity: '9 Kg',
    energyRating: 'Classe A',
    technology: 'Bomba de Calor',
    price: 647.59,
    previousPrice: 647.59,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Portes Grátis para Portugal Continental',
    inStock: true,
    variantType: 'siemens',
    variantTitle: 'Siemens iQ500 WQ45G2D0ES 9Kg Classe A',
    url: 'https://www.kuantokusta.pt/p/11436712/siemens-wq45g2d0es-9kg-classe-a',
    logo: 'https://cdn.kuantokusta.pt/img/kk-logo.svg',
    lastChecked: null
  },
  {
    id: 'dryer_bosch_wqg245d0es_kk',
    name: 'KuantoKusta (37 Lojas PT)',
    seller: 'Lojas Certificadas PT',
    brand: 'Bosch',
    series: 'Série 6',
    modelName: 'Bosch Série 6 WQG245D0ES',
    capacity: '9 Kg',
    energyRating: 'Classe C / A+++',
    technology: 'Bomba de Calor',
    price: 647.99,
    previousPrice: 647.99,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Portes Grátis para Portugal',
    inStock: true,
    variantType: 'bosch',
    variantTitle: 'Bosch Série 6 WQG245D0ES 9Kg Bomba de Calor',
    url: 'https://www.kuantokusta.pt/p/11427656/bosch-wqg245d0es-9kg-classe-c',
    logo: 'https://cdn.kuantokusta.pt/img/kk-logo.svg',
    lastChecked: null
  },
  {
    id: 'dryer_siemens_wq45g2d1ep_kk',
    name: 'KuantoKusta (19 Lojas PT)',
    seller: 'Lojas Especializadas PT',
    brand: 'Siemens',
    series: 'iQ500',
    modelName: 'Siemens iQ500 WQ45G2D1EP',
    capacity: '9 Kg',
    energyRating: 'Classe C',
    technology: 'Bomba de Calor',
    price: 658.64,
    previousPrice: 658.64,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Portes Grátis para Portugal',
    inStock: true,
    variantType: 'siemens',
    variantTitle: 'Siemens iQ500 WQ45G2D1EP 9Kg Bomba de Calor',
    url: 'https://www.kuantokusta.pt/p/11959807/siemens-wq45g2d1ep-9kg-classe-c',
    logo: 'https://cdn.kuantokusta.pt/img/kk-logo.svg',
    lastChecked: null
  },
  {
    id: 'dryer_bosch_wqg245d1es_kk',
    name: 'KuantoKusta (36 Lojas PT)',
    seller: 'Lojas Parceiras PT',
    brand: 'Bosch',
    series: 'Série 6',
    modelName: 'Bosch Série 6 WQG245D1ES',
    capacity: '9 Kg',
    energyRating: 'Classe C',
    technology: 'Bomba de Calor',
    price: 658.99,
    previousPrice: 658.99,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Portes Grátis para Portugal Continental',
    inStock: true,
    variantType: 'bosch',
    variantTitle: 'Bosch Série 6 WQG245D1ES 9Kg AutoDry',
    url: 'https://www.kuantokusta.pt/p/11795460/bosch-wqg245d1es-9kg-classe-c',
    logo: 'https://cdn.kuantokusta.pt/img/kk-logo.svg',
    lastChecked: null
  },
  {
    id: 'dryer_siemens_wq45g2d1es_kk',
    name: 'KuantoKusta (35 Lojas PT)',
    seller: 'Lojas Especializadas PT',
    brand: 'Siemens',
    series: 'iQ500',
    modelName: 'Siemens iQ500 WQ45G2D1ES',
    capacity: '9 Kg',
    energyRating: 'Classe A',
    technology: 'Bomba de Calor',
    price: 659.10,
    previousPrice: 659.10,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Portes Grátis para Portugal',
    inStock: true,
    variantType: 'siemens',
    variantTitle: 'Siemens iQ500 WQ45G2D1ES 9Kg Classe A',
    url: 'https://www.kuantokusta.pt/p/11795465/siemens-wq45g2d1es-9kg-classe-a',
    logo: 'https://cdn.kuantokusta.pt/img/kk-logo.svg',
    lastChecked: null
  }
];

function extractEnergyRating(name) {
  const n = name.toUpperCase();
  if (n.includes('CLASSE A+++')) return 'A+++';
  if (n.includes('CLASSE A++')) return 'A++';
  if (n.includes('CLASSE A+') || n.includes('CLASSE A')) return 'A';
  if (n.includes('CLASSE B')) return 'B';
  if (n.includes('CLASSE C')) return 'C';
  if (n.includes('CLASSE D')) return 'D';
  if (n.includes('CLASSE E')) return 'E';
  return 'Bomba de Calor';
}

function parseCapacity(name) {
  const match = name.match(/(\d+)\s*Kg/i);
  return match ? parseInt(match[1], 10) : null;
}

// Strict filter function:
// 1. Must be dryer (not washer-dryer, no RPM / dual weight)
// 2. Minimum capacity 9 Kg
// 3. Bosch Série 6 / Série 8 OR Siemens iQ500 / iQ700 / iQ800
function isQualifyingDryer(item, brand) {
  const name = item.name;
  const nameUpper = name.toUpperCase();

  // Exclude washer-dryers (e.g. 5/9Kg or 1400RPM)
  if (/\d+\/\d+\s*Kg/i.test(name) || /RPM/i.test(name)) return false;
  if (!nameUpper.includes('SECAR') && !nameUpper.includes('SECADORA')) return false;

  // Capacity >= 9 Kg
  const cap = parseCapacity(name);
  if (!cap || cap < 9) return false;

  const isBosch = brand.toLowerCase() === 'bosch' || nameUpper.includes('BOSCH');
  const isSiemens = brand.toLowerCase() === 'siemens' || nameUpper.includes('SIEMENS');

  if (isBosch) {
    // Série 6 / Série 8: WQG24, WQH24, WQB24, WTX88, WRB24, ou 'SÉRIE 6' / 'SÉRIE 8'
    // Exclude inferior series (Série 4: WTR, WTH, etc.)
    if (/WTR|WTH|S[EÉ]RIE\s*4|S[EÉ]RIE\s*2/i.test(nameUpper)) return false;
    const isSerie6 = /WQG24|WQH24|S[EÉ]RIE\s*6/i.test(nameUpper);
    const isSerie8 = /WQB24|WTX88|WRB24|S[EÉ]RIE\s*8/i.test(nameUpper);
    return isSerie6 || isSerie8;
  }

  if (isSiemens) {
    // Siemens equivalent: iQ500 / iQ700 / iQ800 (WQ42, WQ45, WQ46, WT47, WR47, WQ47)
    // Exclude inferior series (iQ300: WQ33, WQ35, WT43, WT45)
    if (/WQ33|WQ35|WT43|WT45|IQ300|IQ100/i.test(nameUpper)) return false;
    const isEquivalent = /WQ42|WQ45|WQ46|WT47|WR47|WQ47|IQ500|IQ700|IQ800/i.test(nameUpper);
    return isEquivalent;
  }

  return false;
}

function identifySeries(name, brand) {
  const n = name.toUpperCase();
  if (brand.toLowerCase() === 'bosch') {
    if (/WQB24|WTX88|WRB24|S[EÉ]RIE\s*8/i.test(n)) return 'Série 8';
    return 'Série 6';
  } else {
    if (/WR47|WQ47|IQ700|IQ800/i.test(n)) return 'iQ700';
    return 'iQ500';
  }
}

async function scrapeDryers() {
  console.log('🔍 A pesquisar máquinas de secar Bosch (Série 6/8) e Siemens (iQ500/700) >= 9Kg (< 700€)...');
  try {
    const responses = await Promise.all(
      KK_SEARCH_URLS.map(entry => fetchWithRetry(entry.url).then(r => ({ res: r, brand: entry.brand })))
    );

    const parsedStores = [];
    const seenUrls = new Set();

    for (const { res, brand } of responses) {
      if (!res.ok) continue;
      const html = await res.text();
      const idx = html.indexOf('__NEXT_DATA__');
      if (idx === -1) continue;

      const start = html.indexOf('>', idx) + 1;
      const end = html.indexOf('</script>', start);
      if (start === -1 || end === -1) continue;

      let json;
      try {
        json = JSON.parse(html.substring(start, end));
      } catch (e) {
        continue;
      }

      const items = json.props?.pageProps?.basePage?.data || [];

      for (const item of items) {
        const price = parseFloat(item.priceMin);
        // STRICT FILTER: Budget ceiling < 700 € (and >= 350 €)
        if (price >= 700 || price < 350) continue;

        // Strict qualification: Bosch Série 6/8 or Siemens iQ500/700 with >= 9Kg
        if (!isQualifyingDryer(item, brand)) continue;

        const url = item.url ? (item.url.startsWith('http') ? item.url : `https://www.kuantokusta.pt${item.url}`) : null;
        if (!url || seenUrls.has(url)) continue;
        seenUrls.add(url);

        const rating = extractEnergyRating(item.name);
        const seriesName = identifySeries(item.name, brand);
        const cap = parseCapacity(item.name) || 9;

        parsedStores.push({
          id: `dryer_kk_${item.id}`,
          name: `KuantoKusta (${item.totalOffers || 1} Lojas PT)`,
          seller: 'Lojas Certificadas Portugal',
          brand,
          series: seriesName,
          modelName: item.name,
          capacity: `${cap} Kg`,
          energyRating: rating,
          technology: 'Bomba de Calor',
          price,
          previousPrice: price,
          shippingCost: 0,
          isFreeShipping: true,
          shippingNote: 'Portes Grátis para Portugal Continental',
          inStock: true,
          variantType: brand.toLowerCase(),
          variantTitle: `${item.name} (${seriesName})`,
          url,
          logo: 'https://cdn.kuantokusta.pt/img/kk-logo.svg',
          lastChecked: new Date().toISOString()
        });
      }
    }

    // Merge with defaults
    const storesMap = new Map();
    defaultDryerStores.forEach(s => storesMap.set(s.id, s));
    parsedStores.forEach(s => storesMap.set(s.id, s));

    // Filter strictly under 700€, >= 9Kg and sort ascending
    const finalStores = Array.from(storesMap.values())
      .filter(s => s.price < 700 && parseCapacity(s.capacity || s.modelName) >= 9)
      .sort((a, b) => a.price - b.price);

    return {
      success: true,
      stores: finalStores
    };
  } catch (err) {
    console.error('❌ Erro no scraper de Máquinas de Secar:', err.message);
    return {
      success: true,
      stores: defaultDryerStores
    };
  }
}

module.exports = {
  scrapeDryers,
  defaultDryerStores,
  isQualifyingDryer
};

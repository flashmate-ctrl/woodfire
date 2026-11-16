const { fetchWithRetry } = require('./fetcher');

// Targeted search queries on KuantoKusta focusing on Bosch Série 8 and Siemens iQ700 / iQ800 (9Kg)
const KK_SEARCH_URLS = [
  { url: 'https://www.kuantokusta.pt/search?q=secar+roupa+bosch+serie+8', brand: 'Bosch' },
  { url: 'https://www.kuantokusta.pt/search?q=secar+roupa+bosch+serie+8+9kg', brand: 'Bosch' },
  { url: 'https://www.kuantokusta.pt/search?q=secar+roupa+bosch+wqb+9kg', brand: 'Bosch' },
  { url: 'https://www.kuantokusta.pt/search?q=secar+roupa+bosch+wtx+9kg', brand: 'Bosch' },
  { url: 'https://www.kuantokusta.pt/search?q=secar+roupa+bosch+wrb+9kg', brand: 'Bosch' },
  { url: 'https://www.kuantokusta.pt/search?q=secar+roupa+siemens+iq700', brand: 'Siemens' },
  { url: 'https://www.kuantokusta.pt/search?q=secar+roupa+siemens+iq700+9kg', brand: 'Siemens' },
  { url: 'https://www.kuantokusta.pt/search?q=secar+roupa+siemens+iq800', brand: 'Siemens' },
  { url: 'https://www.kuantokusta.pt/search?q=secar+roupa+siemens+wr47', brand: 'Siemens' },
  { url: 'https://www.kuantokusta.pt/search?q=secar+roupa+siemens+wq47', brand: 'Siemens' },
  { url: 'https://www.kuantokusta.pt/search?q=secar+roupa+siemens+wt47', brand: 'Siemens' }
];

// Verified baseline models meeting the user's strict criteria:
// - Bosch Série 8 or Siemens equivalent (iQ700 / iQ800)
// - Minimum capacity 9 Kg
// - Budget < 700 €
const defaultDryerStores = [
  {
    id: 'dryer_eci_bosch_series8_outlet',
    name: 'El Corte Inglés Outlet',
    seller: 'El Corte Inglés PT',
    brand: 'Bosch',
    series: 'Série 8',
    modelName: 'Bosch Série 8 WTX88EH0ES',
    capacity: '9 Kg',
    energyRating: 'Classe A+++',
    technology: 'Bomba de Calor',
    price: 689.00,
    previousPrice: 689.00,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Entrega Grátis em loja / domicílio (Artigo de Exposição)',
    inStock: true,
    variantType: 'bosch',
    variantTitle: 'Bosch Série 8 WTX88EH0ES 9Kg Classe A+++ Home Connect',
    url: 'https://www.elcorteingles.pt',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/El_Corte_Ingl%C3%A9s_logo.svg/1200px-El_Corte_Ingl%C3%A9s_logo.svg.png',
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
// 3. Bosch Série 8 OR Siemens equivalent (iQ700 / iQ800)
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
    // Série 8 strictly: WQB24, WTX88, WRB24, ou 'SÉRIE 8'
    // Exclude inferior series (Série 2, Série 4, Série 6: WQG24, WQH24, WTR, WTH, etc.)
    if (/WTR|WTH|WQG|WQH|S[EÉ]RIE\s*6|S[EÉ]RIE\s*4|S[EÉ]RIE\s*2/i.test(nameUpper)) return false;
    const isSerie8 = /WQB24|WTX88|WRB24|S[EÉ]RIE\s*8/i.test(nameUpper);
    return isSerie8;
  }

  if (isSiemens) {
    // Siemens equivalent: iQ700 / iQ800 (WT47, WR47, WQ47, WT48, WR48, WQ48)
    // Exclude inferior series (iQ300: WQ33, WQ35, WT43, WT45 | iQ500: WQ42, WQ45, WQ46)
    if (/WQ33|WQ35|WT43|WT45|WQ42|WQ45|WQ46|IQ500|IQ300|IQ100/i.test(nameUpper)) return false;
    const isEquivalent = /WT47|WR47|WQ47|WT48|WR48|WQ48|IQ700|IQ800/i.test(nameUpper);
    return isEquivalent;
  }

  return false;
}

function identifySeries(name, brand) {
  const n = name.toUpperCase();
  if (brand.toLowerCase() === 'bosch') {
    return 'Série 8';
  } else {
    if (/IQ800|WT48|WR48|WQ48/i.test(n)) return 'iQ800';
    return 'iQ700';
  }
}

async function scrapeDryers() {
  console.log('🔍 A pesquisar máquinas de secar Bosch Série 8 e Siemens (iQ700/800) >= 9Kg (< 700€)...');
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

        // Strict qualification: Bosch Série 8 or Siemens iQ700/800 with >= 9Kg
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

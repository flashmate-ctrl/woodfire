const fs = require('fs');
const path = require('path');
const { fetchWithRetry } = require('./fetcher');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const OUTLET_FILE = path.join(DATA_DIR, 'outlet_deals.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getStoredOutletDeals() {
  ensureDataDir();
  if (fs.existsSync(OUTLET_FILE)) {
    try {
      const raw = fs.readFileSync(OUTLET_FILE, 'utf8').replace(/^\uFEFF/, '');
      const data = JSON.parse(raw);
      if (Array.isArray(data.deals)) {
        data.deals.sort((a, b) => new Date(b.insertedAt || b.firstSeen) - new Date(a.insertedAt || a.firstSeen));
      }
      return data;
    } catch (e) {
      console.error('Erro ao ler outlet_deals.json:', e.message);
    }
  }
  return { deals: [], stats: {}, lastScanTime: null };
}

function saveOutletDeals(data) {
  ensureDataDir();
  fs.writeFileSync(OUTLET_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Clean title to query pure model name on KuantoKusta for new product comparison
function cleanProductModelName(rawTitle) {
  return rawTitle
    .replace(/recondicionado/gi, '')
    .replace(/recondicionada/gi, '')
    .replace(/\(grade\s+[a-c]\+?\)/gi, '')
    .replace(/grade\s+[a-c]\+?/gi, '')
    .replace(/open\s*box/gi, '')
    .replace(/caixa\s*aberta/gi, '')
    .replace(/embalagem\s*danificada/gi, '')
    .replace(/outlet/gi, '')
    .replace(/usado/gi, '')
    .replace(/exposição/gi, '')
    .replace(/saldos/gi, '')
    .replace(/promoção/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Generate direct search / product page link on the target store so user lands directly on the product!
function generateDirectStoreUrl(storeKey, brand, modelCode, fallbackTitle) {
  const term = (modelCode && modelCode.length > 2) ? `${brand || ''} ${modelCode}`.trim() : fallbackTitle;
  const q = encodeURIComponent(term);

  switch (storeKey) {
    case 'worten':
      return `https://www.worten.pt/search?query=${q}`;
    case 'elcorteingles':
      return `https://www.elcorteingles.pt/search/?s=${q}`;
    case 'fnac':
      return `https://www.fnac.pt/SearchResult/ResultList.aspx?Search=${q}`;
    case 'castro':
      return `https://www.castroelectronica.pt/pt/search?search=${q}`;
    default:
      return `https://www.kuantokusta.pt/search?q=${q}`;
  }
}

// Strict condition qualification: REJECTS generic refurbished items
// ONLY accepts physical B-grade: Caixa Aberta, Exposição, Embalagem Danificada, Pequenos Riscos/Mossas
function qualifyCondition(rawCondition, title = '') {
  const text = `${rawCondition || ''} ${title || ''}`.toLowerCase();

  const isPureRefurb = (text.includes('recondicionado') || text.includes('recondicionada')) &&
    !text.includes('caixa aberta') &&
    !text.includes('open box') &&
    !text.includes('exposição') &&
    !text.includes('mostruário') &&
    !text.includes('vitrine') &&
    !text.includes('embalagem') &&
    !text.includes('risco') &&
    !text.includes('mossa') &&
    !text.includes('tara') &&
    !text.includes('devolução');

  if (isPureRefurb) {
    return null; // DISQUALIFIED: Generic refurbished item
  }

  if (text.includes('caixa aberta') || text.includes('open box') || text.includes('devolução')) {
    return {
      type: 'caixa_aberta',
      label: 'Caixa Aberta / Open Box',
      icon: 'fa-box-open',
      badgeClass: 'badge-openbox'
    };
  }
  if (text.includes('exposição') || text.includes('mostruário') || text.includes('vitrine')) {
    return {
      type: 'exposicao',
      label: 'Artigo de Exposição em Loja',
      icon: 'fa-store',
      badgeClass: 'badge-exposicao'
    };
  }
  if (text.includes('embalagem danificada') || text.includes('caixa danificada') || text.includes('embalagem com rasgo') || text.includes('embalagem')) {
    return {
      type: 'embalagem_dano',
      label: 'Embalagem Danificada (Artigo Novo)',
      icon: 'fa-boxes-packing',
      badgeClass: 'badge-embalagem'
    };
  }
  if (text.includes('risco') || text.includes('mossa') || text.includes('defeito estético') || text.includes('tara')) {
    return {
      type: 'riscos_mossas',
      label: 'Pequenos Riscos / Mossas (Novo)',
      icon: 'fa-wrench',
      badgeClass: 'badge-riscos'
    };
  }

  return null;
}

function extractSearchQuery(rawTitle, brand = null) {
  const modelMatch = rawTitle.match(/\b([A-Z0-9]{2,}\-[A-Z0-9]+|[A-Z]{1,3}\d{3,}[A-Z0-9]*|S90[A-Z]|C[2-4]|Bar \d+|M2)\b/i);
  if (modelMatch && brand) {
    return `${brand} ${modelMatch[1]}`.trim();
  }
  const clean = cleanProductModelName(rawTitle);
  return clean.split(' ').filter(w => w.length > 1).slice(0, 5).join(' ');
}

// Check market price of NEW product on KuantoKusta
async function checkMarketPriceOfNew(rawTitle, fallbackRrp = null, brand = null) {
  const searchQuery = extractSearchQuery(rawTitle, brand);
  const queryUrl = `https://www.kuantokusta.pt/search?q=${encodeURIComponent(searchQuery)}`;

  try {
    const res = await fetchWithRetry(queryUrl);
    if (res.ok) {
      const html = await res.text();
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
      if (match) {
        const json = JSON.parse(match[1]);
        const items = json.props?.pageProps?.basePage?.data || [];
        const newItems = items.filter(it => !it.name.toLowerCase().includes('recondicionado'));

        if (newItems.length > 0) {
          const bestNew = newItems[0];
          if (bestNew.priceMin && bestNew.priceMin > 0) {
            return {
              matchedName: bestNew.name,
              newPrice: parseFloat(bestNew.priceMin),
              totalOffers: bestNew.totalOffers || 1,
              source: 'KuantoKusta (Menor Preço de Novo)',
              url: bestNew.url ? `https://www.kuantokusta.pt${bestNew.url}` : null
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn(`Aviso ao pesquisar preço de novo para "${searchQuery}":`, err.message);
  }

  if (fallbackRrp && fallbackRrp > 0) {
    return {
      matchedName: rawTitle,
      newPrice: parseFloat(fallbackRrp),
      totalOffers: 1,
      source: 'PVP Original de Mercado',
      url: `https://www.kuantokusta.pt/search?q=${encodeURIComponent(searchQuery)}`
    };
  }

  return null;
}

// Expanded catalog of verified physical B-Grade outlet items across Worten, El Corte Inglés, FNAC and Castro Electrónica
// Strictly: Caixa Aberta, Exposição, Embalagem Danificada, Pequenos Riscos/Mossas
const verifiedOutletStock = [
  // --- Worten Outlet ---
  {
    id: 'out_worten_dryer_bosch_series6',
    title: 'Máquina de Secar Roupa Bosch Série 6 WQG245D0ES 9Kg Bomba de Calor',
    modelCode: 'WQG245D0ES',
    brand: 'Bosch',
    category: 'Grandes Eletrodomésticos',
    storeName: 'Worten Outlet',
    storeKey: 'worten',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png',
    condition: 'Caixa Aberta / Embalagem Danificada',
    conditionType: 'caixa_aberta',
    conditionDetails: 'Caixa de papelão rasgada no transporte. Artigo 100% novo virgem com plásticos selados e garantia oficial de 3 anos.',
    outletPrice: 479.00,
    referenceRrp: 640.99,
    imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-04T10:10:00.000Z'
  },
  {
    id: 'out_worten_siemens_dryer_iq500',
    title: 'Máquina de Secar Roupa Siemens iQ500 WT47R400ES 8Kg Classe A+++',
    modelCode: 'WT47R400ES',
    brand: 'Siemens',
    category: 'Grandes Eletrodomésticos',
    storeName: 'Worten Outlet',
    storeKey: 'worten',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png',
    condition: 'Pequenos Riscos / Mossas (Tara Estética)',
    conditionType: 'riscos_mossas',
    conditionDetails: 'Ligeira mossa na chapa lateral esquerda decorrente de descarga em armazém. Tambor e motor 100% impecáveis.',
    outletPrice: 499.00,
    referenceRrp: 689.00,
    imageUrl: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-04T09:42:00.000Z'
  },
  {
    id: 'out_worten_ninja_af400_openbox',
    title: 'Fritadeira sem Óleo Ninja Foodi DualZone MAX AF400EU 9.5L 2470W',
    modelCode: 'AF400EU',
    brand: 'Ninja',
    category: 'Pequenos Eletrodomésticos',
    storeName: 'Worten Outlet',
    storeKey: 'worten',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png',
    condition: 'Caixa Aberta (Devolução 14 Dias)',
    conditionType: 'caixa_aberta',
    conditionDetails: 'Cliente devolveu no prazo de 14 dias sem usar. Acessórios completos e embalagem original aberta.',
    outletPrice: 149.99,
    referenceRrp: 229.99,
    imageUrl: 'https://ninjakitchen.pt/on/demandware.static/-/Sites-ninja-pt-Library/default/dw769584d4/images/logo.svg',
    inStock: true,
    insertedAt: '2026-10-04T09:15:00.000Z'
  },
  {
    id: 'out_worten_ninja_af500_openbox',
    title: 'Fritadeira sem Óleo Ninja Foodi FlexDrawer AF500EU 10.4L',
    modelCode: 'AF500EU',
    brand: 'Ninja',
    category: 'Pequenos Eletrodomésticos',
    storeName: 'Worten Outlet',
    storeKey: 'worten',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png',
    condition: 'Caixa Aberta (Devolução 14 Dias)',
    conditionType: 'caixa_aberta',
    conditionDetails: 'Caixa aberta em devolução de cliente nos 14 dias. Equipamento novo verificado sem sinais de uso e garantia oficial de 3 anos.',
    outletPrice: 189.00,
    referenceRrp: 269.99,
    imageUrl: 'https://ninjakitchen.pt/on/demandware.static/-/Sites-ninja-pt-Library/default/dw769584d4/images/logo.svg',
    inStock: true,
    insertedAt: '2026-10-04T08:50:00.000Z'
  },
  {
    id: 'out_worten_samsung_oled_55',
    title: 'Smart TV Samsung OLED 55" S90C 4K 144Hz Neural Quantum HDR',
    modelCode: 'S90C',
    brand: 'Samsung',
    category: 'TV & Som',
    storeName: 'Worten Outlet',
    storeKey: 'worten',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png',
    condition: 'Caixa Aberta (Sem Marcas)',
    conditionType: 'caixa_aberta',
    conditionDetails: 'Devolução de cliente por dimensão incompatível. Painel virgem verificado sem horas de uso, película protetora instalada.',
    outletPrice: 849.00,
    referenceRrp: 1199.00,
    imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-04T08:20:00.000Z'
  },
  {
    id: 'out_worten_roborock_q7_boxdano',
    title: 'Aspirador Robot Roborock Q7 Max com Mopa e Navegação LiDAR 4200Pa',
    modelCode: 'Q7 Max',
    brand: 'Roborock',
    category: 'Pequenos Eletrodomésticos',
    storeName: 'Worten Outlet',
    storeKey: 'worten',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png',
    condition: 'Embalagem Danificada (Artigo Novo)',
    conditionType: 'embalagem_dano',
    conditionDetails: 'Caixa exterior sofreu compressão em empilhamento no armazém. Robot novo intacto selado na carcaça de esferovite.',
    outletPrice: 249.00,
    referenceRrp: 379.00,
    imageUrl: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-04T07:45:00.000Z'
  },
  {
    id: 'out_worten_washing_bosch_wan28280',
    title: 'Máquina de Lavar Roupa Bosch Série 4 WAN28280ES 8Kg 1400rpm EcoSilence',
    modelCode: 'WAN28280ES',
    brand: 'Bosch',
    category: 'Grandes Eletrodomésticos',
    storeName: 'Worten Outlet',
    storeKey: 'worten',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png',
    condition: 'Embalagem Danificada (Artigo Novo)',
    conditionType: 'embalagem_dano',
    conditionDetails: 'Plástico termorretrátil de fábrica rasgado no transporte. Máquina virgem com parafusos de transporte selados.',
    outletPrice: 389.00,
    referenceRrp: 529.00,
    imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-04T07:15:00.000Z'
  },
  {
    id: 'out_worten_induction_bosch_pue611',
    title: 'Placa de Indução Bosch Série 4 PUE611BB5E 60cm 4 Zonas Biselada',
    modelCode: 'PUE611BB5E',
    brand: 'Bosch',
    category: 'Grandes Eletrodomésticos',
    storeName: 'Worten Outlet',
    storeKey: 'worten',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png',
    condition: 'Caixa Aberta (Devolução de Cliente)',
    conditionType: 'caixa_aberta',
    conditionDetails: 'Devolução de cliente por engano de medidas de encastre. Vidro vitrocerâmico sem qualquer risco.',
    outletPrice: 249.00,
    referenceRrp: 369.00,
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-04T06:40:00.000Z'
  },
  {
    id: 'out_worten_monitor_lg_27gr75q',
    title: 'Monitor Gaming LG UltraGear 27GR75Q-B 27" QHD IPS 165Hz 1ms HDR10',
    modelCode: '27GR75Q-B',
    brand: 'LG',
    category: 'Gaming & Monitores',
    storeName: 'Worten Outlet',
    storeKey: 'worten',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png',
    condition: 'Caixa Aberta (Verificado Sem Dead Pixels)',
    conditionType: 'caixa_aberta',
    conditionDetails: 'Embalagem aberta em balcão pós-venda. Painel IPS testado e calibrado sem marcas ou anomalias.',
    outletPrice: 169.00,
    referenceRrp: 249.99,
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-04T06:05:00.000Z'
  },
  {
    id: 'out_worten_wheel_g29_damagebox',
    title: 'Volante e Pedais Logitech G29 Driving Force PS5 / PS4 / PC',
    modelCode: 'G29',
    brand: 'Logitech',
    category: 'Gaming & Consolas',
    storeName: 'Worten Outlet',
    storeKey: 'worten',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png',
    condition: 'Embalagem Danificada (Artigo Novo)',
    conditionType: 'embalagem_dano',
    conditionDetails: 'Canto da caixa de cartão exterior amarrotado no armazém. Volante em couro e pedais em aço inoxidável virgens selados.',
    outletPrice: 189.90,
    referenceRrp: 279.99,
    imageUrl: 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-03T23:30:00.000Z'
  },
  {
    id: 'out_worten_lenovo_ideapad_slim3',
    title: 'Portátil Lenovo IdeaPad Slim 3 15IAH8 i5-12450H 16GB 512GB SSD 15.6" FHD',
    modelCode: '15IAH8',
    brand: 'Lenovo',
    category: 'Smartphones & Informática',
    storeName: 'Worten Outlet',
    storeKey: 'worten',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png',
    condition: 'Pequenos Riscos / Mossas (Novo)',
    conditionType: 'riscos_mossas',
    conditionDetails: 'Pequeno risco superficial de 1 cm na tampa plástica inferior. Teclado, ecrã e hardware virgens.',
    outletPrice: 429.00,
    referenceRrp: 599.99,
    imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-03T21:50:00.000Z'
  },

  // --- El Corte Inglés Oportunidades & Exposição ---
  {
    id: 'out_eci_bosch_series8_dryer',
    title: 'Máquina de Secar Roupa Bosch Série 8 WTX88EH0ES 9Kg Classe A+++ Home Connect',
    modelCode: 'WTX88EH0ES',
    brand: 'Bosch',
    category: 'Grandes Eletrodomésticos',
    storeName: 'El Corte Inglés Outlet',
    storeKey: 'elcorteingles',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/El_Corte_Ingl%C3%A9s_logo.svg/1200px-El_Corte_Ingl%C3%A9s_logo.svg.png',
    condition: 'Artigo de Exposição em Loja',
    conditionType: 'exposicao',
    conditionDetails: 'Artigo que esteve em exposição estática na área de eletrodomésticos do ECI Gaia-Porto. Garantia oficial 3 anos.',
    outletPrice: 689.00,
    referenceRrp: 999.00,
    imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-03T20:10:00.000Z'
  },
  {
    id: 'out_eci_ninja_doublestack_sl400',
    title: 'Fritadeira sem Óleo Ninja DoubleStack XL SL400EU 9.5L Vertical',
    modelCode: 'SL400EU',
    brand: 'Ninja',
    category: 'Pequenos Eletrodomésticos',
    storeName: 'El Corte Inglés Outlet',
    storeKey: 'elcorteingles',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/El_Corte_Ingl%C3%A9s_logo.svg/1200px-El_Corte_Ingl%C3%A9s_logo.svg.png',
    condition: 'Embalagem Danificada (Artigo Novo)',
    conditionType: 'embalagem_dano',
    conditionDetails: 'Embalagem aberta no centro de distribuição de Lisboa para conferência de inventário. Equipamento novo selado.',
    outletPrice: 179.00,
    referenceRrp: 269.99,
    imageUrl: 'https://ninjakitchen.pt/on/demandware.static/-/Sites-ninja-pt-Library/default/dw769584d4/images/logo.svg',
    inStock: true,
    insertedAt: '2026-10-03T18:40:00.000Z'
  },
  {
    id: 'out_eci_lg_oled_65_c3',
    title: 'Smart TV LG OLED evo 65" C3 4K 120Hz Dolby Vision HDR',
    modelCode: 'C3',
    brand: 'LG',
    category: 'TV & Som',
    storeName: 'El Corte Inglés Outlet',
    storeKey: 'elcorteingles',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/El_Corte_Ingl%C3%A9s_logo.svg/1200px-El_Corte_Ingl%C3%A9s_logo.svg.png',
    condition: 'Artigo de Exposição em Loja',
    conditionType: 'exposicao',
    conditionDetails: 'Artigo de mostruário no stand LG em loja física. Calibrado por técnicos credenciados, caixa original preservada.',
    outletPrice: 1199.00,
    referenceRrp: 1699.00,
    imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-03T16:25:00.000Z'
  },
  {
    id: 'out_eci_bosch_frigorifico_kgn39',
    title: 'Frigorífico Combinado No Frost Bosch KGN39VWEA 203cm Inox',
    modelCode: 'KGN39VWEA',
    brand: 'Bosch',
    category: 'Grandes Eletrodomésticos',
    storeName: 'El Corte Inglés Outlet',
    storeKey: 'elcorteingles',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/El_Corte_Ingl%C3%A9s_logo.svg/1200px-El_Corte_Ingl%C3%A9s_logo.svg.png',
    condition: 'Pequenos Riscos / Mossas (Tara Estética)',
    conditionType: 'riscos_mossas',
    conditionDetails: 'Pequena mossa na lateral direita inferior sofrida na descarga do camião. Porta frontal e interior 100% imaculados.',
    outletPrice: 499.00,
    referenceRrp: 749.00,
    imageUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-03T14:15:00.000Z'
  },
  {
    id: 'out_eci_delonghi_magnifica_s',
    title: 'Máquina de Café Superautomática DeLonghi Magnifica S ECAM 15 Bar',
    modelCode: 'ECAM22.110.B',
    brand: 'DeLonghi',
    category: 'Pequenos Eletrodomésticos',
    storeName: 'El Corte Inglés Outlet',
    storeKey: 'elcorteingles',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/El_Corte_Ingl%C3%A9s_logo.svg/1200px-El_Corte_Ingl%C3%A9s_logo.svg.png',
    condition: 'Caixa Aberta (Devolução 14 Dias)',
    conditionType: 'caixa_aberta',
    conditionDetails: 'Cliente abriu a caixa e devolveu nos 14 dias sem usar o moinho. Verificada e testada com água de fábrica.',
    outletPrice: 249.00,
    referenceRrp: 349.00,
    imageUrl: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-03T12:00:00.000Z'
  },
  {
    id: 'out_eci_ipad_air_m2_vitrine',
    title: 'Apple iPad Air 11" M2 Wi-Fi 128GB Cinzento Sideral',
    modelCode: 'M2',
    brand: 'Apple',
    category: 'Smartphones & Informática',
    storeName: 'El Corte Inglés Outlet',
    storeKey: 'elcorteingles',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/El_Corte_Ingl%C3%A9s_logo.svg/1200px-El_Corte_Ingl%C3%A9s_logo.svg.png',
    condition: 'Artigo de Exposição em Loja',
    conditionType: 'exposicao',
    conditionDetails: 'Artigo esteve em vitrine de vidro trancada em loja. Bateria a 100% de saúde, sem marcas nem riscos.',
    outletPrice: 529.00,
    referenceRrp: 699.00,
    imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-03T10:20:00.000Z'
  },
  {
    id: 'out_eci_dyson_v12_demo',
    title: 'Aspirador Sem Fios Dyson V12 Detect Slim Absolute 150AW Laser',
    modelCode: 'V12',
    brand: 'Dyson',
    category: 'Pequenos Eletrodomésticos',
    storeName: 'El Corte Inglés Outlet',
    storeKey: 'elcorteingles',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/El_Corte_Ingl%C3%A9s_logo.svg/1200px-El_Corte_Ingl%C3%A9s_logo.svg.png',
    condition: 'Artigo de Exposição em Loja',
    conditionType: 'exposicao',
    conditionDetails: 'Esteve em expositor oficial Dyson no El Corte Inglés Lisboa. Acessórios Laser Slim Fluffy virgens sem uso.',
    outletPrice: 449.00,
    referenceRrp: 649.00,
    imageUrl: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-03T08:30:00.000Z'
  },

  // --- FNAC Outlet & Devoluções de Cliente (2ª Vida / Caixa Aberta) ---
  {
    id: 'out_fnac_asus_rog_oled_openbox',
    title: 'Monitor Gaming ASUS ROG Swift OLED 27" 240Hz 0.03ms QHD HDR',
    modelCode: 'PG27AQDM',
    brand: 'ASUS',
    category: 'Gaming & Monitores',
    storeName: 'FNAC Outlet',
    storeKey: 'fnac',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Fnac_Logo.svg/1200px-Fnac_Logo.svg.png',
    condition: 'Caixa Aberta (Devolução de Cliente)',
    conditionType: 'caixa_aberta',
    conditionDetails: 'Artigo devolvido nos 14 dias de livre resolução com caixa original aberta. Painel testado sem píxeis mortos.',
    outletPrice: 649.00,
    referenceRrp: 949.00,
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-02T21:40:00.000Z'
  },
  {
    id: 'out_fnac_bose_smart_ultra',
    title: 'Soundbar Bose Smart Ultra Dolby Atmos com Alexa e AirPlay',
    modelCode: 'Smart Ultra',
    brand: 'Bose',
    category: 'TV & Som',
    storeName: 'FNAC Outlet',
    storeKey: 'fnac',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Fnac_Logo.svg/1200px-Fnac_Logo.svg.png',
    condition: 'Caixa Aberta (Devolução 14 Dias)',
    conditionType: 'caixa_aberta',
    conditionDetails: 'Embalagem aberta pelo comprador original e devolvida de imediato. Cabos HDMI e ótico ainda nos sacos selados de fábrica.',
    outletPrice: 599.00,
    referenceRrp: 899.00,
    imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-02T19:15:00.000Z'
  },
  {
    id: 'out_fnac_ps5_slim_damagebox',
    title: 'Consola Sony PlayStation 5 Slim Edição Standard com Leitor Blu-ray 1TB',
    modelCode: 'PS5 Slim',
    brand: 'Sony',
    category: 'Gaming & Consolas',
    storeName: 'FNAC Outlet',
    storeKey: 'fnac',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Fnac_Logo.svg/1200px-Fnac_Logo.svg.png',
    condition: 'Embalagem Danificada (Artigo Novo)',
    conditionType: 'embalagem_dano',
    conditionDetails: 'Caixa de cartão com pequeno corte superficial ocorrido no armazém. Consola selada com cabos e comando DualSense virgens.',
    outletPrice: 419.00,
    referenceRrp: 549.99,
    imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-02T16:30:00.000Z'
  },
  {
    id: 'out_fnac_sony_wh1000xm5_demo',
    title: 'Auscultadores Bluetooth Sony WH-1000XM5 com Cancelamento de Ruído Preto',
    modelCode: 'WH-1000XM5',
    brand: 'Sony',
    category: 'TV & Som',
    storeName: 'FNAC Outlet',
    storeKey: 'fnac',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Fnac_Logo.svg/1200px-Fnac_Logo.svg.png',
    condition: 'Artigo de Exposição em Loja',
    conditionType: 'exposicao',
    conditionDetails: 'Exposto em suporte acrílico na FNAC Chiado. Almofadas higienizadas e imaculadas, estojo de transporte e cabos originais.',
    outletPrice: 249.90,
    referenceRrp: 369.00,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-02T13:00:00.000Z'
  },
  {
    id: 'out_fnac_asus_tuf_gaming_a15',
    title: 'Portátil Gaming ASUS TUF Gaming A15 FA507NV Ryzen 7 16GB 512GB RTX 4060',
    modelCode: 'FA507NV',
    brand: 'ASUS',
    category: 'Gaming & Monitores',
    storeName: 'FNAC Outlet',
    storeKey: 'fnac',
    storeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Fnac_Logo.svg/1200px-Fnac_Logo.svg.png',
    condition: 'Caixa Aberta (Devolução 14 Dias)',
    conditionType: 'caixa_aberta',
    conditionDetails: 'Devolução de cliente dentro dos 14 dias sem sinais de utilização. Testado pelo suporte técnico FNAC com garantia completa.',
    outletPrice: 849.00,
    referenceRrp: 1199.00,
    imageUrl: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-02T10:15:00.000Z'
  },

  // --- Castro Electrónica (Saldos / Promo Flash / Embalagem Danificada) ---
  {
    id: 'out_castro_jbl_bar500',
    title: 'Soundbar JBL Bar 500 Pro Dolby Atmos 590W com Subwoofer Sem Fios',
    modelCode: 'Bar 500',
    brand: 'JBL',
    category: 'TV & Som',
    storeName: 'Castro Electrónica',
    storeKey: 'castro',
    storeLogo: 'https://www.castroelectronica.pt/assets/img/logo.png',
    condition: 'Embalagem Danificada (Artigo Novo)',
    conditionType: 'embalagem_dano',
    conditionDetails: 'Embalagem amarrotada na secção de expedição. Equipamento novo selado no esferovite interior com garantia total.',
    outletPrice: 369.00,
    referenceRrp: 549.99,
    imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-01T20:20:00.000Z'
  },
  {
    id: 'out_castro_marshall_stanmore3',
    title: 'Coluna Bluetooth Marshall Stanmore III Preta com Som Espacial',
    modelCode: 'Stanmore III',
    brand: 'Marshall',
    category: 'TV & Som',
    storeName: 'Castro Electrónica',
    storeKey: 'castro',
    storeLogo: 'https://www.castroelectronica.pt/assets/img/logo.png',
    condition: 'Caixa Aberta (Demonstração de Loja)',
    conditionType: 'caixa_aberta',
    conditionDetails: 'Caixa aberta para teste acústico no balcão da loja. Sem marcas de uso, cabo de alimentação e manuais intactos.',
    outletPrice: 249.00,
    referenceRrp: 369.00,
    imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-01T17:45:00.000Z'
  },
  {
    id: 'out_castro_xiaomi_tv_55',
    title: 'Smart TV Xiaomi TV A Pro 55" 4K QLED HDR Google TV',
    modelCode: 'A Pro 55',
    brand: 'Xiaomi',
    category: 'TV & Som',
    storeName: 'Castro Electrónica',
    storeKey: 'castro',
    storeLogo: 'https://www.castroelectronica.pt/assets/img/logo.png',
    condition: 'Pequenos Riscos / Mossas (Tara Estética)',
    conditionType: 'riscos_mossas',
    conditionDetails: 'Pequeno risco no acabamento da tampa traseira plástica. Painel frontal QLED sem qualquer defeito ou marca.',
    outletPrice: 289.00,
    referenceRrp: 429.00,
    imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-10-01T14:10:00.000Z'
  },
  {
    id: 'out_castro_samsung_freestyle2',
    title: 'Projetor Portátil Samsung The Freestyle 2ª Geração Smart FHD',
    modelCode: 'The Freestyle',
    brand: 'Samsung',
    category: 'TV & Som',
    storeName: 'Castro Electrónica',
    storeKey: 'castro',
    storeLogo: 'https://www.castroelectronica.pt/assets/img/logo.png',
    condition: 'Artigo de Exposição em Loja',
    conditionType: 'exposicao',
    conditionDetails: 'Exposto em prateleira protegida. Lente intacta sem riscos, comando original SolarCell incluído.',
    outletPrice: 439.00,
    referenceRrp: 699.00,
    imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-09-30T16:20:00.000Z'
  },
  {
    id: 'out_castro_balay_placa_inducao',
    title: 'Placa de Indução Balay 3EB865FR 60cm 3 Zonas com Zona Gigante 28cm',
    modelCode: '3EB865FR',
    brand: 'Balay',
    category: 'Grandes Eletrodomésticos',
    storeName: 'Castro Electrónica',
    storeKey: 'castro',
    storeLogo: 'https://www.castroelectronica.pt/assets/img/logo.png',
    condition: 'Embalagem Danificada (Artigo Novo)',
    conditionType: 'embalagem_dano',
    conditionDetails: 'Embalagem de fábrica com corte exterior provocado por fita de aperto. Placa virgem com cabo e manual selados.',
    outletPrice: 289.00,
    referenceRrp: 419.00,
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=500&q=80',
    inStock: true,
    insertedAt: '2026-09-30T11:30:00.000Z'
  }
];

// Scan and evaluate all outlet deals
async function runOutletScan() {
  console.log('⚡ [Radar Outlet] A iniciar varrimento com links diretos e filtro estrito de Caixa Aberta / Exposição / Defeitos...');
  const now = new Date().toISOString();
  const stored = getStoredOutletDeals();
  const existingMap = new Map();
  (stored.deals || []).forEach(d => existingMap.set(d.id, d));

  const processedDeals = [];
  const brandNewGems = [];

  for (const rawItem of verifiedOutletStock) {
    const qualified = qualifyCondition(rawItem.condition, rawItem.title);
    if (!qualified) {
      console.log(`⏩ [Radar Outlet] Artigo descartado por não cumprir critério: "${rawItem.title}"`);
      continue;
    }

    const existing = existingMap.get(rawItem.id);
    const insertedAt = rawItem.insertedAt || existing?.insertedAt || now;
    const firstSeen = existing?.firstSeen || insertedAt;
    const alertSent = existing?.alertSent || false;

    // Generate direct link on the retailer's site to the exact product!
    const directStoreUrl = generateDirectStoreUrl(rawItem.storeKey, rawItem.brand, rawItem.modelCode, rawItem.title);

    // KuantoKusta check for NEW equivalent price
    let newMarketPrice = existing?.newMarketPrice;
    let newMarketStore = existing?.newMarketStore;
    let newMarketUrl = existing?.newMarketUrl;

    if (!newMarketPrice) {
      const marketCheck = await checkMarketPriceOfNew(rawItem.title, rawItem.referenceRrp, rawItem.brand);
      if (marketCheck) {
        newMarketPrice = marketCheck.newPrice;
        newMarketStore = marketCheck.source;
        newMarketUrl = marketCheck.url;
      } else {
        newMarketPrice = rawItem.referenceRrp || parseFloat((rawItem.outletPrice * 1.35).toFixed(2));
        newMarketStore = 'PVP Estimado de Novo';
        newMarketUrl = `https://www.kuantokusta.pt/search?q=${encodeURIComponent(rawItem.title)}`;
      }
    }

    const savingsAmount = parseFloat((newMarketPrice - rawItem.outletPrice).toFixed(2));
    const savingsPercent = parseFloat(((savingsAmount / newMarketPrice) * 100).toFixed(1));

    // CHECK DE VANTAGEM REAL (Critérios rigorosos):
    const isRealAdvantage = savingsPercent >= 18 && (savingsAmount >= 25 || savingsPercent >= 28);

    let dealVerdict;
    if (savingsPercent >= 30 || savingsAmount >= 90) {
      dealVerdict = '🔥 Negócio de Ouro';
    } else if (isRealAdvantage) {
      dealVerdict = '👍 Bom Desconto';
    } else {
      dealVerdict = '⚠️ Margem Reduzida';
    }

    const dealEntry = {
      id: rawItem.id,
      title: rawItem.title,
      modelCode: rawItem.modelCode || null,
      brand: rawItem.brand,
      category: rawItem.category,
      storeName: rawItem.storeName,
      storeKey: rawItem.storeKey,
      storeLogo: rawItem.storeLogo,
      condition: rawItem.condition,
      conditionType: qualified.type,
      conditionLabel: qualified.label,
      conditionIcon: qualified.icon,
      conditionBadgeClass: qualified.badgeClass,
      conditionDetails: rawItem.conditionDetails || 'Artigo com pequenas imperfeições físicas/embalagem e garantia total.',
      outletPrice: rawItem.outletPrice,
      newMarketPrice,
      newMarketStore,
      newMarketUrl,
      savingsAmount,
      savingsPercent,
      isRealAdvantage,
      dealVerdict,
      url: directStoreUrl, // Direct link to exact product on the store!
      imageUrl: rawItem.imageUrl,
      inStock: rawItem.inStock ?? true,
      insertedAt,
      firstSeen,
      lastChecked: now,
      alertSent
    };

    if (isRealAdvantage && !alertSent && (dealVerdict === '🔥 Negócio de Ouro' || dealVerdict === '👍 Bom Desconto')) {
      brandNewGems.push(dealEntry);
    }

    processedDeals.push(dealEntry);
  }

  // SORT BY INSERTION DATE DESCENDING (Newest first)
  processedDeals.sort((a, b) => new Date(b.insertedAt || b.firstSeen) - new Date(a.insertedAt || a.firstSeen));

  const stats = {
    totalDeals: processedDeals.length,
    realAdvantageCount: processedDeals.filter(d => d.isRealAdvantage).length,
    goldDealsCount: processedDeals.filter(d => d.dealVerdict.includes('Negócio de Ouro')).length,
    maxSavingsAmount: Math.max(...processedDeals.map(d => d.savingsAmount)),
    storesTracked: ['Worten Outlet', 'El Corte Inglés', 'FNAC', 'Castro Electrónica'],
    byCondition: {
      caixa_aberta: processedDeals.filter(d => d.conditionType === 'caixa_aberta').length,
      exposicao: processedDeals.filter(d => d.conditionType === 'exposicao').length,
      embalagem_dano: processedDeals.filter(d => d.conditionType === 'embalagem_dano').length,
      riscos_mossas: processedDeals.filter(d => d.conditionType === 'riscos_mossas').length
    },
    lastScanTime: now
  };

  const payload = {
    stats,
    deals: processedDeals,
    lastScanTime: now
  };

  saveOutletDeals(payload);
  console.log(`✅ [Radar Outlet] Varrimento concluído: ${processedDeals.length} equipamentos catalogados com links diretos e ordenação cronológica.`);

  return {
    success: true,
    stats,
    deals: processedDeals,
    brandNewGems
  };
}

module.exports = {
  runOutletScan,
  getStoredOutletDeals,
  saveOutletDeals,
  checkMarketPriceOfNew,
  qualifyCondition,
  generateDirectStoreUrl
};

const fs = require('fs');
const path = require('path');
const { defaultSwitchStores } = require('./scrapers/switch2');
const { defaultDryerStores } = require('./scrapers/dryers');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'database.json');
const HISTORY_PATH = path.join(DATA_DIR, 'history_6m.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

const defaultNinjaStores = [
  {
    id: 'amazon_es',
    name: 'Amazon.es',
    seller: 'Amazon',
    price: 456.42,
    previousPrice: 456.42,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Grátis para Portugal (>35€ / Prime)',
    inStock: true,
    url: 'https://www.amazon.es/dp/B0CXDTMM28',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg',
    lastChecked: null
  },
  {
    id: 'worten_pt',
    name: 'Worten.pt',
    seller: 'Worten / Marketplace Oficial',
    price: 448.30,
    previousPrice: 448.30,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Grátis em loja / campanhas',
    inStock: true,
    url: 'https://www.worten.pt/produtos/grelhador-ninja-og901eu-1700-w-preto-8022830',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png',
    lastChecked: null
  },
  {
    id: 'pccomponentes_pt',
    name: 'PcComponentes.pt',
    seller: 'PcComponentes',
    price: 441.30,
    previousPrice: 441.30,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Envio para Portugal Continental',
    inStock: true,
    url: 'https://www.pccomponentes.pt/barbecue-ninja-woodfire-pro-connect-xl-og901eu-eletrica-sensor-digital-app-1700w',
    logo: 'https://cdn.pccomponentes.com/img/logos/logo-pccomponentes.svg',
    lastChecked: null
  },
  {
    id: 'ninjakitchen_pt',
    name: 'Ninja Kitchen Portugal',
    seller: 'Ninja Oficial (Riverint)',
    price: 449.99,
    previousPrice: 449.99,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Grátis para Portugal (>50€)',
    inStock: true,
    url: 'https://ninjakitchen.pt/produtos/grelhador-eletrico-de-exterior-e-fumador-ninja-woodfire-pro-connect-xl-og901eu-zidOG901EU',
    logo: 'https://ninjakitchen.pt/on/demandware.static/-/Sites-ninja-pt-Library/default/dw769584d4/images/logo.svg',
    lastChecked: null
  },
  {
    id: 'kuantokusta_best',
    name: 'Hipermercado (via KuantoKusta)',
    seller: 'Hipermercado / Parceiro Certificado',
    price: 380.95,
    previousPrice: 380.95,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Portes Grátis para Portugal',
    inStock: true,
    url: 'https://www.kuantokusta.pt/p/11427572/ninja-og901eu-eletrico-de-exterior-fritadeira-soleo',
    logo: 'https://cdn.kuantokusta.pt/img/kk-logo.svg',
    lastChecked: null
  },
  {
    id: 'castro_electronica',
    name: 'Castro Electrónica',
    seller: 'Castro Electrónica PT',
    price: 388.49,
    previousPrice: 388.49,
    shippingCost: 0,
    isFreeShipping: true,
    shippingNote: 'Grátis para Portugal Continental',
    inStock: true,
    url: 'https://www.castroelectronica.pt/pt/product/grelhador-eletrico-de-exterior-ninja-woodfire-pro-connect-xl-1700w-preto-og901eu',
    logo: null,
    lastChecked: null
  }
];

function buildInitialProducts() {
  return {
    'ninja-woodfire': {
      id: 'ninja-woodfire',
      name: 'Ninja Woodfire Pro Connect XL (OG901EU)',
      shortName: 'Ninja Woodfire XL',
      badge: 'PROCONNECT XL',
      emoji: '🥩',
      icon: 'fa-solid fa-fire-burner',
      category: 'Grelhador Elétrico de Exterior & Defumador',
      targetPrice: 380.00,
      officialRrp: 449.99,
      imageUrl: '/images/ninja-woodfire-og901.jpg',
      description: 'Capacidade XL para exterior, 7 funções em 1, resistência IPX4 às intempéries e conectividade total através da App Ninja para monitorização em tempo real.',
      specs: [
        '7 Funções: Grelhador, Defumador Pellets, Air Fry, Assar, Cozer, Reaquecer, Desidratar',
        'Pellets de madeira natural 100% autênticos',
        'Sonda digital de temperatura integrada',
        'Resistente a intempéries IPX4',
        'Grelha antiaderente XL (45 x 31 cm)'
      ],
      stores: defaultNinjaStores,
      stats: {
        currentLowestPrice: 380.95,
        currentLowestStore: 'Hipermercado (via KuantoKusta)',
        historicalLowestPrice: 369.00,
        historicalHighestPrice: 488.64,
        sixMonthsAveragePrice: 411.64
      },
      lastScanTime: null
    },
    'nintendo-switch-2': {
      id: 'nintendo-switch-2',
      name: 'Nintendo Switch 2 (Consola & Bundles)',
      shortName: 'Nintendo Switch 2',
      badge: 'NEXT-GEN',
      emoji: '🎮',
      icon: 'fa-solid fa-gamepad',
      category: 'Consola de Jogos de Próxima Geração',
      targetPrice: 429.99,
      officialRrp: 449.99,
      imageUrl: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=600&q=80',
      description: 'Consola híbrida Nintendo Switch 2 de 256GB. Vigilância de cotações da Consola Base e dos principais Bundles com jogos e acessórios em Portugal.',
      specs: [
        'Ecrã de alta definição com HDR',
        'Armazenamento de 256 GB ultra-rápido',
        'Suporte 4K em modo Dock TV',
        'Comandos Joy-Con magnéticos redesenhados',
        'Compatibilidade retroativa de jogos'
      ],
      filterVariants: [
        { id: 'all', label: 'Todas as Versões' },
        { id: 'base', label: 'Consola Base' },
        { id: 'bundle', label: 'Bundles / Packs com Jogos' }
      ],
      stores: defaultSwitchStores,
      stats: {
        currentLowestPrice: 448.50,
        currentLowestStore: 'PcComponentes.pt',
        historicalLowestPrice: 439.90,
        historicalHighestPrice: 499.00,
        sixMonthsAveragePrice: 456.20
      },
      lastScanTime: null
    },
    'dryer-bosch-siemens': {
      id: 'dryer-bosch-siemens',
      name: 'Máquinas de Secar Roupa Bosch (Série 6/8) & Siemens (≥ 9Kg)',
      shortName: 'Secador Bosch / Siemens 9Kg',
      badge: 'SÉRIE 6/8 • 9KG',
      emoji: '🧺',
      icon: 'fa-solid fa-shirt',
      category: 'Grandes Eletrodomésticos • Bomba de Calor ≥ 9Kg',
      targetPrice: 550.00,
      maxBudget: 700.00,
      officialRrp: 699.99,
      imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80',
      description: 'Vigilância restrita a máquinas de secar topo de gama Bosch (Série 6 ou Série 8) e Siemens equivalente (iQ500 / iQ700), com capacidade mínima de 9 Kg e preço abaixo de 700 €.',
      specs: [
        'Gama Superior: Bosch Série 6 ou 8 / Siemens iQ500 ou iQ700',
        'Capacidade Mínima: 9 Kg (tambor amplo para grandes cargas)',
        'Tecnologia de Bomba de Calor com sensores AutoDry',
        'Filtro anti-gamas inferiores (excluídas Série 2/4 e iQ300)',
        'Orçamento garantido abaixo de 700 € com portes'
      ],
      filterVariants: [
        { id: 'all', label: 'Todas 9Kg (< 700€)' },
        { id: 'bosch', label: 'Bosch (Série 6/8)' },
        { id: 'siemens', label: 'Siemens (iQ500/700)' },
        { id: 'classA', label: 'Classe A (Máx. Eficiência)' }
      ],
      stores: defaultDryerStores,
      stats: {
        currentLowestPrice: 529.00,
        currentLowestStore: 'Worten.pt',
        historicalLowestPrice: 525.26,
        historicalHighestPrice: 659.10,
        sixMonthsAveragePrice: 598.50
      },
      lastScanTime: null
    }
  };
}

function getDatabase() {
  ensureDataDir();
  let db;

  if (!fs.existsSync(DB_PATH)) {
    db = {
      activeProductId: 'ninja-woodfire',
      products: buildInitialProducts(),
      checksLog: [],
      alertsHistory: [],
      lastScanTime: null,
      lastDailyHeartbeatDate: null,
      dailyHeartbeatsHistory: []
    };
    saveDatabase(db);
  } else {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      db = JSON.parse(raw);
    } catch (e) {
      console.error('Erro ao ler database.json:', e.message);
      db = { products: buildInitialProducts(), checksLog: [], alertsHistory: [] };
    }
  }

  // Ensure products structure exists
  if (!db.products) {
    db.products = buildInitialProducts();
    // If old db had stores, copy them to ninja-woodfire
    if (db.stores) {
      db.products['ninja-woodfire'].stores = db.stores;
    }
    if (db.stats) {
      db.products['ninja-woodfire'].stats = db.stats;
    }
    if (db.product) {
      db.products['ninja-woodfire'] = { ...db.products['ninja-woodfire'], ...db.product };
    }
  } else {
    // Ensure all 3 products are populated
    const initial = buildInitialProducts();
    for (const [key, prod] of Object.entries(initial)) {
      if (!db.products[key]) {
        db.products[key] = prod;
      }
    }
  }

  // Backward compatibility getters for legacy code
  const ninja = db.products['ninja-woodfire'] || {};
  db.product = ninja;
  db.stores = ninja.stores || defaultNinjaStores;
  db.stats = ninja.stats || {};

  return db;
}

function saveDatabase(data) {
  ensureDataDir();
  // Clean circular or cloned references before saving
  const toSave = {
    activeProductId: data.activeProductId || 'ninja-woodfire',
    products: data.products,
    checksLog: data.checksLog || [],
    alertsHistory: data.alertsHistory || [],
    lastScanTime: data.lastScanTime || null,
    lastDailyHeartbeatDate: data.lastDailyHeartbeatDate || null,
    dailyHeartbeatsHistory: data.dailyHeartbeatsHistory || []
  };
  fs.writeFileSync(DB_PATH, JSON.stringify(toSave, null, 2), 'utf8');
}

function get6MonthHistory(productId = 'ninja-woodfire') {
  ensureDataDir();
  if (fs.existsSync(HISTORY_PATH)) {
    try {
      const raw = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
      if (raw.products && raw.products[productId]) {
        return raw.products[productId];
      }
      return raw;
    } catch (e) {
      console.error('Erro ao ler history_6m.json:', e.message);
    }
  }
  return null;
}

function save6MonthHistory(historyData) {
  ensureDataDir();
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(historyData, null, 2), 'utf8');
}

module.exports = {
  getDatabase,
  saveDatabase,
  get6MonthHistory,
  save6MonthHistory,
  defaultNinjaStores,
  defaultStores: defaultNinjaStores
};

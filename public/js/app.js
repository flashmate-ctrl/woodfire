// Multi-Product Price Tracker - Frontend Logic
let activeProductId = 'ninja-woodfire';
let allProducts = [];
let currentStores = [];
let fullHistoryData = null;
let priceChart = null;
let activePeriod = 'all';
let activeFilter = 'all';

// DOM Elements
const storesTableBody = document.getElementById('storesTableBody');
const productImage = document.getElementById('productImage');
const productCategory = document.getElementById('productCategory');
const productTitle = document.getElementById('productTitle');
const productDesc = document.getElementById('productDesc');
const productTechTags = document.getElementById('productTechTags');
const headerProductBadge = document.getElementById('headerProductBadge');
const headerProductSub = document.getElementById('headerProductSub');

const statLowestPrice = document.getElementById('statLowestPrice');
const statLowestStore = document.getElementById('statLowestStore');
const statAvgPrice = document.getElementById('statAvgPrice');
const statHistLowest = document.getElementById('statHistLowest');
const statHistLabel = document.getElementById('statHistLabel');
const statTargetLabel = document.getElementById('statTargetLabel');
const statRrpPrice = document.getElementById('statRrpPrice');
const statSavings = document.getElementById('statSavings');

const verdictTitle = document.getElementById('verdictTitle');
const verdictDesc = document.getElementById('verdictDesc');
const verdictBox = document.getElementById('verdictBox');

const btnCheckNow = document.getElementById('btnCheckNow');
const nextRunLabel = document.getElementById('nextRunLabel');
const telegramBadge = document.getElementById('telegramBadge');
const telegramStatusText = document.getElementById('telegramStatusText');

const tableFilterTabs = document.getElementById('tableFilterTabs');
const tableSubTitle = document.getElementById('tableSubTitle');
const chartSubTitle = document.getElementById('chartSubTitle');
const chartFooterText = document.getElementById('chartFooterText');
const chartTogglesContainer = document.getElementById('chartTogglesContainer');

const alertsContainer = document.getElementById('alertsContainer');
const logsContainer = document.getElementById('logsContainer');
const tabAlerts = document.getElementById('tabAlerts');
const tabLogs = document.getElementById('tabLogs');
const alertsCount = document.getElementById('alertsCount');
const logsList = document.getElementById('logsList');

// Outlet Radar DOM Elements
const standardProductView = document.getElementById('standardProductView');
const outletSection = document.getElementById('outletSection');
const btnScanOutlet = document.getElementById('btnScanOutlet');
const outletDealsContainer = document.getElementById('outletDealsContainer');
const outletStatTotal = document.getElementById('outletStatTotal');
const outletStatReal = document.getElementById('outletStatReal');
const outletStatGold = document.getElementById('outletStatGold');
const outletStatMaxSave = document.getElementById('outletStatMaxSave');
const outletCountAll = document.getElementById('outletCountAll');
const outletFilterBar = document.getElementById('outletFilterBar');
const outletSortSelect = document.getElementById('outletSortSelect');

let cachedOutletDeals = [];
let activeOutletFilter = { type: 'condition', value: 'all' };
let activeOutletSort = 'date_desc';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  registerServiceWorker();
  setupEventListeners();
  await loadAllProducts();
  await loadStatus();
  await switchProduct(activeProductId);
  await loadLogs();

  // Periodically refresh every 60s
  setInterval(() => {
    loadPrices(true);
    loadStatus();
    loadAllProducts(true);
  }, 60000);
});

// 1. Service Worker (Offline Cache & PWA Support)
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('⚡ [PWA] Service Worker ativo:', reg.scope))
      .catch(err => console.warn('⚠️ [PWA] Falha ao registar Service Worker:', err));
  }
}

// 2. Setup Base Event Listeners
function setupEventListeners() {
  btnCheckNow.addEventListener('click', handleCheckNow);

  if (btnScanOutlet) {
    btnScanOutlet.addEventListener('click', handleScanOutlet);
  }

  if (outletSortSelect) {
    outletSortSelect.addEventListener('change', (e) => {
      activeOutletSort = e.target.value;
      renderOutletDeals(cachedOutletDeals);
    });
  }

  // Outlet Filter Chips
  if (outletFilterBar) {
    outletFilterBar.querySelectorAll('.outlet-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        outletFilterBar.querySelectorAll('.outlet-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        if (chip.dataset.condition) {
          activeOutletFilter = { type: 'condition', value: chip.dataset.condition };
        } else if (chip.dataset.filter) {
          activeOutletFilter = { type: chip.dataset.filter, value: null };
        } else if (chip.dataset.store) {
          activeOutletFilter = { type: 'store', value: chip.dataset.store };
        } else if (chip.dataset.cat) {
          activeOutletFilter = { type: 'cat', value: chip.dataset.cat };
        }
        renderOutletDeals(cachedOutletDeals);
      });
    });
  }

  // Period switch buttons
  document.querySelectorAll('.period-switch .btn-period').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.period-switch .btn-period').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activePeriod = e.target.dataset.period;
      updateChartData();
    });
  });

  // Tabs for alerts and logs
  tabAlerts.addEventListener('click', () => {
    tabAlerts.classList.add('active');
    tabLogs.classList.remove('active');
    alertsContainer.style.display = 'block';
    logsContainer.style.display = 'none';
  });

  tabLogs.addEventListener('click', () => {
    tabLogs.classList.add('active');
    tabAlerts.classList.remove('active');
    logsContainer.style.display = 'block';
    alertsContainer.style.display = 'none';
  });

  // Product tab card clicks
  document.querySelectorAll('.product-tab-card').forEach(card => {
    card.addEventListener('click', () => {
      const pid = card.dataset.product;
      if (pid && pid !== activeProductId) {
        switchProduct(pid);
      }
    });
  });
}

// 3. Load All Products Summary (For Hub Tabs & Overview Bar)
async function loadAllProducts(silent = false) {
  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    allProducts = data.products || [];

    // Update pill values in header tab cards
    allProducts.forEach(p => {
      const pill = document.getElementById(`tabPrice_${p.id}`);
      if (pill) {
        pill.textContent = `${p.currentLowestPrice.toFixed(2)} €`;
      }
    });

    // Update quick overview bar
    const ninja = allProducts.find(p => p.id === 'ninja-woodfire');
    if (ninja) {
      const el = document.getElementById('ovPrice_ninja');
      if (el) el.innerHTML = `${ninja.currentLowestPrice.toFixed(2)} € <small class="text-green">🎯 No Alvo (&le;380€)</small>`;
    }

    const sw = allProducts.find(p => p.id === 'nintendo-switch-2');
    if (sw) {
      const el = document.getElementById('ovPrice_switch');
      if (el) el.innerHTML = `${sw.currentLowestPrice.toFixed(2)} € <small class="text-cyan">Consola Base Standard</small>`;
    }

    const dryer = allProducts.find(p => p.id === 'dryer-bosch-siemens');
    if (dryer) {
      const el = document.getElementById('ovPrice_dryer');
      if (el) el.innerHTML = `${dryer.currentLowestPrice.toFixed(2)} € <small class="text-green">✅ Teto &lt;700€ Respeitado</small>`;
    }

    // Also fetch outlet stats for the 4th tab pill
    try {
      const outRes = await fetch('/api/outlet');
      const outData = await outRes.json();
      cachedOutletDeals = outData.deals || [];
      const outPill = document.getElementById('tabPrice_outlet-radar');
      if (outPill) {
        const goldCount = cachedOutletDeals.filter(d => d.dealVerdict.includes('Ouro')).length;
        outPill.textContent = `${goldCount} Oportunidades`;
      }
      const outOv = document.getElementById('ovPrice_outlet');
      if (outOv && outData.stats?.maxSavingsAmount) {
        outOv.innerHTML = `-${outData.stats.maxSavingsAmount.toFixed(0)} € <small class="text-flame">🔥 Vantagem vs Novo</small>`;
      }
      updateOutletStats(outData.stats, cachedOutletDeals);
    } catch (e) {
      console.warn('Aviso ao atualizar stats de outlet:', e.message);
    }
  } catch (err) {
    console.error('Erro ao carregar lista de produtos:', err);
  }
}

// 4. Switch Active Product
async function switchProduct(productId) {
  activeProductId = productId;
  activeFilter = 'all';

  // Update tabs UI
  document.querySelectorAll('.product-tab-card').forEach(card => {
    if (card.dataset.product === productId) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });

  // Handle Outlet Radar view switch
  if (productId === 'outlet-radar') {
    if (standardProductView) standardProductView.style.display = 'none';
    if (outletSection) outletSection.style.display = 'block';

    headerProductBadge.textContent = 'RADAR OUTLET';
    headerProductSub.textContent = 'Worten • El Corte Inglés • FNAC • Castro Electrónica';

    await loadOutletDeals();
    return;
  }

  // Handle standard product view
  if (standardProductView) standardProductView.style.display = 'block';
  if (outletSection) outletSection.style.display = 'none';

  // Setup Product Metadata
  setupProductHero(productId);

  // Setup Filter Tabs
  setupFilterTabs(productId);

  // Load prices & history
  await loadPrices();
  await loadHistory();
}

// 5. Setup Product Hero & Information
function setupProductHero(productId) {
  if (productId === 'ninja-woodfire') {
    headerProductBadge.textContent = 'PROCONNECT XL';
    headerProductSub.textContent = 'Ninja Woodfire OG901EU • Monitor de Preços';
    productCategory.textContent = 'GRELHADOR ELÉTRICO DE EXTERIOR • DEFUMADOR • AIR FRY';
    productTitle.innerHTML = 'NINJA WOODFIRE PRO CONNECT XL <span>OG901EU</span>';
    productDesc.textContent = 'Capacidade XL para exterior, 7 funções em 1, resistência IPX4 às intempéries e conectividade total através da App Ninja para monitorização em tempo real.';
    productImage.src = '/images/ninja-woodfire-og901.jpg';
    productTechTags.innerHTML = `
      <span class="tech-tag tech-flame"><i class="fa-solid fa-fire"></i> Pellets de Madeira Real</span>
      <span class="tech-tag tech-wifi"><i class="fa-solid fa-wifi"></i> App ProConnect</span>
      <span class="tech-tag tech-probe"><i class="fa-solid fa-temperature-high"></i> Sonda Digital</span>
    `;
    statHistLabel.textContent = 'Mínimo Histórico';
    statTargetLabel.textContent = 'PREÇO ALVO / PVP';
    tableSubTitle.textContent = 'Amazon.es, Worten, PcComponentes, Ninja Kitchen e principais lojas de referência com envio grátis para Portugal';
    chartSubTitle.textContent = 'Comparativo detalhado estilo KuantoKusta no mercado português (Abril a Outubro de 2026)';
    chartFooterText.innerHTML = '<strong>Análise Histórica:</strong> O valor mínimo absoluto foi registado a <strong>369,00 €</strong> em promoções de verão. Qualquer cotação abaixo dos <strong>390,00 €</strong> representa uma excelente oportunidade em Portugal.';
  } else if (productId === 'nintendo-switch-2') {
    headerProductBadge.textContent = 'NEXT-GEN';
    headerProductSub.textContent = 'Nintendo Switch 2 • Base & Bundles';
    productCategory.textContent = 'CONSOLAS DE JOGOS • NINTENDO NEXT-GEN 256GB';
    productTitle.innerHTML = 'NINTENDO SWITCH 2 <span>CONSOLA & BUNDLES</span>';
    productDesc.textContent = 'Monitorização inteligente da próxima consola Nintendo Switch 2. Separação automática entre a Consola Base (Standard) e Bundles/Packs com jogos (Mario Kart, Pokémon, etc.), com vigilância de stock e pré-vendas.';
    productImage.src = 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=600&q=80';
    productTechTags.innerHTML = `
      <span class="tech-tag tech-wifi"><i class="fa-solid fa-gamepad"></i> Consola Base 256GB</span>
      <span class="tech-tag tech-flame"><i class="fa-solid fa-box-open"></i> Packs & Bundles</span>
      <span class="tech-tag tech-probe"><i class="fa-solid fa-truck-fast"></i> Stock / Pré-Venda PT</span>
    `;
    statHistLabel.textContent = 'Mínimo Registado';
    statTargetLabel.textContent = 'PREÇO ALVO BASE';
    tableSubTitle.textContent = 'Amazon.es, Worten, PcComponentes, FNAC e KuantoKusta - Consola Base e Bundles';
    chartSubTitle.textContent = 'Evolução de cotações e pré-vendas da Nintendo Switch 2 em Portugal';
    chartFooterText.innerHTML = '<strong>Análise Switch 2:</strong> A consola base está posicionada nos <strong>449,99 €</strong> oficiais, surgindo pontualmente a <strong>448,50 € / 439,90 €</strong>. Os bundles com jogos variam entre <strong>488,00 € e 529,99 €</strong>.';
  } else if (productId === 'dryer-bosch-siemens') {
    headerProductBadge.textContent = 'BOMBA DE CALOR';
    headerProductSub.textContent = 'Secadores Bosch & Siemens • Classe A/B (< 700€)';
    productCategory.textContent = 'GRANDES ELETRODOMÉSTICOS • EFICIÊNCIA ENERGÉTICA CLASSE A/B';
    productTitle.innerHTML = 'MÁQUINAS DE SECAR <span>BOSCH & SIEMENS</span>';
    productDesc.textContent = 'Filtro inteligente de máquinas de secar roupa das marcas alemãs Bosch e Siemens com tecnologia de Bomba de Calor, Classe Energética A ou B (ou A++/A+++) e teto orçamental máximo rigorosamente inferior a 700 €.';
    productImage.src = 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80';
    productTechTags.innerHTML = `
      <span class="tech-tag tech-wifi"><i class="fa-solid fa-bolt"></i> Bomba de Calor</span>
      <span class="tech-tag tech-probe"><i class="fa-solid fa-leaf"></i> Classe Energética A/B</span>
      <span class="tech-tag tech-flame"><i class="fa-solid fa-euro-sign"></i> Orçamento &lt; 700 €</span>
    `;
    statHistLabel.textContent = 'Melhor Preço Registado';
    statTargetLabel.textContent = 'TETO ORÇAMENTAL';
    tableSubTitle.textContent = 'Modelos Bosch Série 4/6 e Siemens iQ300/iQ500 com Bomba de Calor e envio gratuito em Portugal';
    chartSubTitle.textContent = 'Histórico de preços de secadores de roupa Bosch e Siemens de alta eficiência (< 700€)';
    chartFooterText.innerHTML = '<strong>Critérios Respeitados:</strong> Todos os modelos listados possuem tecnologia de <strong>Bomba de Calor</strong>, classe de eficiência <strong>A, B, A++ ou A+++</strong> e custam <strong>menos de 700 €</strong> com portes incluídos.';
  }
}

// 6. Setup Filter Buttons for Table
function setupFilterTabs(productId) {
  let tabsHtml = '';
  if (productId === 'ninja-woodfire') {
    tabsHtml = `
      <button class="tab-btn active" data-filter="all">Todas as Lojas (<span id="countAll">0</span>)</button>
      <button class="tab-btn" data-filter="free"><i class="fa-solid fa-truck-fast"></i> Apenas Portes Grátis (<span id="countFree">0</span>)</button>
    `;
  } else if (productId === 'nintendo-switch-2') {
    tabsHtml = `
      <button class="tab-btn active" data-filter="all">Todas as Ofertas (<span id="countAll">0</span>)</button>
      <button class="tab-btn" data-filter="base"><i class="fa-solid fa-gamepad"></i> Apenas Consola Base</button>
      <button class="tab-btn" data-filter="bundle"><i class="fa-solid fa-box-open"></i> Apenas Bundles / Packs</button>
      <button class="tab-btn" data-filter="free"><i class="fa-solid fa-truck-fast"></i> Portes Grátis (<span id="countFree">0</span>)</button>
    `;
  } else if (productId === 'dryer-bosch-siemens') {
    tabsHtml = `
      <button class="tab-btn active" data-filter="all">Todas (&lt; 700€) (<span id="countAll">0</span>)</button>
      <button class="tab-btn" data-filter="bosch"><i class="fa-solid fa-circle-dot text-danger"></i> Apenas Bosch</button>
      <button class="tab-btn" data-filter="siemens"><i class="fa-solid fa-circle-dot text-cyan"></i> Apenas Siemens</button>
      <button class="tab-btn" data-filter="classA"><i class="fa-solid fa-leaf text-green"></i> Classe A (Máx. Eficiência)</button>
      <button class="tab-btn" data-filter="free"><i class="fa-solid fa-truck-fast"></i> Portes Grátis</button>
    `;
  }

  tableFilterTabs.innerHTML = tabsHtml;

  // Add click handlers
  tableFilterTabs.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tableFilterTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderStoresTable();
    });
  });
}

// 7. Load Status & Monitor Schedule
async function loadStatus() {
  try {
    const res = await fetch(`/api/status?product=${activeProductId}`);
    const data = await res.json();

    if (data.monitor?.nextRun) {
      const nextDate = new Date(data.monitor.nextRun);
      nextRunLabel.innerHTML = `<i class="fa-regular fa-clock"></i> Próxima ronda: <strong>${nextDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</strong>`;
    }

    if (data.telegramConfigured) {
      telegramStatusText.innerHTML = 'Telegram: <strong>Alertas Ativos ✅</strong>';
      telegramBadge.style.color = 'var(--proconnect-cyan)';
    } else {
      telegramStatusText.innerHTML = 'Telegram: <strong>Configuração Pendente ⚠️</strong>';
      telegramBadge.style.color = 'var(--flame-amber)';
    }
  } catch (e) {
    console.error('Erro ao carregar status:', e);
  }
}

// 8. Load Prices for Active Product
async function loadPrices(silent = false) {
  try {
    if (!silent) {
      storesTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-5"><i class="fa-solid fa-spinner fa-spin"></i> A obter cotações em tempo real...</td></tr>`;
    }

    const res = await fetch(`/api/prices?product=${activeProductId}`);
    const data = await res.json();

    currentStores = data.stores || [];
    const stats = data.stats || {};
    const prod = data.product || {};

    if (stats.currentLowestPrice) {
      statLowestPrice.textContent = `${stats.currentLowestPrice.toFixed(2)} €`;
      statLowestStore.innerHTML = `<i class="fa-solid fa-store"></i> ${stats.currentLowestStore || 'Loja mais económica'}`;
    }

    if (stats.sixMonthsAveragePrice) {
      statAvgPrice.textContent = `${stats.sixMonthsAveragePrice.toFixed(2)} €`;
    }

    if (stats.historicalLowestPrice) {
      statHistLowest.textContent = `${stats.historicalLowestPrice.toFixed(2)} €`;
    }

    // Target / Cap Display
    if (activeProductId === 'dryer-bosch-siemens') {
      statRrpPrice.textContent = '< 700,00 €';
      const lowest = stats.currentLowestPrice || 446.34;
      const margin = 700 - lowest;
      statSavings.innerHTML = `<i class="fa-solid fa-shield-check"></i> Margem de Poupança: -${margin.toFixed(2)} €`;
    } else {
      const rrp = prod.officialRrp || 449.99;
      statRrpPrice.textContent = `${rrp.toFixed(2)} €`;
      const lowest = stats.currentLowestPrice || rrp;
      const saveAmount = rrp - lowest;
      const savePercent = ((saveAmount / rrp) * 100).toFixed(1);
      if (saveAmount > 0) {
        statSavings.innerHTML = `<i class="fa-solid fa-tag"></i> Poupança: -${saveAmount.toFixed(2)} € (-${savePercent}%)`;
      } else {
        statSavings.innerHTML = `<i class="fa-solid fa-tag"></i> Preço de Lançamento`;
      }
    }

    // Verdict Banner
    updateVerdictBanner(activeProductId, stats);

    renderStoresTable();
  } catch (e) {
    console.error('Erro ao carregar preços:', e);
    storesTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-danger">Erro ao contactar servidor. Tenta novamente.</td></tr>`;
  }
}

// 9. Update Verdict Banner based on Product & Stats
function updateVerdictBanner(productId, stats) {
  const lowest = stats.currentLowestPrice;
  const avg = stats.sixMonthsAveragePrice;

  if (productId === 'ninja-woodfire') {
    if (lowest <= 385) {
      verdictTitle.textContent = '🔥 EXCELENTE OPORTUNIDADE DE COMPRA';
      verdictDesc.textContent = `O preço atual de ${lowest.toFixed(2)} € atingiu o teu preço-alvo (380 €) e está ${(avg - lowest).toFixed(2)} € mais barato que a média histórica (${avg.toFixed(2)} €). Recomendado!`;
      verdictBox.style.borderColor = 'rgba(0, 229, 255, 0.4)';
      verdictBox.style.background = 'rgba(0, 229, 255, 0.08)';
    } else {
      verdictTitle.textContent = '⏳ PREÇO EM VIGILÂNCIA';
      verdictDesc.textContent = `O grelhador está atualmente a ${lowest.toFixed(2)} €. O bot irá alertar-te no Telegram assim que baixar para o alvo de 380 €.`;
    }
  } else if (productId === 'nintendo-switch-2') {
    verdictTitle.textContent = '🎮 CONSOLA BASE & BUNDLES SOB VIGILÂNCIA';
    verdictDesc.textContent = `Consola base disponível a partir de ${lowest.toFixed(2)} €. Os bundles com jogos começam nos 488,00 €. Alertas imediatos caso haja abertura de pré-vendas com desconto.`;
    verdictBox.style.borderColor = 'rgba(168, 85, 247, 0.4)';
    verdictBox.style.background = 'rgba(168, 85, 247, 0.08)';
  } else if (productId === 'dryer-bosch-siemens') {
    verdictTitle.textContent = '🧺 ORÇAMENTO < 700€ RIGOROSAMENTE CUMPRIDO';
    verdictDesc.textContent = `Encontrámos modelos Bosch e Siemens com Bomba de Calor e Classe A/B a partir de ${lowest.toFixed(2)} € (mais de ${(700 - lowest).toFixed(2)} € abaixo do teu teto de 700 €).`;
    verdictBox.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    verdictBox.style.background = 'rgba(16, 185, 129, 0.08)';
  }
}

// 10. Render Stores Table
function renderStoresTable() {
  const countAllEl = document.getElementById('countAll');
  const countFreeEl = document.getElementById('countFree');
  const freeShippingCount = currentStores.filter(s => s.isFreeShipping).length;

  if (countAllEl) countAllEl.textContent = currentStores.length;
  if (countFreeEl) countFreeEl.textContent = freeShippingCount;

  let displayList = [...currentStores];

  // Apply active filter
  if (activeFilter === 'free') {
    displayList = displayList.filter(s => s.isFreeShipping);
  } else if (activeFilter === 'base') {
    displayList = displayList.filter(s => s.variantType === 'base');
  } else if (activeFilter === 'bundle') {
    displayList = displayList.filter(s => s.variantType === 'bundle');
  } else if (activeFilter === 'bosch') {
    displayList = displayList.filter(s => s.variantType === 'bosch' || s.brand?.toLowerCase() === 'bosch');
  } else if (activeFilter === 'siemens') {
    displayList = displayList.filter(s => s.variantType === 'siemens' || s.brand?.toLowerCase() === 'siemens');
  } else if (activeFilter === 'classA') {
    displayList = displayList.filter(s => s.energyRating === 'A' || s.variantTitle?.includes('Classe A'));
  }

  if (displayList.length === 0) {
    storesTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-5">Nenhuma oferta encontrada com o filtro selecionado.</td></tr>`;
    return;
  }

  const lowestPrice = Math.min(...displayList.map(s => s.price));

  storesTableBody.innerHTML = displayList.map(store => {
    const isLowest = store.price === lowestPrice;
    const diff = store.price - lowestPrice;
    const diffText = isLowest 
      ? `<span class="diff-badge best"><i class="fa-solid fa-trophy"></i> Menor Preço</span>`
      : `<span class="diff-badge higher">+${diff.toFixed(2)} €</span>`;

    const shippingBadge = store.isFreeShipping
      ? `<span class="pill-free-ship"><i class="fa-solid fa-truck-fast"></i> Grátis 🇵🇹</span>`
      : `<span class="ship-cost-val">${store.shippingCost.toFixed(2)} €</span>`;

    const logoHtml = store.logo
      ? `<img src="${store.logo}" alt="${store.name}" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\\'fa-solid fa-store\\'></i>';">`
      : `<i class="fa-solid fa-store"></i>`;

    // Variant Tag Badge
    let variantBadgeHtml = '';
    if (store.variantType === 'base') {
      variantBadgeHtml = `<span class="variant-tag variant-base"><i class="fa-solid fa-gamepad"></i> Consola Base</span>`;
    } else if (store.variantType === 'bundle') {
      variantBadgeHtml = `<span class="variant-tag variant-bundle"><i class="fa-solid fa-box-open"></i> Bundle / Pack</span>`;
    } else if (store.variantType === 'bosch') {
      variantBadgeHtml = `<span class="variant-tag variant-bosch"><i class="fa-solid fa-circle-dot"></i> Bosch</span>`;
    } else if (store.variantType === 'siemens') {
      variantBadgeHtml = `<span class="variant-tag variant-siemens"><i class="fa-solid fa-circle-dot"></i> Siemens</span>`;
    }

    // Energy Rating Badge (Dryers)
    let energyBadgeHtml = '';
    if (store.energyRating) {
      const cls = store.energyRating.startsWith('A') ? 'rating-A' : 'rating-B';
      energyBadgeHtml = `<span class="energy-badge ${cls}">${store.energyRating}</span>`;
    }

    const titleDisplay = store.variantTitle && store.variantTitle !== store.name 
      ? store.variantTitle 
      : (store.shippingNote || store.seller);

    return `
      <tr>
        <td>
          <div class="store-meta-cell">
            <div class="store-badge-logo">${logoHtml}</div>
            <div>
              <div class="store-title">${store.name} ${energyBadgeHtml}</div>
              <div class="store-sub">${titleDisplay}</div>
              ${variantBadgeHtml}
            </div>
          </div>
        </td>
        <td>
          <span class="pill-stock ${store.inStock ? 'in-stock' : 'out-of-stock'}">
            <i class="fa-solid ${store.inStock ? 'fa-check' : 'fa-xmark'}"></i>
            ${store.inStock ? 'Em Stock' : 'Esgotado'}
          </span>
        </td>
        <td>
          <div class="price-val ${isLowest ? 'lowest-price-active' : ''}">${store.price.toFixed(2)} €</div>
        </td>
        <td>${shippingBadge}</td>
        <td>
          <strong class="price-val">${(store.price + (store.isFreeShipping ? 0 : store.shippingCost)).toFixed(2)} €</strong>
        </td>
        <td>${diffText}</td>
        <td class="text-right">
          <a href="${store.url}" target="_blank" rel="noopener noreferrer" class="btn-store">
            <span>Comprar</span>
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

// 11. Chart.js (Interactive Multi-Product History)
async function loadHistory() {
  try {
    const res = await fetch(`/api/history?product=${activeProductId}`);
    if (!res.ok) return;
    fullHistoryData = await res.json();
    initChart(fullHistoryData);
  } catch (e) {
    console.error('Erro ao carregar histórico:', e);
  }
}

function initChart(productHistory) {
  const ctx = document.getElementById('priceHistoryChart').getContext('2d');
  const points = productHistory.history || [];
  const storesKeys = productHistory.storesKeys || [
    { key: 'lowestPrice', label: 'Menor Preço', color: '#00e5ff' },
    { key: 'averagePrice', label: 'Preço Médio', color: '#a855f7' }
  ];

  const labels = points.map(p => {
    const parts = p.date.split('-');
    return `${parts[2]}/${parts[1]}`;
  });

  if (priceChart) {
    priceChart.destroy();
  }

  // Create gradient for lowest price line
  const cyanGrad = ctx.createLinearGradient(0, 0, 0, 320);
  cyanGrad.addColorStop(0, 'rgba(0, 229, 255, 0.25)');
  cyanGrad.addColorStop(1, 'rgba(0, 229, 255, 0.0)');

  // Build datasets from storesKeys
  const datasets = storesKeys.map((sk, index) => {
    const isLowest = sk.key === 'lowestPrice';
    const isAvg = sk.key === 'averagePrice';

    return {
      label: sk.label,
      data: points.map(p => p[sk.key] || null),
      borderColor: sk.color,
      backgroundColor: isLowest ? cyanGrad : 'transparent',
      fill: isLowest,
      borderDash: isAvg ? [5, 5] : [],
      tension: 0.25,
      borderWidth: isLowest ? 3 : 2,
      pointRadius: isLowest ? 1 : 0,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: sk.color,
      pointHoverBorderColor: '#ffffff'
    };
  });

  // Render dynamic toggles in DOM
  renderChartToggles(storesKeys);

  // Compute Min and Max Y limits
  const allValues = points.flatMap(p => storesKeys.map(sk => p[sk.key]).filter(v => typeof v === 'number' && !isNaN(v)));
  const minY = Math.floor(Math.min(...allValues) / 20) * 20 - 20;
  const maxY = Math.ceil(Math.max(...allValues) / 20) * 20 + 20;

  priceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0a0b0e',
          titleColor: '#ffffff',
          titleFont: { family: 'Oswald', size: 14 },
          bodyColor: '#e2e8f0',
          bodyFont: { family: 'Inter', size: 12, weight: 600 },
          borderColor: '#242938',
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                label += `${context.parsed.y.toFixed(2)} €`;
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: {
            maxTicksLimit: 10,
            font: { size: 11, family: 'Inter' },
            color: '#94a3b8'
          }
        },
        y: {
          min: minY > 0 ? minY : 0,
          max: maxY,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            callback: value => `${value} €`,
            font: { size: 11, family: 'Inter', weight: 600 },
            color: '#94a3b8',
            stepSize: 20
          }
        }
      }
    }
  });
}

function renderChartToggles(storesKeys) {
  chartTogglesContainer.innerHTML = storesKeys.map((sk, index) => `
    <label class="toggle-pill active" data-index="${index}">
      <input type="checkbox" id="toggle_${sk.key}" checked>
      <span class="dot" style="background: ${sk.color};"></span>
      ${sk.label}
    </label>
  `).join('');

  chartTogglesContainer.querySelectorAll('input[type="checkbox"]').forEach((chk, index) => {
    chk.addEventListener('change', () => {
      if (priceChart) {
        priceChart.setDatasetVisibility(index, chk.checked);
        priceChart.update();
      }
    });
  });
}

function updateChartData() {
  if (!fullHistoryData || !priceChart) return;
  const history = fullHistoryData.history || [];
  const storesKeys = fullHistoryData.storesKeys || [];
  
  let sliceCount = history.length;
  if (activePeriod === '30') sliceCount = 15;
  else if (activePeriod === '90') sliceCount = 45;

  const sliced = history.slice(-sliceCount);

  priceChart.data.labels = sliced.map(p => {
    const parts = p.date.split('-');
    return `${parts[2]}/${parts[1]}`;
  });

  storesKeys.forEach((sk, i) => {
    if (priceChart.data.datasets[i]) {
      priceChart.data.datasets[i].data = sliced.map(p => p[sk.key] || null);
    }
  });

  priceChart.update();
}

// 12. Handle "Verificar Agora"
async function handleCheckNow() {
  const originalHtml = btnCheckNow.innerHTML;
  btnCheckNow.disabled = true;
  btnCheckNow.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>A verificar...</span>`;

  try {
    const res = await fetch('/api/check-now', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      await loadAllProducts();
      await loadPrices();
      await loadLogs();
      await loadStatus();
      await loadHistory();
    }
  } catch (err) {
    alert('Erro ao realizar verificação: ' + err.message);
  } finally {
    btnCheckNow.disabled = false;
    btnCheckNow.innerHTML = originalHtml;
  }
}

// 13. Load Logs & Alerts
async function loadLogs() {
  try {
    const res = await fetch('/api/logs');
    const data = await res.json();

    const alerts = data.alertsHistory || [];
    const checks = data.checksLog || [];

    alertsCount.textContent = alerts.length;

    if (alerts.length > 0) {
      alertsContainer.innerHTML = alerts.map(a => `
        <div class="alert-feed-card">
          <div class="alert-feed-header">
            <span>${a.productEmoji || '🚨'} ${a.productName || 'Produto'} - ${a.storeName}</span>
            <span class="text-cyan">-${a.diff.toFixed(2)} € (-${a.percent}%)</span>
          </div>
          <div style="margin-top: 4px; color: var(--text-muted); font-size: 12px;">
            ${a.variantTitle ? `<strong>${a.variantTitle}</strong>: ` : ''}
            Preço anterior: <s>${a.oldPrice.toFixed(2)} €</s> ➔ <strong style="color: #ffffff;">${a.newPrice.toFixed(2)} €</strong> (${new Date(a.date).toLocaleDateString('pt-PT')} ${new Date(a.date).toLocaleTimeString('pt-PT')})
          </div>
        </div>
      `).join('');
    }

    if (checks.length > 0) {
      logsList.innerHTML = checks.slice(0, 10).map(c => `
        <li class="log-feed-row">
          <div>
            <strong style="color: #ffffff;">${new Date(c.timestamp).toLocaleDateString('pt-PT')} ${new Date(c.timestamp).toLocaleTimeString('pt-PT')}</strong>
            <span style="color: var(--text-dark);"> • ${c.totalStoresChecked || 0} ofertas verificadas</span>
          </div>
          <div>
            Ninja: <strong class="text-cyan">${c.ninjaLowest ? c.ninjaLowest.toFixed(2) + ' €' : '--'}</strong> | 
            Switch 2: <strong class="text-cyan">${c.switchLowest ? c.switchLowest.toFixed(2) + ' €' : '--'}</strong> | 
            Secador: <strong class="text-cyan">${c.dryerLowest ? c.dryerLowest.toFixed(2) + ' €' : '--'}</strong>
          </div>
        </li>
      `).join('');
    }
  } catch (e) {
    console.error('Erro ao carregar logs:', e);
  }
}

// 14. Outlet Radar Logic & Rendering
async function loadOutletDeals(forceRefresh = false) {
  if (!outletDealsContainer) return;
  try {
    if (forceRefresh || cachedOutletDeals.length === 0) {
      outletDealsContainer.innerHTML = `
        <div class="text-center py-5 text-muted" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-spinner fa-spin"></i> A obter achados verificados de outlet...
        </div>`;
      const res = await fetch('/api/outlet');
      const data = await res.json();
      cachedOutletDeals = data.deals || [];
      updateOutletStats(data.stats, cachedOutletDeals);
    }
    renderOutletDeals(cachedOutletDeals);
  } catch (err) {
    console.error('Erro ao carregar outlet:', err);
    outletDealsContainer.innerHTML = `
      <div class="text-center py-5 text-danger" style="grid-column: 1 / -1;">
        Falha ao contactar servidor do Radar de Outlet. Tenta novamente.
      </div>`;
  }
}

function updateOutletStats(stats, deals) {
  if (outletStatTotal) outletStatTotal.textContent = stats?.totalDeals || deals.length;
  if (outletStatReal) outletStatReal.textContent = stats?.realAdvantageCount || deals.filter(d => d.isRealAdvantage).length;
  if (outletStatGold) outletStatGold.textContent = stats?.goldDealsCount || deals.filter(d => d.dealVerdict.includes('Ouro')).length;
  if (outletStatMaxSave) outletStatMaxSave.textContent = `-${(stats?.maxSavingsAmount || 0).toFixed(2)} €`;
  if (outletCountAll) outletCountAll.textContent = deals.length;

  const countCaixaAberta = document.getElementById('countCaixaAberta');
  const countExposicao = document.getElementById('countExposicao');
  const countEmbalagem = document.getElementById('countEmbalagem');
  const countRiscos = document.getElementById('countRiscos');

  if (countCaixaAberta) countCaixaAberta.textContent = deals.filter(d => d.conditionType === 'caixa_aberta').length;
  if (countExposicao) countExposicao.textContent = deals.filter(d => d.conditionType === 'exposicao').length;
  if (countEmbalagem) countEmbalagem.textContent = deals.filter(d => d.conditionType === 'embalagem_dano').length;
  if (countRiscos) countRiscos.textContent = deals.filter(d => d.conditionType === 'riscos_mossas').length;
}

function formatInsertionTime(dateStr) {
  if (!dateStr) return 'Recentemente';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffHours = diffMs / (1000 * 60 * 60);

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (diffHours < 1 && diffHours >= 0) {
    const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `Inserido há ${mins} min`;
  }
  if (isToday) {
    return `Inserido hoje às ${hours}:${minutes}`;
  }
  if (isYesterday) {
    return `Inserido ontem às ${hours}:${minutes}`;
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `Inserido a ${day}/${month} às ${hours}:${minutes}`;
}

function renderOutletDeals(deals) {
  if (!outletDealsContainer) return;

  let filtered = [...deals];

  // 1. Filtering
  if (activeOutletFilter.type === 'condition') {
    if (activeOutletFilter.value !== 'all') {
      filtered = filtered.filter(d => d.conditionType === activeOutletFilter.value);
    }
  } else if (activeOutletFilter.type === 'gold') {
    filtered = filtered.filter(d => d.isRealAdvantage && d.dealVerdict.includes('Ouro'));
  } else if (activeOutletFilter.type === 'store') {
    filtered = filtered.filter(d => d.storeKey === activeOutletFilter.value || d.storeName.toLowerCase().includes(activeOutletFilter.value));
  } else if (activeOutletFilter.type === 'cat') {
    filtered = filtered.filter(d => d.category.toLowerCase().includes(activeOutletFilter.value));
  }

  // 2. Sorting (Default: insertion date descending)
  if (activeOutletSort === 'date_desc') {
    filtered.sort((a, b) => new Date(b.insertedAt || b.firstSeen) - new Date(a.insertedAt || a.firstSeen));
  } else if (activeOutletSort === 'save_amount') {
    filtered.sort((a, b) => b.savingsAmount - a.savingsAmount);
  } else if (activeOutletSort === 'save_percent') {
    filtered.sort((a, b) => b.savingsPercent - a.savingsPercent);
  } else if (activeOutletSort === 'price_asc') {
    filtered.sort((a, b) => a.outletPrice - b.outletPrice);
  }

  if (filtered.length === 0) {
    outletDealsContainer.innerHTML = `
      <div class="text-center py-5 text-muted" style="grid-column: 1 / -1;">
        <i class="fa-solid fa-filter-circle-xmark fa-2x mb-3"></i>
        <p>Nenhum equipamento encontrado com a condição ou filtro selecionado.</p>
      </div>`;
    return;
  }

  outletDealsContainer.innerHTML = filtered.map(deal => {
    const isGold = (deal.dealVerdict || '').includes('Ouro');
    const verdictCls = isGold ? 'verdict-gold' : (deal.isRealAdvantage ? 'verdict-good' : 'verdict-low');
    const cardCls = isGold ? 'outlet-deal-card gold-card' : 'outlet-deal-card';

    // Calculate if it was inserted recently (< 24h)
    const isFresh = (new Date() - new Date(deal.insertedAt || deal.firstSeen)) < 24 * 60 * 60 * 1000;
    const freshHtml = isFresh
      ? `<span class="badge-fresh-arrival"><i class="fa-solid fa-bolt"></i> Recém-Chegado</span>`
      : '';

    const logoHtml = deal.storeLogo
      ? `<img src="${deal.storeLogo}" alt="${deal.storeName}" onerror="this.onerror=null; this.parentElement.innerHTML='${deal.storeName}';">`
      : `<span>${deal.storeName}</span>`;

    const imgHtml = deal.imageUrl
      ? `<img src="${deal.imageUrl}" alt="${deal.title}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=500&q=80';">`
      : `<i class="fa-solid fa-box-open fa-3x text-muted"></i>`;

    const badgeClass = deal.conditionBadgeClass || 'badge-openbox';
    const conditionIcon = deal.conditionIcon || 'fa-box-open';
    const conditionLabel = deal.conditionLabel || deal.condition;

    return `
      <div class="${cardCls}">
        ${freshHtml}
        <div class="outlet-card-top-bar">
          <div class="outlet-store-tag">
            ${logoHtml}
            <span>${deal.storeName}</span>
          </div>
          <span class="outlet-condition-tag ${badgeClass}">
            <i class="fa-solid ${conditionIcon}"></i> ${conditionLabel}
          </span>
        </div>

        <div class="outlet-card-visual">
          ${imgHtml}
        </div>

        <div class="outlet-card-body">
          <div class="outlet-deal-category">${deal.category}</div>
          <div class="outlet-deal-title" title="${deal.title}">${deal.title}</div>

          <!-- Descrição do Defeito / Condição Física -->
          <div class="outlet-condition-box">
            <i class="fa-solid fa-circle-info"></i>
            <span>${deal.conditionDetails || 'Artigo com pequenas imperfeições físicas/embalagem e garantia total.'}</span>
          </div>

          <div class="outlet-price-compare">
            <div class="price-row-main">
              <div>
                <small style="color: var(--text-dark); display: block; font-size: 10px; font-weight: 700;">PREÇO OUTLET</small>
                <span class="outlet-curr-price">${deal.outletPrice.toFixed(2)} €</span>
              </div>
              <div class="outlet-new-price">
                <small style="display: block; font-size: 10px;">NOVO NO MERCADO</small>
                <s>${deal.newMarketPrice.toFixed(2)} €</s>
              </div>
            </div>

            <div class="outlet-savings-row">
              <span class="savings-pill">
                <i class="fa-solid fa-arrow-trend-down"></i> -${deal.savingsAmount.toFixed(2)} € (-${deal.savingsPercent}%)
              </span>
              <span class="outlet-verdict-pill ${verdictCls}">${deal.dealVerdict}</span>
            </div>
          </div>

          <div class="outlet-card-footer">
            <span class="outlet-time-tag"><i class="fa-regular fa-clock"></i> ${formatInsertionTime(deal.insertedAt || deal.firstSeen)}</span>
            <div class="outlet-card-actions">
              <a href="${deal.newMarketUrl || ('https://www.kuantokusta.pt/search?q=' + encodeURIComponent(deal.title))}" target="_blank" rel="noopener noreferrer" class="btn-kk-compare" title="Ver cotação e comparar com produto 100% novo no KuantoKusta">
                <i class="fa-solid fa-scale-balanced"></i> <span>Novo KK</span>
              </a>
              <a href="${deal.url}" target="_blank" rel="noopener noreferrer" class="btn-buy-outlet" title="Abrir produto diretamente no site da loja oficial ${deal.storeName}">
                <span>Ver no Outlet</span>
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function handleScanOutlet() {
  if (!btnScanOutlet) return;
  const originalHtml = btnScanOutlet.innerHTML;
  btnScanOutlet.disabled = true;
  btnScanOutlet.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>A varrer lojas...</span>`;

  try {
    const res = await fetch('/api/outlet/check', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      cachedOutletDeals = data.result?.deals || [];
      updateOutletStats(data.result?.stats, cachedOutletDeals);
      renderOutletDeals(cachedOutletDeals);
      await loadAllProducts(true);
    }
  } catch (err) {
    alert('Erro ao varrer outlets: ' + err.message);
  } finally {
    btnScanOutlet.disabled = false;
    btnScanOutlet.innerHTML = originalHtml;
  }
}

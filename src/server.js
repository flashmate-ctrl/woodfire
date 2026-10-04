const express = require('express');
const path = require('path');
const { getConfig, updateConfig } = require('./config');
const { getDatabase, get6MonthHistory } = require('./database');
const { startMonitor, getMonitorStatus, triggerCheck } = require('./monitor');
const { sendTestNotification, verifyBotCredentials } = require('./telegram');
const { runOutletScan, getStoredOutletDeals } = require('./scrapers/outlet');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Endpoints

// 0. Lista de todos os produtos monitorizados (Hub Multi-Produto)
app.get('/api/products', (req, res) => {
  const db = getDatabase();
  const productsList = Object.values(db.products || {}).map(p => {
    const stores = p.stores || [];
    const lowest = p.stats?.currentLowestPrice || (stores.length > 0 ? Math.min(...stores.map(s => s.price)) : 0);
    const lowestStore = p.stats?.currentLowestStore || (stores.find(s => s.price === lowest)?.name || 'Várias lojas');

    return {
      id: p.id,
      name: p.name,
      shortName: p.shortName || p.name,
      badge: p.badge || '',
      emoji: p.emoji || '📦',
      icon: p.icon || 'fa-solid fa-box',
      category: p.category,
      imageUrl: p.imageUrl,
      targetPrice: p.targetPrice,
      maxBudget: p.maxBudget || null,
      officialRrp: p.officialRrp,
      currentLowestPrice: lowest,
      currentLowestStore: lowestStore,
      historicalLowestPrice: p.stats?.historicalLowestPrice || lowest,
      sixMonthsAveragePrice: p.stats?.sixMonthsAveragePrice || lowest,
      totalStores: stores.length
    };
  });

  res.json({
    activeProductId: db.activeProductId || 'ninja-woodfire',
    products: productsList
  });
});

// 1. Status geral e monitorização (suporta ?product=id)
app.get('/api/status', (req, res) => {
  const db = getDatabase();
  const monitorStatus = getMonitorStatus();
  const config = getConfig();

  const productId = req.query.product || db.activeProductId || 'ninja-woodfire';
  const product = db.products[productId] || db.products['ninja-woodfire'];

  res.json({
    activeProductId: productId,
    product,
    stats: product.stats,
    monitor: monitorStatus,
    telegramConfigured: Boolean(config.telegramBotToken && config.telegramChatId),
    lastScanTime: product.lastScanTime || db.lastScanTime,
    totalStores: product.stores?.length || 0,
    allProductsCount: Object.keys(db.products).length
  });
});

// 2. Preços atuais das lojas (suporta ?product=id, ?variant=..., ?freeShippingOnly=true)
app.get('/api/prices', (req, res) => {
  const db = getDatabase();
  const config = getConfig();

  const productId = req.query.product || db.activeProductId || 'ninja-woodfire';
  const product = db.products[productId] || db.products['ninja-woodfire'];
  let stores = [...(product.stores || [])];

  // Filter by variant (for Switch 2: base vs bundle; for Dryers: bosch vs siemens vs classA)
  if (req.query.variant && req.query.variant !== 'all') {
    const v = req.query.variant.toLowerCase();
    if (productId === 'nintendo-switch-2') {
      stores = stores.filter(s => s.variantType === v);
    } else if (productId === 'dryer-bosch-siemens') {
      if (v === 'bosch' || v === 'siemens') {
        stores = stores.filter(s => s.variantType === v);
      } else if (v === 'classa') {
        stores = stores.filter(s => s.energyRating === 'A' || s.variantTitle?.includes('Classe A'));
      }
    }
  }

  // Filter by free shipping
  if (req.query.freeShippingOnly === 'true' || config.freeShippingOnly) {
    stores = stores.filter(s => s.isFreeShipping);
  }

  // Sort by price ascending
  stores.sort((a, b) => a.price - b.price);

  res.json({
    productId,
    product,
    stats: product.stats,
    lastScanTime: product.lastScanTime || db.lastScanTime,
    stores
  });
});

// 3. Histórico dos últimos 6 meses (suporta ?product=id)
app.get('/api/history', (req, res) => {
  const productId = req.query.product || 'ninja-woodfire';
  const historyData = get6MonthHistory(productId);
  if (!historyData) {
    return res.status(404).json({ error: 'Histórico ainda não disponível.' });
  }
  res.json(historyData);
});

// 4. Executar verificação imediata sob demanda
app.post('/api/check-now', async (req, res) => {
  try {
    const result = await triggerCheck();
    res.json({
      success: true,
      message: 'Verificação multi-produto concluída com sucesso!',
      result
    });
  } catch (err) {
    console.error('Erro na verificação sob demanda:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4.1. Radar de Outlet & Achados com Vantagem Real
app.get('/api/outlet', (req, res) => {
  const stored = getStoredOutletDeals();
  let deals = [...(stored.deals || [])];

  // Filter by gold deals (>25% / Negócio de Ouro)
  if (req.query.goldOnly === 'true' || req.query.filter === 'gold') {
    deals = deals.filter(d => d.isRealAdvantage && d.dealVerdict.includes('Ouro'));
  }

  // Filter by store
  if (req.query.store && req.query.store !== 'all') {
    const s = req.query.store.toLowerCase();
    deals = deals.filter(d => d.storeKey === s || d.storeName.toLowerCase().includes(s));
  }

  // Filter by category
  if (req.query.category && req.query.category !== 'all') {
    const c = req.query.category.toLowerCase();
    deals = deals.filter(d => d.category.toLowerCase().includes(c));
  }

  res.json({
    stats: stored.stats || { totalDeals: deals.length },
    lastScanTime: stored.lastScanTime,
    deals
  });
});

app.post('/api/outlet/check', async (req, res) => {
  try {
    const result = await runOutletScan();
    res.json({
      success: true,
      message: 'Varrimento e verificação de outlet concluídos!',
      result
    });
  } catch (err) {
    console.error('Erro no varrimento de outlet:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Configurações protegidas contra alterações externas
app.get('/api/config', (req, res) => {
  res.json({
    status: 'locked',
    message: 'Configurações protegidas contra leitura externa.'
  });
});

app.post('/api/config', (req, res) => {
  res.status(403).json({
    success: false,
    error: 'As configurações de notificações e Telegram estão bloqueadas por segurança.'
  });
});

// 6. Testar notificação do Telegram
app.post('/api/test-telegram', async (req, res) => {
  try {
    const result = await sendTestNotification();
    if (result.success) {
      res.json({ success: true, message: 'Notificação de teste enviada com sucesso para o Telegram!' });
    } else {
      res.status(400).json({ success: false, error: result.error || 'Falha ao enviar notificação.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Histórico de alertas disparados e logs de verificações
app.get('/api/logs', (req, res) => {
  const db = getDatabase();
  res.json({
    checksLog: db.checksLog || [],
    alertsHistory: db.alertsHistory || []
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Multi-Product Price Tracker ativo em:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`======================================================\n`);

  // Start the 4x/day background monitor
  startMonitor();
});

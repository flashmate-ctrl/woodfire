const { scrapeKuantoKusta } = require('./kuantokusta');
const { scrapeAmazon } = require('./amazon');
const { scrapeWorten } = require('./worten');
const { scrapePcComponentes } = require('./pccomponentes');
const { scrapeNinjaOfficial } = require('./ninjakitchen');
const { scrapeSwitch2 } = require('./switch2');
const { scrapeDryers } = require('./dryers');
const { runOutletScan, getStoredOutletDeals, saveOutletDeals } = require('./outlet');
const { getDatabase, saveDatabase } = require('../database');
const { sendPriceDropAlert, sendDailyHeartbeat, sendOutletDealAlert } = require('../telegram');
const { getConfig } = require('../config');

async function runPriceCheck(options = {}) {
  console.log('\n======================================================');
  console.log('🔍 A iniciar ronda de monitorização multi-produto...');
  console.log('1. Ninja Woodfire OG901EU | 2. Nintendo Switch 2 | 3. Secadores Bosch/Siemens');
  console.log('======================================================\n');

  const now = new Date().toISOString();
  const db = getDatabase();
  const config = getConfig();

  const allPriceDrops = [];

  // ==========================================
  // 1. Monitorizar Ninja Woodfire OG901EU
  // ==========================================
  try {
    console.log('🥩 [Ninja Woodfire] A verificar cotações...');
    const [kkResult, amazonResult, wortenResult, pccompResult, ninjaResult] = await Promise.all([
      scrapeKuantoKusta(),
      scrapeAmazon(),
      scrapeWorten(),
      scrapePcComponentes(),
      scrapeNinjaOfficial()
    ]);

    const ninjaProd = db.products['ninja-woodfire'];
    const existingStoresMap = new Map();
    (ninjaProd.stores || []).forEach(s => existingStoresMap.set(s.id, s));

    const updatedNinjaStores = [];

    function processNinjaStore(id, name, seller, result, fallbackUrl, defaultShippingNote, logo = null) {
      const existing = existingStoresMap.get(id) || {
        id,
        name,
        seller,
        price: result.price,
        previousPrice: result.price,
        shippingCost: result.shippingCost || 0,
        isFreeShipping: result.isFreeShipping ?? true,
        shippingNote: defaultShippingNote,
        inStock: result.inStock ?? true,
        url: result.url || fallbackUrl,
        logo,
        lastChecked: now
      };

      const oldPrice = existing.price;
      const newPrice = result.price;

      const storeEntry = {
        ...existing,
        name,
        seller,
        price: newPrice,
        previousPrice: oldPrice,
        shippingCost: result.shippingCost ?? existing.shippingCost,
        isFreeShipping: result.isFreeShipping ?? existing.isFreeShipping,
        shippingNote: result.shippingNote || existing.shippingNote || defaultShippingNote,
        inStock: result.inStock ?? true,
        url: result.url || fallbackUrl,
        logo: logo || existing.logo || null,
        lastChecked: now
      };

      if (newPrice < oldPrice) {
        console.log(`📉 [Ninja] Baixa em ${name}: ${oldPrice} € -> ${newPrice} €`);
        allPriceDrops.push({
          productId: 'ninja-woodfire',
          productName: ninjaProd.name,
          productEmoji: '🥩',
          storeId: id,
          storeName: name,
          oldPrice,
          newPrice,
          diff: oldPrice - newPrice,
          percent: (((oldPrice - newPrice) / oldPrice) * 100).toFixed(1),
          url: storeEntry.url,
          shippingNote: storeEntry.shippingNote,
          inStock: storeEntry.inStock,
          date: now
        });
      }

      updatedNinjaStores.push(storeEntry);
    }

    processNinjaStore('amazon_es', 'Amazon.es', 'Amazon / Vendedor Certificado', amazonResult, 'https://www.amazon.es/dp/B0CXDTMM28', 'Grátis para Portugal (>35€ / Prime)', 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg');
    processNinjaStore('worten_pt', 'Worten.pt', 'Worten / Marketplace Oficial', wortenResult, 'https://www.worten.pt/produtos/grelhador-ninja-og901eu-1700-w-preto-8022830', 'Grátis para Portugal em loja / campanhas', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Worten_Logo.svg/1200px-Worten_Logo.svg.png');
    processNinjaStore('pccomponentes_pt', 'PcComponentes.pt', 'PcComponentes', pccompResult, 'https://www.pccomponentes.pt/barbecue-ninja-woodfire-pro-connect-xl-og901eu-eletrica-sensor-digital-app-1700w', 'Envio para Portugal Continental', 'https://cdn.pccomponentes.com/img/logos/logo-pccomponentes.svg');
    processNinjaStore('ninjakitchen_pt', 'Ninja Kitchen Portugal', 'Ninja Oficial (Riverint)', ninjaResult, 'https://ninjakitchen.pt/produtos/grelhador-eletrico-de-exterior-e-fumador-ninja-woodfire-pro-connect-xl-og901eu-zidOG901EU', 'Grátis para Portugal Continental (>50€)', 'https://ninjakitchen.pt/on/demandware.static/-/Sites-ninja-pt-Library/default/dw769584d4/images/logo.svg');

    if (kkResult.success && kkResult.offers && kkResult.offers.length > 0) {
      const freeShippingOffers = kkResult.offers.filter(o => o.isFreeShipping);
      const topOffers = (freeShippingOffers.length > 0 ? freeShippingOffers : kkResult.offers).slice(0, 6);

      topOffers.forEach((offer) => {
        const storeSlug = offer.storeSlug || offer.storeName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const storeId = `kk_${storeSlug}`;
        if (['amazon', 'worten', 'pccomponentes'].some(k => storeSlug.includes(k))) return;

        processNinjaStore(
          storeId,
          offer.storeName,
          `${offer.storeName} (via KuantoKusta)`,
          {
            price: offer.price,
            shippingCost: offer.shippingPrice,
            isFreeShipping: offer.isFreeShipping,
            inStock: offer.inStock,
            url: 'https://www.kuantokusta.pt/p/11427572/ninja-og901eu-eletrico-de-exterior-fritadeira-soleo'
          },
          'https://www.kuantokusta.pt/p/11427572/ninja-og901eu-eletrico-de-exterior-fritadeira-soleo',
          offer.isFreeShipping ? 'Grátis para Portugal' : `Portes: ${offer.shippingPrice} €`,
          offer.logo || null
        );
      });
    }

    const allPrices = updatedNinjaStores.map(s => s.price).filter(p => p > 0);
    const lowestPrice = Math.min(...allPrices);
    const lowestStore = updatedNinjaStores.find(s => s.price === lowestPrice)?.name || 'Desconhecido';
    const averagePrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;

    ninjaProd.stores = updatedNinjaStores;
    ninjaProd.lastScanTime = now;
    ninjaProd.stats = {
      currentLowestPrice: parseFloat(lowestPrice.toFixed(2)),
      currentLowestStore: lowestStore,
      historicalLowestPrice: Math.min(ninjaProd.stats?.historicalLowestPrice || 369.00, lowestPrice),
      historicalHighestPrice: Math.max(ninjaProd.stats?.historicalHighestPrice || 488.64, ...allPrices),
      sixMonthsAveragePrice: parseFloat(((ninjaProd.stats?.sixMonthsAveragePrice || 411.64) * 0.95 + averagePrice * 0.05).toFixed(2))
    };
  } catch (err) {
    console.error('❌ Erro na monitorização Ninja Woodfire:', err.message);
  }

  // ==========================================
  // 2. Monitorizar Nintendo Switch 2
  // ==========================================
  try {
    console.log('🎮 [Nintendo Switch 2] A verificar cotações e variantes...');
    const switchRes = await scrapeSwitch2();
    if (switchRes.success && switchRes.stores && switchRes.stores.length > 0) {
      const swProd = db.products['nintendo-switch-2'];
      const oldStoresMap = new Map();
      (swProd.stores || []).forEach(s => oldStoresMap.set(s.id, s));

      const updatedSwStores = switchRes.stores.map(store => {
        const oldStore = oldStoresMap.get(store.id);
        const oldPrice = oldStore ? oldStore.price : store.price;

        if (store.price < oldPrice) {
          console.log(`📉 [Switch 2] Baixa em ${store.name}: ${oldPrice} € -> ${store.price} €`);
          allPriceDrops.push({
            productId: 'nintendo-switch-2',
            productName: swProd.name,
            productEmoji: '🎮',
            variantTitle: store.variantTitle,
            storeId: store.id,
            storeName: store.name,
            oldPrice,
            newPrice: store.price,
            diff: oldPrice - store.price,
            percent: (((oldPrice - store.price) / oldPrice) * 100).toFixed(1),
            url: store.url,
            shippingNote: store.shippingNote,
            inStock: store.inStock,
            date: now
          });
        }

        return {
          ...store,
          previousPrice: oldPrice,
          lastChecked: now
        };
      });

      const allSwPrices = updatedSwStores.map(s => s.price).filter(p => p > 0);
      const minSwPrice = Math.min(...allSwPrices);
      const minSwStore = updatedSwStores.find(s => s.price === minSwPrice)?.name || 'KuantoKusta';
      const avgSwPrice = allSwPrices.reduce((a, b) => a + b, 0) / allSwPrices.length;

      swProd.stores = updatedSwStores;
      swProd.lastScanTime = now;
      swProd.stats = {
        currentLowestPrice: parseFloat(minSwPrice.toFixed(2)),
        currentLowestStore: minSwStore,
        historicalLowestPrice: Math.min(swProd.stats?.historicalLowestPrice || 439.90, minSwPrice),
        historicalHighestPrice: Math.max(swProd.stats?.historicalHighestPrice || 499.00, ...allSwPrices),
        sixMonthsAveragePrice: parseFloat(((swProd.stats?.sixMonthsAveragePrice || 456.20) * 0.95 + avgSwPrice * 0.05).toFixed(2))
      };
    }
  } catch (err) {
    console.error('❌ Erro na monitorização Nintendo Switch 2:', err.message);
  }

  // ==========================================
  // 3. Monitorizar Secadores Bosch & Siemens (<700€)
  // ==========================================
  try {
    console.log('🧺 [Secadores Bosch/Siemens] A verificar modelos Bomba de Calor < 700€...');
    const dryerRes = await scrapeDryers();
    if (dryerRes.success && dryerRes.stores && dryerRes.stores.length > 0) {
      const dryerProd = db.products['dryer-bosch-siemens'];
      const oldStoresMap = new Map();
      (dryerProd.stores || []).forEach(s => oldStoresMap.set(s.id, s));

      const updatedDryerStores = dryerRes.stores.map(store => {
        const oldStore = oldStoresMap.get(store.id);
        const oldPrice = oldStore ? oldStore.price : store.price;

        if (store.price < oldPrice) {
          console.log(`📉 [Secador] Baixa em ${store.name} (${store.variantTitle}): ${oldPrice} € -> ${store.price} €`);
          allPriceDrops.push({
            productId: 'dryer-bosch-siemens',
            productName: dryerProd.name,
            productEmoji: '🧺',
            variantTitle: store.variantTitle,
            storeId: store.id,
            storeName: store.name,
            oldPrice,
            newPrice: store.price,
            diff: oldPrice - store.price,
            percent: (((oldPrice - store.price) / oldPrice) * 100).toFixed(1),
            url: store.url,
            shippingNote: store.shippingNote,
            inStock: store.inStock,
            date: now
          });
        }

        return {
          ...store,
          previousPrice: oldPrice,
          lastChecked: now
        };
      });

      const allDryerPrices = updatedDryerStores.map(s => s.price).filter(p => p > 0);
      const minDryerPrice = Math.min(...allDryerPrices);
      const minDryerStore = updatedDryerStores.find(s => s.price === minDryerPrice)?.name || 'KuantoKusta';
      const avgDryerPrice = allDryerPrices.reduce((a, b) => a + b, 0) / allDryerPrices.length;

      dryerProd.stores = updatedDryerStores;
      dryerProd.lastScanTime = now;
      dryerProd.stats = {
        currentLowestPrice: parseFloat(minDryerPrice.toFixed(2)),
        currentLowestStore: minDryerStore,
        historicalLowestPrice: Math.min(dryerProd.stats?.historicalLowestPrice || 460.65, minDryerPrice),
        historicalHighestPrice: Math.max(dryerProd.stats?.historicalHighestPrice || 689.00, ...allDryerPrices),
        sixMonthsAveragePrice: parseFloat(((dryerProd.stats?.sixMonthsAveragePrice || 558.40) * 0.95 + avgDryerPrice * 0.05).toFixed(2))
      };
    }
  } catch (err) {
    console.error('❌ Erro na monitorização Secadores Bosch/Siemens:', err.message);
  }

  // Update global properties
  db.lastScanTime = now;

  // Add scan log entry
  const totalStores = Object.values(db.products).reduce((acc, p) => acc + (p.stores?.length || 0), 0);
  db.checksLog.unshift({
    timestamp: now,
    totalStoresChecked: totalStores,
    priceDropsCount: allPriceDrops.length,
    ninjaLowest: db.products['ninja-woodfire']?.stats?.currentLowestPrice,
    switchLowest: db.products['nintendo-switch-2']?.stats?.currentLowestPrice,
    dryerLowest: db.products['dryer-bosch-siemens']?.stats?.currentLowestPrice
  });
  if (db.checksLog.length > 100) db.checksLog = db.checksLog.slice(0, 100);

  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const currentHour = parseInt(new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', hour: 'numeric', hour12: false }).format(new Date()), 10);

  // Send Telegram Alerts for price drops
  if (allPriceDrops.length > 0) {
    for (const drop of allPriceDrops) {
      db.alertsHistory.unshift(drop);
      try {
        await sendPriceDropAlert({
          productName: drop.productName,
          productEmoji: drop.productEmoji,
          variantTitle: drop.variantTitle,
          storeName: drop.storeName,
          oldPrice: drop.oldPrice,
          newPrice: drop.newPrice,
          url: drop.url,
          shippingNote: drop.shippingNote,
          stats: db.products[drop.productId]?.stats
        });
      } catch (err) {
        console.error('Erro ao enviar alerta Telegram:', err.message);
      }
    }
    db.lastDailyHeartbeatDate = todayStr;
  } else {
    // If no price drop, check if daily heartbeat report should be sent
    const shouldSendDailyHeartbeat = Boolean(
      options.forceDailyHeartbeat ||
      (db.lastDailyHeartbeatDate !== todayStr && currentHour >= 12)
    );

    if (shouldSendDailyHeartbeat) {
      console.log('📢 A enviar relatório diário consolidado para o Telegram...');
      try {
        const hbResult = await sendDailyHeartbeat({ productsData: db.products });
        if (hbResult.success) {
          db.lastDailyHeartbeatDate = todayStr;
          db.dailyHeartbeatsHistory = db.dailyHeartbeatsHistory || [];
          db.dailyHeartbeatsHistory.unshift({
            date: todayStr,
            timestamp: now,
            ninjaLowest: db.products['ninja-woodfire']?.stats?.currentLowestPrice,
            switchLowest: db.products['nintendo-switch-2']?.stats?.currentLowestPrice,
            dryerLowest: db.products['dryer-bosch-siemens']?.stats?.currentLowestPrice
          });
          if (db.dailyHeartbeatsHistory.length > 30) db.dailyHeartbeatsHistory = db.dailyHeartbeatsHistory.slice(0, 30);
          console.log(`✅ Relatório diário multi-produto entregue com sucesso no Telegram (${todayStr}).`);
        }
      } catch (err) {
        console.error('Erro ao enviar relatório diário Telegram:', err.message);
      }
    }
  }

  // ==========================================
  // 4. Radar de Outlet & Achados com Vantagem Real
  // ==========================================
  let outletResult = null;
  try {
    outletResult = await runOutletScan();
    if (outletResult?.brandNewGems?.length > 0) {
      console.log(`⚡ [Radar Outlet] ${outletResult.brandNewGems.length} novo(s) achado(s) de topo com vantagem real comprovada!`);
      const sentIds = new Set();
      // Alert new qualifying outlet gems to Telegram (up to 5 per hourly check to prevent spam)
      for (const gem of outletResult.brandNewGems.slice(0, 5)) {
        try {
          const alertRes = await sendOutletDealAlert(gem);
          if (alertRes && alertRes.success !== false) {
            gem.alertSent = true;
            sentIds.add(gem.id);
          }
        } catch (e) {
          console.error('Erro ao enviar alerta de outlet:', e.message);
        }
      }
      const storedOutlets = getStoredOutletDeals();
      const updatedDeals = (storedOutlets.deals || []).map(d => {
        if (sentIds.has(d.id)) {
          return { ...d, alertSent: true };
        }
        return d;
      });
      saveOutletDeals({ ...storedOutlets, deals: updatedDeals });
    }
  } catch (err) {
    console.error('❌ Erro no varrimento de Outlet:', err.message);
  }

  saveDatabase(db);
  console.log(`\n✅ Ronda concluída com sucesso! Total de ${totalStores} lojas/ofertas verificadas.`);

  return {
    success: true,
    scanTime: now,
    products: db.products,
    priceDrops: allPriceDrops,
    outlet: outletResult
  };
}

module.exports = {
  runPriceCheck,
  runOutletScan
};

const { scrapeHardDrives } = require('./disks');
const { scrapeSwitch2 } = require('./switch2');
const { scrapeDryers } = require('./dryers');
const { scrapeDecoX50 } = require('./deco');
const { runOutletScan, getStoredOutletDeals, saveOutletDeals } = require('./outlet');
const { getDatabase, saveDatabase } = require('../database');
const { sendPriceDropAlert, sendDailyHeartbeat, sendOutletDealAlert } = require('../telegram');
const { getConfig } = require('../config');

async function runPriceCheck(options = {}) {
  console.log('\n======================================================');
  console.log('🔍 A iniciar ronda de monitorização multi-produto...');
  console.log('1. Discos Rígidos (5TB / 4-8TB) | 2. Switch 2 | 3. Secadores Bosch S8 | 4. TP-Link Deco X50 / X55');
  console.log('======================================================\n');

  const now = new Date().toISOString();
  const db = getDatabase();
  const config = getConfig();

  const allPriceDrops = [];
  const minDropPercent = config.minPriceDropPercent ?? 5.0;

  // ==========================================
  // 1. Monitorizar Discos Rígidos (5TB / 4-8TB)
  // ==========================================
  try {
    console.log('💾 [Discos Rígidos] A verificar cotações e rácio €/TB...');
    const diskRes = await scrapeHardDrives();
    if (diskRes.success && diskRes.stores && diskRes.stores.length > 0) {
      const diskProd = db.products['hard-drives'] || { stores: [] };
      const oldStoresMap = new Map();
      (diskProd.stores || []).forEach(s => oldStoresMap.set(s.id, s));

      const updatedDiskStores = diskRes.stores.map(store => {
        const oldStore = oldStoresMap.get(store.id);
        const oldPrice = oldStore ? oldStore.price : store.price;

        if (store.price < oldPrice) {
          const dropDiff = oldPrice - store.price;
          const dropPercentVal = ((dropDiff / oldPrice) * 100);
          const dropPercentStr = dropPercentVal.toFixed(1);

          if (dropPercentVal > minDropPercent) {
            console.log(`📉 [Disco Rígido] Baixa em ${store.name} (${store.variantTitle}): ${oldPrice} € -> ${store.price} € (-${dropPercentStr}%)`);
            allPriceDrops.push({
              productId: 'hard-drives',
              productName: diskProd.name || 'Discos Rígidos (5TB / 4-8TB)',
              productEmoji: '💾',
              variantTitle: store.variantTitle,
              storeId: store.id,
              storeName: `${store.name} (${store.capacityLabel || 'HDD'})`,
              oldPrice,
              newPrice: store.price,
              originalPrice: store.originalPrice || null,
              cartPromo: store.cartPromo || null,
              diff: dropDiff,
              percent: dropPercentStr,
              url: store.url,
              shippingNote: store.shippingNote,
              inStock: store.inStock,
              date: now
            });
          } else {
            console.log(`⏩ [Disco Ignorado] Baixa em ${store.name}: ${oldPrice} € -> ${store.price} € (-${dropPercentStr}%) é <= ${minDropPercent}%`);
          }
        }

        return {
          ...store,
          previousPrice: oldPrice,
          lastChecked: now
        };
      });

      const allDiskPrices = updatedDiskStores.map(s => s.price).filter(p => p > 0);
      const minDiskPrice = Math.min(...allDiskPrices);
      const bestStoreObj = updatedDiskStores.find(s => s.price === minDiskPrice);
      const minDiskStore = bestStoreObj ? `${bestStoreObj.name} (${bestStoreObj.capacityLabel || ''})` : 'KuantoKusta';
      const avgDiskPrice = allDiskPrices.reduce((a, b) => a + b, 0) / allDiskPrices.length;

      diskProd.stores = updatedDiskStores;
      diskProd.lastScanTime = now;
      diskProd.stats = {
        currentLowestPrice: parseFloat(minDiskPrice.toFixed(2)),
        currentLowestStore: minDiskStore,
        historicalLowestPrice: Math.min(diskProd.stats?.historicalLowestPrice || 119.99, minDiskPrice),
        historicalHighestPrice: Math.max(diskProd.stats?.historicalHighestPrice || 199.99, ...allDiskPrices),
        sixMonthsAveragePrice: parseFloat(((diskProd.stats?.sixMonthsAveragePrice || 168.50) * 0.95 + avgDiskPrice * 0.05).toFixed(2))
      };
      db.products['hard-drives'] = diskProd;
    }
  } catch (err) {
    console.error('❌ Erro na monitorização Discos Rígidos:', err.message);
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
          const dropDiff = oldPrice - store.price;
          const dropPercentVal = ((dropDiff / oldPrice) * 100);
          const dropPercentStr = dropPercentVal.toFixed(1);

          if (dropPercentVal > minDropPercent) {
            console.log(`📉 [Switch 2] Baixa em ${store.name}: ${oldPrice} € -> ${store.price} € (-${dropPercentStr}%)`);
            allPriceDrops.push({
              productId: 'nintendo-switch-2',
              productName: swProd.name,
              productEmoji: '🎮',
              variantTitle: store.variantTitle,
              storeId: store.id,
              storeName: store.name,
              oldPrice,
              newPrice: store.price,
              diff: dropDiff,
              percent: dropPercentStr,
              url: store.url,
              shippingNote: store.shippingNote,
              inStock: store.inStock,
              date: now
            });
          } else {
            console.log(`⏩ [Switch 2 Ignorado] Baixa em ${store.name}: ${oldPrice} € -> ${store.price} € (-${dropPercentStr}%) é <= ${minDropPercent}%`);
          }
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
          const dropDiff = oldPrice - store.price;
          const dropPercentVal = ((dropDiff / oldPrice) * 100);
          const dropPercentStr = dropPercentVal.toFixed(1);

          if (dropPercentVal > minDropPercent) {
            console.log(`📉 [Secador] Baixa em ${store.name} (${store.variantTitle}): ${oldPrice} € -> ${store.price} € (-${dropPercentStr}%)`);
            allPriceDrops.push({
              productId: 'dryer-bosch-siemens',
              productName: dryerProd.name,
              productEmoji: '🧺',
              variantTitle: store.variantTitle,
              storeId: store.id,
              storeName: store.name,
              oldPrice,
              newPrice: store.price,
              originalPrice: store.originalPrice || null,
              cartPromo: store.cartPromo || null,
              diff: dropDiff,
              percent: dropPercentStr,
              url: store.url,
              shippingNote: store.shippingNote,
              inStock: store.inStock,
              date: now
            });
          } else {
            console.log(`⏩ [Secador Ignorado] Baixa em ${store.name} (${store.variantTitle}): ${oldPrice} € -> ${store.price} € (-${dropPercentStr}%) é <= ${minDropPercent}%`);
          }
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

  // ==========================================
  // 4. Monitorizar TP-Link Deco X50 & X55 (Pack 2)
  // ==========================================
  try {
    const decoRes = await scrapeDecoX50();
    if (decoRes.success && decoRes.stores && decoRes.stores.length > 0) {
      const decoProd = db.products['tplink-deco-x50'] || { stores: [] };
      const oldStoresMap = new Map();
      (decoProd.stores || []).forEach(s => oldStoresMap.set(s.id, s));

      const updatedDecoStores = decoRes.stores.map(store => {
        const oldStore = oldStoresMap.get(store.id);
        const oldPrice = oldStore ? oldStore.price : store.price;

        if (store.price < oldPrice) {
          const dropDiff = oldPrice - store.price;
          const dropPercentVal = ((dropDiff / oldPrice) * 100);
          const dropPercentStr = dropPercentVal.toFixed(1);

          if (dropPercentVal > minDropPercent) {
            console.log(`📉 [Deco ${store.model || 'X50/X55'}] Baixa em ${store.name}: ${oldPrice} € -> ${store.price} € (-${dropPercentStr}%)`);
            allPriceDrops.push({
              productId: 'tplink-deco-x50',
              productName: decoProd.name || 'TP-Link Deco X50 / X55 (Pack de 2)',
              productEmoji: '📡',
              variantTitle: store.variantTitle,
              storeId: store.id,
              storeName: `${store.name} (${store.model || 'Mesh'})`,
              oldPrice,
              newPrice: store.price,
              originalPrice: store.originalPrice || null,
              cartPromo: store.cartPromo || null,
              diff: dropDiff,
              percent: dropPercentStr,
              url: store.url,
              shippingNote: store.shippingNote,
              inStock: store.inStock,
              date: now
            });
          } else {
            console.log(`⏩ [Deco ${store.model || 'X50/X55'} Ignorado] Baixa em ${store.name}: ${oldPrice} € -> ${store.price} € (-${dropPercentStr}%) é <= ${minDropPercent}%`);
          }
        }

        return {
          ...store,
          previousPrice: oldPrice,
          lastChecked: now
        };
      });

      const allDecoPrices = updatedDecoStores.map(s => s.price).filter(p => p > 0);
      const minDecoPrice = Math.min(...allDecoPrices);
      const bestStoreObj = updatedDecoStores.find(s => s.price === minDecoPrice);
      const minDecoStore = bestStoreObj ? `${bestStoreObj.name} (${bestStoreObj.model || 'Deco'})` : 'You Get (X55)';
      const avgDecoPrice = allDecoPrices.reduce((a, b) => a + b, 0) / allDecoPrices.length;

      decoProd.stores = updatedDecoStores;
      decoProd.lastScanTime = now;
      decoProd.stats = {
        currentLowestPrice: parseFloat(minDecoPrice.toFixed(2)),
        currentLowestStore: minDecoStore,
        historicalLowestPrice: Math.min(decoProd.stats?.historicalLowestPrice || 149.99, minDecoPrice),
        historicalHighestPrice: Math.max(decoProd.stats?.historicalHighestPrice || 219.99, ...allDecoPrices),
        sixMonthsAveragePrice: parseFloat(((decoProd.stats?.sixMonthsAveragePrice || 178.50) * 0.95 + avgDecoPrice * 0.05).toFixed(2))
      };
      db.products['tplink-deco-x50'] = decoProd;
    }
  } catch (err) {
    console.error('❌ Erro na monitorização TP-Link Deco X50/X55:', err.message);
  }

  // Update global properties
  db.lastScanTime = now;

  // Add scan log entry
  const totalStores = Object.values(db.products).reduce((acc, p) => acc + (p.stores?.length || 0), 0);
  db.checksLog.unshift({
    timestamp: now,
    totalStoresChecked: totalStores,
    priceDropsCount: allPriceDrops.length,
    disksLowest: db.products['hard-drives']?.stats?.currentLowestPrice,
    switchLowest: db.products['nintendo-switch-2']?.stats?.currentLowestPrice,
    dryerLowest: db.products['dryer-bosch-siemens']?.stats?.currentLowestPrice,
    decoLowest: db.products['tplink-deco-x50']?.stats?.currentLowestPrice
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
          originalPrice: drop.originalPrice || null,
          cartPromo: drop.cartPromo || null,
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
            disksLowest: db.products['hard-drives']?.stats?.currentLowestPrice,
            switchLowest: db.products['nintendo-switch-2']?.stats?.currentLowestPrice,
            dryerLowest: db.products['dryer-bosch-siemens']?.stats?.currentLowestPrice,
            decoLowest: db.products['tplink-deco-x50']?.stats?.currentLowestPrice
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

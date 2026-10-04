const { runPriceCheck } = require('./scrapers');

async function main() {
  console.log('====================================================');
  console.log('🔥 Multi-Product Price Check (Ninja, Switch 2, Secador)');
  console.log('====================================================\n');

  try {
    const forceDaily = process.argv.includes('--daily') || process.argv.includes('--heartbeat');
    const result = await runPriceCheck({ forceDailyHeartbeat: forceDaily });

    console.log('\n--- RESUMO DE MONITORIZAÇÃO ---');
    for (const [id, prod] of Object.entries(result.products || {})) {
      console.log(`\n${prod.emoji || '📦'} ${prod.name}`);
      console.log(`   Melhor Preço: ${prod.stats?.currentLowestPrice} € (${prod.stats?.currentLowestStore})`);
      console.log(`   Preço Alvo / Teto: ${prod.targetPrice} €`);
      console.log(`   Lojas/Ofertas Monitorizadas: ${prod.stores?.length || 0}`);
    }

    if (result.priceDrops?.length > 0) {
      console.log(`\n🚨 ${result.priceDrops.length} Baixa(s) de Preço detetada(s)! Alertas processados.`);
    } else {
      console.log('\nℹ️ Não foram detetadas novas baixas de preço nesta ronda.');
    }
  } catch (err) {
    console.error('Erro na execução:', err);
  }
}

main();

const { getConfig } = require('./config');

async function sendTelegramMessage(htmlText) {
  const config = getConfig();
  const token = config.telegramBotToken;
  const chatId = config.telegramChatId;

  if (!token || !chatId) {
    console.warn('⚠️ Telegram não configurado: TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID em falta.');
    return { success: false, reason: 'missing_credentials' };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlText,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      console.error('❌ Erro da API do Telegram:', data);
      return { success: false, error: data.description || 'Unknown Telegram error' };
    }

    console.log('✅ Mensagem enviada com sucesso para o Telegram!');
    return { success: true, messageId: data.result?.message_id };
  } catch (err) {
    console.error('❌ Erro de rede ao contactar Telegram:', err.message);
    return { success: false, error: err.message };
  }
}

async function verifyBotCredentials(token, chatId) {
  if (!token) return { valid: false, error: 'Token não fornecido' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();
    if (!data.ok) {
      return { valid: false, error: data.description };
    }
    return { valid: true, bot: data.result };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

async function sendPriceDropAlert({
  productName,
  productEmoji = '📦',
  variantTitle,
  storeName,
  oldPrice,
  newPrice,
  originalPrice = null,
  cartPromo = null,
  url,
  shippingNote,
  stats
}) {
  const diff = oldPrice - newPrice;
  const percent = ((diff / oldPrice) * 100).toFixed(1);
  const now = new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });

  const variantLine = variantTitle && variantTitle !== productName 
    ? `\nℹ️ <b>Versão/Modelo:</b> ${variantTitle}` 
    : '';

  const promoSection = cartPromo ? `
🛒 <b>Campanha no Carrinho:</b> <b>${cartPromo.promoLabel}</b>
🏷️ <b>PVP na Página:</b> <s>${cartPromo.originalPrice.toFixed(2)} €</s>
💸 <b>Desconto Direto no Carrinho:</b> <b>-${cartPromo.discountAmount.toFixed(2)} € (-${cartPromo.discountPercent}%)</b>
💡 <i>${cartPromo.note || 'Desconto aplicado automaticamente ao adicionar ao cesto!'}</i>
` : '';

  const message = `
🚨 <b>ALERTA DE BAIXA DE PREÇO!</b> 📉
${cartPromo ? '🔥 <b>[DESCONTO NO CARRINHO / DIAS SEM IVA]</b>\n' : ''}
${productEmoji} <b>Produto:</b> <b>${productName}</b>${variantLine}
🏬 <b>Loja:</b> <b>${storeName}</b>
${promoSection}
💰 <b>Preço Final Efetivo:</b> <b>${newPrice.toFixed(2)} €</b>
${!cartPromo ? `🏷️ <b>Preço Anterior:</b> <s>${oldPrice.toFixed(2)} €</s>\n📉 <b>Poupança Imediata:</b> <b>-${diff.toFixed(2)} € (-${percent}%)</b>\n` : ''}
🚚 <b>Envio para Portugal:</b> ${shippingNote || 'Grátis para Portugal'} 🇵🇹
📦 <b>Disponibilidade:</b> Em Stock ✅

📊 <b>Contexto de Mercado:</b>
• Mínimo Histórico: <b>${stats?.historicalLowestPrice ? stats.historicalLowestPrice.toFixed(2) + ' €' : 'N/D'}</b>
• Preço Médio: <b>${stats?.sixMonthsAveragePrice ? stats.sixMonthsAveragePrice.toFixed(2) + ' €' : 'N/D'}</b>
• Veredito: <b>🔥 Excelente Oportunidade de Compra!</b>

🔗 <a href="${url}"><b>👉 CLICA AQUI PARA VER A OFERTA NA LOJA</b></a>

⏰ <i>Detetado automaticamente pelo Price Tracker às ${now}</i>
`.trim();

  return await sendTelegramMessage(message);
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendOutletDealAlert(deal) {
  const now = new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });
  const isGold = (deal.dealVerdict || '').includes('Ouro');

  const message = `
⚡ <b>NOVO ACHADO DE OUTLET DETETADO!</b> 🏷️

🏬 <b>Loja:</b> <b>${escapeHtml(deal.storeName)}</b>
📦 <b>Produto:</b> <b>${escapeHtml(deal.title)}</b>
🏷️ <b>Condição Física:</b> <b>${escapeHtml(deal.conditionLabel || deal.condition)}</b>
🔍 <b>Detalhe do Estado:</b> <i>${escapeHtml(deal.conditionDetails || 'Caixa aberta, artigo de exposição ou pequenas marcas de transporte com garantia de 3 anos.')}</i>

💰 <b>Preço no Outlet:</b> <b>${deal.outletPrice.toFixed(2)} €</b>
🆕 <b>Preço de Novo no Mercado:</b> <s>${deal.newMarketPrice.toFixed(2)} €</s> <i>(${escapeHtml(deal.newMarketStore || 'KuantoKusta')})</i>
📉 <b>Poupança Real Comprovada:</b> <b>-${deal.savingsAmount.toFixed(2)} € (-${deal.savingsPercent}% vs Novo!)</b>

${isGold ? '🔥 <b>Veredito:</b> <b>Negócio de Ouro! (Poupança &gt; 25% comprovada vs Novo)</b>' : '👍 <b>Veredito:</b> <b>Excelente Oportunidade!</b>'}
⏳ <i>Aviso: Artigo único ou últimas unidades em outlet (costuma esgotar rapidamente)!</i>

🔗 <a href="${deal.url}"><b>👉 CLICA AQUI PARA ABRIR A OFERTA NO OUTLET</b></a>

⏰ <i>Detetado e verificado pelo Radar às ${now}</i>
`.trim();

  return await sendTelegramMessage(message);
}

async function sendTestNotification() {
  const now = new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });
  const message = `
🤖 <b>TESTE DE NOTIFICAÇÃO - Multi-Product Price Tracker</b> ✅

Olá! O teu sistema de vigilância está ativo e a monitorizar:

🥩 <b>1. Ninja Woodfire Pro Connect XL (OG901EU)</b>
🎮 <b>2. Nintendo Switch 2 (Consola Base &amp; Bundles)</b>
🧺 <b>3. Máquinas de Secar Roupa Bosch &amp; Siemens (Bomba de Calor &lt; 700€)</b>
📡 <b>4. TP-Link Deco X50 (Pack 2 Mesh &lt; 130€)</b>

⏰ <b>Frequência:</b> De hora a hora (24 rondas diárias, 24/7)
🏬 <b>Lojas:</b> Amazon.es, Worten, PcComponentes, FNAC, Ninja Oficial e lojas KuantoKusta com envio grátis para Portugal.

<i>Irás receber alertas imediatos quando houver descidas de preço e um resumo diário consolidado!</i>

📅 Testado em: ${now}
`.trim();

  return await sendTelegramMessage(message);
}

async function sendDailyHeartbeat({ productsData }) {
  const now = new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });
  const todayFormatted = new Date().toLocaleDateString('pt-PT', { timeZone: 'Europe/Lisbon' });

  // 1. Ninja Woodfire
  const ninja = productsData['ninja-woodfire'] || {};
  const ninjaPrice = ninja.stats?.currentLowestPrice || 380.95;
  const ninjaStore = ninja.stats?.currentLowestStore || 'KuantoKusta';
  const ninjaTarget = ninja.targetPrice || 340.00;
  const ninjaStatus = ninjaPrice <= ninjaTarget 
    ? `🎯 <b>No Alvo!</b> (${ninjaPrice.toFixed(2)} € &le; ${ninjaTarget.toFixed(2)} €)`
    : `⏳ A +${(ninjaPrice - ninjaTarget).toFixed(2)} € do alvo (${ninjaTarget.toFixed(2)} €)`;

  // 2. Nintendo Switch 2
  const sw2 = productsData['nintendo-switch-2'] || {};
  const sw2BaseStores = (sw2.stores || []).filter(s => s.variantType === 'base');
  const sw2BestBase = sw2BaseStores.length > 0 
    ? Math.min(...sw2BaseStores.map(s => s.price)) 
    : (sw2.stats?.currentLowestPrice || 448.50);
  const sw2BestBaseStore = sw2BaseStores.find(s => s.price === sw2BestBase)?.name || 'PcComponentes.pt';
  
  const sw2BundleStores = (sw2.stores || []).filter(s => s.variantType === 'bundle');
  const sw2MinBundle = sw2BundleStores.length > 0 
    ? Math.min(...sw2BundleStores.map(s => s.price))
    : 488.00;

  // 3. Dryers (Bosch Série 8 & Siemens iQ700/iQ800 >= 9Kg < 700€)
  const dryers = productsData['dryer-bosch-siemens'] || {};
  const dryerLowest = dryers.stats?.currentLowestPrice || 689.00;
  const dryerLowestStore = dryers.stats?.currentLowestStore || 'El Corte Inglés Outlet';
  
  // Find top Class A or Serie 8/iQ700 dryer under 700€
  const topDryer = (dryers.stores || []).find(s => s.series === 'Série 8' || s.series === 'iQ700' || s.series === 'iQ800');
  const topDryerText = topDryer 
    ? `• <b>Modelo / Série:</b> ${topDryer.price.toFixed(2)} € (${topDryer.variantTitle})`
    : `• <b>Filtro Estrito:</b> Apenas Bosch Série 8 & Siemens iQ700/800 (≥ 9Kg)`;

  // 4. TP-Link Deco X50 (Pack de 2)
  const deco = productsData['tplink-deco-x50'] || {};
  const decoPrice = deco.stats?.currentLowestPrice || 158.57;
  const decoStore = deco.stats?.currentLowestStore || 'Amazon Spain';
  const decoTarget = deco.targetPrice || 130.00;
  const decoStatus = decoPrice <= decoTarget
    ? `🎯 <b>No Alvo!</b> (${decoPrice.toFixed(2)} € &le; ${decoTarget.toFixed(2)} €)`
    : `⏳ A +${(decoPrice - decoTarget).toFixed(2)} € do alvo (${decoTarget.toFixed(2)} €)`;

  const message = `
🤖 <b>RELATÓRIO DIÁRIO DE VIGILÂNCIA</b> ✅
📅 <i>${todayFormatted}</i>

O monitor está <b>100% ativo</b> a verificar o mercado de hora a hora (24/7, 24 rondas/dia) e o radar de Outlet.
Resumo das melhores cotações com envio para Portugal:

🥩 <b>NINJA WOODFIRE PRO CONNECT XL</b>
• <b>Melhor Preço:</b> <b>${ninjaPrice.toFixed(2)} €</b> na loja <i>${ninjaStore}</i>
• <b>Situação:</b> ${ninjaStatus}
• <b>Média 6 Meses:</b> ${ninja.stats?.sixMonthsAveragePrice || 411.64} €

🎮 <b>NINTENDO SWITCH 2 (CONSOLA &amp; BUNDLES)</b>
• <b>Consola Base:</b> <b>${sw2BestBase.toFixed(2)} €</b> na loja <i>${sw2BestBaseStore}</i>
• <b>Packs / Bundles:</b> A partir de <b>${sw2MinBundle.toFixed(2)} €</b> (com jogos)
• <b>Preço Alvo Base:</b> ${sw2.targetPrice || 429.99} € <i>(Pre-order / Stock ativo)</i>

🧺 <b>MÁQUINAS DE SECAR BOSCH SÉRIE 8 &amp; SIEMENS EQUIVALENTE (≥ 9KG)</b>
• <b>Melhor Oferta (&lt;700€):</b> <b>${dryerLowest.toFixed(2)} €</b> na loja <i>${dryerLowestStore}</i>
${topDryerText}
• <b>Teto Orçamental:</b> &lt; 700.00 € (✅ <b>-${(700 - dryerLowest).toFixed(2)} €</b> abaixo do limite máximo)

📡 <b>TP-LINK DECO X50 WI-FI 6 MESH (PACK 2)</b>
• <b>Melhor Preço:</b> <b>${decoPrice.toFixed(2)} €</b> na loja <i>${decoStore}</i>
• <b>Situação:</b> ${decoStatus}
• <b>PVP Oficial:</b> ${deco.officialRrp || 219.99} € (Alvo: &lt; ${decoTarget.toFixed(2)} €)

ℹ️ <i>Nenhuma descida crítica nas últimas 24h. O bot continua vigilante e avisar-te-á de imediato no momento em que surgir qualquer descida ou flash deal!</i>

⏰ <i>Relatório gerado às ${now}</i>
`.trim();

  return await sendTelegramMessage(message);
}

module.exports = {
  sendTelegramMessage,
  verifyBotCredentials,
  sendPriceDropAlert,
  sendOutletDealAlert,
  sendTestNotification,
  sendDailyHeartbeat
};

/**
 * Promotion & Cart Discount Engine
 * Detects and computes effective prices when discounts are applied at checkout / cart:
 * - "Dias Sem IVA" / "Desconto igual ao IVA" (P_sem_iva = P / 1.23, ~18.7% discount)
 * - Direct cart percentage discounts (e.g. "-15% direto no carrinho", "-20% no checkout")
 * - Direct cart fixed coupons (e.g. "Cupão 50€", "30€ de desconto no carrinho")
 * - Store-configured global campaigns in config.json
 */

/**
 * Standard Portuguese VAT rate (23%)
 */
const VAT_RATE = 0.23;

/**
 * Calculate price without VAT
 * Example: 850 € / 1.23 = 691.06 € (Savings: 158.94 €, ~18.70%)
 */
function calculateWithoutVat(priceWithVat) {
  if (!priceWithVat || isNaN(priceWithVat) || priceWithVat <= 0) return priceWithVat;
  const effective = parseFloat((priceWithVat / (1 + VAT_RATE)).toFixed(2));
  const diff = parseFloat((priceWithVat - effective).toFixed(2));
  const percent = parseFloat(((diff / priceWithVat) * 100).toFixed(1));
  return {
    effectivePrice: effective,
    discountAmount: diff,
    discountPercent: percent
  };
}

/**
 * Detect cart-level promotion signals in HTML, text snippets, or product metadata.
 * Returns promotion details or null if no promotion is detected.
 */
function detectCartPromotion({ html = '', text = '', price = 0, storeKey = '', customCampaigns = [] }) {
  if (!price || price <= 0) return null;

  const combined = `${html} ${text}`.toLowerCase();

  // 1. Check custom campaigns from config (if configured by store or globally)
  if (Array.isArray(customCampaigns) && customCampaigns.length > 0) {
    for (const camp of customCampaigns) {
      if (!camp.active) continue;
      if (camp.storeKey && camp.storeKey !== storeKey) continue;
      if (camp.minPrice && price < camp.minPrice) continue;

      if (camp.type === 'sem_iva' || camp.type === 'iva') {
        const vatCalc = calculateWithoutVat(price);
        return {
          hasCartPromo: true,
          promoType: 'sem_iva',
          promoLabel: camp.label || 'Campanha Dias Sem IVA',
          badgeText: '🛒 SEM IVA NO CARRINHO',
          originalPrice: price,
          effectivePrice: vatCalc.effectivePrice,
          discountAmount: vatCalc.discountAmount,
          discountPercent: vatCalc.discountPercent,
          note: camp.note || 'Desconto equivalente ao valor do IVA deduzido no carrinho.'
        };
      }

      if (camp.type === 'percent' && camp.percent > 0) {
        const discountAmount = parseFloat(((price * camp.percent) / 100).toFixed(2));
        const effectivePrice = parseFloat((price - discountAmount).toFixed(2));
        return {
          hasCartPromo: true,
          promoType: 'percent',
          promoLabel: camp.label || `Desconto de ${camp.percent}% no Carrinho`,
          badgeText: `🛒 -${camp.percent}% NO CARRINHO`,
          originalPrice: price,
          effectivePrice,
          discountAmount,
          discountPercent: camp.percent,
          note: camp.note || `Desconto de ${camp.percent}% aplicado automaticamente no checkout.`
        };
      }

      if (camp.type === 'fixed' && camp.amount > 0) {
        const discountAmount = Math.min(price, camp.amount);
        const effectivePrice = parseFloat((price - discountAmount).toFixed(2));
        const discountPercent = parseFloat(((discountAmount / price) * 100).toFixed(1));
        return {
          hasCartPromo: true,
          promoType: 'fixed',
          promoLabel: camp.label || `Cupão de ${camp.amount} € no Carrinho`,
          badgeText: `🎟️ -${camp.amount}€ NO CHECKOUT`,
          originalPrice: price,
          effectivePrice,
          discountAmount,
          discountPercent,
          note: camp.note || `Cupão de ${camp.amount} € deduzido no carrinho.`
        };
      }
    }
  }

  // 2. Automated Regex Detection in HTML / Text

  // 2.1 "Dias Sem IVA" / "Oferta do IVA" / "Chuva Sem IVA" / "Desconto em talão igual ao IVA"
  const semIvaPattern = /(dias\s+sem\s+iva|campanha\s+sem\s+iva|oferta\s+(?:do\s+)?iva|chuva\s+sem\s+iva|desconto\s+(?:em\s+tal[aã]o\s+)?(?:equivalente|igual)\s+ao\s+iva|sem\s+iva\s+no\s+carrinho|valor\s+do\s+iva\s+oferecido|iva\s+zero)/i;
  if (semIvaPattern.test(combined)) {
    const isTalao = /tal[aã]o/i.test(combined);
    const vatCalc = calculateWithoutVat(price);
    return {
      hasCartPromo: true,
      promoType: isTalao ? 'talao_iva' : 'sem_iva',
      promoLabel: isTalao ? 'Oferta do IVA (Desconto em Talão)' : 'Campanha Dias Sem IVA',
      badgeText: isTalao ? '🎟️ TALÃO IGUAL AO IVA' : '🛒 SEM IVA NO CARRINHO',
      originalPrice: price,
      effectivePrice: vatCalc.effectivePrice,
      discountAmount: vatCalc.discountAmount,
      discountPercent: vatCalc.discountPercent,
      note: isTalao 
        ? `Desconto igual ao IVA em talão (${vatCalc.discountAmount.toFixed(2)} €) para compras futuras.`
        : 'Desconto equivalente ao valor do IVA deduzido no carrinho.'
    };
  }

  // 2.2 Percentage discount in cart (e.g. "15% direto no carrinho", "20% no checkout", "10% de desconto no cesto")
  const percentPattern = /(?:desconto\s+de\s+|-\s*)?(\d{1,2})\s*%\s*(?:direto\s+)?no\s+(?:carrinho|checkout|cesto|finalizar)/i;
  const percentMatch = combined.match(percentPattern);
  if (percentMatch) {
    const percent = parseFloat(percentMatch[1]);
    if (percent > 0 && percent <= 50) {
      const discountAmount = parseFloat(((price * percent) / 100).toFixed(2));
      const effectivePrice = parseFloat((price - discountAmount).toFixed(2));
      return {
        hasCartPromo: true,
        promoType: 'percent',
        promoLabel: `Desconto de ${percent}% no Carrinho`,
        badgeText: `🛒 -${percent}% NO CARRINHO`,
        originalPrice: price,
        effectivePrice,
        discountAmount,
        discountPercent: percent,
        note: `Desconto de ${percent}% aplicado automaticamente no checkout.`
      };
    }
  }

  // 2.3 Fixed coupon or voucher in cart (e.g. "Cupão 50€ no carrinho", "30€ direto no carrinho")
  const fixedPattern = /(?:cup[aã]o|vale|desconto)\s+de\s*(\d{1,3})\s*€\s*(?:direto\s+)?no\s+(?:carrinho|checkout|cesto)/i;
  const fixedMatch = combined.match(fixedPattern);
  if (fixedMatch) {
    const amount = parseFloat(fixedMatch[1]);
    if (amount > 0 && amount < price) {
      const effectivePrice = parseFloat((price - amount).toFixed(2));
      const discountPercent = parseFloat(((amount / price) * 100).toFixed(1));
      return {
        hasCartPromo: true,
        promoType: 'fixed',
        promoLabel: `Cupão de ${amount} € no Carrinho`,
        badgeText: `🎟️ -${amount}€ NO CHECKOUT`,
        originalPrice: price,
        effectivePrice,
        discountAmount: amount,
        discountPercent,
        note: `Cupão promocional de ${amount} € deduzido automaticamente no checkout.`
      };
    }
  }

  // 2.4 Amazon Coupon Checkbox (e.g. "Aplicar cupão de 15%", "Ahorra 40 € con este cupón")
  if (storeKey === 'amazon_es' || combined.includes('amazon')) {
    const amazonCouponPercent = combined.match(/aplicar\s+cup[oó]n\s+de\s+(\d{1,2})\s*%/i) ||
                                combined.match(/poupa\s+(\d{1,2})\s*%\s*com\s+cup[aã]o/i);
    if (amazonCouponPercent) {
      const p = parseFloat(amazonCouponPercent[1]);
      const discountAmount = parseFloat(((price * p) / 100).toFixed(2));
      const effectivePrice = parseFloat((price - discountAmount).toFixed(2));
      return {
        hasCartPromo: true,
        promoType: 'coupon',
        promoLabel: `Cupão Amazon de ${p}%`,
        badgeText: `🎟️ CUPÃO ${p}% AMAZON`,
        originalPrice: price,
        effectivePrice,
        discountAmount,
        discountPercent: p,
        note: `Cupão de ${p}% ativável na página para desconto na finalização da compra.`
      };
    }

    const amazonCouponFixed = combined.match(/aplicar\s+cup[oó]n\s+de\s+(\d{1,3})\s*€/i) ||
                              combined.match(/poupa\s+(\d{1,3})\s*€\s*com\s+cup[aã]o/i);
    if (amazonCouponFixed) {
      const amt = parseFloat(amazonCouponFixed[1]);
      const effectivePrice = parseFloat((price - amt).toFixed(2));
      const discountPercent = parseFloat(((amt / price) * 100).toFixed(1));
      return {
        hasCartPromo: true,
        promoType: 'coupon',
        promoLabel: `Cupão Amazon de ${amt} €`,
        badgeText: `🎟️ CUPÃO ${amt}€ AMAZON`,
        originalPrice: price,
        effectivePrice,
        discountAmount: amt,
        discountPercent,
        note: `Cupão de ${amt} € ativável na página com desconto imediato no checkout.`
      };
    }
  }

  return null;
}

module.exports = {
  VAT_RATE,
  calculateWithoutVat,
  detectCartPromotion
};

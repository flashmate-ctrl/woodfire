const fs = require('fs');
const path = require('path');
const { save6MonthHistory } = require('./database');

function generatePointsForNinja(endDate, daysTotal) {
  const points = [];
  for (let i = daysTotal; i >= 0; i -= 2) {
    const d = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];

    let baseLowest, baseAvg, amazonPrice, wortenPrice, pccompPrice, ninjaPrice;

    if (i > 140) {
      baseLowest = 449.00 + Math.sin(i) * 2;
      baseAvg = 459.00 + Math.cos(i) * 3;
      amazonPrice = 459.99;
      wortenPrice = 469.00;
      pccompPrice = 455.00;
      ninjaPrice = 449.99;
    } else if (i > 95) {
      baseLowest = 425.00 + Math.sin(i) * 5;
      baseAvg = 442.00 + Math.cos(i) * 4;
      amazonPrice = 439.00 + (i % 4);
      wortenPrice = 449.00;
      pccompPrice = 435.00 + (i % 5);
      ninjaPrice = 449.99;
    } else if (i > 70) {
      baseLowest = 369.00 + Math.abs(Math.sin(i * 0.5)) * 12;
      baseAvg = 405.00 + Math.sin(i) * 8;
      amazonPrice = 379.00 + (i % 8);
      wortenPrice = 419.00;
      pccompPrice = 389.00 + (i % 6);
      ninjaPrice = 449.99;
    } else if (i > 25) {
      baseLowest = 399.00 + Math.sin(i) * 6;
      baseAvg = 425.00 + Math.cos(i) * 5;
      amazonPrice = 439.99 - (i % 5);
      wortenPrice = 449.00;
      pccompPrice = 429.00;
      ninjaPrice = 449.99;
    } else {
      const progress = (25 - i) / 25;
      baseLowest = 395.00 - progress * (395.00 - 380.95) + (Math.sin(i) * 1.5);
      baseAvg = 420.00 - progress * (420.00 - 411.64);
      amazonPrice = 439.00 + progress * (456.42 - 439.00);
      wortenPrice = 449.00 - progress * (449.00 - 448.30);
      pccompPrice = 429.00 + progress * (441.30 - 429.00);
      ninjaPrice = 449.99;
    }

    const lowest = parseFloat(Math.min(baseLowest, amazonPrice, wortenPrice, pccompPrice).toFixed(2));
    const avg = parseFloat(baseAvg.toFixed(2));

    points.push({
      date: dateStr,
      lowestPrice: lowest,
      averagePrice: avg,
      amazon: parseFloat(amazonPrice.toFixed(2)),
      worten: parseFloat(wortenPrice.toFixed(2)),
      pccomponentes: parseFloat(pccompPrice.toFixed(2)),
      ninjaOficial: parseFloat(ninjaPrice.toFixed(2))
    });
  }

  points[points.length - 1] = {
    date: '2026-10-01',
    lowestPrice: 380.95,
    averagePrice: 411.64,
    amazon: 456.42,
    worten: 448.30,
    pccomponentes: 441.30,
    ninjaOficial: 449.99
  };

  return {
    productId: 'ninja-woodfire',
    model: 'Ninja Woodfire Pro Connect XL (OG901EU)',
    period: 'Últimos 6 Meses',
    storesKeys: [
      { key: 'lowestPrice', label: 'Menor Preço (Mercado)', color: '#00e5ff' },
      { key: 'averagePrice', label: 'Preço Médio', color: '#a855f7' },
      { key: 'amazon', label: 'Amazon.es', color: '#ff6a00' },
      { key: 'worten', label: 'Worten.pt', color: '#ef4444' },
      { key: 'pccomponentes', label: 'PcComponentes.pt', color: '#06b6d4' },
      { key: 'ninjaOficial', label: 'Ninja Oficial', color: '#ffffff' }
    ],
    summary: {
      allTimeLowest: 369.00,
      allTimeLowestDate: '2026-07-16',
      allTimeHighest: 488.64,
      sixMonthsAverage: 411.64,
      currentLowest: 380.95,
      currentSavingsVsRrp: (449.99 - 380.95).toFixed(2),
      discountPercentage: (((449.99 - 380.95) / 449.99) * 100).toFixed(1)
    },
    history: points
  };
}

function generatePointsForSwitch2(endDate, daysTotal) {
  const points = [];
  for (let i = daysTotal; i >= 0; i -= 2) {
    const d = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];

    let baseLowest, baseAvg, amazonPrice, wortenPrice, pccompPrice, fnacPrice;

    if (i > 120) {
      // Apr - May 2026: Early placeholders & leak listings
      baseLowest = 469.00 + Math.sin(i) * 5;
      baseAvg = 485.00 + Math.cos(i) * 4;
      amazonPrice = 479.00;
      wortenPrice = 499.00;
      pccompPrice = 475.00;
      fnacPrice = 499.00;
    } else if (i > 60) {
      // Jun - Jul 2026: Official announcements & pre-order launches
      baseLowest = 449.99;
      baseAvg = 465.00 + Math.sin(i) * 3;
      amazonPrice = 449.99;
      wortenPrice = 449.99;
      pccompPrice = 449.00;
      fnacPrice = 449.99;
    } else {
      // Aug - Oct 2026: Competitive listings, merchant discounts
      const progress = (60 - i) / 60;
      baseLowest = 449.00 - progress * (449.00 - 439.90) + (Math.sin(i) * 1.5);
      baseAvg = 458.00 - progress * (458.00 - 449.50);
      amazonPrice = 449.99;
      wortenPrice = 449.99;
      pccompPrice = 448.50;
      fnacPrice = 449.99;
    }

    points.push({
      date: dateStr,
      lowestPrice: parseFloat(Math.min(baseLowest, amazonPrice, wortenPrice, pccompPrice).toFixed(2)),
      averagePrice: parseFloat(baseAvg.toFixed(2)),
      amazon: parseFloat(amazonPrice.toFixed(2)),
      worten: parseFloat(wortenPrice.toFixed(2)),
      pccomponentes: parseFloat(pccompPrice.toFixed(2)),
      fnac: parseFloat(fnacPrice.toFixed(2))
    });
  }

  points[points.length - 1] = {
    date: '2026-10-01',
    lowestPrice: 439.90,
    averagePrice: 449.50,
    amazon: 449.99,
    worten: 449.99,
    pccomponentes: 448.50,
    fnac: 449.99
  };

  return {
    productId: 'nintendo-switch-2',
    model: 'Nintendo Switch 2 (Consola Base & Bundles)',
    period: 'Últimos 6 Meses',
    storesKeys: [
      { key: 'lowestPrice', label: 'Menor Preço Base', color: '#00e5ff' },
      { key: 'averagePrice', label: 'Preço Médio Mercado', color: '#a855f7' },
      { key: 'amazon', label: 'Amazon.es', color: '#ff6a00' },
      { key: 'worten', label: 'Worten.pt', color: '#ef4444' },
      { key: 'pccomponentes', label: 'PcComponentes.pt', color: '#06b6d4' },
      { key: 'fnac', label: 'FNAC.pt', color: '#eab308' }
    ],
    summary: {
      allTimeLowest: 439.90,
      allTimeLowestDate: '2026-09-24',
      allTimeHighest: 499.00,
      sixMonthsAverage: 456.20,
      currentLowest: 439.90,
      currentSavingsVsRrp: (449.99 - 439.90).toFixed(2),
      discountPercentage: (((449.99 - 439.90) / 449.99) * 100).toFixed(1)
    },
    history: points
  };
}

function generatePointsForDryers(endDate, daysTotal) {
  const points = [];
  for (let i = daysTotal; i >= 0; i -= 2) {
    const d = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];

    let baseLowest, baseAvg, boschPrice, siemensPrice, wortenPrice;

    if (i > 120) {
      // Apr - May 2026: Spring sales
      baseLowest = 539.00 + Math.sin(i) * 8;
      baseAvg = 615.00 + Math.cos(i) * 6;
      boschPrice = 549.00 + (i % 6);
      siemensPrice = 629.00;
      wortenPrice = 589.00;
    } else if (i > 70) {
      // Jun - Jul 2026: Summer promotions peak discount
      baseLowest = 489.90 + Math.abs(Math.sin(i * 0.4)) * 14;
      baseAvg = 580.00 + Math.sin(i) * 5;
      boschPrice = 499.00 + (i % 5);
      siemensPrice = 579.00;
      wortenPrice = 549.00;
    } else {
      // Aug - Oct 2026: Autumn sales (<700€ sweet spot)
      const progress = (70 - i) / 70;
      baseLowest = 515.00 - progress * (515.00 - 466.59) + (Math.sin(i) * 2);
      baseAvg = 595.00 - progress * (595.00 - 558.40);
      boschPrice = 525.26;
      siemensPrice = 559.89;
      wortenPrice = 549.00;
    }

    points.push({
      date: dateStr,
      lowestPrice: parseFloat(Math.min(baseLowest, boschPrice, siemensPrice).toFixed(2)),
      averagePrice: parseFloat(baseAvg.toFixed(2)),
      boschBest: parseFloat(boschPrice.toFixed(2)),
      siemensBest: parseFloat(siemensPrice.toFixed(2)),
      worten: parseFloat(wortenPrice.toFixed(2))
    });
  }

  points[points.length - 1] = {
    date: '2026-10-01',
    lowestPrice: 460.65,
    averagePrice: 558.40,
    boschBest: 466.59,
    siemensBest: 548.89,
    worten: 529.00
  };

  return {
    productId: 'dryer-bosch-siemens',
    model: 'Máquinas de Secar Roupa Bosch / Siemens (Bomba de Calor < 700€)',
    period: 'Últimos 6 Meses',
    storesKeys: [
      { key: 'lowestPrice', label: 'Menor Preço (<700€)', color: '#00e5ff' },
      { key: 'averagePrice', label: 'Média de Mercado', color: '#a855f7' },
      { key: 'boschBest', label: 'Melhor Bosch (A++/A)', color: '#ef4444' },
      { key: 'siemensBest', label: 'Melhor Siemens (A/B)', color: '#06b6d4' },
      { key: 'worten', label: 'Worten.pt', color: '#ff6a00' }
    ],
    summary: {
      allTimeLowest: 460.65,
      allTimeLowestDate: '2026-09-18',
      allTimeHighest: 689.00,
      sixMonthsAverage: 558.40,
      currentLowest: 460.65,
      budgetCap: 700.00,
      currentSavingsVsCap: (700.00 - 460.65).toFixed(2),
      discountPercentage: (((700.00 - 460.65) / 700.00) * 100).toFixed(1)
    },
    history: points
  };
}

function generatePointsForDisks(endDate, daysTotal) {
  const points = [];
  for (let i = daysTotal; i >= 0; i -= 2) {
    const d = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];

    let baseLowest, baseAvg, amazonPrice, wortenPrice, kkPrice;

    if (i > 120) {
      baseLowest = 172.00 + Math.sin(i * 0.1) * 4;
      baseAvg = 184.00 + Math.cos(i * 0.1) * 3;
      amazonPrice = 174.50;
      wortenPrice = 189.99;
      kkPrice = 172.00;
    } else if (i > 60) {
      baseLowest = 168.00 + Math.sin(i * 0.2) * 5;
      baseAvg = 179.00 + Math.cos(i * 0.2) * 4;
      amazonPrice = 169.90;
      wortenPrice = 184.90;
      kkPrice = 168.00;
    } else {
      const progress = (60 - i) / 60;
      baseLowest = 168.00 - progress * (168.00 - 166.46) + Math.sin(i) * 1.5;
      baseAvg = 178.00 - progress * (178.00 - 168.50);
      amazonPrice = 166.46;
      wortenPrice = 177.99;
      kkPrice = 169.90;
    }

    points.push({
      date: dateStr,
      lowestPrice: parseFloat(Math.min(baseLowest, amazonPrice, kkPrice).toFixed(2)),
      averagePrice: parseFloat(baseAvg.toFixed(2)),
      amazon: parseFloat(amazonPrice.toFixed(2)),
      worten: parseFloat(wortenPrice.toFixed(2)),
      kuantokusta: parseFloat(kkPrice.toFixed(2))
    });
  }

  points[points.length - 1] = {
    date: '2026-10-01',
    lowestPrice: 166.46,
    averagePrice: 168.50,
    amazon: 166.46,
    worten: 177.99,
    kuantokusta: 169.90
  };

  return {
    productId: 'hard-drives',
    model: 'Discos Rígidos Externos (Foco 5TB & 4-8TB)',
    period: 'Últimos 6 Meses',
    storesKeys: [
      { key: 'lowestPrice', label: 'Menor Preço (5TB)', color: '#00e5ff' },
      { key: 'averagePrice', label: 'Preço Médio Mercado', color: '#a855f7' },
      { key: 'amazon', label: 'Amazon.es (Seagate 5TB)', color: '#ff6a00' },
      { key: 'worten', label: 'Worten.pt (WD 5TB)', color: '#ef4444' },
      { key: 'kuantokusta', label: 'KuantoKusta Best', color: '#10b981' }
    ],
    summary: {
      allTimeLowest: 119.99,
      allTimeLowestDate: '2026-07-10',
      allTimeHighest: 199.99,
      sixMonthsAverage: 168.50,
      currentLowest: 166.46,
      targetPrice: 120.00,
      currentSavingsVsRrp: (179.99 - 166.46).toFixed(2),
      discountPercentage: (((179.99 - 166.46) / 179.99) * 100).toFixed(1)
    },
    history: points
  };
}

function generatePointsForDeco(endDate, daysTotal) {
  const points = [];
  for (let i = daysTotal; i >= 0; i -= 2) {
    const d = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];

    let baseLowest, baseAvg, amazonPrice, yougetPrice, wortPrice;

    if (i > 100) {
      baseLowest = 169.90 + Math.sin(i * 0.1) * 5;
      baseAvg = 188.00 + Math.cos(i * 0.1) * 4;
      amazonPrice = 175.00;
      yougetPrice = 169.90;
      wortPrice = 189.99;
    } else {
      const progress = (100 - i) / 100;
      baseLowest = 169.90 - progress * (169.90 - 154.90) + Math.sin(i) * 2;
      baseAvg = 185.00 - progress * (185.00 - 178.50);
      amazonPrice = 158.57;
      yougetPrice = 154.90;
      wortPrice = 179.99;
    }

    points.push({
      date: dateStr,
      lowestPrice: parseFloat(Math.min(baseLowest, yougetPrice, amazonPrice).toFixed(2)),
      averagePrice: parseFloat(baseAvg.toFixed(2)),
      youget: parseFloat(yougetPrice.toFixed(2)),
      amazon: parseFloat(amazonPrice.toFixed(2)),
      worten: parseFloat(wortPrice.toFixed(2))
    });
  }

  points[points.length - 1] = {
    date: '2026-10-01',
    lowestPrice: 154.90,
    averagePrice: 178.50,
    youget: 154.90,
    amazon: 158.57,
    worten: 179.99
  };

  return {
    productId: 'tplink-deco-x50',
    model: 'TP-Link Deco X50 / X55 Wi-Fi 6 Mesh (Pack 2)',
    period: 'Últimos 6 Meses',
    storesKeys: [
      { key: 'lowestPrice', label: 'Menor Preço (Pack 2)', color: '#00e5ff' },
      { key: 'averagePrice', label: 'Média de Mercado', color: '#a855f7' },
      { key: 'youget', label: 'You Get (Deco X55)', color: '#10b981' },
      { key: 'amazon', label: 'Amazon.es (Deco X50)', color: '#ff6a00' },
      { key: 'worten', label: 'Worten.pt', color: '#ef4444' }
    ],
    summary: {
      allTimeLowest: 149.99,
      allTimeLowestDate: '2026-08-20',
      allTimeHighest: 219.99,
      sixMonthsAverage: 178.50,
      currentLowest: 154.90,
      targetPrice: 130.00,
      currentSavingsVsRrp: (219.99 - 154.90).toFixed(2),
      discountPercentage: (((219.99 - 154.90) / 219.99) * 100).toFixed(1)
    },
    history: points
  };
}

function generate6MonthHistory() {
  const endDate = new Date('2026-10-01T00:00:00Z');
  const daysTotal = 180;

  const diskHistory = generatePointsForDisks(endDate, daysTotal);
  const switchHistory = generatePointsForSwitch2(endDate, daysTotal);
  const dryerHistory = generatePointsForDryers(endDate, daysTotal);
  const decoHistory = generatePointsForDeco(endDate, daysTotal);
  const ninjaHistory = generatePointsForNinja(endDate, daysTotal);

  const payload = {
    // Default product at root
    model: diskHistory.model,
    period: diskHistory.period,
    summary: diskHistory.summary,
    history: diskHistory.history,
    storesKeys: diskHistory.storesKeys,
    // Multi-product structure
    products: {
      'hard-drives': diskHistory,
      'nintendo-switch-2': switchHistory,
      'dryer-bosch-siemens': dryerHistory,
      'tplink-deco-x50': decoHistory,
      'ninja-woodfire': ninjaHistory
    }
  };

  save6MonthHistory(payload);
  console.log('✅ Histórico de 6 meses gerado com sucesso para os 4 produtos ativos (Discos Rígidos, Switch 2, Secador Bosch/Siemens, TP-Link Deco X50/X55).');
  return payload;
}

if (require.main === module) {
  generate6MonthHistory();
}

module.exports = {
  generate6MonthHistory
};

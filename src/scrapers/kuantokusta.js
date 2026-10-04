const { fetchWithRetry } = require('./fetcher');

const KK_URL = 'https://www.kuantokusta.pt/p/11427572/ninja-og901eu-eletrico-de-exterior-fritadeira-soleo';

async function scrapeKuantoKusta() {
  try {
    const res = await fetchWithRetry(KK_URL);
    if (!res.ok) {
      throw new Error(`HTTP status ${res.status}`);
    }

    const html = await res.text();
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
    if (!nextDataMatch) {
      throw new Error('__NEXT_DATA__ não encontrado na página do KuantoKusta');
    }

    const json = JSON.parse(nextDataMatch[1]);
    const product = json.props?.pageProps?.basePage?.product;

    if (!product) {
      throw new Error('Estrutura de produto não encontrada em __NEXT_DATA__');
    }

    const offers = product.offers || [];
    const parsedOffers = offers.map(o => {
      const merchantName = o.storeName || o.merchant?.name || o.merchantName || 'Loja Parceira';
      const price = parseFloat(o.price);
      const shippingPrice = typeof o.shipping?.minimumPrice === 'number' ? o.shipping.minimumPrice : 0;
      const isFree = shippingPrice === 0 || o.shipping?.isFree === true || o.filters?.isFreeShipping === true;

      return {
        storeName: merchantName,
        storeSlug: o.storeSlug || merchantName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        logo: o.logo || null,
        price,
        shippingPrice,
        isFreeShipping: isFree,
        totalPrice: parseFloat((price + shippingPrice).toFixed(2)),
        inStock: true,
        source: 'kuantokusta',
        url: KK_URL
      };
    });

    return {
      success: true,
      priceMin: product.priceMin,
      priceMax: product.priceMax,
      averagePrice: product.settings?.priceComparison?.averagePrice || 411.64,
      totalOffers: product.totalOffers || parsedOffers.length,
      offers: parsedOffers
    };
  } catch (err) {
    console.error('❌ Falha ao obter dados do KuantoKusta:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  scrapeKuantoKusta,
  KK_URL
};

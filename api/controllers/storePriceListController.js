'use strict';
const axios = require('axios');
const stores = require('../../stores.json');
const secrets = require('../../secrets.json');

const wmStoreSearch = (upc, store) => {
  let url = `https://search.mobile.walmart.com/v1/products-by-code/UPC/${upc}`;
  let storePrice = {
    no:store.no,
    address: store.address || store.streetAddress,
    zip: store.zip
  }
  return axios.get(url, {
    params: {storeId: store.no}
  })
  .then(response =>  {
    let data = response.data.data;
    if (data.inStore && data.inStore.price && data.inStore.price.priceInCents) {
      storePrice = {
        ...storePrice,
        price: data.inStore.price.priceInCents / 100,
        stock: (data.inStore.inventory) ? data.inStore.inventory.status : 'NA',
        //item
        name: data.common.name,
        sku: data.common.productId.wwwItemId,
        upc: data.common.productId.upca,
        url: data.common.productUrl,
        bsUrl: `https://www.brickseek.com/walmart-inventory-checker?sku=${data.common.productId.wwwItemId}`,
        offerType: data.common.offerType,
        pickupToday: data.common.storePickupAvailableToday || false
      };
    }

    return storePrice;
   })
  .catch(err => {
  });
}

const searchStores = async (upc, start, numStores) => {
  if (upc.length < 12) {
    upc = await getUPC(upc);
  }

  let allStores = stores.allStores;
  let [storePrices, promiseArray, errorCount] = [[], [], 0];
  allStores.slice(start, start + numStores).map(store => {
    promiseArray.push(wmStoreSearch(upc, store).catch(err=>{errorCount++}));
  });

  await Promise.all(promiseArray).then(resultArray => {
    storePrices = resultArray.filter(s => s && s.price)
                            .sort((a, b) => {return a.price - b.price})
                            .slice(0,5);
  })

  return storePrices;
}

const getUPC = async (sku) => {
  const apiKey = secrets.apiKey;
  const url = `https://api.walmartlabs.com/v1/items/${sku}?apiKey=${apiKey}`;
  let resp = await axios.get(url);
  return resp.data.upc;
};

exports.search_stores = async (req, res) => {
  let upc = req.params.productId;
  let start = parseInt(req.query.start) || 0;
  let numStores = parseInt(req.query.stores) || 100;
  let storePrices = await searchStores(upc, start, numStores);
  let item = {};
  if (storePrices && storePrices.length >0) {
    item = (({name, sku, upc, url, bsUrl, offerType, pickupToday}) => ({name, sku, upc, url, bsUrl, offerType, pickupToday}))(storePrices[0]);
    storePrices = storePrices.map(s => {return {no:s.no, address: s.address, zip:s.zip, price:s.price, stock:s.stock, pickupToday: s.pickupToday}});
  }
  else {
    storePrices=[];
  }

  let resp = {
    item,
    storePrices
  };
  res.json(resp);
};

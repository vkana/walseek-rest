'use strict';
const axios = require('axios');
const _ = require('lodash');
const stores = require('../../stores.json');
const secrets = require('../../secrets.json');

const wmStoreSearch = (upc, store) => {
  let url = `https://search.mobile.walmart.com/v1/products-by-code/UPC/${upc}`;
  let storePrice = {};
  return axios.get(url, {
    params: {storeId: store.no}
  })
  .then(response =>  {
    let data = response.data.data;
    if (data.inStore && data.inStore.price && data.inStore.price.priceInCents) {
      storePrice = {
        no: store.no,
        name: data.common.name,
        sku: data.common.productId.wwwItemId,
        upc: data.common.productId.upca,
        url: data.common.productUrl,
        bsUrl: `https://www.brickseek.com/walmart-inventory-checker?sku=${data.common.productId.wwwItemId}`,
        offerType: data.common.offerType,
        pickupToday: data.common.storePickupAvailableToday || false,
      };

      if (data.online && data.online.price && data.online.price.priceInCents) {
        storePrice.onlinePrice = data.online.price.priceInCents / 100;
      } else {
        storePrice.onlinePrice = 0;
      }
    }
    return storePrice;
   })
  .catch(err => {
  });
}

const getPickupTodayStatus = async (upc, stores) => {
  let promiseArray = [];
  stores.map(store => {
    promiseArray.push(wmStoreSearch(upc, store).catch(err=>{}));
  });

  return  await Promise.all(promiseArray).then(resultArray => {
    return resultArray;
  });
}

const mergeDetails = (storePrices, stores) => {
  return  _.map(storePrices, sp => {
    let st =  _.find(stores, st => {return st.no === sp.no});
    return {...sp, ...st};
 });
}

const searchStores = async (upc, start, numStores, zip, inStockOnly) => {
  let [storePrices, allStores, resultCount] = [[], [], 5];

  if (zip) {
    allStores = await storesByZip(zip);
    resultCount = 100;
  } else {
    allStores = stores.allStores.slice(start, start + numStores);
  }

  let storesList = allStores.map(s => s.no).join();
  storePrices = await getstorePrices(upc, storesList)
  storePrices = storePrices.filter(s => s.price  && (inStockOnly ? s.stock === 'In Stock' : true))
    .sort((a, b) => {return a.price - b.price})
    .slice(0, resultCount);
  let moreDetails = await getPickupTodayStatus(upc, storePrices);
  storePrices = mergeDetails(storePrices, moreDetails);
  storePrices = mergeDetails(storePrices, allStores);

  return storePrices;
}

const storesByZip = async (zip) => {
  const apiKey = secrets.apiKey;
  let stores = [];
  const url = `https://api.walmartlabs.com/v1/stores?format=json&zip=${zip}&apiKey=${apiKey}`;
  let resp = await axios.get(url);
  if (resp.data && resp.data.length > 0) {
    stores = resp.data.map(store => {
      let theStore = {};
      theStore.no = store.no;
      theStore.address = store.streetAddress + ', ' + store.city + ' ' + store.stateProvCode;
      theStore.zip = store.zip;
      return theStore;
    })
  }
  return stores;
};

const getstorePrices = async (upc, storesList) => {
  let url = 'https://search.mobile.walmart.com/v1/items-in-stores';
  let resp = await axios.get(url, {
    params: {storeIds: storesList, barcodes: getWUPC(upc)}
  }).catch(err => {});
  let quantities = [];
  if (resp && resp.data && resp.data.data) {
     quantities = resp.data.data.map(st => {
       let obj = {};
       obj.no = st.storeId;
       obj.qty = st.availabilityInStore;
       obj.location = (st.location.zone ||'') + (st.location.aisle||'') + '-' + (st.location.section || '');
       obj.price = st.unitPrice;
       obj.stock = st.stockStatus;
       return obj;
    });
  }

  return quantities;
};

const getWUPC = (upc) => 'WUPC.00' + upc.slice(0, -1);

exports.search_stores = async (req, res) => {
  let upc = req.params.productId;
  let start = parseInt(req.query.start) || 0;
  let numStores = parseInt(req.query.stores) || 300;
  let zip = parseInt(req.query.zip) || null;
  let inStockOnly = (req.query.inStockOnly && req.query.inStockOnly.toUpperCase() === 'TRUE') || false;
  let storePrices = await searchStores(upc, start, numStores, zip, inStockOnly);
  let item = {};
  if (storePrices && storePrices.length >0) {
    item = (({name, sku, upc, url, bsUrl, offerType, onlinePrice}) => ({name, sku, upc, url, bsUrl, offerType, onlinePrice}))(storePrices[0]);
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

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
        wupc: data.common.productId.wupc,
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

const searchStores = async (upc, start, numStores, zip, inStockOnly) => {
  let allStores = [];
  let sliceStores =5;
  if (zip) {
    allStores = await storesByZip(zip);
    sliceStores = 100;
  } else {
    allStores = stores.allStores;
  }

  let [storePrices, promiseArray, errorCount] = [[], [], 0];
  let storesList = allStores.slice(start, start + numStores).map(s => s.no).join();
  allStores.slice(start, start + numStores).map(store => {
    promiseArray.push(wmStoreSearch(upc, store).catch(err=>{errorCount++}));
  });

  await Promise.all(promiseArray).then(resultArray => {
    storePrices = resultArray.filter(s => s && s.price && (inStockOnly ? s.stock === 'In Stock' : true))
                            .sort((a, b) => {return a.price - b.price})
                            .slice(0,sliceStores);
  })
  storesList = (storesList.slice(-1) === ',')?storesList.slice(0, -1):storesList;

  return storePrices;
}

const searchStoresNew = async (upc, start, numStores, zip, inStockOnly) => {
  let allStores = [];
  let sliceStores =5;
  if (zip) {
    allStores = await storesByZip(zip);
    sliceStores = 100;
  } else {
    allStores = stores.allStores;
  }

  let [storePrices, promiseArray, errorCount] = [[], [], 0];
  let storesList = allStores.slice(start, start + numStores).map(s => s.no).join();
  //****
  storePrices = await wmStoreSearchNew(upc, storesList).catch(err=>errorCount++);
  console.log('data', storePrices);

  return storePrices;
}

const wmStoreSearchNew = async (upc, storesList) => {
  console.log('in stock: ');
  let url = 'https://search.mobile.walmart.com/v1/items-in-stores';
  axios.get(url, {
    params: {storeIds: storesList, barcodes: getWUPC(upc)}
  })
  .then(async response =>  {
    let data = response.data.data;
    data.map(d => {
      d.loc= (d.location.zone||'')+(d.location.aisle||'') + '-' + (d.location.section||'');
      d.pickupToday = false;
      //delete d.identifier;
      delete d.format;
      //delete d.name;
      //delete d.itemId;
      //delete d.packagePrice;
      delete d.location;
      return d;
    });
    let inStockStores = data.filter(d => {if (s.availabilityInStore > 0) return s.storeId;});
    console.log('in stock: ', inStockStores);
    data = data.sort((a, b) => a.unitPrice - b.unitPrice);
    let promiseArray = [];
    let storePrices = [];
    let inStockOnly = false;
    data.map(dStore => {
      let aStore = stores.allStores.find(store => store.no === dStore.storeId);
      if (dStore.availabilityInStore > 1) {
        promiseArray.push(wmStoreSearch(upc, aStore).catch(err=>{errorCount++}));
      };

      return Object.assign(dStore, aStore);
    });

    await Promise.all(promiseArray).then(resultArray => {
      storePrices = resultArray.filter(s => s && s.price && (inStockOnly ? s.stock === 'In Stock' : true))
                              .sort((a, b) => {return a.price - b.price});
    });

    data.map(dStore => {
      let sp = storePrices.find(store => store.no === dStore.storeId);
      return Object.assign(dStore, sp);
    });

    return data;
   })
  .catch(err => {
    console.log('axios catch', err);
  });
}

const getWUPC = (upc) => 'WUPC.00' + upc.slice(0, -1);

const storesByZip = async (zip) => {
  const apiKey = secrets.apiKey;
  let stores = [];
  const url = `https://api.walmartlabs.com/v1/stores?format=json&zip=${zip}&apiKey=${apiKey}`;
  let resp = await axios.get(url);
  if (resp.data && resp.data.length > 0) {
    stores = resp.data.map(store => {
      let theStore = {};
      theStore.no = store.no;
      theStore.description = store.name;
      theStore.address = store.streetAddress + ', ' + store.city + ' ' + store.stateProvCode;
      theStore.zip = store.zip;
      return theStore;
    })
  }
  return stores;
};

exports.search_stores = async (req, res) => {
  let upc = req.params.productId;
  let start = parseInt(req.query.start) || 0;
  let numStores = parseInt(req.query.stores) || 100;
  let zip = parseInt(req.query.zip) || null;
  let inStockOnly = (req.query.inStockOnly && req.query.inStockOnly.toUpperCase() === 'TRUE') || false;
  //let storePrices = await searchStores(upc, start, numStores, zip, inStockOnly);
  let storePrices = await searchStoresNew(upc, start, numStores, zip, inStockOnly);

  let item = {};
  if (storePrices && storePrices.length >0) {
    item = (({name, sku, upc, wupc, url, bsUrl, offerType, pickupToday, onlinePrice}) => ({name, sku, upc, wupc, url, bsUrl, offerType, pickupToday, onlinePrice}))(storePrices[0]);
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

exports.get_upc = async (req, res) => {
  let sku = req.params.sku;
  const apiKey = secrets.apiKey;
  const url = `https://api.walmartlabs.com/v1/items/${sku}?apiKey=${apiKey}`;
  let response = await axios.get(url);
  let resp = {
    "upc": response.data.upc
  };
  res.json(resp);
};

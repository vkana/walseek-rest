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
  allStores.slice(start, start + numStores).map(store => {
    promiseArray.push(wmStoreSearch(upc, store).catch(err=>{errorCount++}));
  });

  await Promise.all(promiseArray).then(resultArray => {
    storePrices = resultArray.filter(s => s && s.price && (inStockOnly ? s.stock === 'In Stock' : true))
                            .sort((a, b) => {return a.price - b.price})
                            .slice(0,sliceStores);
  })

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
      theStore.description = store.name;
      theStore.address = store.streetAddress + ', ' + store.city + ' ' + store.stateProvCode;
      theStore.zip = store.zip;
      return theStore;
    })
  }
  return stores;
};

const getstoreQuantity = async (upc, storesList) => {

  let url = 'https://search.mobile.walmart.com/v1/items-in-stores';
  let resp = await axios.get(url, {
    params: {storeIds: storesList, barcodes: getWUPC(upc)}
  }).catch(err => {
    console.log(err);
  });
  let quantities = [];
  if (resp && resp.data && resp.data.data) {
     quantities = resp.data.data.map(st => {
       let obj = {};
       obj.no = st.storeId;
       obj.qty = st.availabilityInStore;
       obj.location = (st.location.zone ||'') + (st.location.aisle||'') + '-' + (st.location.section || '');
       obj.unitPrice = st.unitPrice;
       return obj;
    });
  }

  return quantities;
};

const getWUPC = (upc) => 'WUPC.00' + upc.slice(0, -1);

exports.search_stores = async (req, res) => {
  let upc = req.params.productId;
  let start = parseInt(req.query.start) || 0;
  let numStores = parseInt(req.query.stores) || 100;
  let zip = parseInt(req.query.zip) || null;
  let inStockOnly = (req.query.inStockOnly && req.query.inStockOnly.toUpperCase() === 'TRUE') || false;
  let storePrices = await searchStores(upc, start, numStores, zip, inStockOnly);
  let item = {};
  if (storePrices && storePrices.length >0) {
    let storeQuantities = await getstoreQuantity(upc, storePrices.map(s => s.no).join());
    item = (({name, sku, upc, url, bsUrl, offerType, pickupToday, onlinePrice}) => ({name, sku, upc, url, bsUrl, offerType, pickupToday, onlinePrice}))(storePrices[0]);
    storePrices = storePrices.map(s => {
      let qtyObj = storeQuantities.find(q => q.no === s.no);
      return {no:s.no, address: s.address, zip:s.zip, price:s.price, stock:s.stock, pickupToday: s.pickupToday, qty: (qtyObj && qtyObj.qty||0), location: (qtyObj && qtyObj.location||'-')};
    });
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

'use strict';
const axios = require('axios');
const targetStores = require('../../targetStores.json');
const fs = require('fs');

let args = process.argv.slice(2);
let upc = args[0] ||'047406150038';
let start = parseInt(args[1]) || 0;
let numStores = parseInt(args[2]) || 200;

const searchStores = async (upc, start, numStores, zip, inStockOnly) => {
  let storePrices = [];
  let allStores = targetStores.allStores;
  let stores = allStores.slice(start, start + numStores);
  console.log(upc, start, numStores, stores.length);

  let pArray = await stores.map(async st => {
    let url = `https://redsky.target.com/v3/products/pdp/BARCODE/${upc}/${st.no}`;
    let storeInfo = {};
    let price = {};
    let response = await axios.get(url).catch(err => {
      console.log(st.no, 'error');
    });
    if (response && response.data && response.data.products &&
    response.data.products[0]){
      if (response.data.products[0].variations) {
        let storeInfo = response.data.products[0].variations.filter(a => a.upc === upc)[0].storeInfo;
        let itemPrice = (storeInfo.price)? storeInfo.price.currentPrice: 0;
        if (itemPrice > 0) {
          price = {no: st.no, price: itemPrice , stock: storeInfo.availabilityCode || '-'};
        }
      }
      else if ( response.data.products[0].storeInfo && response.data.products[0].storeInfo.price) {
        price = {
          no: st.no,
          address: st.address,
          zip:st.zip,
          price: response.data.products[0].storeInfo.price.currentPrice,
          stock: response.data.products[0].storeInfo.availabilityCode || '-'
        };
      }
    }
    return price;

  });
  storePrices = await Promise.all(pArray);

  storePrices = storePrices
    .filter(a => null!= a.price)
    .sort((a, b) => a.price - b.price)
    .slice(0,3);
  //console.log(storePrices);
  storePrices.map(sp => console.log(sp.price));
  return storePrices;
}
//***
const run = async () => {
  let result =[];
  let a = []
  for (let i = 0; i < 10; i++) {
    a = await searchStores(upc, start + (i*numStores), numStores);
    result = result.concat(a);
  }
  result = result.sort((a, b) => a.price - b.price);
  console.log('a', result);
}

run();



const storeDetailsById = async id => {
  let url = `https://redsky.target.com/v2/stores/location/${id}`;
  const response = await axios.get(url)
        .catch(err => {
          console.log('err', err);
        });

        let storeInfo = {};
        if (response && response.data && response.data[0]) {
          let store = response.data[0];
          storeInfo = {
            no: store.id,
            description: store.name,
            address: [store.address.addressLines.join(', '), store.address.city, store.address.stateOrProvince].join(', '),
            zip : store.address.postalCode.split('-')[0]
          };
        }
        return storeInfo;
}

const storeDetails = async (start) => {
  let storeList = [];
  for (let i = start; i<start+100; i++) {
    let st = await storeDetailsById(i);
    if (st && st.no) {
      storeList.push(st);
    }
  };

  console.log('count', storeList.length);

  fs.writeFile('stores'+start+'.json', JSON.stringify(storeList), (err) => {
    if (err) {
      console.log('error');
    }
  });

};

exports.search_stores = async(req, res) => {
  let upc = req.params.productId;
  let start = parseInt(req.query.start) || 0;
  let numStores = parseInt(req.query.stores) || 100;
  let storePrices = await searchStores(upc, start, numStores, zip, inStockOnly);
  if (storePrices && storePrices.length >0) {
    //console.log(storePrices);
  }
}

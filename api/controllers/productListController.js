'use strict';
const secrets = require('../../secrets.json');
const axios = require('axios');

var mongoose = require('mongoose'),
  Product = mongoose.model('Products');

const getItemFromDb = async (sku) => {
  return Product.findOne({sku: sku})
    .exec();
};

const getItemFromWm = async (sku) => {
  const apiKey = secrets.apiKey;
  const url = `https://api.walmartlabs.com/v1/items/${sku}?apiKey=${apiKey}`;
  let response = await axios.get(url).catch(err => {
    console.log('error: ', err.response.status, err.response.statusText, sku);
    return err.response;
  });
  let resp = {
    "upc": (response.data && response.data.upc)?response.data.upc : 0,
    "variants": (response.data && response.data.variants)?response.data.variants.join(', ') : ''
  };

  return resp;
};

exports.list_all_products = (req, res) => {
  Product.find({name:{$regex: req.query.q ||'', $options: 'i'}})
   .sort('-createdDate')
   .limit(parseInt(req.query.count) || null)
   .exec((err, product) => {
     if (err)
       res.send(err);
     res.json(product);
   });
 };

exports.create_a_product = (req, res) => {
  let new_product = {...req.body, createdDate: Date.now()};
  new_product.$addToSet =  {stores: new_product.stores};
  delete new_product.stores;
  //this is supposed to be PUT?
  Product.findOneAndUpdate({sku: new_product.sku},
          new_product, {upsert: true, new: true}, (err, product) => {
      if (err) {
        res.send(err);
      }
      else {
        res.json(product);
      }
    });
};

exports.read_a_product = (req, res) => {
  Product.findById(req.params.productId, (err, product) => {
    if (err)
      res.send(err);
    res.json(product);
  });
};

exports.update_a_product = (req, res) => {
  Product.findOneAndUpdate({sku: req.params.productId}, req.body,
          {new: true}, function(err, product) {
    if (err)
      res.send(err);
    res.json(product);
  });
};

exports.delete_a_product = (req, res) => {
  Product.remove({
      _id: req.params.productId
    }, function(err, product) {
      if (err)
        res.send(err);
      res.json({ message: 'Product successfully deleted' });
    });
};

exports.get_upc = async (req, res) => {
  let resp = {};
  let sku = req.params.sku;
  resp = await getItemFromWm(sku);
  if (!resp || !resp.upc) {
    resp = await getItemFromDb(sku);
    resp = {upc:resp.upc, variants: resp.variants || ''};
  }
  res.json(resp);
};

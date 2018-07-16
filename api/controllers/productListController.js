'use strict';

var mongoose = require('mongoose'),
  Product = mongoose.model('Products');

exports.list_all_products = (req, res) => {
  Product.find({})
   .sort('-createdDate')
   .find({name:{$regex: req.query.q ||'', $options: 'i'}})
   .limit(parseInt(req.query.count) || null)
   .exec((err, product) => {
     if (err)
       res.send(err);
     res.json(product);
   });
 };

exports.create_a_product = (req, res) => {
  var new_product = {...req.body, createdDate: Date.now()};
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

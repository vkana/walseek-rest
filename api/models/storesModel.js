'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var ProductSchema = new Schema({
  name: {
    type: String,
    required: 'name'
  },
  sku: {
    type: Number,
    required: 'sku'
  },
  price: {
    type: Number,
    required: 'price'
  },
  zip: {
    type: Number,
    required: 'zip'
  },
  userZip: {
    type: Number,
    required: 'userZip'
  },
  createdDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Products', ProductSchema);

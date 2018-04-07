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
  zip: {
    type: Number,
    required: 'zip'
  },
  createdDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Products', ProductSchema);

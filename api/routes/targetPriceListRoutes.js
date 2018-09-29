'use strict';
module.exports = function(app) {
  var targetPriceList = require('../controllers/targetPriceListController');

  app.route('/target-price-upc/:productId')
    .get(targetPriceList.search_stores);

};

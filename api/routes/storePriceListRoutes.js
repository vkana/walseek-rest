'use strict';
module.exports = function(app) {
  var storePriceList = require('../controllers/storePriceListController');

  app.route('/stores-by-code/:productId')
    .get(storePriceList.search_stores);

    app.route('/upc/:sku')
      .get(storePriceList.get_upc);
};

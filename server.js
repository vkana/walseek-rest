const secrets = require('./secrets.json');
let express = require('express'),
  app = express(),
  port = process.env.PORT || 3001;

let allowCrossDomain = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Content-Length');
    // intercept OPTIONS method
    if ('OPTIONS' === req.method) {
      res.sendStatus(200);
    }
    else {
      next();
    }
};
app.use(allowCrossDomain);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const dbConnString = secrets.dbConnString;

const  mongoose = require('mongoose'),
  Product = require('./api/models/productListModel'), //created model loading here
  bodyParser = require('body-parser');

// mongoose instance connection url connection
mongoose.Promise = global.Promise;
mongoose.connect(dbConnString);

app.get('/*', function(req, res, next){
  res.setHeader('Last-Modified', (new Date()).toUTCString());
  next();
});

var productListRoutes = require('./api/routes/productListRoutes'); //importing route
var storePriceRoutes = require('./api/routes/storePriceListRoutes'); //importing route

productListRoutes(app);
storePriceRoutes(app); //register the route
app.listen(port);

console.log('walseek RESTful API server started on: ' + port);

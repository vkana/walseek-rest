const secrets = require('./secrets.json');
let express = require('express'),
  app = express(),
  port = process.env.PORT || 3001;

const dbConnString = secrets.dbConnString;

const  mongoose = require('mongoose'),
  Product = require('./api/models/productListModel'), //created model loading here
  bodyParser = require('body-parser');

let allowCrossDomain = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.sendStatus(200);
    }
    else {
      next();
    }
};

// let noCache = (req, res, next) => {
//   req.headers['if-none-match'] = '';
//   req.headers['if-modified-since'] = '';
//   next();
// }


// mongoose instance connection url connection
mongoose.Promise = global.Promise;
mongoose.connect(dbConnString);


app.use(allowCrossDomain);
app.get('/*', function(req, res, next){
  res.setHeader('Last-Modified', (new Date()).toUTCString());
  next();
});
//app.disable('etag');
//app.use(noCache);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


var productListRoutes = require('./api/routes/productListRoutes'); //importing route
var storePriceRoutes = require('./api/routes/storePriceListRoutes'); //importing route

productListRoutes(app);
storePriceRoutes(app); //register the route
app.listen(port);

console.log('walseek RESTful API server started on: ' + port);

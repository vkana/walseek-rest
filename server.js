const secrets = require('./secrets.json');
let express = require('express'),
  app = express(),
  port = process.env.PORT || 3001;

const dbConnString = secrets.dbConnString;

const  mongoose = require('mongoose'),
  Product = require('./api/models/productListModel'), //created model loading here
  bodyParser = require('body-parser');

let allowCrossDomain = function(req, res, next) {
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
// mongoose instance connection url connection
mongoose.Promise = global.Promise;
mongoose.connect(dbConnString);


app.use(allowCrossDomain);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


var routes = require('./api/routes/productListRoutes'); //importing route
routes(app); //register the route
app.listen(port);

console.log('walseek RESTful API server started on: ' + port);

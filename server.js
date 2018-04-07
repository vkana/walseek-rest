const secrets = require('./secrets.json');
let express = require('express'),
  app = express(),
  port = process.env.PORT || 3000;

const dbConnString = secrets.dbConnString;

  mongoose = require('mongoose'),
  Product = require('./api/models/productListModel'), //created model loading here
  bodyParser = require('body-parser');

// mongoose instance connection url connection
mongoose.Promise = global.Promise;
mongoose.connect(dbConnString);


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


var routes = require('./api/routes/productListRoutes'); //importing route
routes(app); //register the route
app.listen(port);

console.log('walseek RESTful API server started on: ' + port);

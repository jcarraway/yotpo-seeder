const reviews = require('express').Router();
const rp = require('request-promise');
const controller = require('./controller');
const ApplicationError = require.main.require('./classes/ApplicationError');

reviews.get('/:id?', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  res.set('Content-Type', 'application/json');
  console.log(
    `-\nREQUEST - GET /reviews/:id - ${new Date().toLocaleDateString()}`
  );
  // console.log('req headers', req.headers);
  const { origin = false, host = false } = req.headers;
  if (!origin && host.indexOf('localhost') === -1) {
    throw new ApplicationError('Missing request origin', 400);
  }
  console.log(`ORIGIN: ${origin}`);
  console.log(`HOST: ${host}`);

  const { id = false } = req.params;
  if (!id) {
    throw new ApplicationError('Missing id parameter', 400);
  }
  console.log(`ID: ${id}`);

  const shop = controller.getShopKey(origin, host);
  console.log(`SHOP: ${shop}`);

  if (!process.env.hasOwnProperty(shop)) {
    throw new ApplicationError('Unauthorized request origin', 401);
  }

  const auth = process.env[shop].split(':');
  console.log(`SHOP API KEY: ${auth[0]}`);
  console.log(`SHOP API PASS: ${auth[1]}`);

  const options = controller.getOptions(req, shop);
  console.log(`OPTIONS: ${JSON.stringify(options)}`);

  const package = controller.generateReviewsPackage(id, auth, options);

  rp(package)
    .then(response => controller.formatReturnPackage(response))
    .then(response => (console.log('SUCCESS'), res.status(200).json(response)))
    .catch(err => next(new ApplicationError(err, err.statusCode)));
});

module.exports = reviews;

var express = require('express');
var router = express.Router();
var http    = require('http');
var rp      = require('request-promise');

/* Configuation Variables */
var yotpoConfig = require('../yotpoAuth.js');

router.get('/', function(request, response) {
  var pid = request.query.pid || false;

  /* Global Variables */
  var parsedReviews = '';
  var yotpoToken    = '';
  var yotpoAPIKey   = yotpoConfig.client_id;
  var yotpoAuthOptions = {
    uri  :'https://api.yotpo.com/oauth/token', 
    body : yotpoConfig,
    json : true
  };

  /* Yotpo Custom Error Handling */
  var manualHandleError = function(error){
    var customErrorMessage = '';
    switch(error.message){
      case 'invalid_client':
      customErrorMessage = 'Given yotpo client_secret is invalid';
      break;

      case "unsupported_grant_type":
      customErrorMessage = 'Given yotpo grant_type is invalid';
      break;

      case "invalid_client_id":
      customErrorMessage = 'Given yotpo client_id is invalid';
      break;

      default:
      customErrorMessage = 'An error occured while attmepting to authorize/interact with Yotpo.'
    }

    var returnError = {
      "error" : error.message,
      "error_description" : customErrorMessage
    } 

    console.log('CUSTOM ERROR:\n', returnError, '\n------END');
    
    return returnError;
  };

/* Promise Chain
/*========================================================*/ 

 /* Yotpo Token Request:
  * send client info to yotpo to obtain access token
  * --Start
  */
  var tokenRequest = rp(yotpoAuthOptions);

 /* Check Token Request Response:
  * handle custom yotpo errors (yotpo error codes and empty token - only if pid == false)
  * handle any promise rejections from "tokenRequest"
  */
  var sealToken = tokenRequest.then( function(parsedBody) {
    console.log(parsedBody); 
    if(parsedBody.error && !pid){
      throw new Error(parsedBody.error);
    }else{
      console.log('No Yotpo Authorization Errors');
      yotpoToken = parsedBody.access_token;
      if(yotpoToken === undefined && !pid){
        console.log('Token Invlaid - Error Location: sealToken');
        throw new Error('invalid_client');
      }
    }
    return yotpoToken;

  }, manualHandleError); 


 /* Create/Send A Review Request Package:
  * handle token errors (empty token - only if pid == false)
  * create request package function call
  * return reviews request promise
  * handle any promise rejections from "sealToken"
  */
  var handleToken = sealToken.then(function(token){
    var requestPackage = '';
    if(token === undefined && !pid){
      console.log('Token Invalid - Error Location: handleToken');
      throw new Error('invalid_client_id');
    } else {
      requestPackage = generateReviewsPackage(token);
      return rp(requestPackage);
    }
  }, manualHandleError );


 /* Helper Function - Review Package Creator:
  * build package based on existence of a "pid"(product-id) in querystring 
  * return package
  */ 
  var generateReviewsPackage = function(token) {
    if(pid){
      var requestURI = 'http://api.yotpo.com/v1/widget/' + yotpoAPIKey + '/products/' + pid + '/reviews.json?count=' + process.env.REVIEWS_COUNT;
      var options = {
        uri: requestURI,
        json: true
      };
      return options;
    } else {
      var requestURI = 'http://api.yotpo.com/v1/apps/' + yotpoAPIKey + '/reviews?count=' + process.env.REVIEWS_COUNT;
      var options = {
        uri: requestURI,
        qs: {
          utoken: token 
        },
        json: true
      };
      return options;
    }
  };


 /* Prepare Front-End Response with Review Data:
  * handle custom yotpo errors (empty response)
  * pass on the final JSON object containing the reviews
  */
  var createFinalResponse = handleToken.then(function(body) {
    if(body === undefined){
      console.log('Empty Response - Error Location: createFinalResponse')
      throw new Error('invalid_client');
    }else{
      return body;
    }
  }, manualHandleError);


 /* Send JSON Response to Front-End
  * set headers to json
  * send final response to browser
  * browser can manipulate the data from here
  * --Complete
  */
  var sendFinalResponse = createFinalResponse.then(function(body){
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    response.set('Content-Type', 'application/json');
    response.json(body);
  }, manualHandleError);

  /*End Promise Chain
  /*========================================================*/ 

});

module.exports = router;
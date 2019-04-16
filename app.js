var express = require('express');
var session = require('express-session');

var app = express();
var bodyParser = require('body-parser');
var fs = require("fs");
var urlencodedParser = bodyParser.urlencoded({ extended: false })
const queryString = require('querystring')

app.engine('ejs', require('ejs-locals'))
app.set('view engine', 'ejs');
app.set('views', __dirname + '/template');
var url = require('url');

const { google } = require('googleapis');

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));

// authentication configurations
const googleConfig = {

   clientID: '1080929605374-i8v0c7aogsojlu263jn5uu1a1lg736hg.apps.googleusercontent.com',
   clientSecret: 'fgrebvYhwUe5AUg8lYROTFh4',
   redirect: 'http://localhost:8081/home'
}

// authenticate
function connectGoogle() {

   return new google.auth.OAuth2(
      googleConfig.clientID,
      googleConfig.clientSecret,
      googleConfig.redirect
   );

}

// privillages to access google resources
const defaultScope = [
   'https://www.googleapis.com/auth/plus.me',
   'https://www.googleapis.com/auth/userinfo.email',
   'https://www.googleapis.com/auth/contacts.readonly',
   'https://www.googleapis.com/auth/user.emails.read'
];

// Generate Google authentication url
function getConnectionUrl(auth) {
   return auth.generateAuthUrl({
      access_type: 'offline',
      scope: defaultScope
   });
}

// Get authentication
function getGoogleLoginUrl() {
   auth = connectGoogle()
   return [getConnectionUrl(auth), auth]
}

// Invoke Google+ API
function getGooglePlusApi(auth) {
   return google.plus({ version: 'v1', auth });
}
// Invoke Google People API
function getGooglePeople(auth) {
   return google.people({ version: 'v1', auth });

}

// Prepare  index page
app.get('/', function (req, res) {
   
   var data = getGoogleLoginUrl()
   res.render('index', { 'url': data[0] })
})



// Display Google+ contacts of user
app.get('/home', function (req, response) {

   const auth = connectGoogle()
   const data = auth.getToken(req.query.code, function (error, tokens) {

      if (!error) {
         
         // set retrived token to credentials
         auth.setCredentials(tokens)

         // set retrived token to current session
         session['tokens'] = tokens

         // invoke Google+ API
         const plus = getGooglePlusApi(auth)
         plus.people.get({ userId: 'me' }, function (err, me) {
            if (!err) {

               // get user email address & id
               const userGoogleId = me.data.id
               const email = me.data.emails && me.data.emails.length && me.data.emails[0].value

               // Invoke Google people API
               getGooglePeople(auth).people.connections.list({

                  resourceName: 'people/me',
                  pageSize: 20,
                  personFields: 'names,photos',

               }, function (err, res) {
                  const connections = res.data.connections;

                  var myConnections = []
                  
                  // check contact objects retrieved in response
                  if (connections) {

                     // collect user's contact (i.e friend) details
                     connections.forEach((person) => {
                        
                        // default message
                        var name = "No display name found "

                        //default photo
                        var photo = "https://i.ibb.co/Ksf2wD6/default.png"

                        // Get contact name
                        if (person.names && person.names.length > 0) {
                           name = person.names[0].displayName
                        } 
                        // Override default photo
                        if(person.photos && person.photos[0].url.length > 0){
                           photo = person.photos[0].url
                        }

                        // append contact
                        myConnections.push({'name':name,"photo_url": photo })
                     });

                     // render response
                     response.render('home', { 'email': email, 'message': "", 'connections': myConnections })

                  } else {
                     
                     response.render('home', { 'email': email, 'message':  'No Google connections found for your account', 'connections': myConnections })
                  }

               })

            }
            else {
               var data = getGoogleLoginUrl()
               response.render('index', { 'url': data[0] })
            }
         })

      }
      else {
         var data = getGoogleLoginUrl()
         res.render('index', { 'url': data[0] })
      }
   })
})

// host ExpressJS application
//
// URL : http://localhost:8081
//
// ------------------------------
var server = app.listen(8081, function () {
   var host = server.address().address
   var port = server.address().port

   console.log("MS19804552 App listening at http://%s:%s", host, port)
})

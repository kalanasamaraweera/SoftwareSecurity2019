/**
 * *********************************************************
 * DIT  :  MS19804552
 * NAME :  S.A.K.G. Samaraweera
 * 
 * *********************************************************
 * 
 * Sample app implemented to demostrate OAuth authntication.
 * Once authented, app will query Google contacts of user.
 * 
 */

var session = require('express-session');
var express = require('express');
var app = express();

// define java-script template render engines
app.engine('ejs', require('ejs-locals'))
app.set('view engine', 'ejs');
app.set('views', __dirname + '/template');
var url = require('url');

// import 'googleapis' npm module 
// used to access Google APIs and OAuth server
const { google } = require('googleapis');

app.use(express.static('public'));

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));

// authentication configurations
const googleConfig = {
   clientID: '1080929605374-i8v0c7aogsojlu263jn5uu1a1lg736hg.apps.googleusercontent.com',
   clientSecret: 'fgrebvYhwUe5AUg8lYROTFh4',
   redirect: 'http://localhost:8081/home'
}

// authenticate with OAuth
function authenticateGoogle() {
   return new google.auth.OAuth2(
      googleConfig.clientID,
      googleConfig.clientSecret,
      googleConfig.redirect
   );
}

// Google APIs to be accessed
const defaultScope = [
   'https://www.googleapis.com/auth/plus.me',
   //'https://www.googleapis.com/auth/userinfo.email',
   //'https://www.googleapis.com/auth/contacts.readonly',
   //'https://www.googleapis.com/auth/user.emails.read'

   'https://www.googleapis.com/auth/contacts',
   'https://www.googleapis.com/auth/contacts.readonly',
   'https://www.googleapis.com/auth/profile.agerange.read',
   'https://www.googleapis.com/auth/profile.emails.read',
   'https://www.googleapis.com/auth/profile.language.read',
   'https://www.googleapis.com/auth/user.addresses.read',
   'https://www.googleapis.com/auth/user.birthday.read',
   'https://www.googleapis.com/auth/user.emails.read',
   'https://www.googleapis.com/auth/user.phonenumbers.read',
   'https://www.googleapis.com/auth/userinfo.email',
   'https://www.googleapis.com/auth/userinfo.profile'

];

// Get Google Sign In page url
function getConnectionUrl(auth) {
   return auth.generateAuthUrl({
      access_type: 'offline',
      scope: defaultScope
   });
}

// Get authentication
function getGoogleLoginUrl() {
   auth = authenticateGoogle()
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


/*
 *  ExpressJs application routes
 * 
 */

// Index page
app.get('/', function (req, res) {
   var data = getGoogleLoginUrl()
   res.render('index', { 'url': data[0] })
})


// Home page
// display Google+ contacts of user
app.get('/home', function (req, response) {

   const auth = authenticateGoogle()
   const data = auth.getToken(req.query.code, function (error, tokens) {

      if (!error) {

         // set retrived token to credentials
         auth.setCredentials(tokens)

         // set retrived token to current session
         // used to access Google APIs from other client pages
         session['tokens'] = tokens

         // invoke Google+ API
         const plus = getGooglePlusApi(auth)
         plus.people.get({ userId: 'me' }, function (err, me) {
            if (!err) {

               // retreive user email address an Id
               const userGoogleId = me.data.id
               const email = me.data.emails && me.data.emails.length && me.data.emails[0].value

               // Invoke Google people API
               getGooglePeople(auth).people.connections.list({

                  resourceName: 'people/me',
                  pageSize: 20,
                  personFields: 'names,photos,phoneNumbers',

               }, function (err, res) {
                  const connections = res.data.connections;

                  var myConnections = []

                  // check contact objects retrieved in response
                  if (connections) {

                     // collect user's contact (i.e friend) details
                     connections.forEach((person) => {

                        myConnections.push({

                           'name': person.names[0].displayName || '',
                           'photo_url': person.photos[0].url || "https://i.ibb.co/Ksf2wD6/default.png",
                           'phoneNumbers': person.phoneNumbers || ''

                        })
                     });

                     // render response
                     response.render('home', { 'email': email, 'message': "", 'connections': myConnections })

                  } else {

                     response.render('home', { 'email': email, 'message': 'No Google connections found for your account', 'connections': myConnections })
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
         response.render('index', { 'url': data[0] })
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

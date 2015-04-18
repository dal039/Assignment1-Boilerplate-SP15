//dependencies for each module used
var express = require('express');
var passport = require('passport');
var InstagramStrategy = require('passport-instagram').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var http = require('http');
var path = require('path');
var handlebars = require('express-handlebars');
var bodyParser = require('body-parser');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var dotenv = require('dotenv');
var Instagram = require('instagram-node-lib');
var graph = require('fbgraph');
var mongoose = require('mongoose');
var app = express();

//local dependencies
var models = require('./models');

//client id and client secret here, taken from .env
dotenv.load();
var INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID;
var INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET;
var INSTAGRAM_CALLBACK_URL = process.env.INSTAGRAM_CALLBACK_URL;
var INSTAGRAM_ACCESS_TOKEN = "";
Instagram.set('client_id', INSTAGRAM_CLIENT_ID);
Instagram.set('client_secret', INSTAGRAM_CLIENT_SECRET);

var FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
var FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
var FACEBOOK_CALLBACK_URL = process.env.FACEBOOK_CALLBACK_URL;
graph.setAppSecret(FACEBOOK_APP_SECRET);


//connect to database
mongoose.connect(process.env.MONGODB_CONNECTION_URL);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
  console.log("Database connected succesfully.");
});

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Instagram profile is
//   serialized and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the InstagramStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Instagram
//   profile), and invoke a callback with a user object.
passport.use(new InstagramStrategy({
    clientID: INSTAGRAM_CLIENT_ID,
    clientSecret: INSTAGRAM_CLIENT_SECRET,
    callbackURL: INSTAGRAM_CALLBACK_URL
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    models.User.findOrCreate({
      "name": profile.username,
      "id": profile.id,
      "access_token": accessToken
    }, function(err, user, created) {
      
      // created will be true here
      models.User.findOrCreate({}, function(err, user, created) {
	//  var user = new models.User();
        //  user.ig_access_token = accessToken;
        //  user.save();
        // created will be false here
        process.nextTick(function () {
          // To keep the example simple, the user's Instagram profile is returned to
          // represent the logged-in user.  In a typical application, you would want
          // to associate the Instagram account with a user record in your database,
          // and return that user instead.
          return done(null, user);
        });
      })
    });
  }
));

// Use the FacebookStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Facebook
//   profile), and invoke a callback with a user object.
passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: FACEBOOK_CALLBACK_URL
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    models.User.findOrCreate({
      "name": profile.username,
      "id": profile.id,
      "access_token": accessToken,
    }, function(err, user, created) {
      
      // created will be true here
      models.User.findOrCreate({}, function(err, user, created) {
       // user.fb_access_token = accessToken;
       // user.save();
        // created will be false here
        process.nextTick(function () {
          // To keep the example simple, the user's Instagram profile is returned to
          // represent the logged-in user.  In a typical application, you would want
          // to associate the Instagram account with a user record in your database,
          // and return that user instead.
          return done(null, profile);
        });
      })
    });
  }
));


//Configures the Template engine
app.engine('handlebars', handlebars({defaultLayout: 'layout'}));
app.set('view engine', 'handlebars');
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({ secret: 'keyboard cat',
                  saveUninitialized: true,
                  resave: true}));
app.use(passport.initialize());
app.use(passport.session());

//set environment ports and start application
app.set('port', process.env.PORT || 3000);

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { 
    return next(); 
  }
  req.flash('error', 'You must be logged in to do that.')
  res.redirect('/login');
}

/*
function ensureAuthenticatedInstagram(req, res, next) {
  if (req.isAuthenticated() || req.user.igID) {
    return next();
  }
  req.flash('error', 'You must be logged in to do that.')
  res.redirect('/login');
}

function ensureAuthenticatedFacebook(req, res, next) {
  if (req.isAuthenticated() || req.user.fbID) {
    return next();
  }
  req.flash('error', 'You must be logged in to do that.')
  res.redirect('/login');
}
*/

//routes
app.get('/', function(req, res){
  res.render('login');
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});
/*
app.get('/account', ensureAuthenticated, function(req, res){
  if (req.user.provider == 'facebook')
  {
    var query  = models.User.where({ name: req.user.username });
    query.findOne(function (err, user) {
      if (err) return handleError(err);
      if (user) {
        graph.get('/' + user.id + '?fields=picture',
                  { access_token: user.access_token },
                  function(err2, res2) {
                    res.render('account', {user: req.user,
                         providerFacebook: req.user.provider == 'facebook',
                         providerInstagram: req.user.provider == 'instagram',
                         fbpic: res2.picture.data.url});
                  });
        
      }
    });
  }
  else
  {
    res.render('account', {user: req.user,
                           providerFacebook: req.user.provider == 'facebook',
                           providerInstagram: req.user.provider == 'instagram'});
  }
  
});*/


/*app.get('/likes', ensureAuthenticated, function(req, res){
  var query = models.User.where({ name: req.user.username });
  query.findOne(function (err, user) {
    if (err) return handleError(err);
    if (user) {
      graph.get('/' + user.id + "?fields=likes", 
                { access_token: user.access_token },
*/

//app.get('/fbfeed', ensureAuthenticated, function(req, res){

//  var query =models.User.where({ name: req.user.username });
  
  

app.get('/account', ensureAuthenticated, function(req, res){
  
  var query = models.User.where({ name: req.user.username });
  
  graph.setAccessToken(query.access_token);
  console.log(req.user.access_token);
  graph.get('/me', function(err, res){
    console.log(res);
  });
  
  console.log(req.user);

  res.render('account', {user: req.user});
});

app.get('/photos', ensureAuthenticated, function(req, res){
  var query  = models.User.where({ name: req.user.username });
  query.findOne(function (err, user) {
    if (err) return handleError(err);
    if (user) {
      // doc may be null if no document matched
      Instagram.users.self({
        access_token: user.access_token,
        complete: function(data) {
          //Map will iterate through the returned data obj
          var imageArr = data.map(function(item) {
            //create temporary json object
            tempJSON = {};
            tempJSON.url = item.images.low_resolution.url;
            //get caption data and make sure it's not null
            if (item.caption != null)
              tempJSON.caption = item.caption.text;
            //insert json object into image array
            return tempJSON;
          });
          res.render('photos', {photos: imageArr});
        }
      }); 
    
      /*Facebook.res.id.user.home({
        access_token: user.access_token,
        complete: function(data){
          var imageArr = data.map(function(item){
            tempJSON = {};
            tempJSON.url = post.picture;
            tempJSON.caption = post.caption;
          });
        }
      });*/
    }
  });
});







// GET /auth/instagram
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Instagram authentication will involve
//   redirecting the user to instagram.com.  After authorization, Instagram
//   will redirect the user back to this application at /auth/instagram/callback
app.get('/auth/instagram',
  passport.authenticate('instagram'),
  function(req, res){
    // The request will be redirected to Instagram for authentication, so this
    // function will not be called.
  });


// GET /auth/instagram/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the user's liked photos.
app.get('/auth/instagram/callback', 
  passport.authenticate('instagram', { failureRedirect: '/login'}),
  function(req, res) {
    res.redirect('/photos');
  });


// GET /auth/facebook
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Facebook authentication will involve
//   redirecting the user to facebook.com.  After authorization, Facebook
//   will redirect the user back to this application at /auth/facebook/callback
app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['user_posts', 'user_likes'] }),
  function(req, res){
    // The request will be redirected to Facebook for authentication, so this
    // function will not be called.
  });


// GET /auth/facebook/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to account info.
app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { failureRedirect: '/login'}),
  function(req, res) {
    res.redirect('/account');
  });


app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});

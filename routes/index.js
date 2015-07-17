var express = require('express');
var WP = require( 'wordpress-rest-api' );
var mongoClient = require('mongodb').MongoClient;
var CronJob = require('cron').CronJob;
var router = express.Router();

var updateEvents = function(){
  console.log("Job called");
  wp.posts().type('cu-events').filter(
    {
      posts_per_page: 1,
      orderby: "modified",
      order: "DESC"
    }).get(function(err,data){
      eventPostsCollection.find().sort({modified:-1}).limit(1).toArray(function(err,res){
        if(res.length === 0 || res.modified != data.modified){
          console.log("found diff");
          eventPostsCollection.drop();
          wp.posts().type('cu-events').filter('posts_per_page', -1).get(function(err,arr){
            for (var i = 0; i < arr.length; i++) {
              var obj = {};
              obj.ID = arr[i].ID;
              obj.acf = arr[i].acf;
              obj.title = arr[i].title;
              obj.modified = arr[i].modified;
              console.log('added -' +  obj);
              eventPostsCollection.insert(obj);
            }
          });
        }
        else {
          console.log("match");
        }
    });
  });
};

//creates job to be run at 10:30 and 23:30
 var job = new CronJob('00 30 10,23 * * *',
//var job = new CronJob('* * * * * *',
                      updateEvents,
                      function(){
                          console.log("updateEvents job executed");
                        },
                      false,
                      'America/Toronto');

//*********Settings

//mongodb endpoint
var url = 'mongodb://cu_user:2850708!@ds047812.mongolab.com:47812/heroku_s8390xfk';

var eventPostsCollection;

// CORS (Cross-Origin Resource Sharing) headers to support Cross-site HTTP requests
router.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//Instance for wp-api endpoint

// var wp = new WP({ endpoint: 'http://vagrant.local/wp-json/' });

var wp = new WP(
  {
    endpoint: 'https://ccs-cmsdev1.carleton.ca/students/wp-json/',
  });


//**********

var connectDB = function(){
  mongoClient.connect(url,function(err,db){
    if(err)
      console.log(err);
    else {
      //set the working collection
      eventPostsCollection = db.collection('event_posts');

    }
  });
};

connectDB();

/* GET posts page. */
router.get('/page/:pageIndex', function(req, res, next) {
  var index = req.params.pageIndex;
  console.log(index);
  wp.posts().filter({'posts_per_page':10,'status':'publish'}).page(index).get(function( err, data ) {
    if (err) {
      console.log(err);
    }
    res.json({posts:data});
  });
});

/* GET specific post*/
router.get('/posts/:postId', function(req, res, next){
  var id = req.params.postId;

  wp.posts().id(id).get(function(err,data){
    if(err){
      console.log(err);
    }
    console.log(data);
    debugger;
    res.json({post:data});
  });
});

/* GET events*/
router.get('/events/:date', function(req, res, next){

  var searchDate = req.params.date;

  //match the beginning of the string
  var regex = new RegExp("^"+ searchDate + "");
  eventPostsCollection.find({"acf.stu_event_date" : regex }).toArray(function(err,event_arr){
    res.json({events:event_arr});
  });
});

router.get('/event/:eventId', function(req, res, next){
  var id = req.params.eventID;

  eventPostsCollection.find({"ID": id}).toArray(function(err,event_item){
    res.json({eventItem:event_item});
  });
});

/* testing */
router.post('/payload',function(req, res, next){
  console.log("payload HIT");
  debugger;
  if(req.headers['x-github-event'] == 'push'){
    console.log("IT'S A PUSH!");
  }
  res.send("OK, keep working.");
});

router.post('/',function(req, res, next){
  console.log("root HIT");
  res.send("OK");
});
/* testing */


//timer to update events
job.start();

module.exports = router;

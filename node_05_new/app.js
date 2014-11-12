/****
*
* SIMPLE EXPRESS SERVER WITH MONGODB CLIENT
* ==============================================
*
* In terminal, run:
*
*   $ npm install     (to download/install the necessary modules)
*   $ node app.js     (to launch this node app)
*
*/

var express     = require('express');
var MongoClient = require('mongodb').MongoClient;
var colors      = require('colors');
var http        = require('http');

var port = 8080; //select a port for this server to run on
var users;
var data;


/****
* CONNECT to the DB
* ==============================================
*
*/
MongoClient.connect("mongodb://localhost:27017/mylatestdb", function(err, db) {
  if(!err) {
		// create our collections objects
		users = db.collection("users");
		data = db.collection("data");
		console.log("Successfully connected to MongoDB".green);
  }
});





/****
* CONFIGURE the express application
* ==============================================
*
*/
//instantiate object of express as app
var app = express();
//use the public folder to serve files and directories STATICALLY (meaning from file)
app.use(express.static(__dirname+ '/public')); //__dirname is a global variable; use the public folder and access everything in it as a regular one?





/****
* ROUTES
* ==============================================
* - these are the HTTP /routes that we can hit
*
*/
//new route for homework
app.get('/latest', function(req,res){
  
  //res.send('this is the latest data!');
  if(req.query.name != null){ 
  findlatestbyname(req.query.name, function(error, latest){
  if(!error){
    getDataByTime(latest,function(error_1,data){
      if(!error_1){
      console.log("finddatabytime complete: \n".green+JSON.stringify(data));
      res.send(data)
      }
    })
  }
  });
}
});

app.get('/oldest', function(req,res){
  
  //res.send('this is the latest data!');
  if(req.query.name != null){ 
  getDataByUser(req.query,function(error, output){
      if(!error && output){
        // console.log(JSON.stringify(output, null, '\t'));
        var oldtime = new Date().getTime(); //start from now
        var oldest 
        for(var i = 0; i < output.length; i++){
          if(output[i].time < oldtime){
            oldtime = output[i].time
            oldest = i
          }

        }
        res.set('Content-Type', 'application/json');
        res.end("getDataByUser: "+req.query.name+" \n "+JSON.stringify(output[oldest], null, '\t'));
      }else{
        res.send("error: "+error);
      }
    }); //end getDataByUser
}
});


// sample route with a route the way we're used to seeing it
app.get('/test', function(req, res) { //req = request (what came in)
                                      //res = response (what we're sending back)
	res.send('this is a test!'); //if you hit http://localhost:8080, you should find the index page (since the "public" file is by default)
});


//input GET route for when we are SAVING DATA to our database
app.get('/input', function(req,res){ // expecting:  localhost:8080/input?name=myName&data=myData
  console.log(">> received /input query from URL: ".cyan + JSON.stringify(req.query)); //req.query? refer to a question mark in ur url; ? makes a query

	insertData(req.query, function(error, data){ //returns error AND data that was just submitted
    if(!error){
      console.log("insertData complete: \n".green+JSON.stringify(data));
      res.send(data)
          } else {
      console.log("error on insertData: ".red + error)
      res.send("error insertData: \n" + error)
    }
  }); //end insertData

}); //end app.get('/input')


//output GET route for when we are READING data from database
app.get("/output",function(req,res){ // /output?name=myName
	console.log(">> received /output query from URL: ".cyan+JSON.stringify(req.query));

  if(req.query.name != null){ //checking to see if a username was passed in by URL

    //there is a user, return this user
    getDataByUser(req.query,function(error, output){
      if(!error && output){
        // console.log(JSON.stringify(output, null, '\t'));
        res.set('Content-Type', 'application/json');
        res.end("getDataByUser: "+req.query.name+" \n "+JSON.stringify(output, null, '\t'));
      }else{
        res.send("error: "+error);
      }
    }); //end getDataByUser
  }
  else {
    //no user found, just give us all the data
    getAllData(req.query, function(error, output){
      if(!error && output){
        // console.log(JSON.stringify(output, null, '\t'));
        res.set('Content-Type', 'application/json');//res = response
        res.end("getAllData: \n"+JSON.stringify(output, null, '\t'));
      }else{
        res.send("error: "+error);
      }
    })
  }
});




/****
* START THE HTTP SERVER
* ==============================================
*
*/
http.createServer(app).listen(port, function(){
  console.log();
  console.log('  HTTP Express Server Running!  '.white.inverse);
  var listeningString = ' Magic happening on port: '+ port +"  ";
  console.log(listeningString.cyan.inverse);

});





//*******************************************************//
//                                                       //
//         >>>>  OUR DATABASE FUNCTIONS <<<<             //
//                                                       //
// - these could move to their own myApi.js module file  //
//                                                       //
//                                                       //
//*******************************************************//


/****
* GET ALL DATA from our db
* ==============================================
* mongo.collection.find: http://docs.mongodb.org/manual/reference/method/db.collection.find/
*/
function getAllData(query, callback){

  data.find().toArray(function(error,data){
    if(!error){
      callback(null,data);
    }else{
      callback(error, null);
    }
  });
}





/****
* GET DATA by user from our db
* ==============================================
* mongo.collection.find: http://docs.mongodb.org/manual/reference/method/db.collection.find/
*/
function getDataByUser(query, callback){

  var userToLookFor = query.name;

  data.find({name:userToLookFor}).toArray(function(error,data){
    if(!error){
      console.log("GOT DATA FOR: "+userToLookFor);
      callback(null,data);
    }else{
      console.log("ERROR FINDING DATA FOR: "+userToLookFor);
      callback(error, null);
    }
  });
}


/****
* INSERT data into DB
* ==============================================
* mongo.collection.insert: http://docs.mongodb.org/manual/reference/method/db.collection.insert/
*
*/
function insertData(query,callback){

  if(query.name != null){ //making sure the "name= " part of the query has something
    var timeDataWasSent = new Date().getTime();

    verifyUserInDB(query.name,timeDataWasSent,function(verifyError, user){
      if(!verifyError && user){

          var dataObject = {name:query.name, data:query.data, time:timeDataWasSent};

          data.insert(dataObject, function(error, object){ 
            if(!error){
              callback(null,object); // send back null error and db object
            }else{
              console.log("insert data ERROR: "+error);
              callback(error, null);
            }
          })
      }else{
        console.log("error verifyUserInDB".red);
        callback("error verifyUserInDB: "+verifyError)
      }
    });
  } else { // req.query.name === null
    console.log("no 'name= ' could be found in your query".red);
    callback("no 'name= ' could be found in your query", null); // no name param
  }
}


/****
* VERIFY/UPDATE a user in our DB
* ==============================================
* - mongo.collection.update: http://docs.mongodb.org/manual/reference/method/db.collection.update/
* - "upsert" option means it will add this object if it cannot be found
* - OPTIONALLY, you could do a find() and if it doesn't match anyone, return an error
*
*/
function verifyUserInDB(sentName,sentTime,callback){

  var query ={name:sentName};
  var newUser = {name:sentName,regtime:sentTime};

  users.update(query, newUser, {upsert:true},function(e,o){
    //http://docs.mongodb.org/manual/reference/method/db.collection.update/
    if(!e){
      callback(null,o); // send back null error and db object
    }else{
      console.log("find user ERROR: "+e);
    }
  })
}

function findlatestbyname(sentName,callback){

  var query = {name:sentName}
  users.findOne(query,function(e,o){
    if(!e){
      callback(null,o.regtime); // send back null error and db object
    }else{
      console.log("find user ERROR: "+e);
    }
  })
}

function getDataByTime(latest,callback){

  var query = {time:latest}
  data.findOne(query,function(e,o){
    if(!e){
      callback(null,o); // send back null error and db object
    }else{
      console.log("find data ERROR: "+e);
    }
  })
}
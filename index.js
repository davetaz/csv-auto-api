const getCSV = require('get-csv'); // Library required to load the csv
const express = require('express'); // Library than creates and manages REST requests
const ejs = require('ejs'); // Library to render HTML pages for web browsers
var json2csv = require('json2csv'); // Library to create CSV for output

const app = express(); // Initialise the REST app

var database = []; // Create an array to store the rows from our CSV data
/*
 * The function that loads the file into our rows object
 */
function loadFile(file,input) {
	console.log(file + " loading...");
	if (typeof database[input] == 'undefined') {
		database[input] = [];
	}
    rows = database[input];
	getCSV(file, function(err,data) {
	    database[input] = database[input].concat(data);
	    console.log(file + " loaded");
	});
}

function loadFileLink(file,input,url_prefix,column,new_column) {
    console.log(file + " loading...");
    if (typeof database[input] == 'undefined') {
        database[input] = [];
    }
    rows = database[input];
    getCSV(file, function(err,data) {
        data.forEach(function(item) {
            item[new_column] = url_prefix + input + "/" + column + "/" + item[column];
        });
        database[input] = database[input].concat(data);
        console.log(file + " loaded linked");
    });
}

/* 
 * Function to handle the users REST request
 */
function handleRequest(req,res) {
    // Get the path they have asked for and the file type.
    prefix = req.params["prefix"];
    heading = req.params["column_heading"];
    value = req.params["value"];

    // Also manage query parameters at the same time
    filter = req.query;
    if (heading) {
        filter[heading] = value;
    }
    
    // Protect the user from a massive file download!
    if (prefix == "LFB" && Object.keys(filter).length === 0) {
        res.status(400).send('This dataset is too large to serve all of it in one request');
    }

    // Filter the data according to the request to only contain relevant rows
    result = database[prefix];
    result = result.filter(function(item) {
    for(var key in filter) {
        if(item[key] === undefined || item[key] != filter[key])
            return false;
        }
        return true;
    });

    // Work out what the client asked for, the ".ext" specified always overrides content negotiation
    ext = req.params["ext"];
    // If there is no extension specified then manage it via content negoition, yay!
    if (!ext) {
        accepts = req.accepts(['json','csv','html']);
        if (accepts == "html" && value != undefined && Object.keys(req.query).length === 0) {
            res.redirect(301,req.originalUrl + ".html");
        } else {
            ext = accepts;
        }
    }

    // Return the data to the user in a format they asked for
    // CSV, JSON or by default HTML (web page)
    if (ext == "csv") {
        res.set('Content-Type', 'text/csv');
        res.send(json2csv({ data: result }));
    } else if (ext == "json") {
        res.set('Content-Type', 'application/json');
        res.send(JSON.stringify(result,null,4));
    } else if (ext == "html") {
        ejs.renderFile(__dirname + '/page.html', { path: req.path, query: req.query }, function(err,data) {
            res.send(data);
        });
    }
};

/*
 * Load the data
 */
loadFileLink(__dirname + '/data/RailReferences.csv','NAPTAN',"http://api-demo.learndata.info/","CrsCode","CrsCodeURI");
loadFile(__dirname + '/data/HFStarRating6Regions-clean.csv','Tanzania');
loadFile(__dirname + '/data/2009-2012.csv','LFB');
loadFile(__dirname + '/data/2013-2016.csv','LFB');
loadFile(__dirname + '/data/2017.csv','LFB');

/*
 * Set the available REST endpoints and how to handle them
 */
app.get('/', function(req,res) { res.redirect(301,'https://learndata.info'); });
app.get('/:prefix', function(req,res) { handleRequest(req,res); });
app.get('/:prefix/', function(req,res) { handleRequest(req,res); });
app.get('/:prefix/:column_heading/:value.:ext', function(req,res) { handleRequest(req,res); });
app.get('/:prefix/:column_heading/:value', function(req,res) { handleRequest(req,res); });
app.use(function (req, res, next) {
  res.status(404).send("Sorry can't find that!")
})

/*
 * Start the app!
 */
app.listen(80, () => console.log('Example app listening on port 80!'));

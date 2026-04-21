
var express = require('express'),
  app = express(),
  http = require('http'),
  httpServer = http.Server(app);

app.use(express.static(__dirname+'/public'));

app.get('/', function(req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.listen(3003,()=>{
	console.log('karolkonop-website-app listening at 3003 from ',__dirname);
});

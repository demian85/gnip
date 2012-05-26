/**
 * Connects to Gnip streaming api.
 * 
 * @author Demián Rodriguez <demian85@gmail.com>
 * @version 0.1.0
 */
var EventEmitter = require('events').EventEmitter,
	JSONParser = require('./JSONParser').JSONParser,
	util = require('util'),
	GnipRules = require('./rules'),
	url = require('url'),
	zlib = require('zlib'),
	https = require('https');

/**
 * Connects to Gnip streaming api and tracks keywords.
 * All errors are emitted as 'error' events.
 * 
 * @param options Object with the following properties:
 *  - (String) username
 *  - (String) password
 *  - (String) userAgent
 *  - (String) streamURL
 *  
 * Events:
 * - data: function(String data) {...}
 * - object: function(Object object) {...}
 * - tweet: function(Object tweet) {...}
 * - delete: function(Number id) {...}
 * - error: function(Error error) {...}
 * - ready: function() {...}
 * - end: function() {...}
 */
var GnipStream = function(options) {
	EventEmitter.call(this);
	
	var self = this;
	
	self.options = Object.merge({
		username : '',
		password : '',
		userAgent : null,
		streamURL : null
	}, options || {});
	
	self._req = null;
	
	self.parser = new JSONParser();
	self.parser.on('object', function(object) {
		self.emit('object', object);
		if (object.error) self.emit('error', new Error('Stream response error: ' + (object.error.message || '-')));
		else if (object.verb == 'delete') self.emit('delete', object.id);
		else if (object.body) self.emit('tweet', object);
	});
	self.parser.on('error', function(err) {
		self.emit('error', err);
	});
};

util.inherits(GnipStream, EventEmitter);

GnipStream.prototype._basicAuth = function(user, pass) {
	return "Basic " + new Buffer(user + ":" + pass).toString('base64');
};

GnipStream.prototype.start = function() {
	var self = this;
	
	if (!self.options.streamURL) throw new Error('Invalid end point specified!');
	
	if (self._req) self.end();
	
	var streamUrl = require('url').parse(self.options.streamURL);
	var headers = {
		'Authorization' : self._basicAuth(self.options.username, self.options.password),		
		'Accept-Encoding' : 'gzip',
		'Connection' : 'keep-alive'
	};
	if (self.options.userAgent) headers['User-Agent'] = self.options.userAgent;
	
	var options = {
		host : streamUrl.hostname,
		port : streamUrl.port,
		path : streamUrl.path,
		headers : headers,
		agent : false
	};
	
	var gunzip = zlib.createGunzip();
	gunzip.on('data', function(data) {
		self.parser.receive(data);
		self.emit('data', data);
	});
	gunzip.on('error', function(err) {
		self.emit('error', err);
	});
	
	self._req = https.get(options, function(res) {
		self.emit('ready');
		res.pipe(gunzip);
		res.on('error', function(err) {
			self.emit('error', err);
			self.end();
		});
		res.on('end', function() {
			self.end();
		});
	});
	self._req.on('error', function(err) {
		self.emit('error', err);
		self.end();
	});
	self._req.end();
};
	
GnipStream.prototype.end = function() {
	if (this._req) {
		this._req.abort();
		this._req = null;
		this.emit('end');
	}
};

exports.Stream = GnipStream;
exports.Rules = GnipRules;
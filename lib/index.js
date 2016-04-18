var EventEmitter = require('events').EventEmitter,
	JSONParser = require('./JSONParser').JSONParser,
	util = require('util'),
	GnipRules = require('./rules'),
	url = require('url'),
	zlib = require('zlib'),
	_ = require('underscore'),
	https = require('https');

/**
 * Connects to Gnip streaming api and tracks keywords.
 *
 * @param options Object with the following properties:
 *  - (String) user
 *  - (String) password
 *  - (String) userAgent
 *  - (String) url
 *  - (Boolean) debug
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

	self.options = _.extend({
		user : '',
		password : '',
		userAgent : null,
		url : null,
		debug : false
	}, options || {});

	self._req = null;

	self.parser = new JSONParser();
	self.parser.on('object', function(object) {
		self.emit('object', object);
		if (object.error) self.emit('error', new Error('Stream response error: ' + (object.error.message || '-')));
		else if (object.verb == 'delete') self.emit('delete', object);
		else if (object.body || object.text) self.emit('tweet', object);
	});
	self.parser.on('error', function(err) {
		self.emit('error', err);
	});
};

util.inherits(GnipStream, EventEmitter);

GnipStream.prototype.start = function() {
	var self = this;

	if (self.options.debug) util.log('Starting stream...');

	if (!self.options.url) throw new Error('Invalid end point specified!');
  	if (self.options.timeout && self.options.timeout <= 30000) throw new Error('Timeout must be beyond 30s');

	if (self._req) self.end();

	var streamUrl = require('url').parse(self.options.url);
	var headers = {
		'Accept-Encoding' : 'gzip',
		'Connection' : 'keep-alive'
	};
	if (self.options.userAgent) headers['User-Agent'] = self.options.userAgent;

	var options = {
		host : streamUrl.hostname,
		port : streamUrl.port,
		path : streamUrl.path,
		qs   : self.options.client? {client: self.options.client} : undefined,
		headers : headers,
		auth : self.options.user + ':' + self.options.password,
		agent : false,
		version : 1
	};

	if (self.options.debug) {
		util.log('Http options:');
		console.log(options);
	}

	var gunzip = zlib.createGunzip();
	gunzip.on('data', function(data) {
		self.parser.receive(data);
		self.emit('data', data);
	});
	gunzip.on('error', function(err) {
		self.emit('error', err);
	});

	self._req = https.get(options, function(res) {
		res.pipe(gunzip);
		res.on('error', function(err) {
			self.emit('error', err);
			self.end();
		});
		res.on('end', function() {
			self.end();
		});
		if (res.statusCode < 200 || res.statusCode > 299) {
			self.emit('error', new Error('Response error. HTTP status code: ' + res.statusCode));
			self.end();
		}
		else {
			self.emit('ready');
		}
	});

	self._req.on('socket', function(socket) {
		socket.setTimeout(self.options.timeout || 35000);
		socket.on('timeout', function() {
		  self.emit('error', new Error('Connection Timeout'));
		  self.end();
		})
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

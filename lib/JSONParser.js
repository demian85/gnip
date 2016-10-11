var util = require('util'),
	EventEmitter = require('events').EventEmitter;

var Parser = function (parser, separator) {
	EventEmitter.call(this);
	
	this.buffer = '';
    this.parser = parser;
	this.separator = separator || "\r\n";
};

util.inherits(Parser, EventEmitter);

Parser.prototype.receive = function(buffer) {
	this.buffer += buffer.toString('utf8');
	var index, jsonStr, json;
	
	while ((index = this.buffer.indexOf(this.separator)) > -1) {
		jsonStr = this.buffer.slice(0, index);
		this.buffer = this.buffer.slice(index + this.separator.length);
		if (jsonStr.length > 0) {
			try {
				json = this.parser.parse(jsonStr);
				try {
					this.emit('object', json);
				} catch (err) {
					throw err;
				}
			} catch (err) {
				this.emit('error', new Error('Error parsing JSON: ' + err.message + '.\n' + jsonStr));
			}
		}
	}
};

module.exports.JSONParser = Parser;
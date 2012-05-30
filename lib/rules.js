var request = require('request'),
	crypto = require('crypto'),
	_ = require('underscore'),
	fs = require('fs'),
	path = require('path'),
	async = require('async');

var LiveRules = function(endPoint, user, password) {
	this._api = endPoint;
	this._auth = "Basic " + new Buffer(user + ':' + password).toString('base64');
};

/**
 * Add rules 
 * @param rules Array of rules as strings or objects in the form {value: String, tag: String}
 * @param cb Function callback
 */
LiveRules.prototype.add = function(rules, cb) {
	var json = {
		rules : rules.map(function(rule) {
			return (typeof rule == 'string') ? {value: rule} : rule;
		})
	};
	request.post({
		url : this._api,
		json: json,
		headers : {'Authorization' : this._auth}
	}, function(err, response, body) {
		if (err) cb(err);
		else if (response.statusCode >= 200 && response.statusCode < 300) cb();
		else cb(new Error('Unable to add rules. Request failed with status code: ' + response.statusCode));
	});
};

/**
 * Delete rules 
 * @param rules Array of rules as strings or objects in the form {value: String, tag: String}
 * @param cb Function callback
 */
LiveRules.prototype.remove = function(rules, cb) {
	var json = {
		rules : rules.map(function(rule) {
			return (typeof rule == 'string') ? {value: rule} : rule;
		})
	};
	request.del({
		url : this._api, 
		json: json,
		headers : {'Authorization' : this._auth}
	}, function(err, response, body) {
		if (err) cb(err);
		else if (response.statusCode >= 200 && response.statusCode < 300) cb();
		else cb(new Error('Unable to delete rules. Request failed with status code: ' + response.statusCode));
	});
};

/**
* Replace existing tracking rules
* @param rules Array of rules as strings or objects in the form {value: String, tag: String}
* @param cb Function callback
*/
LiveRules.prototype.update = function(rules, cb) {
	var self = this;
	self.removeAll(function(err) {
		if (err) cb(err);
		else self.add(rules, cb);
	});
};

/**
* Get current tracking rules
* @param cb Function callback
*/
LiveRules.prototype.getAll = function(cb) {
	var self = this;
	request({
		url : self._api,
		headers : {'Authorization' : self._auth}
	}, function(err, response, body) {
		if (err) cb(err);
		else if (response.statusCode >= 200 && response.statusCode < 300) {
			try {
				var rules = JSON.parse(body).rules;
				cb(null, rules);
			} catch(e) {
				cb(e);
			}
		}
		else {
			cb(new Error('Unable to fetch rules. Request failed with status code: ' + response.statusCode));
		}
	});
};

/**
* Remove current tracking rules
* @param cb Function callback
*/
LiveRules.prototype.removeAll = function(cb) {
	var self = this;
	self.getAll(function(err, rules) {
		if (err) cb(err);
		else self.remove(rules, cb);
	});
};




var GnipRules = function(options) {
	this.options = _.extend({
		user : '',
		password : '',
		url : null,
		debug : false
	}, options || {});
	
	this._api = this.options.url;
	this._auth = "Basic " + new Buffer(this.options.user + ':' + this.options.password).toString('base64');
	this._cacheFile = __dirname + '/' + crypto.createHash('md5').update(this._api).digest('hex') + '.cache';
	this.live = new LiveRules(this._api, this.options.user, this.options.password);
	
	if (!path.existsSync(this._cacheFile)) {
		fs.writeFileSync(this._cacheFile, '[]', 'utf8');
	}
};

GnipRules.prototype._deleteRulesBatch = function(rules, max, cb) {
	var self = this;
	var groups = [];
	max = max || 4000;

	for (var i = 0; i < rules.length; i += max) {
		groups.push(rules.slice(i, i+max));
	}
	async.forEachSeries(groups, function(group, cb) {
		self.live.remove(group, cb);
	}, cb);
};
	
GnipRules.prototype._addRulesBatch = function(rules, max, cb) {
	var self = this;
	var groups = [];
	max = max || 4000;

	for (var i = 0; i < rules.length; i += max) {
		groups.push(rules.slice(i, i+max));
	}
	async.forEachSeries(groups, function(group, cb) {
		self.live.add(group, cb);
	}, cb);
};

GnipRules.prototype.getAll = function(cb) {
	fs.readFile(this._cacheFile, 'utf8', function(err, contents) {
		if (err) cb(err);
		else {
			try {
				cb(null, JSON.parse(contents));
			} catch (e) {
				cb(null, 0);
			}
		}
	});
};

GnipRules.prototype.clearCache = function(cb) {
	fs.writeFile(this._cacheFile, '[]', 'utf8', cb);
};

GnipRules.prototype.update = function(rules, cb) {
	
	var self = this;

	rules = rules.map(function(rule) {
		return (typeof rule == 'string') ? {value: rule} : rule;
	});

	fs.readFile(self._cacheFile, 'utf8', function(err, contents) {
		if (err) cb(err);
		else {
			var currentRules;
			try {
				currentRules = JSON.parse(contents);
			} catch (e) {
				currentRules = [];
			}
			
			// which rules to delete?
			var rulesPlain = rules.map(function(rule) {
				return rule.value;
			});
			var deleteRules = currentRules.filter(function(rule) {
				return rulesPlain.indexOf(rule) == -1;
			});
			
			// which rules to add?
			var currentRulesPlain = currentRules.map(function(rule) {
				return rule.value;
			});
			var addRules = rules.filter(function(rule) {
				return currentRulesPlain.indexOf(rule) == -1;
			});
			
			async.series([
				function(cb) {
					self._deleteRulesBatch(deleteRules, 5000, cb);
				},
				function(cb) {
					self._addRulesBatch(addRules, 5000, cb);
				},
				function(cb) {
					fs.writeFile(self._cacheFile, JSON.stringify(rules), 'utf8', cb);
				}
			], function(err) {
				if (err) cb(err);
				else {
					cb(null, {
						added : addRules,
						deleted : deleteRules
					});
				}
			});
		}
	});		
}

module.exports = GnipRules;
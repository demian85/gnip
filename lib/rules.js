var request = require('request');
var crypto = require('crypto');
var _ = require('underscore');
var fs = require('fs');
var async = require('async');
var JSONBigInt = require('json-bigint');

var LiveRules = function (endPoint, user, password, parser) {
  this._api = endPoint;
  this._auth = "Basic " + new Buffer(user + ':' + password).toString('base64');
  this.parser = parser;
};

function formatFailedRules (body) {
  if (!(body && body.detail)) return '';
  var errors = body.detail
    .filter(function(rule) {
      return rule.created === false && rule.message;
    })
    .map(function(rule) {
      return 'Rule: ' + rule.rule.value + '\nError: ' + rule.message;
    });

  return errors.join('\n');
}

/**
 * Add rules
 * @param rules Array of rules as strings or objects in the form {value: String, tag: String}
 * @param cb Function callback
 */
LiveRules.prototype.add = function (rules, cb) {
  var json = {
    rules: rules.map(function (rule) {
      return (typeof rule == 'string') ? { value: rule } : rule;
    })
  };
  request.post({
    url: this._api,
    json: json,
    headers: { 'Authorization': this._auth }
  }, function (err, response, body) {
    if (err) cb(err);
    else if (response.statusCode >= 200 && response.statusCode < 300) cb(null, body);
    else {
      var errStr = 'Unable to add rules. Request failed with status code: ' + response.statusCode;
      var ruleErrors = formatFailedRules(body);
      if (ruleErrors) errStr += '\n' + ruleErrors;
      if (body && body.error) errStr += '\n' + body.error.message;
      cb(new Error(errStr));
    }
  });
};

/**
 * Delete rules
 * @param rules Array of rules as strings or objects in the form {value: String, tag: String}
 * @param cb Function callback
 */
LiveRules.prototype.remove = function (rules, cb) {
  var json = {
    rules: rules.map(function (rule) {
      return (typeof rule == 'string') ? { value: rule } : rule;
    })
  };
  request.post({
    url: this._api + '?_method=delete',
    json: json,
    headers: { 'Authorization': this._auth }
  }, function (err, response, body) {
    if (err) cb(err);
    else if (response.statusCode >= 200 && response.statusCode < 300) cb(null, body);
    else {
      var errStr = 'Unable to delete rules. Request failed with status code: ' + response.statusCode;
      if (body && body.error) errStr += '\n' + body.error.message;
      cb(new Error(errStr));
    }
  });
};

/**
* Replace existing tracking rules
* @param rules Array of rules as strings or objects in the form {value: String, tag: String}
* @param cb Function callback
*/
LiveRules.prototype.update = function (rules, cb) {
  var self = this;
  self.removeAll(function (err) {
    if (err) cb(err);
    else self.add(rules, cb);
  });
};

/**
* Get current tracking rules
* @param cb Function callback
*/
LiveRules.prototype.getAll = function (cb) {
  var self = this;
  request({
    url: self._api,
    headers: { 'Authorization': self._auth }
  }, function (err, response, body) {
    if (err) cb(err);
    else if (response.statusCode >= 200 && response.statusCode < 300) {
      try {
        var rules = self.parser.parse(body).rules;
        cb(null, rules);
      } catch (e) {
        cb(e);
      }
    }
    else {
      cb(new Error('Unable to fetch rules. Request failed with status code: ' + response.statusCode));
    }
  });
};

/**
* Get rules matching GNIP IDs
* @param ids List of strings
* @param cb Function callback
*/
LiveRules.prototype.getByIds = function (ids, cb) {
  var self = this;
  var json = {
    rule_ids: ids
  };
  request.post({
    url: self._api + '?_method=get',
    json: json,
    headers: { 'Authorization': self._auth }
  }, function (err, response, body) {
    if (err) cb(err);
    else if (response.statusCode >= 200 && response.statusCode < 300) {
      cb(null, body.rules);
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
LiveRules.prototype.removeAll = function (cb) {
  var self = this;
  self.getAll(function (err, rules) {
    if (err) {
      cb(err);
    } else if (rules.length > 0) {
      self.remove(rules, cb);
    } else {
      cb(null);
    }
  });
};




var GnipRules = function (options) {
  this.options = _.extend({
    user: '',
    password: '',
    url: null,
    debug: false,
    batchSize: 5000,
    parser: JSONBigInt
  }, options || {});

  this._api = this.options.url;
  this._auth = "Basic " + new Buffer(this.options.user + ':' + this.options.password).toString('base64');
  this._cacheFile = __dirname + '/' + crypto.createHash('md5').update(this._api).digest('hex') + '.cache';
  this.live = new LiveRules(this._api, this.options.user, this.options.password, this.options.parser);

  if (!fs.existsSync(this._cacheFile)) {
    fs.writeFileSync(this._cacheFile, '[]', 'utf8');
  }
};

GnipRules.prototype._deleteRulesBatch = function (rules, max, cb) {
  var self = this;
  var groups = [];
  max = max || 4000;

  for (var i = 0; i < rules.length; i += max) {
    groups.push(rules.slice(i, i + max));
  }
  async.forEachSeries(groups, function (group, cb) {
    self.live.remove(group, cb);
  }, cb);
};

GnipRules.prototype._addRulesBatch = function (rules, max, cb) {
  var self = this;
  var groups = [];
  max = max || 4000;

  for (var i = 0; i < rules.length; i += max) {
    groups.push(rules.slice(i, i + max));
  }
  async.forEachSeries(groups, function (group, cb) {
    self.live.add(group, cb);
  }, cb);
};

GnipRules.prototype.getAll = function (cb) {
  var self = this;
  fs.readFile(this._cacheFile, 'utf8', function (err, contents) {
    if (err) cb(err);
    else {
      try {
        cb(null, self.live.parser.parse(contents));
      } catch (e) {
        cb(null, []);
      }
    }
  });
};

GnipRules.prototype.clearCache = function (cb) {
  fs.writeFile(this._cacheFile, '[]', 'utf8', cb);
};

function getRuleKey(rule) {
  if (rule.tag) {
    return rule.value + ' tag: ' + rule.tag;
  }
  return rule.value;
}

GnipRules.prototype.update = function (rules, cb) {

  var self = this;

  rules = rules.map(function (rule) {
    return (typeof rule == 'string') ? { value: rule } : rule;
  });

  fs.readFile(self._cacheFile, 'utf8', function (err, contents) {
    if (err) cb(err);
    else {
      var currentRules;
      try {
        currentRules = self.live.parser.parse(contents);
      } catch (e) {
        currentRules = [];
      }

      // which rules to delete?
      var rulesPlain = rules.map(function (rule) {
        return getRuleKey(rule);
      });
      var deleteRules = currentRules.filter(function (rule) {
        return rulesPlain.indexOf(getRuleKey(rule)) == -1;
      });

      // which rules to add?
      var currentRulesPlain = currentRules.map(function (rule) {
        return getRuleKey(rule);
      });
      var addRules = rules.filter(function (rule) {
        return currentRulesPlain.indexOf(getRuleKey(rule)) == -1;
      });

      async.series([
        function (cb) {
          self._deleteRulesBatch(deleteRules, self.options.batchSize, cb);
        },
        function (cb) {
          self._addRulesBatch(addRules, self.options.batchSize, cb);
        },
        function (cb) {
          fs.writeFile(self._cacheFile, self.live.parser.stringify(rules), 'utf8', cb);
        }
      ], function (err) {
        if (err) cb(err);
        else {
          cb(null, {
            added: addRules,
            addedCount: addRules.length,
            deleted: deleteRules,
            deletedCount: deleteRules.length
          });
        }
      });
    }
  });
}

module.exports = GnipRules;

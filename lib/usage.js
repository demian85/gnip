var request = require('request'),
	_ = require('underscore'),
	RateLimiter = require('limiter').RateLimiter;

var GnipUsage = function(options) {
	this.options = _.extend({
		user : '',
		password : '',
		url : null
	}, options || {});

	this._api = this.options.url;
	this._auth = "Basic " + new Buffer(this.options.user + ':' + this.options.password).toString('base64');
	this._limiter = new RateLimiter( 2, 61000 );
};

GnipUsage.prototype.get = function() 
{
	var userArguments = arguments;

	this._limiter.removeTokens(1, function( err, remainingRequests )
	{
		this._makeRequest.apply( this, userArguments );

	}.bind( this ));
};

GnipUsage.prototype._makeRequest = function()
{
	var cb;
	var json;

	if( arguments.length === 1 )
	{
		cb = arguments[ 0 ];
	}
	else
	{
		json = arguments[ 0 ];
		cb = arguments[ 1 ];
	}

	var requestOptions =
	{
		url : this._api,
		headers : {'Authorization' : this._auth}
	};

	if( json )
	{
		requestOptions.qs = json;
	}

	request.get(
		requestOptions, 
		function(err, response, body)
		{
			if (err) 
			{
				cb(err);
				return;
			}
			
			if( typeof body !== 'undefined' )
			{
				body = JSON.parse( body );
			}

			if (response.statusCode >= 200 && response.statusCode < 300) 
			{
				cb(null, body);
			}
			else 
			{
				var errStr = 'Unable to get usage. Request failed with status code: ' + response.statusCode;
				if (body && body.error) errStr += '.\n' + body.error.message;
				cb(new Error(errStr));
			}
		}
	);
};

module.exports = GnipUsage;

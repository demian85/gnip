var EventEmitter = require('events').EventEmitter,
	util = require('util'),
	_ = require('underscore'),
	request = require( 'request' );

/**
 * Connects to Gnip search api and tracks keywords.
 *
 * @param options Object with the following properties:
 *  - (String) user
 *  - (String) password
 *  - (String) url
 *
 * Events:
 * - object: function(Object object) {...}
 * - tweet: function(Object tweet) {...}
 * - error: function(Error error) {...}
 * - ready: function() {...}
 * - end: function() {...}
 */
var GnipSearch = function( options, limiter ) 
{
	EventEmitter.call(this);

	this.limiter = limiter;

	this.active = false;

	this.options = _.extend({
		user : '',
		password : '',
		url : '',
		query : '' 
	}, options || {});
};

util.inherits(GnipSearch, EventEmitter);

GnipSearch.prototype.start = function() 
{
	this.emit( 'ready' );
	this.active = true;
	this._step();
};

GnipSearch.prototype.end = function() 
{
	this.active = false;
	this.emit( 'end' );
};

GnipSearch.prototype._step = function( next )
{
	this.limiter.removeTokens(1, function( err, remainingRequests ) // err shouldn't ever be set here
	{
		this._makeRequest( next, function( gnipErr, res, body )
		{
			this._handleResponse( gnipErr, res, body, next, this._step.bind( this ) );

		}.bind( this ));

	}.bind( this ));	
};

GnipSearch.prototype._handleResponse = function( gnipErr, res, body, current, callback )
{
	if( gnipErr )
	{
		this.emit( 'error', gnipErr );
		return callback( current );
	}

	if( res.statusCode !== 200 )
	{
		if( res.statusCode.toString().match( /^5[0-9]{2}&/ ) )
		{
			this.emit( 'error', body.error );
			return callback( current );
		}

		this.emit( 'end', body.error );
		return;
	}

	if(	body.results == undefined )
	{
		this.emit( 'end' );
		return;
	}

	this.emit( 'object', body );

	body.results.map(function( thisResult )
	{
		this.emit( 'tweet', thisResult );

	}.bind( this ));

	if(	!this.active || body.next == undefined )
	{
		this.emit( 'end' );
		return;
	}

	process.nextTick(function()
	{
		callback( body.next );

	}.bind( this ));
};

GnipSearch.prototype._makeRequest = function( next, callback )
{
	var requestParameters = { query : this.options.query };

	if( this.options.fromDate )
		requestParameters.fromDate = this.options.fromDate;

	if( this.options.toDate )
		requestParameters.toDate = this.options.toDate;

	if( this.options.maxResults )
		requestParameters.maxResults = this.options.maxResults;

	if( this.options.tag )
		requestParameters.tag = this.options.tag;

	if( next )
		requestParameters.next = next;

	const requestData = JSON.stringify( requestParameters );

    const auth = "Basic " + new Buffer( this.options.user + ":" + this.options.password ).toString( "base64" );

	request({
	    url: this.options.url,
	    method: "POST",
	    json: true,
	    headers: 
	    {
            "Authorization" : auth,
	        "content-type": "application/json",
	    },
	    body: requestData
	}, callback);
}

module.exports = GnipSearch;

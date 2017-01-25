var EventEmitter = require('events').EventEmitter,
	util = require('util'),
	_ = require('underscore'),
	request = require( 'request' ),
	async = require( 'async' );



const asyncRetryConfig = 
{
	times : 3,
	interval : 500
};

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
};

GnipSearch.prototype._step = function( next )
{
	this.limiter.removeTokens(1, function( err, remainingRequests ) // err shouldnt ever be set here
	{
		this._makeRequest( next, this._handleResponse.bind( this ) );
	}.bind( this ));
};

GnipSearch.prototype._handleResponse = function( gnipErr, res, body )
{
	if( gnipErr )
	{
		this.emit( 'error', gnipErr );
		return;
	}

	if( res.statusCode !== 200 )
	{
		this.emit( 'error', body.error );
		return;
	}

	if(	body.results == undefined )
	{
		this.emit( 'end' );
		return;
	}

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
		this._step( body.next );

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

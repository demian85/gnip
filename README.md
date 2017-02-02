NodeJS Gnip module
====

Connect to Gnip streaming API and manage rules. 
You must have a Gnip account with any data source available, like Twitter Power Track.

Currenly, this module only supports JSON activity stream format, so you must enable data normalization in your admin panel.

# Gnip.Stream
This class is an EventEmitter and allows you to connect to the stream and start receiving data.

## Constructor options

#### options.timeout
As requested in the Gnip docs (http://support.gnip.com/apis/powertrack/api_reference.html), this option in the constructor allows us to set a read timeout in the client. The recommended value is >=30 seconds, so the constructor will throw an error if a smaller timeout is provided. The default value for this option is 35 seconds.

#### options.backfillMinutes
Number of minutes to backfill after connecting to the stream. Optional. Value should be 0 - 5.

#### options.partition
Partition of the Firehose stream you want to connect to. Only required for Firehose streams.

#### options.parser
Parser library for incoming JSON data. Optional, defaults to the native JSON parser.  
Matching tag IDs are sent to us as big integers which can't be reliably parsed by the native JSON library in Node.js. When you rely on tag IDs you can use the excellent [json-bigint](https://www.npmjs.com/package/json-bigint) library:

```
var JSONbig = require('json-bigint');
var stream = new Gnip.Stream({
	parser: JSONbig,
	...
});
```
More info on this issue can be found at [StackOverflow](http://stackoverflow.com/questions/8663298/json-transfer-of-bigint-12000000000002539-is-converted-to-12000000000002540)

## API methods

#### stream.start()
Connect to the stream and start receiving data. At this point you should have registered at least one event listener for any of these events: 'data', 'object' or 'tweet'.

#### stream.end()
Terminates the connection.

## Events

###### ready
Emitted when the connection has been successfully established
###### data
Emitted for each data chunk (decompressed)
###### error
Emitted when any type of error occurs. An error is raised if the response status code is not 20x. {error: String} objects are also checked here.
###### object
Emitted for each JSON object.
###### tweet
Emitted for each tweet.
###### delete
Emitted for each deleted tweet.
###### end
Emitted when the connection is terminated. This event is always emitted when an error occurs and the connection is closed.

# Gnip.Rules
This class allows you to manage an unlimited number of tracking rules.

## API methods

#### rules.getAll(Function callback)
Get cached rules.

#### rules.update(Array rules, Function callback)
Creates or replaces the live tracking rules.  
Rules are sent in batches of `options.batchSize`, so you can pass an unlimited number of rules.  
The current tracking rules are stored in a local JSON file so you can update the existing rules efficiently without having to remove them all.
The callback receives an object as the 2nd argument and contains the number of added and deleted rules.

#### rules.clearCache(Function callback)
Clears cached rules.

### The following methods uses Gnip API directly and ignores the local cache. Avoid usage if you are working with too many rules!
#### rules.live.update(Array rules, Function callback)
#### rules.live.add(Array rules, Function callback)
#### rules.live.remove(Array rules, Function callback)
#### rules.live.getAll(Function callback)
#### rules.live.removeAll(Function callback)

# Gnip.Search
This class is an EventEmitter and allows you to connect to either the 30 day or full archive search API and start receiving data.

## Constructor options

#### options.user
GNIP account username.

#### options.password
GNIP account password.

#### options.url
GNIP Search endpoint url e.g. ```https://gnip-api.twitter.com/search/30day/accounts/{ACCOUNT_NAME}/{LABEL}.json```

#### options.query
Rule to match tweets.

#### options.fromDate
The oldest date from which tweets will be gathered. Date given in the format 'YYYYMMDDHHMM'. Optional.

#### options.toDate
The most recent date to which tweets will be gathered. Date given in the format 'YYYYMMDDHHMM'. Optional.

#### options.maxResults
The maximum number of search results to be returned by a request. A number between 10 and 500. Optional.  

#### options.tag
Used to segregate rules and their matching data into different logical groups. Optional.

## API methods

#### stream.start()
Start receiving data. At this point you should have registered at least one event listener for 'object' or 'tweet'.

#### stream.end()
Terminates the connection.

## Events

###### ready
Emitted when tweets have started to be collected.
###### error
Emitted when a recoverable (non fatal) error occurs. 
###### object
Emitted for each JSON object.
###### tweet
Emitted for each tweet.
###### end
Emitted when the connection is terminated. If the stream has ended due to a fatal error, the error object will be passed.

# Gnip.Usage
This class allows you to track activity consumption across Gnip products.

## Constructor options

#### options.url
GNIP API url, e.g: https://gnip-api.twitter.com/metrics/usage/accounts/{ACCOUNT_NAME}.json

#### options.user
Username for authentication.

#### options.password
Password for authentication.

Example:
```js
var usage = new Gnip.Usage({
	url : 'https://gnip-api.twitter.com/metrics/usage/accounts/{ACCOUNT_NAME}.json',
	user : 'xxx',
	password : 'xxx'
});
```

## API Methods

#### usage.get(Function callback)
Error passed as first parameter to callback, result as second.

#### usage.get(Object parameters, Function callback)
<a href="http://support.gnip.com/apis/usage_api/api_reference.html#GETData">Information on request parameters can be found here.</a>

```js
usage.get({ bucket:'day', fromDate:'201612010000', toDate:'201612100000' },function( err, body )
{
	...
});
````

Installation
====
	npm install gnip

Example Usage
====
	var Gnip = require('gnip');

	var stream = new Gnip.Stream({
		url : 'https://gnip-stream.twitter.com/stream/powertrack/accounts/xxx/publishers/twitter/prod.json',
		user : 'xxx',
		password : 'xxx',
		backfillMinutes: 5 // optional
	});
	stream.on('ready', function() {
		console.log('Stream ready!');
	});
	stream.on('tweet', function(tweet) {
		console.log(tweet);
	});
	stream.on('error', function(err) {
		console.error(err);
	});

	var rules = new Gnip.Rules({
		url : 'https://gnip-api.twitter.com/rules/powertrack/accounts/xxx/publishers/twitter/prod.json',
		user : 'xxx',
		password : 'xxx',
		batchSize: 1234, // not required, defaults to 5000
	});

	var newRules = [
		'#hashtag', 
		'keyword', 
		'@user',
		{value: 'keyword as object'},
		{value: '@demianr85', tag: 'rule tag'}
	];

	rules.update(newRules, function(err) {
		if (err) throw err;
		stream.start();
	});
	
	var search = new Gnip.Search({
		url : 'https://gnip-stream.twitter.com/stream/powertrack/accounts/xxx/publishers/twitter/prod.json',
		user : 'xxx',
		password : 'xxx',
		query : '@user'
	});
	
	search.on('tweet', function(tweet) {
		console.log(tweet);
	});

	search.on('error', function(err) {
		console.error(err);
	});
	
	search.on('end', function(err) {
		if( err ) 
			console.error(err);
	});
	
More details and tests soon...

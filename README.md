[![build status](https://secure.travis-ci.org/demian85/gnip.png)](http://travis-ci.org/demian85/gnip)
NodeJS Gnip module
====

Connect to Gnip streaming API and manage rules. 
You must have a Gnip account with any data source available, like Twitter Power Track.

Currenly, this module only supports JSON activity stream format, so you must enable data normalization in your admin panel.

# Gnip.Stream
This class is an EventEmitter and allows you to connect to the stream and start receiving data.

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
Rules are sent in batches of 5000 (API limit), so you can pass an unlimited number of rules.  
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


Installation
====
	npm install gnip

Example Usage
====
	var Gnip = require('gnip');

	var stream = new Gnip.Stream({
		url : 'https://stream.gnip.com:443/accounts/xxx/publishers/twitter/streams/track/prod.json',
		user : 'xxx',
		password : 'xxx'
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
		url : 'https://api.gnip.com:443/accounts/xxx/publishers/twitter/streams/track/prod/rules.json',
		user : 'xxx',
		password : 'xxx'
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

More details and tests soon...
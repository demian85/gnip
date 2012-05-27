gnip
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
###### data
###### error
###### object
###### tweet
###### delete
###### end

# Gnip.Rules
This class allows you to manage an unlimited number of tracking rules.

## API methods

#### rules.getAll(Function callback)
Get cached rules.

#### rules.update(Array rules, Function callback)
Creates or replaces the live tracking rules.  
Rules are sent in batches of 5000 (API limit), so you can pass an unlimited number of rules.  
The current tracking rules are stored in a local JSON file so you can update the existing rules efficiently without having to remove them all.

#### rules.clearCache(Function callback)
Clears cached rules.

### The following methods uses Gnip API directly and ignores the local cache. Avoid usage if you are working with too many rules!
#### rules.live.update(Array rules, Function callback)
#### rules.live.add(Array rules, Function callback)
#### rules.live.remove(Array rules, Function callback)
#### rules.live.getAll(Function callback)
#### rules.live.removeAll(Function callback)


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

	rules.update(['#hashtag', 'keyword', '@user'], function(err) {
		if (err) throw err;
		stream.start();
	});

More details and tests soon...
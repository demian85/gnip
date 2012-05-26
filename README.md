gnip
====

Connect to Gnip streaming API and manage rules.

The current tracking rules are stored in a local JSON file so you can update the existing rules efficiently without having to remove them all.

Example Usage
====
	var Gnip = require('gnip');

	var stream = new Gnip.Stream({
		url : 'https://stream.gnip.com:443/accounts/xxx/publishers/twitter/streams/track/prod.json',
		username : 'xxx',
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

	var rules = new Gnip.Rules('https://api.gnip.com:443/accounts/xxx/publishers/twitter/streams/track/prod/rules.json', 'xxx', 'xxx');

	rules.update(['#hashtag', 'keyword', '@user'], function(err) {
		if (err) throw err;
		stream.start();
	});

API methods
====
	rules.getAll(Function callback)
	rules.update(Array rules, Function callback)
	rules.live.update(Array rules, Function callback)
	rules.live.add(Array rules, Function callback)
	rules.live.remove(Array rules, Function callback)
	rules.live.getAll(Function callback)
	rules.live.removeAll(Function callback)

More details and tests soon...
gnip
====

Connect to Gnip streaming API and manage rules

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

	var rules = new Gnip.Rules({
		url : 'https://api.gnip.com:443/accounts/xxx/publishers/twitter/streams/track/prod/rules.json',
		username : 'xxx',
		password : 'xxx'
	});

	rules.update(['#hashtag', 'keyword', '@user'], function(err) {
		if (err) throw err;
		stream.start();
	});

API methods
====
Coming soon...
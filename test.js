var Gnip = require('gnip'),
	async = require('async');

var stream = new Gnip.Stream({
    url : 'https://stream.gnip.com:443/accounts/xxx/publishers/twitter/streams/track/dev.json',
    user : 'xxx',
    password : 'xxx'
});
stream.on('ready', function() {
    console.log('Stream ready!');
});
stream.on('tweet', function(tweet) {
    console.log('New tweet: ' + tweet.body);
});
stream.on('error', function(err) {
    console.error(err);
});

var rules = new Gnip.Rules({
    url : 'https://api.gnip.com:443/accounts/xxx/publishers/twitter/streams/track/dev/rules.json',
    user : 'xxx',
    password : 'xxx'
});

rules.live.removeAll(function(err) {
	if (err) throw err;
	
	rules.clearCache();
	
	rules.update(['nodeJS'], function(err) {
		if (err) throw err;

		stream.start();

		async.series([
			async.apply(test, ['ford', 'peugeot']),
			async.apply(test, ['peugeot']),
			async.apply(test, ['volkswagen', 'audi', {value:'ferrari'}])
		], function(err) {
			if (err) throw err;
		});
	});
});

function test(r, cb) {
	console.log('Testing rule update...');
	
	rules.update(r, function(err) {
		if (err) throw err;

		async.series([
			function(cb) {
				rules.getAll(function(err, rules) {
					if (err) throw err;
					console.log('Local rules:')
					console.log(rules)
					cb();
				});
			},
			function(cb) {
				rules.live.getAll(function(err, rules) {
					if (err) throw err;
					console.log('Live rules:')
					console.log(rules)
					cb();
				})
			}
		], cb);
	});
}
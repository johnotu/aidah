function random(array){
	return array[Math.floor(Math.random()*array.length)];
}

var farewell = ['Goodbye ', 'See ya ', 'Come back later ', 'Sad to see you go ', 'Take care ', 'Farewell '];
var welcome = ['Hello ', 'Yo ;) ', 'Hey, nice to see you ', 'Hi ', 'Welcome '];

exports.greeting = {
	welcome: function(name){
		return random(welcome) + name;
	},
	
	farewell: function(name){
		return random(farewell) + name;
	}
}
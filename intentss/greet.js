function random(array){
	return array[Math.floor(Math.random()*array.length)];
}

function greetings(name){
	var answers = ['Hello ', 'Yo ;) ', 'Hey, nice to see you ', 'Hi ', 'Welcome '];
	return (random(answers) + name);
}

module.exports = greetings
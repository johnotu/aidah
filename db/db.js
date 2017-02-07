"use strict";

var documentClient = require("documentdb").DocumentClient;
var config = require("./config");
var url = require('url');

var client = new documentClient(config.endpoint, {"masterKey": config.primaryKey});
var HttpStatusCodes = { NOTFOUND: 404 };
var databaseUrl = `dbs/${config.database.id}`;
var collectionUrl = `${databaseUrl}/colls/${config.collection.id}`;

function getDatabase(){
	console.log(`Getting database:\n${config.database.id}\n`);
	return new Promise((resolve, reject) => {
		client.readDatabase(databaseUrl, (err, result) {
			if(err){
				if(err.code == HttpStatusCodes.NOTFOUND){
					client.createDatabase(config.database, (err, created) =>{
						if(err) reject(err)
						else resolve(created);
					});
				} else {
					reject(err);
				}
			} else {
				resolve(result);
			}
		});
	});
};
// getDatabase()

function getCollection(){
	console.log(`Getting collection:\n${config.collection.id}\n`);
	return new Promise((resolve, reject) => {
		client.readCollection(collectionUrl, (err, result) => {
			if(err){
				if(err.code == HttpStatusCodes.NOTFOUND){
					client.createCollection(databaseUrl, config.collection, { offerThroughput: 400 }, (err, created) => {
						if(err) reject(err)
						else resolve(created);
					});
				} else {
					reject(err);
				}
			} else {
				resolve(result);
			}
		});
	});
};
// getCollection()

function getUserDocument(document){
	let documentUrl = `${collectionUrl}/docs/${document.id}`;
	console.log(`Getting document:\n${document.id}\n`);
	return new Promise((resolve, reject) => {
		client.readDocument(documentUrl, { partitionKey: document.district }, (err, result) => {
			if(err){
				if(err.code == HttpStatusCodes.NOTFOUND){
					client.createDocument(collectionUrl, document, (err, created) => {
						if(err) reject(err);
						else resolve(created);
					});
				} else {
					reject(err);
				}
			} else {
				resolve(result);
			}
		});
	});
};
// getUserDocument(config.documents.UserPhone)

function queryCollection(){
	console.log(`Querying collection through index:\n${config.collection.id}`);
	return new Promise((resolve, reject) => {
		client.queryDocuments(
			collectionUrl,
			'SELECT VALUE r.children FROM root r WHERE r.lastname = ""'
		).toArray((err, results) => {
			if(err) reject(err);
			else {
				for(var queryResult of results){
					let resultString = JSON.stringify(queryResult);
					console.log(`\tQuery returned ${resultString}`);
				}
				console.log();
				resolve(results);
			}
		});
	});
};
// queryCollection()

function replaceUserDocument(document){
	let documentUrl = `${collectionUrl}/docs/${document.id}`;
	console.log(`Replacing document:\n${document.id}\n`);
	document.firstName = " ";
	return new Promise((resolve, reject) => {
		client.replaceDocument(documentUrl, document, (err, result) => {
			if(err) reject(err);
			else {
				resolve(result);
			}
		});
	});
};
// replaceUserDocument(config.documents.UserPhone)

function deleteUserDocument(document){
	let documentUrl = `${collectionUrl}/docs/${document.id}`;
	console.log(`Deleting document:\n${document.id}\n`);
	return new Promise((resolve, reject) => {
		client.deleteDocument(documentUrl, (err, result) => {
			if(err) reject(err);
			else {
				resolve(result);
			}
		});
	});
};
// deleteUserDocument(config.documents.UserPhone)

module.exports = getDatabase;
module.exports = getCollection;
module.exports = queryCollection;
module.exports = getUserDocument;
module.exports = replaceUserDocument;
module.exports = deleteUserDocument;

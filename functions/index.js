const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);

exports.posts = require('./scripts/posts');

exports.groups = require('./scripts/groups');

exports.music = require('./scripts/music');

exports.users = require('./scripts/users');

const functions = require('firebase-functions');
const admin = require('firebase-admin');
// Serverless Functions
// Triggered When users sign up
exports.userSignup = functions.auth.user().onCreate(user => {
    const userStatus = admin.firestore().collection('users').doc(user.uid).set({
      email: user.email,
      user_id: user.uid,
      name: '',
    });
  
    return userStatus
  });
  
  // Microservices HTTPS Callable Functions
  //Users
  //Update User Info and Settings
  exports.updateUser = functions.https.onCall((data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
    const users = admin.firestore().collection('users').doc(context.auth.uid);
  
    return users.get().then(doc => {
      userData = doc.data()
      return users.update({
        // email: data.email ?? userData.email,
        name: data.name ?? userData.name,
      })
    })
  });
  
  //Get User Info
  exports.getUserInfo = functions.https.onCall((data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
    const users = admin.firestore().collection('users').doc(context.auth.uid);
    
    return users.get().then(obj =>{
      data = obj.data()
      return {
          name: data.name,
          user_id: data.user_id,
          email: data.email,
      }
    }
    )
  });
  
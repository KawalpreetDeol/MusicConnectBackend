const functions = require('firebase-functions');
const admin = require('firebase-admin');

// ***Music***
//Add Music
exports.addMusicByPost = functions.https.onCall(async (data, context) => {
  if(!context.auth) {
    throw new functions.https.HttpsError(
      'unathenticated',
      'User is not authenticated. Please sign in.'
    )
  }

  const timestamp = admin.firestore.Timestamp.fromDate(new Date())
  const document = data.type == 'comment' ?  
    admin.firestore().collection('posts').doc(data.post_id).collection('comments').doc(data.comment_id) :
    admin.firestore().collection('posts').doc(data.post_id)
  return document.get().then(async obj => {
    objData = obj.data()
    exists = await admin.firestore().collection('music').where('path', '==', data.path).get().then(results => {
      console.log('results.docs.length > 0: ', results.docs.length > 0)
        return results.docs.length > 0
    })
    console.log("before exists: ", exists)
    if(exists){
      console.log("in exists: ")
        throw new functions.https.HttpsError(
            'failed-precondition',
            'Music already added for this file location.'
        )
    }
    // console.log("after exists: ", objData.user_id == context.auth.uid)
    // if(objData.user_id == context.auth.uid) {
        return admin.firestore().collection('music').add({
            user_id: context.auth.uid,
            filename: data.filename,
            url: data.url,
            path: data.path,
            created_on: timestamp
        }).then(doc => {
          console.log(".then")
            return document.collection('music').add({
                music_id: doc.id
            }).then(temp => {
              admin.firestore().collection('users').doc(context.auth.uid).collection('music').add({
                music_id: doc.id
              }).then(intemp => {
                return true
              })
            })
        })
    // }
  }).catch(e => {
    return e
  })
});

exports.addMusicByUser = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
  
    const timestamp = admin.firestore.Timestamp.fromDate(new Date())
    exists = await admin.firestore().collection('music').where('path', '==', data.path).get().then(results => {
        return results.docs.length > 0
    })
    if(exists){
        throw new functions.https.HttpsError(
            'failed-precondition',
            'Music already added for this file location.'
        )
    }

    return admin.firestore().collection('music').add({
        user_id: context.auth.uid,
        filename: data.filename,
        url: data.url,
        path: data.path,
        created_on: timestamp
    }).then(doc => {
        return admin.firestore().collection('users').doc(context.auth.uid).collection('music').add({
            music_id: doc.id
        }).then(res => {return true}).catch(e => {return e})
    }).catch(e => {
        return e
    })
  });

// Get Music By User
exports.getMusicByUser = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }

    return admin.firestore().collection('users').doc(context.auth.uid).collection('music').get().then(async results => {
        music = []
        for (var i = 0; i < results.docs.length; i++) {
            res = results.docs[i].data()
            item = await admin.firestore().collection('music').doc(res.music_id).get().then(doc => {
                return doc.data()
            }).catch(e => {return false})
            if(!item){
              continue
            }
            item.music_id = res.music_id
            music.push(item)
        }
        return {'music': music}
    }).catch(e => {
        return e
    })
  });
// Get Music By Post
exports.getMusicByPost = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }

    return admin.firestore().collection('posts').doc(data.post_id).collection('music').get().then(async results => {

        music = []
        for (var i = 0; i < results.docs.length; i++) {
            res = results.docs[i].data()
            item = await admin.firestore().collection('music').doc(res.music_id).get().then(doc => {
                return doc.data()
            }).catch(e => {return false})
            if(!item){
              continue
            }
            item.music_id = res.music_id
            music.push(item)
        }
        return {'music': music}
    }).catch(e => {
        return e
    })
  });

// Get Music By Comment
exports.getMusicByComment = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }

    return admin.firestore().collection('posts').doc(data.post_id).collection('comments').doc(data.comment_id).collection('music').get().then(async results => {
      music = []
      for (var i = 0; i < results.docs.length; i++) {
          res = results.docs[i].data()
          item = await admin.firestore().collection('music').doc(res.music_id).get().then(doc => {
              return doc.data()
          })
          item.music_id = res.music_id
          music.push(item)
      }
      return {'music': music}
    }).catch(e => {
        return e
    })
  });


// Delete Music
// Delete Music By User
exports.deleteMusicByUser = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
    const music = admin.firestore().collection('users').doc(context.auth.id).collection('music')
    return music.where('music_id', 'in', data.music_ids).get().then(async results => {
        results.docs.forEach(doc => {
            music.doc(doc.id).delete()
        })
        return true
    }).catch(e => {
        return e
    })
  });

// Delete Music By Post
exports.deleteMusicByPost = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
    const post = admin.firestore().collection('posts').doc(data.post_id)
    const document = data.type == 'comment' ?
        post.collection('comments').doc(data.comment_id) :
        post

    return document.collection('music').where('music_id', 'in', data.music_ids).get().then(async results => {
        // if group, check admin
        // if user good
        return document.get().then(async doc => {
            docData = doc.data()
            if(!docData.user_id == context.auth.uid) {
                group_id = ""
                if (data.type == 'comment') {
                    postData = await post.get().then(postRes => {
                        return postRes.data()
                    })
                    if (postData.association != 'group') {
                        throw new functions.https.HttpsError(
                            'failed-precondition',
                            'Post does not belong to user.'
                        )
                    }
                    group_id = postData.group_id
                }
                else {
                    if(docData.association != 'group') {
                        throw new functions.https.HttpsError(
                            'failed-precondition',
                            'Post does not belong to user.'
                        )
                    }
                    group_id = docData.group_id
                }

                is_admin = await admin.firestore().collection('groups').doc(group_id).collection('members').where('user_id', "==", context.auth.uid).get().then(memberRes => {
                    memberResData = memberRes.data()
                    if(memberResData.role == admin){
                        return true
                    }
                    return false

                })
                if (!is_admin) {
                    throw new functions.https.HttpsError(
                        'failed-precondition',
                        'Post does not belong to user.'
                    )
                }
                results.docs.forEach(doc => {
                    document.doc(doc.id).delete()
                })
                return false
            }
        })
        
    }).catch(e => {
        return e
    })
  });
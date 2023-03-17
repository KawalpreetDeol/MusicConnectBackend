const functions = require('firebase-functions');
const admin = require('firebase-admin');

// ***Posts***
// Create Posts
exports.createPosts = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
  
    const timestamp = admin.firestore.Timestamp.fromDate(new Date())
    const user = admin.firestore().collection('users').doc(context.auth.uid);
    const post = admin.firestore().collection('posts').add({
      title: data.title,
      user_id: context.auth.uid,
      created_on: timestamp,
      content: data.content,
      upvotes: 0,
      downvotes: 0,
      association: data.association ?? "none",
      group_id: data.group_id ?? ""
    }).then(function(doc){
      user.collection('posts').add({
          post_id: doc.id
      })
          if(data.association == "group") {
              const group = admin.firestore().collection('groups').doc(data.group_id)
              group.collection('members').where('user_id', '==', context.auth.uid).get().then(res => {
                  if (res < 0) {
                      throw new functions.https.HttpsError(
                          'failed-precondition',
                          'User is not a part of this group.'
                      )
                  }
                  group.collection('posts').add({
                      post_id: doc.id
                  })
              })
          }
    }).catch(function(e) {
  
    })
      return post
  });
  
  // Edit Posts
  exports.editPosts = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
  
    const timestamp = admin.firestore.Timestamp.fromDate(new Date())
    const user = admin.firestore().collection('users').doc(context.auth.uid);
      return user.collection('posts').where('post_id', "==", data.post_id).get().then(res => {
          if(res.docs.length > 0){
              const post = admin.firestore().collection('posts').doc(data.post_id)
              post.get().then(obj => {
                  objData = obj.data()
                  post.update({
                      title: data.title ?? objData.title,
                      content: data.content ?? objData.content
                  })
              })
              return true
          }
          throw new functions.https.HttpsError(
              'failed-precondition',
              'This post does not exist.'
          )
      })
  });
  
  // Get Posts By Friends --fix after friends done
  exports.getPostsByFriends = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
      const users = admin.firestore().collection('friends')
      const friends = users.doc(context.auth.uid).collection('friends')
      return friends.get().then(results => {
          if (results.docs.length > 0) {
              friends_ids = []
              friends_info = {}
              results.forEach(res => {
                  friend_data = res.data()
                  friends_ids.push(res.id)
                  friends_info[res.id] = users.doc(res.id).get().then(user_info => {
                      return user_info.data()
                  })
                  
              })
              return admin.firestore().collection('posts').whereIn('user_id', friends_ids).where('association', "==", "none").get().then(posts_results => {
                  return {'friends': friends_info, 'posts': posts_results}
              })
          }
          return {
              'friends': [],
              'posts': []
          }
      })
  });
  
  // Get Posts By Group
  exports.getPostsByGroup = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
  
      const group = admin.firestore().collection('groups').doc(data.group_id)
      return group.collection('members').where('user_id', '==', context.auth.uid).get().then(res => {
          if (res < 0) {
              throw new functions.https.HttpsError(
                  'failed-precondition',
                  'User is not a part of this group.'
              )
          }
          return group.collection('posts').get().then(results => {
              if (results.docs.length > 0){
                  documents = []
                  results.docs.forEach(res => {
                      doc = res.data()
                      documents.push(doc.post_id)
                  })
                  return admin.firestore().collection('posts').where(admin.firestore.FieldPath.documentId(), 'in', documents).get().then(obj => {
                      return {'posts': obj.map(doc => doc.data())}
                  })
              }
              return {'posts': []}
          })
          
      })
  });
  
  // Get Posts By User
  exports.getPostsByUser = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
  
    const user = admin.firestore().collection('users').doc(context.auth.uid);
      return user.collection('posts').get().then(res => {
          if(res.docs.length > 0){
              post_ids = []
              res.docs.forEach(doc => {
                  doc_data = doc.data()
                  post_ids.push(doc_data.post_id)
              })
              return admin.firestore().collection('posts').where(admin.firestore.FieldPath.documentId(), 'in', post_ids).get().then(async obj => {
                  var posts = obj.docs.map(post => {
                    post_id = post.id
                    post = post.data()
                    post.post_id = post_id
                    return post
                  })
                  for(var i = 0; i < posts.length; i++) {
                    posts[i].comments = await admin.firestore().collection('posts').doc(posts[i].post_id).collection('comments').get().then(async comments => {
                      ret = []
                      for (var j = 0; j < comments.docs.length; j++){
                        comment = comments.docs[j].data()
                        comment.comment_id = comments.docs[j].id
                        comment.user_name = await admin.firestore().collection('users').doc(comment.user_id).get().then(doc => {
                          docData = doc.data()
                          return docData.name
                        })
                        ret.push(comment)
                      }
                      return ret
                    })
                  }
                  return {'posts': posts}
              })
          }
          return {'posts': []}
      })
  });

  exports.getPostById = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
  
    const user = admin.firestore().collection('users').doc(context.auth.uid);
      return user.collection('posts').where('post_id', '==', data.post_id).get().then(res => {
        if (res.docs.length == 1) {
          resData = res.docs[0].data()
          if (resData.post_id == data.post_id){
            return admin.firestore().collection('posts').doc(data.post_id).get().then(async post => {
                return admin.firestore().collection('posts').doc(data.post_id).collection('comments').get().then(async obj => {
                  if(obj.docs.length > 0) {
                    comments = []
                    for(var i = 0; i < obj.docs.length; i++) {
                      comment = obj.docs[i].data()
                      comment.user_name  = await admin.firestore().collection('users').doc(comment.user_id).get().then(doc => {
                        docData = doc.data()
                        return docData.name
                      })
                      comments.push(comment)
                    }
                    return {'post': post.data(), 'comments': comments}
                  }
                })
            })
          }
        }
        else if (res.docs.length > 1) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'Too many posts found. Contact support.'
        )
        }
        throw new functions.https.HttpsError(
          'failed-precondition',
          'This post does not exist for this user.'
      )
      })
  });
  
  // Write Comment
  exports.createComment = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
  
    const timestamp = admin.firestore.Timestamp.fromDate(new Date())
    const user = admin.firestore().collection('users').doc(context.auth.uid);
    const post = admin.firestore().collection('posts').doc(data.post_id);
    const comment = post.collection('comments').add({
        user_id: context.auth.uid,
        created_on: timestamp,
        content: data.content ?? "",
        upvotes: 0,
        downvotes: 0
    })
    return true
  });
  
  // Edit Comment
  // user
  exports.editComments = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
  
    const user = admin.firestore().collection('users').doc(context.auth.uid);
      return user.collection('posts').where('post_id', "==", data.post_id).get().then(res => {
          if(res.docs.length > 0){
              const post = admin.firestore().collection('posts').doc(data.post_id).collection('comments').doc(data.comment_id)
              return post.get().then(obj => {
                if (obj.docs.length > 0) {
                    objData = obj.data()
                    post.update({
                        content: data.content ?? objData.content
                    })
                    return true
                }
                throw new functions.https.HttpsError(
                    'failed-precondition',
                    'This comment does not exist.'
                )
              })
          }
          throw new functions.https.HttpsError(
              'failed-precondition',
              'This post does not exist.'
          )
      })
  });
  
  
  // Delete Post
  // group admin or use themselves
  exports.deletePostsByUser = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
  
    const user = admin.firestore().collection('users').doc(context.auth.uid);
    return user.collection('posts').where('post_id', "==", data.post_id).get().then(res => {
        if(res.docs.length == 1){
            return admin.firestore().collection('posts').doc(data.post_id).get().then(postObj => {
              post = postObj.data()
              if (post.association == 'group'){
                return admin.firestore().collection('groups').doc(post.group_id).collection('posts').where('post_id', '==', data.post_id).get().then(doc => {
                  if(doc.docs.length == 1) {
                    admin.firestore().collection('groups').doc(post.group_id).collection('posts').doc(doc.docs[0].id).delete()
                    user.collection('posts').doc(res.docs[0].id).delete()
                    return true
                  }
                  return false
                })
              }
              user.collection('posts').doc(res.docs[0].id).delete()
              return true
            })
            
        }
        if (res.docs.length > 1) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'Post Id returned multiple results. Contact Support.'
        )
        }

        throw new functions.https.HttpsError(
            'failed-precondition',
            'This post does not belong to this user.'
        )
    })
  });

  exports.deletePostsByGroupAdmin = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
  
    const user = admin.firestore().collection('users').doc(context.auth.uid);
    return user.collection('posts').where('post_id', "==", data.post_id).get().then(async res => {
        if(res.docs.length > 0){
            var groupDeletion = false
            if(doc.association == "groups") {
                doc = res.data()
                groupDeletion = await admin.firestore().collection('groups').doc(doc.group_id).collection('members').where('user_id', "==", context.auth.uid).get().then(async groupRes => {
                    if(groupRes.docs.length > 0) {
                        groupDoc = groupRes.data()
                        if(groupDoc.role == "admin") {
                            return !!admin.firestore().collection('groups').doc(doc.group_id).collection('posts').where('post_id', "==", data.post_id).delete()
                        }   
                    }
                    return false
                })
            }
            if (groupDeletion){
                const user_id = await admin.firestore().collection('posts').doc(data.post_id).get().then(obj => {
                    objData = obj.data()
                    return objData.user_id
                })
                return admin.firestore().collection('users').doc(user_id).collection('posts').where('post_id', "==", data.post_id).delete()
            }
            return false
        }

        throw new functions.https.HttpsError(
            'failed-precondition',
            'This post does not belong to this user.'
        )
    })
  });
  
  // Delete Comment
  // group admin or user themselves
  exports.deleteCommentByUser = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
  
    const post = admin.firestore().collection('posts').doc(data.post_id);
    return post.get().then(res => {
        if(res.docs.length > 0){
            return post.collection('comments').doc(data.comment_id).get().then(commentRes => {
                if(commentRes.docs.length > 0) {
                    doc = commentRes.data()
                    if(context.auth.uid == doc.user_id) {
                        return post.collection('comments').doc(data.comment_id).delete()
                    }
                    return false
                }
                return false
            })
        }
        return false
    })
  });
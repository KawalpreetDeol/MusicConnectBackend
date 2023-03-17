const functions = require('firebase-functions');
const admin = require('firebase-admin');

// ***Groups***
// Get Groups + Roles By User
// Create Group
exports.createGroup = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
  
    const timestamp = admin.firestore.Timestamp.fromDate(new Date())
    const user = admin.firestore().collection('users').doc(context.auth.uid);
    const group = admin.firestore().collection('groups').add({
      name: data.name,
    created_on: timestamp,
    password: data.password ?? ""
    }).then(doc => {
      doc.collection('members').add({
          user_id: context.auth.uid,
          role: "admin"
      })
      user.collection('groups').add({
            group_id: doc.id,
            role: "admin"
        })
    }).catch(function(e) {
  
    })
      return group
  });
  
  // Add Members to Group
  exports.addGroupMembers = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
  
    const user = admin.firestore().collection('users').doc(context.auth.uid);
      const group = admin.firestore().collection('groups').doc(data.group_id)
      return group.get().then(obj => {
          groupData = obj.data()
          group_admin = groupData.collection('members').doc(context.auth.uid)
          // is admin check
          return group_admin.get().then(subObj => {
              subData = subObj.data()
              if(subData.role != "admin"){
                  throw new functions.https.HttpsError(
                      'failed-precondition',
                      'User is not an admininstrator of this group.'
                  )
              }
              
              data.members.forEach(member => {
                  user.collection('friends').doc(member.user_id).then(friend => {
                      if(friend.exists){
                          obj.collection('members').where('user_id', '==', member.user_id).get().then(res => {
                              if (res <= 0) {
                                  obj.collection('members').add({
                                      user_id: member.user_id,
                                      role: member.role ?? "member"
                                  }).then(() => {
                                      admin.firestore().collection('users').doc(member.user_id).collection('groups').add({
                                          group_id: doc.id
                                      })
                                  })
                              }
                          })
                      }
                  })
              });
          })
      })
  });
  
  // Remove Members
  exports.removeGroupMembers = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
  
      const group = admin.firestore().collection('groups').doc(data.group_id)
      return group.get().then(obj => {
          groupData = obj.data()
          group_admin = groupData.collection('members').doc(context.auth.uid)
          // is admin check
          return group_admin.get().then(subObj => {
              subData = subObj.data()
              if(subData.role != "admin"){
                  throw new functions.https.HttpsError(
                      'failed-precondition',
                      'User is not an admininstrator of this group.'
                  )
              }
              data.members.forEach(member => {
                  obj.collection('members').doc(member.user_id).delete().then(() => {
                      admin.firestore().collection('users').doc(member.user_id).collection('groups').where('group_id', '==', data.group_id).delete()
                  })
              });
          })
      })
  });
  
  // Join Group with Tag/Password
  exports.joinGroup = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
  
    const user = admin.firestore().collection('users').doc(context.auth.uid);
      const group = admin.firestore().collection('groups').doc(data.group_id)
      return group.get().then(obj => {
          groupData = obj.data()
          if(data.password == groupData.password || groupData.password == ""){
              return group.collection('members').where('user_id', '==', context.auth.uid).get().then(res => {
                  if (res.docs.length == 0) {
                      return group.collection('members').add({
                          user_id: context.auth.uid,
                          role: "member"
                      }).then(() => {
                          user.collection('groups').add({
                              group_id: data.group_id,
                              role: "member"
                          })
                      })
                  }
                  else {
                      throw new functions.https.HttpsError(
                          'failed-precondition',
                          'Member already exists.'
                      )
                  }
              })
          }
          else {
              throw new functions.https.HttpsError(
                  'failed-precondition',
                  'Incorrect group tag or password provided.'
              )
          }
      })
  });
  
  // Edit Group
  // Set Roles Member Roles
  exports.editGroup = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
  
      const group = admin.firestore().collection('groups').doc(data.group_id)
      return group.get().then(obj => {
          groupData = obj.data()
          group_admin = obj.collection('members').doc(context.auth.uid)
          // is admin check
          return group_admin.get().then(subObj => {
              subData = subObj.data()
              if(subData.role != "admin"){
                  throw new functions.https.HttpsError(
                      'failed-precondition',
                      'User is not an admininstrator of this group.'
                  )
              }
              group.update({
                  name: data.name ?? groupData.name,
                  password: data.password ?? groupData.password
              })
              data.members.forEach(member => {
                  obj.collection('members').update({
                      role: member.role
                  })
              });
          })
      })
  });
  
  // Delete Group
  exports.deleteGroup = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
  
      const group = admin.firestore().collection('groups').doc(data.group_id)
      return group.get().then(obj => {
          groupData = obj.data()
          return group.collection('members').where('user_id', '==', context.auth.uid).get().then(async res => {
            if(res.docs.length == 1) {
                subData = res.docs[0].data()
                
                if(subData.role != "admin"){
                    throw new functions.https.HttpsError(
                        'failed-precondition',
                        'User is not an admininstrator of this group.'
                    )
                }
                
                await group.collection('members').get().then(async members => {
                    for(var i = 0; i < members.docs.length; i++){
                        doc = members.docs[i].data()
                        await admin.firestore().collection('users').doc(doc.user_id).collection('groups').where('group_id', '==', data.group_id).get().then(async group_ref => {
                            if(group_ref.docs.length == 1){
                                await admin.firestore().collection('users').doc(doc.user_id).collection('groups').doc(group_ref.docs[0].id).delete()
                            }
                        })
                    }

                })
    
                group.delete()
                return true
            }
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Member not in group.'
            )
              
          })
      }).catch(e => {
        return e
      })
  });
  
  // Get Group
  exports.getGroup = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
  
      const group = admin.firestore().collection('groups').doc(data.group_id)
      return group.get().then(async obj => {
          groupData = obj.data()
          delete groupData.password
          return group.collection('members').get().then(async members => {
                if(members.docs.length > 0) {
                    membersData = members.docs.map(doc => doc.data())
                    for (var i = 0; i < membersData.length; i++){
                        membersData[i].name = await admin.firestore().collection('users').doc(membersData[i].user_id).get().then(user =>
                            {userInfo = user.data()
                            return userInfo.name;}
                        )
                    }
                }
                else {
                    membersData = []
                }
                
                postsData = await group.collection('posts').get().then(async posts => {
                    if(posts.docs.length > 0){
                        gabes_posts = posts.docs.map(doc => doc.data())
                        for(var i = 0; i < gabes_posts.length; i++) {
                            gabes_posts[i].data = await admin.firestore().collection('posts').doc(gabes_posts[i].post_id).get().then(postObj => {
                                postObjData = postObj.data()
                                postObjData.post_id = gabes_posts[i].post_id
                                return postObjData
                            })
                        }
                        return gabes_posts
                    }
                    else {
                        return []
                    }
                    
                })
                return {
                    'group_info': groupData,
                    'members': membersData,
                    'posts': postsData
                }
          })
          
      })
  });

  exports.getGroups = functions.https.onCall(async (data, context) => {
    if(!context.auth) {
      throw new functions.https.HttpsError(
        'unathenticated',
        'User is not authenticated. Please sign in.'
      )
    }
    const user = admin.firestore().collection('users').doc(context.auth.uid)
    return user.collection('groups').get().then(async results => {
        if(results.docs.length > 0) {
            var groups = []
            for(var i = 0; i < results.docs.length; i++){
                var group = results.docs[i].data()
                group.info = await admin.firestore().collection('groups').doc(group.group_id).get().then(obj => {
                    return obj.data()
                })
                delete group.info.password
                group.members = await admin.firestore().collection('groups').doc(group.group_id).collection('members').get().then(obj => {
                    return obj.docs.map(doc => doc.data())
                })
                groups.push(group)
            }
            return {'groups': groups}
        }
        return {'groups': []}
    })
  });

  
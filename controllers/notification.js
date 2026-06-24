const Script = require('../models/Script.js');
const User = require('../models/User');
const Notification = require('../models/Notification.js');
const helpers = require('./helpers');
const _ = require('lodash');
const { getConditionForSession, getCurrentSession } = require('../lib/conditionOrder');

/**
 * GET /notifications, /getBell
 * Fetch all relevant notifications. 
 * If query parameter 'bell' is true, return the number of new/ unseen notifications.
 * If it is false, render the notifications page.
 */
exports.getNotifications = async(req, res) => {
    try {
        if (req.user) {
            const user = await User.findById(req.user.id)
                .populate('posts.comments.actor')
                .populate({
                    path: 'feedAction.post',
                    populate: {
                        path: 'actor'
                    }
                }).exec();
            const currDate = Date.now();
            const lastNotifyVisit = user.lastNotifyVisit; //Absolute Date
            const currentCondition = String(getConditionForSession(user, getCurrentSession(user)) || "");
            const notification_feed = await Notification.find({
                    $or: [
                        { userPostID: { $exists: true } },
                        { userReplyID: { $exists: true } }
                    ],
                    condition: { "$in": ["", currentCondition] }
                })
                .populate('actor')
                .sort('-time')
                .exec();

            let final_notify = [];
            for (const notification of notification_feed) {
                //Notification is about a userPost (read, like, comment)
                if (notification.userPostID >= 0) {
                    const userPostID = notification.userPostID;
                    const userPost = notification.condition ?
                        user.posts.find(x => String(x.condition) == String(notification.condition)) :
                        user.posts.find(x => x.postID == userPostID);
                    const postID = userPost ? userPost.postID : userPostID;

                    if (userPost == undefined) {
                        console.log("Should never be here.");
                        continue;
                    }

                    const time_diff = currDate - userPost.absTime; //Time difference between now and the time post was created.

                    //check if we show this notification yet
                    if (notification.time <= time_diff) {
                        if (notification.notificationType == "reply") {
                            const replyAbsTime = userPost.absTime.getTime() + notification.time;
                            const matchingReply = (userPost.comments || []).find(comment => {
                                const actorId = comment.actor && (comment.actor._id || comment.actor);
                                return String(actorId) === String(notification.actor._id) &&
                                    comment.body === notification.replyBody &&
                                    new Date(comment.absTime).getTime() === replyAbsTime;
                            });
                            const replyKey = "actorReply_" + currentCondition + "_" + postID + "_" + notification._id;
                            const reply_tmp = {
                                key: replyKey,
                                action: 'reply',
                                postID,
                                commentID: matchingReply && matchingReply.commentID,
                                body: userPost.body,
                                picture: userPost.picture,
                                replyBody: notification.replyBody,
                                time: replyAbsTime,
                                actor: notification.actor,
                                unreadNotification: replyAbsTime > lastNotifyVisit,
                            };
                            final_notify.push(reply_tmp);
                        } //end of REPLY 
                        else {
                            const key = notification.notificationType + "_" + currentCondition + "_" + postID; //like_condition_post
                            //Check if a notification for this post exists already
                            let notifyIndex = _.findIndex(final_notify, function(o) { return o.key == key });
                            if (notifyIndex == -1) {
                                let tmp = {
                                    key: key,
                                    action: notification.notificationType,
                                    postID,
                                    body: userPost.body,
                                    picture: userPost.picture,
                                    time: userPost.absTime.getTime() + notification.time,
                                    actors: [notification.actor],
                                    unreadNotification: userPost.absTime.getTime() + notification.time > lastNotifyVisit
                                }
                                if (notification.notificationType == 'like') {
                                    tmp.numLikes = 1
                                }
                                notifyIndex = final_notify.push(tmp) - 1;
                            } else {
                                //Update notification like count.
                                if (notification.notificationType == 'like') {
                                    final_notify[notifyIndex].numLikes += 1;
                                }
                                //Update notification actor profile
                                //if generic-joe, append. else, shift to the front of the line.
                                if (notification.notificationType == "read" && notification.actor.username == "generic-joe") {
                                    final_notify[notifyIndex].actors.push(notification.actor);
                                } else {
                                    final_notify[notifyIndex].actors.unshift(notification.actor);
                                }
                                //Update notification time and read/unread classification
                                if ((userPost.absTime.getTime() + notification.time) > final_notify[notifyIndex].time) {
                                    final_notify[notifyIndex].time = userPost.absTime.getTime() + notification.time;
                                }
                                if ((userPost.absTime.getTime() + notification.time) > lastNotifyVisit) {
                                    final_notify[notifyIndex].unreadNotification = true;
                                }
                            }
                            //Update the number of likes on user post
                            if (notification.notificationType == 'like') {
                                const postIndex = notification.condition ?
                                    _.findIndex(user.posts, function(o) { return String(o.condition) == String(notification.condition); }) :
                                    _.findIndex(user.posts, function(o) { return o.postID == userPostID; });
                                if (postIndex !== -1) {
                                    user.posts[postIndex].likes = final_notify[notifyIndex].numLikes;
                                }
                            }
                        } //end of LIKE or READ
                    } //end of userPost (read, like, comment)
                } //Notification is about a userReply (read, like)
                else if (notification.userReplyID >= 0) {
                    const userReplyID = notification.userReplyID;
                    const userReply_userPost = user.posts.find(post => post.comments.find(comment => comment.commentID == userReplyID && comment.new_comment == true) !== undefined);
                    const userReply_actorPost_feedAction = user.feedAction.find(feedAction => feedAction.comments.find(comment => comment.new_comment_id == userReplyID && comment.new_comment == true) !== undefined);
                    let userReply_actorPost;
                    if (userReply_actorPost_feedAction) {
                        userReply_actorPost = userReply_actorPost_feedAction.post;
                    }
                    const userReply_originalPost = userReply_userPost || userReply_actorPost;

                    const postType = userReply_originalPost.relativeTime ? "user" : "actor";
                    const userPostID = (postType == "user") ? userReply_originalPost.postID : userReply_originalPost._id;
                    const userReply_comment = (postType == "user") ?
                        userReply_originalPost.comments.find(comment => comment.commentID == userReplyID && comment.new_comment == true) :
                        userReply_actorPost_feedAction.comments.find(comment => comment.new_comment_id == userReplyID && comment.new_comment == true);

                    const time = userReply_comment.absTime.getTime();
                    const time_diff = currDate - time; //Time difference between now and the time comment was created.
                    //check if we show this notification yet
                    if (notification.time <= time_diff) {
                        const key = "reply_" + notification.notificationType + "_" + userReplyID; //reply_like_X, reply_read_X
                        //Check if a notification for this comment exists already
                        let notifyIndex = _.findIndex(final_notify, function(o) { return o.key == key });
                        if (notifyIndex == -1) {
                            let tmp = {
                                key: key,
                                action: "reply_" + notification.notificationType,
                                postID: userPostID,
                                replyID: userReplyID,
                                body: userReply_comment.body,
                                picture: userReply_originalPost.picture,
                                time: time + notification.time,
                                actors: [notification.actor],
                                originalActor: postType == "user" ? { profile: user.profile } : userReply_originalPost.actor,
                                unreadNotification: time + notification.time > lastNotifyVisit
                            }
                            if (notification.notificationType == 'like') {
                                tmp.numLikes = 1;
                            }
                            notifyIndex = final_notify.push(tmp) - 1;
                        } else {
                            //Update notification like count.
                            if (notification.notificationType == 'like') {
                                final_notify[notifyIndex].numLikes += 1;
                            }
                            //Update notification actor profile
                            //if generic-joe, append. else, shift to the front of the line.
                            if (notification.notificationType == "read" && notification.actor.username == "generic-joe") {
                                final_notify[notifyIndex].actors.push(notification.actor);
                            } else {
                                final_notify[notifyIndex].actors.unshift(notification.actor);
                            }
                            //Update notification time and read/unread classification
                            if (time + notification.time > final_notify[notifyIndex].time) {
                                final_notify[notifyIndex].time = time + notification.time;
                            }
                            if (time + notification.time > lastNotifyVisit) {
                                final_notify[notifyIndex].unreadNotification = true;
                            }
                        }
                        if (notification.notificationType == 'like') {
                            if (postType == "user") {
                                const postIndex = _.findIndex(user.posts, function(o) { return o.postID == userPostID; });
                                const commentIndex = _.findIndex(user.posts[postIndex].comments, function(o) { return o.commentID == userReplyID && o.new_comment == true });
                                user.posts[postIndex].comments[commentIndex].likes = final_notify[notifyIndex].numLikes;
                            } else {
                                const postIndex = _.findIndex(user.feedAction, function(o) { return o.post.equals(userPostID); });
                                const commentIndex = _.findIndex(user.feedAction[postIndex].comments, function(o) { return o.new_comment_id == userReplyID && o.new_comment == true });
                                user.feedAction[postIndex].comments[commentIndex].likes = final_notify[notifyIndex].numLikes;
                            }
                        }
                    }
                }
            }
            //Log our visit to Notifications
            if (!req.query.bell) {
                user.lastNotifyVisit = currDate;
            }
            await user.save();

            final_notify.sort(function(a, b) {
                return b.time - a.time;
            });

            const userPosts = (user.getPosts().slice(0) || [])
                .filter(post => String(post.condition || "") === currentCondition);

            const repliesOnActorPosts = user.feedAction
                .filter(post => (post.comments.filter(comment => comment.new_comment == true).length) > 0)
                .map(post => post.post); // IDs of actor posts user has commented on.       
            const posts = await Script.find({
                    _id: { "$in": repliesOnActorPosts }
                })
                .populate('actor')
                .populate('comments.actor')
                .exec();
            const finalfeed = helpers.getFeed(userPosts, posts, user, 'NOTIFICATION');

            const unreadNotifications = final_notify.filter(notification => notification.unreadNotification == true);
            const newNotificationCount = unreadNotifications.length;
            const latestUnreadNotificationTime = unreadNotifications.reduce(function(latest, notification) {
                return Math.max(latest, notification.time || 0);
            }, 0);
            const getPostActivityStats = (postID) => {
                const postNotifications = final_notify.filter(notification => String(notification.postID) === String(postID));
                const likeCount = postNotifications
                    .filter(notification => notification.action === 'like')
                    .reduce((total, notification) => total + (notification.numLikes || 0), 0);
                const commentCount = postNotifications
                    .filter(notification => notification.action === 'reply')
                    .length;

                return {
                    likeCount,
                    commentCount,
                    activityCount: likeCount + commentCount
                };
            };
            const formatActivitySummary = (stats) => {
                const likeLabel = stats.likeCount === 1 ? 'like' : 'likes';
                const commentLabel = stats.commentCount === 1 ? 'comment' : 'comments';
                return `Your post now has ${stats.likeCount} ${likeLabel} and ${stats.commentCount} ${commentLabel}.`;
            };
            const totalLikeCount = final_notify
                .filter(notification => notification.action === 'like')
                .reduce((total, notification) => total + (notification.numLikes || 0), 0);
            const totalCommentCount = final_notify
                .filter(notification => notification.action === 'reply')
                .length;
            const totalActivityCount = totalLikeCount + totalCommentCount;
            const popupNotifications = final_notify
                .filter(notification => notification.action === 'like' || notification.action === 'reply')
                .map(notification => {
                    const stats = getPostActivityStats(notification.postID);
                    if (notification.action === 'like') {
                        const actors = notification.actors || [];
                        const firstActor = actors[0];
                        const actorName = firstActor && firstActor.profile ? firstActor.profile.name : 'Someone';
                        const otherCount = Math.max((notification.numLikes || actors.length || 1) - 1, 0);
                        const popupKey = `${notification.key}_${notification.time}_${notification.numLikes || actors.length || 1}`;
                        return {
                            key: popupKey,
                            action: notification.action,
                            postID: notification.postID,
                            time: notification.time,
                            activity: {
                                type: 'like',
                                postID: notification.postID,
                                count: notification.numLikes || actors.length || 1,
                                stats,
                                key: popupKey
                            },
                            summary: formatActivitySummary(stats),
                            message: otherCount > 0 ?
                                `${actorName} & ${otherCount} others liked your post!` :
                                `${actorName} liked your post!`
                        };
                    }

                    const actorName = notification.actor && notification.actor.profile ? notification.actor.profile.name : 'Someone';
                    return {
                        key: notification.key,
                        action: notification.action,
                        postID: notification.postID,
                        time: notification.time,
                        activity: {
                            type: 'comment',
                            postID: notification.postID,
                            commentID: notification.commentID || notification.key,
                            body: notification.replyBody,
                            at: notification.time,
                            stats,
                            key: notification.key,
                            actor: {
                                username: notification.actor && notification.actor.username,
                                name: notification.actor && notification.actor.profile && notification.actor.profile.name,
                                picture: notification.actor && notification.actor.profile && notification.actor.profile.picture
                            }
                        },
                        summary: formatActivitySummary(stats),
                        message: `${actorName} commented on your post!`
                    };
                });
            if (req.query.bell) {
                return res.send({
                    count: totalActivityCount,
                    likeCount: totalLikeCount,
                    commentCount: totalCommentCount,
                    activityCount: totalActivityCount,
                    unreadCount: newNotificationCount,
                    latestNotificationTime: latestUnreadNotificationTime,
                    popupNotifications
                });
            } else {
                return res.render('notification', {
                    notification_feed: final_notify,
                    script: finalfeed,
                    count: totalActivityCount
                })
            }
        };
    } catch (err) {
        console.log(err);
        next(err);
    }
}

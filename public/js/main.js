//Before Page load:
$('#content').hide();
$('#loading').show();
let isActive = false;
let activeStartTime;
const notificationPollMs = 15000;
let latestNotificationCount = 0;
const currentUserId = $('meta[name="current-user-id"]').attr('content') || 'anonymous';
const shownNotificationStorageKey = `shownNotificationKeys:${currentUserId}`;
let notificationPopupQueue = [];
let notificationPopupVisible = false;

function resetActiveTimer(loggingOut) {
    if (isActive) {
        const currentTime = new Date();
        const activeDuration = currentTime - activeStartTime;
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup' && window.location.pathname !== '/forgot') {
            $.post("/pageTimes", {
                time: activeDuration,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            }).then(function() {
                if (loggingOut) {
                    window.loggingOut = true;
                    window.location.href = '/logout';
                }
            })
        }
        isActive = false;
    }
}

function getShownNotificationKeys() {
    try {
        return JSON.parse(localStorage.getItem(shownNotificationStorageKey) || '{}');
    } catch (err) {
        return {};
    }
}

function markNotificationShown(key) {
    if (!key) return;
    const shown = getShownNotificationKeys();
    shown[key] = true;
    localStorage.setItem(shownNotificationStorageKey, JSON.stringify(shown));
}

function hasActiveNotificationPopup() {
    return notificationPopupVisible || notificationPopupQueue.length > 0;
}

function logPageEvent(path) {
    $.post("/pageLog", {
        path,
        _csrf: $('meta[name="csrf-token"]').attr('content')
    });
}

function closeNotificationPopup(key) {
    const popup = $(`.feed-notification-modal-overlay[data-notification-key='${key}']`);
    popup.fadeOut(150, function() {
        $(this).remove();
        notificationPopupVisible = false;
        showNextNotificationPopup();
        updateNotificationBell(latestNotificationCount);
    });
}

function setNotificationBellIcon(link) {
    const badge = link.find('.notification-count-badge').detach();
    link.find('i.big.alarm.icon, i.big.icons').remove();
    link.prepend('<i class="big alarm icon"></i>');

    if (badge.length) {
        link.append(badge);
    }
}

function updateNotificationBell(count) {
    latestNotificationCount = count;
    const notificationLinks = $("a.item[href='/notifications']");

    notificationLinks.each(function() {
        const link = $(this);
        let badge = link.find('.notification-count-badge');

        link.css('position', 'relative');
        setNotificationBellIcon(link);
        badge = link.find('.notification-count-badge');

        if (!badge.length) {
            badge = $('<span class="notification-count-badge"></span>');
            badge.css({
                position: 'absolute',
                top: '4px',
                right: '4px',
                minWidth: '18px',
                height: '18px',
                padding: '0 5px',
                borderRadius: '9px',
                background: '#db2828',
                color: '#fff',
                fontSize: '11px',
                lineHeight: '18px',
                textAlign: 'center',
                fontWeight: '700'
            });
            link.append(badge);
        }

        if (count > 0) {
            badge.text(count > 99 ? '99+' : count).show();
        } else {
            badge.hide();
        }
    });
}

function goToUserPost(postID, key) {
    closeNotificationPopup(key);
    const target = $(`#user-post-${postID}`);

    if (target.length) {
        $('html, body').animate({ scrollTop: target.offset().top - 90 }, 250);
    } else {
        window.location.href = `/#user-post-${postID}`;
    }
}

function queueNotificationPopup(notification) {
    const shown = getShownNotificationKeys();
    if (!notification || !notification.key || shown[notification.key]) return;
    if (notificationPopupQueue.some(item => item.key === notification.key)) return;
    if ($(`.feed-notification-modal-overlay[data-notification-key='${notification.key}']`).length) return;

    markNotificationShown(notification.key);
    notificationPopupQueue.push(notification);
    showNextNotificationPopup();
    updateNotificationBell(latestNotificationCount);
}

function showNextNotificationPopup() {
    if (notificationPopupVisible || notificationPopupQueue.length === 0) return;

    const notification = notificationPopupQueue.shift();
    notificationPopupVisible = true;

    const popup = $(`
        <div class="feed-notification-modal-overlay" style="display: none;">
            <div class="feed-notification-modal-card">
                <div class="feed-notification-modal-title"></div>
                <div class="feed-notification-modal-summary"></div>
                <div class="feed-notification-modal-actions">
                    <button type="button" class="ui primary button go-to-post">Go to Post</button>
                    <button type="button" class="ui button dismiss-notification">Dismiss</button>
                </div>
            </div>
        </div>
    `);

    popup.attr('data-notification-key', notification.key);
    popup.css({
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 3000,
        background: 'rgba(0, 0, 0, .55)',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
    });
    popup.find('.feed-notification-modal-card').css({
        width: 'min(520px, 100%)',
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 18px 44px rgba(0,0,0,.28)',
        padding: '32px',
        textAlign: 'center'
    });
    popup.find('.feed-notification-modal-title').css({
        fontSize: '28px',
        lineHeight: '1.25',
        fontWeight: '700',
        marginBottom: '14px'
    });
    popup.find('.feed-notification-modal-summary').css({
        fontSize: '18px',
        lineHeight: '1.45',
        color: '#555',
        marginBottom: '24px'
    });
    popup.find('.feed-notification-modal-actions').css({
        display: 'flex',
        gap: '12px',
        justifyContent: 'center',
        flexWrap: 'wrap'
    });

    popup.find('.feed-notification-modal-title').text(notification.message);
    popup.find('.feed-notification-modal-summary').text(notification.summary || '');
    popup.find('.go-to-post').on('click', function() {
        logPageEvent(`/notification-popup/go-to-post/${notification.postID}`);
        goToUserPost(notification.postID, notification.key);
    });
    popup.find('.dismiss-notification').on('click', function() {
        logPageEvent(`/notification-popup/dismiss/${notification.postID}`);
        closeNotificationPopup(notification.key);
    });

    $('body').append(popup);
    popup.css('display', 'flex').hide().fadeIn(150, function() {
        applyNotificationActivity(notification);
    });
}

function applyNotificationActivity(notification) {
    if (!notification || !notification.activity || !notification.key) return;

    window.appliedPopupNotificationActivity = window.appliedPopupNotificationActivity || {};
    if (window.appliedPopupNotificationActivity[notification.key]) return;
    window.appliedPopupNotificationActivity[notification.key] = true;

    if (typeof window.applyUserPostNotificationActivity === 'function') {
        window.applyUserPostNotificationActivity(notification.activity);
    }
}

$(window).on("load", function() {
    /**
     * Recording user's active time on website:
     */
    // From the first answer from https://stackoverflow.com/questions/667555/how-to-detect-idle-time-in-javascript
    let idleTime = 0;
    // Definition of an active user: mouse movement, clicks etc.
    // idleTime is reset to 0 whenever mouse movement occurs.
    $('#pagegrid').on('mousemove keypress scroll mousewheel', function() {
        //If there hasn't been a "start time" for activity, set it. We use session storage so we can track activity when pages changes too.
        if (!isActive) {
            activeStartTime = Date.now();
            isActive = true;
        }
        idleTime = 0;
    });

    // Every 15 seconds, increase idleTime by 1. If idleTime is greater than 4 (i.e. there has been inactivity for about 60-74 seconds, log the duration of activity and reset the active timer)
    setInterval(function() {
        idleTime += 1;
        if (idleTime > 4) { // 60.001-74.999 seconds (idle time)
            resetActiveTimer(false);
        }
    }, 15000);

    // When a user logs out of the website, log the duration of activity and reset the active timer).
    $('a.item.logoutLink').on('click', function() {
        resetActiveTimer(true);
    });

    /**
     * Other site functionalities:
     */
    // Close loading dimmer on content load.
    $('#loading').hide();
    $('#content').fadeIn('slow');

    // Fomantic UI: Enable closing messages
    $('.message .close').on('click', function() {
        $(this).closest('.message').transition('fade');
    });
    // Fomantic UI: Enable checkboxes
    $('.checkbox').checkbox();

    // Check if user has any notifications.
    if (window.location.pathname !== '/login' && window.location.pathname !== '/signup' && window.location.pathname !== '/forgot') {
        logPageEvent(window.hiloPageLogPath || window.location.pathname);
        const pollNotifications = function() {
            $.getJSON("/notifications", { bell: true }, function(json) {
                const shown = getShownNotificationKeys();
                const popupNotifications = json.popupNotifications || [];
                const newPopupNotifications = popupNotifications.filter(notification => !shown[notification.key]);
                const bellActivityCount = Number(json.activityCount !== undefined ? json.activityCount : json.count) || 0;

                updateNotificationBell(bellActivityCount);
                if (window.location.pathname !== '/notifications') {
                    newPopupNotifications.forEach(queueNotificationPopup);
                }
            });
        };
        pollNotifications();
        setInterval(pollNotifications, notificationPollMs);
    };

    // Picture Preview on Image Selection (Used for: uploading new post, updating profile)
    function readURL(input) {
        if (input.files && input.files[0]) {
            let reader = new FileReader();
            reader.onload = function(e) {
                $('#imgInp').attr('src', e.target.result);
            }
            reader.readAsDataURL(input.files[0]);
        }
    }

    $("#picinput").change(function() {
        readURL(this);
    });

    // Lazy loading of images on site
    $(`#content .fluid.card .img img, #content img.ui.avatar.image, #content a.avatar img, .ui.card .image img`).visibility({
        type: 'image'
    });
});

$(window).on("beforeunload", function() {
    // https: //developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
    if (!window.loggingOut) {
        resetActiveTimer(false);
    }
});

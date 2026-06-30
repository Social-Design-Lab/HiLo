//Before Page load:
$('#content').hide();
$('#loading').show();
let isActive = false;
let activeStartTime;
let latestNotificationCount = 0;
const currentUserId = $('meta[name="current-user-id"]').attr('content') || 'anonymous';
const shownNotificationStorageKeyBase = `shownNotificationKeys:${currentUserId}`;
const conditionWindowMs = 180000;
let activeNotificationPopupKey = null;
let scheduledNotificationTimers = {};
let conditionTimerID = null;
let conditionRedirectCheck = null;

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

function getShownNotificationStorageKey() {
    return `${shownNotificationStorageKeyBase}:${window.hiloConditionStartMs || 'no-session'}`;
}

function getShownNotificationKeys() {
    try {
        return JSON.parse(localStorage.getItem(getShownNotificationStorageKey()) || '{}');
    } catch (err) {
        return {};
    }
}

function markNotificationShown(key) {
    if (!key) return;
    const shown = getShownNotificationKeys();
    shown[key] = true;
    localStorage.setItem(getShownNotificationStorageKey(), JSON.stringify(shown));
}

function getConditionState(clientStart, windowMs) {
    if (!clientStart) return 'pre';
    const elapsed = Date.now() - Number(clientStart);

    if (elapsed < 0) return 'pre';
    if (elapsed >= windowMs) return 'post';
    return 'active';
}

function startGlobalConditionTimer(conditionStartMs) {
    window.hiloConditionStartMs = Number(conditionStartMs);
    if (!Number.isFinite(window.hiloConditionStartMs) || window.hiloConditionStartMs <= 0) return;

    if (conditionTimerID) clearTimeout(conditionTimerID);

    conditionRedirectCheck = function() {
        if (getConditionState(window.hiloConditionStartMs, conditionWindowMs) === 'post') {
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            } else {
                window.location.reload();
            }
            return;
        }

        const remaining = Math.max(250, window.hiloConditionStartMs + conditionWindowMs - Date.now());
        conditionTimerID = window.setTimeout(conditionRedirectCheck, Math.min(remaining, 3000));
    };

    conditionRedirectCheck();
}

window.handleSessionStart = startGlobalConditionTimer;

function logPageEvent(path) {
    $.post("/pageLog", {
        path,
        _csrf: $('meta[name="csrf-token"]').attr('content')
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

function queueNotificationPopup(notification, force) {
    const shown = getShownNotificationKeys();
    if (!notification || !notification.key || (!force && shown[notification.key])) return;
    if (activeNotificationPopupKey === notification.key) return;

    if (!force) {
        markNotificationShown(notification.key);
    }
    showNotificationPopup(notification);
}

function getNotificationBellAnchor() {
    const links = $("a.item[href='/notifications']");
    const visibleLinks = links.filter(':visible');
    return visibleLinks.length ? visibleLinks.last() : links.last();
}

function positionNotificationPopover(popover) {
    if (!popover || !popover.length) return;

    const bell = getNotificationBellAnchor();
    const width = Math.min(window.innerWidth < 600 ? 240 : 280, window.innerWidth - 24);

    if (!bell.length) {
        popover.css({
            top: '58px',
            right: '12px',
            left: 'auto',
            width: `${width}px`
        });
        return;
    }

    const rect = bell[0].getBoundingClientRect();
    const bellCenter = rect.left + (rect.width / 2);
    const left = Math.min(
        Math.max(12, bellCenter - (width / 2)),
        Math.max(12, window.innerWidth - width - 12)
    );
    const top = rect.bottom + 6;

    popover.css({
        top: `${top}px`,
        left: `${left}px`,
        right: 'auto',
        width: `${width}px`
    });
}

function showNotificationPopup(notification) {
    activeNotificationPopupKey = notification.key;
    if (notification.activity && notification.activity.stats && !notification.countAlreadyIncluded) {
        const unreadIncrement = Number(notification.activity.unreadIncrement || 1);
        latestNotificationCount += Number.isFinite(unreadIncrement) ? unreadIncrement : 1;
        updateNotificationBell(latestNotificationCount);
    }

    $('.feed-notification-popover').remove();

    const popup = $(`
        <div class="feed-notification-popover" style="display: none;">
            <div class="feed-notification-popover-arrow"></div>
            <div class="feed-notification-popover-title"></div>
            <div class="feed-notification-popover-summary"></div>
        </div>
    `);

    popup.attr('data-notification-key', notification.key);
    popup.css({
        position: 'fixed',
        zIndex: 3000,
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 8px 20px rgba(0,0,0,.18)',
        border: '1px solid rgba(34,36,38,.18)',
        padding: '10px 12px',
        textAlign: 'left',
        pointerEvents: 'none',
        maxHeight: '96px',
        overflow: 'hidden'
    });
    popup.find('.feed-notification-popover-arrow').css({
        position: 'absolute',
        top: '-7px',
        left: '50%',
        width: '12px',
        height: '12px',
        background: '#fff',
        borderLeft: '1px solid rgba(34,36,38,.18)',
        borderTop: '1px solid rgba(34,36,38,.18)',
        transform: 'translateX(-50%) rotate(45deg)'
    });
    popup.find('.feed-notification-popover-title').css({
        fontSize: '14px',
        lineHeight: '1.25',
        fontWeight: '700',
        marginBottom: '3px'
    });
    popup.find('.feed-notification-popover-summary').css({
        fontSize: '12px',
        lineHeight: '1.3',
        color: '#555',
        margin: 0
    });

    const messages = Array.isArray(notification.messages) && notification.messages.length ?
        notification.messages :
        [notification.message];
    const title = popup.find('.feed-notification-popover-title');
    title.empty();
    messages.forEach(function(message) {
        $('<div></div>').text(message || '').appendTo(title);
    });
    popup.find('.feed-notification-popover-summary').text(notification.summary || '');

    $('body').append(popup);
    positionNotificationPopover(popup);
    $(window).off('resize.notificationPopover').on('resize.notificationPopover', function() {
        positionNotificationPopover($('.feed-notification-popover'));
    });

    popup.fadeIn(150, function() {
        applyNotificationActivity(notification);
    });
}

function applyNotificationActivity(notification) {
    if (!notification || !notification.activity || !notification.key) return;

    window.appliedPopupNotificationActivity = window.appliedPopupNotificationActivity || {};
    if (window.appliedPopupNotificationActivity[notification.key]) return;
    window.appliedPopupNotificationActivity[notification.key] = true;

    if (typeof window.applyUserPostNotificationActivity === 'function') {
        const activities = Array.isArray(notification.activities) && notification.activities.length ?
            notification.activities :
            [notification.activity];
        activities.forEach(function(activity) {
            window.applyUserPostNotificationActivity(activity);
        });
    }
}

function scheduleNotificationPopup(notification) {
    const shown = getShownNotificationKeys();
    if (!notification || !notification.key || shown[notification.key]) return;
    if (scheduledNotificationTimers[notification.key]) return;

    const scheduledTime = Number(notification.time);
    if (!Number.isFinite(scheduledTime)) return;

    const delay = scheduledTime - Date.now();
    if (delay <= 0) return;

    scheduledNotificationTimers[notification.key] = window.setTimeout(function() {
        delete scheduledNotificationTimers[notification.key];
        if (window.location.pathname === '/notifications') {
            window.location.reload();
            return;
        }
        queueNotificationPopup(notification, false);
    }, delay);
}

function startPendingSessionIfNeeded() {
    if (!window.hiloPendingSessionStart) {
        return $.Deferred().resolve().promise();
    }

    return $.post("/session/start", {
        _csrf: $('meta[name="csrf-token"]').attr('content')
    }).done(function(json) {
        window.hiloPendingSessionStart = false;
        if (json && json.conditionStartTime) {
            startGlobalConditionTimer(Number(json.conditionStartTime));
        }
    });
}

function updateNotificationState() {
    return $.getJSON("/notifications", { bell: true }, function(json) {
        const scheduledPopupNotifications = json.scheduledPopupNotifications || [];
        const bellActivityCount = Number(json.unreadCount !== undefined ? json.unreadCount : json.count) || 0;

        updateNotificationBell(bellActivityCount);
        if (window.location.pathname !== '/notifications' && bellActivityCount > 0) {
            const shown = getShownNotificationKeys();
            const latestDueNotification = scheduledPopupNotifications
                .filter(function(notification) {
                    const scheduledTime = Number(notification.time);
                    return notification &&
                        notification.key &&
                        !shown[notification.key] &&
                        Number.isFinite(scheduledTime) &&
                        scheduledTime <= Date.now();
                })
                .sort(function(a, b) {
                    return Number(b.time) - Number(a.time);
                })[0];

            if (latestDueNotification) {
                latestDueNotification.countAlreadyIncluded = true;
                queueNotificationPopup(latestDueNotification, false);
            }
        }
        scheduledPopupNotifications.forEach(scheduleNotificationPopup);
    });
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

    $(window).on('focus.conditionTimer', function() {
        if (typeof conditionRedirectCheck === 'function') {
            conditionRedirectCheck();
        }
    });
    $(document).on('visibilitychange.conditionTimer', function() {
        if (!document.hidden && typeof conditionRedirectCheck === 'function') {
            conditionRedirectCheck();
        }
    });

    /**
     * Other site functionalities:
     */
    // Close loading dimmer on content load.
    $('#loading').hide();
    $('#content').fadeIn('slow', function() {
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup' && window.location.pathname !== '/forgot') {
            if (window.hiloConditionStartMs) {
                startGlobalConditionTimer(window.hiloConditionStartMs);
            }
            startPendingSessionIfNeeded().always(function() {
                updateNotificationState();
            });
        }
    });

    // Fomantic UI: Enable closing messages
    $('.message .close').on('click', function() {
        $(this).closest('.message').transition('fade');
    });
    // Fomantic UI: Enable checkboxes
    $('.checkbox').checkbox();

    // Check if user has any notifications.
    if (window.location.pathname !== '/login' && window.location.pathname !== '/signup' && window.location.pathname !== '/forgot') {
        logPageEvent(window.hiloPageLogPath || window.location.pathname);
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

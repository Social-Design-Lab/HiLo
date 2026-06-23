const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const Actor = require('./models/Actor.js');
const Script = require('./models/Script.js');
const User = require('./models/User.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const color_start = '\x1b[33m%s\x1b[0m';
const color_success = '\x1b[32m%s\x1b[0m';

const SESSION_MS = 180000;
const SESSION_SUFFIXES = {
    1: 'PH',
    2: 'PL',
    3: 'NH',
    4: 'NL'
};

const PARTICIPANT_COLUMNS = [
    'ParticipantID',
    'TotalLikes_PH',
    'TotalLikes_PL',
    'TotalLikes_NH',
    'TotalLikes_NL',
    'TotalComments_PH',
    'TotalComments_PL',
    'TotalComments_NH',
    'TotalComments_NL',
    'TotalTimeOwnProfile_PH',
    'TotalTimeOwnProfile_PL',
    'TotalTimeOwnProfile_NH',
    'TotalTimeOwnProfile_NL',
    'TotalClicksOwnProfile_PH',
    'TotalClicksOwnProfile_PL',
    'TotalClicksOwnProfile_NH',
    'TotalClicksOwnProfile_NL',
    'TotalClicksOwnPost_PH',
    'TotalClicksOwnPost_PL',
    'TotalClicksOwnPost_NH',
    'TotalClicksOwnPost_NL',
    'TotalNotifCheck_PH',
    'TotalNotifCheck_PL',
    'TotalNotifCheck_NH',
    'TotalNotifCheck_NL',
    'TotalTimeMakePost_PH',
    'TotalTimeMakePost_PL',
    'TotalTimeMakePost_NH',
    'TotalTimeMakePost_NL',
    'TotalDismissClick_PH',
    'TotalDismissClick_PL',
    'TotalDismissClick_NH',
    'TotalDismissClick_NL',
    'TotalGotoPostClicks_PH',
    'TotalGotoPostClicks_PL',
    'TotalGotoPostClicks_NH',
    'TotalGotoPostClicks_NL'
];

const PARTICIPANT_VARIABLES = [
    ['ParticipantID', 'The ID entered by the researcher'],
    ['TotalLikes_PH', 'Total number of likes the participant made on actor posts totaled for positive high support condition (1)'],
    ['TotalLikes_PL', 'Total number of likes the participant made on actor posts totaled for positive low support condition (2)'],
    ['TotalLikes_NH', 'Total number of likes the participant made on actor posts totaled for negative high support condition (3)'],
    ['TotalLikes_NL', 'Total number of likes the participant made on actor posts totaled for negative low support condition (4)'],
    ['TotalComments_PH', 'Total number of comments the participant made on actor posts totaled for positive high support condition (1)'],
    ['TotalComments_PL', 'Total number of comments the participant made on actor posts totaled for positive low support condition (2)'],
    ['TotalComments_NH', 'Total number of comments the participant made on actor posts totaled for negative high support condition (3)'],
    ['TotalComments_NL', 'Total number of comments the participant made on actor posts totaled for negative low support condition (4)'],
    ['TotalTimeOwnProfile_PH', 'Total time spent looking at their own Profile in positive high support condition (1), in seconds'],
    ['TotalTimeOwnProfile_PL', 'Total time spent looking at their own Profile in positive low support condition (2), in seconds'],
    ['TotalTimeOwnProfile_NH', 'Total time spent looking at their own Profile in negative high support condition (3), in seconds'],
    ['TotalTimeOwnProfile_NL', 'Total time spent looking at their own Profile in negative low support condition (4), in seconds'],
    ['TotalClicksOwnProfile_PH', 'Total number of clicks on their own profile page in positive high support condition (1)'],
    ['TotalClicksOwnProfile_PL', 'Total number of clicks on their own profile page in positive low support condition (2)'],
    ['TotalClicksOwnProfile_NH', 'Total number of clicks on their own profile page in negative high support condition (3)'],
    ['TotalClicksOwnProfile_NL', 'Total number of clicks on their own profile page in negative low support condition (4)'],
    ['TotalClicksOwnPost_PH', 'Total number of clicks on their own post in positive high condition (1)'],
    ['TotalClicksOwnPost_PL', 'Total number of clicks on their own post in positive low condition (2)'],
    ['TotalClicksOwnPost_NH', 'Total number of clicks on their own post in negative high condition (3)'],
    ['TotalClicksOwnPost_NL', 'Total number of clicks on their own post in negative low condition (4)'],
    ['TotalNotifCheck_PH', 'Total number of clicks on notification tab in positive high condition (1)'],
    ['TotalNotifCheck_PL', 'Total number of clicks on notification tab in positive low condition (2)'],
    ['TotalNotifCheck_NH', 'Total number of clicks on notification tab in negative high condition (3)'],
    ['TotalNotifCheck_NL', 'Total number of clicks on notification tab in negative low condition (4)'],
    ['TotalTimeMakePost_PH', 'Time spent on make-a-post page in positive high support condition (1), in seconds'],
    ['TotalTimeMakePost_PL', 'Time spent on make-a-post page in positive low support condition (2), in seconds'],
    ['TotalTimeMakePost_NH', 'Time spent on make-a-post page in negative high support condition (3), in seconds'],
    ['TotalTimeMakePost_NL', 'Time spent on make-a-post page in negative low support condition (4), in seconds'],
    ['TotalDismissClick_PH', 'Total number of clicks on the dismiss button for the notification pop-up in the positive high support condition (1)'],
    ['TotalDismissClick_PL', 'Total number of clicks on the dismiss button for the notification pop-up in the positive low condition (2)'],
    ['TotalDismissClick_NH', 'Total number of clicks on the dismiss button for the notification pop-up in the negative high condition (3)'],
    ['TotalDismissClick_NL', 'Total number of clicks on the dismiss button for the notification pop-up in the negative low condition (4)'],
    ['TotalGotoPostClicks_PH', 'Total number of clicks on the Go to Post button for the notification pop-up in the positive high condition (1)'],
    ['TotalGotoPostClicks_PL', 'Total number of clicks on the Go to Post button for the notification pop-up in the positive low condition (2)'],
    ['TotalGotoPostClicks_NH', 'Total number of clicks on the Go to Post button for the notification pop-up in the negative high condition (3)'],
    ['TotalGotoPostClicks_NL', 'Total number of clicks on the Go to Post button for the notification pop-up in the negative low condition (4)']
];

const PARTICIPANT_COMMENT_COLUMNS = ['ParticipantID', 'ActorID', 'PostID', 'Comment'];
const PARTICIPANT_COMMENT_VARIABLES = [
    ['ParticipantID', 'The ID entered by the researcher'],
    ['ActorID', "Actor's name on HiLo"],
    ['PostID', 'The ID assigned to the post by the researcher'],
    ['Comment', "The comment that participant made on the actor's post"]
];

const ACTOR_POST_COLUMNS = [
    'ActorID',
    'ParticipantID',
    'Condition',
    'PostID',
    'LikedPost',
    'CommentedPost',
    'TimeSpentPost',
    'ClicksonPost',
    'TimeSpentProfile',
    'ClicksonProfile'
];
const ACTOR_POST_VARIABLES = [
    ['ActorID', "Actor's name on HiLo"],
    ['ParticipantID', 'The ID entered by the researcher'],
    ['PostID', 'The ID of the post'],
    ['LikedPost', 'Whether or not the post was liked by a participant (0=no, 1=yes)'],
    ['CommentedPost', 'Whether or not the post was commented on by a participant (0=no, 1=yes)'],
    ['TimeSpentPost', 'Time the participant spent looking at the post in seconds'],
    ['TimeSpentProfile', 'Total time the participant spent looking at profile in seconds (across the entire task; this will be the same number repeated for each participant per actor)'],
    ['ClicksonPost', 'Total number of clicks by a participant on a post'],
    ['ClicksonProfile', 'Total number of clicks by a participant on a profile (across the entire task; this will be the same number repeated for each participant per actor)']
];

mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection;
db.on('error', (err) => {
    console.error(err);
    console.log('%s MongoDB connection error. Please make sure MongoDB is running.');
    process.exit(1);
});
console.log(color_success, 'Successfully connected to db.');

async function getUsers() {
    return User
        .find({ isAdmin: false })
        .populate('posts.comments.actor')
        .populate({
            path: 'feedAction.post',
            populate: [
                { path: 'actor' },
                { path: 'comments.actor' }
            ]
        })
        .exec();
}

async function getActorPosts() {
    return Script
        .find({})
        .populate('actor')
        .populate('comments.actor')
        .sort({ condition: 1, postID: 1 })
        .exec();
}

function participantID(user) {
    return user.mturkID || user.ResponseID || user.username || String(user._id || '');
}

function actorName(actor) {
    if (!actor) return '';
    return actor.username || actor.profile?.name || String(actor);
}

function postLabel(post) {
    if (!post) return '';
    return post.postID || post.id || post._id || '';
}

function toDateMs(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function seconds(ms) {
    return Math.round(((Number(ms) || 0) / 1000) * 100) / 100;
}

function sum(numbers) {
    return (numbers || []).reduce((total, value) => total + (Number(value) || 0), 0);
}

function getSessionUserPost(user, session) {
    return (user.posts || [])
        .filter(post => Number(post.condition) === Number(session))
        .sort((a, b) => toDateMs(a.absTime) - toDateMs(b.absTime))[0];
}

function getSessionWindow(user, session) {
    const userPost = getSessionUserPost(user, session);
    const start = toDateMs(userPost?.absTime);
    if (!start) return null;
    return {
        start,
        end: start + SESSION_MS,
        post: userPost
    };
}

function inWindow(time, window) {
    return window && time >= window.start && time <= window.end;
}

function normalizePageLog(user) {
    return (user.pageLog || [])
        .map(item => ({
            time: toDateMs(item.time),
            page: item.page || ''
        }))
        .filter(item => item.time)
        .sort((a, b) => a.time - b.time);
}

function countPageEvents(user, predicate, window = null) {
    return normalizePageLog(user)
        .filter(item => (!window || inWindow(item.time, window)) && predicate(item.page))
        .length;
}

function timeOnPages(user, predicate, window = null) {
    const logs = normalizePageLog(user);
    let total = 0;

    for (let index = 0; index < logs.length; index += 1) {
        const current = logs[index];
        if (window && !inWindow(current.time, window)) continue;
        if (!predicate(current.page)) continue;

        const nextTime = logs[index + 1]?.time || (window ? window.end : current.time);
        const start = window ? Math.max(current.time, window.start) : current.time;
        const end = window ? Math.min(nextTime, window.end) : nextTime;
        if (end > start) total += end - start;
    }

    return total;
}

function makePostTime(user, session) {
    const currentWindow = getSessionWindow(user, session);
    if (!currentWindow) return 0;

    const exactMakePostTime = timeOnPages(user, page => page === `/make-post/${session}`);
    if (exactMakePostTime > 0) return exactMakePostTime;

    const previousWindow = getSessionWindow(user, session - 1);
    const lowerBound = previousWindow ? previousWindow.end : toDateMs(user.createdAt);
    const logs = normalizePageLog(user)
        .filter(item => item.page === '/' && item.time <= currentWindow.start && (!lowerBound || item.time >= lowerBound));
    const gateVisit = logs[logs.length - 1];
    if (!gateVisit) return 0;
    return Math.max(currentWindow.start - gateVisit.time, 0);
}

function getSessionFeedActions(user, session) {
    return (user.feedAction || [])
        .filter(action => action.post && String(action.post.condition) === String(session));
}

function getFeedActionForPost(user, actorPost) {
    return (user.feedAction || []).find(action => {
        const actionPost = action.post;
        if (!actionPost) return false;
        return String(actionPost._id || actionPost) === String(actorPost._id);
    });
}

function hasParticipantComment(action) {
    return (action?.comments || []).some(comment => comment.new_comment);
}

function participantCommentRows(users) {
    const rows = [PARTICIPANT_COMMENT_COLUMNS];

    for (const user of users) {
        for (const action of user.feedAction || []) {
            const post = action.post;
            if (!post) continue;

            for (const comment of action.comments || []) {
                if (!comment.new_comment) continue;
                rows.push([
                    participantID(user),
                    actorName(post.actor),
                    postLabel(post),
                    comment.body || ''
                ]);
            }
        }
    }

    return rows;
}

function participantSummaryRows(users) {
    const rows = [PARTICIPANT_COLUMNS];

    for (const user of users) {
        const record = { ParticipantID: participantID(user) };

        for (const session of [1, 2, 3, 4]) {
            const suffix = SESSION_SUFFIXES[session];
            const window = getSessionWindow(user, session);
            const feedActions = getSessionFeedActions(user, session);

            record[`TotalLikes_${suffix}`] = feedActions.filter(action => action.liked).length;
            record[`TotalComments_${suffix}`] = feedActions.reduce((total, action) => {
                return total + (action.comments || []).filter(comment => comment.new_comment).length;
            }, 0);
            record[`TotalTimeOwnProfile_${suffix}`] = seconds(timeOnPages(user, page => page === '/me', window));
            record[`TotalClicksOwnProfile_${suffix}`] = countPageEvents(user, page => page === '/me', window);
            record[`TotalClicksOwnPost_${suffix}`] = countPageEvents(
                user,
                page => page.startsWith('/notifications/post/') || page.startsWith('/notification-post/'),
                window
            );
            record[`TotalNotifCheck_${suffix}`] = countPageEvents(user, page => page === '/notifications', window);
            record[`TotalTimeMakePost_${suffix}`] = seconds(makePostTime(user, session));
            record[`TotalDismissClick_${suffix}`] = countPageEvents(user, page => page.startsWith('/notification-popup/dismiss/'), window);
            record[`TotalGotoPostClicks_${suffix}`] = countPageEvents(user, page => page.startsWith('/notification-popup/go-to-post/'), window);
        }

        rows.push(PARTICIPANT_COLUMNS.map(column => record[column] ?? 0));
    }

    return rows;
}

function actorProfileStats(user, actorUsername) {
    const pathName = `/user/${actorUsername}`;
    return {
        clicks: countPageEvents(user, page => page === pathName),
        seconds: seconds(timeOnPages(user, page => page === pathName))
    };
}

function actorPostRows(users, actorPosts) {
    const rows = [ACTOR_POST_COLUMNS];

    for (const actorPost of actorPosts) {
        const actor = actorPost.actor;
        const username = actorName(actor);

        for (const user of users) {
            const action = getFeedActionForPost(user, actorPost);
            const profileStats = actorProfileStats(user, username);

            rows.push([
                username,
                participantID(user),
                actorPost.condition || '',
                postLabel(actorPost),
                action?.liked ? 1 : 0,
                hasParticipantComment(action) ? 1 : 0,
                seconds(sum(action?.readTime || [])),
                action?.rereadTimes || (action?.readTime || []).length || 0,
                profileStats.seconds,
                profileStats.clicks
            ]);
        }
    }

    return rows;
}

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function columnName(index) {
    let name = '';
    let value = index;
    while (value > 0) {
        const remainder = (value - 1) % 26;
        name = String.fromCharCode(65 + remainder) + name;
        value = Math.floor((value - 1) / 26);
    }
    return name;
}

function worksheetXml(rows) {
    const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);
    const dimension = rows.length && maxColumns ? `A1:${columnName(maxColumns)}${rows.length}` : 'A1';
    const rowXml = rows.map((row, rowIndex) => {
        const cells = row.map((value, columnIndex) => {
            if (value === undefined || value === null || value === '') return '';
            const ref = `${columnName(columnIndex + 1)}${rowIndex + 1}`;
            if (typeof value === 'number' && Number.isFinite(value)) {
                return `<c r="${ref}"><v>${value}</v></c>`;
            }
            return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
        }).join('');
        return `<row r="${rowIndex + 1}">${cells}</row>`;
    }).join('');

    return [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
        `<dimension ref="${dimension}"/>`,
        '<sheetData>',
        rowXml,
        '</sheetData>',
        '</worksheet>'
    ].join('');
}

function workbookXml(sheets) {
    const sheetXml = sheets.map((sheet, index) => {
        return `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`;
    }).join('');
    return [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
        '<sheets>',
        sheetXml,
        '</sheets>',
        '</workbook>'
    ].join('');
}

function workbookRelsXml(sheets) {
    const rels = sheets.map((sheet, index) => {
        return `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`;
    }).join('');
    return [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
        rels,
        '</Relationships>'
    ].join('');
}

function contentTypesXml(sheets) {
    const overrides = sheets.map((sheet, index) => {
        return `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
    }).join('');
    return [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
        '<Default Extension="xml" ContentType="application/xml"/>',
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
        overrides,
        '</Types>'
    ].join('');
}

function rootRelsXml() {
    return [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>',
        '</Relationships>'
    ].join('');
}

function crc32(buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit += 1) {
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const file of files) {
        const nameBuffer = Buffer.from(file.name);
        const dataBuffer = Buffer.from(file.data);
        const crc = crc32(dataBuffer);

        const localHeader = Buffer.alloc(30);
        localHeader.writeUInt32LE(0x04034b50, 0);
        localHeader.writeUInt16LE(20, 4);
        localHeader.writeUInt16LE(0, 6);
        localHeader.writeUInt16LE(0, 8);
        localHeader.writeUInt16LE(0, 10);
        localHeader.writeUInt16LE(0, 12);
        localHeader.writeUInt32LE(crc, 14);
        localHeader.writeUInt32LE(dataBuffer.length, 18);
        localHeader.writeUInt32LE(dataBuffer.length, 22);
        localHeader.writeUInt16LE(nameBuffer.length, 26);
        localHeader.writeUInt16LE(0, 28);

        localParts.push(localHeader, nameBuffer, dataBuffer);

        const centralHeader = Buffer.alloc(46);
        centralHeader.writeUInt32LE(0x02014b50, 0);
        centralHeader.writeUInt16LE(20, 4);
        centralHeader.writeUInt16LE(20, 6);
        centralHeader.writeUInt16LE(0, 8);
        centralHeader.writeUInt16LE(0, 10);
        centralHeader.writeUInt16LE(0, 12);
        centralHeader.writeUInt16LE(0, 14);
        centralHeader.writeUInt32LE(crc, 16);
        centralHeader.writeUInt32LE(dataBuffer.length, 20);
        centralHeader.writeUInt32LE(dataBuffer.length, 24);
        centralHeader.writeUInt16LE(nameBuffer.length, 28);
        centralHeader.writeUInt16LE(0, 30);
        centralHeader.writeUInt16LE(0, 32);
        centralHeader.writeUInt16LE(0, 34);
        centralHeader.writeUInt16LE(0, 36);
        centralHeader.writeUInt32LE(0, 38);
        centralHeader.writeUInt32LE(offset, 42);
        centralParts.push(centralHeader, nameBuffer);

        offset += localHeader.length + nameBuffer.length + dataBuffer.length;
    }

    const centralDir = Buffer.concat(centralParts);
    const localData = Buffer.concat(localParts);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(files.length, 8);
    end.writeUInt16LE(files.length, 10);
    end.writeUInt32LE(centralDir.length, 12);
    end.writeUInt32LE(localData.length, 16);
    end.writeUInt16LE(0, 20);

    return Buffer.concat([localData, centralDir, end]);
}

function writeXlsx(filePath, sheets) {
    const files = [
        { name: '[Content_Types].xml', data: contentTypesXml(sheets) },
        { name: '_rels/.rels', data: rootRelsXml() },
        { name: 'xl/workbook.xml', data: workbookXml(sheets) },
        { name: 'xl/_rels/workbook.xml.rels', data: workbookRelsXml(sheets) }
    ];

    sheets.forEach((sheet, index) => {
        files.push({
            name: `xl/worksheets/sheet${index + 1}.xml`,
            data: worksheetXml(sheet.rows)
        });
    });

    fs.writeFileSync(filePath, zipStore(files));
}

function timestamp() {
    const date = new Date();
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
        String(date.getHours()).padStart(2, '0'),
        String(date.getMinutes()).padStart(2, '0'),
        String(date.getSeconds()).padStart(2, '0')
    ].join('-');
}

async function getDataExport() {
    const users = await getUsers();
    const actorPosts = await getActorPosts();
    console.log(color_start, 'Starting the HiLo data export script...');

    const outputDir = path.join(__dirname, 'outputFiles');
    fs.mkdirSync(outputDir, { recursive: true });

    const stamp = timestamp();
    const outputs = [
        {
            fileName: `HiLoSimulator_Participant_Data.${stamp}.xlsx`,
            sheets: [
                { name: 'Data', rows: participantSummaryRows(users) },
                { name: 'Variables', rows: PARTICIPANT_VARIABLES }
            ]
        },
        {
            fileName: `HiLoParticipantsComments.${stamp}.xlsx`,
            sheets: [
                { name: 'Sheet1', rows: participantCommentRows(users) },
                { name: 'Sheet2', rows: PARTICIPANT_COMMENT_VARIABLES }
            ]
        },
        {
            fileName: `HiLoActorPostData.${stamp}.xlsx`,
            sheets: [
                { name: 'Data', rows: actorPostRows(users, actorPosts) },
                { name: 'Variables', rows: ACTOR_POST_VARIABLES }
            ]
        }
    ];

    for (const output of outputs) {
        const outputPath = path.join(outputDir, output.fileName);
        writeXlsx(outputPath, output.sheets);
        console.log(color_success, `Exported ${outputPath}`);
    }

    console.log(color_success, `Data export completed for ${users.length} participants and ${actorPosts.length} actor posts.`);
    db.close();
    console.log(color_start, 'Closed db connection.');
}

getDataExport().catch((err) => {
    console.error(err);
    db.close();
    process.exit(1);
});

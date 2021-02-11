// ==UserScript==
// @name         Github PR Highlighting
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Highlight the PRs which are ready to get reviewed
// @author       You
// @include      /https://github.*/pulls/
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const issues = [...document.querySelectorAll(`[id^="issue"]`)];
    issues.forEach(issue => {
        const draft = issue.querySelectorAll(`[aria-label="Open draft pull request"]`);
        const tagDoNotMerge = issue.querySelectorAll(`[title*="Do not merge"]`);
        const tagDoNotReview = issue.querySelectorAll(`[title*="do not review"]`);
        const tagDraft = issue.querySelectorAll(`[title="DRAFT"]`);
        if (draft.length > 0 || tagDoNotMerge.length > 0 || tagDraft.length > 0) {
            issue.style = 'background-color: rgba(0,0,0,.1)';
            return;
        }

        const red = issue.querySelectorAll(`[class*="text-red"]`);
        if (red.length > 0) {
            issue.style = 'background-color: rgba(255,0,0,.1)';
            return;
        }

        const green = issue.querySelectorAll(`[class*="text-green"]`);
        if (green.length > 0) {
            issue.style = 'background-color: rgba(0,255,0,.1)';
            return;
        }

        const yellow = issue.querySelectorAll(`[class*="color-yellow-7"]`);
        if (yellow.length > 0) {
            issue.style = 'background-color: rgba(255,178,0,.1)';
            return;
        }
    });
})();

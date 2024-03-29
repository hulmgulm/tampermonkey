// ==UserScript==
// @name         Enterprise Github PR/Discussion Highlighting
// @namespace    https://github.com/hulmgulm/tampermonkey
// @version      0.10.0
// @description  Highlight the PRs which are ready to get reviewed
// @author       hulmgulm
// @include      /https://github.*
// @grant        GM.xmlHttpRequest
// @grant        GM_log
// @require      http://ajax.googleapis.com/ajax/libs/jquery/3.6.3/jquery.min.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @downloadURL  https://raw.githubusercontent.com/hulmgulm/tampermonkey/main/pr_review.js
// @updateURL    https://raw.githubusercontent.com/hulmgulm/tampermonkey/main/pr_review.js
// ==/UserScript==

const prHandling = () => {
    console.log('Tampermonkey GitHub PR handling ... ');

    const hovercard_subject_tag = document.querySelector('[name="hovercard-subject-tag"]').attributes.content.value;
    const current_path = new URL(document.documentURI).pathname;
    let ranAlready = false;

    const colorIssues = issues => {
        issues.forEach(issue => {
            const ranAlreadyMarker = issue.querySelector(`[prfinished="true"]`);
            if (ranAlready || ranAlreadyMarker) {
                ranAlready = true;
                return;
            }

            const link = issue.querySelector('[data-hovercard-url]');
            if (!link) {
                return;
            }
            const data_hovercard_url = link.attributes['data-hovercard-url'].value;
            const pr_url = link.attributes.href.value;

            let opened_by = issue.querySelector(`[class*="opened-by"]`);

            /* load hovercard, containing target_branch */
            GM.xmlHttpRequest({
                method: 'GET',
                url: `${data_hovercard_url}?subject=${hovercard_subject_tag}&current_path=${current_path}`,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                onload(response) {
                    if (response.status === 200) {
                        const target_branch = response.responseText.match(/class="commit-ref[^>]*>([^<]*)</i)[1].trim();
                        const span = document.createElement('span');
                        span.appendChild(document.createTextNode(target_branch));
                        span.classList.add('commit-ref');
                        span.setAttribute('prfinished', 'true');
                        span.style = 'font-size: 0.9em; margin-right: 3px; padding: 0 3px';
                        opened_by.before(span);
                        opened_by = span;
                    } else {
                        console.log('Unable to get PR details:', response.status, response.statusText, response.readyState, response.responseHeaders, response.responseText, response.finalUrl);
                    }
                }
            });

            /* get merge details */
            GM.xmlHttpRequest({
                method: 'GET',
                url: `${pr_url}/show_partial?partial=pull_requests%2Fmerging`,
                onload(response) {
                    if (response.status === 200) {
                        if (response.responseText.includes('This branch has conflicts that must be resolved')) {
                            const span = document.createElement('span');
                            span.appendChild(document.createTextNode('Merge Conflict!'));
                            span.style = 'margin:0 4px;--label-r:117;--label-g:6;--label-b:50;--label-h:336;--label-s:90;--label-l:24;';
                            span.classList.add('IssueLabel');
                            span.classList.add('hx_IssueLabel');
                            opened_by.before(span);
                        }
                    } else {
                        console.log('Unable to get merge details:', response.status, response.statusText, response.readyState, response.responseHeaders, response.responseText, response.finalUrl);
                    }
                }
            });

            /* get pr details to get reviewers */
            GM.xmlHttpRequest({
                method: 'GET',
                url: pr_url,
                onload(response) {
                    if (response.status === 200) {
                        const regexp = /class=["']reviewers-status-icon[^"']*[^>]*aria-label=["']([^"']*)["']/g;
                        const rawReviews = [...response.responseText.matchAll(regexp)];
                        const target = issue.querySelector(`[class*="opened-by"]`).parentElement;
                        rawReviews.forEach(review => {
                            if (review[1] !== 'Re-request review' && !review[1].includes('is a code owner') &&!review[1].includes('will be requested when the pull request is marked ready for review')) {
                                const span = document.createElement('span');
                                span.appendChild(document.createTextNode(review[1].replace('approved these changes', '✅').replace('requested changes', '❌').replace('Awaiting requested review from', '🟠').replace('left review comments','💬')));
                                span.style = 'margin:0 4px;';
                                span.classList.add('IssueLabel');
                                span.classList.add('hx_IssueLabel');
                                target.after(span);
                            }
                        });
                    } else {
                        console.log('Unable to get pr details:', response.status, response.statusText, response.readyState, response.responseHeaders, response.responseText, response.finalUrl);
                    }
                }
            });

            const draft = issue.querySelectorAll(`[aria-label="Draft Pull Request"]`);
            const tagDoNotMerge = issue.querySelectorAll(`[title*="Do not merge"]`);
            const tagDoNotReview = issue.querySelectorAll(`[title*="do not review"]`);
            const tagDraft = issue.querySelectorAll(`[title="DRAFT"]`);
            if (draft.length > 0 || tagDoNotMerge.length > 0 || tagDraft.length > 0 || tagDoNotReview.length > 0) {
                issue.style = 'background-color: rgba(0,0,0,.1)';
                return;
            }

            const red = issue.querySelectorAll(`[class*="color-fg-danger"]`);
            if (red.length > 0) {
                issue.style = 'background-color: rgba(255,0,0,.1)';
                return;
            }

            const green = issue.querySelectorAll(`[class*="color-fg-success"]`);
            if (green.length > 0) {
                issue.style = 'background-color: rgba(0,255,0,.1)';
                return;
            }

            const yellow = issue.querySelectorAll(`[class*="hx_dot-fill-pending-icon"]`);
            if (yellow.length > 0) {
                issue.style = 'background-color: rgba(255,178,0,.1)';
                return;
            }
        });
    };

    const issues = [...document.querySelectorAll(`[id^="issue"]`)];
    if (issues.length > 0) {
        colorIssues(issues);
    }

    // add "hide draft PRs" link
    if (!document.querySelector('#hideDraftFilter')) {
        const table_list_header = document.querySelector('#js-issues-toolbar .table-list-header-toggle');
        const filterLink = document.createElement('a');
        const filterInput = document.querySelector('#js-issues-search');
        filterLink.classList.add('btn-link');
        filterLink.setAttribute('id', 'hideDraftFilter');
        if (filterInput.value.includes('draft:false')) {
            // draft PRs already hidden
            filterLink.classList.add('selected');
        }
        filterLink.appendChild(document.createTextNode('Hide Draft PRs'));
        filterLink.addEventListener('click', () => {
            if (filterInput.value.includes('draft:false')) {
                // draft PRs already hidden
                filterLink.classList.remove('selected');
                filterInput.value = filterInput.value.replace('draft:false', '');
            } else {
                // draft PRs not hidden
                filterLink.classList.add('selected');
                filterInput.value += ' draft:false';
            }
            document.querySelector('.subnav-search.width-full').submit();
        });
        table_list_header.appendChild(filterLink);
    }
};

waitForKeyElements(`[data-ga-click*="New pull request"]`, prHandling);

// add default search parameters to pull requests tab
const PRTab = document.querySelector('#pull-requests-tab');
const currentURL = PRTab.getAttribute('href');
PRTab.setAttribute('href', `${currentURL}?q=is%3Apr+is%3Aopen+draft%3Afalse`);

// add default search parameters to discussions tab
const discussionsTab = document.querySelector('#discussions-tab');
const discussionsURL = discussionsTab.getAttribute('href');
discussionsTab.setAttribute('href', `${discussionsURL}?discussions_q=is%3Aunlocked`);


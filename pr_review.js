// ==UserScript==
// @name         Enterprise Github PR Highlighting
// @namespace    https://github.com/hulmgulm/tampermonkey
// @version      0.4.1
// @description  Highlight the PRs which are ready to get reviewed
// @author       hulmgulm
// @include      /https://github.*
// @grant        GM.xmlHttpRequest
// @require      http://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @downloadURL  https://raw.githubusercontent.com/hulmgulm/tampermonkey/main/pr_review.js
// @updateURL    https://raw.githubusercontent.com/hulmgulm/tampermonkey/main/pr_review.js
// ==/UserScript==

const prHandling = () => {
  console.log('Running PR handling ... ');

  const hovercard_subject_tag = document.querySelector('[name="hovercard-subject-tag"]').attributes['content'].value;
  const current_path = new URL(document.documentURI).pathname;

  const colorIssues = issues => {
    issues.forEach(issue => {
      const link = issue.querySelector('[data-hovercard-url]');
      if (!link) {
        return;
      }
      const data_hovercard_url = link.attributes['data-hovercard-url'].value;

      GM.xmlHttpRequest ({
        method: "GET",
        url: data_hovercard_url + "?subject=" + hovercard_subject_tag + "&current_path=" + current_path,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        },
        onload: function(response) {
          if (response.status === 200) {
            const target_branch = response.responseText.match(/class="commit-ref[^>]*>([^<]*)</i)[1].trim();
            const opened_by = issue.querySelector(`[class*="opened-by"]`);
            const span = document.createElement('span');
            span.appendChild(document.createTextNode(target_branch));
            span.classList.add('commit-ref');
            span.style = 'font-size: 0.9em';
            opened_by.before(span);
          } else {
            console.log('Unable to get PR details:', response.status, response.statusText, response.readyState, response.responseHeaders, response.responseText, response.finalUrl);
          }
        }
      });

      const draft = issue.querySelectorAll(`[aria-label="Open draft pull request"]`);
      const tagDoNotMerge = issue.querySelectorAll(`[title*="Do not merge"]`);
      const tagDoNotReview = issue.querySelectorAll(`[title*="do not review"]`);
      const tagDraft = issue.querySelectorAll(`[title="DRAFT"]`);
      if (draft.length > 0 || tagDoNotMerge.length > 0 || tagDraft.length > 0 || tagDoNotReview.length > 0) {
        issue.style = 'background-color: rgba(0,0,0,.1)';
        return;
      }

      const red = issue.querySelectorAll(`[class*="color-text-danger"]`);
      if (red.length > 0) {
        issue.style = 'background-color: rgba(255,0,0,.1)';
        return;
      }

      const green = issue.querySelectorAll(`[aria-label="Success: This commit looks good"]`);
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
  };


  const issues = [...document.querySelectorAll(`[id^="issue"]`)];
  if (issues.length > 0) {
    colorIssues(issues);
  }
};

waitForKeyElements(`[data-ga-click*="New pull request"]`, prHandling);

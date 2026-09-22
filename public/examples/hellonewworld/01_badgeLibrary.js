export default {
    // Runs once per full reinit, right after this.libraryElement/this.DATA are fresh.
    // `context` carries every library/DATA block created before this one, keyed by name —
    // we don't need anything from it, we only publish our own API for others to use.
    create(context) {
        return {
            // Called by the test library (if one is present) with the flattened list of
            // test results, so badges can be revealed/hidden as tests pass or fail.
            checkBadges: (tests) => this.checkBadges(tests),
        }
    },

    // -- validation -----------------------------------------------------------

    hasValidBadgeData() {
        const data = this.DATA && this.DATA['badges']
        return !!data && typeof data.url === 'string' && Array.isArray(data.items)
    },

    renderMissingDataHint() {
        this.libraryElement.html(`
            <div class="gdi-badge-hint">
                <p>
                    No badge data found. Add a <code>DATA</code> block named
                    <b>badges</b> with content similar to:
                </p>
                <pre>{
  "url": "https://example.com/badges",
  "ex": "A01",
  "items": [
    {
      "id": "app",
      "file": "badge_app.jpg",
      "title": "My Badge",
      "desc": "Do the thing."
    }
  ]
}</pre>
            </div>
        `)
    },

    // -- rendering --------------------------------------------------------------

    badgeTemplate(b, baseURL) {
        return `<div id="badge" class="col-sm-12 col-md-6 col-lg-3 gdihidden${b.surprise ? ' gdisurprisebadge' : ''}" data-name="${b.id}">
    <table>
        <tr>
            <td>
                <div class="badgeimg">
                    <img src="${baseURL}/${b.file}" />
                </div>
            </td>
            <td>
                <div class="gdibadgetitle">${b.title}</div>
                <div class="gdibadgedesc">${b.desc}</div>
            </td>
        </tr>
    </table>
</div>`
    },

    renderBadges() {
        const badges = this.DATA['badges']
        const baseURL = badges.url + '/' + badges.ex
        const row = $('<div class="gdibadgerow row row-flex row-flex-wrap"></div>')
        row.html(badges.items.map((b) => this.badgeTemplate(b, baseURL)).join('\n'))
        this.libraryElement.html('').append(row)
    },

    setupDOM() {
        if (!this.hasValidBadgeData()) {
            this.renderMissingDataHint()
            return
        }
        this.renderBadges()
    },

    // -- persisted badge state ---------------------------------------------------

    storeBadge(id) {
        const badges = this.DATA['badges']
        let stored = localStorage.getItem('gdi-badges')
        stored = stored ? JSON.parse(stored) : {}

        let sem = stored[badges.url]
        if (sem === undefined) {
            sem = {}
            stored[badges.url] = sem
        }
        let ex = sem[badges.ex]
        if (ex === undefined) {
            ex = {}
            sem[badges.ex] = ex
        }
        ex[id] = true
        localStorage.setItem('gdi-badges', JSON.stringify(stored))
    },

    setBadge(id, state) {
        const badge = this.libraryElement.find(`#badge[data-name=${id}]`)
        if (badge.length === 0) {
            return
        }
        if (!state && !badge.hasClass('gdihidden')) {
            badge.addClass('gdihidden')
            badge.removeClass('gdishow')
        } else if (state && badge.hasClass('gdihidden')) {
            badge.removeClass('gdihidden')
            badge.addClass('gdishow')
            this.storeBadge(id)
        }
    },

    checkBadges(tests) {
        if (!this.hasValidBadgeData()) {
            return
        }
        this.DATA['badges'].items.forEach((b) => {
            const badgeTests = tests.filter((t) =>
                Array.isArray(t.badge) ? t.badge.indexOf(b.id) >= 0 : t.badge === b.id
            )
            const ok =
                b.combine === '|'
                    ? badgeTests.map((t) => t.ok === true).reduce((p, c) => p || c, false)
                    : badgeTests.length > 0 &&
                      badgeTests.map((t) => t.ok === true).reduce((p, c) => p && c, true)
            this.setBadge(b.id, ok)
        })
    },
}

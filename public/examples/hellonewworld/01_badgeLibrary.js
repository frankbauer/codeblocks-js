export default {
    getStoredData: (id, badges) => this._getStoredData(id, badges),
    setStoredData: (id, badges, stored) => this._setStoredData(id, badges, stored),

    // Runs once per full reinit, right after this.libraryElement/this.DATA are fresh.
    // `context` carries every library/DATA block created before this one, keyed by name —
    // we don't need anything from it, we only publish our own API for others to use.
    create(context) {
        this.getStoredData = (id, badges) => this._getStoredData(id, badges)
        this.setStoredData = (id, badges, stored) => this._setStoredData(id, badges, stored)

        return {
            // Called by the test library (if one is present) with the flattened list of
            // test results, so badges can be revealed/hidden as tests pass or fail.
            checkBadges: (tests) => this.checkBadges(tests),
            // Called to reveal or hide a badge by its ID. `store` controls whether the new
            // state is persisted in localStorage. If omitted, defaults to true when showing
            // a badge and false when hiding it.
            setBadge: (id, state, store) => this.setBadge(id, state, store),
            hasValidBadgeData: () => this.hasValidBadgeData(),
            setStorageHandlers: (getter, setter) => {
                this.getStoredData = getter
                this.setStoredData = setter
            },
        }
    },

    // -- validation -----------------------------------------------------------

    hasValidBadgeData() {
        const data = this.DATA && this.DATA['badges']
        return !!data && typeof data.url === 'string' && Array.isArray(data.items)
    },

    renderMissingDataHint() {
        this.libraryElement.html(
            this.styles() +
                `
            <div class="cb-badge-hint">
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
      "desc": "Do the thing.",
      "surprise": false
    }
  ]
}</pre>
            </div>
        `
        )
    },

    // -- rendering --------------------------------------------------------------

    badgeTemplate(b, baseURL) {
        return `<div id="badge" class="tw-w-full md:tw-w-1/2 lg:tw-w-1/4 cb-hidden${b.surprise ? ' cb-surprise-badge' : ''}" data-name="${b.id}">
    <table>
        <tr>
            <td>
                <div class="badgeimg">
                    <img src="${baseURL}/${b.file}" />
                </div>
            </td>
            <td>
                <div class="cb-badge-title">${b.title}</div>
                <div class="cb-badge-desc">${b.desc}</div>
            </td>
        </tr>
    </table>
</div>`
    },

    renderBadges() {
        const badges = this.DATA['badges']
        const baseURL = badges.url + '/' + badges.ex
        const row = $('<div class="cb-badge-row tw-flex tw-flex-wrap"></div>')
        row.html(badges.items.map((b) => this.badgeTemplate(b, baseURL)).join('\n'))
        this.libraryElement.html(this.styles()).append(row)
    },

    setupDOM() {
        if (!this.hasValidBadgeData()) {
            this.renderMissingDataHint()
            return
        }
        this.renderBadges()
    },

    // -- persisted badge state ---------------------------------------------------

    _getStoredData(id, badges) {
        let stored = localStorage.getItem('cb-badges')
        return stored ? JSON.parse(stored) : {}
    },

    _setStoredData(id, badges, stored) {
        localStorage.setItem('cb-badges', JSON.stringify(stored))
    },

    storeBadge(id) {
        const badges = this.DATA['badges']
        let stored = this.getStoredData(id, badges)

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
        this.setStoredData(id, badges, stored)
    },

    setBadge(id, state, store) {
        if (store === undefined) {
            store = state
        } // default to storing when showing, not storing when hiding
        const badge = this.libraryElement.find(`#badge[data-name=${id}]`)
        if (badge.length === 0) {
            return
        }
        if (!state && !badge.hasClass('cb-hidden')) {
            badge.addClass('cb-hidden')
            badge.removeClass('cb-show')
            if (store) {
                this.storeBadge(id)
            }
        } else if (state && badge.hasClass('cb-hidden')) {
            badge.removeClass('cb-hidden')
            badge.addClass('cb-show')
            if (store) {
                this.storeBadge(id)
            }
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

    // -- styles -------------------------------------------------------------------
    // Kept self-contained here (rather than in a separate TEXT block) so this
    // library works standalone wherever it's dropped in.

    styles() {
        return `<style>
    #badge td {
        vertical-align: bottom;
    }
    .cb-hidden td {
        color: #a5a39f;
    }
    .cb-show td {
        color: black;
        animation: cb-reveal-text 0.5s ease-in forwards;
    }
    .badgeimg img,
    .badgeimg {
        width: 128px;
        height: 128px;
        border-radius: 8px;
    }
    .badgeimg {
        position: relative;
    }
    .cb-hidden .badgeimg {
        box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.01);
        border: 2px dotted #eeedeaff;
    }
    .cb-show .badgeimg {
        box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.2);
        border: 0px dotted #eeedea00;
        animation: cb-reveal-frame 0.1s ease-in forwards;
    }
    .cb-hidden .badgeimg img {
        transform: scale(2);
        transform-origin: 0.5 0.5;
        opacity: 0;

        animation: cb-hide-image 0.7s ease-in forwards;
    }
    .cb-show .badgeimg img {
        opacity: 1;
        transform: scale(1);
        transform-origin: 0.5 0.5;

        animation: cb-reveal 0.3s ease-in forwards;
    }
    #badge {
        padding-left: 0px;
        padding-right: 8px;
        padding-bottom: 12px;
        position: relative;
    }
    .cb-badge-row {
        font-family: Roboto, 'Open Sans', Verdana, Arial, Helvetica, sans-serif !important;
        justify-content: flex-start;
        margin-top: 32px;
        padding-top: 8px;
        padding-left: 0px;
        margin-bottom: -12px;
    }
    .cb-badge-title,
    .cb-badge-desc {
        padding-left: 12px;
    }
    .cb-badge-title {
        font-weight: 200;
        font-size: 120%;
    }
    .cb-badge-title b {
        font-weight: 800;
    }
    .cb-badge-desc {
        margin-top: 0px;
        font-weight: 200;
        line-height: 110%;
        padding-top: 0px;
        padding-bottom: 2px;
        opacity: 0.75;
    }
    .cb-surprise-badge.cb-hidden div.cb-badge-title,
    .cb-surprise-badge.cb-hidden div.cb-badge-desc {
        color: rgba(1, 1, 1, 0);
        font-size: 0px;
    }
    .cb-surprise-badge.cb-hidden div.cb-badge-desc::before {
        content: '???';
        font-weight: 500;
        color: #a5a39f;
        font-size: 21px !important;
        line-height: 25px;
    }
    .cb-badge-hint {
        border: 1px dashed #d9822b;
        background-color: #fdf3e6;
        border-radius: 6px;
        padding: 10px 14px;
        font-family: Roboto, 'Open Sans', Verdana, Arial, Helvetica, sans-serif !important;
    }
    .cb-badge-hint pre {
        background-color: #ffffff;
        border: 1px solid #eeedea;
        border-radius: 4px;
        padding: 8px;
        overflow-x: auto;
    }
    @keyframes cb-reveal {
        from {
            transform: scale(2);
            opacity: 0;
        }
        to {
            transform: scale(1);
            opacity: 1;
        }
    }
    @keyframes cb-hide-image {
        to {
            transform: scale(0.1);
            opacity: 0;
        }
    }
    @keyframes cb-reveal-frame {
        from {
            border: 2px dotted #eeedea;
            box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.01);
        }
        to {
            border: 0px dotted #eeedea;
            box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.2);
        }
    }
    @keyframes cb-reveal-text {
        from {
            color: #a5a39f;
        }
        to {
            color: black;
        }
    }
</style>`
    },
}

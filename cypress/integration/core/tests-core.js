const u = require('../../util/util.js');

describe('Tests', function () {
    beforeEach(() => {
        cy.checkPing();
    });

    it('POST to tests/dev/nofile but no file is provided', function () {
        const baseUrl = Cypress.config().baseUrl;
        const postUrl = `${baseUrl}/test/dev/nofile`;

        cy.request({
            url: postUrl,
            failOnStatusCode: false,
            method: 'POST',
            body: { version: 'v0.0.1' },
        }).then((response) => {
            expect(response.status).to.eq(400);
            expect(JSON.stringify(response.body.message)).to.match(/No file was uploaded/);
        });
    });

    it('POST myFile.txt to /test/dev/example1 - but expects .zip file', function () {
        cy.postTests('/test/dev/example1', 'myFile.txt', 'v1.1.1', 'Please provide a .zip file');
    });

    it('POST cypress-frontend-app.zip to /test/dev/example2', function () {
        cy.postTests('/test/dev/example2', 'cypress-frontend-app.zip', 'v1.1.3');
    });

    it('POST cypress-frontend-app.zip to /test/dev/cypress-frontend-app', function () {
        cy.postTests('/test/dev/cypress-frontend-app', 'cypress-frontend-app.zip', 'v1.2.1');
    });

    it('ensures that a cypress-mars.json file exists when posting to environment mars', function () {
        cy.postTests(
            '/test/mars/cypress-frontend-app',
            'cypress-frontend-app.zip',
            'v1.0.0',
            'Please provide cypress-mars.json file at cypress root, e.g. cypress/cypress-mars.json',
        );
    });

    it('returns error message when requesting a built config file that does not exist', function () {
        cy.httpGet('/test/noenv/nofile/runConfig', 404, 'does not exist');
    });

    it('noRun=1 query string parameter returns `Not running the tests`', function () {
        cy.postTests('/test/uat/cypress-backend-app', 'cypress-backend-app.zip', 'v3.2.1');

        cy.httpGet(`/test/uat/cypress-backend-app?noRun=1&group=${u.rndGroup()}`, 200, 'Not running the tests');
    });

    it('returns cypress-dev-RUN.json with `env` config copied from cypress-dev.json', function () {
        cy.postTests('/test/dev/cypress-frontend-app', 'cypress-frontend-app.zip', 'v0.2.1');

        cy.httpGet(`/test/dev/cypress-frontend-app?noRun=1&group=${u.rndGroup()}`, 200, 'www.brand.dev.io');

        cy.httpGet('/test/dev/cypress-frontend-app/runConfig', 200, 'www.brand.dev.io');
    });

    it('returns cypress-dev-RUN.json with `baseUrl` copied from cypress-dev.json', function () {
        cy.postTests('/test/dev/cypress-backend-app', 'cypress-backend-app.zip', 'v0.2.2');

        cy.httpGet(`/test/dev/cypress-backend-app?noRun=1&group=${u.rndGroup()}`, 200, 'www.mybaseurl.dev.io');

        cy.httpGet('/test/dev/cypress-backend-app/runConfig', 200, 'www.mybaseurl.dev.io');
    });

    it('returns cypress-dev-RUN.json with `ignoreTestFiles` copied from cypress-dev.json', function () {
        cy.postTests('/test/dev/cypress-backend-app', 'cypress-backend-app.zip', 'v0.2.2');
        cy.httpGet(`/test/dev/cypress-backend-app?noRun=1&group=${u.rndGroup()}`, 200, 'ignore-this.js');
    });

    it('returns cypress-dev-RUN.json with `blockHosts` copied from cypress-dev.json', function () {
        cy.postTests('/test/dev/cypress-backend-app', 'cypress-backend-app.zip', 'v0.2.2');
        cy.httpGet(`/test/dev/cypress-backend-app?noRun=1&group=${u.rndGroup()}`, 200, 'www.block.this.host.io');
    });

    it('returns cypress-dev-RUN.json with `userAgent` copied from cypress-dev.json', function () {
        cy.postTests('/test/dev/cypress-backend-app', 'cypress-backend-app.zip', 'v0.2.2');
        cy.httpGet(`/test/dev/cypress-backend-app?noRun=1&group=${u.rndGroup()}`, 200, 'this is my useragent string');
    });

    it('returns cypress-dev-RUN.json with `viewportHeight` and `viewportWidth` copied from cypress-dev.json', function () {
        cy.postTests('/test/dev/cypress-backend-app', 'cypress-backend-app.zip', 'v0.2.2');
        cy.httpGet(`/test/dev/cypress-backend-app?noRun=1&group=${u.rndGroup()}`, 200, '770');
        cy.httpGet(`/test/dev/cypress-backend-app?noRun=1&group=${u.rndGroup()}`, 200, '1110');
    });

    it('adds fixturesFolder to built runConfig', function () {
        cy.postTests('/test/dev1/cypress-backend-app', 'cypress-backend-app.zip', 'v0.0.1');

        cy.httpGet(`/test/dev1/cypress-backend-app?noRun=1&group=${u.rndGroup()}`, 200, 'www.brand.dev1.io');

        cy.httpGet('/test/dev1/cypress-backend-app/runConfig', 200, 'fixturesFolder');
    });

    it('adds integrationFolder to built runConfig', function () {
        cy.postTests('/test/dev1/cypress-backend-app', 'cypress-backend-app.zip', 'v0.0.2');

        cy.httpGet(`/test/dev1/cypress-backend-app?noRun=1&group=${u.rndGroup()}`, 200, 'www.brand.dev1.io');

        cy.httpGet('/test/dev1/cypress-backend-app/runConfig', 200, 'integrationFolder');
    });

    it('adds pluginsFile to built runConfig', function () {
        cy.postTests('/test/dev1/cypress-backend-app', 'cypress-backend-app.zip', 'v0.0.2');

        cy.httpGet(`/test/dev1/cypress-backend-app?noRun=1&group=${u.rndGroup()}`, 200, 'www.brand.dev1.io');

        cy.httpGet('/test/dev1/cypress-backend-app/runConfig', 200, 'pluginsFile');
    });

    it('adds supportFile to built runConfig', function () {
        cy.postTests('/test/dev1/cypress-backend-app', 'cypress-backend-app.zip', 'v0.0.5');

        cy.httpGet(`/test/dev1/cypress-backend-app?noRun=1&group=${u.rndGroup()}`, 200, 'www.brand.dev1.io');

        cy.httpGet('/test/dev1/cypress-backend-app/runConfig', 200, 'supportFile');
    });

    it('adds downloadsFolder to built runConfig', function () {
        cy.postTests('/test/pat/cypress-backend-app', 'cypress-backend-app.zip', 'v0.0.2');

        const group = u.rndGroup();
        cy.httpGet(`/test/pat/cypress-backend-app?noRun=1&group=${group}`, 200, 'www.brand.pat.io');

        const dt = '[0-9]{2,4}[.][0-9]{2}[.][0-9]{2}';

        cy.httpGet(
            '/test/pat/cypress-backend-app/runConfig',
            200,
            `"results/pat/cypress-backend-app/${dt}/${group}/allSuites/downloads"`,
        );
    });

    it('adds screenshotsFolder to built runConfig', function () {
        cy.postTests('/test/perf/cypress-backend-app', 'cypress-backend-app.zip', 'v0.1.8');

        const group = u.rndGroup();
        cy.httpGet(`/test/perf/cypress-backend-app?noRun=1&group=${group}`, 200, 'www.brand.perf.io');

        const dt = '[0-9]{2,4}[.][0-9]{2}[.][0-9]{2}';

        cy.httpGet(
            '/test/perf/cypress-backend-app/runConfig',
            200,
            `"results/perf/cypress-backend-app/${dt}/${group}/allSuites/screenshots"`,
        );
    });

    it('adds videosFolder to built runConfig', function () {
        cy.postTests('/test/pink/cypress-backend-app', 'cypress-backend-app.zip', 'v0.1.9');

        const group = u.rndGroup();
        cy.httpGet(`/test/pink/cypress-backend-app?noRun=1&group=${group}`, 200, 'www.brand.pink.io');

        const dt = '[0-9]{2,4}[.][0-9]{2}[.][0-9]{2}';

        cy.httpGet(
            '/test/pink/cypress-backend-app/runConfig',
            200,
            `"results/pink/cypress-backend-app/${dt}/${group}/allSuites/videos"`,
        );
    });

    it('adds reporter and reporterOptions to built runConfig', function () {
        cy.postTests('/test/pink/cypress-backend-app', 'cypress-backend-app.zip', 'v0.1.9');

        const group = u.rndGroup();
        cy.httpGet(`/test/pink/cypress-backend-app?noRun=1&group=${group}`, 200, 'www.brand.pink.io');

        const dt = '[0-9]{2,4}[.][0-9]{2}[.][0-9]{2}';

        cy.httpGet('/test/pink/cypress-backend-app/runConfig', 200, `"reporter":"mochawesome"`);
        cy.httpGet(
            '/test/pink/cypress-backend-app/runConfig',
            200,
            `"reportDir":"results/pink/cypress-backend-app/${dt}/${group}/allSuites"`,
        );
    });

    it('group parameter is mandatory for running tests', function () {
        cy.postTests('/test/dev/cypress-backend-app', 'cypress-backend-app.zip', 'v0.2.5');
        cy.httpGet(`/test/dev/cypress-backend-app?noRun=1`, 400, 'Group must be supplied to group suites for an app');
    });

    it('group parameter is used as part of the folder structure', function () {
        cy.postTests('/test/dev/cypress-backend-app', 'cypress-backend-app.zip', 'v0.2.5');
        const group = u.rndGroup();
        const dt = '[0-9]{2,4}[.][0-9]{2}[.][0-9]{2}';
        cy.httpGet(`/test/dev/cypress-backend-app?noRun=1&group=${group}`, 200, `cypress-backend-app/${dt}/${group}`);
    });

    it('suite parameter runs tests in all subfolders for given suite (top level folder under integration)', function () {
        cy.postTests('/test/dev/cypress-backend-app', 'cypress-backend-app.zip', 'v6.2.5');
        cy.httpGet(
            `/test/dev/cypress-backend-app?noRun=1&group=${u.rndGroup()}&suite=canary`,
            200,
            'cypress/integration/canary/[*][*]/[*]',
        );
    });

    it('not providing suite parameter runs tests in all subfolders under integration', function () {
        cy.postTests('/test/dev/cypress-backend-app', 'cypress-backend-app.zip', 'v7.2.5');
        cy.httpGet(`/test/dev/cypress-backend-app?noRun=1&group=${u.rndGroup()}`, 200, 'cypress/integration/[*][*]/[*]');
    });

    it('sets `video` to `false` so that video false will not be produced', function () {
        cy.postTests('/test/dev/cypress-backend-app', 'cypress-backend-app.zip', 'v0.2.5');
        cy.httpGet(`/test/dev/cypress-backend-app?noRun=1&group=${u.rndGroup()}&noVideo=1`, 200, '"video":false');
    });

    it('GET /test/yellow/cypress-backend-app/lastReport returns not available', function () {
        cy.postTests('/test/yellow/cypress-backend-app', 'cypress-backend-app.zip', 'v1.3.8');
        cy.httpGet('/test/yellow/cypress-backend-app/lastReport', 404, 'No last mochawesome report available');
    });

    it('GET /test/yellow/cypress-backend-app/lastRunResult returns not available', function () {
        cy.postTests('/test/yellow/cypress-backend-app', 'cypress-backend-app.zip', 'v1.2.8');
        cy.httpGet('/test/yellow/cypress-backend-app/lastRunResult', 404, 'No last run result available');
    });
});

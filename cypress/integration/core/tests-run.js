const u = require('../../util/util.js');

describe('Tests', function () {
    beforeEach(() => {
        cy.checkPing();
    });

    it('posts a test, runs it, then checks /lastRunResult', function () {
        cy.postTests('/tests/dev/cypress-backend-app', 'cypress-backend-app.zip', 'v1.2.3');
        cy.httpGet(`/tests/dev/cypress-backend-app?noVideo=1&group=${u.rndGroup()}`, 200, '"failures":0');
        cy.httpGet('/tests/dev/cypress-backend-app/lastReport', 200, 'Mochawesome Report');
        cy.httpGet('/tests/dev/cypress-backend-app/lastRunResult', 200, 'loads account page');
    });

    it('posts a test, runs it without waiting option, then tries to run again but cannot', function () {
        cy.postTests('/tests/pat/cypress-backend-app', 'cypress-backend-app.zip', 'v3.5.18');
        cy.httpGet(
            `/tests/pat/cypress-backend-app?noVideo=1&noWait=1&group=${u.rndGroup()}`,
            200,
            'Tests kicked off but not waiting for the result.',
        );
        cy.wait(1500);
        cy.httpGet(`/tests/pat/cypress-backend-app?noVideo=1&group=${u.rndGroup()}`, 200, 'Tests are still running.');
    });

    it('posts a test, runs it without waiting option, then keeps trying to run again until it can', function () {
        cy.postTests('/tests/yellow/cypress-backend-app', 'cypress-backend-app.zip', 'v3.5.18');
        const group = u.rndGroup();
        cy.httpGet(`/tests/yellow/cypress-backend-app?noVideo=1&noWait=1&group=${group}`, 200, 'Tests kicked off');
        cy.wait(100);
        const newGroup = group + '_newGroup';
        cy.httpGet(`/tests/yellow/cypress-backend-app?noVideo=1&group=${newGroup}`, 200, 'Tests are still running.');
        cy.httpGetRetry(`/tests/yellow/cypress-backend-app?noVideo=1&group=${newGroup}`, 200, '"failures":0');
    });

    it('posts a test, runs only the canary suite', function () {
        cy.postTests('/tests/uat/cypress-backend-app', 'cypress-backend-app.zip', 'v3.5.432');
        cy.httpGet(
            `/tests/uat/cypress-backend-app?noVideo=1&suite=canary&group=${u.rndGroup()}`,
            200,
            'checks the canary page',
            'loads account page',
        );
    });

    it('runs two different suites for the same app in parallel', function () {
        const group = u.rndGroup();
        cy.postTests('/tests/purple/cypress-backend-app', 'cypress-backend-app.zip', 'v3.5.221');
        cy.httpGet(`/tests/purple/cypress-backend-app?suite=canary&group=${group}&noWait=1&noVideo=1`, 200, 'kicked off');
        cy.httpGet(`/tests/purple/cypress-backend-app?suite=core-api&group=${group}&noVideo=1`, 200, '"failures":0');
        cy.httpGetRetry('/tests/purple/cypress-backend-app/lastRunResult?suite=canary', 200, 'checks the canary page');
    });

    it('tries to run the same suite twice (in parallel) but only first is allowed to run', function () {
        const group = u.rndGroup();
        cy.postTests('/tests/red/cypress-backend-app', 'cypress-backend-app.zip', 'v4.783.21');
        cy.httpGet(`/tests/red/cypress-backend-app?suite=canary&group=${group}&noWait=1&noVideo=1`, 200, 'kicked off');
        cy.httpGet(`/tests/red/cypress-backend-app?suite=canary&group=${group}&noVideo=1`, 200, 'Tests are still running');
        cy.httpGetRetry('/tests/red/cypress-backend-app/lastRunResult?suite=canary', 200, 'checks the canary page');
    });

    it('tries to run a suite followed by allSuites (in parallel) but only first is allowed to run', function () {
        const group = u.rndGroup();
        cy.postTests('/tests/team1/cypress-backend-app', 'cypress-backend-app.zip', 'v3.183.23');
        cy.httpGet(`/tests/team1/cypress-backend-app?suite=canary&group=${group}&noWait=1&noVideo=1`, 200, 'kicked off');
        cy.httpGet(`/tests/team1/cypress-backend-app?group=${group}&noVideo=1`, 200, 'Tests are still running');
        cy.httpGetRetry('/tests/team1/cypress-backend-app/lastRunResult?suite=canary', 200, 'checks the canary page');
    });

    it('tries to run allSuites followed by a suite (in parallel) but only first is allowed to run', function () {
        const group = u.rndGroup();
        cy.postTests('/tests/yellow/cypress-backend-app', 'cypress-backend-app.zip', 'v1.113.23');
        cy.httpGet(`/tests/yellow/cypress-backend-app?group=${group}&noWait=1&noVideo=1`, 200, 'kicked off');
        cy.httpGet(`/tests/yellow/cypress-backend-app?suite=canary&group=${group}&noVideo=1`, 200, 'Tests are still running');
        cy.httpGetRetry('/tests/yellow/cypress-backend-app/lastRunResult', 200, 'completes the search workflow');
    });

    it('posts a test, attempts to run a suite that does not exist', function () {
        cy.postTests('/tests/uat/cypress-backend-app', 'cypress-backend-app.zip', 'v3.5.432');
        cy.httpGet(
            `/tests/uat/cypress-backend-app?noVideo=1&suite=tomato&group=${u.rndGroup()}`,
            404,
            'Suite does not exist, cannot find',
        );
    });

    it('deploys while while running tests for the same app, original tests finish ok', function () {
        // Prove that deploying new tests for an app do not cause a problem with the tests currently running

        // 1. Do the first deployment, the start running the tests
        cy.postTests('/tests/red/cypress-backend-app', 'cypress-backend-app.zip', 'v5.1.0');
        cy.httpGet(`/tests/red/cypress-backend-app?noVideo=1&noWait=1&group=${u.rndGroup()}`, 200, 'Tests kicked off');

        // 2. Wait at least one second before doing the next deployment so it gets a unique results folder
        cy.wait(1500);

        // 3. Confirm the tests are still running from the first deployment, then do the second deployment
        //    Note that for this test we deploy entirely different tests so we can tell the two deployments apart
        cy.httpGet(`/tests/red/cypress-backend-app?noVideo=1&group=${u.rndGroup()}`, 200, 'Tests are still running.');
        cy.postTests('/tests/red/cypress-backend-app', 'cypress-frontend-app.zip', 'v15.2.0');

        // 4. Now we wait until the original tests have finished - prove the are not affected by
        //    the entirely different tests that we just deployed.
        cy.httpGetRetry('/tests/red/cypress-backend-app/lastRunResult', 200, 'completes the search workflow');
    });

    it('deploys while running tests for the same app, new tests finish ok', function () {
        // Prove that deploying new tests then running them for an app while it already has running tests
        // works ok

        // 1. Do the first deployment, the start running the tests
        const group = u.rndGroup();
        cy.postTests('/tests/pink/cypress-backend-app', 'cypress-backend-app.zip', 'v5.1.0');
        cy.httpGet(`/tests/pink/cypress-backend-app?noVideo=1&noWait=1&group=${group}`, 200, 'Tests kicked off');

        // 2. Wait at least one second before doing the next deployment so it gets a unique results folder
        cy.wait(1100);

        // 3. Confirm the tests are still running from the first deployment, then do the second deployment
        //    Note that for this test we deploy entirely different tests so we can tell the two deployments apart
        cy.httpGet(`/tests/pink/cypress-backend-app?noVideo=1&group=${group}`, 200, 'Tests are still running.');
        cy.postTests('/tests/pink/cypress-backend-app', 'cypress-frontend-app.zip', 'v15.2.0');

        // 4. Now we kick off the new tests and wait for them to complete ok
        const newGroup = group + '_newGroup';
        cy.httpGet(`/tests/pink/cypress-backend-app?noVideo=1&group=${newGroup}`, 200, '"failures":0');
    });

    it('can run the tests for two different apps at the same time', function () {
        // 1. Do the first deployment, then kick off the tests without waiting for the result
        cy.postTests('/tests/team1/cypress-backend-app', 'cypress-backend-app.zip', 'v3.8.7');
        cy.httpGet(`/tests/team1/cypress-backend-app?noVideo=1&noWait=1&group=${u.rndGroup()}`, 200, 'Tests kicked off');

        // 2. Deploy the second app, then run its tests waiting for the tests to complete
        cy.postTests('/tests/team1/cypress-frontend-app', 'cypress-frontend-app.zip', 'v12.16.8');
        cy.httpGet(`/tests/team1/cypress-frontend-app?noVideo=1&group=${u.rndGroup()}`, 200, '"failures":0');

        // 3. Finally confirm that the tests for the first app also completed ok
        cy.httpGetRetry('/tests/team1/cypress-backend-app/lastRunResult', 200, '"failures":0');
    });

    it('will not let you to run the same batch and suite twice (in a day)', function () {
        cy.postTests('/tests/dev/cypress-backend-app', 'cypress-backend-app.zip', 'v0.3.9');

        const group = u.rndGroup();
        cy.httpGet(`/tests/dev/cypress-backend-app?suite=canary&group=${group}&noVideo=1`, 200, '"failures":0');
        cy.httpGet(
            `/tests/dev/cypress-backend-app?suite=canary&group=${group}&noVideo=1`,
            400,
            'You cannot run the same tests twice for a given batch in the same day. Please suppply a different group.',
        );
    });

    it('will not let you to run the same batch and suite twice (in a day)', function () {
        cy.postTests('/tests/yellow/cypress-backend-app', 'cypress-backend-app.zip', 'v0.3.9');

        const group = u.rndGroup();
        cy.httpGet(`/tests/yellow/cypress-backend-app?suite=canary&group=${group}&noVideo=1`, 200, '"failures":0');
        cy.httpGet(
            `/tests/yellow/cypress-backend-app?group=${group}&noVideo=1`,
            400,
            'You cannot run all suites when you have already run a suite for that batch',
        );
    });

    it('gets the lastReport for two different suites', function () {
        const group = u.rndGroup();
        cy.postTests('/tests/purple/cypress-backend-app', 'cypress-backend-app.zip', 'v8.5.221');
        cy.httpGet(`/tests/purple/cypress-backend-app?suite=canary&group=${group}&noWait=1&noVideo=1`, 200, 'kicked off');
        cy.httpGet(`/tests/purple/cypress-backend-app?suite=core-api&group=${group}&noVideo=1`, 200, '"failures":0');
        cy.httpGetRetry('/tests/purple/cypress-backend-app/lastRunResult?suite=canary', 200, 'checks the canary page');

        cy.httpGet(`/tests/purple/cypress-backend-app/lastReport?suite=canary`, 200, 'Mochawesome Report');
        cy.httpGet(`/tests/purple/cypress-backend-app/lastReport?suite=canary`, 200, 'suite-canary');

        cy.httpGet(`/tests/purple/cypress-backend-app/lastReport?suite=core-api`, 200, 'Mochawesome Report');
        cy.httpGet(`/tests/purple/cypress-backend-app/lastReport?suite=core-api`, 200, 'suite-core-api');
    });

    it('produces a summary.html report showing suites run and not run', function () {
        const group = `MyGroup${u.rndGroup()}`;
        cy.postTests('/tests/blue/cypress-backend-app', 'cypress-backend-app.zip', 'v18.18.12');
        cy.httpGet(`/tests/blue/cypress-backend-app?suite=core-api&group=${group}&noVideo=1`, 200, '"failures":0');

        const dt = '[0-9]{2,4}[.][0-9]{2}[.][0-9]{2}';
        const linkToMochawesome = `/results/blue/cypress-backend-app/${dt}/${group}/suite-core-api/mochawesome.html`;
        cy.httpGet(`/tests/blue/cypress-backend-app/summary`, 200, `blue cypress-backend-app`); // title
        cy.httpGet(`/tests/blue/cypress-backend-app/summary`, 200, `blue - cypress-backend-app v18.18.12`);
        cy.httpGet(`/tests/blue/cypress-backend-app/summary`, 200, `Summary for run group MyGroup`);
        cy.httpGet(`/tests/blue/cypress-backend-app/summary`, 200, `core-api`);
        cy.httpGet(`/tests/blue/cypress-backend-app/summary`, 200, linkToMochawesome);
        cy.httpGet(`/tests/blue/cypress-backend-app/summary`, 200, `6 tests`);
        cy.httpGet(`/tests/blue/cypress-backend-app/summary`, 200, `class=."pass."`);
        cy.httpGet(`/tests/blue/cypress-backend-app/summary`, 200, `20[0-9]{2}-[0-9]{2}-[0-9]{2}`);
        cy.httpGet(`/tests/blue/cypress-backend-app/summary`, 200, `seconds`);
        cy.httpGet(`/tests/blue/cypress-backend-app/summary`, 200, `ready`);

        cy.httpGet(`/tests/blue/cypress-backend-app?suite=canary&group=${group}&noVideo=1`, 200, '"failures":0');
        cy.httpGet(`/tests/blue/cypress-backend-app/summary`, 200, `core-api`);
        cy.httpGet(`/tests/blue/cypress-backend-app/summary`, 200, `canary`);
    });

    it('produces a summary.html report showing a failed test', function () {
        const group = `MyGroup${u.rndGroup()}`;
        cy.postTests('/tests/dev/cypress-big-app', 'cypress-big-app.zip', 'v1.1.1');
        cy.httpGet(`/tests/dev/cypress-big-app?suite=suite06-fail&group=${group}&noVideo=1`, 200, '"failures":1');

        cy.httpGet(`/tests/dev/cypress-big-app/summary`, 200, `suite06-fail`);
        cy.httpGet(`/tests/dev/cypress-big-app/summary`, 200, `1 tests`);
        cy.httpGet(`/tests/dev/cypress-big-app/summary`, 200, `class=."fail."`); // quotes escaped in cypress html...
    });

    it('produces a summary.html report handling a crash - missing JavaScript file so run does not start', function () {
        const group = `MyGroup${u.rndGroup()}`;
        cy.postTests('/tests/dev/cypress-big-app', 'cypress-big-app.zip', 'v1.1.1');
        cy.httpGet(`/tests/dev/cypress-big-app?suite=suite09-error&group=${group}&noVideo=1`, 200, '"failures":1');

        cy.httpGet(`/tests/dev/cypress-big-app/summary`, 200, `suite09-error`);
        cy.httpGet(`/tests/dev/cypress-big-app/summary`, 200, `0 tests`);
        cy.httpGet(`/tests/dev/cypress-big-app/summary`, 200, `class=."crash."`); // quotes escaped in cypress html...
    });

    it('produces a summary.html report handling a runtime error in a cy closure', function () {
        const group = `MyGroup${u.rndGroup()}`;
        cy.postTests('/tests/dev/cypress-big-app', 'cypress-big-app.zip', 'v2.2.2');
        cy.httpGet(`/tests/dev/cypress-big-app?suite=suite10-error&group=${group}&noVideo=1`, 200, '"failures":1');

        cy.httpGet(`/tests/dev/cypress-big-app/summary`, 200, `suite10-error`);
        cy.httpGet(`/tests/dev/cypress-big-app/summary`, 200, `1 tests`);
        cy.httpGet(`/tests/dev/cypress-big-app/summary`, 200, `class=."fail."`); // quotes escaped in cypress html...
    });

    it('produces a summary.html report for a big bunch of suites', function () {
        const group = `MyGroup${u.rndGroup()}`;
        cy.postTests('/tests/pat/cypress-big-app', 'cypress-big-app.zip', 'v3.3.3');
        const prefix = '/tests/pat/cypress-big-app?suite=suite';
        cy.httpGet(`${prefix}01&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`${prefix}02&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`${prefix}03&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`${prefix}04&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`${prefix}05&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`${prefix}06-fail&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`${prefix}07-fail&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`${prefix}08&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`${prefix}09-error&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`${prefix}10-error&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`${prefix}11-wait5&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`${prefix}12-wait5&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`${prefix}13-wait5&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`${prefix}14-wait5&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`${prefix}15-wait5&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`${prefix}16-wait2&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`${prefix}17-wait2&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`${prefix}18-wait2&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`${prefix}19&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`${prefix}20&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');

        cy.httpGetRetry(`/tests/pat/cypress-big-app/summary`, 200, `class=."pass." info=."suite01`);
        cy.httpGetRetry(`/tests/pat/cypress-big-app/summary`, 200, `class=."pass." info=."suite02`);
        cy.httpGetRetry(`/tests/pat/cypress-big-app/summary`, 200, `class=."pass." info=."suite03`);
        cy.httpGetRetry(`/tests/pat/cypress-big-app/summary`, 200, `class=."pass." info=."suite04`);
        cy.httpGetRetry(`/tests/pat/cypress-big-app/summary`, 200, `class=."pass." info=."suite05`);
        cy.httpGetRetry(`/tests/pat/cypress-big-app/summary`, 200, `class=."fail." info=."suite06`);
        cy.httpGetRetry(`/tests/pat/cypress-big-app/summary`, 200, `class=."fail." info=."suite07`);
        cy.httpGetRetry(`/tests/pat/cypress-big-app/summary`, 200, `class=."pass." info=."suite08`);
        cy.httpGetRetry(`/tests/pat/cypress-big-app/summary`, 200, `class=."crash." info=."suite09`);
        cy.httpGetRetry(`/tests/pat/cypress-big-app/summary`, 200, `class=."fail." info=."suite10`);
        cy.httpGetRetry(`/tests/pat/cypress-big-app/summary`, 200, `class=."pass." info=."suite11`);
        cy.httpGetRetry(`/tests/pat/cypress-big-app/summary`, 200, `class=."pass." info=."suite12`);
        cy.httpGetRetry(`/tests/pat/cypress-big-app/summary`, 200, `class=."pass." info=."suite13`);
        cy.httpGetRetry(`/tests/pat/cypress-big-app/summary`, 200, `class=."pass." info=."suite14`);
        cy.httpGetRetry(`/tests/pat/cypress-big-app/summary`, 200, `class=."pass." info=."suite15`);
        cy.httpGetRetry(`/tests/pat/cypress-big-app/summary`, 200, `class=."pass." info=."suite16`);
        cy.httpGetRetry(`/tests/pat/cypress-big-app/summary`, 200, `class=."pass." info=."suite17`);
        cy.httpGetRetry(`/tests/pat/cypress-big-app/summary`, 200, `class=."pass." info=."suite18`);
        cy.httpGetRetry(`/tests/pat/cypress-big-app/summary`, 200, `class=."pass." info=."suite19`);
        cy.httpGetRetry(`/tests/pat/cypress-big-app/summary`, 200, `class=."pass." info=."suite20`);

        cy.httpGet(`/tests/pat/cypress-big-app/summary`, 200, `There was a crash preventing a test start.`);
    });

    it('produces a summary.html report showing a suite as pend(ing) then changing to pass', function () {
        const group = `MyGroup${u.rndGroup()}`;
        cy.postTests('/tests/live/cypress-big-app', 'cypress-big-app.zip', 'v3.3.3');
        cy.httpGet(`/tests/live/cypress-big-app?suite=suite11-wait5&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');

        cy.httpGet(`/tests/live/cypress-big-app/summary`, 200, `class=."pend." info=."suite11`);
        cy.httpGet(`/tests/live/cypress-big-app/summary`, 200, `Some tests have not started.`);

        cy.httpGetRetry(`/tests/live/cypress-big-app/summary`, 200, `class=."pass." info=."suite11`);
        cy.httpGet(`/tests/live/cypress-big-app/summary`, 200, `Some tests have not started.`);
    });

    it('overall summary status changes from ready thru pending to all tests passed', function () {
        const group = `MyGroup${u.rndGroup()}`;
        cy.postTests('/tests/team2/cypress-frontend-app', 'cypress-frontend-app.zip', 'v5.5.5');
        cy.httpGet(`/tests/team2/cypress-frontend-app?suite=core-frontend&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`/tests/team2/cypress-frontend-app/summary`, 200, `Some tests have not started.`);

        cy.httpGet(`/tests/team2/cypress-frontend-app?suite=canary&group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`/tests/team2/cypress-frontend-app/summary`, 200, `Test completion is still pending.`);

        cy.httpGetRetry(`/tests/team2/cypress-frontend-app/summary`, 200, `All tests passed.`);
    });

    it('produces a summary.html report for allSuites - cypress-frontend-app', function () {
        const group = `MyGroup${u.rndGroup()}`;
        cy.postTests('/tests/live/cypress-frontend-app', 'cypress-frontend-app.zip', 'v4.4.4');
        cy.httpGet(`/tests/live/cypress-frontend-app?group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGet(`/tests/live/cypress-frontend-app/summary`, 200, `Test completion is still pending.`);

        cy.httpGet(`/tests/live/cypress-frontend-app/summary`, 200, `class=."pend." info=."allSuites`);
        cy.httpGetRetry(`/tests/live/cypress-frontend-app/summary`, 200, `class=."pass." info=."allSuites`);
        cy.httpGet(`/tests/live/cypress-frontend-app/summary`, 200, `All tests passed.`);
    });

    it('produces a summary.html report for allSuites - cypress-big-app', function () {
        const group = `MyGroup${u.rndGroup()}`;
        cy.postTests('/tests/team1/cypress-big-app', 'cypress-big-app.zip', 'v5.5.5');
        cy.httpGet(`/tests/team1/cypress-big-app?group=${group}&noVideo=1&noWait=1`, 200, 'Tests kicked off');
        cy.httpGetRetry(`/tests/team1/cypress-big-app/summary`, 200, 'class=."fail." info=."allSuites', 15, 10000);

        cy.httpGet(`/tests/team1/cypress-big-app/summary`, 200, `Some tests failed.`);
    });
});
